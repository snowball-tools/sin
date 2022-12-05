#! /usr/bin/env node

import fs from 'fs/promises'
import path from 'path'
import cp from 'child_process'

const envPath = path.join(process.cwd(), '.env')

await fs.readFile(envPath, 'utf8').then(
  x => x.split('\n').forEach((x, i) => (
    x = x.trim(), i = x.indexOf('='), x && i > 0 && x[0] !== '#' &&
    (process.env[x.slice(0, i)] = x.slice(i + 1))
  )),
  () => {}
)

const here = (...xs) => path.join(path.dirname(process.argv[1]), ...xs)

cp.fork(here(process.argv[2], 'index.js'), process.argv.slice(2), {
  execArgv: [
    process.argv[2] === 'dev' && '--watch',
    '--no-warnings',
    '--experimental-loader', here('/loader.js')
  ].filter(x => x)
})
