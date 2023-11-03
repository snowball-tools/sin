import path from 'path'
import fs from 'fs'
import '../env.js'

process.env.NODE_ENV='development'

if (!fs.readdirSync(process.cwd()).some(x => x[0] !== '.'))
  await import('../create/index.js')

const argv = process.argv.slice(2)
const entry = argv.find(x => !'clear ssr raw server'.includes(x) && x[0] !== '-') || ''

const root = process.env.SIN_ENTRY = path.isAbsolute(entry)
  ? entry
  : path.join(process.cwd(),
    entry !== path.basename(process.cwd()) && fs.existsSync(entry + '.js')
      ? entry + '.js'
      : entry !== path.basename(process.cwd())
        ? path.join(entry, entry.endsWith('.js') ? '' : 'index.js')
        : 'index.js'
  )

await import('./watch.js').then(x => x.default())
await import('../log.js')

argv[0] === 'raw'
  ? import(root)
  : import('./server.js')
