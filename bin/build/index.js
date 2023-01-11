import build from '../../build/index.js'
import '../env.js'

const entry = process.argv.slice(2).find((x, i, xs) => x[0] !== '-' && (xs[i - 1] || '')[0] !== '-')

await build(
  entry
    ? { entryPoints: ['./' + entry] }
    : {}
)
