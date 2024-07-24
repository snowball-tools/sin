/* eslint no-console:0 */

import path from 'node:path'

import ey from 'ey'
import esbuild from 'esbuild'

import favicon from '../favicon.js'
import config, { resolve } from './config.js'
import { transform, resolveEntry } from './shared.js'
import ssr, { wrap } from '../../ssr/index.js'

const head = getTools()
const router = ey()
const hijack = {
  compressions: false,
  cache: false,
  transform(buffer, filePath, type, r) {
    process.send('watch:' + filePath)
    return transform(buffer, filePath, type, r)
  }
}

const onlyServer = config.static
  ? staticOnly()
  : await serve()

await router.listen(config.port)
process.send('started:' + onlyServer)

function staticOnly() {
  router.get(
    router.files(config._[0] || process.cwd(), {
      cache: false
    })
  )
  router.get('/favicon.ico', r => r.end(favicon))

  return true
}

async function serve() {
  const { server, mount, src, onlyServer } = await resolve()
  if (server && typeof server.default === 'function')
    await server.default(router)

  router.get(r => {
    r.header('Cache-Control', 'no-store')
    if (r.url.indexOf('/.') !== -1) // Don't serve hidden paths or dir up hacks
      return r.statusEnd(403)
  })

  router.get(
    router.files(config.publicDir, {
      compressions: false,
      cache: false
    })
  )

  router.get('/node_modules/sin', router.files(config.local, hijack))
  router.get('/node_modules/SIN', router.files(config.local, hijack))
  config.bundleNodeModules && router.get('/node_modules/*', build)
  router.get(router.files(hijack))
  router.get('/favicon.ico', r => r.end(favicon))

  router.get(async r => {
    if (r.url.match(/\.[a-z0-9]+$/i) && !(r.headers.accept || '').startsWith('text/html'))
      return

    const x = await ssr(
      mount,
      {},
      { location: (r.headers.host ? 'http://' + r.headers.host : config.url) + r.url }
    )

    const html = wrap(x, {
      head,
      body: config.noscript ? '' : '<script type=module async defer src="/' + src + '"></script>'
    })

    r.end(html, x.status || 200, x.headers)
  })

  return onlyServer
}

async function build(r) {
  if (r.url.endsWith('.js'))
    return r.file(path.join(config.cwd, r.url), hijack)

  const entry = resolveEntry(r.url.slice(14), true)
  let source = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    write: false,
    platform: 'browser',
    legalComments: 'none'
  }).then(x => x.outputFiles[0].text)

  const exportsDefault = source.lastIndexOf('export default require_')
  if (exportsDefault > -1 && source.indexOf("__esModule") > -1) {
    const before = source.slice(0, exportsDefault)
    const after = source.slice(exportsDefault)
    try {
      const names = Function(before + after.replace(/^export default ([^;]+);/g, 'return Object.keys($1);'))()
      if (names.length)
        source = before + after.replace(/^export default ([^;]+);/g, 'const $_$ = $1;export default $_$;export const {' + names + '} = $_$;')
    } finally {}
  }

  r.end(source, { 'Content-Type': 'text/javascript' })
}

function getTools() {
  const dev = true || process.env.SIN_DEBUG
  return `
    <script type=module id=sindev port="${ process.env.SIN_DEV_PORT }" ${ process.env.SIN_DEBUG ? 'debug' : '' } ${
      dev
        ? 'src="/node_modules/sin/bin/develop/tools/index.js">'
        : 'src="/node_modules/sin/bin/develop/tools/dist.js">'
    }</script>
  `.trim()
}
