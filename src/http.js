import window from './window.js'

['get', 'put', 'post', 'delete', 'patch'].forEach(x =>
  http[x] = function(url, object = {}) {
    object.method = x
    return http(url, object)
  }
)

http.redraw = () => { /* noop */ }

const serializeJSON = x => JSON.stringify(x)
    , parseJSON = x => JSON.parse(x.responseText)

export default function http(url, {
  method = 'GET',
  redraw = true,
  body = null,
  query = null,
  user = undefined,
  pass = undefined,
  headers = {},
  config,
  parse = parseJSON,
  serialize = serializeJSON
} = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new window.XMLHttpRequest()
    method = method.toUpperCase()

    xhr.onreadystatechange = function() {
      if (xhr.readyState === xhr.DONE) {
        let body = xhr.responseText
          , error

        try {
          body = parse(xhr)
        } catch (e) {
          error = e
        }

        error || xhr.status >= 300
          ? reject(error || xhr.status)
          : resolve(body)

        redraw && http.redraw && http.redraw()
      }
    }

    let accept = 'application/json, text/*'
      , contentType = 'application/json; charset=utf-8'

    xhr.onerror = xhr.onabort = error => reject(error || xhr.statusText)
    query && (url += url.replace(/(#)|$/, (url.indexOf('?') > -1 ? '&' : '?') + new URLSearchParams(query).toString() + '$1'))
    xhr.open(method, url, true, user, pass)

    Object.entries(headers).forEach(([header, value]) => {
      xhr.setRequestHeader(header, value)
      header.toLowerCase() === 'accept' ? (accept = false) :
      header.toLowerCase() === 'content-type' && (contentType = false)
    })

    accept && parse === parseJSON && xhr.setRequestHeader('Accept', accept)
    contentType && serialize === serializeJSON && xhr.setRequestHeader('Content-Type', contentType)
    config && config(xhr)

    body === null
      ? xhr.send()
      : xhr.send(serialize(body))
  })
}
