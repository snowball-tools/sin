import url from 'url'
import path from 'path'
import fs from 'fs'
import net from 'net'
import fsp from 'fs/promises'

export async function reservePort() {
  return new Promise(resolve => {
    const server = net.createServer().listen(0, () => {
      const x = server.address().port
      server.close(() => resolve(x))
    })
  })
}

export async function tryRead(x) {
  return fsp.readFile(x, 'utf8')
    .catch(async() => (await new Promise(r => setTimeout(r, 10)), fsp.readFile(x, 'utf8')))
    .catch(async() => (await new Promise(r => setTimeout(r, 20)), fsp.readFile(x, 'utf8')))
}

export function jail(x) {
  return x.replace(/((function.*?\)|=>)\s*{)/g, '$1eval(0);')
}

const staticImport = /(?:`[^`]*`)|((?:import|export)\s*[{}0-9a-zA-Z*,\s]*\s*(?: from )?\s*['"])([a-zA-Z1-9@][a-zA-Z0-9@/._-]*)(['"])/g // eslint-disable
    , dynamicImport = /(?:`[^`]*`)|([^$.]import\(\s?['"])([a-zA-Z1-9@][a-zA-Z0-9@/._-]*)(['"]\s?\))/g
    , staticImportDir = /(?:`[^`]*`)|((?:import|export)\s*[{}0-9a-zA-Z*,\s]*\s*(?: from )?\s*['"])((?:\.\/|\.\.\/|\/)+?[a-zA-Z0-9@./_-]+?(?<!\.[tj]s))(['"])/g // eslint-disable
    , dynamicImportDir = /(?:`[^`]*`)|([^$.]import\(\s?['"])((?:\.\/|\.\.\/|\/)+?[a-zA-Z0-9@/._-]+?(?<!\.[tj]s))(['"]\s?\))/g
    , resolveCache = Object.create(null)

export function modify(x, path) {
  return jail(
    x.replace(staticImport, (_, a, b, c) => a ? a + '/' + resolve(b) + c : _)
     .replace(dynamicImport, (_, a, b, c) => a ? a + '/' + resolve(b) + c : _)
     .replace(staticImportDir, (_, a, b, c) => a ? a + extensionless(b, path) + c : _)
     .replace(dynamicImportDir, (_, a, b, c) => a ? a + extensionless(b, path) + c : _)
  )
}

function resolve(n) {
  if (n in resolveCache)
    return resolveCache[n]

  const parts = n.split('/')
      , scoped = n[0] === '@'
      , install = parts.slice(0, scoped ? 2 : 1).join('/')
      , name = install.replace(/(.+)@.*/, '$1')
      , root = 'node_modules/' + name
      , full = [root, ...parts.slice(scoped ? 2 : 1)].join('/')
      , fullPath = url.pathToFileURL(path.join(process.cwd(), full))

  return resolveCache[n] = (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()
    ? full
    : fs.existsSync(path.join(process.cwd(), full, 'package.json'))
    ? pkgLookup(full)
    : name.toLowerCase() === 'sin'
    ? pkgLookup(full, process.env.SIN_LOCAL)
    : n
  )
}

export function extensionless(x, root = '') {
  x.indexOf('file:') === 0 && (x = x.slice(5))
  root = path.isAbsolute(x) ? process.cwd() : path.basename(root)
  return path.extname(x) ? x
    : canRead(path.join(root, x, 'index.js')) ? x + '/index.js'
    : canRead(path.join(root, x + '.js')) ? x + '.js'
    : x
}

function canRead(x) {
  try {
    return fs.statSync(x).isFile()
  } catch (_) {
    return
  }
}

export function transform(buffer, filePath) {
  return filePath.endsWith('.js')
    ? modify(Buffer.from(buffer).toString(), path.dirname(filePath))
    : buffer
}

function pkgLookup(x, abs = x) {
  const pkg = JSON.parse(fs.readFileSync(path.join(abs, 'package.json'), 'utf8'))
  return x + '/' + (pkg.module || pkg.unpkg || pkg.main || 'index.js').replace(/^\.\//, '')
}

export function Watcher(fn) {
  const start = Date.now()
  const watched = new Map()

  return {
    add,
    remove
  }

  function add(x) {
    if (watched.has(x))
      return

    try {
      const watcher = fs.watch(x, { persistent: false }, t => {
        t === 'rename'
          ? readd(x, watcher)
          : changed(x, watcher)
      })
      watched.set(x, watcher)
      return watcher
    } catch (e) {
      // noop - watch is best effort
    }
  }

  function readd(x, watcher) {
    const time = watcher.time
    remove(x)
    setTimeout(() => {
      const watcher = add(x)
      if (watcher) {
        watcher.time = time
        changed(x, watcher)
      }
    }, 20)
  }

  function remove(x) {
    if (!watched.has(x))
      return x
    const watcher = watched.get(x)
    watcher.close()
    watched.delete(x)
    return x
  }

  function changed(x, watcher, t) {
    const time = modified(x)
    if ((watcher.time && time - watcher.time < 5) || start > time)
      return

    watcher.time = time
    setTimeout(fn, 0, x)
  }

  function modified(x) {
    try {
      return fs.statSync(x).mtimeMs
    } catch (error) {
      return Math.random()
    }
  }
}
