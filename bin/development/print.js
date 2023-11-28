import Url from 'url'

import config from '../config.js'
import api from './api.js'
import c from '../color.js'

api.log.observe(x => {
  const e = x.type === 'error'

  const heading = c[e ? 'bgRed' : 'bgGray'](
    c[e ? 'black' : 'white'](c.bold(
      padBoth(
        (x.from + ' ' + x.type).split('').join(' ').toUpperCase()
      )
    ))
  )

  if (heading !== log.heading) {
    console.log(heading)
    log.heading = heading
  }

  const output = x.from === 'chrome' || x.from === 'node'
    ? logInfo(x)
    : x

  log.last === output && heading === log.heading
    ? (log.count > 1 && up(), process.stdout.write(' last line repeated ' + ++log.count + ' times\n'))
    : (console.log(output), log.count = 1)

  log.heading = heading
  log.last = output
})

function up() {
  process.stdout.write('\x1B[F\x1B[G')
}

function logInfo(x) {
  return logStack(x.stackTrace.callFrames, x.type === 'info' ? 1 : 100).map((f, i) =>
    padBetween(i ? '' : x.args.map(logArg).join(' ').trim(), f.trim())
  ).join('\n')
}

function padBoth(x, w = process.stdout.columns) {
  const padding = Math.max(0, w - x.length)
  return ' '.repeat(Math.floor(padding / 2)) + x + ' '.repeat(Math.ceil(padding / 2))
}

function rawLength(x) {
  return x.replace(/\x1b\[[0-9;]*m/g, '').length
}

function padBetween(a, b) {
  a = c.red('⏺') + a.trim()
  b = b.trim() + ' '
  return a.padEnd(process.stdout.columns - rawLength(b) + (a.length - rawLength(a)), ' ') + b
}

function logArg(x) {
  return x.type === 'string'
    ? c.cyan(x.value)
    : x.type === 'number'
      ? c.blue(x.value)
      : x.type === 'object'
        ? x.subtype === 'date'
          ? c.magenta(new Date(x.description).toISOString())
          : x.preview
            ? x.subtype === 'array'
              ? '[ ' + x.preview.properties.map(logArg).join(', ') + ' ]'
              : '{ ' + x.preview.properties.map(x => x.name + ': ' + logArg(x)).join(', ') + ' }'
            : '[' + x.value + ']'
        : x.value
}

function logStack(stack, max = 50) {
  stack = stack.filter(s => s.url && api.blackbox.every(x => !s.url.match(x))).slice(0, max)
  const width = stack.reduce((acc, x) => Math.max(x.functionName.length + 2, acc), 0)

  return stack.map(x =>
    c.gray(
        x.functionName.padStart(width, ' ') + ' @ '
      + [
        x.url.replace(api.origin, '').replace(Url.pathToFileURL(config.cwd), ''),
        x.lineNumber + 1,
        x.columnNumber + 1
      ].join(':')
    )
  )
}
