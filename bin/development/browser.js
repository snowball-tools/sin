import '../log.js'
import s from '../../src/index.js'
import window from '../../src/window.js'
import { goto, log, hmr, parseStackTrace } from './inspect.js'

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

function send(name, x) {
  ws && ws.readyState === 1 && ws.send(name + '.' + JSON.stringify(x))
}

function onmessage({ data }) {
  data === 'forceReload'
    ? location.reload()
    : data === 'reload'
    ? window.hmr || location.reload()
    : data === 'redraw'
    ? window.hmr && hmr()
    : data.startsWith('log.')
    ? log(JSON.parse(data.slice(4)))
    : null
}

goto.observe(x => send('goto', x))

s.error = s((error) => {
  console.error(error) // eslint-disable-line
  const stack = parseStackTrace(error.stack || '')
      , attrs = typeof error === 'object' && JSON.stringify(error, null, 2).replace(unquoteFilename, '$1:')

  return () => {
    return s`pre;all initial;d block;ws pre-wrap;m 0;c white;bc #ff0033;p 8 12;br 6;overflow auto`(
      s`code`(
        '' + error,
        stack.map(({ name, file, line, column }) =>
          s`
            c #ccc
          `(
            '    at ',
            name && (name + ' '),
            s`span
              :hover { c white }
              td underline
              cursor pointer
            `({
              onclick: (e) => {
                e.redraw = false
                send('goto', { file, line, column })
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
