import path from 'node:path'

import '../env.js'
import config from '../config.js'

const argv = process.argv.slice(2)
const entry = argv.find(x => x.startsWith('./') || /\.[jt]sx?$/.test(x)) || ''
const root = path.isAbsolute(entry) ? entry : path.join(process.cwd(), entry)
const file = /\.[jt]sx?$/.test(root)

process.chdir(process.env.PWD = file ? path.dirname(root) : root)

const build = (await import('../../build/index.js')).default

await build(
  entry && file
    ? { entryPoints: [root], config }
    : { config }
)

console.log('Finished in', performance.now()) // eslint-disable-line
