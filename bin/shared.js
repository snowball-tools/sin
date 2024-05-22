import path from 'node:path'
import fs from 'node:fs'
import URL from 'node:url'
import esbuild from 'esbuild'

export function isScript(x) {
  return /\.[mc]?[jt]sx?$/i.test(x)
}

export function extensionless(x, root = '') {
  x.indexOf('file:') === 0 && (x = x.slice(7))
  root = path.isAbsolute(x) ? process.cwd() : root
  x.indexOf(root) === 0 && (root = '')
  return isScript(x)                           ? x
    : canRead(path.join(root, x + '.js'))      ? x + '.js'
    : canRead(path.join(root, x, 'index.js'))  ? x + '/index.js'
    : canRead(path.join(root, x + '.ts'))      ? x + '.ts'
    : canRead(path.join(root, x, 'index.ts'))  ? x + '/index.ts'
    : canRead(path.join(root, x + '.tsx'))     ? x + '.tsx'
    : canRead(path.join(root, x, 'index.tsx')) ? x + '/index.tsx'
    : canRead(path.join(root, x + '.jsx'))     ? x + '.jsx'
    : canRead(path.join(root, x, 'index.jsx')) ? x + '/index.jsx'
    : x
}

function canRead(x) {
  try {
    return fs.statSync(x).isFile()
  } catch (_) {
    return
  }
}

export function getTSConfigRaw(x, config) {
  const xs = config.tsconfig && fs.existsSync(config.tsconfig)
    ? JSON.parse(esbuild.transformSync('export default ' + fs.readFileSync(config.tsconfig), { minify: true }).code.slice(14, -2).replace(/:/g, '":').replace(/([{,])/g, '$1"').replace(/!0/g, 'true').replace(/!1/g, 'false').replace(/""/g, '"'))
    : {}

  return {
    ...xs,
    compilerOptions: {
      jsx: 'react',
      jsxFactory: 's',
      jsxFragmentFactory: 's.jsxFragment',
      ...xs.compilerOptions
    }
  }
}

export function jail(x) {
  return ('' + x).replace(/((function.*?\)|=>)\s*{)/g, '$1eval(0);')
}

export function getPkgs(x, {
  cwd,
  root
}) {
  let pkgs = []
  let dir = cwd
  while (dir !== root) {
    try {
      pkgs.push({ dir, json: JSON.parse(fs.readFileSync(path.join(dir, 'package.json'))) })
    } catch (e) {
      if (e.code !== 'ENOENT')
        throw e
    }
    dir = path.dirname(dir)
  }
  return pkgs
}

export async function getSucrase(x, { pkgs }) {
  for (const { dir, json } of pkgs) {
    if (json.dependencies?.sucrase || json.devDependencies?.sucrase)
      return import(path.join(dir, 'node_modules', 'sucrase', 'dist', 'index.js'))
  }
}

export function modify(x, file, {
  debug = false,
  nojail = false,
  sucrase,
  tsconfigRaw
}) {
  if (/\.tsx?$/.test(file)) {
    try {
      if (sucrase) {
        x = sucrase.transform('' + x, {
          transforms: ['typescript', 'jsx'],
          jsxPragma: 's',
          jsxFragmentPragma: 's.jsxFragment',
          production: true
        }).code
      } else {
        x = esbuild.transformSync(x, {
          ...(debug ? { logLevel: 'debug' } : {}),
          jsx: 'transform',
          jsxFactory: 's',
          jsxFragment: 's.jsxFragment',
          loader: file.endsWith('.tsx') ? 'tsx' : 'ts',
          tsconfigRaw: tsconfigRaw
        }).code
      }
    }
    catch (err) {
      console.error("[Sin] modify failed:", err)
      throw err
    }
  }

  return nojail ? x : jail(x)
}

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

export async function loader(fn) {
  const cwd = process.cwd()
  const root = path.parse(cwd).root

  const config = {
    sucrase: await getSucrase(null, { pkgs: getPkgs(null, { root, cwd }) }),
    tsconfigRaw: getTSConfigRaw(null, { tsconfig: path.join(cwd, 'tsconfig.json') })
  }

  return async function(url, context, nextLoad) {
    const result = /tsx?$/.test(url)
      ? ({ format: 'module', shortCircuit: true, source: fs.readFileSync(url.startsWith('file://') ? URL.fileURLToPath(url) : url) })
      : await nextLoad(url, context)
    if (fn && result.source && (result.format === 'module' || context.format === 'commonjs' || context.format === 'module'))
      result.source = fn(result.source, url, config)
    return result
  }
}

function ts(x) {
  return canRead(x.slice(0, -3) + 'tsx') ? x.slice(0, -3) + 'tsx' :
         canRead(x.slice(0, -2) + 'ts') ? x.slice(0, -2) + 'ts' : x
}
