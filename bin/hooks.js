import path from 'path'
import fs from 'fs'
import URL from 'url'

export async function resolve(specifier, context, nextResolve) {
  if (path.isAbsolute(specifier) && !specifier.startsWith(process.cwd()))
    specifier = URL.pathToFileURL(path.join(process.cwd(), specifier)).href

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

export function loader(fn) {
  return async function(url, context, nextLoad) {
    const result = url.endsWith('.ts')
      ? ({ format: 'module', shortCircuit: true, source: fs.readFileSync(url.startsWith('file://') ? URL.fileURLToPath(url) : url) })
      : await nextLoad(url, context)
    if (fn && result.source && (context.format === 'commonjs' || context.format === 'module'))
      result.source = fn(result.source)
    return result
  }
}

function extensionless(x, full) {
  return path.extname(x) ? x
    : isFile(path.join(full, 'index.js')) ? x + '/index.js'
    : isFile(full + '.js') ? x + '.js'
    : x
}

function isFile(x) {
  try {
    return fs.statSync(x).isFile()
  } catch (_) {
    return
  }
}

function ts(x) {
  return isFile(x.slice(0, -2) + 'ts') ? x.slice(0, -2) + 'ts' : x
}
