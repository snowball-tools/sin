import wrap from './wrap.js'
import ssr from './index.js'
import zlib from 'zlib'

export default function SinMiddleware(app, { attrs, context, body }) {
  return async function(req, res, next) {
    if ((req.method !== 'HEAD' && req.method !== 'GET') || req.headers.accept.indexOf('text/html') === -1)
      return next ? next() : res.end()

    const x = await ssr(app, attrs, { ...context, location: new URL(req.url, 'http://localhost/') })

    res.statusCode = x.status || 200

    Object.entries(x.headers).forEach(([header, value]) =>
      res.setHeader(header, value)
    )

    res.end(
      x.html.slice(0, 15).toLowerCase() === '<!doctype html>'
        ? x.html.replace('</head>', x.head + x.css + '</head>').replace('</body>', body + '</body>')
        : wrap(x, body)
    )
  }
}
