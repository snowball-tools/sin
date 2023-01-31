import util from 'util'

const style = Object.entries(util.inspect.colors).reduce((acc, [name, [start, end]]) => {
  acc[name] = (xs, ...args) => process.env.NO_COLOR
    ? (xs.raw ? String.raw(xs, ...args) : xs)
    : '\x1b[' + start + 'm' + (xs && xs.raw ? String.raw(xs, ...args) : xs) + '\x1b[' + end + 'm'
  return acc
}, {})

export default style
