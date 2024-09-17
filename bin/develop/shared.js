import url from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import fsp from 'node:fs/promises'

import config from './config.js'
import rewriter from './rewriter.js'
import { isScript, extensionless, modify, canRead } from '../shared.js'

const resolveCache = Object.create(null)
const pkgJsonCache = Object.create(null)

export async function tryRead(x) {
  return fsp.readFile(x, 'utf8')
    .catch(async() => (await new Promise(r => setTimeout(r, 10)), fsp.readFile(x, 'utf8')))
    .catch(async() => (await new Promise(r => setTimeout(r, 20)), fsp.readFile(x, 'utf8')))
}

export function isModule(x) {
  const c = x.charCodeAt(0)
  return c === 64              // @
      || c === 35              // #
      || (c >= 48 && c <= 57)  // 0-9
      || (c >= 65 && c <= 90)  // A-Z
      || (c >= 97 && c <= 122) // a-z
}

export function rewrite(x, file) {
  const dir = path.dirname(file)
  if (file.endsWith('/sin/src/view.js'))
    x = x.replace('// dev-stack', `hasOwn.call(window, stackTrace) && (this[stackTrace] = new Error().stack)`)
  if (file.endsWith('/sin/src/index.js'))
    x = x.replace('// dev-stack', `hasOwn.call(view, stackTrace) && (dom[stackTrace] = view[stackTrace])`)

  return config.unsafe + rewriter(
    modify(x, file, config),
    x => {
      x = tryImportMap(x, file) || x
      isModule(x) || isScript(x) || (x = extensionless(x, dir) || x)
      const entry = isModule(x) && resolveEntry(x)
      return entry
        ? '/' + entry
        : x
    }
  )
}

function tryImportMap(x, file) {
  const xs = file.split(path.sep)
  const nmi = xs.lastIndexOf('node_modules')
  const modulePath = nmi !== -1 && xs.slice(0, nmi + (xs[nmi + 1][0] === '@' ? 3 : 2))
  const pkg = modulePath && readPkgJson(path.join(modulePath.join(path.sep), 'package.json'))
  const importPath = pkg && pkg.imports && firstString(pkg.imports, x, 'default')
  return importPath && ('/' + modulePath.slice(nmi).join('/') + '/' + removeRelativePrefix(importPath))
}

function readPkgJson(x) {
  try {
    return pkgJsonCache[x] || (pkgJsonCache[x] = JSON.parse(fs.readFileSync(x)))
  } catch(error) {
    config.debug && console.error('Could not read package.json', error)
    return null
  }
}

export function resolveEntry(n, force = false) {
  if (force + n in resolveCache)
    return resolveCache[force + n]

  let [x, scope = '', name, query = '', version, rest = ''] = n.match(/(?:(@[^/@]+)\/)?([^/?]+)(\?[^/]+)?(?:@([0-9]+\.[0-9]+\.[0-9]+[^/]*))?(\/.+)?/)

  const urlPath = 'node_modules/' + (scope ? scope + '/' : '') + name
  const modulePath = path.join(config.cwd, 'node_modules', scope, name)
  const fullPath = path.join(modulePath, ...rest.split('/'))
  const pkgPath = path.join(modulePath, 'package.json')
  const entry = canRead(fullPath)
    ? urlPath + rest
    : pkgLookup(scope, name, version, rest, pkgPath, urlPath, force)

  return entry && (resolveCache[force + n] = entry + query)
}

function removeRelativePrefix(x) {
  return x.replace(/^\.\//, '')
}

function pkgLookup(scope, name, version, rest, pkgPath, urlPath, force) {
  if (!force && config.bundleNodeModules && name !== 'sin') // never bundle sin
    return urlPath

  const pkg = readPkgJson(pkgPath) || (name === 'sin' && readPkgJson(path.join(config.local, 'package.json')))

  if (!pkg)
    return

  const entry = resolveExports(pkg, '.' + rest) || resolveLegacy(pkg)

  if (!entry)
    return urlPath

  return urlPath + '/' + removeRelativePrefix(entry)
}

function resolveExports(x, subPath) {
  return firstString(x, 'exports', subPath, 'browser', 'import')
      || firstString(x, 'exports', subPath, 'import')
}

function resolveLegacy(pkg) {
  return pkg.browser
    ? typeof pkg.browser === 'string'
      ? pkg.browser.includes('umd.')
        ? pkg.module || pkg.main
        : pkg.browser
      : pkg.browser[pkg.module || pkg.main]
    : pkg.module || pkg.main
}

function firstString(x, ...props) {
  for (const prop of props) {
    const type = typeof x[prop]
    if (type === 'object')
      x = x[prop]
    else if (type === 'string')
      return x[prop]
  }
}

export function transform(buffer, filePath, type, r) {
  r.headers.accept === '*/*' && r.set('Content-Type', 'text/javascript')
  return isScript(filePath)
    ? rewrite(Buffer.from(buffer).toString(), filePath)
    : buffer
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
