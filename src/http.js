/* global globalThis */
import window from './window.js'

['head', 'get', 'put', 'post', 'delete', 'patch'].forEach(x =>
  http[x] = function(url, object = {}) {
    object.method = x
    return http(url, object)
  }
)

http.redraw = () => { /* noop */ }

const json = 'application/json'
    , identity = x => x
    , TypedArray = typeof Uint8Array === 'undefined' ? [] : [Object.getPrototypeOf(Uint8Array)]
    , rich = 'Blob ArrayBuffer DataView FormData URLSearchParams'.split(' ').map(x => globalThis[x]).filter(x => x).concat(TypedArray)

export default function http(url, {
  method = 'GET',
  redraw = true,
  responseType,
  query,
  body,
  user,
  pass,
  headers = {},
  config,
  timeout = 0
} = {}) {
  const origin = !window.chrome && new Error()
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
    xhr.addEventListener('error', () => reject(statusError(xhr)))
    xhr.addEventListener('abort', () => reject(statusError(xhr)))
    xhr.open(method, appendQuery(url, query), true, user, pass)
    xhr.timeout = timeout
    responseType && (xhr.responseType = responseType)

    let accept = false
      , contentType = false

    Object.entries(headers).forEach(([x, v]) => {
      xhr.setRequestHeader(x, v)
      x.toLowerCase() === 'accept' && (accept = v)
      x.toLowerCase() === 'content-type' && (contentType = v)
    })

    !accept && !responseType && xhr.setRequestHeader('Accept', accept = json)
    !contentType && body !== undefined && !rich.some(x => body instanceof x) && xhr.setRequestHeader('Content-Type', contentType = json)

    config && config(xhr)
    xhr.send(contentType === json ? JSON.stringify(body) : body)
  }).catch(error => {
    origin && !origin.message && Object.defineProperty(origin, 'message', { value: error.message })
    throw Object.defineProperties(origin || new Error(error.message), {
      ...error,
      status: { value: xhr.status, enumerable: true },
      body: { value: xhr.body || xhr.response, enumerable: true },
      xhr: { value: xhr }
    })
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
