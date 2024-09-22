import tls from 'node:tls'

const open = {}

export function destroy() {
  for (const host in open) {
    for (const x of open[host])
      x.destroy()
  }
}

export function get(host, data, fn) {
  return new Promise((resolve, reject) => {
    const hosts = open[host]
    const socket = hosts && hosts.pop() || create(host, data, fn)
    socket.resolve = resolve
    socket.reject = reject
    socket.handler = fn
    socket.write(data)
  })
}

function create(host) {
  const socket = tls.connect({
    port: 443,
    host,
    onread: {
      buffer: Buffer.allocUnsafe(1024 * 1024),
      callback: (end, buffer) => {
        if (!socket.handler)
          return p('no handler', end, '\n\n')

        try {
          socket.handler(end, buffer, done)
        } catch (error) {
          socket.reject(error)
        }
      }
    }
  })

  socket.on('error', x => socket.reject(x))
  socket.on('close', () => open[host].splice(open[host].indexOf(socket), 1))

  return socket

  function done(x) {
    socket.handler = null
    host in open
      ? open[host].unshift(socket)
      : open[host] = [socket]
    socket.resolve(x)
  }
}
