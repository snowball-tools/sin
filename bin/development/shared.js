import url from 'url'
import path from 'path'
import fs from 'fs'
import net from 'net'
import fsp from 'fs/promises'

import watch from './watch'

const cwd = process.cwd()

export async function getPort() {
  return new Promise(resolve => {
    const server = net.createServer().listen(0, () => {
      const x = server.address().port
      server.close(() => resolve(x))
    })
  })
}

export async function gracefulRead(x) {
  return fsp.readFile(x, "utf8")
    .catch(async() => (await new Promise(r => setTimeout(r, 10)), fsp.readFile(x, 'utf8')))
    .catch(async() => (await new Promise(r => setTimeout(r, 20)), fsp.readFile(x, 'utf8')))
}

const staticImport = /(?:`[^`]*`)|((?:import|export)\s*[{}0-9a-zA-Z*,\s]*\s*(?: from )?\s*['"])([a-zA-Z1-9@][a-zA-Z0-9@/._-]*)(['"])/g // eslint-disable
    , dynamicImport = /(?:`[^`]*`)|([^$.]import\(\s?['"])([a-zA-Z1-9@][a-zA-Z0-9@/._-]*)(['"]\s?\))/g
    , staticImportDir = /(?:`[^`]*`)|((?:import|export)\s*[{}0-9a-zA-Z*,\s]*\s*(?: from )?\s*['"])((?:\.\/|\.\.\/|\/)+?[a-zA-Z0-9@./_-]+?(?<!\.[tj]s))(['"])/g // eslint-disable
    , dynamicImportDir = /(?:`[^`]*`)|([^$.]import\(\s?['"])((?:\.\/|\.\.\/|\/)+?[a-zA-Z0-9@/._-]+?(?<!\.[tj]s))(['"]\s?\))/g
    , resolveCache = Object.create(null)

export function modify(x, path) {
  return x
    .replace(/((function.*?\)|=>)\s*{)/g, '$1eval(0);')
    .replace(staticImport, (_, a, b, c) => a ? a + '/' + resolve(b) + c : _)
    .replace(dynamicImport, (_, a, b, c) => a ? a + '/' + resolve(b) + c : _)
    .replace(staticImportDir, (_, a, b, c) => a ? a + extensionless(b, path) + c : _)
    .replace(dynamicImportDir, (_, a, b, c) => a ? a + extensionless(b, path) + c : _)
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
      , fullPath = url.pathToFileURL(path.join(cwd, full))

  return resolveCache[n] = (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()
    ? full
    : fs.existsSync(path.join(cwd, full, 'package.json'))
    ? pkgLookup(full)
    : name === 'sin'
    ? pkgLookup(full, sinRoot)
    : n
  )
}

function extensionless(x, root = '') {
  x.indexOf('file:') === 0 && (x = x.slice(5))
  root = path.isAbsolute(x) ? cwd : path.basename(root)
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
  if (!filePath.endsWith('.js'))
    return buffer

  const original = originals[filePath] = Buffer.from(buffer).toString()
  const file = { original, source: modify(original, path.dirname(filePath)), path: filePath }
  watch(file)
  return file.source
}

function pkgLookup(x, abs = x) {
  const pkg = JSON.parse(fs.readFileSync(path.join(abs, 'package.json'), 'utf8'))
  return x + '/' + (pkg.module || pkg.unpkg || pkg.main || 'index.js').replace(/^\.\//, '')
}
