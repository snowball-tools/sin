import path from 'path'
import fs from 'fs/promises'

const envPath = path.join(process.cwd(), '.env')

await fs.readFile(envPath, 'utf8').then(
  x => x.split('\n').forEach((x, i) => (
    x = x.trim(), i = x.indexOf('='), x && i > 0 && x[0] !== '#' &&
    (process.env[x.slice(0, i)] = x.slice(i + 1))
  )),
  () => {}
)
