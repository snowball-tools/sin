import './log.js'
import './print.js'
import './watch.js'

import config from '../config.js'

await import('./tools/server.js')
await import('./node.js')
config.raw || await import('./chrome.js')
