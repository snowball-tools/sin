import path from 'path'
import nsfw from 'nsfw'

export default async function Watcher(fn) {
  const watched = new Map()

  return {
    add(x) {
      x = normalize(x)
      if (watched.has(x))
        return

      const promise = nsfw(x, changed, { debounceMS: 50 })
      watched.set(x, promise)
      promise.then(watcher => (watcher.start(), watched.set(x, watcher)))
    },
    async remove(x) {
      x = normalize(x)
      if (!watched.has(x))
        return

      const watcher = watched.get(x)
      watched.delete(x)
      ;(await watcher).stop()
    }
  }

  function changed(xs) {
    xs.forEach(x => {
      const file = path.join(x.directory, x.file)
      x.action === 2 && watched.has(file) && fn(file)
    })
  }

  function normalize(x) {
    return x[0] === '/' ? x : path.join(process.cwd(), x)
  }
}
