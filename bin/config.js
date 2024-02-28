
import os from 'node:os'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import url from 'node:url'
import path from 'node:path'

import '../ssr/index.js' // mocks window
import args from './args.js'
import c from './color.js'

const env = process.env
const [runtime, bin, ...argv] = process.argv

let config
try {
  config = { runtime, bin, ...(await fromArgs()) }
} catch (e) {
  if (process.argv.includes('-d') || process.argv.includes('--debug'))
    throw e
  error(e)
}

config.version && config.$[0] === 'version'
config.help && config.$[0] === 'help'

export default config

async function fromArgs() {
  const acme = {
    dir         : (x, xs) => path.join(xs.home, 'acme'),
    domains     : x => (x || env.ACME_DOMAIN || env.ACME_DOMAINS || '').split(',').filter(x => x),
    challenge   : getChallenge,
    rsa         : x => x || env.ACME_RSA,
    email       : x => x || env.ACME_EMAIL,
    test        : x => x || env.ACME_TEST,
    eab         : x => x || env.ACME_EAB,
    kid         : x => x || env.ACME_KID,
    key         : x => x || env.ACME_KEY,
    ca          : x => x || env.ACME_CA || 'letsencrypt'
  }

  return args(argv, {
    env: 'SIN',
    commands: {
      $         : 'help',
      acme      : { $: true, list: 1, renew: 1, delete: 1 },
      build     : 1,
      create    : 1,
      develop   : { $: true, script: 1, static: 1 },
      generate  : 1,
      help      : 1,
      purge     : 1,
      run       : 1,
      start     : { $: true, script: 1, static: 1 },
      version   : 1,
      install   : 1
    },
    parameters: {
      entry       : getEntry,
      cwd         : getCWD,
      local       : getLocal,
      home        : getHome,
      port        : getPort,
      domain      : null,
      server      : null,
      ssl         : {
        mode        : getMode,
        cert        : x => x || env.SSL_CERT,
        key         : x => x || env.SSL_KEY,
        passphrase  : x => x || env.SSL_PASSPHRASE
      },
      acme,
      secure      : (x, xs) => !!(xs.ssl.cert || xs.acme.domains.length),
      httpsPort   : (x, xs) => x || (xs.secure ? (x ? parseInt(x) : (xs.port || 443)) : null),
      httpPort    : (x, xs) => xs.secure && xs.ssl.mode === 'only' ? null : (xs.secure ? 80 : x ? parseInt(x) : 80),
      address     : x => x || env.ADDRESS || '0.0.0.0',
      workers     : x => x ? x === 'cpus' ? os.cpus().length : parseInt(x) : 1
    },
    flags: {
      version   : false,
      debug     : false,
      help      : false,
      live      : false,
      nochrome  : false,
      noscript  : false,
      script    : (x, xs) => xs.$[1] === 'script',
      static    : (x, xs) => xs.$[1] === 'static'
    },
    alias: {
      development: 'develop',
      production: 'start',
      prod: 'start',
      '-p': '--port',
      '-l': '--live',
      '-n': '--nochrome',
      '-h': '--help',
      '-v': '--version',
      '-d': '--debug',
      '--acme-domain': '--acme-domains',
      ...(argv[0] === 'acme' ? Object.keys(acme).reduce((acc, x) => (
        acc['--' + x] = '--acme-' + x,
        acc
      ), {}) : {})
    }
  })
}

function needsEntry(config) {
  return ('develop start'.includes(config.$[0]) && config.$[1] !== 'static')
      || 'build generate'.includes(config.$[0])
}

