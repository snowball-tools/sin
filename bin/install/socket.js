import tls from 'node:tls'
import dns from 'node:dns/promises'

const ips = {}
const open = {}
const highWaterMark = 128 * 1024
const empty = Buffer.alloc(0)
const noop = () => { /* noop */ }
const cache = new Map()

export async function cacheDns() {
  const host = 'registry.npmjs.org'
  ips[host] = (await dns.lookup(host)).address
}

export function destroy() {
  for (const host in open) {
    for (const x of open[host])
      x.destroy()
  }
}

export async function fetch(host, pathname, ondata = noop) {
  const id = host + pathname
  if (cache.has(id))
    return cache.get(id)

  const hosts = open[host]
  const socket = hosts && hosts.pop() || (await create(host))
  const body = await new Promise((resolve, reject) => {
    socket.resolve = resolve
    socket.reject = reject
    socket.handler = handler(resolve, reject, ondata)
    socket.write('GET ' + pathname + ' HTTP/1.1\nHost: registry.npmjs.org\n\n')
  })
  cache.set(id, body)
  socket.done()
  return body
}

async function create(host) {
  const xs = host in open
    ? open[host]
    : open[host] = Object.assign([], { count: 1, queue: [] })

  if (xs.count > 100)
    return new Promise(r => xs.queue.unshift(r))

  xs.count++

  const socket = tls.connect({
    port: 443,
    host: ips[host],
    servername: host,
    highWaterMark,
    onread: {
      buffer: Buffer.allocUnsafe(highWaterMark),
      callback: (end, buffer) => socket.handler(buffer, end)
    }
  })

  socket.done = done
  socket.on('error', x => socket.reject(x))
  socket.on('close', () => {
    xs.splice(xs.indexOf(socket), 1)
    xs.count--
  })

  return socket

  function done() {
    socket.handler = null
    xs.queue.length
      ? xs.queue.pop()(socket)
      : xs.unshift(socket)
  }
}

function handler(resolve, reject, ondata) {
  let l = 0
    , n = 1
    , c = 0
    , body = empty

  return (xs, end) => {
    if (n === 0)
      return read(xs, 0, end)

    for (let i = 0; i < end; i++) {
        n === 1 ?  checkStatus(xs, end)    && (n = 2)
      : n === 2 ?  getContentLength(xs[i]) && (n = 3)
      : n === 3 ?  xs[i] === 10            && (n = 4)
      : n === 4 ?  n = startBody(xs[i])
      : n === 5 && (read(xs, i, end), n = 0, i = end)
    }
  }

  function startBody(x) {
    if (x === 13) // carraige
      return 4

    if (x !== 10) // newline
      return 3

    if (l === 0)
      return resolve(body)

    body = Buffer.allocUnsafe(l)
    return 5
  }

  function checkStatus(xs, end) {
    return xs[9] === 50 && xs[10] === 48 && xs[11] === 48 // 2 0 0
      ? true
      : reject(xs.subarray(0, xs.indexOf(10)).toString())
  }

  function read(xs, start, end) {
    xs.copy(body, body.byteLength - l, start, end)
    l -= end - start
    ondata(xs, start, end)
    if (l <= 0)
      resolve(body)
  }

  function getContentLength(x) {
      c ===  0 ?  (x === 10             ) ? (c =  1) : c = 0 // newline
    : c ===  1 ?  (x === 67 || x === 99 ) ? (c =  2) : c = 0 // C c
    : c ===  2 ?  (x === 79 || x === 111) ? (c =  3) : c = 0 // O o
    : c ===  3 ?  (x === 78 || x === 110) ? (c =  4) : c = 0 // N n
    : c ===  4 ?  (x === 84 || x === 116) ? (c =  5) : c = 0 // T t
    : c ===  5 ?  (x === 69 || x === 101) ? (c =  6) : c = 0 // E e
    : c ===  6 ?  (x === 78 || x === 110) ? (c =  7) : c = 0 // N n
    : c ===  7 ?  (x === 84 || x === 116) ? (c =  8) : c = 0 // T t
    : c ===  8 ?  (x === 45             ) ? (c =  9) : c = 0 // -
    : c ===  9 ?  (x === 76 || x === 108) ? (c = 10) : c = 0 // L l
    : c === 10 ?  (x === 69 || x === 101) ? (c = 11) : c = 0 // E e
    : c === 11 ?  (x === 78 || x === 110) ? (c = 12) : c = 0 // N n
    : c === 12 ?  (x === 71 || x === 103) ? (c = 13) : c = 0 // G g
    : c === 13 ?  (x === 84 || x === 116) ? (c = 14) : c = 0 // T t
    : c === 14 ?  (x === 72 || x === 104) ? (c = 15) : c = 0 // H h
    : c === 15 ?  (x === 58             ) ? (c = 16) : c = 0 // :
    : c === 16 ?  (x === 10             ) ? (c = -1) // newline
               :  (x  >= 48 && x <=  57 ) ? (l = l * 10 + x - 48) // 0 9
               :  (x ===  9 || x === 32 || x === 13 ) ? (c = 16) // space tab
               :  (c = 17               )
    : c = 0
    return c === -1
  }
}
