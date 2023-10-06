import '../log.js'
import s from '../../src/index.js'
import window from '../../src/window.js'
import { stackTrace } from '../../src/shared.js'
import goto from './inspect.js'

const unquoteFilename = navigator.platform.toLowerCase().includes('win')
  ? /"([^<>:"/\\|?*]+)":/ig
  : /"([^\0/]+)":/ig

let ws
connect()
function connect() {
  ws = new WebSocket(location.protocol.replace('http', 'ws') + location.host + '/sindev')
  ws.onmessage = onmessage
  ws.onclose = () => setTimeout(connect, 100)
  ws.onerror = console.log
}

function send(x) {
  ws && ws.readyState === 1 && ws.send(x)
}

function onmessage({ data }) {
  data === 'forceReload'
    ? location.reload()
    : data === 'reload'
    ? window.hmr || location.reload()
    : data === 'redraw' && window.hmr && s.redraw()
}

goto.observe(x => send(JSON.stringify(parseStackTrace(x)[3])))

s.error = s((error) => {
  console.error(error) // eslint-disable-line
  const stack = parseStackTrace(error.stack || '')
      , attrs = typeof error === 'object' && JSON.stringify(error, null, 2).replace(unquoteFilename, '$1:')

  return () => {
    return s`pre;all initial;d block;ws pre-wrap;m 0;c white;bc #ff0033;p 8 12;br 6;overflow auto`(
      s`code`(
        '' + error,
        stack.map(({ name, file, line, column }) =>
          s` o 0.75`(
            '    at ',
            name && (name + ' '),
            s`span c white;td underline`({
              onclick: (e) => {
                e.redraw = false
                send(JSON.stringify({ file, line, column }))
              }
            },
              file + ':' + line + ':' + column
            )
          )
        ),
        attrs !== '{}' && attrs
      )
    )
  }
})

function parseStackTrace(x) {
  return String(x).split('\n').reduce((acc, x) => (
    x = x.match(/( +at )?([^/]*)[@(](.+):([0-9]+):([0-9]+)/i), // check if really unnecessary escape char
    x && acc.push({
      name: x[2].trim(),
      file: x[3].replace(window.location.origin, ''),
      line: parseInt(x[4]),
      column: parseInt(x[5])
    }),
    acc
  ), [])
}
