import fs from 'node:fs'
import fsp from 'node:fs/promises'
import Path from 'node:path'
import zlib from 'node:zlib'
import cp from 'child_process'
import crypto from 'node:crypto'
import { Buffer } from 'node:buffer'
import config from '../config.js'
import { parsePackage } from '../shared.js'
import { best, isVersion, isDistTag, satisfies } from './semver.js'
import { fetch, destroy, cacheDns } from './socket.js'

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

const host = 'registry.npmjs.org'
const overwrite = () => process.stdout.write('\x1B[F\x1B[2K')
const p = (...xs) => (ani >= 0 && overwrite(), ani = -1, console.log(...xs), xs[0])
const progress = (...x) => (ani >= 0 && overwrite(), ani++, console.log(...x))

const dirs = new Map()
const versions = new Map()
const packages = new Map()
const postInstalls = new Set()
const symlinked = new Map()

const resolved = Promise.resolve()
const pkg = await jsonRead('package.json') // || defaultPackage
const lock = (await jsonRead('package-lock.json')) || defaultLock(pkg)
const remove = new Set(Object.keys(lock.packages))
remove.delete('')

const pkgDependencies = {
  ...pkg.optionalDependencies,
  ...pkg.dependencies,
  ...pkg.devDependencies
}

await cacheDns()
const added = await fromCLI()
await installDependencies(pkgDependencies)

while (allPeers.length) {
  const xs = allPeers.slice()
  allPeers = []
  await Promise.all(xs.map(({ peers, pkg }) =>
    installDependencies(peers, pkg)
  ))
}

destroy()
cleanup()
// postInstall()

writeLock()
await writePackage(added)

p('requests', { versionRequests, tgzRequests, lightVersionRequests })
p('times', { tgzDownloadTime, tgzUnzipTime, tarTime })
p('more times', { getVersionTime, findVersionFetchTime, findVersionParseTime, getInfoTime })

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

function postInstall() {
  for (const x of postInstalls) {
    p('Execute', x.package.scripts.postinstall, x.package.local)
    p(cp.execSync(x.package.scripts.postinstall, {
      stdio: 'inherit',
      cwd: x.package.local,
      env: {
        ...process.env,
        INIT_CWD: process.cwd()
      }
    }))
  }
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

async function writePackage(xs) {
  const pkg = await jsonRead('package.json')
  let needsWrite = false
  for (const { scope, name, version } of xs) {
    const full = (scope ? scope + '/' : '') + name
    const x = config.saveDev
      ? pkg.devDependencies || (pkg.devDependencies = {})
      : config.saveOptional
        ? pkg.optionalDependencies || (pkg.optionalDependencies = {})
        : pkg.dependencies || (pkg.dependencies = {})

    if (x[full] === version)
      continue

    x[full] = version
    needsWrite = true
  }

  if (needsWrite) {
    pkg.devDependencies && (pkg.devDependencies = sort(pkg.devDependencies))
    pkg.dependencies && (pkg.dependencies = sort(pkg.dependencies))
    pkg.optionalDependencies && (pkg.optionalDependencies = sort(pkg.optionalDependencies))
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2))
  }
}

function sort(x) {
  return Object.keys(x).sort().reduce((a, key) => (a[key] = x[key], a), {})
}

