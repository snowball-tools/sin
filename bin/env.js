import path from 'node:path'
import fs from 'node:fs'

export default function load(env = path.join(process.cwd(), '.env')) {
  const xs = {}
  try {
    fs.readFileSync(env, 'utf8').split('\n').forEach((x, i) => (
      x = x.trim(), i = x.indexOf('='), x && i > 0 && x[0] !== '#' &&
      (xs[x.slice(0, i)] = x.slice(i + 1))
    ))
  } catch (err) {
    if (err.code !== 'ENOENT')
      throw err
  }
  return xs
}
