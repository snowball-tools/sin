['get', 'put', 'post', 'delete', 'patch'].forEach(x =>
  http[x] = function(url, object) {
    object.method = x
    return http(url, object)
  }
)

export default function http(url, {
  method = 'GET',
  redraw = true,
  body = null,
  user,
  pass,
  headers = {},
  config,
  raw
} = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.onreadystatechange = function() {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        let body = xhr.responseText
          , error

        if (!raw) {
          try {
            body = JSON.parse(xhr.responseText)
          } catch (e) {
            error = e
          }
        }

        (error || xhr.status >= 300 ? reject : resolve)({
          status: xhr.status,
          body,
          xhr
        })
        redraw && http.redraw && http.redraw()
      }
    }
    xhr.onerror = xhr.onabort = event => reject(xhr, { event })
    xhr.open(method.toUpperCase(), url, true, user, pass)
    Object.keys(headers).forEach(x => headers[x] && xhr.setRequestHeader(x, headers[x]))
    'Content-Type' in headers === false && xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8')
    'Accept' in headers === false && xhr.setRequestHeader('Accept', 'application/json, text/*')
    config && config(xhr)
    body === null
      ? xhr.send()
      : xhr.send(raw ? body : JSON.stringify(body))
  })
}
