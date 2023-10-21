import { wrap } from './shared.js'
import ssr from './index.js'

export default function(app, attrs = {}, context = {}, {
  head = '',
  body = '',
  res
}) {
  return tryPromise(ssr(app, attrs, context), (x) => {
    res.end(wrap(x, { body, head }), x.status || 200, x.headers)
  })
}
