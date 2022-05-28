import { wrap } from './shared.js'
import ssr from './index.js'

export default function(app, { attrs = {}, context = {}, body = '' } = {}) {
  console.log(context)
  return async function(res, pathname) {
    const x = await ssr(app, attrs, { ...context, location: new URL(pathname, 'http://x/') })

    res.cork(() => {
      res.writeStatus('' + (x.status || 200))

      for (const header in x.headers)
        res.writeHeader(header, x.headers[header])

      res.end(
        wrap(x, body)
      )
    })
  }
}
