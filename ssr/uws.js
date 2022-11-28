import { wrap } from './shared.js'
import ssr from './index.js'

export default async function(app, attrs = {}, context = {}, {
  head = '',
  body = '',
  res
}) {
  res.onAborted(() => res.aborted = true)
  try {
    const x = await ssr(app, attrs, context)
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
