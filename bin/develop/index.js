import './log.js'
import '../../ssr/index.js'

import './print.js'
import './watch.js'

import config from './config.js'
import api from './api.js'

await import('./tools/server.js')
const node = (await import('./node.js'))

config.live && await import('./live.js')
config.script || config.nochrome || node.onlyServer || await import('./chrome.js')

api.log('🔥 ' + api.url)
