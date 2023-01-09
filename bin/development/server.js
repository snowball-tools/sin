/* eslint no-console:0 */

import path from 'path'
import fs from 'fs'
import fsp from 'fs/promises'
import Url from 'url'

import ey from 'ey'
import prexit from 'prexit'
import Watcher from '../watcher.js'
import uaParser from 'ua-parser-js'

import ssr, { wrap } from '../../ssr/index.js'

import s from '../style.js'
import serverWatch from './watch.js'
import editor from './editor.js'
import live from './live.js'

let chrome

process.env.NODE_ENV = 'development'

const env = process.env
    , cwd = process.cwd()
    , argv = process.argv.slice(2)
    , command = (argv[0] && !argv[0].endsWith('.js') ? argv[0] : '').toLowerCase()
    , home = env.SIN_HOME || path.join(env.HOMEPATH || env.HOME || '', '.sin')
    , port = env.PORT ? parseInt(env.PORT) : devPort()
    , url = 'http://localhost:' + port
    , { mount, entry } = await getMount()
    , name = port + '-' + path.basename(cwd) // + '-' + (entry === 'index.js' ? '' : entry)
    , chromeHome = path.join(home, name)
    , staticImport = new RegExp('((?:^|[^@])(?:import|export)\\s*[{}0-9a-zA-Z*,\\s]*\\s*(?: from |)[\'"])([a-zA-Z1-9@][a-zA-Z0-9@/._-]*)([\'"])', 'g') // eslint-disable-line
    , dynamicImport = new RegExp('([^$.]import\\(\\s?[\'"])([a-zA-Z1-9@][a-zA-Z0-9@\\/._-]*)([\'"]\\s?\\))', 'g')
    , staticImportDir = new RegExp('((?:^|[^@])(?:import|export)\\s*[{}0-9a-zA-Z*,\\s]*\\s*(?: from |)[\'"])((?:\\.\\/|\\.\\.\\/|\\/)+?[a-zA-Z1-9@][a-zA-Z0-9@./_-]*?(?<!\\.[tj]s))([\'"])', 'g') // eslint-disable-line
    , dynamicImportDir = new RegExp('([^$.]import\\(\\s?[\'"])((?:\\.\\/|\\.\\.\\/|\\/)+?[a-zA-Z1-9@][a-zA-Z0-9@\\/._-]*?(?<!\\.[tj]s))([\'"]\\s?\\))', 'g')
    , resolveCache = Object.create(null)
    , watcher = await Watcher(changed)
    , scriptsPath = path.join(chromeHome, '.sin-scripts')
    , scripts = (await fsp.readFile(scriptsPath, 'utf8').then(x => JSON.parse(x)).catch(() => {}) || {})
    , seen = {}
    , originals = {}
    , sockets = new Set()
    , sinRoot = path.join(Url.fileURLToPath(new URL('.', import.meta.url)), '..', '..')


if (command === 'reset') {
  const xs = argv[1] === 'all'
    ? fs.readdirSync(home).filter(x => fs.statSync(path.join(home, x)).isDirectory())
    : [name]

  for (const x of xs) {
    process.stdout.write('Clear ' + x + ' ' + s.gray('(' + path.join(home, x) + ')') + ' ... ')
    await fsp.rm(path.join(home, x), { recursive: true, force: true }).catch(() => {})
    console.log('done')
  }
  process.exit(0)
}

Object.values(scripts).forEach(watchAdd)

fs.mkdirSync(home, { recursive: true })

const app = ey()

app.ws('/sindev', {
  upgrade: res => {
    const ua = uaParser(res.headers['user-agent'])
    return {
      name: ua.browser.name.replace(/^Mobile /, '') + ' v' + ua.browser.version.split('.')[0] + ' on ' +
            ua.os.name.replace(/ +/g, '') + ' v' + ua.os.version.split('.').slice(0, 2).join('.') +
            ' from ' + res.ip
    }
  }
}, async ws => {
  sockets.add(ws)
  ws.subscribe('update')

  seen[ws.name] || setTimeout(() => console.log(seen[ws.name] = ws.name, 'connected'), 500)
  for await (const { json } of ws) {
    if (!json)
      return
    const { file, line, column } = json
    editor({
      path: fs.existsSync(file) ? file : path.join(cwd, file),
      line,
      column
    })
  }
  sockets.delete(ws)
})

await loadServer()

app.get(
  r => {
    // Don't serve _ (server) folder or hidden paths
    if (r.url.charCodeAt(1) === 46 || r.url.indexOf('/.') !== -1) // _
      return r.end(403)
  },
  async r => {
    if ((r.headers.accept || '').indexOf('text/html') !== 0 || path.extname(r.url))
      return

    const x = await ssr(
      mount,
      {},
      { location: 'http://' + (r.headers.host || url) + r.url }
    )

    r.end(wrap(x, {
      head: '<script type=module src="/node_modules/sin/bin/development/browser.js"></script>',
      body: command === 'ssr' ? '' : '<script type=module async defer src="/' + entry + '"></script>'
    }), x.status || 200, x.headers)
  },
  app.files('+public', {
    compressions: false,
    cache: false
  }),
  app.files({
    compressions: false,
    cache: false,
    transform
  })
)

