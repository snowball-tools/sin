const noop = () => { /* noop */ }

Stream.SKIP = {}

export default function Stream(value, fn) {
  const observers = new Set()
      , dependents = new Set()

  stream.previous = value
  stream.value = value
  stream.constructor = Stream
  stream.valueOf = stream.toString = stream.toJSON = () => stream.value
  stream.reduce = reduce
  stream.map = map
  stream.end = end
  stream.detach = noop
  typeof fn === 'function' && observers.add(fn)

  return stream

  function stream(x) {
    if (arguments.length === 0)
      return stream.value

    stream.previous = stream.value
    stream.value = x
    observers.forEach(call)
    dependents.forEach(call)
    return stream.value
  }

  function reduce(fn, o) {
    const newStream = Stream(fn(o, value))
    const observer = v => {
      const result = fn(newStream.value, v)
      result !== Stream.SKIP && newStream(result)
    }

    dependents.add(observer)
    newStream.detach = () => dependents.delete(observer)
    return newStream
  }

  function map(fn, o) {
    const newStream = Stream(fn(value), o)
    const observer = v => {
      const result = fn(v, newStream.value)
      result !== Stream.SKIP && newStream(result)
    }

    dependents.add(observer)
    newStream.detach = () => dependents.delete(observer)
    return newStream
  }

  function end() {
    dependents.clear()
  }

  function call(fn) {
    fn(stream.value)
  }
}
