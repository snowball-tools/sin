import api from './api.js'
import { Watcher, tryRead } from './shared.js'

const browserWatch = new Set()
    , nodeWatch = new Set()
    , watching = new Map()

const watcher = Watcher(changed)

api.node.watch.observe(x => watch(x, nodeWatch))
api.browser.watch.observe(x => watch(x, browserWatch))

async function watch(path, origin) {
  origin.add(path)
  if (watching.has(path))
    return watching.get(path)

  const file = { path }
  watching.set(path, file)
  await read(path)
  update(file)
  watcher.add(path)
  return file
}

async function changed(path) {
  const x = await read(path)
  nodeWatch.has(path)
    ? browserWatch.has(path)
      ? both(x)
      : node(x)
    : browserWatch.has(path)
      ? browser(x)
      : remove(x)

  update(x)
}

function remove(x) {
  watcher.remove(x)
  browserWatch.delete(x)
  nodeWatch.delete(x)
}

function node(x) {
  x.next === x.content
    ? api.node.restart(x)
    : api.node.hotload(x)
}

function browser(x) {
  x.next === x.content
    ? api.browser.reload(x)
    : api.browser.hotload(x)
}

function both(x) {
  x.next === x.content
    ? x.content === x.pre
      ? (api.node.restart(x), api.browser.reload(x))
      : (api.node.hotload(x), api.browser.reload(x))
    : (api.node.hotload(x), api.browser.hotload(x))
}

async function read(path) {
  const x = watching.get(path)
  x.next = await tryRead(x.path, 'utf8')
  return x
}

function update(x) {
  x.pre = x.content
  x.content = x.next
  x.next = null
}
