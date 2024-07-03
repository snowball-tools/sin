import path from 'node:path'
import fs from 'node:fs'

Object.assign(process.env, load(process.env.SIN_ENV))

export default function load(env = path.join(process.cwd(), '.env'), depth=0) {
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
  if (xs.SIN_ENV && depth === 0) {
    console.log("Loading SIN_ENV", xs.SIN_ENV)
    return load(xs.SIN_ENV, depth + 1)
  }
  return xs
}
