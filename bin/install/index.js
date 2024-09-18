import fs from 'fs'
import tls from 'tls'
import Path from 'path'
import zlib from 'zlib'
import https from 'https'
import crypto from 'crypto'
import config from '../config.js'
import { parsePackage } from '../shared.js'

const buffer = Buffer.allocUnsafe(1024 * 1024)

const pkg = jsonRead('package.json')
const lock = jsonRead('package-loco.json') || defaultLock(pkg)
const locked = readLock(pkg)
const defined = readDefined()

const versions = new Map()
const packages = new Map()

/*
const remove = await Promise.all([
  installLocks(),
  installNew()
])*/

function defaultLock(x) {
  return {
    name: pkg.name,
    version: pkg.version,
    lockfileVersion: 3,
    requires: true,
    packages: {}
  }
}

async function installLocks() {

}

async function installNew() {
  const newl = parseNew(config._ || [])
  await getVersions(config._ || [])
}


function readLock() {
  const a = ''
}

function readDefined() {
  const xs = {
    ...pkg.optionalDependencies,
    ...pkg.dependencies,
    ...pkg.devDependencies
  }
}

config._ = ['postgres'] //, 'react', 'mithril', 'vue', 'ey', 'react-dom', 'svelte', 'express', 'koa']
const xs = await readAdd().catch(e => e)
writeLock()

function writeLock() {
  fs.writeFileSync('package-loco.json', JSON.stringify(lock, null, 2))
}

function readAdd() {
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

async function getNpm(x) {
  !x.version && (x.version = await getTag(x))
  return get(x)
}

async function get(x) {
  x.root = 'node_modules/' + (x.scope ? '@' + x.scope + '/' : '') + x.name
  p(lock.packages)
  if (x.root in lock.packages) {
    p(x.root)
    const l = lock.packages[x.root]
    p(l.version === x.version)
    if (l.version === x.version)
      return
  }

  await getPackage(x)
  lock.packages[x.root] = {
    version: x.package.version,
    resolved: x.url,
    integrity: 'sha512-' + x.sha512
  }
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

async function getPackage(x) {
  const { scope, name, version, root } = x
  const full = (scope ? scope + '/' : '') + name
  const id = full + '@' + version

  if (packages.has(id))
    return packages.get(id)

  packages.set(id, new Promise((resolve, reject) => {
    let stream
    let l = -2
    let n = -1
    let h = -1
    let t = ''
    let be = 0
    let size = 0
    let target = ''
    let output = ''
    let prev = null
    let file = null
    const pkg = []
    const hash = crypto.createHash('sha512')
    const host = 'registry.npmjs.org'
    const pathname = '/'+ full + '/-/' + full + '-' + version + '.tgz'
    x.url = 'https://' + host + pathname

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
            stream.on('end', () => {
              x.sha512 = hash.digest('base64')
              resolve()
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

                target = x.toString('utf8', 0, 100)
                target = target.slice(8, target.indexOf('\0'))
                output = Path.join(root, target)
                size = parseInt(x.toString('utf8', 124, 136).trim(), 8)
                be = 512 + Math.ceil(size / 512) * 512

                fs.mkdirSync(Path.dirname(output), { recursive: true })
                file = fs.createWriteStream(output)
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
      file.write(x)
      target === 'package.json' && pkg.push(x)
    }

    function close() {
      file.close()
      target === 'package.json' && (x.package = JSON.parse(Buffer.concat(pkg)))
      be = size = 0
      file = prev = null
    }
  }))

  return packages.get(id)
}

function getTag({ scope, name, tag }) {
  const full = (scope ? scope + '/' : '') + name
  const id = full + '@' + tag
  if (versions.has(id))
    return versions.get(id)

  versions.set(id, new Promise((resolve, reject) => {
    let x = -2
    const client = tls.connect({
      port: 443,
      host: 'registry.npmjs.org',
      onread: {
        buffer,
        callback: end => {
          if (x === -2 && !(buffer[9] === 50 && buffer[10] === 48 && buffer[10] === 48))
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
      }
    })

    client.write('GET /'+ full + ' HTTP/1.1\nHost: registry.npmjs.org\n\n')
  }))

  return versions.get(id)
}

async function getVersion2(name, tag) {
  return new Promise(resolve => {
    const xs = []
    https.get('https://registry.npmjs.org/' + name, res => {
      res.on('data', x => xs.push(x))
      res.on('end', () => {
        const json = JSON.parse(Buffer.concat(xs))
        console.log(json)
        resolve(json['dist-tags'][tag || 'latest'])
      })
    })
  })
}

function jsonRead(x) {
  try {
    return JSON.parse(fs.readFileSync(x))
  } catch (error) {
    if (error.code === 'ENOENT')
      return
    throw error
  }
}
