import path from 'node:path'
import fs from 'node:fs'
import URL from 'node:url'

import { extensionless } from './shared.js'

export function resolve(specifier, context, nextResolve) {
  if (path.isAbsolute(specifier) && !specifier.startsWith(process.cwd()))
    specifier = URL.pathToFileURL(path.join(process.cwd(), specifier)).href

  const x = specifier.startsWith('./') || specifier.startsWith('../')
    ? path.dirname(URL.fileURLToPath(context.parentURL))
    : specifier.startsWith('file://')
    ? path.dirname(URL.fileURLToPath(specifier))
    : null

  const result = x
    ? extensionless(specifier, x)
    : specifier

  return nextResolve(ts(result), context)
}

export function loader(fn) {
  return async function(url, context, nextLoad) {
    const result = /tsx?$/.test(url)
      ? ({ format: 'module', shortCircuit: true, source: fs.readFileSync(url.startsWith('file://') ? URL.fileURLToPath(url) : url) })
      : await nextLoad(url, context)
    if (fn && result.source && (result.format === 'module' || context.format === 'commonjs' || context.format === 'module'))
      result.source = fn(result.source, url)
    return result
  }
}

function isFile(x) {
  try {
    return fs.statSync(x).isFile()
  } catch (_) {
    return
  }
}

function ts(x) {
  return isFile(x.slice(0, -3) + 'tsx') ? x.slice(0, -3) + 'tsx' :
         isFile(x.slice(0, -2) + 'ts') ? x.slice(0, -2) + 'ts' : x
}
