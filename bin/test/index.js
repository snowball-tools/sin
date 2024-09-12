import fs from 'fs'
import path from 'path'
import config from '../config.js'
import { isScript } from '../shared.js'

config.develop = true
await import('../develop/index.js')
// await run(path.join(process.cwd(), 'tests'))

async function run(root) {
  const folders = fs.readdirSync(root)
  const index = folders.find(x => x.indexOf('index') === 0 && isScript(x.slice(5)))

  index && await import(path.join(root, index))

  for (const f of folders)
    await run(path.join(root, f))
}