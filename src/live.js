import { noop, isFunction } from './shared.js'

export class Observable {
  constructor(live, transform) {
    this.live = live
    this.transform = transform
  }

  get value() { return this.transform(this.live.value) }
  toString() { return this.value || '' }
  valueOf() { return this.value || '' }
  toJSON() { return this.value || '' }

  observe(fn) {
    return this.live.observe(x => fn(this.transform(x)))
  }
}

export default function Live(value, fn) {
  const observers = new Set()
  isFunction(fn) && observers.add(fn)
  live.observe = fn => (observers.add(fn), () => observers.delete(fn))
  live.valueOf = live.toString = live.toJSON = () => value || ''
  live.detach = noop
  live.reduce = reduce
  live.set = x => (...args) => (live(isFunction(x) ? x(...args) : x), live)
  live.get = prop => new Observable(live, x => isFunction(prop) ? prop(x) : x[prop])
  live.if = (equals, a = true, b = false) => new Observable(live, x => x === equals ? a : b)

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
    observers.forEach(async fn => fn(x))
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
