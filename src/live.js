export default function live(initial, fn) {
  const observers = new Set()
  typeof fn === 'function' && observers.add(fn)
  v.observe = fn => (observers.add(fn), () => observers.delete(fn))
  v.valueOf = v.toString = v.toJSON = () => v.value
  v.constructor = live
  v.detach = () => { /* noop */ }
  return Object.defineProperty(v, 'value', {
    get() {
      return initial
    },
    set(x) {
      observers.forEach(fn => fn(x, initial))
      initial = x
    }
  })

  function v(x) {
    if (arguments.length)
      v.value = x

    return initial
  }
}

live.from = function(...xs) {
  const fn = xs.pop()
      , value = live(fn(...xs.map(call)))
      , unobserve = xs.map(x => x.observe(() => value(fn(...xs.map(call)))))

  value.detach = () => unobserve.forEach(call)

  return value
}

function call(fn) {
  return fn()
}