async function installDependencies(dependencies, parent) {
  const installs = []
  await Promise.all(Object.entries(dependencies).map(async([name, v]) => {
    if (v.startsWith('~/') || v.startsWith('/') || v.startsWith('.') || v.indexOf(':\\') === 1 || v.indexOf('file:') === 0)
      return p('Cannot use', v)

    if (v.indexOf('github:') === 0)
      return p('Cannot use', v)

    if (v.indexOf('git@') === 0)
      return p('Cannot use', v)

    const pkg = v.indexOf('npm:') === 0
      ? parsePackage(v.slice(4))
      : parsePackage(name + '@' + v)

    /*
    // We could traverse from node_modules/pkgname > to find the proper lookup in pkglock
    // or pkg lock could be a dependenceny tree so we can lookup by dep path
    const satisfied = pkg.version && pkg.local in lock.packages && satisfies(lock.packages[pkg.local].version, pkg.version)
    pkg.version = satisfied
      ? lock.packages[pkg.local].version
      :
    */

    const { version, os, cpu } = await fetchVersion(pkg)
    if (os && os.length && !os.some(x => x === process.platform))
      return

    if (cpu && cpu.length && !cpu.some(x => x === process.arch))
      return

    if (!version)
      throw new Error('Could not find version for ' + pkg.scope + '' + pkg.name + ' exp ' + pkg.version)

    pkg.version = version
    addPaths(pkg, parent)

    const l = lock.packages[pkg.local]
    remove.delete(pkg.local)

    pkg.url = 'https://registry.npmjs.org' + tgzPath(pkg)
    packages.has(pkg.global)
      ? then(packages.get(pkg.global), () => symlinkIt(pkg, parent)) // packages.get(pkg.global).then(() => installed(pkg))
      : await install(pkg, parent)
  }))

  for (const local in remove) {
    lockChanged = true
    delete lock.packages[local]
  }
}

function then(x, fn) {
  return typeof x.then === 'function'
    ? x.then(fn)
    : fn(x)
}

function addPaths(pkg, parent) {
  const { scope, name, version } = pkg
  pkg.global = Path.join(config.globalPath, (scope ? scope + '+' : '') + name + '@' + version)
  pkg.local = 'node_modules/.sin/' + (scope ? scope + '+' : '') + name + '@' + version + '/node_modules/' + (scope ? scope + '/' : '') + name
}

function fromCLI() {
  return Promise.all(config._.map(x => {
    if ('.~/\\'.includes(x[0]) || x.slice(1, 3) === ':\\')
      return getLocal('file:' + Path.resolve(x[0]))
    else if (x.startsWith('git://') || x.startsWith('https://'))
      return getGit(x)

    const pkg = parsePackage(x)
    if (pkg.name && pkg.pathname)
      return getGithub('github:' + pkg.name + '/' + pkg.pathname + pkg.hash)

    return getNpm(pkg)
  }))
}

async function getLocal(x) {
  return console.log('Get Local ', x)
}

async function getGithub(x) {
  return console.log('Get Github ', x)
}

async function getNpm(pkg) {
  const id = (pkg.scope ? pkg.scope + '/' : '') + pkg.name

  if ((!pkg.version && id in pkgDependencies) || pkgDependencies[id] === pkg.version) {
    pkg.version = pkgDependencies[id].version
    return pkg
  }

  // can we shortcut and use installDependencies()?
  if (!pkg.version || !isVersion(pkg.version))
    pkg.version = await getVersion(pkg)

  addPaths(pkg)

  if (pkg.local in lock.packages) {
    const l = lock.packages[pkg.local]
    if (l.version === pkg.version) {
      remove.delete(pkg.local)
      return pkg
    }
  }

  return install(pkg)
}

function tgzPath({ scope, name, version }) {
  return '/' + (scope ? scope + '/' + name : name) + '/-/' + name + '-' + version.split('+')[0] + '.tgz'
}

