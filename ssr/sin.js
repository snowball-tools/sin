import mimes from '../shared/server/mimes.js'
import window from './window.js'

import s from '../src/index.js'

s.is = { server: s.isServer = window.isServerSin = true }
s.title = process.env.SIN_TITLE
s.mimes = mimes
s.trust = trust

export default s

function trust(strings, ...values) {
  const html = String.raw({ raw: Array.isArray(strings.raw) ? strings.raw : [strings] }, ...values)
      , count = rootNodeCount(html) + 1

  return new window.Node(
      (noscript ? '' : '<!--[' + count + '-->')
    + html.trim()
    + (noscript ? '' : '<!--trust-->')
  )
}
