import fs from 'fs'
import cp from 'child_process'
import path from 'path'
import readline from 'readline'
import s from '../style.js'

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
    , full = await prompt('Full Setup?')
    , raw = !full && await prompt('Only Node Server?')
    , ssr = !full && !raw && await prompt('Only SSR?')
    , staticServe = !full && !raw && !ssr && await prompt('Only Static serve?')
    , server = !full && !raw && !ssr && !staticServe && await prompt('Only HTTP?')

const serverScript = `export default async function(app) {
  app.get('/hello', r => r.end('Welcome to sin'))
}
`

const clientScript = `import s from 'sin'

export default s.mount(() =>
  s\`h1\`('Welcome to sin')
)
`

pkg.name = name

mk(target)
process.chdir(target)

if (full) {
  pkg.scripts.start = 'sin prod'
  pkg.scripts.dev = 'sin dev'
  pkg.scripts.build = 'sin build'
  mk(path.join(target, '+'), 'index.js', serverScript)
  mk(target, 'index.js', clientScript.replace('export', '// Remove `export default` to disable ssr with hydration\nexport'))
} else if (raw) {
  pkg.scripts.start = 'sin prod raw index.js'
  pkg.scripts.dev = 'sin dev raw index.js'
  mk(target, 'index.js', '// Do your thing\n')
} else if (ssr) {
  pkg.scripts.start = 'sin prod ssr'
  pkg.scripts.dev = 'sin dev ssr'
  mk(path.join(target, '+'), 'index.js', serverScript)
  mk(target, 'index.js', clientScript)
} else if (staticServe) {
  pkg.scripts.start = 'sin prod static'
  pkg.scripts.dev = 'sin dev static'
  pkg.scripts.generate = 'sin generate'
  mk(path.join(target, '+'), 'index.js', serverScript)
  mk(target, 'index.js', clientScript)
} else if (server) {
  pkg.scripts.start = 'sin prod server'
  pkg.scripts.dev = 'sin dev server'
  mk(target, 'index.js', serverScript)
}

mk(target, 'package.json', JSON.stringify(pkg, null, 2))

await prompt('Git?') && cp.execSync('git init', { stdio: 'inherit' })
await prompt('Install?') && cp.execSync('pnpm install porsager/sin', { stdio: 'inherit' })

!global.print && console.log(
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
  return yes || (await ask(x + s.gray(' (Y/n)'))).toLowerCase() !== 'n'
}

async function ask(x) {
  return new Promise(r => rl.question(x + ' ', r))
}
