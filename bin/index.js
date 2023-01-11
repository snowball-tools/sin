#! /usr/bin/env node

/* eslint no-console: 0 */

import path from 'path'
import cp from 'child_process'
import fs from 'fs'
import url from 'url'
import prexit from 'prexit'

import s from './style.js'

const argv = process.argv.slice(2)
    , local = path.join(process.cwd(), 'node_modules', 'sin', 'bin')
    , here = fs.existsSync(local) ? local : url.fileURLToPath(new URL('.', import.meta.url))
    , commands = fs.readdirSync(here).filter(x => fs.existsSync(path.join(here, x, 'index.js')))
    , help = (argv.some(x => x === '-h' || x === '--help') || argv.length === 0) && 'help'
    , version = argv.some(x => x === '-v' || x === '--version') && 'version'
    , command = commands.find(x => argv[0] && x.startsWith(argv[0].toLowerCase())) || help || version

command
  ? start()
  : console.log('\nThe command `' + s.bold(argv[0]) + '` was not found - see `' + s.bold`sin help` + '` for usage\n')

function start() {
  const child = cp.fork(
    path.join(here, command, 'index.js'),
    argv.slice(1),
    {
      cwd: process.cwd(),
      execArgv: [
        '--no-warnings',
        '--experimental-loader', path.join(here, '/loader.js')
      ]
    }
  )

  prexit('SIGINT', () => process.exitCode = 0)
  child.on('close', code => code === 123 && start())
}
