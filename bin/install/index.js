import fs from 'node:fs'
import Path from 'node:path'
import zlib from 'node:zlib'
import cp from 'child_process'
import crypto from 'node:crypto'
import { Buffer } from 'node:buffer'
import config from '../config.js'
import { parsePackage } from '../shared.js'
import { best, isVersion, isDistTag } from './semver.js'
import { get, destroy } from './socket.js'

let lockChanged = false
const p = (...xs) => (ani >= 0 && process.stdout.write('\x1B[F\x1B[2K'), ani = -1, console.log(...xs), xs[0])

let ani = -1
const clocks = ['🕐','🕜','🕑','🕝','🕒','🕟','🕞','🕠','🕓','🕡','🕢','🕔','🕕','🕖','🕣','🕗','🕤','🕘','🕥','🕙','🕦','🕚','🕧','🕛']
const moveClock = () => (ani >= 0 && process.stdout.write('\x1B[F\x1B[2K'), console.log(animation[ani++ % animation.length]))
const animate = x => (ani >= 0 && process.stdout.write('\x1B[F\x1B[2K'), ani++, console.log(x))

const versions = new Map()
const packages = new Map()
const postInstalls = new Set()

const pkg = await jsonRead('package.json') || defaultPackageJ
const lock = await jsonRead('package-lock.json') || defaultLock(pkg)
const remove = new Set(Object.keys(lock.packages))
remove.delete('')

const pkgDependencies = {
  ...pkg.optionalDependencies,
  ...pkg.dependencies,
  ...pkg.devDependencies
}

const added = await fromCLI()
await installDependencies(pkgDependencies)

destroy()
cleanup()
// postInstall()

writeLock()

