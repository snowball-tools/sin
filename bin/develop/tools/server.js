import url from 'url'
import cp from 'child_process'
import ey from 'ey'
import api from '../api.js'
import editor from './editor.js'
import eyeDropper from './eyedropper/index.js'

let eyeDropperStop

const events = {
  editor,
  inspect
}

const wss = new Set()
const app = ey()

app.ws({
  upgrade: r => ({ name: r.ip }),
  open: ws => wss.add(ws),
  close: ws => wss.delete(ws),
  message: (ws, { json }) => json.event && events[json.event](json.data, ws)
})

const { port } = await app.listen()

process.env.SIN_TOOLS_PORT = port

export default {
  port
}

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
