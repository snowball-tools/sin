import fs from 'node:fs'
import fsp from 'node:fs/promises'
import Path from 'node:path'
import zlib from 'node:zlib'
import cp from 'child_process'
import crypto from 'node:crypto'
import config from '../config.js'
import { parsePackage } from '../shared.js'
import * as semver from './semver.js'
import * as https from './https.js'

let lockChanged = false
let cleaned = false
let ani = -1
let lightVersionRequests = 0
let versionRequests = 0
let tgzRequests = 0
let allPeers = []

let tgzDownloadTime = 0
let tgzUnzipTime = 0
let tarTime = 0
let getVersionTime = 0
let findVersionFetchTime = 0
let findVersionParseTime = 0
let getInfoTime = 0

const then = (x, fn) => typeof x.then === 'function' ? x.then(fn) : fn(x)
const set = (xs, id, x) => (xs.set(id, x), x)
const noop = () => { /* noop */ }
const host = 'registry.npmjs.org'
const overwrite = () => process.stdout.write('\x1B[F\x1B[2K')
const p = (...xs) => (ani >= 0 && overwrite(), ani = -1, console.log(...xs), xs[xs.length - 1])
const progress = (...x) => (ani >= 0 && overwrite(), ani++, console.log(...x))

const dirs = new Map()
const versions = new Map()
const packages = new Map()
const postInstalls = []
const symlinked = new Map()
const resolved = new Map()

const packageJson = await jsonRead('package.json') // || defaultPackage
const lock = (await jsonRead('package-lock.json')) || defaultLock(packageJson)
const remove = new Set(Object.keys(lock.packages))
remove.delete('')

await mkdir(config.globalPath)
const added = await fromCLI()

const pkgDependencies = {
  ...packageJson.optionalDependencies,
  ...packageJson.dependencies,
  ...packageJson.devDependencies
}

await installDependencies(pkgDependencies)

while (allPeers.length) {
  const xs = allPeers.slice()
  allPeers = []
  await Promise.all(xs.map(({ peers, pkg }) =>
    installDependencies(peers, pkg)
  ))
}

https.destroy()
cleanup()
await postInstall()

if (!config.ci) {
  writeLock()
  await writePackage(added)
}

p('requests', { versionRequests, tgzRequests, lightVersionRequests })
p('times', { tgzDownloadTime, tgzUnzipTime, tarTime })
p('more times', { getVersionTime, findVersionFetchTime, findVersionParseTime, getInfoTime })

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

    const deps = config.saveDev
      ? packageJson.devDependencies || (packageJson.devDependencies = {})
      : config.saveOptional
        ? packageJson.optionalDependencies || (packageJson.optionalDependencies = {})
        : packageJson.dependencies || (packageJson.dependencies = {})

    if (deps[pkg.name] !== pkg.version)
      deps[pkg.name] = pkg.version

    return pkg
  }))
}

async function installDependencies(dependencies, parent) {
  await Promise.all(Object.entries(dependencies).map(async([name, version]) => {
    const t = resolveType(version)
    const pkg = await (
        t === 'local'  ? addLocal('file:' + Path.resolve(version[0]))
      : t === 'git'    ? resolveGit(version)
      : t === 'https'  ? addUrl(version)
      : t === 'tar'    ? addLocalTarball(version)
      : t === 'github' ? resolveGithub(version)
      : t === 'alias'  ? addAlias()
      : t === 'npm'    ? resolveNpm(name, version)
      : Promise.reject('Unknown type')
    )

    /*
    // We could traverse from node_modules/pkgname > to find the proper lookup in pkglock
    // or pkg lock could be a dependenceny tree so we can lookup by dep path
    const satisfied = pkg.version && pkg.local in lock.packages && satisfies(lock.packages[pkg.local].version, pkg.version)
    pkg.version = satisfied
      ? lock.packages[pkg.local].version
      :
    */

    if (pkg.os && pkg.os.length && !pkg.os.some(x => x === process.platform))
      return

    if (pkg.cpu && pkg.cpu.length && !pkg.cpu.some(x => x === process.arch))
      return

    if (!pkg.version)
      throw new Error('Could not find version for ' + pkg.name + ' exp ' + version)

    const l = lock.packages[pkg.local]
    remove.delete(pkg.local)
    packages.has(pkg.global)
      ? then(packages.get(pkg.global), () => symlinkIt(pkg, parent)) // packages.get(pkg.global).then(() => installed(pkg))
      : await install(pkg, parent)
  }))

  for (const local in remove) {
    lockChanged = true
    delete lock.packages[local]
  }
}

