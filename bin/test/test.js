const tests = []

const p = console.log
const t = test('rest')
const o = test('only')
const n = test('not')
t.o = t.only = o
t.n = t.not = n
t.is = is

t.timeout = 500

export default t

setTimeout(run)

class Test {
  constructor(type, name, options, run, origin) {
    this.type = type
    this.name = name
    this.path = []
    this.options = options
    this.run = run
    this.origin = origin
  }

  nest(type, path, options) {
    type === 'not' && (this.type = type)
    this.options = { ...options, ...this.options }
    this.path.unshift(path)
    return this
  }
}

function test(type) {
  return (...args) => {
    const name = String.raw(...args)
    return function scope(...xs) {
      const options = xs[0] && typeof xs[0] === 'object' && !Array.isArray(xs[0]) && xs.shift()

      return xs.flatMap(x => {
        if (Array.isArray(x))
          return x.map(x => x.nest(type, name, options))

        const origin = new Error(name)
        Error.captureStackTrace(origin, scope)
        const test = new Test(type, name, options, x, origin)
        tests.push(test)
        return test
      })
    }
  }
}

async function run() {
  const failed = []
  const success = []

  let current = ''
  let start = performance.now()
  const only = tests.some(x => x.type === 'only')
  for (const test of tests) {
    if (test.type === 'not' || (only && test.type !== 'only'))
      continue

    const path = test.path.join(' > ')
    if (path !== current) {
      current = path
      p('🧪', path)
    }
    try {
      let x = test.run()
      if (x && typeof x.then === 'function') {
        x = await Promise.race([
          x,
          new Promise((_, reject) => setTimeout(reject, test.options.timeout || t.timeout, 'Timeout'))
        ])
      }

      Array.isArray(x) && is(...x)

      p('✅ ', test.name)
      success.push(test)
    } catch (error) {
      test.error = error
      failed.push(test)
    }
  }

  const duration = performance.now() - start
  const ignored = tests.length - (success.length + failed.length)
  p('⌛️ Ran in', duration.toFixed(2) + 'ms')
  ignored && p('🙈', ignored, 'test' + (ignored === 1 ? '' : 's'), 'was disabled')
  success.length && p('🎉', success.length, 'test' + (success.length === 1 ? '' : 's'), 'succeeded')
  failed.map(x => console.error('💥 ' + x.path.join(' > ') + ' > ' + x.name + ': ' + (x.error.message || x.error)))
  failed.length && console.error('🚨', failed.length, 'test' + (failed.length === 1 ? '' : 's'), 'failed')
  globalThis.sindev.tested = ignored || failed.length ? 1 : 0
  globalThis?.sindev?.api?.tested(globalThis.sindev.exit_code)
}

function is(expected, got) {
  if (expected !== got)
    throw new Error('expected `' + expected + '` but got `' + got + '`')
}