async function install(pkg, parent) {
  const { scope, name, version, global, local } = pkg
      , full = (scope ? scope + '/' : '') + name
      , id = full + '@' + version

  if (packages.has(global))
    return then(packages.get(global), ({ tar, local }) => local === pkg.local ? pkg : installed(pkg, tar))

  if (false && fs.existsSync(pkg.local)) {
    pkg.package = JSON.parse(fs.readFileSync(Path.join(pkg.local, 'package.json')))
    return installed(pkg)
  }

  if (fs.existsSync(global))
    return packages.set(global, fsp.readFile(global).then(tar => (pkg.tar = tar, fromGlobal(pkg, tar)))).get(global)

  const hash = crypto.createHash('sha512')
      , pathname = tgzPath(pkg)

  pkg.url = 'https://' + host + pathname

  progress('⏳ ' + id)
  tgzRequests++
  let start = performance.now()
  return set(
    packages,
    global,
    then(
      fetch(
        host,
        pathname,
        //(xs, start, end) => hash.update(xs.subarray(start, end))
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
      resolved: pkg.url,
      integrity: 'sha512-' + pkg.sha512
    }

    parent || (lock.packages[''].dependencies[full] = pkg.package.version)
    pkg.package.scripts?.postinstall && postInstalls.add(pkg)
    Object.entries(pkg.package.bin === 'string' ? { [pkg.name]: pkg.package.bin } : pkg.package.bin || {}).forEach(([name, file]) => addBin(name, file, pkg.local))

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

function symlinkIt({ scope, name, version, local }, parent) {
  return parent
    ? symlink(
        Path.join('..', '..', scope ? '..' : '', (scope ? scope + '+' : '') + name + '@' + version, 'node_modules', scope, name),
        Path.join(parent.local.slice(0, parent.local.lastIndexOf('node_modules/') + 12), scope, name)
      )
    : symlink(
      Path.join(scope ? '..' : '', local.slice(13)),
      Path.join('node_modules', scope, name)
    )
}

async function untar(pkg, x) {
  const start = performance.now()
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
      await mkdir(output)
      n += 512
    } else {
      size = parseInt(x.toString('utf8', n + 124, n + 136).trim(), 8)
      if (x[n + 156] !== 103) {
        const file = x.subarray(n + 512, n + 512 + size)
        target === 'package.json' && (pkg.package = JSON.parse(file))
        await mkdir(Path.dirname(output))
        await fsp.writeFile(output, file)
      }
      n += 512 + Math.ceil(size / 512) * 512
    }
  }
  tarTime += performance.now() - start
  return pkg
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

  return set(
    symlinked,
    id,
    then(then(mkdir(Path.dirname(path)), () => fsp.symlink(target, path)), () => set(symlinked, id, true))
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
  return !x.version || isVersion(x.version) || isDistTag(x.version)
    ? getVersion(x)
    : findVersion(x)
}

function getVersion({ scope, name, version }) {
  const start = performance.now()
  version || (version = 'latest')
  const pathname = '/' + (scope ? scope + '/' : '') + name + '/' + version
  const id = pathname + '@' + version

  if (versions.has(id))
    return versions.get(id)

  progress('🔎 ' + id.slice(1))
  lightVersionRequests++

  return set(
    versions,
    id,
    then(
      fetch(
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

function set(xs, id, x) {
  xs.set(id, x)
  return x
}

function findVersion(pkg) {
  let start = performance.now()
  pkg.version || (pkg.version = 'latest')

  const pathname = '/' + (pkg.scope ? pkg.scope + '/' : '') + pkg.name
      , id = pathname + '@' + pkg.version

  if (versions.has(id))
    return versions.get(id)

  progress('🔎 ' + id.slice(1))
  versionRequests++

  return set(
    versions,
    id,
    then(
      fetch(
        host,
        pathname
      ),
      body => {
        findVersionFetchTime += performance.now() - start
        start = performance.now()
        const x = body.toString('utf8')
        const xs = (x.match(/(:{|},)"\d+\.\d+\.\d+[^"]*":{"/g) || []).map(x => x.slice(3, -4))
        pkg.version = best(pkg.version, xs)
        const json = getInfo(pkg.version, x)
        findVersionParseTime += performance.now() - start
        return set(versions, id, json)
      }
    )
  )
}

function getInfo(version, x) {
  const starto = performance.now()
  version = '"' + version + '":{'
  let end = -1
  let l = -1
  let d = 1
  let quote = false
  let start = x.indexOf(version) + version.length
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
    name: pkg.name,
    version: pkg.version,
    lockfileVersion: 3,
    requires: true,
    packages: {
      '': {
        name: pkg.name,
        version: pkg.version,
        dependencies: {}
      }
    }
  }
}
