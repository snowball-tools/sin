import net from 'net'
import fsp from 'fs/promises'

export async function getPort() {
  return new Promise(resolve => {
    const server = net.createServer().listen(0, () => {
      const x = server.address().port
      server.close(() => resolve(x))
    })
  })
}

export async function gracefulRead(x) {
  return fsp.readFile(x, 'utf8')
    .catch(async() => (await new Promise(r => setTimeout(r, 10)), fsp.readFile(x, 'utf8')))
    .catch(async() => (await new Promise(r => setTimeout(r, 20)), fsp.readFile(x, 'utf8')))
}

export function jail(x) {
  return x.replace(/((function.*?\)|=>)\s*{)/g, '$1eval(0);')
}
