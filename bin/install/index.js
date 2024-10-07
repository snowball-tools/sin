import fs from 'node:fs'
import fsp from 'node:fs/promises'
import Path from 'node:path'
import zlib from 'node:zlib'
import cp from 'child_process'
import { webcrypto } from 'crypto'
import config from '../config.js'
import { parsePackage } from '../shared.js'
import * as semver from './semver.js'
import * as https from './https.js'
import c from '../color.js'

let peers = []
  , lockChanged = false
  , clear = false
  , log = ''
  , clock = ''

const then = (x, fn) => x && typeof x.then === 'function' ? x.then(fn) : fn(x)
    , set = (xs, id, x) => (xs.set(id, x), x)
    , noop = () => { /* noop */ }
    , overwrite = () => process.stdout.write('\x1B[F\x1B[2K')
    , p = (...xs) => (clear && overwrite(), clear = log = false, console.log(...xs), xs[xs.length - 1]) // eslint-disable-line
    , clocks = ['🕛', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', ]
    , progress = x => log = x // eslint-disable-line

const animation = setInterval(() => log && (clear && overwrite(), console.log(clock = clocks[(clocks.indexOf(clock) + 1) % clocks.length], log), clear = true), 67).unref()

const bins = []
    , leafs = []
    , dirs = new Map()
    , packages = new Map()
    , postInstalls = []
    , symlinked = new Map()
    , resolved = new Map()
    , versions = new Map()

const registries = getScopes()
    , defaultRegistry = getDefaultRegistry()
    , packageJson = await jsonRead('package.json') || defaultPackage()
    , oldLock = (await jsonRead('package-sins.json')) || (await jsonRead(Path.join('node_modules', '.package-sins.json'))) || defaultLock(packageJson)
    , lock = defaultLock(packageJson)

await mkdir(config.globalPath)

const added = await fromCLI()
const pkgDependencies = {
  ...packageJson.optionalDependencies,
  ...packageJson.dependencies,
  ...packageJson.devDependencies
}

!oldLock.dependencies && (oldLock.dependencies = {})

await installDependencies(pkgDependencies)
await installPeers()
await Promise.all(leafs)

https.destroy()
await postInstall()
await addBins()

if (!config.ci) {
  await writePackage(added)
  await writeLock()
  await cleanup()
  added.length && p('Added', added.length, 'module' + (added.length === 1 ? ':' : 's:'))
  added.forEach(x => p(c.green('- ' + x.name), c.gray(x.version)))
}

p('Finished in', (process.uptime() * 1000).toFixed(2) + 'ms')

async function installPeers() {
  const choosen = { ...lock.packages[''].dependencies }
  while (peers.length) {
    const besties = {}
    await Promise.all(peers.map(async (x) => {
      let { name, range, parent, force, optional, lookup } = x
      if (name in choosen) {
        if (semver.satisfies(choosen[name], range))
          return optional || install([name, choosen[name]], parent, force)
        else
          throw new Error(name + '@' + range + ' does not satisfy choosen version of ' + choosen[name])
      }
      const best = name in besties && besties[name]
      if (best && semver.satisfies(best.pkg.version, range))
        return best.packages.push(x)

      const pkg = await lookup
      if (!pkg)
        throw new Error('Could not find version for ' + pkg.name + ' exp ' + range)

      if (!best)
        return besties[name] = { pkg, range, packages: [x] }

      if (!semver.satisfies(pkg.version, best.range))
        throw new Error(pkg.name + '@' + range + ' does not intersect with ' + best.pkg.range)

      best.range = range
      best.pkg = pkg
      best.packages.push(x)
    }))
    peers = []
    await Promise.all(Object.entries(besties).map(([name, { pkg, packages }]) => {
      choosen[pkg.name] = pkg.version
      return Promise.all(packages.map(({ parent, force, optional }) =>
        optional || install([name, pkg.version], parent, force)
      ))
    }))
  }
}

async function addBins() {
  await Promise.all(Object.values(bins).map(({ target, path }) => symlink(target, path)))
}

function fromCLI() {
  return Promise.all(config._.map(async x => {
    const t = resolveType(x)
    const pkg = await (
        t === 'local'  ? resolveLocal('file:' + Path.resolve(x[0]))
      : t === 'git'    ? resolveGit(x)
      : t === 'https'  ? resolveUrl(x)
      : t === 'tar'    ? resolveLocalTarball(x)
      : t === 'github' ? resolveGithub(x)
      : t === 'alias'  ? resolveAlias(x)
      : fetchVersion(parsePackage(x))
    )

    if (oldLock.packages[''].dependencies[pkg.name] === pkg.version)
      return

    const deps = config.saveDev
      ? packageJson.devDependencies || (packageJson.devDependencies = {})
      : config.saveOptional
        ? packageJson.optionalDependencies || (packageJson.optionalDependencies = {})
        : packageJson.dependencies || (packageJson.dependencies = {})

    if (deps[pkg.name] !== pkg.version)
      deps[pkg.name] = pkg.version

    return pkg
  })).then(xs => xs.filter(x => x))
}

async function installDependencies(dependencies, parent, force = config.force || config.ci) {
  return Promise.all(Object.entries(dependencies).map(x =>
    install(x, parent, force || oldLock.dependencies[x.name] !== x.version)
  ))
}

function supported(pkg) {
  if (pkg.os && pkg.os.length && !pkg.os.some(x => x === process.platform))
    return false

  if (pkg.cpu && pkg.cpu.length && !pkg.cpu.some(x => x === process.arch))
    return false

  return true
}

async function install([name, version], parent, force) {
  version.charCodeAt(0) === 118 && (version = version.slice(1)) // v
  const id = name + '@' + version
  if (packages.has(id))
    return leafs.push(then(packages.get(id), x => finished(x, parent)))

  return set(
    packages,
    id,
    (async() => {
      progress(name + c.gray(' ' + version))

      if (!force && (parent || oldLock.dependencies[name] === pkgDependencies[name])) {
        const parentLock = oldLock.packages[parent ? parent.name + '@' + parent.version : '']
        const lockVersion = parentLock?.dependencies?.[name]
        const id = name + '@' + lockVersion
        const locked = oldLock.packages[id]
        if (lockVersion) {
          const pkg = { name, version: lockVersion, ...locked }
          addPaths(pkg)
          if (locked && !supported(pkg)) {
            setDependency(pkg, parent)
            return set(packages, id, pkg)
          }

          pkg.package = pkg.local && await jsonRead(Path.join(pkg.local, 'package.json'))
          if (pkg.package && lockVersion === pkg.package.version) {
            await finished(pkg, parent, force)
            await installDependencies({ ...pkg.package.optionalDependencies, ...pkg.package.dependencies }, pkg, force)
            return set(packages, id, pkg)
          }

          const [tar, sha512] = await fsp.readFile(pkg.global).then(gunzip).catch(() => [])
          if (tar)
            return (pkg.integrity = 'sha512-' + sha512, set(packages, id, await installed(await untar(pkg, tar), parent, force)))

          version = lockVersion
        }
      }

      const t = resolveType(version)
      const pkg = await (
          t === 'local'  ? resolveLocal('file:' + Path.resolve(version[0]))
        : t === 'git'    ? resolveGit(version)
        : t === 'https'  ? resolveUrl(version)
        : t === 'tar'    ? resolveLocalTarball(version)
        : t === 'github' ? resolveGithub(version)
        : t === 'alias'  ? resolveAlias(name, version)
        : t === 'npm'    ? resolveNpm(name, version)
        : Promise.reject('Unknown type')
      )
      pkg.package = pkg

      if (!supported(pkg))
        return set(packages, id, await installed(pkg, parent, force))

      if (!pkg.version)
        throw new Error('Could not find version for ' + pkg.name + ' exp ' + version)

      const global = await fsp.readFile(pkg.global).then(gunzip).catch(() => [])
      if (global[0])
        return (pkg.integrity = 'sha512-' + global[1], set(packages, id, await installed(await untar(pkg, global[0]), parent, force)))

      const body = await https.fetch(pkg.tgz.hostname, pkg.tgz.pathname, pkg.tgz.headers)
      const [tar, sha512] = await gunzip(body)
      pkg.integrity = 'sha512-' + sha512
      await Promise.all([
        then(mkdir(Path.dirname(pkg.global)), () => fsp.writeFile(pkg.global, body)),
        untar(pkg, tar).then(() => installed(pkg, parent, force))
      ])
      return set(packages, id, pkg)
    })()
  )
}

function gunzip(x) {
  return Promise.all([
    new Promise((resolve, reject) => zlib.gunzip(x, (err, x) => err ? reject(err) : resolve(x))),
    webcrypto.subtle.digest('SHA-512', x).then(x => Buffer.from(x).toString('base64'))
  ])
}

async function finished(pkg, parent) {
  setDependency(pkg, parent)

  if (!parent) {
    Object.entries(
      typeof pkg.package.bin === 'string'
      ? { [pkg.name.split('/').pop()]: pkg.package.bin }
      : pkg.package.bin || {}
    ).forEach(([name, file]) => bins[name] = {
      target: Path.join('..', pkg.local.split('node_modules/').pop(), file),
      path: Path.join('node_modules', '.bin', name)
    })

    return symlink(Path.join(pkg.name[0] === '@' ? '..' : '', pkg.local.slice(13)), Path.join('node_modules', ...pkg.name.split('/')))
  }

  const path = Path.join(parent.local.slice(0, parent.local.lastIndexOf('node_modules') + 12), ...pkg.name.split('/'))
  await symlink(Path.relative(path, pkg.local).slice(3), path)
  return pkg
}

function setDependency(pkg, parent) {
  pkg.name + '@' + pkg.version in lock.packages || (lock.packages[pkg.name + '@' + pkg.version] = {
    resolved: pkg.resolved,
    integrity: pkg.integrity,
    cpu: pkg.cpu,
    os: pkg.os
  })

  if (!parent)
    return lock.packages[''].dependencies[pkg.name] = pkg.version

  const id = parent.name + '@' + parent.version
  'dependencies' in lock.packages[id]
    ? lock.packages[id].dependencies[pkg.name] = pkg.version
    : lock.packages[id].dependencies = { [pkg.name]: pkg.version }
}

async function installed(pkg, parent, force) {
  pkg.package.scripts?.postinstall && postInstalls.push(pkg)

  await Promise.all([
    finished(pkg, parent),
    installDependencies({ ...pkg.package.optionalDependencies, ...pkg.package.dependencies }, pkg, force)
  ])

  for (const [name, range] of Object.entries(pkg.package.peerDependencies || {}))
    peers.push({ name, range, parent: pkg, force, lookup: findVersion({ name, range }), optional: pkg.package.peerDependenciesMeta?.[name]?.optional || false })

  lockChanged = true

  return pkg
}

function postInstall() {
  return Promise.all(postInstalls.map(x =>
    new Promise((resolve, reject) =>
      cp.exec(x.package.scripts.postinstall, {
        stdio: 'inherit',
        cwd: x.local,
        env: {
          ...process.env,
          INIT_CWD: process.cwd()
        }
      }, err => err ? reject(err) : resolve())
    )
  ))
}

async function writeLock() {
  if (Object.keys(lock.packages).length === 0) {
    await rm('package-sins.json')
    await rm('node_modules')
    return
  }

  if (!lockChanged) // perhaps just deep equal?
    return

  lock.dependencies = pkgDependencies
  sort(lock, 'dependencies')
  sort(lock, 'packages')
  Object.values(lock.packages).forEach(x => sort(x, 'dependencies'))
  fs.writeFileSync('package-sins.json', JSON.stringify(lock, null, 2))

  function sort(x, k) {
    x[k] && (x[k] = Object.fromEntries(Object.entries(x[k]).sort(([a], [b]) => a > b ? 1 : a < b ? -1 : 0)))
  }
}

async function writePackage(xs) {
  const pkg = await jsonRead('package.json')
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
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2))
  }

  function sort(x) {
    return Object.keys(x).sort().reduce((a, key) => (a[key] = x[key], a), {})
  }
}

