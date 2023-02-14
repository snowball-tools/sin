import path from 'path'
import '../env.js'

const argv = process.argv.slice(2)
const entry = argv.find(x => x[0] !== '-') || ''
const root = path.isAbsolute(entry) ? entry : path.join(process.cwd(), entry)
const file = root.endsWith('.js')

process.chdir(process.env.PWD = file ? path.dirname(root) : root)

const build = (await import('../../build/index.js')).default

await build(
  entry
    ? { entryPoints: [file ? root : path.join(root, 'index.js')] }
    : {}
)
