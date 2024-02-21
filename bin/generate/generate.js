import fs from 'node:fs/promises'
import path from 'node:path'
import ssr from '../../ssr/index.js'
import { wrap } from '../../ssr/shared.js'

import config, { resolve } from '../config.js'

const generated = new Set()
    , { mount } = await resolve()

let files = 0
await fs.rm('+build', { recursive: true, force: true })
await fs.mkdir('+build', { recursive: true })
config.noscript || await import('../build/index.js')
const start = performance.now()
await fs.cp('+public', '+build', { recursive: true, force: true })
await generate()
console.log('Finished generating', files, 'files in', (performance.now() - start).toFixed(1) + 'ms') // eslint-disable-line
process.exit(process.exitCode)

async function generate(location = '/') {
  if (generated.has(location))
    return

  generated.add(location)
  const x = await ssr(mount, {}, { location })
      , indexPath = path.join('+build', ...location.split('/'), 'index.html')

  const html = wrap(x, {
    body: config.noscript ? '' : '<script type=module async defer src="/index.js"></script>'
  })

  await fs.mkdir(path.dirname(indexPath), { recursive: true, force: true })
  await fs.writeFile(indexPath, html)
  files++
  await Promise.all([...x.links].map(generate))
}
