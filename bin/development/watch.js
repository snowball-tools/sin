import chokidar from 'chokidar'
import prexit from 'prexit'

const watcher = chokidar.watch([], {
  disableGlobbing: true,
  cwd: process.cwd(),
  persistent: process.platform === 'darwin'
})

watcher.on('change', x => {
  console.log(x, 'Changed - restart') // eslint-disable-line
  prexit.exit(123)
})

global.sinLoadedFiles.forEach(add)
global.sinLoadedFiles.add = add

function add(x) {
  watcher.add(x)
}
