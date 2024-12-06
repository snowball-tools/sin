import fs from 'node:fs/promises'
import Path from 'node:path'
import config from '../config.js'

const root = config.global ? config.globalDir : config.cwd
const pkg = JSON.parse(await fs.readFile(Path.join(root, 'package.json')).catch(() => 'null'))
const fields = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies', 'peerDependenciesMeta']
let changed = false

config._.forEach(x => {
  fields.forEach(f => {
    if (pkg && pkg[f] && x in pkg[f]) {
      changed = true
      delete pkg[f][x]
    }
  })
})

if (changed) {
  pkg && await fs.writeFile(Path.join(root, 'package.json'), JSON.stringify(pkg, null, 2))
  config._ = []
  await import('../install/index.js')
}
