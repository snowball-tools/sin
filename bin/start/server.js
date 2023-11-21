/* eslint no-console: 0 */

import path from 'path'
import fs from 'fs'
import fsp from 'fs/promises'

import ey from 'ey'

import { tryPromise } from '../../src/shared.js'
import ssr, { wrap } from '../../ssr/index.js'

const argv = process.argv.slice(2)
    , env = process.env
    , cwd = process.cwd()
    , host = process.env.HOST_FALLBACK || ''
    , command = (argv[0] && !argv[0].endsWith('.js') ? argv[0] : '').toLowerCase()
    , ssl = env.SSL_CERT && { cert: env.SSL_CERT, key: env.SSL_KEY }
    , protocol = ssl ? 'https://' : 'http://'
    , port = env.PORT ? parseInt(env.PORT) : (ssl ? 443 : 80)
    , portHttp = env.NO_HTTP ? 0 : env.PORT_HTTP ? parseInt(env.PORT_HTTP) : (ssl ? 80 : port)
    , httpRedirect = ssl && env.HTTP_REDIRECT !== 'no'
    , address = env.ADDRESS || '0.0.0.0'
    , { mount, entry } = await getMount()
    , entryPath = resolveEntry(entry, command)
    , entryStat = await fsp.stat(entryPath)
    , server = await getServer()

let certChangeThrottle
  , listener

server.esbuild && (await import('../../build/index.js')).default(server.esbuild)

const app = ey()

typeof server.default === 'function' && await server.default(app)

app.get(app.files('+build'))
app.get(app.files('+public'))

command !== 'server' && app.get(r => {
  return tryPromise(
    ssr(
      mount,
      {},
      { location: protocol + (r.headers.host || ('localhost' + port)) + r.url }
    ),
    x => {
      r.end(
        wrap(x, {
          body: noscript ? '' : '<script type=module src="/'
            + (entry + '?ts=' + entryStat.mtimeMs.toFixed(0))
            + '"></script>'
        }),
        x.status || 200,
        {
          ETag: null,
          'Cache-Control': 'max-age=0, no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: new Date().toUTCString(),
          ...x.headers
        }
      )
    }
  )
})

listen()

ssl && fs.watch(ssl.cert, () => {
  console.log('SSL certificate changed - reload in 5 seconds')
  clearTimeout(certChangeThrottle)
  certChangeThrottle = setTimeout(() => {
    console.log('Reloading to update SSL certificate')
    listenHttps()
  }, 5000)
})

function resolveEntry(x, command) {
  return [
    path.join(cwd, noscript || run ? '' : '+build', x),
    path.join(cwd, '+public', x)
  ].find(x => fs.existsSync(x))
}

async function listen() {
  ssl && listenHttps()
  portHttp && listenHttp()
}

async function listenHttp() {
  if (httpRedirect) {
    const app = ey()
    app.all(r => r.end('', 301, { Location: 'https://' + (r.headers.host || host) + r.url }))
    await app.listen(portHttp, address)
  } else {
    await app.listen(portHttp, address)
  }
  console.log('HTTP Listening on', portHttp)
}

async function listenHttps() {
  listener && listener.unlisten()
  await app.listen(port, address, ssl).then(x => listener = x)
  console.log('HTTPS Listening on', port)
}

async function getServer() {
  const serverPath = path.join(cwd, command === 'server' ? '' : '+', 'index.js')
  return fs.existsSync(serverPath)
    ? await import(serverPath)
    : {}
}

async function getMount() {
  const specifiesIndex = argv.find(x => x[0] !== '-' && x.endsWith('.js'))
      , entry = specifiesIndex || 'index.js'
      , absIndex = path.isAbsolute(entry) ? entry : path.join(cwd, entry)
      , hasIndex = (await fsp.readFile(absIndex, 'utf8').catch(specifiesIndex ? undefined : (() => ''))).indexOf('export default ') !== -1

  return hasIndex
    ? { entry, mount: (await import(absIndex)).default }
    : { entry }
}
