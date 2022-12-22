import { wrap } from './shared.js'
import ssr from './index.js'

export default async function(app, attrs = {}, context = {}, {
  head = '',
  body = '',
  res
}) {
  const x = await ssr(app, attrs, context)
  res.end(wrap(x, { body, head }), x.status || 200, x.headers)
}
