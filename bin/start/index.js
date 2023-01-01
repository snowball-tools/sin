/* eslint no-console: 0 */

import path from 'path'
import fs from 'fs'
import fsp from 'fs/promises'

import ey from 'ey'

import ssr, { wrap } from '../../ssr/index.js'
import s from 'sin'

global.s = s

const argv = process.argv
    , env = process.env
    , cwd = process.cwd()
    , noScript = argv.inclues('--noscript')
    , ssl = env.SSL_CERT && { cert: env.SSL_CERT, key: env.SSL_KEY }
    , protocol = ssl ? 'https://' : 'http://'
    , port = env.PORT ? parseInt(env.PORT) : (ssl ? 443 : 80)
    , { mount, entry } = await getMount()
    , server = await getServer()

let certChangeThrottle

server.esbuild && (await import('../../build/index.js')).default()

const app = ey(ssl)

app.get(ey.files('+public'))

app.get(ey.files('+build'))

app.get(r => {
  if ((r.headers.accept || '').indexOf('text/html') !== 0)
    return

  return ssr(
    mount,
    {},
    { location: protocol + (r.headers.host || ('localhost' + port)) + r.url }
  ).then(x => {
    r.end(wrap(x, {
      body: noScript ? '' : '<script type=module async defer src="/' + entry + '"></script>'
    }), x.status || 200, x.headers)
  })
})

typeof server.default === 'function' && await server.default(app)

listen()

ssl && fs.watch(ssl.cert, () => {
  console.log('SSL certificate changed - reload in 5 seconds')
  clearTimeout(certChangeThrottle)
  certChangeThrottle = setTimeout(() => {
    console.log('Reloading to update SSL certificate')
    listen()
  }, 5000)
})

async function listen() {
  app.listen(port, x => {
    if (!x)
      throw new Error('Failed listening on ' + port)

    console.log('Listening on', port)
  })
}

async function getServer() {
  const server = argv.find((x, i, xs) => xs[i + 1] === '-s' || xs[i + 1] === '--server')
  const serverPath = server
        ? path.join(cwd, server)
        : path.join(cwd, '+', 'index.js')

  return fs.existsSync(serverPath)
    ? await import(serverPath)
    : {}
}

async function getMount() {
  const specifiesIndex = argv.find((x, i, xs) => x[0] !== '-' && (xs[i - 1] || '')[0] !== '-')
      , entry = specifiesIndex || 'index.js'
      , absEntry = path.isAbsolute(entry) ? entry : path.join(cwd, entry)
      , hasEntry = (await fsp.readFile(absEntry, 'utf8').catch(specifiesIndex ? undefined : (() => ''))).indexOf('export default ') !== -1

  return hasEntry
    ? { entry, mount: (await import(absEntry)).default }
    : { entry }
}