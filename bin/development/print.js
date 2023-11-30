import Url from 'url'
import util from 'util'

import config from '../config.js'
import api from './api.js'
import c from '../color.js'

p('\n' + padBoth('🔥' + (config.raw ? '' : ' at ' + api.url)) + '\n')

api.browser.reload.observe(() => print({ from: 'browser', type: 'status', value: '🔄' }))
api.browser.hotload.observe(() => print({ from: 'browser', type: 'status', value: '🔥' }))
api.node.hotload.observe(() => print({ from: 'node', type: 'status', value: '🔥' }))

api.log.observe(print)

function print(x) {
  const heading = head(x.from + ' ' + x.type, x.type === 'error')
  let output = ''

  output = x.type === 'status'
    ? x.value + ' ' + x.from
    : x.args
    ? logInfo(x)
    : x.type === 'exception'
    ? logInfo(exception(x))
    : x

  const changed = heading !== log.heading
      , repeat = !changed && output === log.output ? ++log.count : log.count = 0
      , replace = x.replace && log.last && x.replace === log.last.replace

  if (x.type !== 'status' && changed)
    p('\n' + heading)

  replace && process.stdout.write('\x1B[F\x1B[2K')
  const write = repeat
    ? (log.count > 1 ? '\x1B[F\x1B[G' : '') + time(x.timestamp) + c.gray`last line repeated ${ c.white(log.count) } times`
    : time(x.timestamp) + output

  p(write)

  log.heading = heading
  log.output = output
  log.last = x
}

function head(x, red) {
  return c[red ? 'bgRed' : 'bgGray'](
    c[red ? 'black' : 'white'](c.bold(
      padBoth(x.split('').join(' ').toUpperCase())
    ))
  )
}

function logInfo(x) {
  let stack = x.stackTrace
    ? logStack(x.stackTrace.callFrames, 'trace error'.includes(x.type) ? 100 : 1)
    : []

  stack.length || (stack = [''])

  return stack.map((f, i) =>
    padBetween(
      i ? '' : x.args.map(logArg).join(' ').trim(),
      f.trim(),
      i ? 0 : 14
    )
  ).join('\n')
}

function exception(x) {
  const properties = x.exception.preview.properties.filter(x => x.name !== 'stack' && x.name !== 'message')
  return {
    args: [
      {
        type: 'string',
        value: x.exception.description.split('\n')[0]
      },
      ...(properties.length ? [{
        type: 'object',
        preview: { properties }
      }] : [])
    ],
    stackTrace: {
      callFrames: x.stackTrace && x.stackTrace.callFrames || [x]
    }
  }
}

function padBoth(x, w = process.stdout.columns) {
  const padding = Math.max(0, w - x.length)
  return ' '.repeat(Math.floor(padding / 2)) + x + ' '.repeat(Math.ceil(padding / 2))
}

function rawLength(x) {
  return x.replace(/\x1b\[[0-9;]*m/g, '').length
}

function padBetween(a, b, prefix = 0) {
  a = a.trim()
  b = b.trim()

  if (!b)
    return a

  const al = rawLength(a)
  const bl = rawLength(b)
  return a && prefix + al + bl + 2 > process.stdout.columns
    ? a + '\n ' + padBetween('', b)
    : a.padEnd(process.stdout.columns - 1 - bl + (a.length - al) - prefix, ' ') + b
}

function logArg(x) {
  return x.type === 'string' ? c.cyan(x.value)
    : x.type === 'number'    ? c.blue(x.value)
    : x.type === 'object'    ? (
        x.subtype === 'date' ? c.magenta(new Date(x.description).toISOString())
      : x.preview ? (
          x.subtype === 'array' ? logArray(x.preview.properties)
        : x.subtype === 'error' ? logError(x)
        : logObject(x.preview.properties)
      )
      : '[' + x.value + ']'
    )
    : x.value
}

function logError(x) {
  return [
    { type: 'string', value: x.description.split('\n')[0] },
    ...x.preview.properties.filter(x => x.name !== 'stack' && x.name !== 'message')
  ].map(logArg)
}

function logArray(xs) {
  return util.inspect(
    xs.map(x => cast(x.value, x.type)),
    { colors: true }
  )
}

function logObject(xs) {
  return util.inspect(
    xs.reduce((acc, x) => (acc[x.name] = cast(x.value, x.type), acc), {}),
    { colors: true }
  )
}

function cast(x, type) {
  return type === 'number'  ? +x
       : type === 'date'    ? new Date(x)
       : type === 'regexp'  ? new RegExp(x)
       : type === 'boolean' ? x === 'true' ? true : false
       : type === 'bigint'  ? BigInt(x)
       : x
}

function logStack(stack, max = 50) {
  return stack
    .filter(s =>
      s.url && api.blackbox.every(x => !s.url.match(new RegExp(x, 'i')))
    )
    .slice(0, max)
    .map(x =>
      c.gray(
          (x.functionName || '') + ' @ '
        + [
          '.' + x.url.replace(api.origin, '').replace(Url.pathToFileURL(config.cwd), ''),
          x.lineNumber + 1,
          x.columnNumber + 1
        ].join(':')
      )
    )
}

function time(d = Date.now()) {
  d = new Date(d)
  return ' ' + c.gray(
      ('' + d.getHours()).padStart(2, '0') + ':'
    + ('' + d.getMinutes()).padStart(2, '0') + ':'
    + ('' + d.getSeconds()).padStart(2, '0') + '.'
    + ('' + d.getMilliseconds()).padStart(3, '0')
  ) + ' '
}