function install(pkg, parent) {
  const { name, version, global, local } = pkg
      , id = name + '@' + version

  if (packages.has(global))
    return then(packages.get(global), ({ tar, local }) => local === pkg.local ? pkg : installed(pkg, tar))

  if (false && fs.existsSync(pkg.local)) { // is this needed?
    pkg.package = JSON.parse(fs.readFileSync(Path.join(pkg.local, 'package.json')))
    return installed(pkg)
  }

  if (fs.existsSync(global))
    return set(packages, global, then(fsp.readFile(global), tar => (pkg.tar = tar, fromGlobal(pkg, tar))))

  const hash = crypto.createHash('sha512')
  progress('⏳ ' + id)
  tgzRequests++
  let start = performance.now()
  return set(
    packages,
    global,
    then(
      https.fetch(
        pkg.url.host,
        pkg.url.pathname,
        pkg.url.headers,
        (xs, start, end) => hash.update(xs.subarray(start, end))
      ),
      async(body) => {
        pkg.sha512 = hash.digest('base64')
        tgzDownloadTime += performance.now() - start
        start = performance.now()
        pkg.tar = await new Promise((r, e) => zlib.gunzip(body, (err, x) => err ? e(err) : r(x)))
        tgzUnzipTime += performance.now() - start
        return then(
          Promise.all([
            then(mkdir(Path.dirname(pkg.global)), () => fsp.writeFile(pkg.global, pkg.tar)),
            fromGlobal(pkg, pkg.tar)
          ]),
          ([_, x]) => set(packages, global, x)
        )
      }
    )
  )

  async function fromGlobal(pkg, tar) {
    await untar(pkg, tar)
    return installed(pkg)
  }

  async function installed(pkg) {
    lockChanged = true
    lock.packages[pkg.local] = {
      version: pkg.package.version,
      resolved: pkg.resolved,
      integrity: 'sha512-' + pkg.sha512
    }

    parent || (lock.packages[''].dependencies[pkg.name] = pkg.package.version)
    pkg.package.scripts?.postinstall && postInstalls.push(pkg)
    Object.entries(pkg.package.bin === 'string' ? { [pkg.name.split('/').pop()]: pkg.package.bin } : pkg.package.bin || {}).forEach(([name, file]) => addBin(name, file, pkg.local))

    const peers = pkg.package.peerDependencies
    if (peers && pkg.package.peerDependenciesMeta) {
      for (const key in pkg.package.peerDependenciesMeta)
        pkg.package.peerDependenciesMeta[key]?.optional && delete peers[key]
    }

    peers && allPeers.push({ pkg, peers })

    await Promise.all([
      symlinkIt(pkg, parent),
      installDependencies({ ...pkg.package.optionalDependencies, ...pkg.package.dependencies }, pkg)
    ])

    return pkg
  }
}

function symlinkIt(pkg, parent) {
  if (!parent)
    return symlink(Path.join(pkg.name[0] === '@' ? '..' : '', pkg.local.slice(13)), Path.join('node_modules', ...pkg.name.split('/')))

  const path = Path.join(parent.local.slice(0, parent.local.lastIndexOf('node_modules') + 12), ...pkg.name.split('/'))
  return symlink(Path.relative(path, pkg.local).slice(3), path)
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
      }, (err, stdout, stderr) => err ? reject(err) : resolve())
    )
  ))
}

function cleanup() {
  if (remove.size) {
    lockChanged = true
    remove.forEach(x => delete lock.packages[x])
  }

  const xs = fs.existsSync('node_modules') ? fs.readdirSync('node_modules') : []
  for (const x of xs) {
    if (x.charCodeAt(0) === 46) // .
      continue
    if (x.charCodeAt(0) === 64) { // @
      const xs = fs.readdirSync(Path.join('node_modules', x))
      for (const name of xs)
        rm(x + '/' + name)
    } else {
      rm(x)
    }
  }
}

function writeLock() {
  if (Object.keys(lock.packages).length === 0) {
    fs.rmSync('package-lock.json')
    rm('node_modules')
    return
  }

  if (!lockChanged)
    return

  fs.writeFileSync('package-lock.json', JSON.stringify(lock, null, 2))
  fs.writeFileSync(Path.join('node_modules', '.package-lock.json'), JSON.stringify(lock, null, 2))
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
  pkg.url = {
    host: 'registry.npmjs.org',
    pathname: '/' + pkg.name + '/-/' + (pkg.name.split('/')[1] || pkg.name) + '-' + pkg.version.split('+')[0] + '.tgz'
  }
  pkg.resolved = 'https://' + pkg.url.host + pkg.url.pathname
  addPaths(pkg)
  return pkg
}

