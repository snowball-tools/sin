#! /usr/bin/env node

import path from 'path'
import cp from 'child_process'

import './env.js'

const here = (...xs) => path.join(path.dirname(process.argv[1]), ...xs)
    , command = process.argv[2]

start()

function start() {
  const child = cp.fork(
    here(command, 'index.js'),
    process.argv.slice(2),
    {
      execArgv: [
        '--no-warnings',
        '--experimental-loader', here('/loader.js')
      ]
    }
  )

  child.on('close', code => code === 123 && start())
}
