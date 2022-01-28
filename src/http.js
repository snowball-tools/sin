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
  config,
  parse = x => JSON.parse(x.responseText),
  serialize = x => JSON.stringify(x)
} = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.onreadystatechange = function() {
      if (xhr.readyState === XMLHttpRequest.DONE) {
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

        redraw && http.redraw()
      }
    }
    xhr.onerror = xhr.onabort = reject
    xhr.open(method.toUpperCase(), url, true, user, pass)
    Object.keys(headers).forEach(xhr => headers[xhr] && xhr.setRequestHeader(xhr, headers[xhr]))
    'Content-Type' in headers === false && xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8')
    'Accept' in headers === false && xhr.setRequestHeader('Accept', 'application/json, text/*')
    config && config(xhr)
    body === null
      ? xhr.send()
      : xhr.send(serialize(body))
  })
}
