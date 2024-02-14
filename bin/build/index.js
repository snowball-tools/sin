import path from 'node:path'

import '../env.js'

const argv = process.argv.slice(2)
const entry = argv.find(x => x.startsWith('./') || /\.[jt]s$/.test(x)) || ''
const root = path.isAbsolute(entry) ? entry : path.join(process.cwd(), entry)
const file = /\.[jt]s$/.test(root)

process.chdir(process.env.PWD = file ? path.dirname(root) : root)

const build = (await import('../../build/index.js')).default

await build(
  entry && file
    ? { entryPoints: [root] }
    : {}
)

console.log('Finished in', performance.now())