async function resolveNpm(name, version) {
  const pkg = await fetchVersion(parsePackage(name + '@' + version))
  const registry = getRegistry(name)
  pkg.tgz = {
    port: registry.port || 443,
    protocol: registry.protocol || 'https',
    hostname: registry.hostname,
    pathname: registry.pathname + pkg.name + '/-/' + (pkg.name.split('/')[1] || pkg.name) + '-' + pkg.version.split('+')[0] + '.tgz',
    headers: registry.password ? { Authorization: 'Bearer ' + registry.password } : {}
  }

  pkg.resolved = 'https://' + pkg.tgz.hostname + pkg.tgz.pathname
  pkg.integrity = pkg.dist?.integrity
  addPaths(pkg)
  return pkg
}

function addPaths(pkg) {
  pkg.local = localPath(pkg)
  pkg.global = globalPath(pkg)
}

function globalPath({ name, version }) {
  return Path.join(config.globalPath, safeId({ name, version }))
}

function localPath({ name, version }) {
  return Path.join('node_modules', '.sin/', safeId({ name, version }), 'node_modules', ...name.split('/'))
}

function safeId({ name, version }) {
  return name.replace(/[#@!:/]/g, '+') + '@' + version.replace(/[#@!:/]/g, '+')
}

function resolveType(x) {
  return x.startsWith('file:') || x.startsWith('~/') || x.startsWith('/') || x.startsWith('./') || x.slice(1, 3) === ':\\' || x.startsWith('.\\')
    ? 'local'
    : x.startsWith('git+ssh:') || x.startsWith('git+https:') || x.startsWith('git:') || x.startsWith('git@')
    ? 'git'
    : x.startsWith('https:')
    ? 'https'
    : x.endsWith('.tgz') || x.endsWith('.tar') || x.endsWith('.tar.gz')
    ? 'tar'
    : x.startsWith('github:') || (x[0] !== '@' && x.indexOf('/') > 1)
    ? 'github'
    : x.startsWith('npm:')
    ? 'alias'
    : 'npm'
}

async function resolveAlias() {
  throw new Error('support for npm: alias not implemented')
}

async function resolveLocal() {
  throw new Error('support for local paths not implemented')
}

async function resolveLocalTarball() {
  throw new Error('support for local tarballs not implemented')
}

async function resolveUrl() {
  throw new Error('support for url tarballs not implemented')
}

async function resolveGit(x) {
  if (resolved.has(x))
    return resolved.get(x)

  return set(
    resolved,
    x,
    (async() => {
      let [pathname, ref = 'HEAD'] = x.split('#')
        , temp = Path.join(config.home, '.temp', Math.random().toString(36).slice(2))

      try {
        await mkdir(temp)
        await $('git', ['clone', '-q', '--tags', '--depth=1', pathname.replace(/^git\+/, ''), 'x'], { cwd: temp })
        const cwd = Path.join(temp, 'x')
        await $('git', ['fetch', '-q', '--depth=1', '--tags'], { cwd })
        const sha = (await $('git', ['rev-parse', ref], { cwd, stdio: 'pipe' })).toString().trim()
        await $('git', ['fetch', '-q', '--depth=1', 'origin', sha], { cwd })
        await $('git', ['checkout', '-q', sha], { cwd })
        await $('git', ['archive', '--format=tar', '--prefix=package/', '-o', temp + '.tgz', 'HEAD'], { cwd })

        const pkg = JSON.parse(await $('git', ['--no-pager', 'show', 'HEAD:package.json'], { cwd }))

        pkg.version = pathname
        pkg.resolved = pathname + '#' + sha

        addPaths(pkg)

        fsp.rename(temp + '.tgz', pkg.global)

        return set(resolved, x, pkg)
      } finally {
        await fsp.rm(temp, { recursive: true })
      }
    })()
  )

  async function $(x, args, o) {
    return new Promise((resolve, reject) => {
      const xs = []
      let stderr = ''
      const child = cp.spawn(x, args, { stdio: 'pipe', ...o })
      child.stdout.on('data', x => xs.push(x))
      child.stderr.on('data', x => stderr += x)
      child.on('close', () => stderr ? reject(stderr) : resolve(Buffer.concat(xs)))
      child.on('error', reject)
    })
  }
}

async function resolveGithub(x) {
  x = x.replace(/^github:/, '')
  if (resolved.has(x))
    return resolved.get(x)

  return set(
    resolved,
    x,
    (async() => {
      let pkg = parsePackage(x)
        , pathname = pkg.name + pkg.pathname

      const auth = process.env.GITHUB_TOKEN ? { Authorization: 'token ' + process.env.GITHUB_TOKEN } : undefined
      const info = JSON.parse(await https.fetch('api.github.com', '/repos/' + pathname, auth))

      const ref = pkg.hash
        ? pkg.hash.slice(1)
        : info.default_branch

      const { sha } = JSON.parse(await https.fetch('api.github.com', '/repos/' + pathname + '/commits/' + ref, auth))
      pkg = auth
        ? await https.fetch('api.github.com', '/repos/' + pathname + '/contents/package.json?ref=' + sha, auth).then(x => JSON.parse(Buffer.from(JSON.parse(x).content, 'base64')))
        : await https.fetch('raw.githubusercontent.com', '/' + pathname + '/' + sha + '/package.json').then(x => JSON.parse(x))

      pkg.version = 'github:' + pathname + '#' + sha
      pkg.tgz = auth
        ? { hostname: 'api.github.com', pathname: '/repos/' + pathname + '/tarball/' + sha, headers: auth }
        : { hostname: 'codeload.github.com', pathname: '/' + pathname + '/tar.gz/' + sha }
      pkg.resolved = 'https://' + pkg.tgz.hostname + pkg.tgz.pathname

      addPaths(pkg)

      return set(resolved, x, pkg)
    })()
  )
}

async function untar(pkg, x, write = true) {
  const writeFile = write ? fsp.writeFile : noop
  const writeDir = write ? mkdir : noop
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
      ? x.toString('utf8', x.indexOf(47, n) + 1, h)
      : x.toString('utf8', x.indexOf(47, n + 345) + 1, x.indexOf(0, n + 345)) + x.toString('utf8', n, h)
    output = Path.join(pkg.local, target)

    if (x[n + 156] === 53 || x[h - 1] === 47) { // /
      await writeDir(output)
      n += 512
    } else {
      size = parseInt(x.toString('utf8', n + 124, n + 136).trim(), 8)
      if (x[n + 156] !== 103) {
        const file = x.subarray(n + 512, n + 512 + size)
        target === 'package.json' && (pkg.package = JSON.parse(file))
        await writeDir(Path.dirname(output))
        await writeFile(output, file, { mode: x[103] === 53 || x[103] === 55 ? 0o766 : 0o666 })
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

  const all = new Set(Object.keys(lock.packages).map((x, i) =>
    (i = x.indexOf('@', 1), x ? safeId({ name: x.slice(0, i), version: x.slice(i + 1) }) : [])
  ))

  for (const x of await fsp.readdir(Path.join('node_modules', '.sin')).catch(() => []))
    all.has(x) || allRemove.push(Path.join('node_modules', '.sin', x))

  for (const x of await fsp.readdir(Path.join('node_modules', '.bin')).catch(() => []))
    x in bins || binRemove.push(Path.join('node_modules', '.bin', x))

  for (const x of await fsp.readdir('node_modules').catch(() => [])) {
    if (x === '.bin' || x === '.sin' || x === '.package-sins.json')
      continue
    if (top.has(x)) {
      if (x.charCodeAt(0) === 64) { // @
        for (const name of await fsp.readdir(Path.join('node_modules', x)).catch(() => []))
          top.has(Path.join(x, name)) || topRemove.push(Path.join('node_modules', x, name))
      }
    } else {
      x[0] !== '.' && topRemove.push(Path.join('node_modules', x))
    }
  }

  await Promise.all([
    ...topRemove,
    ...allRemove,
    ...binRemove
  ].map(rm))

  const s = allRemove.length - topRemove.length
      , l = topRemove.length

  l && p('Removed', l, 'unused module folder' + (l === 1 ? '' : 's') + (s > 0 ? ' and ' + s + ' subdependenc' + (s === 1 ? 'y' : 'ies') : ''))
  topRemove.forEach(x => p(c.red('- ' + x.slice(13))))
}

async function rm(x) {
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
      await fsp.symlink(target, path, 'junction').catch(() => fsp.rm(path, { recursive: true }).then(() => fsp.symlink(target, path)))
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
      const cachedPath = globalPath({ name, version }) + '.json'
      const cached = await fsp.readFile(cachedPath).catch(() => 0)
      cached || progress(name + c.gray(' ' + version))
      const headers = registry.password ? { Authorization: 'Bearer ' + registry.password } : {}
      const x = cached || await https.fetch(registry.hostname, registry.pathname + name + '/' + version, headers)
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
    (async () => {
      progress(name + c.gray(' ' + (range.length > 30 ? range.slice(0,27) + '...' : range)))

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
      const body = (await https.fetch(registry.hostname, registry.pathname + name, headers)).toString('utf8')
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
        l !== 92 && (quote = !quote)
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
  return {
    name: Path.basename(process.cwd()),
    version: '0.0.1',
    type: 'module'
  }
}

function defaultLock(x) {
  return {
    name: x.name,
    version: x.version,
    dependencies: {},
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
  return new URL(process.env.npm_config_registry || 'https://registry.npmjs.org')
}
