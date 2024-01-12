globalThis.p = globalThis.print = globalThis.l = globalThis.log = log

export default function log(...xs) {
  console.log(...xs) // eslint-disable-line
  return xs.pop()
}

log.debug = function debug(...xs) {
  if (!process.env.DEBUG)
    return xs.pop()

  console.log(...xs)
  return xs.pop()
}

log.error = function log(...xs) {
  console.error(...xs) // eslint-disable-line
  return xs.pop()
}

log.trace = function(...xs) {
  console.trace ? console.trace(...xs) : console.log(...xs) // eslint-disable-line
  return xs.pop()
}
