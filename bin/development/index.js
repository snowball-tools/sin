import fs from 'fs'
import url from 'url'
import path from 'path'
import cp from 'child_process'
import prexit from 'prexit'
import readline from 'readline'

import './log.js'
import Node from './node.js'
import Watcher from './watcher.js'
import { getPort, gracefulRead, jail } from './shared.js'
import s from '../style.js'
import editor from './editor.js'
import live from './live.js'

const env = process.env
    , cwd = process.cwd()

env.NODE_ENV = 'development'

let retries = 0
  , sigint
  , timeout
  , timer
  , child
  , node
  , scripts = {}
  , run = false

const home = getHome()
    , port = env.PORT = env.PORT ? parseInt(env.PORT) : devPort()
    , nodePort = await getPort()
    , dirname = path.dirname(url.fileURLToPath(import.meta.url))
    , argv = process.argv.slice(3)
    , entry = argv.find(x => !'clear ssr raw server'.includes(x) && x[0] !== '-') || ''
    , root = env.SIN_ENTRY = path.isAbsolute(entry)
      ? entry
      : path.join(process.cwd(),
        entry !== path.basename(process.cwd()) && fs.existsSync(entry + '.js')
          ? entry + '.js'
          : entry !== path.basename(process.cwd())
            ? path.join(entry, entry.endsWith('.js') ? '' : 'index.js')
            : 'index.js'
      )

console.log(entry, root, port)
process.on('SIGINFO', restart)
process.stdin.isTTY && registerKeys()

const watcher = Watcher(changed)

start()
// run || browser()

function start() {
  clearTimeout(timer)
  p(54, argv.some(x => x === 'raw'))
  const execPath = argv.some(x => x === 'raw')
    ? import(root)
    : path.join(dirname, 'server.js')

  child = cp.fork(
    execPath,
    process.argv.slice(1),
    {
      silent: true,
      execArgv: [
        '--import', url.pathToFileURL(path.join(dirname, '..', 'import.js')),
        '--inspect=' + nodePort,
        '--expose-internals',
        '--no-warnings'
      ].filter(x => x)
    }
  )

  child.stderr.setEncoding('utf8')
  child.stdout.on('data', x => process.stdout.write(x))
  child.stderr.on('data', async(data) => {
    if (data.includes('Debugger listening on ws://127.0.0.1:' + nodePort)) {
      node = await Node(data.slice(22).split('\n')[0], scriptParsed).catch(console.error)
    } else if (data.includes('Waiting for the debugger to disconnect...')) {
      node && node.close()
    } else if (!data.includes('Debugger ending on ws://127.0.0.1:')) {
      process.stderr.write(data)
    }
  })

  const resetTimer = setTimeout(() => retries = 0, timeout)
  child.on('close', code => {
    child = null
    clearTimeout(resetTimer)
    if (code === 123) // watch fired, start immidiately
      return start()

    timeout = Math.min(Math.pow(1.5, ++retries) * 1000, 1000 * 60)
    if (sigint || !code) {
      console.log(
        code ? '⛔️' : '✅',
        'Closed with code: ' + s.bold(code)
      )
      process.stdin.destroy()
    } else {
      const retry = performance.now() > 3000
      console.log(`⛔️ Closed with code: ${ s.bold(code) }`, retry
        ?` - restarting in ${ s.bold((timeout / 1000).toFixed(2)) }s`
        : '')
      retry
        ? timer = setTimeout(start, timeout)
        : prexit.exit()
    }
  })

  argv.includes('--live') && live(chromeHome, port)
}


async function scriptParsed(x) {
  if (!x.url.startsWith('file://'))
    return

  const filePath = url.fileURLToPath(x.url)
  if (scripts[filePath]) {
    scripts[filePath].scriptId = x.scriptId
  } else {
    const original = await gracefulRead(filePath).catch(() => null)
    if (original === null)
      return

    watch({
      path: filePath,
      original,
      source: jail(original),
      scriptId: x.scriptId
    })
  }
}

function watch(x) {
  if (scripts[x.path])
    return

  scripts[x.path] = x
  watcher.add(x.path)
}

async function changed(x) {
  const file = scripts[x]
      , source = await gracefulRead(x)
      , changed = source !== file.original

  file.original = source
  file.source = jail(source)

  changed && file.scriptId
    ? setSource(file).catch(console.error)
    : restart()
}

async function setSource(x) {
  await node.send('Debugger.setScriptSource', {
    scriptId: x.scriptId,
    scriptSource: x.source
  }).catch(console.error)
}

