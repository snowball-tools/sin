import fs from 'node:fs'
import cp from 'node:child_process'
import path from 'node:path'

import prexit from '../prexit.js'

import '../favicon.js'
import '../config.js'
import Proxy from './proxy.js'

const cwd = process.cwd()
const root = path.parse(cwd).root

const locks = {
  'yarn.lock': 'yarn',
  'bun.lockb': 'bun',
  'package-lock.json': 'npm',
  'pnpm-lock.yaml': 'pnpm'
}

const exact = {
  yarn: '--exact',
  bun: '--exact',
  npm: '--save-exact',
  pnpm: '--save-exact'
}

const c = client()
const r = registries()

const proxy = r.length > 1 && await Proxy(r)
const args = process.argv.slice(2)

console.log('Using ' + c + ' to install' + (r.length > 1 ? ' from ' + r.map(x => x.host).join(' then ') : ''))
const child = cp.spawn(c, [
  exact[c],
  ...args
], {
  stdio: ['pipe', 'inherit', 'inherit'],
  shell: process.platform === 'win32',
  env: proxy
    ? { ...process.env, npm_config_registry: 'http://127.0.0.1:' + proxy.port }
    : process.env
})

prexit.last(() => child.killed || child.kill('SIGINT'))

proxy && child.on('close', proxy.unlisten)

function client() {
  let dir = cwd
  while (dir !== root) {
    for (const x in locks) {
      if (fs.existsSync(path.join(dir, x)))
        return locks[x]
    }
    dir = path.dirname(dir)
  }

  return 'npm'
}

function registries() {
  const xs = []
  let dir = cwd
  while (dir !== root) {
    const p = pkgjson(dir)
    p.length && xs.push(...p)
    const n = npmrc(dir)
    n.length && xs.push(...n)
    const e = env(path.join(dir, '.env'))
    e.npm_config_registry && xs.push(...e.npm_config_registry.split(','))
    dir = path.dirname(dir)
  }

  return xs.map(x => new URL(x)).concat(new URL('https://registry.npmjs.org'))
}

function npmrc(dir) {
  try {
    const x = fs.readFileSync(path.join(dir, '.npmrc'), 'utf8')
    return x.match(/^\s*registry=(.+)/gm).flatMap(x =>
      x.slice(x.indexOf('=') + 1).trim().split(',').map(x => x.trim())
    )
  } catch (e) {
    return []
  }
}

function pkgjson(dir) {
  try {
    const x = JSON.parse(fs.readFileSync(path.join(dir, 'package.json')))
    return [].concat(x.registry).flatMap(x => x.split(','))
  } catch (e) {
    return []
  }
}
