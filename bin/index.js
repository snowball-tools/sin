#! /usr/bin/env -S node --expose-internals --no-warnings

/* eslint no-console: 0 */

import path from 'path'
import fs from 'fs'
import url from 'url'

import s from './style.js'

const argv = process.argv.slice(2)

const commands = {
  b: 'build',
  c: 'create',
  d: 'development',
  g: 'generate',
  h: 'help',
  p: 'purge',
  r: 'run',
  s: 'start',
  v: 'version'
}

const first = argv[0] || ''
const help = (argv.some(x => x === '-h' || x === '--help') || argv.length === 0) && 'help'
const version = argv.some(x => x === '-v' || x === '--version') && 'version'

const command = first
  && first[0] in commands
  && commands[first[0]].slice(0, first.length) === first
  && commands[first[0]]
  || help
  || version

command
  ? start()
  : notFound()

function start() {
  const local = path.join(process.cwd(), 'node_modules', 'sin', 'bin')
      , here = fs.existsSync(local) ? local : url.fileURLToPath(new URL('.', import.meta.url))

  import(path.join(here, command, 'index.js'))
}

function notFound() {
  console.log(
    'The command `' + s.bold(first) + '`',
    'was not found - try `' + s.bold`sin help` + '`'
  )
}
