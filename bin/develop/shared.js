import url from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import fsp from 'node:fs/promises'

import esbuild from 'esbuild'

import { isScript, extensionless } from '../shared.js'
import config from './config.js'
import replace from './replace.js'

const sucrase = await import('sucrase').catch(e => null)
const resolveCache = Object.create(null)

export async function tryRead(x) {
  return fsp.readFile(x, 'utf8')
    .catch(async() => (await new Promise(r => setTimeout(r, 10)), fsp.readFile(x, 'utf8')))
    .catch(async() => (await new Promise(r => setTimeout(r, 20)), fsp.readFile(x, 'utf8')))
}

export function jail(x) {
  return ('' + x).replace(/((function.*?\)|=>)\s*{)/g, '$1eval(0);')
}

export function modify(x, file) {
  if (/\.tsx?$/.test(file)) {
    try {
      x = sucrase && !file.endsWith('.tsx')
        ? sucrase.transform(x, { transforms: ['typescript'] }).code
        : esbuild.transformSync(x, {
            jsx: 'transform',
            loader: file.endsWith('.tsx') ? 'tsx' : 'ts',
            logLevel: config.debug ? 'debug' : undefined,
            tsconfigRaw: config.tsconfigRaw
          }).code
    }
    catch (err) {
      console.error("[Sin] modify failed:", err)
      throw err
    }
  }

  return jail(x)
}

export function isModule(x) {
  const c = x.charCodeAt(0)
  return c === 64              // @
      || (c >= 48 && c <= 57)  // 0-9
      || (c >= 65 && c <= 90)  // A-Z
      || (c >= 97 && c <= 122) // a-z
}

export function rewrite(x, file) {
  const dir = path.dirname(file)
  return config.unsafe + replace(
    modify(x, file),
    x => {
      isModule(x) || isScript(x) || (x = extensionless(x, dir))
      return isModule(x)
        ? '/' + resolve(x)
        : x
    }
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

export function transform(buffer, filePath, type, r) {
  r.headers.accept === '*/*' && r.set('Content-Type', 'text/javascript')
  return isScript(filePath)
    ? rewrite(Buffer.from(buffer).toString(), filePath)
    : buffer
}

function pkgLookup(x, abs) {
  if (x !== 'node_modules/sin' && config.bundleNodeModules)
    return x

  const pkg = JSON.parse(fs.readFileSync(path.join(abs || x, 'package.json'), 'utf8'))
  const entry = pkg.exports?.['.']?.browser?.import || (pkg.browser
    ? typeof pkg.browser === 'string'
      ? pkg.browser.includes('umd.')
        ? pkg.module || pkg.main
        : pkg.browser
      : pkg.browser[pkg.module || pkg.main]
    : pkg.module || pkg.main
  )
  return x + '/' + entry.replace(/^\.\//, '')
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
