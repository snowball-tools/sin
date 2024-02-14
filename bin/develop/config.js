import fs from 'fs'
import path from 'path'
import config from '../config.js'
import { reservePort } from './shared.js'

const port      = parseInt(config.option('--port', config.port || process.env.PORT || getPort(config.home)))
    , project   = path.join(config.home, port + '-' + path.basename(config.cwd))
    , url       = getUrl(config.home, port)
    , origin    = new URL(url).origin
    , noBrowser = config.option('--no-browser')
    , live      = config.option('--live')
    , devPort   = process.env.SIN_TOOLS_PORT = await getDevPort()
    , nodePort  = await reservePort()
    , chromePort= await getChromePort()

export default {
  ...config,
  noBrowser,
  live,
  port,
  project,
  url,
  origin,
  devPort,
  nodePort,
  chromePort
}

function getPort() {
  const file = path.join(config.home, '.ports')
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

async function getDevPort() {
  const portPath = path.join(project, '.sin-dev-port')
  try {
    await fs.accessSync(path.join(project, 'SingletonSocket'))
    return parseInt(fs.readFileSync(portPath, 'utf8'))
  } catch (error) {
    const port = await reservePort()
    fs.writeFileSync(portPath, '' + port)
    return port
  }
}

async function getChromePort() {
  const portPath = path.join(project, '.sin-chrome-port')
  try {
    await fs.accessSync(path.join(project, 'SingletonSocket'))
    return parseInt(fs.readFileSync(portPath, 'utf8'))
  } catch (error) {
    const port = await reservePort()
    fs.writeFileSync(portPath, '' + port)
    return port
  }
}
