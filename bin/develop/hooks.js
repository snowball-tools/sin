import { modify } from './shared.js'
import { loader, resolve } from '../hooks.js'

export const load = loader(modify)
export { resolve }
