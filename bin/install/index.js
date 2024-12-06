import fs from 'node:fs'
import fsp from 'node:fs/promises'
import Path from 'node:path'
import zlib from 'node:zlib'
import cp from 'child_process'
import { webcrypto } from 'crypto'
import config from '../config.js'
import { safeId } from '../shared.js'
import * as semver from './semver.js'
import * as https from './https.js'
import c from '../color.js'

let peers = []
  , detached = []
  , seen = new Set()
  , lockChanges = new Set()
  , deprecated = []
  , clear = false
  , log = false
  , clock = ''

const lockFields = 'name os cpu bin postinstall engines deprecated dependencies peerDependencies optionalDependencies peerDependenciesMeta'.split(' ')
    , sinx = process.platform === 'win32' && Path.join(import.meta.dirname, 'sinx.exe')
    , then = (x, fn) => x && typeof x.then === 'function' ? x.then(fn) : fn(x)
    , splitNameVersion = x => (x.match(/^(@[a-z0-9-_./]+|[a-z0-9-_.]+)$/) || x.match(/(?:(^@?[a-z0-9-_./]+)@)?(.+)/i) || []).slice(1, 3)
    , set = (xs, id, x) => (xs.set(id, x), x)
    , noop = () => { /* noop */ }
    , overwrite = () => process.stdout.write('\x1B[F\x1B[2K')
    , p = (...xs) => (clear && overwrite(), clear = log = false, console.log(...xs), xs[xs.length - 1]) // eslint-disable-line
    , clocks = ['🕛', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚']
    , progress = ['Installing...']
    , root = config.global ? config.globalDir : config.cwd

https.fetch.p = p
setInterval(() => log && (console.log((clear ? '\x1B[F\x1B[2K' : '') + (clock = clocks[(clocks.indexOf(clock) + 1) % clocks.length]), progress[0]), clear = true), 50).unref() // eslint-disable-line

const bins = []
    , dirs = new Map()
    , packages = new Map()
    , postInstalls = []
    , symlinked = new Map()
    , resolved = new Map()
    , versions = new Map()

const registries = getScopes()
    , defaultRegistry = getDefaultRegistry()
    , packageJson = await jsonRead(Path.join(root, 'package.json')) || defaultPackage()
    , overrides = packageJson.overrides || {}
    , oldLock = (await jsonRead(Path.join(root, 'sin.lock'))) || defaultLock(packageJson)
    , oldLockDependencies = { ...oldLock.optionalDependencies, ...oldLock.dependencies, ...oldLock.devDependencies }
    , lock = defaultLock(packageJson)

await mkdir(config.cacheDir)

const added = await fromCLI()
const pkgDependencies = { ...packageJson.optionalDependencies, ...packageJson.dependencies, ...packageJson.devDependencies }

await installDependencies(pkgDependencies, undefined, config.force || config.ci, [''])
await detachedFinished()
await installPeers()

https.destroy()
await postInstall()

if (!config.ci) {
  await writePackage(added)
  await writeLock()
  await cleanup()
  added.length && p('📦 Added', added.length, 'new dependency' + (added.length === 1 ? ':' : 's:'))
  added.forEach(x => p(c.green(' - ' + x.name), c.dim('@ ' + x.version)))
  const xs = deprecated
    .map(x => [c.red(' - ' + x.name), c.dim('@ ' + x.version), x.deprecated].join(' '))
    .filter((x, i, xs) => xs.indexOf(x) === i)
    .sort((a, b) => a > b ? 1 : a < b ? -1 : 0)
  xs.length && p('🚨', xs.length, 'deprecated package' + (xs.length === 1 ? ':' : 's') + (config.showDeprecated ? ':' : c.dim(' use --show-deprecated to see which')))
  config.showDeprecated && xs.forEach(x => p(x))
}

p(
  '🔥',
  ...(lockChanges.size
    ? ['Installed', lockChanges.size, 'package' + (lockChanges.size === 1 ? '' : 's')]
    : ['Checked', Object.keys(lock.packages).length, 'package' + (lockChanges.size === 1 ? '' : 's')]
  ),
  'in',
  ...prettyTime(process.uptime())
)

function prettyTime(x) {
  return x >= 60
    ? [~~(x / 60), 'min and', ~~(x % 60 * 10) / 10, 'sec']
    : x >= 1
    ? [~~(x * 1000) / 1000, 'sec']
    : [~~(x * 1000), 'ms']
}

async function detachedFinished() {
  if (detached.length === 0)
    return

  const xs = detached
  detached = []
  await Promise.all(xs)
  await detachedFinished()
}

async function installPeers() {
  const installed = {}
  while (peers.length) {
    const xs = peers
    peers = []
    await Promise.all(xs.map(async peer => {
      let version = null
      let i = 0
      let found = null
      for (; i < peer.route.length; i++) {
        const x = peer.route[i]
        const l = lock.packages[x]
        version = l && (l.dependencies?.[peer.name] || l.optionalDependencies?.[peer.name])
        if (version) {
          found = i
          break
        }
      }
      if (version && !semver.satisfies(version, peer.range)) {
        p(peer.route, peer.parent.name, i, version)
        // throw new Error(peer.name + '@' + peer.range + ' does not intersect with ' + version +  ' in ' + peer.parent.name)
      }

      if (found === null && peer.optional)
        return

      if (semver.isVersion(peer.range))
        version = peer.range

      if (!version)
        version = (await findVersion(peer)).version

      peer.version = version
      peer.i = i

      if (peer.name in installed) {
        for (const x of installed[peer.name]) {
          const conflict = peer.name === x.parent.name
                        && peer.parent.version === x.parent.version
                        && peer.version === x.version

          if (conflict) {
            p(peer.name, 'in', x.parent.name, 'should be', x.version)
            throw new Error('Sub modules with differing context for peer dependencies not supported yet')
          }
        }
        installed[peer.name].push(peer)
      } else {
        installed[peer.name] = [peer]
      }

      await install([peer.name, version], peer.parent, peer.force, peer.route)
    }))
    await detachedFinished()
  }
}

function fromCLI() {
  return Promise.all(config._.map(async x => {
    const pkg = await resolve(...splitNameVersion(x))
    const name = pkg.alias || pkg.name

    if (oldLock.packages[''].dependencies[name] === pkg.version)
      return

    const deps = config.saveDev
      ? packageJson.devDependencies || (packageJson.devDependencies = {})
      : config.saveOptional
        ? packageJson.optionalDependencies || (packageJson.optionalDependencies = {})
        : packageJson.dependencies || (packageJson.dependencies = {})

    if (deps[name] !== pkg.version)
      deps[name] = pkg.version

    return pkg
  })).then(xs => xs.filter(x => x))
}

function installDependencies(dependencies, parent, force, route) {
  return Promise.all(Object.entries(dependencies).map(x =>
    install(x, parent, force || oldLockDependencies[x.alias || x.name] !== x.version, route)
  ))
}

function supported(pkg) {
  if (pkg.os && pkg.os.length && !pkg.os.some(x => x === process.platform))
    return false

  if (pkg.cpu && pkg.cpu.length && !pkg.cpu.some(x => x === process.arch))
    return false

  if (pkg.engines && pkg.engines[process.release.name] && !semver.satisfies(process.versions[process.release.name], pkg.engines[process.release.name]))
    return false

  return true
}

async function install([name, version], parent, force, route) {
  name in overrides && (version = overrides[name])
  version.charCodeAt(0) === 118 && (version = version.slice(1)) // v
  const id = name + '@' + version
  if (packages.has(id))
    return then(packages.get(id), x => finished(x, parent, force, route))

  const logId = name + c.dim(' ' + version)
  log = true
  progress.unshift(logId)

  return set(
    packages,
    id,
    (async() => {
      let pkg

      if ((parent || oldLockDependencies[name] === pkgDependencies[name]) && !version.startsWith('link:')) {
        const parentLock = oldLock.packages[parent ? (parent.alias || parent.name) + '@' + parent.version : '']
        const lockVersion = parentLock?.dependencies?.[name] || parentLock?.optionalDependencies?.[name] || parentLock?.peerDependencies?.[name]
        if (lockVersion) {
          const lockedId = name + '@' + lockVersion
          const locked = oldLock.packages[lockedId]
          pkg = { name, alias: name, version: lockVersion, ...locked }
          addPaths(pkg)
          if (locked && !supported(pkg)) {
            setDependency(pkg, parent)
            return set(packages, lockedId, pkg)
          }

          if (!force) {
            const x = pkg.local && await jsonRead(Path.join(pkg.local, 'package.json')).catch(noop)
            x && readFromPackage(pkg, x)
            if (x) {
              await finished(pkg, parent, force, route)
              detached.push(installDependencies({ ...pkg.optionalDependencies, ...pkg.dependencies }, pkg, force, route.concat(pkg.name + '@' + pkg.version)))
              return set(packages, lockedId, pkg)
            }

            const [tar, sha512] = await fsp.readFile(pkg.cache).then(gunzip).catch(() => [])
            if (tar) {
              ensureIntegrity(pkg, 'sha512-' + sha512)
              return set(packages, lockedId, await installed(await untar(pkg, tar), parent, force, route))
            } else {
              pkg = null
            }
          }
          version = lockVersion
        }
      }

      pkg || (pkg = await resolve(name, version))

      if (!pkg)
        throw new Error('Could not find ' + name + (name in pkgDependencies ? ' (perhaps remove from package.json?)' : ''))

      if (pkg.version.indexOf('link:') === 0)
        return set(packages, id, await finished(pkg))

      if (pkg.version.indexOf('file:') === 0 || pkg.version.indexOf('link:') === 0)
        return set(packages, id, await installed(pkg, parent, force, route))

      if (!supported(pkg))
        return set(packages, id, await finished(pkg, parent, force, route))

      if (!pkg.version)
        throw new Error('Could not find version for ' + pkg.name + ' exp ' + version)

      const cached = await fsp.readFile(pkg.cache).then(gunzip).catch(e => pkg.forceCache ? Promise.reject(new Error(e)) : [])
      if (cached[0]) {
        pkg.forceCache || ensureIntegrity(pkg, 'sha512-' + cached[1])
        return set(packages, id, await installed(await untar(pkg, cached[0]), parent, force, route))
      }

      pkg.tgz || (pkg = await resolve(name, version))
      const body = await https.fetch(pkg.tgz.origin, pkg.tgz.pathname, pkg.tgz.headers)
      const [tar, sha512] = await gunzip(body)
      ensureIntegrity(pkg, 'sha512-' + sha512)
      await Promise.all([
        then(mkdir(Path.dirname(pkg.cache)), () => fsp.writeFile(pkg.cache, body)),
        untar(pkg, tar).then(() => installed(pkg, parent, force, route))
      ])

      return set(packages, id, pkg)
    })()
  ).then(x => {
    progress.splice(progress.indexOf(logId), 1)
    return x
  })
}

function gunzip(x) {
  return Promise.all([
    new Promise((resolve, reject) => zlib.gunzip(x, (err, x) => err ? reject(err) : resolve(x))),
    webcrypto.subtle.digest('SHA-512', x).then(x => Buffer.from(x).toString('base64'))
  ])
}

async function finished(pkg, parent) {
  const uid = parent?.name + '@' +  parent?.version + '/' + pkg.name + '@'+  pkg.version
  if (seen.has(uid))
    return

  seen.add(uid)
  setDependency(pkg, parent)
  const name = pkg.alias || pkg.name

  await Promise.all(Object.entries(
    typeof pkg.bin === 'string'
    ? { [name.split('/').pop()]: pkg.bin }
    : pkg.bin || {}
  ).map(async([name, file]) => {
    const path = Path.join(parent ? parent.local : bins[name] = root, 'node_modules', '.bin', name)
    if (sinx) {
      const target = Path.join(pkg.local, file)
      await mkdir(Path.dirname(path))
      await fsp.writeFile(path, 'node "' + target + '"')
      await fsp.copyFile(sinx, path + '.exe')
      config.global && !parent && await mkdir(config.binDir)
      config.global && !parent && await fsp.writeFile(Path.join(config.binDir, name), 'node "' + target + '"')
      config.global && !parent && await fsp.copyFile(sinx, Path.join(config.binDir, name + '.exe'))
    } else {
      const target = Path.join(...(parent ? ['..', '..', '..'] : ['..']), pkg.local.split(/node_modules[/\\]/).pop(), file)
      await symlink(target, path)
      config.global && !parent && await symlink(path, Path.join(config.binDir, name))
      await fsp.chmod(Path.join(pkg.local, file), 0o766)
    }
  }))

  if (!parent)
    return symlink(Path.join(name[0] === '@' ? '..' : '', pkg.local.slice(root.length + 1).slice(13)), Path.join(root, 'node_modules', ...name.split('/')))

  // if (pkg.name.match(/eslint|prettier/))
  //  symlink(Path.join(name[0] === '@' ? '..' : '', pkg.local.slice(13)), Path.join('node_modules', ...name.split('/')))

  const path = Path.join(parent.local.slice(0, parent.local.lastIndexOf('node_modules') + 12), ...name.split('/'))
  await symlink(Path.relative(path, pkg.local).slice(3), path)
  return pkg
}

function setDependency(pkg, parent) {
  pkg.deprecated && deprecated.push(pkg)
  pkg.postinstall && postInstalls.push(pkg)
  const name = (pkg.alias || pkg.name)
  const type = parent?.optionalDependencies?.[name]
    ? 'optionalDependencies'
    : parent?.peerDependencies?.[name]
    ? 'peerDependencies'
    : 'dependencies'

  const id = name + '@' + pkg.version
  id in lock.packages || (lock.packages[id] = {
    name: pkg.name,
    resolved: pkg.resolved,
    integrity: pkg.integrity,
    cpu: pkg.cpu,
    os: pkg.os,
    engines: pkg.engines,
    deprecated: pkg.deprecated,
    postinstall: pkg.postinstall,
    dependencies: undefined,
    optionalDependencies: undefined,
    peerDependencies: undefined,
  })

  if (!parent)
    return lock.packages[''][type][name] = pkg.version

  const parentId = (parent.alias || parent.name) + '@' + parent.version
  lock.packages[parentId][type]
    ? lock.packages[parentId][type][name] = pkg.version
    : lock.packages[parentId][type] = { [name]: pkg.version }
}

async function installed(pkg, parent, force, route) {
  await finished(pkg, parent, force, route)
  detached.push(installDependencies({ ...pkg.optionalDependencies, ...pkg.dependencies }, pkg, force, route.concat(pkg.name + '@' + pkg.version)))

  lockChanges.add(Date.now() + pkg.route + pkg.name + '@' + pkg.version + parent?.name + '@' + parent?.version)

  peers.push(...Object.entries(pkg.peerDependencies || {}).map(([name, range]) => ({
    name, range, parent: pkg, route, force, optional: pkg.peerDependenciesMeta?.[name]?.optional || false
  })))

  return pkg
}

async function postInstall() {
  if (config.ignoreScripts)
    return

  const skipped = []
  for (const x of postInstalls) {
    const installed = await fsp.readFile(Path.join(x.local, '.sinpostinstall'), 'utf8').catch(() => null)
    if (installed)
      continue

    if (!config.trustPostinstall) {
      skipped.push(x)
      continue
    }

    const logId = x.name + c.dim(' ' + x.version) + c.yellow(' postinstall $ ') + (x.postinstall.length > 40 ? x.postinstall.slice(0, 37) + '...' : x.postinstall)
    log = true
    progress.unshift(logId)
    await new Promise((resolve, reject) =>
      cp.exec(x.postinstall, {
        stdio: 'inherit',
        cwd: x.local,
        env: {
          ...process.env,
          INIT_CWD: process.cwd()
        }
      }, err => {

        err ? reject(err) : resolve()
      })
    )
    await fsp.writeFile(Path.join(x.local, '.sinpostinstall'), x.postinstall)
    progress.splice(progress.indexOf(logId), 1)
    p('✅ ' + logId)
  }

  skipped.length && p('⛔️', skipped.length + ' postinstall script' + (postInstalls.length === 1 ? '' : 's') + ' skipped' + c.dim(' use --trust-postinstall to run'))
  skipped.forEach(x => p(c.yellow(' ∟ ' + x.name + ' ' + c.dim(x.version + ' - skipped postinstall'))))
}

async function writeLock() {
  if (config.ci)
    return

  if (Object.keys(lock.packages).length === 0) {
    await rm('sin.lock')
    await rm('node_modules')
    return
  }

  if (lockChanges.size === 0)
    return

  lock.dependencies = packageJson.dependencies
  lock.optionalDependencies = packageJson.optionalDependencies
  lock.devDependencies = packageJson.devDependencies
  sort(lock, 'dependencies')
  sort(lock, 'optionalDependencies')
  sort(lock, 'devDependencies')
  sort(lock, 'packages')
  Object.keys(lock.packages).forEach((k) => {
    const x = lock.packages[k]
    sort(x, 'dependencies')
    sort(x, 'optionalDependencies')
    sort(x, 'devDependencies')
    sort(x, 'peerDependencies')
    sort(x, 'packages')
  })
  fs.writeFileSync(Path.join(root, 'sin.lock'), JSON.stringify(lock, null, 2))

  function sort(x, k) {
    x[k] && (x[k] = Object.fromEntries(Object.entries(x[k]).sort(([a], [b]) => a > b ? 1 : a < b ? -1 : 0)))
  }
}

async function writePackage(xs) {
  const pkg = await jsonRead(Path.join(root, 'package.json')) || defaultPackage()
  let needsWrite = false
  for (const { name, version } of xs) {
    const x = config.saveDev
      ? pkg.devDependencies || (pkg.devDependencies = {})
      : config.saveOptional
        ? pkg.optionalDependencies || (pkg.optionalDependencies = {})
        : pkg.dependencies || (pkg.dependencies = {})

    if (x[name] === version)
      continue

    x[name] = version
    needsWrite = true
  }

  if (needsWrite) {
    pkg.devDependencies && (pkg.devDependencies = sort(pkg.devDependencies))
    pkg.dependencies && (pkg.dependencies = sort(pkg.dependencies))
    pkg.optionalDependencies && (pkg.optionalDependencies = sort(pkg.optionalDependencies))
    fs.writeFileSync(Path.join(root, 'package.json'), JSON.stringify(pkg, null, 2))
  }

  function sort(x) {
    return Object.keys(x).sort().reduce((a, key) => (a[key] = x[key], a), {})
  }
}

async function resolveNpm(name, version) {
  const x = await fetchVersion({ name, version })
  const registry = getRegistry(name)
  const pkg = readFromPackage({
    name: x.name,
    version: x.version
  }, x)

  pkg.tgz = {
    origin: registry.origin,
    pathname: registry.pathname + pkg.name + '/-/' + (pkg.name.split('/')[1] || pkg.name) + '-' + pkg.version.split('+')[0] + '.tgz',
    headers: registry.password ? { Authorization: 'Bearer ' + registry.password } : {}
  }

  pkg.resolved = pkg.tgz.origin + pkg.tgz.pathname

  ensureIntegrity(pkg, x.dist?.integrity)
  addPaths(pkg)
  return pkg
}

function addPaths(pkg) {
  pkg.local = localPath(pkg)
  pkg.cache = cache(pkg)
}

function cache({ name, version }) {
  return Path.join(config.cacheDir, safeId({ name, version }))
}

function localPath({ name, version }) {
  return Path.join(root, 'node_modules', '.sin', safeId({ name, version }), 'node_modules', ...name.split('/'))
}

async function resolve(name, v = '') {
  const id = name + '@' + v
  if (resolved.has(id))
    return resolved.get(id)

  return set(
    resolved,
    id,
    (async() => {
      const pkg = await (
          v.startsWith('https:')
        ? resolveUrl(v)
        : v.endsWith('.tgz') || v.endsWith('.tar') || v.endsWith('.tar.gz')
        ? resolveLocalTarball(v)
        : v.startsWith('file:') || v.startsWith('~/') || v.startsWith('/') || v.startsWith('./') || v.slice(1, 3) === ':\\' || v.startsWith('.\\')
        ? resolveLocal(v)
        : v.startsWith('git+ssh:') || v.startsWith('git+https:') || v.startsWith('git:') || v.startsWith('git@')
        ? resolveGit(v)
        : v.startsWith('github:') || (v[0] !== '@' && v.indexOf('/') > 1)
        ? resolveGithub(v)
        : v.startsWith('link:')
        ? resolveLink(v.slice(5))
        : v.startsWith('npm:')
        ? resolveNpm(...splitNameVersion(v.slice(4)))
        : resolveNpm(name, v)
      )
      name && pkg && (pkg.alias = name)
      return set(resolved, id, pkg)
    })()
  )
}

async function resolveLink(name) {
  const x = Path.join(config.linkDir, name)
  const targetPkg = await jsonRead(Path.join(x, 'package.json'))
  if (!targetPkg)
    return
  const pkg = readFromPackage({
    name,
    version: 'link:' + name,
    resolved: 'link:' + name
  }, targetPkg)

  pkg.local = localPath(pkg)
  await symlink(x, pkg.local)
  return pkg
}

async function resolveLocal(version) {
  const x = Path.normalize(version.replace(/^file:/, ''))
  const pkg = readFromPackage({
    version,
    resolved: version
  }, await jsonRead(Path.join(x, 'package.json')))

  pkg.local = localPath(pkg)
  await mkdir(pkg.local)
  await fsp.cp(x, pkg.local, { recursive: true, filter: x => Path.basename(x) !== '.git' })
  return pkg
}

async function resolveLocalTarball(version) {
  version = Path.normalize(version)
  const pkg = {
    version,
    resolved: version
  }

  const file = await (version.endsWith('.tar')
    ? new Promise((resolve, reject) => fsp.readFile(version).then(x => zlib.gzip(x, (err, x) => err ? reject(err) : resolve(x))))
    : fsp.readFile(version)
  )

  const [tar, sha512] = await gunzip(file)

  await untar(pkg, tar, false)
  ensureIntegrity(pkg, 'sha512-' + sha512)
  addPaths(pkg)
  await fsp.writeFile(pkg.cache, file)
  return pkg
}

async function resolveUrl(version) {
  const pkg = {
    version,
    resolved: version,
    tgz: new URL(version)
  }
  const [tar, sha512] = await gunzip(await https.fetch(pkg.tgz.origin, pkg.tgz.pathname, pkg.tgz.headers))
  await untar(pkg, tar, false)
  ensureIntegrity(pkg, 'sha512-' + sha512)
  addPaths(pkg)
  return pkg
}

function readFromPackage(
  pkg,
  from
) {
  from.scripts?.postinstall && (pkg.postinstall = from.scripts.postinstall)
  for (const x of lockFields)
    from[x] === undefined || (pkg[x] = from[x])
  return pkg
}

async function resolveGit(x) {
  x = x.replace(/^git\+/, '').replace(/^git:/, 'https:')
  x.match(/^ssh:\/\/[^:]+:[^/]/) && (x = x.replace(/^ssh:\/\//, ''))

  const [repo, ref = 'HEAD'] = x.split('#')
      , temp = Path.join(config.tempDir, Math.random().toString(36).slice(2))

  try {
    await mkdir(temp)
    const sha = ref.match(/[a-f0-9]{40}/i) ? ref
              : (await $('git', ['ls-remote', '-q', repo, ref], { stdio: 'pipe' })).toString().split(/[ \t]/, 1)[0]

    await $('git', ['clone', '-q', '--filter=blob:none', '--no-checkout', repo, 'x'], { cwd: temp })
    const cwd = Path.join(temp, 'x')
    await $('git', ['checkout', '-q', sha], { cwd })

    const pkg = JSON.parse(await $('git', ['--no-pager', 'show', 'HEAD:package.json'], { cwd }))

    const files = config.leanGit && pkg.files
      ? pkg.files.map(x => x.replace(/^\//, '')).concat((await fsp.readdir(cwd)).filter(x => x === 'package.json' || x.match(/^(readme|license|licence|copying)/i)))
      : []

    config.leanGit && await fsp.writeFile(
      Path.join(cwd, '.git', 'info', 'attributes'),
      (await $('git', ['--no-pager', 'show', 'HEAD:.npmignore'], { cwd }).catch(() => '')).toString().split('\n').reduce((a, x) => {
        x = x.trim()
        x && !x.startsWith('#') && !pkg.files.includes(x) && (a += x + ' export-ignore\n')
        return a
      }, '')
    )

    await $('git', ['archive', '--format=tgz', '--prefix=package/', '-o', temp + '.tgz', sha, ...files], { cwd })

    pkg.version = pkg.resolved = repo + '#' + sha
    pkg.forceCache = true

    addPaths(pkg)

    await fsp.rename(temp + '.tgz', pkg.cache)

    return pkg
  } finally {
    await fsp.rm(temp, { recursive: true })
  }

  async function $(x, args, o) {
    return new Promise((resolve, reject) => {
      const xs = []
      let stderr = ''
      const child = cp.spawn(x, args, { stdio: 'pipe', ...o })
      child.stdout.on('data', x => xs.push(x))
      child.stderr.on('data', x => stderr += x)
      child.on('close', code => {
        args[0] === 'checkout' && p(Buffer.concat(xs).toString())
        stderr ?
          reject(stderr) : code
          ? reject('Exited with ' + code + ': ' + x + ' ' + args.join(' '))
          : resolve(Buffer.concat(xs))
      })
      child.on('error', reject)
    })
  }
}

async function resolveGithub(x) {
  x = x.replace(/^github:/, '')

  const [repo, hash] = x.split('#')
  const auth = process.env.GITHUB_TOKEN ? { Authorization: 'token ' + process.env.GITHUB_TOKEN } : undefined
  const info = JSON.parse(await https.fetch('https://api.github.com', '/repos/' + repo, auth))
  const ref = hash || info.default_branch

  const { sha } = JSON.parse(await https.fetch('https://api.github.com', '/repos/' + repo + '/commits/' + ref, auth))
  const pkg = auth
    ? await https.fetch('https://api.github.com', '/repos/' + repo + '/contents/package.json?ref=' + sha, auth).then(x => JSON.parse(Buffer.from(JSON.parse(x).content, 'base64')))
    : await https.fetch('https://raw.githubusercontent.com', '/' + repo + '/' + sha + '/package.json').then(x => JSON.parse(x))

  pkg.version = 'github:' + repo + '#' + sha
  pkg.tgz = auth
    ? { origin: 'https://api.github.com', pathname: '/repos/' + repo + '/tarball/' + sha, headers: auth }
    : { origin: 'https://codeload.github.com', pathname: '/' + repo + '/tar.gz/' + sha }
  pkg.resolved = pkg.tgz.origin + pkg.tgz.pathname

  addPaths(pkg)

  return pkg
}

async function untar(pkg, x, write = true) {
  let size = 0
    , target = ''
    , output = ''
    , l = -2
    , n = -1
    , h = -1

  l = x.byteLength - 1024

  n = 0
  while (n < l) {
    h = x.indexOf(0, n)
    if (h === n)
      break

    target = x[n + 345] === 0
      ? x.toString('utf8', x.indexOf(47, n) + 1, h) // /
      : x.toString('utf8', x.indexOf(47, n + 345) + 1, x.indexOf(0, n + 345)) + '/' + x.toString('utf8', n, h)
    output = write && Path.join(pkg.local, target)

    if (x[n + 156] === 53 || x[h - 1] === 47) { // 5 /
      write && await mkdir(output)
      n += 512
    } else {
      size = parseInt(x.toString('utf8', n + 124, n + 136).trim(), 8)
      if (x[n + 156] !== 103) { // g
        const file = x.subarray(n + 512, n + 512 + size)
        target === 'package.json' && readFromPackage(pkg, JSON.parse(file))
        write && await mkdir(Path.dirname(output))
        write && await fsp.writeFile(output, file, { mode: x[103] === 53 || x[103] === 55 ? 0o766 : 0o666 })
      }
      n += 512 + Math.ceil(size / 512) * 512
    }
  }
  return pkg
}

async function cleanup() {
  const topRemove = []
  const allRemove = []
  const binRemove = []

  const top = new Set(Object.keys(lock.packages[''].dependencies).flatMap(x =>
    x.charCodeAt(0) === 64 ? [x.slice(0, x.indexOf('/')), Path.normalize(x)] : x // @
  ))

  const all = new Set(Object.entries(lock.packages).map(([id, x], i) =>
    (i = id.indexOf('@', 1), id ? safeId({ name: x.name, version: id.slice(i + 1) }) : [])
  ))

  for (const x of await fsp.readdir(Path.join(root, 'node_modules', '.sin')).catch(() => []))
    all.has(x) || allRemove.push(Path.join(root, 'node_modules', '.sin', x))

  for (const x of await fsp.readdir(Path.join(root, 'node_modules', '.bin')).catch(() => []))
    x.replace(/.exe$/, '') in bins || binRemove.push(Path.join(root, 'node_modules', '.bin', x))

  for (const x of await fsp.readdir(Path.join(root, 'node_modules')).catch(() => [])) {
    if (x === '.bin' || x === '.sin' || x === 'sin.lock')
      continue
    if (top.has(x)) {
      if (x.charCodeAt(0) === 64) { // @
        for (const name of await fsp.readdir(Path.join(root, 'node_modules', x)).catch(() => []))
          top.has(Path.join(x, name)) || topRemove.push(Path.join(root, 'node_modules', x, name))
      }
    } else {
      x[0] !== '.' && topRemove.push(Path.join(root, 'node_modules', x))
    }
  }

  await Promise.all([
    ...topRemove,
    ...allRemove,
    ...binRemove
  ].map(rm))
}

async function rm(x) {
  x.startsWith(root) ? x : Path.join(root, x)
  // Removing stuff is always dangerous - being careful!
  x.includes('node_modules') && await fsp.rm(x, { recursive: true })
}

function mkdir(x) {
  return dirs.has(x)
    ? dirs.get(x)
    : then(set(dirs, x, fsp.mkdir(x, { recursive: true })), () => set(dirs, x, true))
}

async function symlink(target, path) {
  const id = target + '$' + path
  if (symlinked.has(id))
    return symlinked.get(id)

  return set(
    symlinked,
    id,
    (async() => {
      const current = await fsp.readlink(path).catch(() => {})
      if (current === target)
        return set(symlinked, id, true)
      else if (current)
        await fsp.unlink(path)

      await mkdir(Path.dirname(path))
      await fsp.symlink(target, path, 'junction').catch(() => fsp.rm(path, { recursive: true }).then(() => fsp.symlink(target, path, 'junction')))
      return set(symlinked, id, true)
    })()
  )
}

function fetchVersion({ name, version }) {
  return !version || semver.isVersion(version) || semver.isDistTag(version)
    ? getVersion({ name, version })
    : findVersion({ name, range: version })
}

function getRegistry(name) {
  return name[0] === '@' && registries[name.slice(0, name.indexOf('/'))] || defaultRegistry
}

async function getVersion({ name, version }) {
  const id = name + '@' + version
  if (versions.has(id))
    return versions.get(id)

  return set(
    versions,
    id,
    (async() => {
      version || (version = 'latest')
      const registry = getRegistry(name)
      const cachedPath = cache({ name, version }) + '.json'
      const cached = await fsp.readFile(cachedPath).catch(() => 0)
      const headers = registry.password ? { Authorization: 'Bearer ' + registry.password } : {}
      headers['Accept-Encoding'] = 'gzip'
      const x = cached || await https.fetch(registry.origin, registry.pathname + name + '/' + version, headers)
      const json = JSON.parse(x)
      cached || await fsp.writeFile(cachedPath, x)
      json.version || (json.version = version)
      return set(versions, id, json)
    })()
  )
}

async function findVersion({ name, range }) {
  range || (range = 'latest')

  const id = name + '@' + range
  if (versions.has(id))
    return versions.get(id)

  return set(
    versions,
    id,
    (async() => {
      let { body, versions: xs } = await findVersions(name)
      let pkg = null
      let fallback = null
      while (!pkg) {
        const version = semver.best(range, xs)
        if (!version) {
          if (fallback)
            return set(versions, id, fallback)
          throw new Error('No version found for ' + name + ' @ ' + range)
        }
        pkg = getInfo(version, body) || await getVersion({ name, version })
        if (pkg.deprecated) {
          fallback || (fallback = pkg, xs = xs.slice())
          xs.splice(xs.indexOf(version), 1)
          pkg = null
          if (!xs.length)
            return set(versions, id, fallback)
        }
      }
      return set(versions, id, pkg)
    })()
  )
}

async function findVersions(name) {
  if (versions.has(name))
    return versions.get(name)

  return set(
    versions,
    name,
    (async() => {
      const registry = getRegistry(name)
      const headers = registry.password ? { Authorization: 'Bearer ' + registry.password } : {}
      headers['Accept-Encoding'] = 'gzip'
      const body = (await https.fetch(registry.origin, registry.pathname + name, headers)).toString('utf8')
      return set(versions, name, {
        body,
        versions: (body.match(/(:{|},)"\d+\.\d+\.\d+[^"]*":{"/g) || []).map(x => x.slice(3, -4))
      })
    })()
  )
}

function getInfo(version, x) {
  try {
    const lookup = '"' + version + '":{'
    let end = -1
    let l = -1
    let d = 1
    let quote = false
    let start = x.indexOf(lookup) + lookup.length
    for (let i = start; i < x.length; i++) {
      let c = x.charCodeAt(i)
      if (c === 34) { // "
        l !== 92 && (quote = !quote) // \
      } else if (quote) {
        // noop
      } else if (c === 123) { // {
        d++
      } else if (c === 125) { // }
        d--
      }
      if (d === 0) {
        end = i + 1
        break
      }
      l = c
    }

    return JSON.parse(x.slice(start - 1, end))
  } catch (err) {
    return
  }
}

function jsonRead(x) {
  return fsp.readFile(x)
    .catch(e => e.code === 'ENOENT' ? null : Promise.reject(e))
    .then(x => x === null ? x : JSON.parse(x))
}

function defaultPackage() {
  return config.global ? {} : {
    name: Path.basename(process.cwd()),
    version: '0.0.1',
    type: 'module'
  }
}

function defaultLock(x) {
  return {
    name: x.name,
    version: x.version,
    packages: {
      '': {
        name: x.name,
        version: x.version,
        dependencies: {}
      }
    }
  }
}

function getScopes() {
  const registries = {}
  for (const [k, v] of Object.entries(process.env)) {
    const [_, registry] = k.match(/^NPM_CONFIG_([^:]+):registry$/) || []
    if (registry) {
      const url = registries[registry] = new URL(v)
      url.pathname.endsWith('/') || (url.pathname += '/')
      url.password || (url.password = process.env['NPM_CONFIG_//' + url.host + url.pathname + ':_authToken'] || '')
    }
  }
  return registries
}

function getDefaultRegistry() {
  return new URL(process.env.npm_config_registry || process.env.NPM_CONFIG_REGISTRY || process.env.NPM_CONFIG_registry || 'https://registry.npmjs.org')
}

function ensureIntegrity(pkg, integrity) {
  const old = oldLock.packages[pkg.name + '@' + pkg.version]
  if (!config.force && old && old.integrity !== integrity)
    throw new Error('Integrity mismatch for ' + pkg.name + ' ' + c.dim(pkg.version) + ' ' + old.integrity + ' != ' + integrity)

  pkg.integrity = integrity
}
