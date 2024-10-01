#! /usr/bin/env node

import path from 'node:path'
import URL from 'node:url'

import prexit from './prexit.js'
import config, { error } from './config.js'
import cp from 'child_process'

const [major, minor] = process.versions.node.split('.').map(Number)

if (major < 20 || major === 20 && minor <= 10)
  throw error('Sins minimum Node.js support is 20.11, please upgrade')

try {
  if (config.develop && major < 22 && !process.execArgv.includes('--experimental-websocket')) {
    const x = cp.spawnSync(process.argv[0], ['--experimental-websocket', '--no-warnings', ...process.argv.slice(1)], { stdio: 'inherit' })
    process.exitCode = x.status
  } else {
    await import(URL.pathToFileURL(path.join(config.local, 'bin', config.$[0], 'index.js')))
  }
  config.config && console.log(config) // eslint-disable-line
  prexit.exit()
} catch (e) {
  config.config && console.log(config) // eslint-disable-line
  config.debug
    ? console.error(e)
    : error(e) // eslint-disable-line
  prexit.exit(1)
}
