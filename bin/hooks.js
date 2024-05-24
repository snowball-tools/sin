import fs from 'node:fs'
import path from 'node:path'
import { URL, fileURLToPath, pathToFileURL } from 'node:url'

import { modify, extensionless, getSucrase, getTSConfigRaw, getPkgs } from './shared.js'

const cwd = process.cwd()
const root = path.parse(cwd).root

const config = {
  sucrase: await getSucrase(null, { pkgs: getPkgs(null, { root, cwd }) }),
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
    } catch(e) {
      ts && (result.source = '')
      console.error(e.message)
      return result
    }
  }

  return result
}

export function resolve(x, context, nextResolve) {
  const c = x.charCodeAt(0)
  const cwd = process.cwd()
  const isRelative = c === 46 // .
  const isAbsolute = !isRelative && path.isAbsolute(x)
  const isRoot = isAbsolute && x.startsWith(cwd)
  const isURL = !isRelative && !isAbsolute && c === 102 && x.indexOf('file://') === 0 // f
  const url = isURL      ? x
            : isRelative ? pathToFileURL(path.join(path.dirname(fileURLToPath(context.parentURL)), x))
            : isRoot     ? pathToFileURL(path.join(cwd, x))
            : isAbsolute ? pathToFileURL(x)
            : null // is bare import

  return nextResolve(url ? '' + pathToFileURL(extensionless('' + url)) : x, context)
}
