import path from 'path'
import fs from 'fs'

export async function resolve(specifier, context, nextResolve) {
  if (specifier.charCodeAt(0) === 47 && specifier.indexOf(process.cwd()) !== 0) { // /
    specifier = extensionless(path.join(process.cwd(), specifier))
  } else if (specifier.charCodeAt(0) === 46 && specifier.charCodeAt(1) === 47) { // . /
    specifier = extensionless(path.join(path.dirname(context.parentURL), specifier))
  }
  return nextResolve(specifier)
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
