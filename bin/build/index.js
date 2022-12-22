import build from '../../build/index.js'

const entry = process.argv.slice(3).find((x, i, xs) => x[0] !== '-' && (xs[i - 1] || '')[0] !== '-')

await build(
  entry
    ? { entryPoints: ['./' + entry] }
    : {}
)
