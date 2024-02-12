import { jail } from './shared.js'
import { loader, resolve } from '../hooks.js'

export const load = loader(jail)
export { resolve }
