export default function Live(value, fn) {
  const observers = new Set()
  typeof fn === 'function' && observers.add(fn)
  live.observe = fn => (observers.add(fn), () => observers.delete(fn))
  live.valueOf = live.toString = live.toJSON = () => value
  live.constructor = Live
  live.detach = () => { /* */ }
  live.reduce = reduce
  live.set = x => e => (e && (e.redraw = false), live(typeof x === 'function' ? x(value) : (x || e)))
  live.get = prop => Live.from(live, x => typeof prop === 'function' ? prop(x) : x[prop])
  live.if = (equals, a = true, b = false) => Live.from(live, x => x === equals ? a : b)

  return Object.defineProperty(live, 'value', {
    get: () => value,
    set
  })

  function live(x) {
    arguments.length && set(x)
    return value
  }

  function set(x) {
    if (x === value)
      return

    value = x
    observers.forEach(fn => fn(x))
  }

  function reduce(fn, initial) {
    let i = 1
    const result = Live(arguments.length > 1 ? fn(initial, value, i++) : value)
    live.observe(x => result.value = fn(result.value, x, i++))
    return result
  }
}

Live.from = function(...xs) {
  const fn = xs.pop()
      , value = Live(fn(...xs.map(call)))
      , unobserve = xs.map(x => x.observe(() => value(fn(...xs.map(call)))))

  value.detach = () => unobserve.forEach(call)

  return value
}

function call(fn) {
  return fn()
}
