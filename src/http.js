/* global globalThis */
import window from './window.js'

['head', 'get', 'put', 'post', 'delete', 'patch'].forEach(x =>
  http[x] = function(url, object = {}) {
    object.method = x
    return http(url, object)
  }
)

http.redraw = () => { /* noop */ }

const TypedArray = typeof Uint8Array === 'undefined' ? [] : [Object.getPrototypeOf(Uint8Array)]
    , rich = 'Blob ArrayBuffer DataView FormData URLSearchParams File'.split(' ').map(x => globalThis[x]).filter(x => x).concat(TypedArray)

export default function http(url, {
  method = 'GET',
  redraw = true,
  responseType,
  json = 'application/json',
  query,
  body,
  user,
  pass,
  headers = {},
  config,
  timeout = 0
} = {}) {
  const origin = typeof 'chrome' === 'undefined' && new Error()
  const xhr = new window.XMLHttpRequest()
  let full = false
  const promise = new Promise((resolve, reject) => {
    method = method.toUpperCase()

    xhr.addEventListener('readystatechange', function() {
      if (xhr.readyState !== xhr.DONE)
        return

      try {
        xhr.status && Object.defineProperty(xhr, 'body', {
          value: accept === json ? JSON.parse(xhr.response) : xhr.response
        })
        xhr.status === 304 || (xhr.status >= 200 && xhr.status < 300)
          ? resolve(full ? xhr : xhr.body)
          : reject(statusError(xhr))
      } catch (e) {
        reject(e)
      }

      redraw && http.redraw && http.redraw()
    })
    xhr.addEventListener('error', reject)
    xhr.addEventListener('abort', () => reject(new Error('ABORTED')))
    xhr.open(method, appendQuery(url, query), true, user, pass)
    xhr.timeout = timeout
    responseType && (xhr.responseType = responseType)

    let accept
      , contentType

    Object.entries(headers).forEach(([x, v]) => {
      xhr.setRequestHeader(x, v)
      x.toLowerCase() === 'accept' && (accept = v)
      x.toLowerCase() === 'content-type' && (contentType = v)
    })

    !accept && !responseType && json && xhr.setRequestHeader('Accept', accept = json)
    !contentType && body !== undefined && !rich.some(x => body instanceof x) && json && xhr.setRequestHeader('Content-Type', contentType = json)

    config && config(xhr)
    xhr.send(contentType === json ? JSON.stringify(body) : body)
  }).catch(error => {
    origin && !origin.message && Object.defineProperty(origin, 'message', { value: error.message })
    const x = Object.assign(origin || new Error(error.message), {
      ...error,
      url,
      status: xhr.status,
      body: xhr.body || xhr.response
    })
    Object.defineProperty(x, 'xhr', { value: xhr })
    throw x
  })

  Object.defineProperty(promise, 'xhr', {
    get() {
      full = true
      return promise
    }
  })

  return promise
}

function statusError(xhr) {
  return new Error(xhr.status
    ? xhr.status + (xhr.statusText ? ' ' + xhr.statusText : '')
    : 'Unknown'
  )
}

function appendQuery(x, q) {
  const u = new URL(x, 'http://x')
      , qs = new URLSearchParams(q || '').toString()

  return x.split(/\?|#/)[0]
    + u.search
    + (qs ? (u.search ? '&' : '?') + qs : '')
    + (u.hash || '')
}
