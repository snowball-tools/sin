import './log.js'
import '../../ssr/index.js'
import inspector from 'node:inspector'
import { register } from 'node:module'

globalThis.console = inspector.console

register('./hooks.js', import.meta.url)
