import path from 'path'
import ESBuild from 'esbuild'
import 'sin/env'
import { extensionless, getLocal } from '../../bin/shared.js'

export default async function(x = {}) {
  process.env.SIN_BUILD = true
  const config = (await import('../../bin/config.js')).default
  const {
    entry = config.entry,
    plugins,
    cwd = process.cwd(),
    esbuild = {},
    tsconfigRaw,
    ...options
  } = x

  return await ESBuild.build({
    entryPoints: [entry],
    bundle: true,
    splitting: true,
    sourcemap: 'external',
    minify: true,
    outdir: options.outputDir || config.outputDir || '+build',
    format: 'esm',
    tsconfigRaw,
    ...esbuild,
    define: {
      ...esbuild.define,
      'import.meta.env': config.unsafe.slice(16, -1)
    },
    plugins: [
      {
        name: 'sin',
        setup: x => x.onResolve(
          { filter: /^sin$/ },
          () => ({ path: path.join(getLocal(), 'src', 'index.js') })
        )
      },
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
          x => ({ path: abs(extensionless(x.path, cwd) || x.path, cwd) })
        )
      },
      ...[].concat(plugins || []).concat(esbuild.plugins || [])
    ]
  })
}

function abs(x, root) {
  return x.indexOf(root) === 0 ? x : path.join(root, x)
}
