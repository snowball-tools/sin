import fs from 'node:fs'
import path from 'node:path'
import { URL, fileURLToPath, pathToFileURL } from 'node:url'

import { modify, extensionless, getSucrase, getTSConfigRaw, getPkgs } from './shared.js'

const pkg = JSON.parse(fs.readFileSync(path.join(process.env.SIN_LOCAL, 'package.json')))
const cwd = process.cwd()

const config = {
  sucrase: await getSucrase(null, { pkgs: getPkgs(cwd) }),
  tsconfigRaw: getTSConfigRaw(null, { tsconfig: path.join(cwd, 'tsconfig.json') })
}

export async function load(url, context, nextLoad) {
  const ts = url.startsWith('file://') && (url.endsWith('.ts') || url.endsWith('.tsx'))
  const result = ts
    ? ({ source: fs.readFileSync(new URL(url)), format: 'module', shortCircuit: true })
    : await nextLoad(url, context)

  if (result.source && (result.format === 'module' || context.format === 'commonjs' || context.format === 'module')) {
    try {
      result.source = modify(result.source, url, config)
    } catch (e) {
      ts && (result.source = '')
      console.error(e.message) // eslint-disable-line
      return result
    }
  }

  return result
}

export function resolve(x, context, nextResolve) {
  const c = x.charCodeAt(0)
  const cwd = process.cwd()
  const isRelative = c === 46 // .
  const isSin = !isRelative && (x === 'sin' || x.startsWith('sin/'))
  const isAbsolute = !isSin && path.isAbsolute(x)
  const isRoot = isAbsolute && x.startsWith(cwd)
  const isURL = !isRelative && !isAbsolute && c === 102 && x.indexOf('file://') === 0 // f

  const url = isURL      ? x
            : isSin      ? pathToFileURL(resolveSin(x))
            : isRelative ? pathToFileURL(path.join(path.dirname(fileURLToPath(context.parentURL)), x))
            : isRoot     ? pathToFileURL(x)
            : isAbsolute ? pathToFileURL(path.join(cwd, x))
            : null // is bare import

  return nextResolve(url ? '' + pathToFileURL(extensionless('' + url) || fileURLToPath(url)) : x, context)
}

function resolveSin(x) {
  x = '.' + x.slice(3)
  return path.join(
    process.env.SIN_LOCAL,
    firstString(pkg, 'exports', x, 'import') || (x === '.' && firstString(pkg, 'exports', 'import')) || x
  )
}

function firstString(x, ...props) {
  for (const prop of props) {
    const type = typeof x[prop]
    if (type === 'object')
      x = x[prop]
    else if (type === 'string')
      return x[prop]
  }
}
