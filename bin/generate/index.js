import fs from 'fs/promises'
import path from 'path'

import '../env.js'
import ssr from '../../ssr/index.js'
import { wrap } from '../../ssr/shared.js'

const argv = process.argv.slice(2)
    , entry = argv.find(x => x[0] !== '-') || ''
    , root = path.isAbsolute(entry) ? entry : path.join(process.cwd(), entry)
    , file = root.endsWith('.js')
    , rootFile = file ? root : path.join(root, 'index.js')
    , hasEntry = (await fs.readFile(rootFile, 'utf8')).indexOf('export default ') !== -1
    , mount = hasEntry ? (await import(rootFile)).default : {}
    , generated = new Set()

argv.every(x => x !== '--noscript') && await import('../build/index.js')
const start = performance.now()
await generate()
console.log('Finished generating in', performance.now() - start)

async function generate(location = '/') {
  if (generated.has(location))
    return

  const x = await ssr(mount, {}, { location })
      , html = wrap(x)
      , indexPath = path.join('+build', ...location.split('/'), 'index.html')

  await fs.mkdir(path.dirname(indexPath), { recursive: true })
  await fs.writeFile(indexPath, html)
  generated.add(location)
  await Promise.all([...x.links].map(generate))
}
