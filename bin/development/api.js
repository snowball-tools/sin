import fs from 'fs'
import path from 'path'

import '../../ssr/index.js'
import s from '../../src/index.js'

import config from '../config.js'

process.env.NODE_ENV = 'development'

const env = process.env
    , home = getHome()
    , port = process.env.PORT = getPort(home)
    , url = getUrl(home, port)

export default {
  port,
  home,
  project     : path.join(home, port + '-' + path.basename(config.cwd)),
  url         : s.live(url, x => fs.writeFileSync(path.join(home, 'sinurl'), x)),
  restart     : s.event(),
  reload      : s.event(),
  refresh     : s.event(),
  redraw      : s.event(),
  log         : s.event(),
  watch       : s.event(),
  editor      : s.event()
}

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
  const x = path.join(home, 'sinurl')
  return fs.existsSync(x)
    ? fs.readFileSync(x, 'utf8')
    : 'http://127.0.0.1:' + port
}
