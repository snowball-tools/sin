import fs from 'fs'
import URL from 'url'
import path from 'path'
import prexit from 'prexit'
import cp from 'child_process'

import config from '../config.js'
import api from './api.js'
import { getPort } from './shared.js'

const port = await getPort()
    , dirname = path.dirname(URL.fileURLToPath(import.meta.url))

let node
  , ws
  , scripts = new Map()

prexit(() => {
  ws && ws.close()
  node && node.kill()
})

api.reload.observe((x) => {
  ws && ws.request('Debugger.setScriptSource', {
    scriptId: scripts[x.path],
    scriptSource: x.next
  })
})

start()

function start() {
  node = cp.fork(
    config.raw ? config.entry : path.join(dirname, 'serve.js'),
    [],
    {
      silent: true,
      execArgv: [
        '--import', '' + URL.pathToFileURL(path.join(dirname, 'import.js')),
        '--inspect=' + port,
        ...(
          process.argv.indexOf('--') > -1
            ? process.argv.slice(process.argv.indexOf('--'))
            : []
        )
      ]
    }
  )

  node.stdout.setEncoding('utf8')
  node.stdout.on('data', data => api.log({ type: 'info', origin: 'server', data }))

  node.stderr.setEncoding('utf8')
  node.stderr.on('data', async(data) => {
    if (data.includes('Debugger listening on ws://127.0.0.1:' + port)) {
      ws = connect(data.slice(22).split('\n')[0].trim())
    } else if (data.includes('Waiting for the debugger to disconnect...')) {
      ws && ws.close()
    } else if (!data.includes('Debugger ending on ws://127.0.0.1:' + port)) {
      api.log({ type: 'error', origin: 'server', data: data.trim() })
    }
  })

  node.on('close', () => {
    ws && ws.close()
    ws = null
  })

  function connect(url) {
    const requests = new Map()

    let id = 1

    const ws = new WebSocket(url)
    ws.onopen = onopen
    ws.onmessage = onmessage
    ws.request = request

    return ws

    async function request(method, params) {
      return ws.readyState === 1 && new Promise((resolve, reject) => {
        const message = {
          id: id++,
          method,
          params,
          resolve,
          reject
        }
        requests.set(message.id, message)
        ws.send(JSON.stringify(message))
      })
    }

    async function onopen() {
      await request('Debugger.enable')
    }

    function onmessage({ data }) {
      const { id, method, params, error, result } = JSON.parse(data)
      if (method === 'Debugger.scriptParsed' && params.url)
        return parsed(params)

      if (!requests.has(id))
        return

      const { reject, resolve } = requests.get(id)
      requests.delete(id)

      error
        ? reject(error)
        : resolve(result)
    }

    function parsed(script) {
      if (!script.url.startsWith('file://'))
        return

      const x = URL.fileURLToPath(script.url)
      const p = fs.realpathSync(path.isAbsolute(x) ? x : path.join(process.cwd(), x))
      scripts.set(p, script.scriptId)
      api.watch({ path: p, origin: 'server' })
    }
  }
}
