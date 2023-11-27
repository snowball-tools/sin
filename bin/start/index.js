import config from './config.js'

import '../env.js'
import { Worker } from 'worker_threads'

const url = config.raw
  ? config.entry
  : './server.js'

if (config.workers > 1) {
  for (let i = 0; i < config.workers; i++)
    new Worker(new URL(url, import.meta.url), { argv }) // eslint-disable-line
} else {
  import(url)
}
