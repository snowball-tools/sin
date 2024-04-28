/* eslint no-console:0 */

import ey from 'ey'

import config, { resolve } from './config.js'
import { transform } from './shared.js'
import ssr, { wrap } from '../../ssr/index.js'

const { server, mount, src } = await resolve()
const head = getTools()
const router = ey()
const hijack = {
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
  router.get('/favicon.ico', r => r.end(favicon()))
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

  router.get('/node_modules/sin', router.files(config.local, hijack))
  router.get('/node_modules/SIN', router.files(config.local, hijack))
  router.get(router.files(hijack))
  router.get('/favicon.ico', r => r.end(favicon()))

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

function favicon() {
  return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAARgSURBVHgBpVY9bCNFFH4z4yR2bMt7IKQrTsq4OYEoklRAlzUS4mguERJCQgKnia4BQkQREBK5KgVFDlGkQCihOsRJOKKAcn2iCNIVcRNCRfYQ0hVRzuufteOfneHNztq6k+KfcV60mvW8yfu+982bNwtwRXNOJT/8TzqHTySHCYzAFaxwIjlj4MQocErAlW2wb71CXJMYMZjQdo8kL1+AwzQ44MNx2EOXbRJnIgW2DyWnEsEVqALHOUpDEtDtgv3ZG6Q4bixjBdZ/l/xpDRzCYC4CljgSJCKRkOKzjNPFceMZEbhTaPKLVttpUcYlITKUjyrQEJkQGs7NmcQcm8Dm3hPe8qsO0eAgCKauHGpUMiAJnCf4boGBjUVga/eEB62aE2sTBA8BZQSoxNfgigT6BKMuGNhIAjvbh2HmmDGPspUCtOYhmR6BkAwSoOwhGNhIAuyi4iTaWnYFqMotzFQ5tRIkHNW2UPp48/PX9sHAhhL4YeN+XvhVDpT1s+4ydhemYwekKxxEt4AwiceAoEJeEJ8x6gEjCSQa9U/CUsfyFkoByk4//O6jLeXbW/8ZwToOZm7htpQDOpNbu/u2C4ZGBzkK+R0r4XuLs34VcIRZvwLx2tNfe/7Ve++Vpn3fxnk33qzm1r5ZKfV89+/scvXAGDZQgbhXsSjpYta6yJTUwGTm2TUffL+mQLPPEX9/m4tmw1EFWchv2yv7X7gwxIa24j/e+lhEZ7tX7R5Mi6x9cM+7bL2zvMlbdNrBopwTqjcClN558PXiMAw6zJlo1B4q6ZN1T87W1VjJJMu1nUHrp5r+L7ONyhxuGVH/l/Ar886tjfUrEKj+mFCBEDwM2KiQeLN2++j1PL9sPWs1N3A9QbIyUdd1k2jWPh2GMfI2PL35ZkGCXNZnXh21WO5m6bfSoPV/Lb6LTUsuRV0S+wMlAaPZxT9/ci9bP7oVt89X490Y3vmEdxnkbvz9qA9+ypesrFt8rh7ivvdY31IITnXTkoQNvB9GEsi6Ja9sLdgw1eHXz4774GXrZS78M+f8pVeLL54dr/bmZ+teJsy8D07Ud4I3KP5EHyTN+HW8Fxg2IRq2aCyk/YT/72rT4rwj2T+6bYetW5FwXzg/yQ6KZfxBIuMWh+BCtWEOUqq6wBZN84Jds2SttjClPwqkBsf8GCsOi2esgLyWOQIh5qN7GPqPiML13vW8Cx1i4w64g+IZKSBvpJaABPNaX0xegygiMhrxt9TgATatdrBCOr47LKbZFmTgNgip39UYatwnEc3hn4AKdIVNyn5pVEgzAilhabAIXI0i8mkCCI+ZC8iR49HgExDogUe/RW8b+vVQgXY7Rx51xgJXRsHE0sERpBEpjcApTD2F9Z5GUmouGXjYK2wTcGVGpwAbsgWpmbKu8lDuqNqlh0+OPDADV2akADnAjpYQ32LmejuUAimJN9Vk4MYEQkt2tiApSuEWpEUZZqRN9icDn9jkFljyq5gjv5xagCva/+DjBEAPTT67AAAAAElFTkSuQmCC', 'base64')
}
