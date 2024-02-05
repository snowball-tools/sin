import path from 'path'
import fs from 'fs'
import URL from 'url'

import { jail } from './shared.js'

const cwd = process.cwd()

export async function resolve(specifier, context, nextResolve) {
  if (path.isAbsolute(specifier) && !specifier.startsWith(cwd))
    specifier = URL.pathToFileURL(path.join(cwd, specifier)).href

  const x = specifier.startsWith('./') || specifier.startsWith('../')
    ? path.join(path.dirname(URL.fileURLToPath(context.parentURL)), specifier)
    : specifier.startsWith('file://')
    ? URL.fileURLToPath(specifier)
    : null

  const result = x
    ? extensionless(specifier, x)
    : specifier

  return nextResolve(ts(result), context)
}

export async function load(url, context, nextLoad) {
  const result = url.endsWith('.ts')
    ? ({ format: 'module', shortCircuit: true, source: fs.readFileSync(url.startsWith('file://') ? URL.fileURLToPath(url) : url) })
    : await nextLoad(url, context)
  if (result.source && (context.format === 'commonjs' || context.format === 'module'))
    result.source = jail(result.source.toString())
  return result
}

function extensionless(x, full) {
  return path.extname(x) ? x
    : canRead(path.join(full, 'index.js')) ? x + '/index.js'
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

function ts(x) {
  return canRead(x.slice(0, -2) + 'ts') ? x.slice(0, -2) + 'ts' : x
}
