#! /usr/bin/env node

import path from 'node:path'
import URL from 'node:url'

import config, { error } from './config.js'
import cp from 'child_process'

try {
  process.execArgv.includes('--experimental-websocket')
    ? await import(URL.pathToFileURL(path.join(config.local, 'bin', config.$[0], 'index.js')))
    : cp.execFileSync(process.argv[0], ['--experimental-websocket', '--no-warnings', ...process.argv.slice(1)], { stdio: 'inherit' })
  config.debug && console.log(config) // eslint-disable-line
} catch (e) {
  config.debug && console.log(config) // eslint-disable-line
  const [major, minor] = process.versions.node.split('.').map(Number)

  if (major < 20 || major === 20 && minor < 10) {
    error('The minimum Node.js runtime for Sin is 20.10, please upgrade your environment')
  } else {
    error('Unable to start sin, check error messages above')
  }
}
