import { wrap } from './shared.js'
import ssr from './index.js'

export default function(app, { attrs = {}, context = {}, body = '' } = {}) {
  return async function(request) {
    const x = await ssr(app, attrs, { ...context, location: new URL(request.url, 'http://x/') })

    return new Response(wrap(x, body), {
      status: x.status || 200,
      headers: x.headers
    })
  }
}