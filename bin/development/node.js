/* eslint no-console: 0 */

import WS from 'ws'

import { getPort } from './shared.js'

const requests = new Map()

let id = 1

export default async function(url, scriptParsed) {
  let errored = null
    , opened = false
    , socket
    , open

  await new Promise(r => setTimeout(r, 50))
  await connect()

  return { send, close: () => socket.close() }

  async function connect() {
    errored = null
    socket = new WS(url)
    socket.onopen = onopen
    socket.onmessage = onmessage
    socket.onerror = onerror
    socket.onclose = () => !errored && setTimeout(connect, 100)
    return open || new Promise((resolve, reject) => open = { resolve, reject })
  }

  function onerror(x) {
    errored = x
    if (opened) {
      console.debug('Node closed')
    } else {
      opened && console.error('Unknown Node WS Error:', x.message)
      open.reject(x)
    }
  }

  async function send(method, params) {
    return socket.readyState === 1 && new Promise((resolve, reject) => {
      const message = {
        id: id++,
        method,
        params,
        resolve,
        reject
      }
      requests.set(message.id, message)
      socket.send(JSON.stringify(message))
    })
  }

  async function onopen() {
    open.resolve()
    await send('Debugger.enable')
    console.debug(opened
      ? 'Reconnected to Node'
      : 'Connected to Node') // eslint-disable-line
  }

  function onmessage({ data }) {
    opened = true
    const { id, method, params, error, result } = JSON.parse(data)
    if (method === 'Debugger.scriptParsed' && params.url)
      return scriptParsed(params)

    if (!requests.has(id))
      return

    const { reject, resolve } = requests.get(id)
    requests.delete(id)

    error
      ? reject(error)
      : resolve(result)
  }

}
