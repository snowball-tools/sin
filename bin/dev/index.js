/* eslint no-console:0 */

import path from 'path'
import fs from 'fs'
import fsp from 'fs/promises'

import './log.js'
import uWebSockets from 'uWebSockets.js'
import chokidar from 'chokidar'
import ustatic from 'ustatic'

import sin from '../../ssr/uws.js'
import editor from './editor.js'

let chrome

process.env.NODE_ENV = 'development'

const env = process.env
    , cwd = process.cwd()
    , entry = process.argv[3] || 'index.js'
    , home = env.SIN_HOME || path.join(env.HOMEPATH || env.HOME || '', '.sin')
    , port = env.PORT || devPort()
    , chromeHome = path.join(home, port + '-' + path.basename(cwd))
    , staticImportRegex = new RegExp('((?:^|[^@])(?:import|export)\\s*[{}0-9a-zA-Z*,\\s]*\\s*(?: from |)[\'"])([a-zA-Z1-9@][a-zA-Z0-9@/._-]*)([\'"])', 'g') // eslint-disable-line
    , dynamicImportRegex = new RegExp('([^$.]import\\(\\s?[\'"])([a-zA-Z1-9@][a-zA-Z0-9@\\/._-]*)([\'"]\\s?\\))', 'g')
    , resolveCache = Object.create(null)
    , absEntry = path.isAbsolute(entry) ? entry : path.join(cwd, entry)
    , hasEntry = fs.readFileSync(absEntry, 'utf8').indexOf('export default ') !== -1
    , mount = hasEntry ? (await import(absEntry)).default : {}
    , watcher = chokidar.watch([], { persisten: true })
    , files = new Map()

fs.mkdirSync(home, { recursive: true })

const app = uWebSockets.App()

const assets = ustatic('', {
  compressions: false,
  cache: false,
  index: ssr,
  notFound: ssr,
  transform
})

app.ws('/sindev', {
  open: ws => ws.subscribe('update'),
  message: (ws, x, binary) => {
    if (binary)
      return

    const buffer = Buffer.from(x).toString()
    try {
      const { file, line, column } = JSON.parse(buffer)
      editor({
        path: fs.existsSync(file) ? file : path.join(cwd, file),
        line,
        column
      })
    } catch (e) {
      console.error('Not JSON', e, buffer)
    }
  }
})

await loadServer()

app.get('/*', async(res, req) => {
  const url = req.getUrl()

  // Don't serve _ (server) folder or hidden paths
  if (url.charCodeAt(1) === 46 || url.indexOf('/.') !== -1) // _
    return end(res, '403 Forbidden')

  assets(res, req)
})

watcher.on('change', async(x) => {
  const file = files.get(x)
      , bytes = await fsp.readFile(x)
      , changed = Buffer.compare(bytes, file.original) !== 0

  app.publish('update', 'reload')
  file.original = bytes
  file.bytes = modify(bytes)

  changed && file.scriptId
    ? setSource(file).then(() => app.publish('update', 'redraw'), console.error)
    : app.publish('update', 'forceReload')

})

app.listen(port, async() => {
  console.log('Listening on', port)
  chrome = await (await import('./chrome.js')).default(chromeHome, port, async x => {
    const filePath = extensionless(path.join(cwd, new URL(x.url).pathname))

    if (files.has(filePath))
      return files.get(filePath).scriptId = x.scriptId

    const original = await fsp.readFile(filePath)
    watch({
      path: filePath,
      original,
      bytes: modify(original),
      scriptId: x.scriptId,
      type: 'text/javascript'
    })
  })
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
  await chrome('Debugger.setScriptSource', {
    scriptId: x.scriptId,
    scriptSource: x.bytes
  }).catch(console.error)
}

function end(res, status, x) {
  res.cork(() => {
    res.writeStatus(status)
    res.end(arguments.length === 1 ? status : x)
  })
}

async function transform(x) {
  x.original = Buffer.from(x.bytes)
  x.type === 'text/javascript' && (x.bytes = modify(x.original))
  watch(x)
}

function watch(x) {
  if (files.has(x.path))
    return

  files.set(x.path, x)
  watcher.add(x.path)
}


function modify(x) {
  return x.toString()
    .replace(staticImportRegex, (_, a, b, c) => a + '/' + resolve(b) + c)
    .replace(dynamicImportRegex, (_, a, b, c) => a + '/' + resolve(b) + c)
    .replace(/((function.*?\)|=>)\s*{)/g, '$1eval(0);') // jail
}

async function loadServer() {
  try {
    const serverPath = path.join(cwd, '+', 'index.js')
    if (!fs.existsSync(serverPath))
      return

    const x = await import(serverPath)
    typeof x.default === 'function' && x.default(app)
  } catch (e) {
    console.error(e)
  }
}

function ssr(res, req, next) {
  if (res.accept.indexOf('text/html') !== 0)
    return next(res, req)

  sin(mount, {}, { location: res.url }, {
    head: '<script type=module src="/node_modules/sin/bin/dev/browser.js"></script>',
    body: '<script type=module async defer src="/' + entry + '"></script>',
    res
  })
  return true
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
    : n
  )
}

function pkgLookup(root) {
  const x = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
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
