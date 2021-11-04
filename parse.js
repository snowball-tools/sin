import window from './window.js'

export default parse

const document = window.document
export const style = document && document.querySelector && (document.querySelector('.sin') || document.createElement('style'))

const prefix = style && style.getAttribute('id') || 'sin-' + ('000000' + (Math.random() * Math.pow(36, 6) | 0).toString(36)).slice(-6)
    , dom = document.createElement('div')
    , vendorRegex = /^(o|O|ms|MS|Ms|moz|Moz|webkit|Webkit|WebKit)([A-Z])/
    , snake = x => x.replace(/(\B[A-Z])/g, '-$1').toLowerCase()
    , findWidth = x => x ? x.hasOwnProperty('width') ? x : findWidth(Object.getPrototypeOf(x)) : {}
    , initials = (acc, x) => (acc[x.split('-').map(x => x[0]).join('')] = x, acc)
    , propCache = {}
    , atsCache = {}
    , unitCache = {}

export const atReplacer = x => Object.entries(x).forEach(([k, v]) => atsCache['@' + k] = v)

parse.prefix = prefix

const pxCache = {
  flex: '',
  'line-height': '',

  border: 'px',
  transform: 'px',
  'box-shadow': 'px',
  'border-top': 'px',
  'border-left': 'px',
  'border-right': 'px',
  'border-bottom': 'px',
  '@media': 'px'
}

const properties = ['float']
  .concat(Object.keys(
    document.documentElement ? findWidth(document.documentElement.style) : {}
  ))
  .filter((x, i, xs) => x.indexOf('-') === -1 && x !== 'length' && xs.indexOf(x) === i)
  .map(x => x.match(vendorRegex) ? '-' + snake(x) : snake(x))
  .sort()

const vendorMap = properties.reduce((acc, x) => {
  const vendor = x.match(/-(ms|o|webkit|moz)-/g)
  if (vendor) {
    const unprefixed = x.replace(/-(ms|o|webkit|moz)-/, '')
    if (properties.indexOf(unprefixed) === -1) {
      if (unprefixed === 'flexDirection')
        acc.flex = '-' + vendor[1].toLowerCase() + '-flex'
      acc[unprefixed] = x
    }
  }
  return acc
}, {})

const popular = ['align-items', 'bottom', 'background-color', 'border-radius', 'box-shadow', 'background-image', 'color', 'display', 'float', 'flex-direction', 'font-family', 'font-size', 'height', 'justify-content', 'left', 'line-height', 'letter-spacing', 'margin', 'margin-bottom', 'margin-left', 'margin-right', 'margin-top', 'opacity', 'padding', 'padding-bottom', 'padding-left', 'padding-right', 'padding-top', 'right', 'top', 'text-align', 'text-decoration', 'text-transform', 'width']
const shorthands = Object.assign(properties.reduce(initials, {}), popular.reduce(initials, {}))

const cache = new Map()
    , cssVars = typeof window !== 'undefined' && window.CSS && CSS.supports('color', 'var(--support-test)')
    , isStartChar = x => x !== 32 && x !== 9 && x !== 10 && x !== 13 && x !== 59
    , isNumber = x => (x >= 48 && x <= 57) || x === 46 // 0-9-.
    , isUnit = x => x === 37 || (x >= 65 && x <= 90) || (x >= 97 && x <= 122)
    , quoteChar = x => x === 34 || x === 39
    , propEndChar = x => x === 32 || x === 58 || x === 9
    , valueEndChar = x => x === 59 || x === 10 || x === 125
    , noSpace = x => x === 58 || x === 64 || x === 38 || x === 91
    , last = xs => xs[xs.length - 1]
    , selectors = []
    , fn = []
    , arg = cssVars
      ? (j, vars, args) => 'var(--' + prefix + vars.push(args[j]) + ')'
      : (j, vars, args) => args[j]

let start = -1
  , valueStart = -1
  , classIdx = -1
  , idIdx = -1
  , startChar = -1
  , quote = -1
  , char = -1
  , lastSpace = -1
  , numberStart = -1
  , uid = 0
  , className = ''
  , specificity = ''
  , prop = ''
  , path = '&'
  , selector = ''
  , animation = ''
  , keyframe = ''
  , rule = ''
  , keyframes = ''
  , name = ''
  , id = ''
  , classes = ''
  , x = ''
  , value = ''
  , varName = ''
  , rules = null
  , append = true
  , colon = false
  , styles = false
  , cacheable = true
  , hasRules = false

