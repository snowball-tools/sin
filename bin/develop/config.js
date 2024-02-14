import fs from 'node:fs'
import path from 'node:path'

import config, { resolve } from '../config.js'
import { reservePort } from './shared.js'

const project = path.join(config.home, config.port + '-' + path.basename(config.cwd))
fs.mkdirSync(project, { recursive: true })

const url        = getUrl(config.home, config.port)
    , origin     = new URL(url).origin
    , devPort    = process.env.SIN_TOOLS_PORT = await getDevPort()
    , nodePort   = await reservePort()
    , chromePort = await getChromePort()

export { resolve }

export default {
  ...config,
  project,
  url,
  origin,
  devPort,
  nodePort,
  chromePort
}

function getUrl() {
  const x = path.join(project, '.sin-url')
  return fs.existsSync(x)
    ? fs.readFileSync(x, 'utf8')
    : 'http://127.0.0.1:' + config.port
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
