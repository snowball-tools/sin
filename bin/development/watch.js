import Watcher from '../watcher.js'
import prexit from 'prexit'
import path from 'path'
import fs from 'fs'

export default async function(scripts = {}) {
  const watcher = await Watcher(x => {
    console.log(x, 'Changed - restart') // eslint-disable-line
    prexit.exit(123)
  })

  global.sinLoadedFiles.add = x => x in scripts || watcher.add(x)
  global.sinLoadedFiles.forEach(global.sinLoadedFiles.add)
  global.sinLoadedFiles.remove = watcher.remove

  const env = path.join(process.cwd(), '.env')
  fs.existsSync(env) && watcher.add(path.join(process.cwd(), '.env'))
}
