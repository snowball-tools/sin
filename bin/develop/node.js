import fs from 'node:fs'
import URL from 'node:url'
import path from 'node:path'
import cp from 'node:child_process'

import prexit from '../prexit.js'
import color from '../color.js'

import config from './config.js'
import api from './api.js'
import { modify, Watcher } from './shared.js'

const dirname = path.dirname(URL.fileURLToPath(import.meta.url))
    , replace = Math.random()

let node
  , ws
  , scripts = new Map()
  , startPerf

prexit(close)

Watcher(() => api.node.restart('reload')).add('.env')
api.node.restart.observe(restart)
api.node.hotload.observe(() =>
  node
    ? api.log({ replace, from: 'node', type: 'status', value: '🔥' })
    : restart()
)

async function restart(x) {
  api.log({ replace: 'nodeend', from: 'node', type: 'status', value: '🔄' })
  await close()
  await start()
  x === 'reload' && setTimeout(() => api.browser.reload(), 200)
}

api.node.hotload.observe(async x => {
  if (!scripts.has(x.path))
    return

  try {
    const r = ws && await ws.request('Debugger.setScriptSource', {
      scriptId: scripts.get(x.path),
      scriptSource: modify(x.next, x.path)
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
    config.debug && console.log(e, x) // eslint-disable-line
    restart()
  }
})

export const onlyServer = await start()

async function close() {
  node && (node.kill(), node.connected && await new Promise(r => node.on('close', r)))
}

async function start() {
  startPerf = performance.now()
  let resolve
    , reject

  const promise = new Promise((r, e) => (resolve = r, reject = e))

  api.log({ replace, from: 'node', type: 'status', value: '⏳' })
  node = cp.fork(
    config.$[1] === 'script' ? config.entry : path.join(dirname, 'serve.js'),
    process.argv.slice(2),
    {
      stdio: ['inherit', 'pipe', 'pipe', 'ipc'],
      execArgv: [
        '--import', '' + URL.pathToFileURL(path.join(dirname, 'import.js')),
        '--trace-uncaught',
        '--inspect=' + config.nodePort
      ]
    }
  )

  node.stdout.setEncoding('utf8')
  node.stdout.on('data', data => api.log({ from: 'node', type: 'stdout', args: data }))
  node.stderr.setEncoding('utf8')
  node.stderr.on('data', async(data) => {
    data.includes('Debugger listening on ws://127.0.0.1:' + config.nodePort)
      ? ws = connect(data.slice(22).split('\n')[0].trim())
      : data.includes('Waiting for the debugger to disconnect...')
      ? ws && setTimeout(() => ws.close(), 200)
      : data !== 'Debugger attached.\n' && !lastException(data)
      ? api.log({ from: 'node', type: 'stderr', args: data })
      : null
  })

  node.on('message', x => {
    x.startsWith('started:')
      ? resolve(x.slice(8) === 'true')
      : x.startsWith('watch:') && api.browser.watch(x.slice(6))
  })

  node.on('close', async(code, signal) => {
    ws && ws.close()
    ws = node = null

    prexit.exiting || api.log({
      replace: 'nodeend',
      from: 'node',
      type: 'status',
      right: color.gray(duration()),
      value: code
        ? '💥 (' + code + ')'
        : '🏁'
    })
    code
      ? reject('Exited with code: ' + code + (signal ? 'on ' + signal : ''))
      : resolve()
  })

  const result = await promise
  startPerf = performance.now()
  api.log({ replace, from: 'node', type: 'status', value: '🚀' })

  return result

  function lastException(x) {
    if (x.includes(`internalBinding('errors').triggerUncaughtException(`))
      return true

    const l = api.log().exception
    const message = l?.preview?.properties?.find(x => x.name === 'message')?.value || l?.description
    return l && x.includes(message)
  }

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
    }

    function onmessage({ data }) {
      const { id, method, params, error, result } = JSON.parse(data)
      if (method === 'Debugger.scriptParsed' && params.url)
        return parsed(params)

      if (method === 'Runtime.consoleAPICalled') {
        api.recent = params.args
        return api.log({ from: 'node', ...params })
      }

      if (method === 'Runtime.exceptionThrown')
        return api.log({ ws, from: 'node', type: 'exception', ...params.exceptionDetails })

      if (!requests.has(id))
        return

      const x = requests.get(id)
      requests.delete(id)

      error
        ? x.reject(error)
        : x.resolve(result)
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
