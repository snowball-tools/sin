import fs from 'fs'
import URL from 'url'
import path from 'path'
import prexit from 'prexit'
import cp from 'child_process'

import config from '../config.js'
import api from './api.js'
import { getPort, jail } from './shared.js'

const port = await getPort()
    , dirname = path.dirname(URL.fileURLToPath(import.meta.url))

let node
  , ws
  , scripts = new Map()

prexit(close)

api.node.restart.observe(async() => {
  await close()
  start()
})

api.node.hotload.observe((x) => {
  if (!scripts.has(x.path))
    return

  ws && ws.request('Debugger.setScriptSource', {
    scriptId: scripts.get(x.path),
    scriptSource: jail(x.next)
  })
})

start()

function close() {
  ws && ws.close()
  node && node.kill()
}

function start() {
  api.log({ from: 'node', type: 'starting' })

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
  node.stdout.on('data', data => api.debug && process.stdout.write(data))

  node.stderr.setEncoding('utf8')
  node.stderr.on('data', async(data) => {
    api.debug && process.stderr.write(data)
    if (data.includes('Debugger listening on ws://127.0.0.1:' + port)) {
      ws = connect(data.slice(22).split('\n')[0].trim())
    } else if (data.includes('Waiting for the debugger to disconnect...')) {
      ws && ws.close()
    }
  })

  node.on('close', () => {
    ws && ws.close()
    ws = null
  })

  function pass(data) {
    return data !== 'Debugger ending on ws://127.0.0.1:' + port
        && data !== 'Debugger attached.'
  }

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
      await request('Runtime.enable')
      await request('Runtime.setAsyncCallStackDepth', { maxDepth: 128 })
      await request('Debugger.enable')
      api.log({ from: 'node', type: 'started' })
    }

    function onmessage({ data }) {
      const { id, method, params, error, result } = JSON.parse(data)
      if (method === 'Debugger.scriptParsed' && params.url)
        return parsed(params)

      if (method === 'Runtime.consoleAPICalled')
        return api.log({ from: 'node', ...params })

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
      api.node.watch(p)
    }
  }
}
