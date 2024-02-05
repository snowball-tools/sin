import '../ssr/index.js' // mocks window

import fsp from 'fs/promises'
import fs from 'fs'
import url from 'url'
import path from 'path'
import c from './color.js'

let [
  runtime,
  bin,
  ...argv
] = process.argv

const env = process.env
const shorts = argv.reduce((a, x) => a + (x.length >= 2 && x[0] === '-' && x[1] !== '-' ? x.slice(1) : ''), '')
const longs = argv.filter(x => x.length >= 3 && x[0] === '-' && x[1] === '-')

const command     = env.SIN_COMMAND = getCommand()
const needsEntry  = ['develop', 'start', 'build', 'generate'].includes(command)
const entry       = env.SIN_ENTRY = needsEntry && getEntry()
const local       = env.SIN_LOCAL = getLocal()
const cwd         = env.PWD = env.SIN_PWD = needsEntry ? path.dirname(entry).replace('/+build', '') : process.cwd()

// switch to target dir early and load .env
process.cwd() !== cwd && process.chdir(cwd)
await import('./env.js')

const home        = option('--home', getHome())
const script      = option('script')
const serveStatic = option('static')
const noscript    = option('--noscript')
const debug       = option('--debug')

export default {
  runtime,
  bin,
  home,
  command,
  entry,
  local,
  script,
  serveStatic,
  noscript,
  cwd,
  debug,
  option,
  resolve
}

function getCommand() {
  if (env.SIN_COMMAND)
    return env.SIN_COMMAND

  const commands = {
    b: 'build',
    c: 'create',
    d: 'develop',
    g: 'generate',
    h: 'help',
    p: 'purge',
    r: 'run',
    s: 'start',
    v: 'version',
    i: 'install'
  }

  const alias = {
    prod        : 'start',
    production  : 'start',
    development : 'develop'
  }

  const first = argv[0] in alias && alias[argv[0]] || argv[0] || process.env.SIN_COMMAND
      , help = (argv.some(x => x === '-h' || x === '--help') || argv.length === 0) && 'help'
      , version = argv.some(x => x === '-v' || x === '--version') && 'version'

  return first
    && first[0] in commands
    && commands[first[0]].slice(0, first.length) === first
    && commands[first[0]]
    || help
    || version
}

function getEntry(alt = '', initial) {
  if (process.env.SIN_ENTRY)
    return process.env.SIN_ENTRY

  const x = argv.slice(1).find(x => !'script static'.includes(x) && x[0] !== '-') || ''

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
  } catch (error) {
    if (!alt)
      return getEntry('+build', entry)

    const x = '🚨 Entry file '+  (initial || entry) + ' is not available (' + error.code + ')'
    process.stderr.write(
      '\n ' + c.inverse(' '.repeat(process.stdout.columns - 2)) +
      '\n ' + c.inverse(('   ' + x).padEnd(process.stdout.columns - 2, ' ')) +
      '\n ' + c.inverse(' '.repeat(process.stdout.columns - 2)) + '\n\n'
    )
    process.exit(1)
  }

  return entry
}

function getLocal() {
  if (env.SIN_LOCAL)
    return env.SIN_LOCAL

  const local = path.join(process.cwd(), 'node_modules', 'sin')
  return fs.existsSync(local)
    ? local
    : path.join(url.fileURLToPath(new URL('.', import.meta.url)), '..')
}

export function option(name, fallback, parse = x => x) {
  const envName = 'SIN_' + name.toUpperCase().replace(/^-+/, '').replace(/-/g, '_')
  const value = (longs.find(x => x === name) && name)
             || (shorts.includes(name[2]) && name)
             || (argv.includes(name) && name)
             || process.env[envName]
             || fallback
             || undefined

  return value && parse(process.env[envName] = value)
}

function getHome() {
  const x = env.SIN_HOME || path.join(
    process.platform === 'win32' && env.USER_PROFILE || env.HOME,
    '.sin'
  )
  fs.mkdirSync(x, { recursive: true })
  return x
}

async function resolve() {
  const cwd = process.cwd()
      , hasExport = (await fsp.readFile(entry, 'utf8')).match(/export([\s]+default\s|[\s]*{.*[\s]+as[\s]+default)/)
      , main = hasExport && await import(entry)
      , http = main && typeof main.default === 'function' && main
      , src = !http && !noscript && path.basename(entry)
      , mod = src && (await fsp.stat(path.join(cwd, '+build', src)).catch(() => fsp.stat(path.join(cwd, src)))).mtimeMs.toFixed(0)

  return {
    server: http ? main : (await import(path.join(cwd, '+', 'index.js')).catch(err => err.code === 'ERR_MODULE_NOT_FOUND' ? null : Promise.reject(err))),
    mount: !http && main && main.default,
    src,
    mod
  }
}
