import path from 'path'
import fs from 'fs'
import url from 'url'

const loaded = new Set()

const cwd = process.cwd()

export async function resolve(specifier, context, nextResolve) {
  if (path.isAbsolute(specifier) && !specifier.startsWith(cwd))
    specifier = url.pathToFileURL(path.join(cwd, specifier)).href

  const x = specifier.startsWith('./') || specifier.startsWith('../')
    ? path.join(path.dirname(url.fileURLToPath(context.parentURL)), specifier)
    : specifier.startsWith('file://')
    ? url.fileURLToPath(specifier)
    : null

  if (x) {
    x.indexOf(cwd) === 0 && loaded.add(x)
    return nextResolve(extensionless(specifier, x), context)
  }

  return nextResolve(specifier, context)
}

function extensionless(x, full) {
  return path.extname(x) ? x
    : canRead(full) ? x + '/index.js'
    : canRead(full + '.js') ? x + '.js'
    : x
}

function canRead(x) {
  try {
    return fs.statSync(x).isFile()
  } catch (_) {
    return
  }
}

export function globalPreload({ port }) {
  port.onmessage = (evt) => port.postMessage(loaded)
  return 'globalThis.sinLoader = port'
}
