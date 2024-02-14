globalThis.p = globalThis.print = globalThis.l = globalThis.log = log

export default function log(...xs) {
  console.log(...xs) // eslint-disable-line
  return xs.pop()
}

log.debug = function debug(...xs) {
  if (!process.env.DEBUG)
    return xs.pop()

  console.log(...xs) // eslint-disable-line
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

log.inspect = function(...xs) {
  console.log(...xs)
  // Consider having inspect pre stringify the args
  return xs.pop()
}

log.observe = function(...xs) {
  console.log(...xs) // eslint-disable-line
  // we can use the stack trace as an id
  // if typeof x is an object we monitor it for changes
  // if x is a value we wait for new calls to observe
  return xs.pop()
}
