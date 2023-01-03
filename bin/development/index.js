import path from 'path'
import('../log.js')

const argv = process.argv.slice(2)
const abs = (x = './index.js') => x.startsWith('/')
  ? x
  : x.startsWith('./') || x.startsWith('../')
  ? path.join(process.cwd(), x)
  : ('./' + x)

import('./watch.js')

argv[0] === 'raw'
  ? import(abs(argv[1]))
  : import('./server.js')
