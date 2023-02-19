import path from 'path'
import '../env.js'

const argv = process.argv.slice(2)
const entry = argv.find(x => x.startsWith('./') || x.endsWith('.js')) || ''
const root = path.isAbsolute(entry) ? entry : path.join(process.cwd(), entry)
const file = root.endsWith('.js')

process.chdir(process.env.PWD = file ? path.dirname(root) : root)

argv[0] === 'raw'
  ? import(file ? root : path.join(root, 'index.js'))
  : import('./server.js')
