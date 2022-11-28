import fs from 'fs/promises'
import path from 'path'

const envPath = path.join(process.cwd(), '.env')

await fs.readFile(envPath, 'utf8').then(
  x => x.split('\n').forEach((x, i) => (
    x = x.trim(), i = x.indexOf('='), x && i > 0 && x[0] !== '#' &&
    (process.env[x.slice(0, i)] = x.slice(i + 1))
  )),
  () => {}
)

;({
  dev: () => import('./dev/index.js'),
  prod: () => import('./prod/index.js'),
  build: async() => (await import('../build/index.js')).default({}),
  generate: () => import('./generate/index.js')
})[process.argv[2]]()
