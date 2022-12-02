/* eslint no-console: 0 */

// https://chromedevtools.github.io/devtools-protocol/

import path from 'path'
import net from 'net'
import cp from 'child_process'
import fs from 'fs'
import fsp from 'fs/promises'
import WS from 'ws'

import '../../ssr/index.js'
import s from '../../src/index.js'

const requests = new Map()
const hmr = 'if(window.self === window.top)window.hmr=1;'
const args = process.argv.slice(2).concat((process.env.SIN_DEV_ARGS || '').split(' '))

let id = 1

export default async function(home, url, scriptParsed) {
  const urlPath = path.join(home, '.sin-url')
      , wsUrlPath = path.join(home, '.sin-chrome-ws')
      , scriptsPath = path.join(home, '.sin-scripts')
      , chromePortPath = path.join(home, '.sin-chrome-port')

      , chromePort = (await fsp.readFile(chromePortPath, 'utf8').catch(() => null)) || await getPort()
      , lastUrl = await fsp.readFile(urlPath, 'utf8').catch(() => null)
      , chromeUrl = `http://127.0.0.1:${ chromePort }/json/`

  let wsUrl = await fsp.readFile(wsUrlPath, 'utf8').catch(() => null)
    , launched = false
    , errored = null
    , opened = false
    , socket
    , chrome
    , open

  await (wsUrl
    ? connect()
    : spawn()
  )

  process.on('SIGINT', async() => {
    await send('Browser.close')
    process.exit()
  })

  return send

  async function spawn() {
    console.log('Launch Chrome')
    chrome = cp.spawn(getPath(), [
      args.includes('--fps') ? '--show-fps-counter' : '',
      args.includes('--tools') ? '--auto-open-devtools-for-tabs' : '',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-web-security',
      '--disable-translate',
      '--disable-features=TranslateUI',
      '--disable-features=Translate',
      '--disable-infobars',
      '--test-type', // Remove warning banner from --disable-web-security usage
      '--user-data-dir=' + home,
      '--remote-debugging-port=' + chromePort,
      lastUrl || url
    ], {
      detached: true,
      stdio: 'ignore'
    })

    chrome.unref()

    const tabs = await getTabs(chromeUrl)
    const tab = tabs.find(t => t.url.indexOf(url) === 0)

    if (!tab)
      return console.error('Could not find tab in chrome') // eslint-disable-line

    wsUrl = tab.webSocketDebuggerUrl
    fs.writeFileSync(chromePortPath, String(chromePort))
    fs.writeFileSync(wsUrlPath, wsUrl)
    await connect()
  }

  async function connect() {
    errored = null
    socket = new WS(wsUrl)
    socket.onopen = onopen
    socket.onmessage = onmessage
    socket.onerror = onerror
    socket.onclose = (x) => !errored && setTimeout(connect, 100)
    return open || new Promise((resolve, reject) => open = { resolve, reject })
  }


  function onerror(x) {
    errored = x
    console.log(x.message)
    if (opened) {
      console.log('Chrome closed')
      chrome && chrome.kill()
      process.exit(0)
    } else {
      opened && console.error('Unknown Chrome WS Error:', x.message)
      launched && open.reject(x)
      fsp.unlink(wsUrlPath).catch(() => {})
      fsp.unlink(scriptsPath).catch(() => {})
      !chrome && spawn()
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
    launched = true
    console.log('Connected to Chrome') // eslint-disable-line
    await send('Runtime.enable')
    await send('Runtime.evaluate', { expression: hmr })
    await send('Debugger.enable')
    await send('Network.enable')
    await send('Network.setCacheDisabled', { cacheDisabled: true })
    await send('Page.enable')
    await send('Page.addScriptToEvaluateOnLoad', { scriptSource: hmr })
  }

  function onmessage({ data }) {
    opened = true
    const { id, method, params, error, result } = JSON.parse(data)
    if (method === 'Debugger.scriptParsed' && params.url)
      return scriptParsed(params)

    if (method === 'Page.navigatedWithinDocument' && params.url.indexOf(url) === 0)
      return fs.writeFileSync(urlPath, params.url)

    if (!requests.has(id))
      return

    const { reject, resolve } = requests.get(id)
    requests.delete(id)

    error
      ? reject(error)
      : resolve(result)
  }

}

async function getTabs(url, retries = 0) {
  try {
    return await s.http(url + 'list/')
  } catch (err) {
    if (retries > 5)
      throw err

    await new Promise(r => setTimeout(r, 500))
    return getTabs(url, ++retries)
  }
}

async function getPort() {
  return new Promise(resolve => {
    const server = net.createServer().listen(0, () => {
      const x = server.address().port
      server.close(() => resolve(x))
    })
  })
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
