/* eslint no-console: 0 */

import fs from 'node:fs'
import path from 'node:path'

import '../../ssr/index.js'
import s from '../../src/index.js'

const depVersion = pkg(
  path.join(
    process.cwd(),
    'node_modules',
    'sin',
    'package.json'
  )
).version

const cliVersion = pkg(
  path.join(
    path.dirname(
      process.argv[1]
    ),
    '..',
    '..',
    'package.json'
  )
).version

cliVersion && console.log('sin cli          v' + cliVersion)
depVersion && console.log('sin dependency   v' + depVersion)

const latestVersion = (await s.http('https://registry.npmjs.org/sin/latest', { timeout: 1000 }).catch(() => ({}))).version
latestVersion && console.log(latestVersion)

function pkg(x) {
  return fs.existsSync(x)
    ? fs.readFileSync(x) && JSON.parse(fs.readFileSync(x))
    : { dependencies: {}, packages: {} }
}
