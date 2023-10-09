import Watcher from '../watcher.js'
import prexit from 'prexit'
import path from 'path'
import fs from 'fs'

watch.loaded = new Set()

export default function watch(scripts = {}) {
  const watcher = Watcher(x => {
    console.log(x, 'Changed - restart') // eslint-disable-line
    prexit.exit(123)
  })

  watch.loaded.add = x => x in scripts || watcher.add(x)
  watch.loaded.forEach(watch.loaded.add)
  watch.loaded.remove = x => watcher.remove(x)

  const env = path.join(process.cwd(), '.env')
  fs.existsSync(env) && watcher.add(env)
}
