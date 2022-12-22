import path from 'path'
import fs from 'fs'
import prexit from 'prexit'
import chokidar from 'chokidar'

const watch = ['watch', 'dev'].includes(process.argv[2])
const watcher = watch && chokidar
  .watch([], { disableGlobbing: true, cwd: process.cwd() })
  .on('change', (x) => {
    console.log(x, 'Changed - restart') // eslint-disable-line
    prexit.exit(123)
  })

watch && import('./log.js')
watch && watcher.add(process.argv[1])

export async function resolve(specifier, context, nextResolve) {
  if (specifier.charCodeAt(0) === 47 && specifier.indexOf(process.cwd()) !== 0) { // /
    specifier = extensionless(path.join(process.cwd(), specifier))
  } else if (specifier.charCodeAt(0) === 46 && specifier.charCodeAt(1) === 47) { // . /
    specifier = extensionless(path.join(path.dirname(context.parentURL), specifier))
  }

  if (watch && (specifier.startsWith('/') || specifier.startsWith('./')))
    watcher.add(specifier)

  return nextResolve(specifier, context)
}

function extensionless(x) {
  x.indexOf('file:') === 0 && (x = x.slice(5))
  return path.extname(x) ? x
    : canRead(path.join(x, 'index.js')) ? x + '/index.js'
    : canRead(x + '.js') ? x + '.js'
    : x
}

function canRead(x) {
  try {
    return fs.statSync(x).isFile()
  } catch (_) {
    return
  }
}
