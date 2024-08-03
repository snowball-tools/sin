import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'

import config, { resolve } from '../config.js'

async function reservePort() {
  return new Promise(resolve => {
    const server = net.createServer().listen(0, () => {
      const x = server.address().port
      server.close(() => resolve(x))
    })
  })
}

const project = path.join(config.home, config.port + '-' + path.basename(config.cwd))
fs.mkdirSync(project, { recursive: true })

const env        = process.env
    , url        = env.SIN_URL = env.SIN_URL || getUrl(config.home, config.port)
    , origin     = new URL(url).origin
    , devPort    = env.SIN_DEV_PORT = env.SIN_DEV_PORT || await getDevPort()
    , nodePort   = env.SIN_NODE_PORT = env.SIN_NODE_PORT || await reservePort()
    , chromePort = env.SIN_CHROME_PORT = env.SIN_CHROME_PORT || await getChromePort()

export { resolve }

export default Object.assign(config, {
  project,
  url,
  origin,
  devPort,
  nodePort,
  chromePort
})

function getUrl() {
  const x = path.join(project, '.sin-url')
  return fs.existsSync(x)
    ? fs.readFileSync(x, 'utf8')
    : 'http://127.0.0.1:' + config.port
}

async function getDevPort() {
  const portPath = path.join(project, '.sin-dev-port')
  try {
    fs.accessSync(path.join(project, 'SingletonSocket'))
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