app.get('/node_modules/sin', app.files(sinRoot, {
  compressions: false,
  cache: false,
  transform
}))

async function changed(x) {
  const file = scripts[x]
      , source = await fsp.readFile(x, 'utf8')
      , changed = source !== file.original

  app.publish('update', 'reload')
  file.original = source
  file.source = modify(source)

  changed && file.scriptId
    ? setSource(file).then(() => app.publish('update', 'redraw'), console.error)
    : app.publish('update', 'forceReload')
  changed && saveScripts(x)
}

chrome = command !== 'server' && await startChrome()

async function startChrome() {
  return (await import('./chrome.js')).default(chromeHome, url, async x => {
    if (x.url.indexOf(url) !== 0)
      return

    const filePath = extensionless(path.join(cwd, new URL(x.url).pathname))

    if (scripts[filePath]) {
      scripts[filePath].scriptId = x.scriptId
    } else {
      const original = await fsp.readFile(filePath, 'utf8').catch(() => null)
      if (original === null)
        return

      watch({
        path: filePath,
        original,
        source: modify(original),
        scriptId: x.scriptId
      })
    }
    saveScripts()
  })
}

await app.listen(port)
console.log('Listening on', port)

argv.includes('live') && live(chromeHome, port)

prexit(async(...xs) => {
  process.exitCode !== 123 && await chrome.send('Browser.close')
  app.unlisten()
  sockets.forEach(x => x.close())
})

function extensionless(x) {
  x.indexOf('file:') === 0 && (x = x.slice(5))
  return path.extname(x) ? x
    : canRead(path.join(x, 'index.js')) ? x + '/index.js'
    : canRead(x + '.js') ? x + '.js'
    : x
}

function canRead(x) {
  try {
    return fs.statSync(x).isFile()
  } catch (_) {
    return
  }
}

async function setSource(x) {
  await chrome.send('Debugger.setScriptSource', {
    scriptId: x.scriptId,
    scriptSource: x.source
  }).catch(console.error)
}

function transform(x, path) {
  if (!path.endsWith('.js'))
    return x

  const original = originals[path] = Buffer.from(x).toString()
  const file = { original, source: modify(original), path }
  watch(file)
  return file.source
}

function watch(x) {
  if (scripts[x.path])
    return

  scripts[x.path] = x
  watchAdd(x)
}

function watchAdd(x) {
  global.sinLoadedFiles.remove(x.path)
  watcher.add(x.path)
}

function saveScripts() {
  try {
    fs.writeFileSync(scriptsPath, JSON.stringify(scripts))
  } catch (x) {
    return x
  }
}

function modify(x) {
  return x
    .replace(staticImport, (_, a, b, c) => a + '/' + resolve(b) + c)
    .replace(dynamicImport, (_, a, b, c) => a + '/' + resolve(b) + c)
    .replace(staticImportDir, (_, a, b, c) => a + extensionless(b) + c)
    .replace(dynamicImportDir, (_, a, b, c) => a + extensionless(b) + c)
    .replace(/((function.*?\)|=>)\s*{)/g, '$1eval(0);') // jail
}

async function loadServer() {
  try {
    const serverPath = path.join(cwd, '+', 'index.js')
    if (!fs.existsSync(serverPath))
      return

    await serverWatch(scripts)
    const x = await import(serverPath)
    typeof x.default === 'function' && x.default(app)
  } catch (e) {
    console.error(e)
  }
}

function resolve(n) {
  if (n in resolveCache)
    return resolveCache[n]

  const parts = n.split('/')
      , scoped = n[0] === '@'
      , install = parts.slice(0, scoped ? 2 : 1).join('/')
      , name = install.replace(/(.+)@.*/, '$1')
      , root = path.join('node_modules', ...name.split('/'))
      , fullPath = path.join(root, ...parts.slice(scoped ? 2 : 1))

  return resolveCache[n] = (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()
    ? fullPath
    : fs.existsSync(path.join(fullPath, 'package.json'))
    ? pkgLookup(fullPath)
    : name === 'sin'
    ? pkgLookup(fullPath, sinRoot)
    : n
  )
}

function pkgLookup(root, abs = root) {
  const x = JSON.parse(fs.readFileSync(path.join(abs, 'package.json'), 'utf8'))
  return root + '/' + (x.module || x.unpkg || x.main || 'index.js')
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

async function getMount() {
  const specifiesIndex = argv.find((x, i, xs) => x[0] !== '-' && x.endsWith('.js'))
      , entry = specifiesIndex || 'index.js'
      , absEntry = path.isAbsolute(entry) ? entry : path.join(cwd, entry)
      , hasEntry = (await fsp.readFile(absEntry, 'utf8').catch(specifiesIndex ? undefined : (() => ''))).indexOf('export default ') !== -1

  return hasEntry
    ? { entry, mount: (await import(absEntry)).default }
    : { entry }
}
