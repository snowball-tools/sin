import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'

import '../env.js'
import ssr from '../../ssr/index.js'
import { wrap } from '../../ssr/shared.js'

import config, { resolve } from '../config.js'

const generated = new Set()
    , { mount } = await resolve()

fs.rmSync('+build', { recursive: true, force: true })
fs.mkdirSync('+build', { recursive: true })
config.noscript || await import('../build/index.js')
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
    body: config.noscript ? '' : '<script type=module async defer src="/index.js"></script>'
  })

  await fsp.mkdir(path.dirname(indexPath), { recursive: true, force: true })
  await fsp.writeFile(indexPath, html)
  await Promise.all([...x.links].map(generate))
}