function getEntry(x, config, read, alt = '', initial) {
  if (x)
    return x

  if (!needsEntry(config))
    return ''

  x = config._[0] || ''

  const entry = path.isAbsolute(x)
    ? x
    : path.join(
      process.cwd(),
      alt,
      fs.existsSync(x + '.js')
        ? x + '.js'
        : fs.existsSync(x + '.ts')
        ? x + '.ts'
        : fs.existsSync(path.join(x, x.endsWith('.js') ? '' : 'index.js'))
        ? path.join(x, x.endsWith('.js') ? '' : 'index.js')
        : fs.existsSync(path.join(x, x.endsWith('.ts') ? '' : 'index.ts'))
        ? path.join(x, x.endsWith('.ts') ? '' : 'index.ts')
      : 'index.js'
    )

  try {
    fs.readFileSync(entry, { length: 1 })
    return entry
  } catch (e) {
    return alt
      ? error('No access ' + (initial || entry) + ' (' + e.code + ')')
      : getEntry(null, config, read, '+build', entry)
  }
}

function error(x) {
  process.stderr.write(
    '\n ' + c.inverse(' '.repeat(process.stdout.columns - 2)) +
    '\n ' + c.inverse(('   🚨 ' + x).padEnd(process.stdout.columns - 2, ' ')) +
    '\n ' + c.inverse(' '.repeat(process.stdout.columns - 2)) + '\n\n'
  )
  process.exit(1)
}

async function getCWD(x, config) {
  x = env.PWD = x || needsEntry(config)
    ? path.dirname(config.entry).replace('/+build', '')
    : process.cwd()
  process.cwd() !== x && process.chdir(x)
  await import('./env.js')
  return x
}

function getLocal(x, xs) {
  if (x)
    return x

  const local = path.join(process.cwd(), 'node_modules', 'sin')
  return fs.existsSync(local)
    ? local
    : path.join(url.fileURLToPath(new URL('.', import.meta.url)), '..')
}

function getHome(x) {
  x = x || path.join(
    process.platform === 'win32' && env.USER_PROFILE || env.HOME,
    '.sin'
  )
  fs.mkdirSync(x, { recursive: true })
  return x
}

function getPort(x, config) {
  if (x || process.env.PORT)
    return parseInt(x || process.env.PORT)

  if (config.$[0] !== 'develop')
    return

  const file = path.join(config.home, '.ports')
  const ports = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, 'utf8'))
    : {}

  if (config.cwd in ports)
    return ports[config.cwd]

  const port = 1 + (Object.values(ports).sort().find((x, i, xs) => xs[i + 1] !== x + 1) || 1336)
  ports[config.cwd] = port
  fs.writeFileSync(file, JSON.stringify(ports))
  return port
}

function getMode(x) {
  x = x || env.SSL_MODE || 'redirect'
  if (!'only redirect optional'.includes(x))
    throw new Error('SSL Mode must be: only | redirect | optional')
  return x
}

async function getChallenge(challenge, config, read) {
  challenge = challenge || env.ACME_CHALLENGE || 'http-01'
  if (challenge === 'http-01')
    return challenge

  const x = await import('./acme/dns/' + challenge + '.js')
  if (x.auth) {
    for (const value of Object.values(x.auth)) {
      const obj = { [value.replace(/_/g, '-').toLowerCase()]: x => env[value] = x || env[value] }
      await read(obj)
    }
  }

  return challenge
}

export async function resolve() {
  const cwd = process.cwd()
      , hasExport = config.entry && (await fsp.readFile(config.entry, 'utf8')).match(/export(\s+default\s|\s*{\s*\w*\s+as\s+default)/)
      , main = hasExport && (globalThis.window = (await import('../ssr/window.js')).default, await import(config.entry))
      , http = main && typeof main.default === 'function' && main
      , src = !http && !config.noscript && path.basename(config.entry)
      , mod = src && (await fsp.stat(path.join(cwd, '+build', src)).catch(() => fsp.stat(path.join(cwd, src)))).mtimeMs.toFixed(0)

  return {
    server: http ? main : (await import(path.join(cwd, '+', 'index.js')).catch(err => err.code === 'ERR_MODULE_NOT_FOUND' ? null : Promise.reject(err))),
    mount: !http && main && main.default,
    src,
    mod
  }
}
