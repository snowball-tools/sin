import fs from 'fs'
import tls from 'tls'
import Path from 'path'
import zlib from 'zlib'
import https from 'https'
import config from '../config.js'

const buffer = Buffer.allocUnsafe(1024 * 1024)

const add = config._.length
  ? await getVersions(config._)
  : []

async function getVersions(xs) {
  return Promise.all(
    xs.map(async x => {
      let [name, version] = x.charCodeAt(0) === 64
        ? '@' + x.slice(1).split('@')
        : x.split('@')

      if (!version || (version.charCodeAt(0) - 48) >>> 0 < 10) // Do we start with a number
        version = await getVersion(name, version)

      const pkg = await getPackage(name, version)
      console.log(pkg)
    })
  )
}

async function getVersion2(name, tag) {
  return new Promise(resolve => {
    const xs = []
    https.get('https://registry.npmjs.org/' + name, res => {
      res.on('data', x => xs.push(x))
      res.on('end', () => {
        resolve(JSON.parse(Buffer.concat(xs))['dist-tags'][tag || 'latest'])
      })
    })
  })
}

async function getPackage(name, version) {
  return new Promise((resolve, reject) => {
    let stream
    let l = -2
    let n = -1
    let h = -1
    let t = ''
    let be = 0
    let size = 0
    let path = ''
    let prev = null
    let file = null
    const pkg = []

    const client = tls.connect({
      port: 443,
      host: 'registry.npmjs.org',
      onread: {
        buffer,
        callback: end => {
          if (l === -2) {
            if (!(buffer[9] === 50 && buffer[10] === 48 && buffer[10] === 48))
              throw new Error('Buffer not 200: ' + buffer.subarray(0, 200).toString())

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

                path = x.toString('utf8', 0, 100)
                path = path.slice(0, path.indexOf('\0'))
                size = parseInt(x.toString('utf8', 124, 136).trim(), 8)
                be = 512 + Math.ceil(size / 512) * 512

                fs.mkdirSync(Path.dirname(path), { recursive: true })
                file = fs.createWriteStream(path)
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
          stream.write(Buffer.from(buffer.subarray(n, end)))
          n = 0
          l -= end - n

          if (l <= 0) {
            stream.end()
            client.destroy()
          }
        }
      }
    })
    client.write('GET /'+ name + '/-/' + name + '-' + version + '.tgz HTTP/1.1\nHost: registry.npmjs.org\n\n')

    function write(x) {
        file.write(x)
        path === 'package/package.json' && pkg.push(x)
      }

      function close() {
        file.close()
        path === 'package/package.json' && resolve(JSON.parse(Buffer.concat(pkg)))
        be = size = 0
        file = prev = null
      }
  })
}

async function getVersion(name, tag) {
  let x = -2
  return new Promise((resolve, reject) => {
    const client = tls.connect({
      port: 443,
      host: 'registry.npmjs.org',
      onread: {
        buffer,
        callback: end => {
          if (x === -2 && !(buffer[9] === 50 && buffer[10] === 48 && buffer[10] === 48))
            throw new Error('Buffer not 200: ' + buffer.subarray(0, end).toString())

          x = buffer.indexOf(123)
          while (x !== -1) {
            if (buffer[x - 5] === 97) {
              resolve(
                JSON.parse(
                  buffer.subarray(x, buffer.indexOf(125, x + 1) + 1)
                )[tag || 'latest']
              )
              client.destroy()
            }
            x = buffer.indexOf(123, x + 1)
          }


        }
      }
    })
    client.write('GET /'+ name + ' HTTP/1.1\nHost: registry.npmjs.org\n\n')
  })
}
