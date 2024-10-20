import fs from 'node:fs'
import config from '../config.js'

const pkg = JSON.parse(fs.readFileSync('package.json'))
const fields = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies', 'peerDependenciesMeta']
let changed = false

config._.forEach(x => {
  fields.forEach(f => {
    if (pkg[f] && x in pkg[f]) {
      changed = true
      delete pkg[f][x]
    }
  })
})

if (changed) {
  console.log('changed')
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2))
  config._ = []
  await import('../install/index.js')
}
