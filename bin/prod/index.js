/* eslint no-console: 0 */

import path from 'path'
import fs from 'fs'

import uws from 'uWebSockets.js'
import ustatic from 'ustatic'

import sin from '../../ssr/uws.js'

const env = process.env
    , forbiddens = ['/node_modules/*', '/package.json', '/package-lock.json', '/pnpm-lock.yaml']
    , ssl = env.SSL_CERT && { key_file_name: env.SSL_KEY, cert_file_name: env.SSL_CERT }
    , port = env.PORT || (ssl ? 443 : 80)
    , cwd = process.cwd()
    , specifiesIndex = process.argv[3]
    , entry = specifiesIndex || 'index.js'
    , absEntry = path.isAbsolute(entry) ? entry : path.join(process.cwd(), entry)
    , hasEntry = await fs.readFile(absEntry, 'utf8').catch(specifiesIndex ? undefined : (() => '')).indexOf('export default ') !== -1
    , mount = hasEntry ? (await import(absEntry)).default : {}
    , user = await userServer()

let listenerToken
  , certChangeThrottle

user.esbuild && (await import('../../build/index.js')).default()

const build = ustatic('+build', { notFound: ssr })
const assets = ustatic('+public', { index: ssr, notFound: build })

listen()

env.SSL_CERT && fs.watch(env.SSL_CERT, () => {
  console.log('SSL certificate changed - reload in 5 seconds')
  clearTimeout(certChangeThrottle)
  certChangeThrottle = setTimeout(() => {
    console.log('Reloading to update SSL certificate')
    listen()
  }, 5000)
})

async function listen() {
  listenerToken && uws.us_listen_socket_close(listenerToken)

  const app = ssl
    ? uws.SSLApp(ssl)
    : uws.App()

  forbiddens.forEach(x => app.get(x, forbidden))

  typeof user.default === 'function' && await user.default(app)

  app.get('/*', (res, req) => {
    const url = req.getUrl()

    // Don't serve hidden paths
    if (url.indexOf('/.') !== -1)
      return forbidden(res)

    assets(res, req)
  })

  app.listen(port, x => {
    if (!x)
      throw new Error('Failed listening on ' + port)

    console.log('Listening on', port)
    listenerToken = x
  })
}

function forbidden(res) {
  return end(res, '403 Forbidden')
}

function end(res, status, x) {
  res.cork(() => {
    res.writeStatus(status)
    res.end(arguments.length === 1 ? status : x)
  })
}

async function userServer() {
  const serverPath = path.join(cwd, '+', 'index.js')
  if (!fs.existsSync(serverPath))
    return {}

  return await import(serverPath)
}

function ssr(res, req, next) {
  if (res[ustatic.state].accept.indexOf('text/html') !== 0)
    return next(res, req)

  sin(mount, {}, { location: res[ustatic.state].url }, {
    body: '<script type=module async defer src="/index.js"></script>',
    res
  })
  return true
}
