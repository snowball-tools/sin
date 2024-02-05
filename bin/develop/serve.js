/* eslint no-console:0 */

import ey from 'ey'

import config from './config'
import { transform } from './shared.js'
import ssr, { wrap } from '../../ssr/index.js'

const { server, mount, src } = await config.resolve()
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

if (!config.static) {
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
  return `
    <script type=module id=sindev ${ process.env.SIN_DEBUG ? 'debug' : '' } port="${ process.env.SIN_TOOLS_PORT }" ${
      true || process.env.SIN_DEBUG
        ? 'src="/node_modules/sin/bin/develop/tools/index.js">'
        : 'src="/node_modules/sin/bin/develop/tools/dist.js">'
    }</script>
  `.trim()
}
