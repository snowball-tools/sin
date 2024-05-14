import path from 'node:path'
import fs from 'node:fs'

export function isScript(x) {
  return /\.[mc]?[jt]sx?$/i.test(x)
}

export function extensionless(x, root = '') {
  x.indexOf('file:') === 0 && (x = x.slice(5))
  root = path.isAbsolute(x) ? process.cwd() : root
  return isScript(x)                           ? x
    : canRead(path.join(root, x, 'index.js'))  ? x + '/index.js'
    : canRead(path.join(root, x + '.js'))      ? x + '.js'
    : canRead(path.join(root, x, 'index.tsx')) ? x + '/index.tsx'
    : canRead(path.join(root, x + '.tsx'))     ? x + '.tsx'
    : canRead(path.join(root, x, 'index.ts'))  ? x + '/index.ts'
    : canRead(path.join(root, x + '.ts'))      ? x + '.ts'
    : x
}

function canRead(x) {
  try {
    return fs.statSync(x).isFile()
  } catch (_) {
    return
  }
}
