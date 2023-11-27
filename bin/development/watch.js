import api from './api.js'
import fs from 'fs'
import { Watcher, tryRead, jail } from './shared.js'

const clientWatch = new Set()
    , serverWatch = new Set()
    , watching = new Map()

const watcher = Watcher(changed)

api.watch.observe(async({ path, origin }) => {
  console.log('watch', origin, path)
  origin === 'client'
    ? clientWatch.add(path)
    : serverWatch.add(path)

  if (watching.has(path))
    return watching.get(path)

  const file = { path }
  watching.set(path, file)
  await read(path)
  update(file)
  watcher.add(path)
  return file
})

async function changed(path) {
  const x = await read(path)
  console.log('changed', path, serverWatch.has(path), clientWatch.has(path))
  serverWatch.has(path)
    ? clientWatch.has(path)
      ? both(x)
      : server(x)
    : clientWatch.has(path)
      ? client(x)
      : remove(x)

  update(x)
}

function remove(x) {
  watcher.remove(x)
  clientWatch.delete(x)
  serverWatch.delete(x)
}

function server(x) {
  x.next === x.content
    ? api.restart(x)
    : api.reload(x)
}

function client(x) {
  x.next === x.content
    ? api.refresh(x)
    : api.redraw(x)
}

function both(x) {
  x.next === x.content
    ? x.content === x.pre
      ? (api.restart(x), api.refresh(x))
      : (api.reload(x), api.refresh(x))
    : (api.reload(x), api.redraw(x))
}

async function read(path) {
  const x = watching.get(path)
  x.next = jail(await tryRead(x.path, 'utf8'))
  return x
}

function update(x) {
  x.pre = x.content
  x.content = x.next
  x.next = null
}