function shorthand(x) {
  return shorthands[x] || x
}

function propValue(x, v) {
  return colon ? x : renderProp(x) + ':' + v + ';'
}

function renderProp(x) {
  return propCache[x] || (propCache[x] = vendor(shorthand(x)))
}

function splitSelector(x) {
  return x.replace(/,\s*[:[]?/g, x => noSpace(x.charCodeAt(x.length - 1)) ? ',&' + last(x) : ',& ')
}

function insert(rule, index) {
  if (append) {
    style && document.head && document.head.appendChild(style)
    append = false
  }

  if (style && style.sheet) {
    try {
      style.sheet.insertRule(
        rule,
        index != null ? index : style.sheet.cssRules.length
      )
    } catch (e) {
      console.error('Insert rule error:', e, rule)
    }
  }
}

function parse([xs, ...args], parent, nesting = 0, root) {
  if (cache.has(xs)) {
    const prev = cache.get(xs)
    return {
      ...prev,
      args
    }
  }

  const vars = {}
  name = id = classes = rule = value = ''
  selectors.length = 0
  valueStart = -1
  rules = root ? {} : null
  hasRules = false
  styles = false
  cacheable = true

  x = xs[0]
  for (let j = 0; j < xs.length; j++) {
    rules
      ? parseStyles(0, j === xs.length - 1)
      : parseSelector(xs, j, args, parent)

    x = xs[j + 1]
    if (j < args.length - 1) {
      if (valueStart >= 0) {
        const before = xs[j].slice(valueStart)
        vars[varName = '--' + prefix + uid + j] = { unit: getUnit(prop, last(fn)), index: j }
        value += before + 'var(' + varName + ')'
        valueStart = 0
      } else {
        x += args[j] + ';'
        cacheable = false
      }
    }
  }

  if (hasRules) {
    if (root) {
      Object.entries(rules).forEach(([k, v]) =>
        insert(k.replace(/&\s*/g, '') + '{' + v)
      )
    } else {
      className = prefix + uid++
      classes += (classes ? ' ' : '') + className
      specificity = ''
      for (let i = 0; i < nesting; i++)
        specificity += '.' + className

      Object.entries(rules).forEach(([k, v]) => {
        insert(k.replace(/&/g, '.' + className + specificity) + '{' + v)
      })
    }
  }

  const result = {
    name,
    classes,
    id,
    args,
    vars,
    parent
  }

  cacheable && cache.set(xs, result)

  return result
}

function parseSelector(xs, j, args, parent) {
  for (let i = 0; i <= x.length; i++) {
    char = x.charCodeAt(i)
    if (styles) {
      if (isStartChar(char)) {
        rules = {}
        parseStyles(i++, j === xs.length - 1)
        break
      }
    } else if (!isStartChar(char) || i === x.length) {
      classes = (classIdx !== -1
        ? x.slice(classIdx + 1, i).replace(/\./g, ' ')
        : ''
      ) + classes + (parent ? parent.classes : '')

      id === '' && (id = (idIdx !== -1
        ? x.slice(idIdx, classIdx === -1 ? i : classIdx)
        : ''
      ) || (parent ? parent.id : null))

      name = x.slice(0, id
        ? idIdx - 1
        : (classIdx !== -1 ? classIdx : i)
      ) || (parent && parent.name)
      idIdx = classIdx = -1
      styles = true
    } else if (char === 35) { // #
      idIdx = i + 1
    } else if (classIdx === -1 && char === 46) { // .
      classIdx = i
    }
  }
}

function atHelper(x) {
  return atsCache[x] || x
}

function parseStyles(idx, end) {
  for (let i = idx; i <= x.length; i++) {
    char = x.charCodeAt(i)

    if (quote === -1 && valueStart >= 0 && ((colon ? char === 59 : valueEndChar(char) || (end && i === x.length)))) {
      numberStart > -1 && !isUnit(char) && addUnit(i)
      prop === '@import'
        ? insert(prop + ' ' + x.slice(valueStart, i), 0)
        : rule += propValue(prop, value + x.slice(valueStart, i))
      hasRules = true
      start = valueStart = -1
      colon = false
      prop = value = ''
    }

    if (quote !== -1) {
      if (quote === char && x.charCodeAt(i - 1) !== 92) // \
        quote = -1
    } else if (quote === -1 && quoteChar(char)) {
      quote = char
      if (valueStart === -1)
        valueStart = i
    } else if (char === 123) { // {
      if (prop === 'animation') {
        rule && (rules[path || '&'] = rule)
        animation = value + x.slice(valueStart, i).trim()
        keyframes = value = ''
        rule = ''
      } else if (animation) {
        keyframe = x.slice(start, i).trim()
        rule = ''
      } else {
        rule && (rules[path || '&'] = rule)
        selector = startChar === 64
          ? atHelper(prop + value + x.slice(valueStart, i).trim())
          : x.slice(start, i).trim()
        selector.indexOf(',') !== -1 && (selector = splitSelector(selector))
        selectors.push((noSpace(startChar) ? '' : ' ') + selector)
        path = selectors.toString()
        rule = rules[path || '&'] || ''
      }
      start = valueStart = -1
      prop = ''
    } else if (char === 125 || (end && i === x.length)) { // }
      if (keyframe) {
        keyframes += keyframe + '{' + rule + '}'
        keyframe = rule = ''
      } else if (animation) {
        insert('@keyframes ' + prefix + ++uid + '{' + keyframes + '}')
        rule = (rules[path || '&'] || '') + propValue('animation', animation + ' ' + prefix + uid)
        animation = ''
      } else {
        rule && (rules[path || '&'] = rule)
        selectors.pop()
        path = selectors.toString()
        rule = rules[path || '&'] || ''
      }
      start = valueStart = -1
      prop = ''
    } else if (i !== x.length && start === -1 && isStartChar(char)) {
      start = i
      startChar = char
    } else if (!prop && start >= 0 && propEndChar(char)) {
      prop = x.slice(start, i)
      colon = char === 58 // :
    } else if (valueStart === -1 && prop && !propEndChar(char)) {
      valueStart = i
      isNumber(char) && (numberStart = i)
    } else if (valueStart !== -1) {
      if (isNumber(char))
        numberStart === -1 && (numberStart = i)
      else if (numberStart > -1)
        addUnit(i)

      if (char === 40) // (
        fn.push(x.slice(Math.max(lastSpace, valueStart), i))
      else if (char === 41) // )
        fn.pop()
      else if (char === 9 || char === 32)
        lastSpace = i + 1
    }
  }
}

function addUnit(i) {
  if (!isUnit(char)) {
    value = value + x.slice(valueStart, i) + getUnit(prop, last(fn))
    valueStart = i
  }
  numberStart = -1
}

export function renderValue(x, unit) {
  typeof x === 'function' && (x = value())
  return typeof x !== 'string' || isUnit(x.charCodeAt(x.length - 1))
    ? x + unit
    : x
}

export function getUnit(prop, fn = '') {
  prop = shorthand(prop)
  const id = prop + ',' + fn
  if (id in unitCache)
    return unitCache[id]

  return unitCache[id] = (
    fn && (fn.indexOf('translate') === 0 || 'perspective blur drop-shadow inset polygon'.indexOf(fn) > -1)
      ? 'px'
      : fn.indexOf('rotate') === 0 || fn.indexOf('skew') === 0
        ? 'deg'
        : fn
          ? ''
          : px(prop)
  )
}

selectors.toString = function() {
  let a = ''
    , b = ''
  selectors.forEach(x =>
    x.charCodeAt(0) === 64
      ? (a += x)
      : (b += x)
  )
  return (a ? a + '{' : '') + '&' + b
}

function px(x) {
  x = shorthand(x)
  if ((x[0] === '-' && x[1] === '-') || x in pxCache)
    return pxCache[x]

  try {
    dom.style[x] = '1px'
    dom.style.setProperty(x, '1px')
    return pxCache[x] = dom.style[x].slice(-3) === '1px' ? 'px' : ''
  } catch (err) {
    return pxCache[x] = ''
  }
}

function vendor(x) {
  if (properties.indexOf(x) === -1) {
    if (vendorMap[x]) {
      console.log(x, 'prefixed to', vendorMap[x]) // eslint-disable-line
      return vendorMap[x]
    }
    x.indexOf('--') !== 0 && console.log(x, 'not found') // eslint-disable-line
  }
  return x
}
