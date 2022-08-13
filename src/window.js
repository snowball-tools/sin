import { isServer } from './shared.js'

typeof globalThis === 'undefined' && (window.globalThis = window)

export default isServer ? {} : window
