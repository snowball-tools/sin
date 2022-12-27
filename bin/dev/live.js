import path from 'path'
import tls from 'tls'
import net from 'net'
import fs from 'fs/promises'
import prexit from 'prexit'

const empty = Buffer.alloc(21)
empty[0] = 2
empty.writeUInt32BE(21, 1)

export default async function live(home, port) {
  const idPath = path.join(home, '.sin-live')
  let id = await fs.readFile(idPath).catch(() => [])
  id.length !== 21 && (id = empty)
  connect(id, port, true).then(
    data => {
      fs.writeFile(idPath, data).catch(console.error) // eslint-disable-line
      console.log('Live at https://' + data.readBigInt64BE(5).toString(36) + '.live.sinjs.com') // eslint-disable-line
      for (let i = 0; i < 10; i++) connect(id, port).catch(() => {})
    },
    error => {
      console.log('Could not start live', error)
    }
  )
}

async function connect(id, port, main) {
  id = Buffer.from(id)
  id[0] = main ? 2 : 3
  return new Promise(async(resolve, reject) => {
    const options = [443, 'host.live.sinjs.com', { servername: 'host.live.sinjs.com' }]
    const clients = new Map()

    const socket = tls.connect(...options)
    prexit(() => socket.end())
    let rest = 0
      , client = null

    socket.on('secureConnect', () => socket.write(id))
    socket.on('error', reject)
    socket.on('close', () => open && setTimeout(() => socket.connect(...options), 2000))
    socket.on('data', x => {
      if (rest) {
        const end = rest <= x.length ? rest : x.length
        clients.has(client) && clients.get(client).write(x.slice(0, end))
        x = x.slice(end)
        rest -= end
      }

      while (x.length) {
        const type = x[0]
            , length = x.readUInt32BE(1)
            , end = length <= x.length ? length : x.length

        if (type === 2 || type === 3) {
          resolve(x.slice(0, length))
        } else if (type === 1) {
          close(client = x.readUInt32BE(5))
        } else if (type === 0) {
          forward(client = x.readUInt32BE(5), x.slice(9))
        } else {
          console.log('Protocol error', type, x)
          return socket.end()
        }

        if (length > end)
          return rest = length - end

        x = x.slice(end)
      }
    })

    function forward(client, x) {
      clients.has(client)
        ? clients.get(client).write(x)
        : clients.set(client, open(client, x))
    }

    function close(client) {
      clients.has(client) && (clients.get(client).end(), clients.delete(client))
    }

    function open(client, data) {
      const x = net.connect(port, () => x.write(data))

      x.on('data', x => send(0, client, x))
      x.on('close', () => (send(1, client), clients.delete(client)))
      x.on('error', x => console.error('wat', x))

      return x
    }

    function send(status, i, data) {
      const length = (data ? data.length : 0)
      const resp = Buffer.allocUnsafe(9 + length)
      resp[0] = status
      resp.writeUInt32BE(9 + length, 1)
      resp.writeUInt32BE(i, 5)
      data && data.copy(resp, 9)
      socket.write(resp)
    }
  })
}