function addPaths(pkg) {
  const safeName = pkg.name.replace(/[#@!:/]/g, '+') + '@' + pkg.version.replace(/[#@!:/]/g, '+') // try with empty
  pkg.global = Path.join(config.globalPath, safeName)
  pkg.local = Path.join('node_modules', '.sin/', safeName, 'node_modules', ...pkg.name.split('/'))
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
  throw 'support for npm: alias not implemented'
}

async function resolveLocal() {
  throw 'support for local paths not implemented'
}

async function resolveLocalTarball() {
  throw 'support for local tarballs not implemented'
}

async function resolveUrl() {
  throw 'support for url tarballs not implemented'
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
        await $('git', ['archive', '--format=tar', '--prefix=package/', '-o', temp + '.tar', 'HEAD'], { cwd })

        const pkg = JSON.parse(await $('git', ['--no-pager', 'show', 'HEAD:package.json'], { cwd }))

        pkg.version = pathname
        pkg.resolved = pathname + '#' + sha

        addPaths(pkg)

        fsp.rename(temp + '.tar', pkg.global)

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
      pkg.url = auth
        ? { host: 'api.github.com', pathname: '/repos/' + pathname + '/tarball/' + sha, headers: auth }
        : { host: 'codeload.github.com', pathname: '/' + pathname + '/tar.gz/' + sha }
      pkg.resolved = 'https://' + pkg.url.host + pkg.url.pathname

      addPaths(pkg)

      return set(resolved, x, pkg)
    })()
  )
}

async function untar(pkg, x, write = true) {
  const start = performance.now()
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
  tarTime += performance.now() - start
  return pkg
}

function rm(x) {
  let path = 'node_modules/' + x
  if (path in lock.packages)
    return

   // Removing stuff is always dangerous - being careful!
  path = Path.normalize(path)
  if (!path.includes('node_modules'))
    return

  cleaned || (cleaned = true, console.log('Remove unused modules:'))
  console.log('-', path.slice(13))
  // fs.rmSync(path, { recursive: true })
}

function mkdir(x) {
  return dirs.has(x)
    ? dirs.get(x)
    : then(set(dirs, x, fsp.mkdir(x, { recursive: true }), () => set(dirs, x, true)))
}

async function symlink(target, path) {
  const id = target + '$' + path
  if (symlinked.has(id))
    return symlinked.get(id)

  const current = await fsp.readlink(path).catch(() => {})
  if (current === target)
    return set(symlinked, id, true)
  else if (current)
    await fsp.unlink(path)

  return set(
    symlinked,
    id,
    then(
      then(
        mkdir(Path.dirname(path)),
        () => fsp.symlink(target, path).catch(() => fsp.rm(path, { recursive: true }).then(() => fsp.symlink(target, path)))),
      () => set(symlinked, id, true)
    )
  )
}

function addBin(name, file, local) {
  const bin = Path.join(Path.dirname(local), '.bin')
  const target = Path.join('..', local.split('node_modules/').pop(), file)
  const path = Path.join(bin, name)
  fs.mkdirSync(bin, { recursive: true })
  symlink(target, path)
}

function fetchVersion(x) {
  return !x.version || semver.isVersion(x.version) || semver.isDistTag(x.version)
    ? getVersion(x)
    : findVersion(x)
}

function getVersion({ name, version }) {
  const start = performance.now()
  version || (version = 'latest')
  const pathname = '/' + name + '/' + version
  const id = pathname + '@' + version

  if (versions.has(id))
    return versions.get(id)

  progress('🔎 ' + name + '@' + version)
  lightVersionRequests++

  return set(
    versions,
    id,
    then(
      https.fetch(
        host,
        pathname
      ),
      x => {
        const json = JSON.parse(x)
        getVersionTime += performance.now() - start
        return set(versions, id, json)
      }
    )
  )
}

function findVersion(pkg) {
  let start = performance.now()
  pkg.version || (pkg.version = 'latest')

  const pathname = '/' + pkg.name
      , id = pathname + '@' + pkg.version

  if (versions.has(id))
    return versions.get(id)

  progress('🔎 ' + id.slice(1))
  versionRequests++

  return set(
    versions,
    id,
    then(
      https.fetch(
        host,
        pathname
      ),
      body => {
        findVersionFetchTime += performance.now() - start
        start = performance.now()
        const x = body.toString('utf8')
        const xs = (x.match(/(:{|},)"\d+\.\d+\.\d+[^"]*":{"/g) || []).map(x => x.slice(3, -4))
        pkg.version = semver.best(pkg.version, xs) || pkg.version
        const json = getInfo(pkg.version, x)
        findVersionParseTime += performance.now() - start
        return json
          ? set(versions, id, json)
          : getVersion(pkg).then(x => set(versions, id, x))
      }
    )
  )
}

function getInfo(version, x) {
  const starto = performance.now()
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

    const json = JSON.parse(x.slice(start - 1, end))
    getInfoTime += performance.now() - starto
    return json
  } catch (err) {
    return
  }
}

async function jsonRead(x) {
  try {
    return JSON.parse(fs.readFileSync(x))
  } catch (e) {
    return
  }
}

function defaultLock(x) {
  return {
    name: packageJson.name,
    version: packageJson.version,
    lockfileVersion: 3,
    requires: true,
    packages: {
      '': {
        name: packageJson.name,
        version: packageJson.version,
        dependencies: {}
      }
    }
  }
}
