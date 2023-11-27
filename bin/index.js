#! /usr/bin/env -S node --experimental-websocket --no-warnings

import path from 'path'

import config from './config.js'
import s from './style.js'

console.log(config)
config.command
  ? import( path.join(config.bin, config.command, 'index.js'))
  : console.log('The command `' + s.bold(process.argv[2]) + '`', 'was not found - try `' + s.bold`sin help` + '`')
