import ey from 'ey'
import api from '../api.js'

const wss = new Set()
const app = ey()

app.ws({
  upgrade: r => ({ name: r.ip }),
  open: ws => wss.add(ws),
  close: ws => wss.delete(ws),
  message: (ws, { json }) => json.event && api[json.event](json.data, ws)
})

const { port } = await app.listen()

process.env.SIN_TOOLS_PORT = port

export default {
  port
}

api.refresh.observe(() => publish('refresh'))
api.redraw.observe(() => publish('redraw'))
api.log.observe(x => publish('log', x))

function publish(event, data) {
  console.log(event, data, wss)
  wss.forEach(ws => ws.send(JSON.stringify({ event, data })))
}
