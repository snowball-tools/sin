import Server from '#server'

import api from '../api.js'
import editor from './editor.js'
import config from '../config.js'
import eyeDropper from './eyedropper/index.js'

let eyeDropperStop

const events = {
  editor,
  inspect
}

const wss = new Set()
const app = Server()

app.ws({
  upgrade: r => ({ name: r.ip }),
  open: ws => wss.add(ws),
  close: ws => wss.delete(ws),
  message: (ws, { json }) => json.event && events[json.event](json.data, ws)
})

await app.listen(config.devPort)

api.browser.reload.observe(x => publish('reload', x))
api.browser.redraw.observe(x => publish('redraw', x))
api.log.observe(x => publish('log', x))

function publish(event, data) {
  wss.forEach(ws => send(ws, event, data))
}

function send(ws, event, data) {
  ws.send(JSON.stringify({ event, data }))
}

function inspect(x, ws) {
  x
    ? eyeDropperStop = eyeDropper(x => send(ws, 'color', x))
    : eyeDropperStop && eyeDropperStop()
}
