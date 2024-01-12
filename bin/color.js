import util from 'util'

const hasColors = process.stdout.hasColors()
const style = Object.entries(util.inspect.colors).reduce((acc, [name, [start, end]]) => {
  acc[name] = (xs, ...args) => {
    if (!hasColors || process.env.NO_COLOR)
      return xs.raw ? String.raw(xs, ...args) : xs

    return [].concat(xs).map((x, i) =>
      '\x1b[' + start + 'm' + x + (args[i] || '') + '\x1b[' + end + 'm'
    ).join('')
  }
  return acc
}, {})

export default style