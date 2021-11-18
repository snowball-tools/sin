['get', 'put', 'post', 'delete', 'patch'].forEach(x =>
  http[x] = function(url, object = {}) {
    object.method = x
    return http(url, object)
  }
)

http.redraw = () => { /* noop */ }

export default function http(url, {
  method = 'GET',
  redraw = true,
  body = null,
  user = undefined,
  pass = undefined,
  headers = {},
  config = () => { /* noop */ },
  raw = false,
  background = false,
  extract = xhr => JSON.parse(xhr.responseText)
} = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.onreadystatechange = function() {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        let body = xhr.responseText
          , error

        if (!raw) {
          try {
            body = extract(xhr)
          } catch (e) {
            error = e
          }
        }

        (error || xhr.status >= 300 ? reject : resolve)({
          status: xhr.status,
          body,
          xhr
        })
        redraw && !background && http.redraw()
      }
    }
    xhr.onerror = xhr.onabort = event => reject({ event, xhr })
    xhr.open(method.toUpperCase(), url, true, user, pass)
    Object.keys(headers).forEach(x => headers[x] && xhr.setRequestHeader(x, headers[x]))
    'Content-Type' in headers === false && xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8')
    'Accept' in headers === false && xhr.setRequestHeader('Accept', 'application/json, text/*')
    config(xhr)
    body === null
      ? xhr.send()
      : xhr.send(raw ? body : JSON.stringify(body))
  })
}
