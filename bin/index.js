#! /usr/bin/env node
/* eslint no-console: 0 */

import path from 'path'
import cp from 'child_process'
import fs from 'fs'
import s from './style.js'

import './env.js'

const argv = process.argv
    , here = path.dirname(argv[1])
    , commands = fs.readdirSync(here).filter(x => fs.existsSync(path.join(here, x, 'index.js')))
    , help = (argv.slice(2).some(x => x === '-h' || x === '--help') || argv.length === 2) && 'help'
    , version = argv.slice(2).some(x => x === '-v' || x === '--version') && 'version'
    , command = commands.find(x => argv[2] && x.startsWith(argv[2].toLowerCase())) || help || version

command
  ? start()
  : console.log('\nThe command `' + s.bold(argv[2]) + '` was not found - see `' + s.bold`sin help` + '` for usage\n')

function start() {
  const child = cp.fork(
    path.join(here, command, 'index.js'),
    process.argv.slice(3),
    {
      execArgv: [
        '--no-warnings',
        '--experimental-loader', path.join(here, '/loader.js')
      ]
    }
  )

  child.on('close', code => code === 123 && start())
}
