import { Worker } from 'worker_threads'

import '../env.js'
import config from './config.js'

const url = config.script
  ? config.entry
  : './serve.js'

await import(url)

const Acme = config.acme && await import('./acme.js').then(x => x.default)

for (let i = 1; i < (config.workers || 0); i++) {
  const worker = new Worker(new URL(url, import.meta.url), { argv: process.argv }) // eslint-disable-line
  config.acme && worker.on('message', x => x.acme && worker.postMessage({
    acme: x.acme,
    content: Acme.challenges.get(x.challenge)
  }))
}
