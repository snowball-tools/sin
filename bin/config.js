import os from 'node:os'
import fs from 'node:fs'
import cp from 'node:child_process'
import fsp from 'node:fs/promises'
import url from 'node:url'
import path from 'node:path'
import { getTSConfigRaw, getPkgs, getSucrase, isScript, extensionless, canRead } from './shared.js'

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
      install   : 0
    },
    parameters: {
      publicDir   : (x, xs) => '+public',
      outputDir   : (x, xs) => '+build',
      entry       : getEntry,
      cwd         : getCWD,
      root        : getRoot,
      local       : getLocal,
      home        : getHome,
      port        : getPort,
      unsafe      : getUnsafe,
      sucrase     : getSucrase,
      chromePath  : getChromePath,
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
      workers     : x => x ? x === 'cpus' ? os.cpus().length : parseInt(x) : 1,
      tsconfig    : (x, xs) => xs.cwd + '/tsconfig.json',
      tsconfigRaw : getTSConfigRaw
    },
    flags: {
      version   : false,
      debug     : false,
      help      : false,
      live      : false,
      headless  : false,
      nochrome  : false,
      noscript  : false,
      nojail    : false,
      bundleNodeModules : false,
      script    : (_, xs) => xs.$[1] === 'script',
      static    : (_, xs) => xs.$[1] === 'static'
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
  return process.env.SIN_BUILD || !config.static || config.build || config.generate
}

export function getEntry(x, config) {
  x = x || config._[0] || ''
  x = path.isAbsolute(x) ? x : path.join(process.cwd(), x)
  let file = isScript(x) && path.basename(x)
  const dir = file ? path.dirname(x) : x

  if (!needsEntry(config)) {
    process.chdir(env.PWD = dir)
    return ''
  }

  config.pkgs = getPkgs(dir)
  const pkg = config.pkgs[0]

  if (pkg) {
    process.chdir(env.PWD = pkg.dir) // node doesn't update env.PWD
    file || (file = pkg.json.main)
  }

  const entry = file
    ? path.join(dir, file)
    : extensionless(dir) || extensionless(path.join(dir, config.outputDir)) || path.join(dir, 'index.js')
  return canRead(entry)
    ? entry
    : error('Entry ' + (config._[0] || entry) + ' could not be accessed')
}

export function error(x) {
  process.stderr.write(
    '\n ' + c.inverse(' '.repeat(process.stdout.columns - 2)) +
    '\n ' + c.inverse(('   🚨 ' + x).padEnd(process.stdout.columns - 2, ' ')) +
    '\n ' + c.inverse(' '.repeat(process.stdout.columns - 2)) + '\n\n'
  )
  process.exit(1)
}

async function getCWD() {
  await import('./env.js')
  return process.cwd()
}

function getLocal(x, xs) {
  if (x)
    return x

  const local = path.join(process.cwd(), 'node_modules', 'sin')
  return fs.existsSync(local)
    ? local
    : path.join(url.fileURLToPath(new URL('.', import.meta.url)), '..')
}

function getRoot(x, xs) {
  return path.parse(xs.cwd).root
}

function getHome(x) {
  x = x || path.join(
    process.platform === 'win32' && env.USERPROFILE || env.HOME,
    '.sin'
  )
  fs.mkdirSync(x, { recursive: true })
  return x
}

