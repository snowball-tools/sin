import fs from 'fs'
import fsp from 'fs/promises'
import path from 'path'

import '../env.js'
import ssr from '../../ssr/index.js'
import { wrap } from '../../ssr/shared.js'

const argv = process.argv.slice(2)
    , entry = argv.find(x => x.startsWith('./') || x.endsWith('.js')) || ''
    , root = path.isAbsolute(entry) ? entry : path.join(process.cwd(), entry)
    , file = root.endsWith('.js')
    , rootFile = file ? root : path.join(root, 'index.js')
    , hasEntry = fs.readFileSync(rootFile, 'utf8').indexOf('export default ') !== -1
    , mount = hasEntry ? (await import(rootFile)).default : {}
    , generated = new Set()
    , noscript = argv.some(x => x === '--noscript')

fs.rmSync('+build', { recursive: true, force: true })
fs.mkdirSync('+build', { recursive: true })
noscript || await import('../build/index.js')
const start = performance.now()
fs.cpSync('+public', '+build', { recursive: true, force: true })
await generate()
console.log('Finished generating in', performance.now() - start) // eslint-disable-line

async function generate(location = '/') {
  if (generated.has(location))
    return

  generated.add(location)

  const x = await ssr(mount, {}, { location })
      , indexPath = path.join('+build', ...location.split('/'), 'index.html')

  const html = wrap(x, {
    body: noscript
      ? ''
      : '<script type=module async defer src="/index.js"></script>'
  })

  await fsp.mkdir(path.dirname(indexPath), { recursive: true, force: true })
  await fsp.writeFile(indexPath, html)
  await Promise.all([...x.links].map(generate))
}
