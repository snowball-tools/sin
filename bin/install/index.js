import fs from 'node:fs'
import tls from 'node:tls'
import Path from 'node:path'
import zlib from 'node:zlib'
import https from 'node:https'
import crypto from 'node:crypto'
import { Buffer } from 'node:buffer'
import config from '../config.js'
import { parsePackage } from '../shared.js'
import { best, isRange } from './semver.js'

let lockChanged = false
const p = console.log

const pkg = await jsonRead('package.json')
const lock = await jsonRead('package-lock.json') || defaultLock(pkg)
const remove = new Set(Object.keys(lock.packages))

const versions = new Map()
const packages = new Map()

const added = await fromCLI()
await fromPackage('', pkg)

if (remove.size) {
  lockChanged = true
  remove.forEach(x => delete lock.packages[x])
}
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
  needsWrite && fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2))
}

async function fromPackage(dir = '', pkg) {
  const xs = Object.entries({
    ...pkg.optionalDependencies,
    ...pkg.dependencies,
    ...pkg.devDependencies
  })

  const installs = []
  await Promise.all(xs.map(async ([x, version]) => {
    const pkg = parsePackage(x + '@' + version)
    pkg.root = dir + 'node_modules/' + x
    const l = lock.packages[pkg.root]
    remove.delete(pkg.root)

    if (!pkg.version || isRange(pkg.version))
      pkg.version = await getVersion(pkg)

    pkg.url = 'https://registry.npmjs.org' + tgzPath(pkg)
    if (l && l.resolved === pkg.url && l.version === (await jsonRead(Path.join(pkg.root, 'package.json')))?.version)
      return

    installs.push(install(pkg))
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

async function install(pkg) {
  const { scope, name, version, root } = pkg
  const full = (scope ? scope + '/' : '') + name
  const id = full + '@' + version

  if (packages.has(id))
    return packages.get(id)

  packages.set(id, new Promise((resolve, reject) => {
    let stream
    let l = -2
    let n = -1
    let h = -1
    let s = -1
    let t = ''
    let be = 0
    let size = 0
    let target = ''
    let output = ''
    let prev = null
    let file = null
    let pkgJson = null
    const hash = crypto.createHash('sha512')
    const host = 'registry.npmjs.org'
    const pathname = tgzPath(pkg)
    const buffer = Buffer.allocUnsafe(1024 * 1024)
    pkg.url = 'https://' + host + pathname

    const client = tls.connect({
      port: 443,
      host,
      onread: {
        buffer,
        callback: end => {
          if (l === -2) {
            if (!(buffer[9] === 50 && buffer[10] === 48 && buffer[10] === 48))
              throw new Error(host + pathname + ' failed with: ' + buffer.subarray(0, 200).toString())

            t = buffer.subarray(0, end).toString().toLowerCase()
            h = t.indexOf('content-length:')
            n = t.indexOf('\n', h)
            l = +t.slice(h + 15, n)

            while (buffer[n + 1] !== 10 && buffer[n + 2] !== 10)
              n = buffer.indexOf(10, n + 1)

            n = buffer.indexOf(10, n + 1) + 1
            l += n
          }

          if (!stream) {
            stream = zlib.createGunzip()
            stream.on('error', reject)
            stream.on('close', () => {
              pkg.sha512 = hash.digest('base64')
              lockChanged = true
              lock.packages[pkg.root] = {
                version: pkg.package.version,
                resolved: pkg.url,
                integrity: 'sha512-' + pkg.sha512
              }
              pkg.package.dependencies
                ? resolve(fromPackage(pkg.root + '/', pkg.package))
                : resolve()
            })
            stream.on('data', x => {
              if (be) {
                if (x.byteLength <= be) {
                  be -= x.byteLength
                  size -= size < x.byteLength
                    ? size
                    : x.byteLength
                  return size < x.byteLength
                    ? write(x.subarray(0, size))
                    : write(x)
                }

                write(x.subarray(0, size))
                close(x = x.subarray(be))
              }

              prev && (x = Buffer.concat([prev, x]))
              prev = null

              while (x.byteLength >= 512) {
                if (x[0] === 0)
                  return

                h = x.indexOf(0, 0, 100)
                target = x.toString('utf8', x.indexOf(47, 0, h) + 1, h)
                p('parse', x.indexOf(47), x.toString('utf8', 0, 100), root)
                output = Path.join(root, target)
                if (x[h - 1] === 47) { // /
                  x = x.subarray(512)
                  fs.mkdirSync(output, { recursive: true })
                } else {
                  size = parseInt(x.toString('utf8', 124, 136).trim(), 8)
                  target === 'package.json' && (pkgJson = Buffer.allocUnsafe(size))
                  be = 512 + Math.ceil(size / 512) * 512
                  fs.mkdirSync(Path.dirname(output), { recursive: true })
                  file = fs.openSync(output, 'w')
                  if (be > x.byteLength) {
                    write(x.subarray(512, Math.min(x.byteLength, 512 + size)))
                    size -= Math.min(size, x.byteLength - 512)
                    be -= x.byteLength
                    x = x.subarray(be)
                    return
                  } else {
                    write(x.subarray(512, 512 + size))
                    close(x = x.subarray(be))
                  }
                }
              }
              x.byteLength && (prev = x)
            })
          }
          const chunk = buffer.subarray(n, end)
          hash.update(chunk)
          stream.write(Buffer.from(chunk)) // need to copy
          n = 0
          l -= end - n

          if (l <= 0) {
            stream.end()
            client.destroy()
          }
        }
      }
    })

    client.write('GET ' + pathname + ' HTTP/1.1\nHost: registry.npmjs.org\n\n')

    function write(x) {
      fs.appendFileSync(file, x)
      //p('write', root, target)
      target === 'package.json' && x.copy(pkgJson, pkgJson.byteLength - size)
    }

    function close() {
      fs.closeSync(file)
      //p('close', root, target)
      if (target === 'package.json') {
        try {
          pkg.package = JSON.parse(pkgJson)
        } catch (e) {
          console.error(e)
          console.log(pkgJson.toString('utf8'))
        }
      }
      be = size = 0
      file = prev = null
    }
  }))

  return packages.get(id)
}

function getVersion({ scope, name, version, tag }) {
  if (version && !isRange(version))
    return version

  const full = (scope ? scope + '/' : '') + name
  const id = full + '@' + tag

  if (versions.has(id))
    return versions.get(id)

  const buffer = Buffer.allocUnsafe(1024 * 1024)
  let complete
  let l = -2
  let n = -1
  let h = -1
  let w = 0
  let t = ''
  let x = -2

  versions.set(id, new Promise((resolve, reject) => {
    const client = tls.connect({
      port: 443,
      host: 'registry.npmjs.org',
      onread: {
        buffer,
        callback: isRange(version)
          ? getVersions
          : getTag
      }
    })

    client.write('GET /'+ full + ' HTTP/1.1\nHost: registry.npmjs.org\n\n')

    function getTag(end) {
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
          client.destroy()
        }
        x = buffer.indexOf(123, x + 1)
      }
    }

    function getVersions(end) {
      if (l === -2) {
        if (!(buffer[9] === 50 && buffer[10] === 48 && buffer[10] === 48))
          throw new Error(host + pathname + ' failed with: ' + buffer.subarray(0, 200).toString())

        t = buffer.subarray(0, end).toString().toLowerCase()
        h = t.indexOf('content-length:')
        n = t.indexOf('\n', h)
        l = +t.slice(h + 15, n)
        complete = Buffer.allocUnsafe(l)
        while (buffer[n + 1] !== 10 && buffer[n + 2] !== 10)
          n = buffer.indexOf(10, n + 1)

        n = buffer.indexOf(10, n + 1) + 1
        l += n
      }

      buffer.copy(complete, w, n, end)
      w += end - n
      n = 0
      l -= end - n

      if (l <= 0) {
        resolve(
          best(
            version,
            (complete.toString().match(/"version":"[^"]+"/g) || []).map(x => x.slice(11,-1))
          )
        )
        client.destroy()
      }
    }
  }))

  return versions.get(id)
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
    packages: {}
  }
}
