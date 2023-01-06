import esbuild from 'esbuild'
import path from 'path'
import fs from 'fs'

export default async function(x = {}) {
  const cwd = process.cwd()
  let { plugins, ...options } = x
  return await esbuild.build({
    entryPoints: ['./index.js'],
    bundle: true,
    splitting: true,
    sourcemap: 'external',
    minify: true,
    outdir: '+build',
    format: 'esm',
    ...options,
    plugins: [
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
    : x
}

function canRead(x) {
  try {
    return fs.statSync(x).isFile()
  } catch (_) {
    return
  }
}
