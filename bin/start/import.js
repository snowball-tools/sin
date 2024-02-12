import '../../ssr/index.js'
import { register } from 'node:module'

register('./hooks.js', import.meta.url)
