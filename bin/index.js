#! /usr/bin/env -S node --experimental-websocket --no-warnings

import path from 'path'

import config from './config.js'
import c from './color.js'
import cp from 'child_process'

process.execArgv.includes('--experimental-websocket')
  ? config.command
    ? import(path.join(config.local, 'bin', config.command, 'index.js'))
    : notFound()
  : cp.execFileSync(process.argv[0], ['--experimental-websocket', '--no-warnings', ...process.argv.slice(1)], { stdio: 'inherit' })

function notFound() {
  console.log( // eslint-disable-line
    c.red`
      The command '${
        c.reset(c.bold(process.argv[2]))
      }' was not found - try '${
        c.reset(c.bold`sin help`)
      }'
    `
  )
}
