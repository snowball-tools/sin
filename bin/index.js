#! /usr/bin/env -S node --experimental-websocket --no-warnings

import path from 'node:path'

import config from './config.js'
import cp from 'child_process'

process.execArgv.includes('--experimental-websocket')
  ? import(path.join(config.local, 'bin', config.$[0], 'index.js'))
  : cp.execFileSync(process.argv[0], ['--experimental-websocket', '--no-warnings', ...process.argv.slice(1)], { stdio: 'inherit' })
