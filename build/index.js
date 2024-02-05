import esbuild from 'esbuild'
import path from 'path'
import fs from 'fs'

export default async function(x = {}) {
  const cwd = process.cwd()
      , ts = canRead('index.ts')

  let { plugins, ...options } = x
  return await esbuild.build({
    entryPoints: [ts ? 'index.ts' : 'index.js'],
    bundle: true,
    splitting: true,
    sourcemap: 'external',
    minify: true,
    outdir: '+build',
    format: 'esm',
    loader: ts && 'ts',
    ...options,
    plugins: [
      {
        name: 'sinssr',
        setup: x => x.onResolve(
          { filter: /\+\// },
          () => ({ external: true })
        )
      },
      {
        name: 'sinport',
        setup: x => x.onResolve(
          { filter: /^\// },
          x => ({ path: extensionless(x.path.indexOf(cwd) === 0 ? x.path : path.join(cwd, x.path)) })
        )
      },
      ...[].concat(plugins || [])
    ]
  })
}

function extensionless(x) {
  return path.extname(x) ? x
    : canRead(path.join(x, 'index.js')) ? x + '/index.js'
    : canRead(x + '.js') ? x + '.js'
    : canRead(path.join(x, 'index.ts')) ? x + '/index.ts'
    : canRead(x + '.ts') ? x + '.ts'
    : x
}

function canRead(x) {
  try {
    return fs.statSync(x).isFile()
  } catch (_) {
    return
  }
}
