import fs from 'node:fs'
import cp from 'node:child_process'
import path from 'node:path'
import readline from 'node:readline'

import c from '../color.js'
import config from '../config.js'

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

const argv = process.argv.slice(3)
    , cwd = process.cwd()
    , xs = fs.readdirSync(cwd)
    , empty = !xs.some(x => x[0] !== '.')
    , yes = argv.some(x => x === '-y' || x === '--yes')
    , name = argv.find(x => x[0] !== '-') || (empty ? path.basename(cwd) : (await ask('Project name?')))
    , target = empty ? cwd : path.join(cwd, name)
    , cd = target !== cwd
    , pkg = JSON.parse(fs.readFileSync(new URL('package.json', import.meta.url)))
    , full = await prompt('Full Setup?')
    , script = !full && await prompt('Just Run Node (script)?')
    , noscript = !full && !script && await prompt('Only SSR (--noscript)?')
    , staticServe = !full && !script && !noscript && await prompt('Just serve static files (static)?')
    , server = !full && !script && !noscript && !staticServe && await prompt('Just HTTP?')
    , npm = await new Promise(r => cp.exec('which pnpm', e => r(e ? 'npm' : 'pnpm')))
    , run = npm + (npm === 'npm' ? ' run' : '')
    , git = !hasGit(cwd) && await prompt('Git?')
    , install = await prompt('Install?')

const serverScript = `export default async function(app) {
  app.get('/hello', r => r.end('Welcome to sin'))
}
`

const clientScript = `import s from 'sin'

s.mount(() =>
  s\`h1\`('Welcome to sin')
)
`

pkg.name = name

mk(target)
process.chdir(target)

pkg.scripts.build = 'sin build'
pkg.scripts.generate = 'sin generate'

if (full) {
  pkg.scripts.start = 'sin start'
  pkg.scripts.dev = 'sin dev'
  mk(path.join(target, '+'), 'index.js', serverScript)
  mk(path.join(target, '+public'))
  mk(target, 'index.js', clientScript.replace('export', '// Add `export default` to enable ssr with hydration\nexport'))
} else if (script) {
  pkg.scripts.start = 'sin start script index.js'
  pkg.scripts.dev = 'sin dev script index.js'
  mk(target, 'index.js', '// Do your thing\n')
} else if (noscript) {
  pkg.scripts.start = 'sin start noscript'
  pkg.scripts.dev = 'sin dev noscript'
  mk(path.join(target, '+'), 'index.js', serverScript)
  mk(path.join(target, '+public'))
  mk(target, 'index.js', clientScript)
} else if (staticServe) {
  pkg.scripts.start = 'sin start static'
  pkg.scripts.dev = 'sin dev static'
} else if (server) {
  pkg.scripts.start = 'sin start server'
  pkg.scripts.dev = 'sin dev server'
  mk(target, 'index.js', serverScript)
}

mk(target, 'package.json', JSON.stringify(pkg, null, 2))

git && (cp.execSync('git init', { stdio: 'inherit' }), mk(target, '.gitignore', 'node_modules\n.env'))
install && cp.execSync(npm + ' install porsager/sin', { stdio: 'inherit' })

!global.print && console.log( // eslint-disable-line
  cd
    ? '\nRun `cd ' + name + '` and then `' + run + ' dev` to start developing\n'
    : '\nRun `' + run + ' dev` to start developing\n'
)

rl.close()

function mk(x, file, data = '') {
  fs.mkdirSync(x, { recursive: true })
  file && !fs.existsSync(path.join(x, file)) && fs.writeFileSync(path.join(x, file), data)
}

async function prompt(x) {
  return yes || (await ask(x + c.dim(' (Y/n)'))).toLowerCase() !== 'n'
}

async function ask(x) {
  return new Promise(r => rl.question(x + ' ', r))
}

function hasGit(x) {
  let prev
  while (x !== prev) {
    prev = x
    if (fs.existsSync(path.join(x, '.git')))
      return true
    x = path.dirname(x)
  }
}