await writePackage(added)

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

  const xs = fs.readdirSync('node_modules')
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
    p('Execute', x.package.scripts.postinstall, x.package.root)
    p(cp.execSync(x.package.scripts.postinstall, {
      stdio: 'inherit',
      cwd: x.package.root,
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

  fs.rmSync(path, { recursive: true })
}

async function writePackage(xs) {
  const pkg = await jsonRead('package.json')
  let needsWrite = false
  for (const { scope, name, version } of xs) {
    const x = config.saveDev
      ? pkg.devDependencies || (pkg.devDependencies = {})
      : config.saveOptional
        ? pkg.optionalDependencies || (pkg.optionalDependencies = {})
        : pkg.dependencies || (pkg.dependencies = {})

    if (x[scope + name] === version)
      continue

    x[scope + name] = version
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
  await Promise.all(Object.entries(dependencies).map(async ([name, v]) => {
    if (v.startsWith('~/') || v.startsWith('/') || v.startsWith('.') || v.indexOf(':\\') === 1 || v.indexOf('file:') === 0)
      return

    if (v.indexOf('github:') === 0)
      return

    const pkg = v.indexOf('npm:') === 0
      ? parsePackage(v.slice(4))
      : parsePackage(name + '@' + v)

    if (!pkg.version || !isVersion(pkg.version))
      pkg.version = await getVersion(pkg)

    addPaths(pkg, parent)
    const l = lock.packages[pkg.root]
    remove.delete(pkg.root)

    pkg.url = 'https://registry.npmjs.org' + tgzPath(pkg)
    if (l && l.resolved === pkg.url && l.version === (await jsonRead(Path.join(pkg.root, 'package.json')))?.version)
      return

    installs.push(install(pkg, parent))
  }))

  for (const root in remove) {
    lockChanged = true
    delete lock.packages[root]
  }

  await Promise.all(installs)
}

function addPaths(pkg, parent) {
  const x = (pkg.scope ? pkg.scope + '/' : '') + pkg.name
  pkg.global = pkg.root = (parent ? parent.root + '/' : '') + 'node_modules/' + x

  /*
  const x = (pkg.scope ? pkg.scope + '+' : '') + pkg.name + '@' + pkg.version
  pkg.global = Path.join(config.globalPath, x)
  pkg.root = 'node_modules/.sin/' + x
  */
}

function fromCLI() {
  return Promise.all(config._.map(x => {
    if ('.~/\\'.includes(x[0]) || x.slice(1,3) === ':\\')
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
  return x
}

async function getGithub(x) {
  return x
}

async function getNpm(pkg) {
  const id = (pkg.scope ? pkg.scope + '/' : '') + pkg.name
  if ((!pkg.version && id in pkgDependencies) || pkgDependencies[id] === pkg.version)
    return

  if (!pkg.version || !isVersion(pkg.version))
    pkg.version = await getVersion(pkg)

  addPaths(pkg)

  if (pkg.root in lock.packages) {
    const l = lock.packages[pkg.root]
    if (l.version === pkg.version)
      return remove.delete(pkg.root)
  }

  await install(pkg)
  return pkg
}

function tgzPath({ scope, name, version }) {
  return '/' + (scope ? scope + '/' + name : name) + '/-/' + name + '-' + version + '.tgz'
}

function install(pkg, parent) {
  const { scope, name, version, global } = pkg
  const full = (scope ? scope + '/' : '') + name
  const id = full + '@' + version

  if (packages.has(id))
    return packages.get(id)

  let l = -2
  let n = -1
  let h = -1
  let t = ''
  let g = -1
  let size = 0
  let target = ''
  let output = ''
  let file = null
  let x
  const hash = crypto.createHash('sha512')
  const host = 'registry.npmjs.org'
  const pathname = tgzPath(pkg)
  pkg.url = 'https://' + host + pathname

  animate('⏳ ' + id)

  return get(host, 'GET ' + pathname + ' HTTP/1.1\nHost: registry.npmjs.org\n\n', (end, buffer, resolve) => {
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
    if (l > 0)
      return

    pkg.sha512 = hash.digest('base64')
    x = zlib.gunzipSync(x)
    l = x.byteLength - 1024
    n = 0
    while(n < l) {
      h = x.indexOf(0, n)
      if (h === n)
        break

      target = x[n + 345] === 0
        ? x.toString('utf8', x.indexOf(47, n) + 1, h)
        : x.toString('utf8', x.indexOf(47, n + 345) + 1, x.indexOf(0, n + 345)) + x.toString('utf8', n, h)
      output = Path.join(global, target)

      if (x[n + 156] === 53 || x[h - 1] === 47) { // /
        fs.mkdirSync(output, { recursive: true })
        n += 512
      } else {
        size = parseInt(x.toString('utf8', n + 124, n + 136).trim(), 8)
        if (x[n + 156] !== 103) {
          fs.mkdirSync(Path.dirname(output), { recursive: true })
          file = x.subarray(n + 512, n + 512 + size)
          target === 'package.json' && (pkg.package = JSON.parse(file))
          fs.writeFileSync(output, file)
        }
        n += 512 + Math.ceil(size / 512) * 512
      }
    }

    lockChanged = true
    lock.packages[pkg.root] = {
      version: pkg.package.version,
      resolved: pkg.url,
      integrity: 'sha512-' + pkg.sha512
    }

    parent || (lock.packages[''].dependencies[full] = pkg.package.version)

    const bin = pkg.package.bin
    typeof bin === 'string'
      ? addBin(pkg.name, bin, pkg.root)
      : typeof bin === 'object'
      && Object.entries(bin).forEach(([name, file]) => addBin(name, file, pkg.root))

    pkg.package.scripts?.install && p(pkg.package.scripts.install)
    pkg.package.scripts?.postinstall && postInstalls.add(pkg)

    pkg.package.dependencies
      ? resolve(installDependencies(pkg.package.dependencies, pkg))
      : resolve()
  })
}

function addBin(name, file, root) {
  const bin = Path.join(Path.dirname(root), '.bin')
  const target = Path.join('..', root.split('node_modules/').pop(), file)
  const path = Path.join(bin, name)
  fs.mkdirSync(bin, { recursive: true })
  try {
    fs.symlinkSync(target, path)
  } catch (error) {
    fs.rmSync(path, { recursive: true })
    fs.symlinkSync(target, path)
  }
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

  animate('🔎 ' + id)

  return versions.set(id, get(
    host,
    distTag
      ? 'GET /'+ pathname + ' HTTP/1.1\nHost: registry.npmjs.org\nRange: bytes=0-65535\n\n'
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
        x = complete.indexOf(123, 2)
        while (x < end && x !== -1) {
          if (complete[x - 5] === 97) { // a
            resolve(
              JSON.parse(
                complete.subarray(x, complete.indexOf(125, x + 1) + 1)  // {
              )[version]
            )
          }
          x = buffer.indexOf(123, x + 1)
        }
        return
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
