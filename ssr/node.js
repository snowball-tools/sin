import { wrap, parseAcceptEncoding } from './shared.js'
import ssr from './index.js'
import zlib from 'zlib'

const encoders = {
  deflate: zlib.deflate,
  gzip: zlib.gzip,
  br: zlib.brotliCompress,
  identity: null
}

const cache = {
  deflate: {},
  gzip: {},
  br: {}
}

export default function(app, { attrs, context, body = '', compress = true } = {}) {
  return async function(req, res, next) {
    if ((req.method !== 'HEAD' && req.method !== 'GET') || req.headers.accept.indexOf('text/html') === -1)
      return next ? next() : res.end()

    const x = await ssr(app, attrs, { ...context, location: new URL(req.url, 'http://localhost/') })
    res.statusCode = x.status || 200
    Object.entries(x.headers).forEach(([header, value]) => res.setHeader(header, value))

    const out = x.html.slice(0, 15).toLowerCase() === '<!doctype html>'
      ? x.html.replace('</head>', x.head + x.css + '</head>').replace('</body>', body + '</body>')
      : wrap(x, body)

    compress
      ? compressEnd(req, res, out, next)
      : res.end(out)
  }
}

function compressEnd(req, res, out, next) {
  const accepted = parseAcceptEncoding(req.headers['accept-encoding'], ['br', 'gzip', 'deflate'])

  let encoding
  for (const x of accepted) {
    if (x.type in encoders) {
      encoding = x.type
      break
    }
  }

  if (!encoding || encoding === 'identity')
    return res.end(out)

  res.setHeader('Vary', 'Accept-Encoding')
  res.setHeader('Content-Encoding', encoding)

  if (out in cache[encoding])
    return res.end(cache[encoding][out])

  encoders[encoding](out, (error, buffer) => {
    if (error) {
      if (next)
        return next(error)
      throw error
    }

    cache[encoding][out] = buffer
    res.end(buffer)
  })
}
