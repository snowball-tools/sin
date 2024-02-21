import cp from 'node:child_process'
import url from 'node:url'

cp.fork(
  url.fileURLToPath(new URL('generate.js', import.meta.url)),
  process.argv.slice(2),
  {
    execArgv: [
      '--import',
      url.fileURLToPath(new URL('../start/import.js', import.meta.url))
    ]
  }
)
