import fs from 'fs'
import Url from 'url'
import path from 'path'
import c from '../color.js'

import '../../ssr/index.js'
import s from '../../src/index.js'

import config from '../config.js'

process.env.NODE_ENV = 'development'

const env = process.env
    , home = getHome()
    , port = process.env.PORT = getPort(home)
    , project = path.join(home, port + '-' + path.basename(config.cwd))
    , url = getUrl(home, port)
    , origin = new URL(url).origin

const api = {
  port,
  home,
  origin,
  project,
  blackbox: config.debug ? [] : ['/sin/src/', '/sin/bin/', '/ey/src/', '/sin/ssr/'],
  url: s.live(url, x => fs.writeFileSync(path.join(project, '.sin-url'), x)),
  node: {
    restart : s.event(),
    hotload : s.event(),
    watch   : s.event()
  },
  browser: {
    reload  : s.event(),
    redraw  : s.event(),
    hotload : s.event(),
    watch   : s.event()
  },
  log: s.event()
}

export default api

function getHome() {
  const x = env.SIN_HOME || path.join(
    process.platform === 'win32' && env.USER_PROFILE || env.HOME,
    '.sin'
  )
  fs.mkdirSync(x, { recursive: true })
  return x
}

function getPort() {
  if (env.PORT)
    return parseInt(env.PORT)

  const file = path.join(home, '.ports')
  const ports = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, 'utf8'))
    : {}

  if (config.cwd in ports)
    return ports[config.cwd]

  const port = 1 + (Object.values(ports).sort().find((x, i, xs) => xs[i + 1] !== x + 1) || 1336)
  ports[config.cwd] = port
  fs.writeFileSync(file, JSON.stringify(ports))
  return port
}

function getUrl() {
  const x = path.join(project, '.sin-url')
  return fs.existsSync(x)
    ? fs.readFileSync(x, 'utf8')
    : 'http://127.0.0.1:' + port
}
