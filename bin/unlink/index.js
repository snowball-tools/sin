import fs from 'node:fs/promises'

import config from '../config.js'

config.remove = true
if (config._.length === 0) {
  const pkg = JSON.parse(await fs.readFile('package.json'))
  config.global = true
  config._ = [pkg.name]
}

await import('../remove/index.js')
