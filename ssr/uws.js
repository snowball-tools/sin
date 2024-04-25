import { wrap } from './shared.js'
import ssr from './index.js'

export default async function(app, attrs = {}, context = {}, {
  head = '',
  body = ''
}) {
  return async function(res, req) {
    try {
      let x = ssr(app, attrs, { ...context, location: new URL(req.getUrl(), 'http://x/') })
      typeof x.then === 'function' && (res.onAborted(() => res.aborted = true), x = await x)
      res.aborted || res.cork(() => {
        res.writeStatus('' + (x.status || 200))

        for (const header in x.headers)
          res.writeHeader(header, x.headers[header])

        res.end(wrap(x, { body, head }))
      })
    } catch (error) {
      res.aborted || res.cork(() => {
        console.error('Sin SSR error', error) // eslint-disable-line
        res.writeStatus('500 Internal Server Error')
        res.end('Internal Server Error')
      })
    }
  }
}
