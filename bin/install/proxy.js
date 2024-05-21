import http from 'node:http'
import https from 'node:https'
import { pipeline } from 'stream/promises'

import ey from 'ey'

export default async function(registries) {
  let listener
  const xs = [...registries, new URL('https://registry.npmjs.org')]
  const app = ey()

  app.all(async r => {
    for (const x of xs) {
      const { req, res } = await request(x, r)
      if (res.statusCode === 404) {
        req.abort()
        continue
      }

      if (res.headers['content-type'] === 'application/json') {
        const pkg = await json(res)
        pkg.versions && Object.values(pkg.versions).forEach(v => {
          v?.dist?.tarball && (v.dist.tarball = v.dist.tarball
            .replace('https://', 'http://')
            .replace(x.host, '127.0.0.1:' + listener.port)
          )
        })
        return r.json(pkg)
      } else {
        r.header(res.statusCode, res.headers)
        return await pipeline(res, r.writable)
      }
    }
  })

  listener = await app.listen()
  return listener
}

async function json(res) {
  return new Promise((resolve, reject) => {
    const data = []
    res.on('data', x => data.push(x))
    res.on('end', () => resolve(JSON.parse(Buffer.concat(data))))
    res.on('error', reject)
  })
}

async function request(url, r) {
  return new Promise((resolve, reject) => {
    const req = (url.protocol === 'http:' ? http : https).request(
      url.origin + r.url + (r.rawQuery ? '?' + r.rawQuery : ''), {
        auth: url.username && (url.username + ':' + url.password),
        method: r.method.toUpperCase(),
        headers: {
          ...r.headers,
          host: url.host
        }
      },
      res => resolve({ req, res })
    )

    req.on('error', reject)

    r.method[0] === 'p'
      ? pipeline(r.readable, req)
      : req.end()
  })
}