/* eslint no-console: 0 */

// https://chromedevtools.github.io/devtools-protocol/

import fs from 'fs'
import path from 'path'
import prexit from 'prexit'
import cp from 'child_process'

import config from '../config.js'
import api from './api.js'
import { getPort, modify } from './shared.js'

import '../../ssr/index.js'
import s from '../../src/index.js'

const port = await getPort()
    , hmr = 'if(window.self === window.top)window.hmr=1;'
    , scripts = new Map()

const chrome = cp.spawn(getPath(), [
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-web-security',
  '--disable-translate',
  '--disable-features=TranslateUI',
  '--disable-features=Translate',
  '--disable-infobars',
  '--test-type', // Remove warning banner from --disable-web-security usage
  '--user-data-dir=' + api.project,
  '--remote-debugging-port=' + port,
  api.url()
], {
  detached: true,
  stdio: 'ignore'
})

chrome.unref()

const tab = await getTab(api.origin)

if (!tab)
  throw new Error('Could not find tab in chrome')

const ws = await connect(tab.webSocketDebuggerUrl)

ws.onerror = error => console.error(error)
ws.onclose = prexit.exit

prexit(async() => {
  await ws.request('Browser.close').catch(() => {})
  chrome.kill()
})

api.browser.hotload.observe(async x => {
  if (!scripts.has(x.path))
    return

  ws.request('Debugger.setScriptSource', {
    scriptId: scripts.get(x.path),
    scriptSource: modify(x.next)
  }).then(api.browser.redraw, api.browser.refresh)
})

async function connect(debuggerUrl) {
  return new Promise((resolve, reject) => {
    let id = 1

    const ws = new WebSocket(debuggerUrl)
        , requests = new Map()

    ws.onmessage = onmessage
    ws.onerror = reject
    ws.onclose = reject
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
      await request('Runtime.enable')
      await request('Runtime.setAsyncCallStackDepth', { maxDepth: 128 })
      await request('Runtime.evaluate', { expression: hmr })
      await request('Debugger.enable').catch(print.debug)
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
      resolve(ws)
    }

    function onmessage({ data }) {
      const { id, method, params, error, result } = JSON.parse(data)
      if (method === 'Debugger.scriptParsed' && params.url)
        return parsed(params)

      if (method === 'Page.navigatedWithinDocument' && params.url.indexOf(api.origin) === 0)
        return api.url(params.url)

      if (method === 'Page.frameNavigated' && !params.frame.parentId && params.frame.url.indexOf(api.origin) === 0)
        return api.url(params.frame.url)

      if (method === 'Runtime.consoleAPICalled')
        return api.log({ from: 'browser', ...params })

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
      if (script.url.indexOf(api.origin) !== 0 || !isFile(x))
        return

      const p = fs.realpathSync(path.isAbsolute(x) ? x : path.join(process.cwd(), x))
      scripts.set(p, script.scriptId)
      api.browser.watch(p)
    }
  })
}

function isFile(x) {
  try {
    return fs.statSync(x).isFile()
  } catch (e) {
    return false
  }
}

async function getTab(url, retries = 0) {
  try {
    const tabs = await s.http('http://127.0.0.1:' + port + '/json/list/')
    return tabs.find(t => t.url.indexOf(api.origin) === 0)
  } catch (err) {
    if (retries > 20)
      throw new Error('Could not connect to Chrome dev tools')

    await new Promise(r => setTimeout(r, 500))
    return getTab(url, ++retries)
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
