import fs from 'fs'
import path from 'path'

import api from '../development/api.js'
import c from '../color.js'

const all = process.argv.some(x => x === 'all')

const xs = all
  ? fs.readdirSync(api.home).filter(x => fs.statSync(path.join(api.home, x)).isDirectory())
  : [api.project]

for (const x of xs) {
  process.stdout.write('Clear ' + x + ' ' + c.gray('(' + path.join(api.home, x) + ')') + ' ...\n')
  fs.rmSync(path.join(api.home, x), { recursive: true, force: true }).catch(() => {})
  process.stdout.write('Done\n')
}
