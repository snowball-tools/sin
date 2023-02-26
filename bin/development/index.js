import path from 'path'
import fs from 'fs'
import '../env.js'

process.env.NODE_ENV='development'

if (!fs.readdirSync(process.cwd()).some(x => x[0] !== '.'))
  await import('../create/index.js')

const argv = process.argv.slice(2)
const entry = argv.find(x => x.startsWith('./') || x.endsWith('.js')) || ''
const root = path.isAbsolute(entry) ? entry : path.join(process.cwd(), entry)
const file = root.endsWith('.js')

process.chdir(process.env.PWD = file ? path.dirname(root) : root)

await import('./watch.js').then(x => x.default())
await import('../log.js')

argv[0] === 'raw'
  ? import(file ? root : path.join(root, 'index.js'))
  : import('./server.js')
