/* eslint no-console: 0 */

// https://chromedevtools.github.io/devtools-protocol/

import fs from 'fs'
import path from 'path'
import util from 'util'
import prexit from 'prexit'
import cp from 'child_process'

import config from './config.js'
import api from './api.js'
import { reservePort, modify } from './shared.js'

import '../../ssr/index.js'
import s from '../../src/index.js'

const port = await getPort()
    , root = 'http://127.0.0.1:' + port
    , hmr = 'if(window.self === window.top)window.hmr=1;'
    , replace = Math.random()

api.log({ replace, from: 'browser', type: 'status', value: '⏳' })
const chrome = await spawn()

let started
const start = new Promise(r => started = r)
const tabs = new Set((await getTabs(config.origin)).filter(x => {
  if (x.url === 'about:blank')
    s.http(root + '/json/close/' + x.id, { responseType: 'text' })

  if (x.url.indexOf(config.origin) === 0) {
    s.http(root + '/json/activate/' + x.id, { responseType: 'text' })
    connect(x)
    return x
  }
}))

if (tabs.size === 0) {
  const x = await s.http.put(root + '/json/new?' + api.url())
  connect(x)
  tabs.add(x)
}

await start

api.log({ replace, from: 'browser', type: 'status', value: '✅' })

// prexit.exit on last tab close()

prexit(async() => {
  chrome.kill()
})

api.browser.hotload.observe(async x => {
  await Promise.all([...tabs].map(async({ ws }) => {
    if (ws && ws.scripts.has(x.path)) {
      try {
        const r = await ws.request('Debugger.setScriptSource', {
          scriptId: ws.scripts.get(x.path),
          scriptSource: modify(x.next)
        })

        r.status === 'CompileError' && api.log({
          from: 'browser',
          type: 'hotload error',
          args: [{ type: 'string', value: r.exceptionDetails?.text }],
          stackTrace: {
            callFrames: [{ url: x.path, ...r.exceptionDetails }]
          }
        })
      } catch (e) {
        config.debug && api.log({ from: 'browser', type: 'hotload error', args: util.inspect(e) })
        ws.request('Page.reload').catch(() => { /* noop */ })
      }
    } else if (ws) {
      ws.request('Page.reload').catch(() => { /* noop */ })
    }
  }))
  api.browser.redraw()
})

async function connect(tab) {
  let id = 1

  const ws = new WebSocket(tab.webSocketDebuggerUrl)
      , requests = new Map()

  ws.scripts = new Map()
  tab.ws = ws
  ws.onmessage = onmessage
  ws.onerror = () => { /* noop */ }
  ws.onclose = () => closed(tab)
  ws.onopen = onopen
  ws.request = request

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
    started()
    await request('Runtime.enable')
    await request('Runtime.setAsyncCallStackDepth', { maxDepth: 128 })
    await request('Runtime.evaluate', { expression: hmr })
    await request('Debugger.enable').catch(e => api.log({ from: 'browser', type: 'chrome error', args: String(e) }))
    await request('Debugger.setBlackboxPatterns', { patterns: api.blackbox })
    await request('Network.enable')
    await request('Network.setCacheDisabled', { cacheDisabled: true })
    await request('Page.enable')
    await request('Page.addScriptToEvaluateOnLoad', { scriptSource: hmr })
    false && setTimeout(() => {
      request('Emulation.setDeviceMetricsOverride', {
        width: 320,
        height: 480,
        deviceScaleFactor: 2,
        mobile: true
      }).then(console.log, console.error)
    }, 2000)
  }

  function onmessage({ data }) {
    const { id, method, params, error, result } = JSON.parse(data)
    if (method === 'Debugger.scriptParsed' && params.url)
      return parsed(params)

    if (method === 'Page.navigatedWithinDocument' && params.url.indexOf(config.origin) === 0)
      return api.url(params.url)

    if (method === 'Page.frameNavigated' && !params.frame.parentId && params.frame.url.indexOf(config.origin) === 0)
      return api.url(params.frame.url)

    if (method === 'Runtime.consoleAPICalled')
      return api.log({ from: 'browser', ...params })

    if (method === 'Runtime.exceptionThrown')
      return api.log({ from: 'browser', type: 'exception', ...params.exceptionDetails })

    if (!requests.has(id))
      return

    const { reject, resolve } = requests.get(id)
    requests.delete(id)

    error
      ? reject(error)
      : resolve(result)
  }

  function parsed(script) {
    const x = path.join(config.cwd, new URL(script.url).pathname)
    if (script.url.indexOf(config.origin) !== 0 || !isFile(x))
      return

    const p = fs.realpathSync(path.isAbsolute(x) ? x : path.join(process.cwd(), x))
    ws.scripts.set(p, script.scriptId)
    api.browser.watch(p)
  }
}

async function closed(tab) {
  tabs.delete(tab)
  if (tabs.size === 0 && (await getTabs(config.origin)).length === 0) {
    chrome.kill()
    prexit.exit()
  }
}

function isFile(x) {
  try {
    return fs.statSync(x).isFile()
  } catch (e) {
    return false
  }
}

async function getTabs(url, retries = 0) {
  try {
    return await s.http(root + '/json/list/')
  } catch (err) {
    if (retries > 20)
      throw new Error('Could not fetch Chrome tabs')

    await new Promise(r => setTimeout(r, 200))
    return getTabs(url, ++retries)
  }
}

function getPath() {
  if (process.env.CHROME_PATH) // eslint-disable-line
    return process.env.CHROME_PATH.trim() // eslint-disable-line

  if (process.platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  } else if (process.platform === 'linux') {
    return cp.execSync('which google-chrome || which chromium || echo', { encoding: 'utf8' }).trim()
      || '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  } else if (process.platform === 'win32') {
    return [
      process.env['LOCALAPPDATA'] + '\\Google\\Chrome\\Application\\chrome.exe',      // eslint-disable-line
      process.env['PROGRAMFILES'] + '\\Google\\Chrome\\Application\\chrome.exe',      // eslint-disable-line
      process.env['PROGRAMFILES(X86)'] + '\\Google\\Chrome\\Application\\chrome.exe'  // eslint-disable-line
    ].find(fs.existsSync)
  }
}

async function spawn() {
  return new Promise((resolve, reject) => {
    const x = cp.spawn(getPath(), [
      '--no-first-run',
      '--disable-features=PrivacySandboxSettings4',
      '--no-default-browser-check',
      '--disable-web-security',
      '--disable-translate',
      '--disable-features=TranslateUI',
      '--disable-features=Translate',
      '--restore-last-session',
      '--disable-infobars',
      '--test-type', // Remove warning banner from --disable-web-security usage
      '--user-data-dir=' + config.project,
      '--remote-debugging-port=' + port,
      'about:blank'
    ], {
      detached: true
    })

    let opened
    x.stderr.setEncoding('utf8')
    x.stderr.on('data', () => resolve(x))
    x.stdout.setEncoding('utf8')
    x.stdout.on('data', x => {
      opened = true
      resolve(x)
    })

    x.on('close', () => opened || reject('closed'))
  })
}

function getPort() {
  try {
    return cp.execSync(`netstat -vanp tcp | grep " ${
      fs.readlinkSync(config.project).split('\n').pop().trim().split('-').pop()
    } "`, { encoding: 'utf8' }).match(/127\.0\.0\.1\.([0-9]{4,5}) /)[1]
  } catch (error) {
    return reservePort()
  }
}
