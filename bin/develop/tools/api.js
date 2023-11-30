import s from 'SIN'

let ws
connect()

const api = {
  log    : s.event(),
  redraw : s.event(),
  reload : s.event(() => location.reload()),
  editor : s.event(x => send('editor', x)),
  parseStackTrace
}

export default api

function connect() {
  ws = new WebSocket(
    location.protocol.replace('http', 'ws') + location.hostname + ':' + window.sintools.getAttribute('port')
  )
  ws.onmessage = onmessage
  ws.onclose = () => setTimeout(connect, 100)
  ws.onerror = console.log
}

function send(event, data) {
  ws && ws.readyState === 1 && ws.send(JSON.stringify({ event, data }))
}

function onmessage(e) {
  const { event, data } = JSON.parse(e.data)
  api[event](data)
}

export function parseStackTrace(x) {
  return String(x).split('\n').reduce((acc, x) => (
    x = x.endsWith(')')
      ? x.match(/( +at )?([^/]*)[@(](.+):([0-9]+):([0-9]+)/i)
      : x.match(/( +at)( )?(.+):([0-9]+):([0-9]+)$/i),
    x && acc.push({
      name: x[2].trim(),
      file: x[3].replace(window.location.origin, ''),
      line: parseInt(x[4]),
      column: parseInt(x[5])
    }),
    acc
  ), [])
}
