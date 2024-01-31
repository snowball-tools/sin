import fs from 'fs'
import URL from 'url'
import path from 'path'
import prexit from 'prexit'
import cp from 'child_process'
import color from '../color.js'

import config from '../config.js'
import api from './api.js'
import { reservePort, jail } from './shared.js'
import s from '../../src/index.js'

const port = await reservePort()
    , dirname = path.dirname(URL.fileURLToPath(import.meta.url))
    , replace = Math.random()

api.node.hotload.observe(() => std({ replace, from: 'node', type: 'status', value: '🔥' }))

let node
  , ws
  , scripts = new Map()
  , startPerf

prexit(close)

api.node.restart.observe(restart)

async function restart(x) {
  api.log({ replace, from: 'node', type: 'status', value: '🔄' })
  await s.sleep(100)
  close()
  await start()
  x === 'reload' && s.sleep(200).then(() => api.browser.reload())
}

api.node.hotload.observe(async x => {
  if (!scripts.has(x.path))
    return

  try {
    const r = ws && await ws.request('Debugger.setScriptSource', {
      scriptId: scripts.get(x.path),
      scriptSource: jail(x.next)
    })
    r && r.status === 'CompileError' && api.log({
      from: 'browser',
      type: 'hotload error',
      args: [{ type: 'string', value: r.exceptionDetails?.text }],
      stackTrace: {
        callFrames: [{ url: x.path, ...r.exceptionDetails }]
      }
    })
  } catch (e) {
    config.debug && api.debug(e, x)
    restart()
  }
})

await start()

function close() {
  node && node.kill()
}

async function start() {
  startPerf = performance.now()
  let started
  const promise = new Promise(r => started = r)

  api.log({ replace, from: 'node', type: 'status', value: node ? 'Restarting' : '⏳' })
  node = cp.fork(
    config.script ? config.entry : path.join(dirname, 'serve.js'),
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
  node.stdout.on('data', data => config.debug && api.log({ from: 'node', type: 'stdout', args: data }))

  node.stderr.setEncoding('utf8')
  node.stderr.on('data', async(data) => {
    config.debug && api.log({ from: 'node', type: 'stderr', args: data })
    if (data.includes('Debugger listening on ws://127.0.0.1:' + port)) {
      ws = connect(data.slice(22).split('\n')[0].trim())
    } else if (data.includes('Waiting for the debugger to disconnect...')) {
      ws && setTimeout(() => ws.close(), 200)
    }
  })

  node.on('message', x => api.browser.watch(x))

  node.on('close', async(code, signal) => {
    ws && ws.close()
    ws = null

    api.log({
      from: 'node',
      type: 'status',
      right: color.gray(duration()),
      value: code
        ? '💥 (' + code + ')'
        : '🏁'
    })
  })

  await promise
  startPerf = performance.now()
  api.log({ replace, from: 'node', type: 'status', value: '🚀' })

  function duration() {
    return (performance.now() - startPerf).toFixed(2) + 'ms'
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
      started()
    }

    function onmessage({ data }) {
      const { id, method, params, error, result } = JSON.parse(data)
      if (method === 'Debugger.scriptParsed' && params.url)
        return parsed(params)

      if (method === 'Runtime.consoleAPICalled')
        return api.log({ from: 'node', ...params })

      if (method === 'Runtime.exceptionThrown')
        return api.log({ from: 'node', type: 'exception', ...params.exceptionDetails })

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
