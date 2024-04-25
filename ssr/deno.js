import { wrap } from './shared.js'
import ssr from './index.js'

export default function(app, attrs = {}, context = {}, { head = '', body = '' } = {}) {
  return async function(request) {
    let x = ssr(app, attrs, { ...context, location: new URL(request.url, 'http://x/') })
    typeof x.then === 'function' && (x = await x)

    return new Response(wrap(x, { head, body }), {
      status: x.status || 200,
      headers: x.headers
    })
  }
}
