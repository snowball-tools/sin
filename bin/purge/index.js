import fs from 'fs'
import path from 'path'

import config from '../develop/config.js'
import c from '../color.js'

const all = process.argv.some(x => x === 'all')

const xs = all
  ? fs.readdirSync(config.home).filter(x => fs.statSync(path.join(config.home, x)).isDirectory())
  : [config.project]

for (const x of xs) {
  process.stdout.write('Clear ' + x + ' ' + c.gray('(' + path.join(config.home, x) + ')') + ' ...\n')
  fs.rmSync(path.join(config.home, x), { recursive: true, force: true }).catch(() => {})
  process.stdout.write('Done\n')
}
