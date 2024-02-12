import cp from 'node:child_process'
import url from 'node:url'

cp.fork(
  url.fileURLToPath(new URL('node.js', import.meta.url)),
  [],
  {
    execArgv: [
      '--import',
      url.fileURLToPath(new URL('import.js', import.meta.url))
    ]
  }
)
