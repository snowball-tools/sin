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
    , serializeJSON = x => JSON.stringify(x)
    , parseJSON = x => JSON.parse(x)
    , rich = 'Blob ArrayBuffer TypedArray DataView FormData URLSearchParams'.split(' ').map(x => globalThis[x]).filter(x => x)

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
  timeout = 0,
  parse = identity,
  serialize = identity
} = {}) {
  const xhr = new window.XMLHttpRequest()
  return new Promise((resolve, reject) => {
    method = method.toUpperCase()

    xhr.addEventListener('readystatechange', async function() {
      if (xhr.readyState !== xhr.DONE)
        return

      try {
        xhr.body = await parse(xhr.response, xhr)
        xhr.status === 304 || (xhr.status >= 200 && xhr.status < 300)
          ? resolve(xhr)
          : reject(new Error(xhr.statusText))
      } catch (e) {
        reject(e)
      }

      redraw && http.redraw && http.redraw()
    })

    xhr.onerror = xhr.onabort = e => reject(e || xhr.statusText)
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
    accept && accept.indexOf(json) === 0 && parse === identity && (parse = parseJSON)

    !contentType && body !== undefined && !rich.some(x => body instanceof x) && xhr.setRequestHeader('Content-Type', contentType = json)
    contentType && body !== undefined && contentType.indexOf(json) === 0 && serialize === identity && (serialize = serializeJSON)

    config && config(xhr)

    body === null
      ? xhr.send()
      : xhr.send(serialize(body, xhr))
  }).catch(error => {
    xhr.error = error
    return xhr
  })
}

function appendQuery(x, q) {
  const u = new URL(x, location)
      , qs = new URLSearchParams(q || '').toString()

  return x.split(/\?|#/)[0]
    + u.search
    + (qs ? (u.search ? '&' : '?') + qs : '')
    + (u.hash || '')
}
