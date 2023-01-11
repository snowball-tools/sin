import path from 'path'
import fs from 'fs'
import '../env.js'

if (!fs.readdirSync(process.cwd()).some(x => x[0] !== '.'))
  await import('../create/index.js')

const argv = process.argv.slice(2)
const abs = (x = './index.js') => x.startsWith('/')
  ? x
  : x.startsWith('./') || x.startsWith('../')
  ? path.join(process.cwd(), x)
  : ('./' + x)

import('./watch.js').then(x => x.default())
import('../log.js')

argv[0] === 'raw'
  ? import(abs(argv[1]))
  : import('./server.js')
