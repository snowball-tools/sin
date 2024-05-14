import './log.js'
import '../../ssr/index.js'

import './print.js'
import './watch.js'

import config from './config.js'
import api from './api.js'

await import('./tools/server.js')
await import('./node.js')

config.live && await import('./live.js')
config.script || config.nochrome || await import('./chrome.js')

api.log({ value: '🔥 ' + api.url })
