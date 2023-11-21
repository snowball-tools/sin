import path from 'path'
import fs from 'fs'

const start = Date.now()

export default function Watcher(fn) {
  const watched = new Map()

  return {
    add,
    remove
  }

  function add(x) {
    x = normalize(x)
    if (watched.has(x))
      return

    try {
      const watcher = fs.watch(x, { persistent: false }, t => {
        t === 'rename'
          ? readd(x, watcher)
          : changed(x, watcher)
      })
      watched.set(x, watcher)
      return watcher
    } catch (e) {
      // noop - watch is best effort
    }
  }

  function readd(x, watcher) {
    const time = watcher.time
    remove(x)
    setTimeout(() => {
      const watcher = add(x)
      if (watcher) {
        watcher.time = time
        changed(x, watcher)
      }
    }, 20)
  }

  function remove(x) {
    x = normalize(x)
    if (!watched.has(x))
      return
    const watcher = watched.get(x)
    watcher.close()
    watched.delete(x)
  }

  function normalize(x) {
    return path.isAbsolute(x) ? x : path.join(process.cwd(), x)
  }

  function changed(x, watcher, t) {
    const time = modified(x)
    if ((watcher.time && time - watcher.time < 5) || start > time)
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
