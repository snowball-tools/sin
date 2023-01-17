import path from 'path'
import fs from 'fs'
import url from 'url'

global.sinLoadedFiles = new Set()

const cwd = process.cwd()

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    const x = path.join(path.dirname(url.fileURLToPath(context.parentURL)), specifier)
    x.indexOf(cwd) === 0 && global.sinLoadedFiles.add(x)
    return nextResolve(extensionless(specifier, x), context)
  }

  if (specifier.startsWith('file://')) {
    const x = url.fileURLToPath(specifier)
    x.indexOf(cwd) === 0 && global.sinLoadedFiles.add(x)
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
