export default Stream

Stream.SKIP = {}
Stream.lift = lift
Stream.scan = scan
Stream.merge = merge
Stream.combine = combine
Stream.scanMerge = scanMerge
Stream['fantasy-land/of'] = Stream

function Stream(value) {
  const dependentStreams = []
  const dependentFns = []

  function stream(v) {
    if (arguments.length && v !== Stream.SKIP) {
      value = v
      if (open(stream)) {
        stream._changing()
        stream._state = 'active'
        dependentStreams.forEach((s, i) => s(dependentFns[i](value)))
      }
    }

    return value
  }

  stream.constructor = Stream
  stream._state = arguments.length && value !== Stream.SKIP ? 'active' : 'pending'
  stream._parents = []

  stream._changing = () => {
    if (open(stream)) stream._state = 'changing'
    dependentStreams.forEach(s => s._changing())
  }

  stream._map = (fn, ignoreInitial) => {
    const target = ignoreInitial ? Stream() : Stream(fn(value))
    target._parents.push(stream)
    dependentStreams.push(target)
    dependentFns.push(fn)
    return target
  }

  stream.map = fn => stream._map(fn, stream._state !== 'active')

  let end
  function createEnd() {
    end = Stream()
    end.map(value => {
      if (value === true) {
        stream._parents.forEach(p => p._unregisterChild(stream))
        stream._state = 'ended'
        stream._parents.length = dependentStreams.length = dependentFns.length = 0
      }
      return value
    })
    return end
  }

  stream.toJSON = () => value != null && typeof value.toJSON === 'function' ? value.toJSON() : value
  stream.toString = stream
  stream.valueOf = stream

  stream['fantasy-land/map'] = stream.map
  stream['fantasy-land/ap'] = x => combine((s1, s2) => s1()(s2()), [x, stream])

  stream._unregisterChild = child => {
    const childIndex = dependentStreams.indexOf(child)
    if (childIndex !== -1) {
      dependentStreams.splice(childIndex, 1)
      dependentFns.splice(childIndex, 1)
    }
  }

  Object.defineProperty(stream, 'end', {
    get: () => end || createEnd()
  })

  return stream
}

function combine(fn, streams) {
  let ready = streams.every(s => {
    if (s.constructor !== Stream)
      throw new Error('Ensure that each item passed to stream.combine/stream.merge/lift is a stream')
    return s._state === 'active'
  })
  const stream = ready
    ? Stream(fn.apply(null, streams.concat([streams])))
    : Stream()

  let changed = []

  const mappers = streams.map(s =>
    s._map(value => {
      changed.push(s)
      if (ready || streams.every(s => s._state !== 'pending')) {
        ready = true
        stream(fn.apply(null, streams.concat([changed])))
        changed = []
      }
      return value
    }, true)
  )

  const endStream = stream.end.map(value => {
    if (value === true) {
      mappers.forEach(mapper => mapper.end(true))
      endStream.end(true)
    }
    return undefined
  })

  return stream
}

function merge(streams) {
  return combine(() => streams.map(s => s()), streams)
}

function scan(fn, acc, origin) {
  const stream = origin.map(v => {
    const next = fn(acc, v)
    if (next !== Stream.SKIP) acc = next
    return next
  })
  stream(acc)
  return stream
}

function scanMerge(tuples, seed) {
  const streams = tuples.map(tuple => tuple[0])

  const stream = combine(() => {
    const changed = arguments[arguments.length - 1]
    streams.forEach((stream, i) => {
      if (changed.indexOf(stream) > -1)
        seed = tuples[i][1](seed, stream())
    })

    return seed
  }, streams)

  stream(seed)

  return stream
}

function lift() {
  const fn = arguments[0]
  const streams = Array.prototype.slice.call(arguments, 1)
  return merge(streams).map(streams => fn.apply(undefined, streams))
}

function open(s) {
  return s._state === 'pending' || s._state === 'active' || s._state === 'changing'
}
