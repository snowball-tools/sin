import fs from 'node:fs'
import Path from 'node:path'
import zlib from 'node:zlib'
import crypto from 'node:crypto'
import { Buffer } from 'node:buffer'
import config from '../config.js'
import { parsePackage } from '../shared.js'
import { best, isRange } from './semver.js'
import { get, destroy } from './socket.js'

let lockChanged = false
const p = (...xs) => (ani >= 0 && process.stdout.write('\x1B[F\x1B[2K'), ani = -1, console.log(...xs), xs[0])

let ani = -1
const clocks = ['🕐','🕜','🕑','🕝','🕒','🕟','🕞','🕠','🕓','🕡','🕢','🕔','🕕','🕖','🕣','🕗','🕤','🕘','🕥','🕙','🕦','🕚','🕧','🕛']
const moveClock = () => (ani >= 0 && process.stdout.write('\x1B[F\x1B[2K'), console.log(animation[ani++ % animation.length]))
const animate = x => (ani >= 0 && process.stdout.write('\x1B[F\x1B[2K'), ani++, console.log(x))

const versions = new Map()
const packages = new Map()

const pkg = await jsonRead('package.json')
const lock = await jsonRead('package-lock.json') || defaultLock(pkg)
const remove = new Set(Object.keys(lock.packages))
remove.delete('')

const added = await fromCLI()
await installDependencies('', {
  ...pkg.optionalDependencies,
  ...pkg.dependencies,
  ...pkg.devDependencies
})

destroy()
cleanup()
writeLock()

await writePackage(added)

async function writeLock() {
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

async function cleanup() {
  if (remove.size) {
    lockChanged = true
    remove.forEach(x => delete lock.packages[x])
  }

  const xs = fs.readdirSync('node_modules')
  for (const x of xs) {
    if (x.charCodeAt === 46) // .
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

async function installDependencies(dir = '', dependencies) {
  const installs = []
  await Promise.all(Object.entries(dependencies).map(async ([name, v]) => {
    if (v.startsWith('~/') || v.startsWith('/') || v.startsWith('.') || v.indexOf(':\\') === 1 || v.indexOf('file:') === 0)
      return

    if (v.indexOf('github:') === 0)
      return

    const pkg = v.indexOf('npm:') === 0
      ? parsePackage(v.slice(4))
      : parsePackage(name + '@' + v)
    pkg.root = dir + 'node_modules/' + name
    const l = lock.packages[pkg.root]
    remove.delete(pkg.root)

    if (!pkg.version || isRange(pkg.version))
      pkg.version = await getVersion(pkg)

    pkg.url = 'https://registry.npmjs.org' + tgzPath(pkg)
    if (l && l.resolved === pkg.url && l.version === (await jsonRead(Path.join(pkg.root, 'package.json')))?.version)
      return

    installs.push(install(pkg, dir))
  }))

  for (const root in remove) {
    lockChanged = true
    delete lock.packages[root]
  }

  await Promise.all(installs)
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
  if (!pkg.version || isRange(pkg.version))
    pkg.version = await getVersion(pkg)
  pkg.root = 'node_modules/' + (pkg.scope ? '@' + pkg.scope + '/' : '') + pkg.name
  if (pkg.root in lock.packages) {
    const l = lock.packages[pkg.root]
    if (l.version === pkg.version)
      return remove.delete(pkg.root)
  }

  await install(pkg)
  return pkg
}

async function getVersions(xs) {
  return Object.fromEntries(await Promise.all(
    xs.map(async x => {
      let { scope, name, version, tag } = parsePackage(x)
      return [
        (scope ? scope + '/' : '') + name,
        tag ? await getTag({ scope, name, tag }) : version
      ]
    })
  ))
}

function tgzPath({ scope, name, version }) {
  return '/' + (scope ? scope + '/' + name : name) + '/-/' + name + '-' + version + '.tgz'
}

function install(pkg, dir) {
  const { scope, name, version, root } = pkg
  const full = (scope ? scope + '/' : '') + name
  const id = full + '@' + version

  if (packages.has(id))
    return packages.get(id)

  let l = -2
  let n = -1
  let h = -1
  let t = ''
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
    l = x.byteLength - 1029
    n = 0
    while(n < l) {
      h = x.indexOf(0, n)
      if (h === n)
        break
      const slash = x.indexOf(47, n) + 1
      target = x.toString('utf8', slash, h) // /
      output = Path.join(root, target)
      if (x[n + 156] === 53 || x[h - 1] === 47) { // /
        n += 512
        fs.mkdirSync(output, { recursive: true })
      } else {
        size = parseInt(x.toString('utf8', n + 124, n + 136).trim(), 8)
        fs.mkdirSync(Path.dirname(output), { recursive: true })
        n += 512
        file = x.subarray(n, n + size)
        target === 'package.json' && (pkg.package = JSON.parse(file))
        fs.writeFileSync(output, file)
        n += Math.ceil(size / 512) * 512
      }
    }

    lockChanged = true
    lock.packages[pkg.root] = {
      version: pkg.package.version,
      resolved: pkg.url,
      integrity: 'sha512-' + pkg.sha512
    }
    dir || (lock.packages[''].dependencies[full] = pkg.package.version)
    pkg.package.dependencies
      ? resolve(installDependencies(pkg.root + '/', pkg.package.dependencies))
      : resolve()
  })
}

function getVersion({ scope, name, version, tag }) {
  if (version && !isRange(version))
    return version

  const pathname = (scope ? scope + '/' : '') + name
  const id = pathname + '@' + tag

  if (versions.has(id))
    return versions.get(id)

  const host = 'registry.npmjs.org'
  const range = isRange(version)
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
    range
      ? 'GET /'+ pathname + ' HTTP/1.1\nHost: registry.npmjs.org\n\n'
      : 'GET /'+ pathname + ' HTTP/1.1\nHost: registry.npmjs.org\nRange: bytes=0-10240\n\n',
    range
      ? getVersions
      : getTag
  )).get(id)

  function getTag(end, buffer, resolve) {
    if (x === -2 && !(buffer[9] === 50 && buffer[10] === 48 && buffer[11] === 48)) // 2 0 0
      throw new Error(buffer.subarray(9, end).toString())

    x = buffer.indexOf(123) // {
    while (x < end && x !== -1) {
      if (buffer[x - 5] === 97) { // a
        resolve(
          JSON.parse(
            buffer.subarray(x, buffer.indexOf(125, x + 1) + 1)  // {
          )[tag || 'latest']
        )
      }
      x = buffer.indexOf(123, x + 1)
    }
  }

  function getVersions(end, buffer, resolve) {
    if (l === -2) {
      if (!(buffer[9] === 50 && buffer[10] === 48 && buffer[11] === 48))
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

    resolve(
      best(
        version,
        (complete.toString().match(/(:{|},)"\d+\.\d+\.\d+[^"]*":{"/g) || []).map(x => x.slice(3, -4))
      )
    )
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
