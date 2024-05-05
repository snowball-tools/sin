import path from 'node:path'
import fs from 'node:fs'

import esbuild from 'esbuild'

export default async function(x = {}) {
  const cwd = process.cwd()
      , ts = canRead('index.ts')
      , tsx = ts ? false : canRead('index.tsx')


  let { plugins, config, ...options } = x
  return await esbuild.build({
    entryPoints: [ts ? 'index.ts' : tsx ? 'index.tsx' : 'index.js'],
    bundle: true,
    splitting: true,
    sourcemap: 'external',
    minify: true,
    outdir: config.buildDir,
    format: 'esm',
    tsconfigRaw: config.tsconfigRaw || {},
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
    : canRead(path.join(x, 'index.tsx')) ? x + '/index.tsx'
    : canRead(x + '.tsx') ? x + '.tsx'
    : x
}

function canRead(x) {
  try {
    return fs.statSync(x).isFile()
  } catch (_) {
    return
  }
}
