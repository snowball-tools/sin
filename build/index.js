import ESBuild from 'esbuild'
import config, { getEntry } from '../bin/config.js'
import { extensionless } from '../bin/shared.js'

export default async function(x = {}) {
  const {
    entry = getEntry('', { _: [], $: ['build'] }),
    plugins,
    cwd = process.cwd(),
    esbuild = {},
    ...options
  } = x

  return await ESBuild.build({
    entryPoints: [entry],
    bundle: true,
    splitting: true,
    sourcemap: 'external',
    minify: true,
    outdir: options.outputDir || '+build',
    format: 'esm',
    ...esbuild,
    define: {
      ...esbuild.define,
      'import.meta.env': config.unsafe.slice(16, -1)
    },
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
          x => ({ path: extensionless(x.path, cwd) })
        )
      },
      ...[].concat(plugins || []).concat(esbuild.plugins || [])
    ]
  })
}
