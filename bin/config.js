import fs from 'fs'
import url from 'url'
import path from 'path'

const argv = process.argv.slice(2)
const env = process.env

const command  = env.SIN_COMMAND  = getCommand()
const entry    = env.SIN_ENTRY    = getEntry()
const bin      = env.SIN_BIN      = getBin()
const raw      = env.SIN_RAW      = argv.some(x => x === 'raw') || ''
const noscript = env.SIN_NOSCRIPT = argv.some(x => x === 'noscript') || ''
const cwd      = env.PWD          = path.dirname(entry)

process.cwd() !== cwd && process.chdir(cwd)

export default {
  command,
  entry,
  bin,
  raw,
  noscript,
  cwd
}

function getCommand() {
  const commands = {
    b: 'build',
    c: 'create',
    d: 'development',
    g: 'generate',
    h: 'help',
    p: 'purge',
    r: 'run',
    s: 'start',
    v: 'version',
    i: 'install'
  }

  const first = argv[0] || ''
      , help = (argv.some(x => x === '-h' || x === '--help') || argv.length === 0) && 'help'
      , version = argv.some(x => x === '-v' || x === '--version') && 'version'

  return first
    && first[0] in commands
    && commands[first[0]].slice(0, first.length) === first
    && commands[first[0]]
    || help
    || version
}

function getEntry() {
  const entry = argv.slice(1).find(x => !'ssr raw server'.includes(x) && x[0] !== '-') || ''

  return path.isAbsolute(entry)
    ? entry
    : path.join(
      process.cwd(),
      entry !== path.basename(process.cwd()) && fs.existsSync(entry + '.js')
        ? entry + '.js'
        : entry !== path.basename(process.cwd())
          ? path.join(entry, entry.endsWith('.js') ? '' : 'index.js')
          : 'index.js'
    )
}

function getBin() {
  const local = path.join(process.cwd(), 'node_modules', 'sin', 'bin')

  return fs.existsSync(local)
    ? local
    : url.fileURLToPath(new URL('.', import.meta.url))
}
