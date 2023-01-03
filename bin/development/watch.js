import chokidar from 'chokidar'
import prexit from 'prexit'

const cwd = process.cwd()

export default function(scripts = {}) {
  const watcher = chokidar.watch([], {
    disableGlobbing: true,
    cwd,
    persistent: process.platform === 'darwin'
  })

  watcher.on('change', x => {
    console.log(x, 'Changed - restart') // eslint-disable-line
    prexit.exit(123)
  })

  global.sinLoadedFiles.add = x => x in scripts || watcher.add(x)
  global.sinLoadedFiles.forEach(global.sinLoadedFiles.add)
  global.sinLoadedFiles.unwatch = x => watcher.unwatch(x)
}
