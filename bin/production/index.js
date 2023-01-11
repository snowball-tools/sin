import path from 'path'
import '../env.js'

const argv = process.argv.slice(2)
const abs = (x = './index.js') => x.startsWith('/')
  ? x
  : x.startsWith('./') || x.startsWith('../')
  ? path.join(process.cwd(), x)
  : ('./' + x)

argv[0] === 'raw'
  ? import(abs(argv[1]))
  : import('./server.js')
