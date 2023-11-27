import os from 'os'

import config from './config.js'

process.env.NODE_ENV = 'production'

export default {
  ...config,
  workers: workers()
}

function workers() {
  const argv = process.argv.slice(2)
  const hasWorkers = argv.find((_, i) => argv[i - 1] === '--workers') || process.env.SIN_WORKERS

  return hasWorkers
    ? hasWorkers === 'cpus'
      ? os.cpus().length
      : parseInt(hasWorkers)
    : 1
}
