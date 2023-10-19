import { register } from 'node:module'
import { MessageChannel } from 'node:worker_threads'

if (process.argv[1].endsWith('/development/index.js')) {
  const { default: watch } = await import('./development/watch.js')
  const { port1, port2 } = new MessageChannel()

  globalThis.sinLoader = port1
  port1.on('message', xs => xs.forEach(x => watch.loaded.add(x)))
  register('./hooks.js', {
    parentURL: import.meta.url,
    data: port2,
    transferList: [port2],
  })
} else {
  register('./hooks.js', import.meta.url)
}
