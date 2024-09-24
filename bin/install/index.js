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
import { get, destroy, cacheDns } from './socket.js'

let lockChanged = false
let cleaned = false
let ani = -1
let lightVersionRequests = 0
let versionRequests = 0
let tgzRequests = 0
let allPeers = []

const overwrite = () => process.stdout.write('\x1B[F\x1B[2K')
const p = (...xs) => (ani >= 0 && overwrite(), ani = -1, console.log(...xs), xs[0])
const clocks = ['🕐', '🕜', '🕑', '🕝', '🕒', '🕟', '🕞', '🕠', '🕓', '🕡', '🕢', '🕔', '🕕', '🕖', '🕣', '🕗', '🕤', '🕘', '🕥', '🕙', '🕦', '🕚', '🕧', '🕛']
const moveClock = () => (ani >= 0 && overwrite(), console.log(clocks[ani++ % clocks.length]))
const animate = (...x) => (ani >= 0 && overwrite(), ani++, console.log(...x))

const installed = new Set()
const pending = new Set()
const dirs = new Map()
const versions = new Map()
const packages = new Map()
const postInstalls = new Set()

process.on('SIGINT', function(){
  console.log('pending', [...pending], { versionRequests, tgzRequests, lightVersionRequests })
  console.log(packages)
  process.exit()
})

const resolved = Promise.resolve()
const pkg = await jsonRead('package.json') // || defaultPackage
const lock = await jsonRead('package-lock.json') || defaultLock(pkg)
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

p('Finished', { versionRequests, tgzRequests, lightVersionRequests })

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

    if (!pkg.version || !isVersion(pkg.version)) {

      /*
      // We could traverse from node_modules/pkgname > to find the proper lookup in pkglock
      // or pkg lock could be a dependenceny tree so we can lookup by dep path
      const satisfied = pkg.version && pkg.local in lock.packages && satisfies(lock.packages[pkg.local].version, pkg.version)
      pkg.version = satisfied
        ? lock.packages[pkg.local].version
        :
      */

      pkg.version = await getVersion(pkg)
    }

    addPaths(pkg, parent)

    const l = lock.packages[pkg.local]
    remove.delete(pkg.local)

    pkg.url = 'https://registry.npmjs.org' + tgzPath(pkg)
    pending.add((pkg.scope?pkg.scope + '/':'') + pkg.name)
    packages.has(pkg.global)
      ? packages.get(pkg.global).then(() => symlinkIt(pkg, parent)) // packages.get(pkg.global).then(() => installed(pkg))
      : installs.push(install(pkg, parent).then(x => (pending.delete((pkg.scope?pkg.scope + '/':'') + pkg.name), x)))
  }))

  for (const local in remove) {
    lockChanged = true
    delete lock.packages[local]
  }

  return Promise.all(installs)
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
    return packages.get(global).then(({ tar, local }) => local === pkg.local ? pkg : fromGlobal(pkg, tar))

  if (false && fs.existsSync(pkg.local)) {
    pkg.package = JSON.parse(fs.readFileSync(Path.join(pkg.local, 'package.json')))
    return installed(pkg)
  }

  if (false && fs.existsSync(global))
    return packages.set(global, fsp.readFile(global).then(tar => (pkg.tar = tar, fromGlobal(pkg, tar)))).get(global)

  let l = -2
    , n = -1
    , h = -1
    , t = ''
    , x

  const hash = crypto.createHash('sha512')
      , host = 'registry.npmjs.org'
      , pathname = tgzPath(pkg)

  pkg.url = 'https://' + host + pathname

  animate('⏳ ' + id)
  tgzRequests++
  return packages.set(
    global,
    get(host, 'GET ' + pathname + ' HTTP/1.1\nHost: registry.npmjs.org\n\n', (end, buffer, resolve) => {
      if (l === -2) {
        if (!(buffer[9] === 50 && buffer[10] === 48 && buffer[11] === 48))
          throw new Error(host + pathname + ' failed with: ' + buffer.subarray(0, buffer.indexOf(10)).toString())

        t = buffer.subarray(0, end).toString().toLowerCase()
        h = t.indexOf('content-length:')
        n = t.indexOf('\n', h)
        l = +t.slice(h + 15, n)
        x = Buffer.allocUnsafe(l)

        while (buffer[n + 1] !== 10 && buffer[n + 2] !== 10)
          n = buffer.indexOf(10, n + 1)

        n = buffer.indexOf(10, n + 1) + 1
      }

      buffer.copy(x, x.byteLength - l, n, end)
      hash.update(buffer.subarray(n, end))
      l -= end - n
      n = 0

      if (l <= 0)
        resolve()

    }).then(() => {
      pkg.sha512 = hash.digest('base64')
      pkg.tar = zlib.gunzipSync(x)
      return Promise.all([
        mkdir(Path.dirname(pkg.global)).then(() => fsp.writeFile(pkg.global, pkg.tar)),
        fromGlobal(pkg, pkg.tar)
      ]).then(([_, x]) => x)
    })
  ).get(global)

  async function fromGlobal(pkg, tar) {
    await unpackTar(pkg, tar)
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

    const bin = pkg.package.bin
    typeof bin === 'string'
      ? addBin(pkg.name, bin, pkg.local)
      : typeof bin === 'object'
      && Object.entries(bin).forEach(([name, file]) => addBin(name, file, pkg.local))

    if (pkg.package.scripts?.postinstall) {
      p('\n\nPostinstall for', scope, name, pkg.package.scripts.postinstall, '\n\n')
      postInstalls.add(pkg)
    }

    symlinkIt(pkg, parent)

    const peers = pkg.package.peerDependencies
    if (false && peers && pkg.package.peerDependenciesMeta) {
      for (const key in pkg.package.peerDependenciesMeta)
        pkg.package.peerDependenciesMeta[key].optional && delete peers[key]
    }

    peers && allPeers.push({ pkg, peers })
    const deps = { ...pkg.package.optionalDependencies, ...pkg.package.dependencies }

    await installDependencies(deps, pkg)

    return pkg
  }
}

