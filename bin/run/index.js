import cp from 'node:child_process'
import Path from 'node:path'
import fs from 'node:fs'
import prexit from '../prexit.js'

import config from '../config.js'
import c from '../color.js'

const p = console.log // eslint-disable-line

let pkg
let dir = config.cwd
while (!(pkg = await jsonRead(Path.join(dir, 'package.json')))) {
  const next = Path.dirname(dir)
  if (dir === next)
    throw new Error('No package.json found')
  dir = next
}

process.chdir(process.env.PWD = dir)

config._.length === 0
  ? print(pkg)
  : await run(config._, pkg)

function print(pkg) {
  for (const [name, script] of Object.entries(pkg.scripts)) {
    p('  ' + name)
    p('    ' + c.dim(script))
  }
}

async function run(xs, pkg) {
  await Promise.allSettled(xs.map(x => {
    const promise = new Promise((resolve, reject) => {
      const cmd = pkg.scripts[x]
      if (!cmd)
        return reject(new Error('No script found for: ' + x))

      const bins = [Path.join(config.globalDir, 'node_modules', '.bin')]
      let dir = config.cwd
      let prev
      while (dir !== prev) {
        const binDir = Path.join(dir, 'node_modules', '.bin')
        if (fs.existsSync(binDir))
          bins.unshift(binDir)
        prev = dir
        dir = Path.dirname(dir)
      }

      const p = cp.spawn(cmd, [], {
        shell: true,
        stdio: 'inherit',
        env: {
          ...process.env,
          PATH: bins.join(':') + ':' + process.env.PATH
        }
      })

      p.on('close', (code, signal) => code || signal ? reject(code) : resolve())
    })
    prexit(() => promise)
    return promise
  }))
}

function jsonRead(x) {
  try {
    return JSON.parse(fs.readFileSync(x))
  } catch (e) {
    if (e.code === 'ENOENT')
      return null
    throw e
  }
}
