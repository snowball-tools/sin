import path from 'path'
import fs from 'fs'

export default async function Watcher(fn) {
  const watched = new Map()

  return {
    add(x) {
      x = normalize(x)
      if (watched.has(x))
        return

      const watcher = fs.watch(x, { persistent: false }, t => changed(x, watcher))
      watched.set(x, watcher)
    },
    remove(x) {
      x = normalize(x)
      if (!watched.has(x))
        return
      const watcher = watched.get(x)
      watcher.close()
      watched.delete(x)
    }
  }

  function normalize(x) {
    return path.isAbsolute(x) ? x : path.join(process.cwd(), x)
  }

  function changed(x, watcher) {
    const time = modified(x)
    if (time === watcher.time)
      return

    watcher.time = time
    fn(x)
  }

}

function modified(x) {
  try {
    return fs.statSync(x).mtimeMs
  } catch (error) {
    return Math.random()
  }
}
