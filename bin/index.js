#! /usr/bin/env node

/* eslint no-console: 0 */

import path from 'path'
import cp from 'child_process'
import fs from 'fs'
import url from 'url'
import prexit from 'prexit'
import readline from 'readline'

import s from './style.js'

let retries = 0
  , sigint
  , timeout
  , timer
  , child

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

command === 'development'
  ? process.on('SIGINFO', restart)
  : prexit(signal => child && child.exitCode !== null && (process.exitCode = child.exitCode))

function start() {
  clearTimeout(timer)
  child = cp.fork(
    path.join(here, command, 'index.js'),
    argv.slice(1),
    {
      cwd: process.cwd(),
      execArgv: [
        '--no-warnings',
        '--experimental-loader', url.pathToFileURL(path.join(here, '/loader.js'))
      ]
    }
  )

  if (command !== 'development')
    return

  const resetTimer = setTimeout(() => retries = 0, timeout)
  child.on('close', code => {
    child = null
    clearTimeout(resetTimer)
    if (code === 123) // watch fired, start immidiately
      return start()

    timeout = Math.min(Math.pow(1.5, ++retries) * 1000, 1000 * 60)
    if (sigint || !code) {
      console.log(
        code ? '⛔️' : '✅',
        'Closed with code: ' + s.bold(code)
      )
      process.stdin.destroy()
    } else {
      console.log(`⛔️ Closed with code: ${ s.bold(code) } - restarting in ${ s.bold((timeout / 1000).toFixed(2)) }s`)
      timer = setTimeout(start, timeout)
    }
  })
}

if (command === 'development' && process.stdin.isTTY) {
  readline.emitKeypressEvents(process.stdin)
  process.stdin.setRawMode(true)
  process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name === 'c') {
      if (sigint) {
        console.log(`⛔️ Force closed`)
        return process.exit(1)
      }
      sigint = true
      child && child.kill('SIGINT')
    } else if (key.name === 'r' || (key.ctrl && key.name === 't')) {
      restart()
    }
  })
}

function restart() {
  retries = 0
  child
    ? child.kill('SIGHUP')
    : start()
}
