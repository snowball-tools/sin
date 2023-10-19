#! /usr/bin/env -S node --expose-internals --no-warnings

/* eslint no-console: 0 */

import path from 'path'
import cp from 'child_process'
import fs from 'fs'
import url from 'url'
import prexit from 'prexit'
import readline from 'readline'
import Node from './development/node.js'
import Watcher from './watcher.js'
import { getPort, gracefulRead, jail } from './development/shared.js'

import s from './style.js'

let retries = 0
  , sigint
  , timeout
  , timer
  , child
  , node
  , scripts = {}

const cwd = process.cwd()
    , argv = process.argv.slice(2)
    , local = path.join(cwd, 'node_modules', 'sin', 'bin')
    , here = fs.existsSync(local) ? local : url.fileURLToPath(new URL('.', import.meta.url))
    , commands = fs.readdirSync(here).filter(x => fs.existsSync(path.join(here, x, 'index.js')))
    , help = (argv.some(x => x === '-h' || x === '--help') || argv.length === 0) && 'help'
    , version = argv.some(x => x === '-v' || x === '--version') && 'version'
    , command = commands.find(x => argv[0] && x.startsWith(argv[0].toLowerCase())) || help || version
    , dev = command === 'development'
    , nodePort = dev && await getPort()
    , watcher = Watcher(changed)

command
  ? start()
  : console.log('\nThe command `' + s.bold(argv[0]) + '` was not found - see `' + s.bold`sin help` + '` for usage\n')

if (dev) {
  process.on('SIGINFO', restart)
  if (process.stdin.isTTY) {
    readline.emitKeypressEvents(process.stdin)
    process.stdin.setRawMode(true)
    process.stdin.on('keypress', (str, key) => {
      if (key.ctrl && key.name === 'c') {
        if (sigint) {
          console.log(`⛔️ Force closed`)
          return process.exit(1)
        }
        sigint = true
        kill('SIGINT')
      } else if (key.name === 'r' || (key.ctrl && key.name === 't')) {
        restart()
      }
    })
  }
}

function start() {
  clearTimeout(timer)

  child = cp.fork(
    path.join(here, command, 'index.js'),
    argv.slice(1),
    {
      silent: dev,
      cwd,
      execArgv: [
        '--import', url.pathToFileURL(path.join(here, '/import.js')),
        dev && '--inspect=' + nodePort,
        dev && '--expose-internals',
        dev && '--no-warnings'
      ].filter(x => x)
    }
  )

  command === 'development'
    ? development(child)
    : prexit(() => child && child.exitCode !== null && (process.exitCode = child.exitCode))
}

function development() {
  child.stderr.setEncoding('utf8')
  child.stdout.on('data', x => process.stdout.write(x))
  child.stderr.on('data', async(data) => {
    if (data.includes('Debugger listening on ws://127.0.0.1:' + nodePort)) {
      node = await Node(data.slice(22).split('\n')[0], scriptParsed).catch(console.error)
    } else if (data.includes('Waiting for the debugger to disconnect...')) {
      node && node.close()
    } else if (!data.includes('Debugger ending on ws://127.0.0.1:')) {
      process.stderr.write(data)
    }
  })

  const resetTimer = setTimeout(() => retries = 0, timeout)
  child.on('close', code => {
    child = null
    clearTimeout(resetTimer)
    if (code === 123) // watch fired, start immidiately
      return start()

    timeout = Math.min(Math.pow(1.5, ++retries) * 1000, 1000 * 60)
    if (sigint || !code) {
      console.log(
        code ? '⛔️' : '✅',
        'Closed with code: ' + s.bold(code)
      )
      process.stdin.destroy()
    } else {
      const retry = performance.now() > 3000
      console.log(`⛔️ Closed with code: ${ s.bold(code) }`, retry
        ?` - restarting in ${ s.bold((timeout / 1000).toFixed(2)) }s`
        : '')
      retry
        ? timer = setTimeout(start, timeout)
        : prexit.exit()
    }
  })
}

async function scriptParsed(x) {
  if (!x.url.startsWith('file://'))
    return

  const filePath = url.fileURLToPath(x.url)
  if (scripts[filePath]) {
    scripts[filePath].scriptId = x.scriptId
  } else {
    const original = await gracefulRead(filePath).catch(() => null)
    if (original === null)
      return

    watch({
      path: filePath,
      original,
      source: jail(original),
      scriptId: x.scriptId
    })
  }
}

function watch(x) {
  if (scripts[x.path])
    return

  scripts[x.path] = x
  watcher.add(x.path)
}

async function changed(x) {
  const file = scripts[x]
      , source = await gracefulRead(x)
      , changed = source !== file.original

  file.original = source
  file.source = jail(source)

  changed && file.scriptId
    ? setSource(file).catch(console.error)
    : restart()
}

async function setSource(x) {
  await node.send('Debugger.setScriptSource', {
    scriptId: x.scriptId,
    scriptSource: x.source
  }).catch(console.error)
}

function restart() {
  node && node.close()
  retries = 0
  child
    ? kill('SIGHUP')
    : start()
}

function kill(signal) {
  node && node.close()
  child && child.kill(signal)
}
