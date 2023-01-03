import fs from 'fs'
import cp from 'child_process'
import path from 'path'
import readline from 'readline'

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

const argv = process.argv.slice(2)
    , cwd = process.cwd()
    , xs = fs.readdirSync(cwd)
    , empty = !xs.some(x => x[0] !== '.')
    , yes = argv.some(x => x === '-y' || x === '--yes')
    , name = argv.find(x => x[0] !== '-') || (empty ? path.basename(cwd) : (await ask('Project name?')))
    , target = empty ? cwd : path.join(cwd, name)
    , cd = target !== cwd
    , pkg = JSON.parse(fs.readFileSync(new URL('package.json', import.meta.url)))
    , server = await prompt('Server?')
    , client = await prompt('Client?')
    , ssr = await prompt('SSR?')

pkg.name = name

mk(target)
process.chdir(target)

if (server && client) {
  pkg.scripts.start = 'sin start'
  pkg.scripts.dev = 'sin dev'
  mk(path.join(target, '+'), 'index.js', 'export default async function(app) {\n  // Do your thing\n}')
  mk(target, 'index.js', (ssr ? 'export default ' : '') + 's.mount(() => 42)')
} else if (server && !client) {
  pkg.scripts.start = 'sin start index.js'
  pkg.scripts.dev = 'sin watch index.js'
  mk(target, 'index.js', 'export default async function(app) {\n  // Do your thing\n}')
} else if (client && !server) {
  pkg.scripts.start = 'sin index.js'
  pkg.scripts.dev = 'sin dev'
  mk(target, 'index.js', (ssr ? 'export default ' : '') + 's.mount(() => 42)')
}

mk(target, 'package.json', JSON.stringify(pkg, null, 2))

await prompt('Git?') && cp.execSync('git init', { stdio: 'inherit' })
await prompt('Install?') && cp.execSync('pnpm install porsager/sin', { stdio: 'inherit' })

console.log(
  cd
    ? '\nRun `cd ' + name + '` and then `sin dev` to start development\n'
    : '\nRun `sin dev` to start development\n'
)

rl.close()

function mk(x, file, data = '') {
  fs.mkdirSync(x, { recursive: true })
  file && fs.writeFileSync(path.join(x, file), data)
}

async function prompt(x) {
  return yes || (await ask(x)).toLowerCase() !== 'n'
}

async function ask(x) {
  return new Promise(r => rl.question('> ' + x + ' ', r))
}
