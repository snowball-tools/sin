/* eslint no-console: 0 */

// https://chromedevtools.github.io/devtools-protocol/

import fs from 'node:fs'
import path from 'node:path'
import util from 'node:util'
import cp from 'node:child_process'

import prexit from '../prexit.js'
import config from './config.js'
import api from './api.js'
import { rewrite } from './shared.js'

import s from '../../src/index.js'

if (!config.chromePath || !fs.existsSync(config.chromePath))
  throw new Error('Could not find a Chrome installation. Install Chrome or set a valid path using CHROME_PATH=')

const root = 'http://127.0.0.1:' + config.chromePort
    , hmr = 'if(window.self === window.top)window.hmr=1;'
    , replace = Math.random()

api.log({ replace, from: 'browser', type: 'status', value: '⏳' })
ensurePrefs()

const tabs = new Map()
const noop = () => { }

const chrome = await spawn()
await updateTabs(true)

prexit(async() => {
  let ok
  try {
    for (const x of tabs.values()) {
      if (x.ws) {
        ok = await x.ws.request('Browser.close')
        break
      }
    }
  } finally {
    ok || chrome.kill()
  }
})

api.browser.hotload.observe(hotload)
api.log({ replace, from: 'browser', type: 'status', value: '🚀' })

async function hotload(x) {
  await Promise.all([...tabs].map(async([_, { ws }]) => {
    if (ws && ws.scripts.has(x.path)) {
      let scriptSource = ''
      try {
        scriptSource = rewrite(x.next, x.path)
      } catch (e) {
        return api.log({
          from: 'browser transform',
          type: 'error',
          args: [e.message]
        })
      }

      try {
        const r = await ws.request('Debugger.setScriptSource', {
          scriptId: ws.scripts.get(x.path),
          scriptSource,
          allowTopFrameEditing: true
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
        ws.request('Page.reload').catch(noop)
      }
    } else if (ws && ws.sheets.has(x.path)) {
      ws.request('CSS.setStyleSheetText', { styleSheetId: ws.sheets.get(x.path), text: x.next })
    } else if (ws) {
      ws.request('Page.reload').catch(noop)
    }
  }))
  api.browser.redraw()
}

async function updateTabs(launch) {
  const xs = await getTabs(config.origin)
  await Promise.all(
    xs.map(async x => {
      if (launch && (x.url === 'about:blank' || x.url === 'chrome://newtab/'))
        s.http(root + '/json/close/' + x.id, { responseType: 'text' })
      else if (x.url.indexOf(config.origin) === 0) {
        launch && tabs.size === 0 && s.http(root + '/json/activate/' + x.id, { responseType: 'text' }).catch(noop)
        await connect(x)
      }
    })
  )

  if (launch && tabs.size === 0) {
    const x = await s.http.put(root + '/json/new?' + api.url())
    await connect(x)
  }
}

async function connect(tab) {
  if (tabs.has(tab.webSocketDebuggerUrl))
    return

  tabs.set(tab.webSocketDebuggerUrl, tab)
  let id = 1

  const ws = new WebSocket(tab.webSocketDebuggerUrl)
  const requests = new Map()

  tab.ws = ws

  ws.scripts = new Map()
  ws.sheets = new Map()
  ws.onmessage = onmessage
  ws.onerror = noop
  ws.onclose = () => closed(tab)
  ws.request = request

  return new Promise(r => ws.onopen = () => (r(), onopen()))

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
    await request('Debugger.enable').catch(e => api.log({ from: 'browser', type: 'chrome error', args: String(e) }))
    await request('Debugger.setBlackboxPatterns', { patterns: api.blackbox })
    await request('Network.enable')
    await request('Target.setDiscoverTargets', { discover: true })
    await request('Network.setCacheDisabled', { cacheDisabled: true })
    await request('Log.enable')
    await request('Page.enable')
    await request('DOM.enable')
    await request('CSS.enable')
    await request('Page.addScriptToEvaluateOnLoad', { scriptSource: hmr })
  }

  function onmessage({ data }) {
    const { id, method, params, error, result } = JSON.parse(data)
    if (method === 'Debugger.scriptParsed' && params.url)
      return parsed(params)

    if (method === 'CSS.styleSheetAdded')
      return css(params.header)

    if (method === 'Page.navigatedWithinDocument' && params.url.indexOf(config.origin) === 0)
      return api.url(params.url)

    if (method === 'Page.frameNavigated' && !params.frame.parentId && params.frame.url.indexOf(config.origin) === 0)
      return api.url(params.frame.url)

    if (method === 'Log.entryAdded')
      return api.log({ from: 'browser', type: params.entry.level, args: [{ type: 'string', value: params.entry.text }], stackTrace: { callFrames: [{ url: params.entry.url }] } })

    if (method === 'Runtime.consoleAPICalled')
      return api.log({ ws, replace: Math.random(), from: 'browser', ...params })

    if (method === 'Runtime.exceptionThrown')
      return api.log({ from: 'browser', type: 'exception', ...params.exceptionDetails })

    if (method === 'Target.targetCreated' || method === 'Target.targetInfoChanged')
      return updateTabs()

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

  function css(sheet) {
    if (!sheet.sourceURL)
      return

    const x = path.join(config.cwd, config.publicDir, new URL(sheet.sourceURL).pathname)
    if (sheet.sourceURL.indexOf(config.origin) !== 0 || !isFile(x))
      return

    const p = fs.realpathSync(path.isAbsolute(x) ? x : path.join(process.cwd(), x))
    ws.sheets.set(p, sheet.styleSheetId)
    api.browser.watch(p)
  }

}

async function closed(tab) {
  tabs.delete(tab.webSocketDebuggerUrl)
  if (tabs.size === 0 && (await getTabs(config.origin)).length === 0)
    prexit.exit()
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

async function spawn() {
  return new Promise((resolve, reject) => {
    const x = cp.spawn(config.chromePath, [
      ...(config.headless ? ['--headless'] : []),
      ...(config.devtools ? ['--auto-open-devtools-for-tabs'] : []),
      '--no-first-run',
      '--disable-features=PrivacySandboxSettings4',
      '--disable-search-engine-choice-screen',
      '--no-default-browser-check',
      '--disable-web-security',
      '--disable-translate',
      '--disable-features=TranslateUI',
      '--disable-features=Translate',
      '--restore-last-session',
      '--disable-infobars',
      '--test-type', // Remove warning banner from --disable-web-security usage
      '--user-data-dir=' + config.project,
      '--remote-debugging-port=' + config.chromePort,
      'about:blank'
    ], {
      detached: true
    })

    let opened
    x.stderr.setEncoding('utf8')
    x.stderr.on('data', () => resolve(x))
    x.stdout.setEncoding('utf8')
    x.stdout.on('data', () => {
      opened = true
      resolve(x)
    })

    x.on('close', () => opened || reject('closed'))
  })
}

function ensurePrefs() {
  const def = path.join(config.project, 'Default')
  const prefs = path.join(def, 'Preferences')

  if (fs.existsSync(prefs))
    return

  fs.mkdirSync(def, { recursive: true })

  fs.writeFileSync(prefs,
    JSON.stringify({
      privacy_sandbox: {
        anti_abuse_initialized: true,
        first_party_sets_data_access_allowed_initialized: true,
        m1: {
          ad_measurement_enabled: true,
          consent_decision_made: true,
          eea_notice_acknowledged: true,
          fledge_enabled: true,
          topics_enabled: false
        },
        topics_consent: {
          consent_given: false,
          last_update_reason: 1,
          last_update_time: Date.now() * 1000 - Date.UTC(1601, 0, 1) * 1000,
          text_at_last_update: 'Turn on an ad privacy feature We’re launching new privacy features that give you more choice over the ads that you see. Ad topics help sites show you relevant ads while protecting your browsing history and identity. Chrome can note topics of interest based on your recent browsing history. Later, a site that you visit can ask Chrome for relevant topics to personalise the ads that you see. You can see ad topics in settings and block the ones that you don’t want shared with sites. Chrome also auto-deletes ad topics that are older than four weeks. You can change your mind at any time in Chrome settings More about ad topics What data is used: Your ad topics are based on your recent browsing history – a list of sites that you’ve visited using Chrome on this device. How we use this data: Chrome notes topics of interest as you browse. Topic labels are predefined and include things like Arts and entertainment, Shopping and Sports. Later, a site that you visit can ask Chrome for a few of your topics (but not your browsing history) to personalise the ads that you see. How you can manage your data: Chrome auto-deletes topics that are older than four weeks. As you keep browsing, a topic might reappear on the list. You can also block topics that you don’t want Chrome to share with sites and turn ad topics off at any time in Chrome settings. Learn more about how Google protects your data in our privacy policy.'
        }
      }
    })
  )
}
