/* eslint no-console:0 */

import ey from 'ey'

import config, { resolve } from './config.js'
import { transform } from './shared.js'
import ssr, { wrap } from '../../ssr/index.js'

const { server, mount, src } = await resolve()
const head = getTools()
const router = ey()
const highjack = {
  compressions: false,
  cache: false,
  transform(buffer, filePath, type, r) {
    process.send(filePath)
    return transform(buffer, filePath, type, r)
  }
}

if (server)
  typeof server.default === 'function' && await server.default(router)

if (config.static) {
  router.get(
    router.files(config._[0] || process.cwd(), {
      cache: false
    })
  )
} else {
  router.get(r => {
    r.header('Cache-Control', 'no-store')
    if (r.url.indexOf('/.') !== -1) // Don't serve hidden paths or dir up hacks
      return r.statusEnd(403)
  })

  router.get(
    router.files('+public', {
      compressions: false,
      cache: false
    })
  )

  router.get('/node_modules/sin', router.files(config.local, highjack))
  router.get('/node_modules/SIN', router.files(config.local, highjack))
  router.get(router.files(highjack))

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
}

await router.listen(config.port)

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
