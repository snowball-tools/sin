import crypto from 'node:crypto'
import path from 'node:path'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import { isMainThread, parentPort } from 'node:worker_threads'
import ey from 'ey'

import config from './config.js'
import Acme from '../acme/core.js'

import { tryPromise } from '../../src/shared.js'
import ssr, { wrap } from '../../ssr/index.js'

let sslListener
const { server, mount, src, mod } = await config.resolve(config.entry)
const router = ey()

if (server) {
  server.esbuild && (await import('../../build/index.js')).default(server.esbuild)
  server.default && await server.default(router)
}

if (!config.static) {
  router.get(router.files('+build'))
  router.get(router.files('+public'))
  router.get(render)
}

if (config.httpPort)
  await listenHttp()

if (config.ssl) {
  await listenHttps()
  let certChangeThrottle
  fs.watch(config.ssl.cert, () => {
    console.log('SSL certificate file changed - reload in 5 seconds') // eslint-disable-line
    clearTimeout(certChangeThrottle)
    certChangeThrottle = setTimeout(() => {
      console.log('Reloading to update SSL certificate') // eslint-disable-line
      listenHttps().catch(error => {
        console.error('Error reloading to update SSL certificate', error) // eslint-disable-line
      })
    }, 5000)
  })
}

async function listenHttp() {
  if (config.ssl && config.ssl.mode === 'redirect') {
    const redirect = ey()

    config.acme && redirect.route(Acme.route(isMainThread ? {} : { get: getFromParent }))
    redirect.all(r => {
      r.statusEnd(301, {
        Location: 'https://' + (r.headers.host || config.domain).split(':')[0] + r.url + (r.rawQuery ? '?' + r.rawQuery : '')
      })
    })
    await redirect.listen(config.httpPort, config.address)
    console.log('HTTP Redirecting to HTTPS on', config.httpPort) // eslint-disable-line
  } else {
    config.acme && router.route(Acme.route(isMainThread ? {} : { get: getFromParent }))
    await router.listen(config.httpPort, config.address)
    console.log('HTTP Listening on', config.httpPort) // eslint-disable-line
  }
}

function getFromParent(challenge) {
  return new Promise(resolve => {
    const message = { acme: crypto.randomUUID(), challenge }
    parentPort.on('message', reply)
    parentPort.postMessage(message)
    function reply(x) {
      if (x && x.acme === message.acme) {
        resolve(x.content)
        parentPort.off('message', reply)
      }
    }
  })
}

function render(r) {
  return tryPromise(
    ssr(
      mount,
      {},
      { location: r.protocol + '://' + (r.headers.host || ('localhost' + config.port)) + r.url }
    ),
    x => {
      r.end(
        wrap(x, {
          body: src && '<script type=module src="/' + (src + '?v=' + mod) + '"></script>'
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
}

async function listenHttps() {
  isMainThread && config.acme && await runAcme()
  sslListener && (sslListener.unlisten(), sslListener = null)
  sslListener = await router.listen(config.httpsPort, config.address, config.ssl)
  console.log('HTTPS Listening on', config.httpsPort) // eslint-disable-line
}

async function runAcme() {
  await fsp.mkdir(config.acme.dir, { recursive: true })
  const acmeFile = path.join(config.acme.dir, config.acme.ca + '.json')
  const account = JSON.parse(await readOrNull(acmeFile))
  const acme = await Acme({ ...account, ...(Object.fromEntries(Object.entries(config.acme).filter(([k, v]) => v !== undefined))) })
  await fsp.writeFile(acmeFile, JSON.stringify(acme, null, 2))

  setTimeout(runAcme, 12 * 60 * 60 * 1000).unref()
  const dir = path.join(config.acme.dir, config.acme.ca + '_' + config.acme.domains.join(',').replace(/\*/g, '_'))
  const jsonPath = path.join(dir, 'cert.json')
  const certPath = path.join(dir, 'cert.pem')
  const keyPath = path.join(dir, 'key.pem')
  const cert = await readOrNull(certPath)
  const left = cert && new Date(new crypto.X509Certificate(cert).validTo).getTime() - Date.now()

  if (!cert || left < 30 * 24 * 60 * 60 * 1000) { // 30 days
    if (account && !config.acme.kid && ca !== 'zerossl') {
      await acme.rotate()
      await fsp.writeFile(acmeFile, JSON.stringify(acme, null, 2))
      console.log('ACME: Waiting for 15 seconds so key change can propogate remotely') // eslint-disable-line
      await new Promise(r => setTimeout(r, 15000))
    }
    const x = await acme.create(config.acme.domains.join(' '), {
      ...config.ssl,
      ...config.acme
    })
    await fsp.mkdir(dir, { recursive: true })
    await Promise.all([
      fsp.writeFile(jsonPath, JSON.stringify(x, null, 2)),
      fsp.writeFile(certPath, x.cert),
      fsp.writeFile(keyPath, x.key)
    ])
  } else {
    console.log('ACME: Certificate valid for', Math.round(left / 1000 / 60 / 60 / 24), 'more day(s)') // eslint-disable-line
  }
  config.ssl.cert = process.env.SIN_SSL_CERT = process.env.SSL_CERT = certPath
  config.ssl.key = process.env.SIN_SSL_KEY = process.env.SSL_KEY = keyPath
}

async function readOrNull(x) {
  return fsp.readFile(x, 'utf8').catch(x => x.code === 'ENOENT' ? null : Promise.reject(x))
}
