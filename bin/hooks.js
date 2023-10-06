import path from 'path'
import fs from 'fs'
import url from 'url'

const cwd = process.cwd()
let watch
let dev

export async function initialize(x) {
  dev = x
  if (dev) {
    watch = new Set()
    dev.on('message', () => dev.postMessage(watch))
  }
}

export async function resolve(specifier, context, nextResolve) {
  if (path.isAbsolute(specifier) && !specifier.startsWith(cwd))
    specifier = url.pathToFileURL(path.join(cwd, specifier)).href

  const x = specifier.startsWith('./') || specifier.startsWith('../')
    ? path.join(path.dirname(url.fileURLToPath(context.parentURL)), specifier)
    : specifier.startsWith('file://')
    ? url.fileURLToPath(specifier)
    : null

  if (x) {
    const result = await nextResolve(extensionless(specifier, x), context)
    dev && x.indexOf(cwd) === 0 && (watch.add(url.fileURLToPath(result.url)), dev.postMessage(watch))
    return result
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