async function symlinkIt({ scope, name, version, local }, parent) {
  symlink(
    Path.join('..', '..', scope ? '..' : '', (scope ? scope + '+' : '') + name + '@' + version, 'node_modules', scope, name),
    Path.join(local, scope, name)
  )

  parent
    ? symlink(
        Path.join('..', '..', scope ? '..' : '', (scope ? scope + '+' : '') + name + '@' + version, 'node_modules', scope, name),
        Path.join(parent.local.slice(0, parent.local.lastIndexOf('node_modules/') + 12), scope, name)
      )
    : symlink(
      Path.join(scope ? '..' : '', local.slice(13)),
      Path.join('node_modules', scope, name)
    )
}

async function unpackTar(pkg, x) {
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

  return pkg
}

function mkdir(x) {
  return dirs.has(x)
    ? dirs.get(x)
    : dirs.set(x, fsp.mkdir(x, { recursive: true })).get(x)
}

function symlink(target, path) {
  try {
    fs.mkdirSync(Path.dirname(path), { recursive: true })
    fs.symlinkSync(target, path)
  } catch (error) {
    fs.rmSync(path, { recursive: true })
    fs.symlinkSync(target, path)
  }
}

function addBin(name, file, local) {
  const bin = Path.join(Path.dirname(local), '.bin')
  const target = Path.join('..', local.split('node_modules/').pop(), file)
  const path = Path.join(bin, name)
  fs.mkdirSync(bin, { recursive: true })
  symlink(target, path)
}

function getVersion({ scope, name, version }) {
  version || (version = 'latest')
  const distTag = isDistTag(version)
  const pathname = (scope ? scope + '/' : '') + name
  const id = pathname + '@' + version

  if (versions.has(id))
    return versions.get(id)

  const host = 'registry.npmjs.org'
  let complete
  let l = -2
  let n = -1
  let h = -1
  let w = 0
  let t = ''
  let x = -2
  let found = null

  animate('🔎 ' + id)

  distTag
    ? lightVersionRequests++
    : versionRequests++
  return versions.set(id, get(
    host,
    distTag
      ? 'GET /'+ pathname + ' HTTP/1.1\nHost: registry.npmjs.org\n\n' //Range: bytes=0-65535\n\n'
      : 'GET /'+ pathname + ' HTTP/1.1\nHost: registry.npmjs.org\n\n',
    (end, buffer, resolve) => {

      if (l === -2) {
        if (!(buffer[9] === 50 && buffer[10] === 48 && (buffer[11] === 48 || buffer[11] === 54)))
          throw new Error(host + '/' + pathname + ' failed with: ' + buffer.subarray(0, 200).toString())

        t = buffer.subarray(0, end).toString().toLowerCase()
        h = t.indexOf('content-length:')
        n = t.indexOf('\n', h)
        l = +t.slice(h + 15, n)
        complete = Buffer.allocUnsafe(l)
        while (buffer[n + 1] !== 10 && buffer[n + 2] !== 10)
          n = buffer.indexOf(10, n + 1)

        n = buffer.indexOf(10, n + 1) + 1
      }

      buffer.copy(complete, w, n, end)
      w += end - n
      n = 0

      if (w < l)
        return

      if (distTag) {
        x = 2
        while ((x = complete.indexOf(123, x + 1)) !== -1) {
          if (complete[x - 5] === 97) { // a
            return resolve(JSON.parse(
              complete.subarray(x, complete.indexOf(125, x + 1) + 1)  // {
            )[version])
          }
        }
        throw new Error('Could not find dist-tag for ' + name + '@' + version)
      }

      resolve(
        best(
          version,
          (complete.toString().match(/(:{|},)"\d+\.\d+\.\d+[^"]*":{"/g) || []).map(x => x.slice(3, -4))
        )
      )
    }
  )).get(id)
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
