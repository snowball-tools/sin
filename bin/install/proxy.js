import http from 'node:http'
import https from 'node:https'
import zlib from 'node:zlib'
import { pipeline } from 'node:stream/promises'

import ey from 'ey'

export default async function(xs) {
  let listener
  const app = ey()

  app.all(async r => {
    for (const x of xs) {
      const { req, res, error } = await request(x, r).catch(error => ({ error }))

      if (error) {
        console.error('Error installing from ' + x.origin + r.url + (r.rawQuery ? '?' + r.rawQuery : ''))
        throw error
      }

      if (res.statusCode === 404) {
        req.isAborted = true
        req.abort()
        continue
      }

      if (r.method === 'get' && (res.headers['content-type'] || '').startsWith('application/json')) {
        const pkg = JSON.parse(await body(res))
        pkg.versions && Object.values(pkg.versions).forEach(v => {
          v?.dist?.tarball && (v.dist.tarball = v.dist.tarball
            .replace('https://', 'http://')
            .replace(x.host, '127.0.0.1:' + listener.port)
          )
        })
        r.header(res.statusCode, { ...res.headers, 'content-encoding': 'identity' })
        return r.json(pkg)
      } else {
        return r.end(await body(res), res.statusCode, res.headers)
      }
    }
  })

  listener = await app.listen(5171)
  return listener
}

async function body(res) {
  const data = await new Promise((resolve, reject) => {
    const xs = []
    res.on('data', x => xs.push(x))
    res.on('end', () => resolve(Buffer.concat(xs)))
    res.on('error', reject)
  })

  return res.headers['content-encoding'] === 'gzip'
       ? await new Promise(r => zlib.gunzip(data, r))
       : res.headers['content-encoding'] === 'deflate'
       ? await new Promise(r => zlib.deflate(data, r))
       : data
}

async function request(url, r) {
  const body = r.method[0] === 'p' && await r.body()
  return new Promise((resolve, reject) => {
    const req = (url.protocol === 'http:' ? http : https).request(
      url.origin + r.url + (r.rawQuery ? '?' + r.rawQuery : ''), {
        auth: url.username && (url.username + ':' + url.password),
        method: r.method.toUpperCase(),
        headers: {
          ...r.headers,
          ...(r.method === 'get' ? { 'accept-encoding': 'identity' } : {}),
          host: url.host
        }
      },
      res => resolve({ req, res })
    )

    req.on('error', (err) => req.isAborted || reject(err))
    body ? req.end(body) : req.end()
  })
}
