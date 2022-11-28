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

export default async function(home, port, scriptParsed) {
  let open
  const chromePort = await getPort()
  const chromeUrl = `http://127.0.0.1:${ chromePort }/json/`
  const url = 'http://localhost:' + port
  const urlPath = path.join(home, '.url')
  const lastUrl = await fsp.readFile(urlPath, 'utf8').catch(() => null)

  const chrome = cp.spawn(getPath(), [
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
  ])

  process.on('uncaughtExceptionMonitor', () => chrome.kill())
  chrome.on('exit', () => process.exit(0))

  const tabs = await getTabs(chromeUrl)
  const tab = tabs.find(t => t.url.indexOf('http://localhost:' + port) === 0)

  if (!tab)
    return console.error('Could not find tab in chrome') // eslint-disable-line

  let socket
  connect()

  return send

  function connect() {
    socket = new WS(tab.webSocketDebuggerUrl)
    socket.onopen = onopen
    socket.onmessage = onmessage
    socket.onerror = x => open && x.message.trim().endsWith('500')
      ? (console.log('Chrome closed'), chrome.kill(), process.exit(0)) // eslint-disable-line
      : console.error('Unknown Chrome WS Error:', x.message) // eslint-disable-line
    socket.onclose = () => setTimeout(connect, 100)
  }

  async function onopen() {
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
    open = true
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
      const port = server.address().port
      server.close(() => resolve(port))
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
