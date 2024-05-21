import path from 'node:path'
import fs from 'node:fs'
import URL from 'node:url'
import esbuild from 'esbuild'

import config from './config.js'

const sucrase = await import('sucrase').catch(e => null)

export function isScript(x) {
  return /\.[mc]?[jt]sx?$/i.test(x)
}

export function extensionless(x, root = '') {
  x.indexOf('file:') === 0 && (x = x.slice(7))
  root = path.isAbsolute(x) ? config.cwd : root
  x.indexOf(root) === 0 && (root = '')
  return isScript(x)                           ? x
    : canRead(path.join(root, x, 'index.js'))  ? x + '/index.js'
    : canRead(path.join(root, x + '.js'))      ? x + '.js'
    : canRead(path.join(root, x, 'index.jsx')) ? x + '/index.jsx'
    : canRead(path.join(root, x + '.jsx'))     ? x + '.jsx'
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