function getPort(x, config) {
  if (x || env.PORT)
    return parseInt(x || env.PORT)

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

function getUnsafe() {
  const x = Object.entries(env).reduce((acc, [k, v]) => (k.startsWith('UNSAFE_') && (acc[k.slice(7)] = v), acc), {})
  return x ? 'import.meta.env=' + JSON.stringify(x) + ';' : ''
}

function getChromePath(x, xs) {
  if (x || env.CHROME_PATH)
    return (x || env.CHROME_PATH).trim()

  if (process.platform === 'darwin') {
    return [
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    ].find(fs.existsSync)
  } else if (process.platform === 'linux') {
    return cp.execSync('which google-chrome || which chromium || echo', { encoding: 'utf8' }).trim()
      || '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  } else if (process.platform === 'win32') {
    return [
      env['LOCALAPPDATA'] + '\\Google\\Chrome\\Application\\chrome.exe',      // eslint-disable-line
      env['PROGRAMFILES'] + '\\Google\\Chrome\\Application\\chrome.exe',      // eslint-disable-line
      env['PROGRAMFILES(X86)'] + '\\Google\\Chrome\\Application\\chrome.exe', // eslint-disable-line
      env['PROGRAMFILES'] + '\\Microsoft\\Edge\\Application\\msedge.exe',     // eslint-disable-line
      env['PROGRAMFILES(X86)'] + '\\Microsoft\\Edge\\Application\\msedge.exe' // eslint-disable-line
    ].find(fs.existsSync)
  }
}

export async function resolve() {
  const cwd = process.cwd()
      , hasExport = config.entry && exportsDefault(await fsp.readFile(config.entry, 'utf8'))
      , main = hasExport && (globalThis.window = (await import('../ssr/window.js')).default, await import(config.entry))
      , http = main && typeof main.default === 'function' && main
      , src = !http && !config.noscript && path.relative(config.cwd, config.entry)
      , mod = src && (await fsp.stat(path.join(cwd, config.outputDir, src)).catch(() => fsp.stat(path.join(cwd, src)))).mtimeMs.toFixed(0)

  return {
    onlyServer: !!http,
    server: http ? main : await defaultServer(),
    mount: !http && main && main.default,
    src,
    mod
  }

  async function defaultServer() {
    const defaultServerPath = path.join(cwd, '+', 'index.js')
    try {
      return await import(defaultServerPath)
    } catch (error) {
      if (!error.url || error.code !== 'ERR_MODULE_NOT_FOUND' || url.fileURLToPath(error.url) !== defaultServerPath)
        throw error
    }
  }
}

function exportsDefault(x) {
  if (!/(export|as)\s+default/.test(x))
    return false

  let i = 0
    , c = -1
    , b = -1
    , w = -1
    , l = -1
    , t = ''
    , ws = false
    , blocks = []
    , exp = false
    , found = false

  for (i = 0; i < x.length; i++) {
    c = x.charCodeAt(i)

      b === 39  ?  c === 39  && l !== 92 && pop()  // ' \
    : b === 34  ?  c === 34  && l !== 92 && pop()  // " \
    : b === 96  ?  c === 96  && l !== 92 && pop()  // ` \
    : b === 42  ?  c === 47  && l === 42 && pop()  // * /
    : b === 47  ?  c === 10  && pop()              // / \n
    : b === 91  && c === 93  ? pop()               // [ ]
    : b === 40  && c === 41  ? pop()               // ( )
    : b === 123 && c === 125 ? pop()               // { }
    : b === 112 && c === 125 ? pop()               // p }
    : c === 47  && l === 47  ? push()              // / /
    : c === 42  && l === 47  ? push()              // / *
    : c === 34  ? push()                           // "
    : c === 39  ? push()                           // '
    : c === 96  ? push()                           // `
    : c === 40  ? push()                           // (
    : c === 91  ? push()                           // [
    : c === 123 ? push()                           // {
    : isWS(c)   ? word()                           // \t \n \r space
    : ws = false

    l = c
    if (found)
      return true
  }

  return false

  function isWS(c) {
    return c === 9 || c === 10 || c === 13 || c === 32
  }

  function word() {
    if (ws === true || b !== -1)
      return w = i + 1

    ws = true
    t = x.slice(w, i)

    exp
      ? t === 'default'
        ? found = true
        : exp = false
      : t === 'export' || t === 'as'
      ? exp = true
      : exp = false

    w = i + 1
  }

  function push() {
    b !== -1 && blocks.push(b)
    b = c
  }

  function pop() {
    b = blocks.pop() || -1
  }
}