function restart() {
  node && node.close()
  retries = 0
  child
    ? kill('SIGHUP')
    : start()
}

function kill(signal) {
  node && node.close()
  child && child.kill(signal)
}

function registerKeys() {
  readline.emitKeypressEvents(process.stdin)
  process.stdin.setRawMode(true)
  process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name === 'c') {
      if (sigint) {
        console.log(`⛔️ Force closed`)
        return process.exit(1)
      }
      sigint = true
      kill('SIGINT')
    } else if (key.name === 'r' || (key.ctrl && key.name === 't')) {
      restart()
    }
  })
}

async function browser() {
  const name = port + '-' + path.basename(cwd) // + (entry === 'index.js' ? '' : '-' + entry)
      , chromeHome = path.join(home, name)
      , scriptsPath = path.join(chromeHome, '.sin-scripts')
      , scripts = (await gracefulRead(scriptsPath).then(x => JSON.parse(x)).catch(() => {}) || {})
      , logs = []
      , seen = {}
      , originals = {}
      , sockets = new Set()
      , watcher = Watcher(changed)

  fs.mkdirSync(home, { recursive: true })

  prexit(async(signal) => {
    signal === 'SIGHUP' && !process.exitCode && (process.exitCode = 123)
    process.exitCode !== 123 && await chrome.send('Browser.close')
    sockets.forEach(x => x.close())
    unlisten()
  })

  const app = {}
  app.ws('/sindev', {
    upgrade: r => {
      return {
        name: r.ip
      }
    },
    open(ws) {
      sockets.add(ws)
      ws.subscribe('update')
      logs.forEach(x => ws.send(x))
      seen[ws.name] || setTimeout(() => console.log(seen[ws.name] = ws.name, 'connected'), 100)
    },
    message(ws, { text }) {
      if (text.indexOf('goto.') === 0) {
        const { file, line, column } = JSON.parse(text.slice(5))
        editor({
          path: fs.existsSync(file) ? file : path.join(cwd, file),
          line,
          column
        })
      }
    },
    close(ws) {
      sockets.delete(ws)
    }
  })

  let chrome = await (await import('./chrome.js')).default(chromeHome, log, url, scriptParsed)

  async function scriptParsed(x) {
    if (x.url.indexOf(url) !== 0)
      return

    const filePath = extensionless(path.join(cwd, new URL(x.url).pathname))

    if (scripts[filePath]) {
      scripts[filePath].scriptId = x.scriptId
    } else {
      const original = await gracefulRead(filePath).catch(() => null)
      if (original === null)
        return

      watch({
        path: filePath,
        original,
        source: modify(original, filePath),
        scriptId: x.scriptId
      })
    }
    saveScripts()
  }

  function log(x) {
    x = 'log.' + JSON.stringify(x)
    logs.push(x)
    app.publish('update', x)
  }


  async function setSource(x) {
    await chrome.send('Debugger.setScriptSource', {
      scriptId: x.scriptId,
      scriptSource: x.source
    }).catch(console.error)
  }

  function watch(x) {
    if (scripts[x.path])
      return

    scripts[x.path] = x
    watchAdd(x)
  }

  function watchAdd(x) {
    serverWatch.loaded.remove(x.path)
    watcher.add(x.path)
  }

  function saveScripts() {
    try {
      fs.writeFileSync(scriptsPath, JSON.stringify(scripts))
    } catch (x) {
      return x
    }
  }

  async function changed(x) {
    const file = scripts[x]
        , source = await gracefulRead(x)
        , changed = source !== file.original

    app.publish('update', 'reload')
    file.original = source
    file.source = modify(source, x)

    changed && file.scriptId
      ? setSource(file).catch(console.error).then(() => app.publish('update', 'redraw'))
      : app.publish('update', 'forceReload')
    changed && saveScripts(x)
  }
}

function getHome() {
  const x = env.SIN_HOME || path.join(
    process.platform === 'win32' && env.USER_PROFILE || env.HOME,
    '.sin'
  )
  fs.mkdirSync(x, { recursive: true })
  return x
}

function devPort() {
  const file = path.join(home, '.ports')
  const ports = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, 'utf8'))
    : {}

  if (cwd in ports)
    return ports[cwd]

  const port = 1 + (Object.values(ports).sort().find((x, i, xs) => xs[i + 1] !== x + 1) || 1336)
  ports[cwd] = port
  fs.writeFileSync(file, JSON.stringify(ports))
  return port
}
