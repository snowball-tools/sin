globalThis.p = globalThis.print = log // eslint-disable-line

function log(...xs) {
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
