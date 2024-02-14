import path from 'node:path'
import fs from 'node:fs'

try {
  fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8').split('\n').forEach((x, i) => (
    x = x.trim(), i = x.indexOf('='), x && i > 0 && x[0] !== '#' &&
    (process.env[x.slice(0, i)] = x.slice(i + 1))
  ))
} catch (err) {
  if (err.code !== 'ENOENT')
    throw err
}
