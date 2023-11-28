#! /usr/bin/env -S node --experimental-websocket --no-warnings

import path from 'path'

import config from './config.js'
import c from './color.js'

config.command
  ? import( path.join(config.bin, config.command, 'index.js'))
  : notFound()

function notFound() {
  console.log(c.red`
    The command '${
      c.reset(c.bold(process.argv[2]))
    }' was not found - try '${
      c.reset(c.bold`sin help`)
    }'
  `
  )
}
