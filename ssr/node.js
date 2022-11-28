import { wrap, parseAcceptEncoding } from './shared.js'
import { hasOwn } from '../src/shared.js'
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

export default function(app, attrs = {}, context = {}, { head = '', body = '', compress = false } = {}) {
  return async function(req, res, next) {
    const x = await ssr(app, attrs, { ...context, location: new URL(req.url, 'http://x/') })
    res.statusCode = x.status || 200

    for (const header in x.headers)
      res.setHeader(header, x.headers[header])

    const out = wrap(x, { body, head })

    compress
      ? compressEnd(req, res, out, next)
      : res.end(out)
  }
}

function compressEnd(req, res, out, next) {
  const accepted = parseAcceptEncoding(req.headers['accept-encoding'], ['br', 'gzip', 'deflate'])

  let encoding
  for (const x of accepted) {
    if (hasOwn.call(encoders, x.type)) {
      encoding = x.type
      break
    }
  }

  if (!encoding || encoding === 'identity')
    return res.end(out)

  res.setHeader('Content-Encoding', encoding)

  if (hasOwn.call(cache[encoding], out))
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
