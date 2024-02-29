#! /usr/bin/env -S node --no-warnings

import path from 'node:path'

import config, { error } from './config.js'
import cp from 'child_process'

try {
  process.execArgv.includes('--experimental-websocket')
    ? import(path.join(config.local, 'bin', config.$[0], 'index.js'))
    : cp.execFileSync(process.argv[0], ['--experimental-websocket', '--no-warnings', ...process.argv.slice(1)], { stdio: 'inherit' })
} catch (e) {
  if (process.versions.node.split('.')[0] < 20) {
    error('The minimum Node.js runtime for Sin is 20, please upgrade your environment')
  } else {
    error('Unable to start sin, check error messages above')
  }
}
