import fs from 'fs/promises'
import path from 'path'

import ssr from '../../ssr/index.js'
import { wrap } from '../../ssr/shared.js'

const j = (...xs) => path.join('.build', ...xs.flatMap(x => x.split('/')))
    , entry = process.argv[3] || 'index.js'
    , absEntry = path.isAbsolute(entry) ? entry : path.join(process.cwd(), entry)
    , hasEntry = (await fs.readFile(absEntry, 'utf8')).indexOf('export default ') !== -1
    , mount = hasEntry ? (await import(absEntry)).default : {}
    , generated = new Set()

await start()
console.log('Done') // eslint-disable-line

async function start(location = '/') {
  if (generated.has(location))
    return

  const x = await ssr(mount, {}, { location })
      , html = wrap(x)
      , fp = j(location, 'index.html')

  await fs.mkdir(path.dirname(fp), { recursive: true })
  await fs.writeFile(fp, html)
  generated.add(location)
  await Promise.all([...x.links].map(start))
}
