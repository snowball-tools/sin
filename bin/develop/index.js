import './log.js'
import './print.js'
import './watch.js'

import config from './config.js'

await import('./tools/server.js')
await import('./node.js')
config.live && await import('./live.js')
config.script || config.noBrowser || await import('./chrome.js')
