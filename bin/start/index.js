import cp from 'node:child_process'
import url from 'node:url'

process.env.NODE_ENV = 'production'

cp.fork(
  url.fileURLToPath(new URL('node.js', import.meta.url)),
  process.argv.slice(2),
  {
    execArgv: [
      '--import',
      url.fileURLToPath(new URL('import.js', import.meta.url))
    ]
  }
)
