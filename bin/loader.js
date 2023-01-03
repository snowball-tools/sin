import path from 'path'
import fs from 'fs'

global.sinLoadedFiles = new Set()

const cwd = process.cwd()

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('/') && specifier.indexOf(process.cwd()) !== 0) {
    specifier = extensionless(path.join(process.cwd(), specifier))
  } else if (specifier.startsWith('./') || specifier.startsWith('../')) {
    specifier = extensionless(path.join(path.dirname(context.parentURL), specifier))
  }

  if (specifier.startsWith('/') || specifier.startsWith('./'))
    specifier.indexOf(cwd) === 0 && global.sinLoadedFiles.add(specifier)

  return nextResolve(specifier, context)
}

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
