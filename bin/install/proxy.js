import http from 'node:http'
import https from 'node:https'
import { pipeline } from 'stream/promises'

import ey from 'ey'

export default async function(registries) {
  const xs = [...registries, 'https://registry.npmjs.org']
  const app = ey()

  app.all(async r => {
    for (const x of xs) {
      const url = x + r.url + (r.rawQuery ? '?' + r.rawQuery : '')
      const { req, res } = await request(url, r)
      if (res.statusCode === 404) {
        req.abort()
        continue
      }
      r.header(res.statusCode, res.headers)
      await pipeline(res, r.writable)
      return
    }
  })

  return app.listen()
}

async function request(url, r) {
  return new Promise((resolve, reject) => {
    url = url.startsWith('//') ? 'https:' + url : url
    const req = (url.startsWith('http:') ? http : https).request(
      url, {
        method: r.method.toUpperCase(),
        headers: {
          ...r.headers,
          host: new URL(url).host
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
