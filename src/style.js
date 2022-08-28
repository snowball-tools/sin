import window from './window.js'
import { isFunction, snake, asCssVar, isServer } from './shared.js'
import { popular, initials } from './shorthands.js'

const doc = window.document
    , style = doc.querySelector('style.sin') || doc.createElement('style')
    , vendorRegex = /^(ms|moz|webkit)[-A-Z]/i
    , prefix = style && style.getAttribute('id') || 'sin-'
    , div = doc.createElement('div')
    , mediasCache = {}
    , propCache = {}
    , unitCache = {}

export const cssRules = () => style.sheet.cssRules
export const medias = x => Object.entries(x).forEach(([k, v]) => mediasCache['@' + k] = v)

const pxCache = {
  flex: '',
  border: 'px',
  'line-height': '',
  'box-shadow': 'px',
  'border-top': 'px',
  'border-left': 'px',
  'border-right': 'px',
  'border-bottom': 'px',
  'text-shadow': 'px',
  '@media': 'px'
}

const properties = Array.from(
  Object.keys(div.style.hasOwnProperty('width') ? div.style : Object.getPrototypeOf(div.style))
  .reduce((acc, x) => (acc.add(x.match(vendorRegex) ? '-' + snake(x) : snake(x)), acc), new Set(['float']))
)

const shorthands = Object.assign(properties.reduce(initials, {}), popular.reduce(initials, {}))

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

const cache = new Map()
    , cssVars = isServer || (typeof window !== 'undefined' && window.CSS && CSS.supports('color', 'var(--support-test)'))
    , pxFunctions = ['perspective', 'blur', 'drop-shadow', 'inset', 'polygon']
    , isPxFunction = x => (x.indexOf('translate') === 0 || pxFunctions.indexOf(x) > -1)
    , isDegFunction = x => x.indexOf('rotate') === 0 || x.indexOf('skew') === 0
    , isStartChar = x => x !== 32 && x !== 9 && x !== 10 && x !== 13 && x !== 59 // ws \t \n \r ;
    , isNumber = x => (x >= 48 && x <= 57) || x === 46 // 0-9-.
    , isLetter = x => (x >= 65 && x <= 90) || (x >= 97 && x <= 122) // a-z A-Z
    , isUnit = x => x === 37 || (x >= 65 && x <= 90) || (x >= 97 && x <= 122) // % a-z A-Z
    , quoteChar = x => x === 34 || x === 39 // '"
    , propEndChar = x => x === 32 || x === 58 || x === 9 // ws : \t
    , valueEndChar = x => x === 59 || x === 10 || x === 125 // ; \n }
    , noSpace = x => x === 58 || x === 64 || x === 38 || x === 91 // : @ & [
    , strict = x => x === 59 || x === 125
    , last = xs => xs[xs.length - 1]
    , selectors = []
    , fn = []

let start = -1
  , valueStart = -1
  , classIdx = -1
  , idIdx = -1
  , startChar = -1
  , quote = -1
  , char = -1
  , lastSpace = -1
  , numberStart = -1
  , fontFaces = -1
  , cssVar = -1
  , temp = ''
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
  , hash = 0

function shorthand(x) {
  return shorthands[x] || x
}

function propValue(r, x, v) {
  return (r ? ';' : '') + (colon ? x : renderProp(x)) + ':' + v
}

function renderProp(x) {
  return propCache[x] || (propCache[x] = vendor(shorthand(x)))
}

function splitSelector(x) {
  return x.replace(/,\s*[:[]?/g, x => noSpace(x.charCodeAt(x.length - 1)) ? ',&' + last(x) : ',& ')
}

function insert(rule, index) {
  if (append) {
    style && doc.head && doc.head.appendChild(style)
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

export function parse([xs, ...args], parent, nesting = 0, root) {
  if (cache.has(xs)) {
    const prev = cache.get(xs)
    return {
      ...prev,
      args
    }
  }

  const vars = {}
  name = id = classes = rule = value = prop = ''
  selectors.length = fn.length = hash = 0
  lastSpace = valueStart = fontFaces = startChar = cssVar = -1
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
    if (j < args.length) {
      if (cssVars && valueStart >= 0) {
        const before = xs[j].slice(valueStart)
        temp = prefix + Math.abs(hash).toString(31)
        vars[varName = '--' + temp + j] = { property: prop, unit: getUnit(prop, last(fn)), index: j }
        value += before + 'var(' + varName + ')'
        valueStart = 0
      } else {
        args[j] && (x = args[j] + x)
        cacheable = false
      }
    }
  }

  if (hasRules) {
    if (root) {
      Object.entries(rules).forEach(([k, v]) => {
        insert(k.replace(/&\s+/g, '').replace(/{&$/, '') + '{' + v + '}')
      }
      )
    } else {
      temp = prefix + Math.abs(hash).toString(31)
      classes += (classes ? ' ' : '') + temp
      specificity = ''
      for (let i = 0; i < nesting; i++)
        specificity += '.' + temp

      Object.entries(rules).forEach(([k, v]) => {
        insert(k.replace(/&/g, '.' + temp + specificity) + '{' + v + '}')
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
    i < x.length && (hash = Math.imul(31, hash) + char | 0)

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
      ) + classes + (parent ? ' ' + parent.classes : '')

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
  return mediasCache[x] || x
}

function parseStyles(idx, end) {
  for (let i = idx; i <= x.length; i++) { // rewrite to i < length and avoid NaN charCode
    char = x.charCodeAt(i)
    i < x.length && (hash = Math.imul(31, hash) + char | 0)

    if (quote === -1 && valueStart >= 0 && ((colon ? strict(char) : valueEndChar(char) || (end && i === x.length))))
      addRule(i)

    if (quote !== -1) {
      if (quote === char && x.charCodeAt(i - 1) !== 92) // \
        quote = -1
    } else if (quote === -1 && quoteChar(char)) {
      quote = char
      if (valueStart === -1)
        valueStart = i
    } else if (char === 123) { // {
      startBlock(i)
    } else if (char === 125 || (end && i === x.length)) { // }
      endBlock()
    } else if (i !== x.length && start === -1 && isStartChar(char)) {
      start = i
      startChar = char
    } else if (!prop && start >= 0 && propEndChar(char)) {
      prop = x.slice(start, i)
      colon = char === 58 // :
    } else if (valueStart === -1 && prop && !propEndChar(char)) {
      valueStart = i
      isNumber(char)
        ? (numberStart = i)
        : char === 36 && (cssVar = i)
    } else if (valueStart !== -1) {
      handleValue(i)
    }
  }
}

function addRule(i) {
  numberStart > -1 && !isUnit(char)
    ? addUnit(i)
    : cssVar > -1 && addCssVar(i)

  prop === '@import'
    ? insert(prop + ' ' + x.slice(valueStart, i) + ';', 0)
    : rule += propValue(rule, prop, value + x.slice(valueStart, i)).trim()
  hasRules = true
  start = valueStart = -1
  colon = false
  prop = value = ''
}

function startBlock(i) {
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
    selector = startChar === 64 // @
      ? atHelper(prop + (value || ' ') + x.slice(valueStart, i)).trim()
      : x.slice(start, i).trim()
    selector.indexOf(',') !== -1 && (selector = splitSelector(selector))
    value = prop = ''
    selectors.push(
      (noSpace(startChar) ? '' : ' ')
      + (selector === '@font-face' ? Array(++fontFaces + 1).join(' ') : '') // unique font-face selector for rules
      + selector
    )
    path = getPath(selectors)
    rule = rules[path || '&'] || ''
  }
  start = valueStart = -1
  prop = ''
}

function endBlock() {
  if (keyframe) {
    keyframes += keyframe + '{' + rule + '}'
    keyframe = rule = ''
  } else if (animation) {
    temp = prefix + Math.abs(hash).toString(31)
    insert('@keyframes ' + temp + '{' + keyframes + '}')
    rule = (rules[path || '&'] || '') + propValue(rule, 'animation', animation + ' ' + temp)
    animation = ''
  } else {
    selectors.pop()
    selectors.length && selectors[0].indexOf('@keyframes') === 0
      ? rules[selectors[0]] = (rules[selectors[0]] || '') + selector + '{' + rule + '}'
      : (rule && (rules[path || '&'] = rule + selectors.map(x => x.charCodeAt(0) === 64 ? '}' : '').join('')))
    path = getPath(selectors)
    rule = rules[path || '&'] || ''
  }
  start = valueStart = -1
  prop = ''
}

function handleValue(i) {
  if (isNumber(char))
    numberStart === -1 && (numberStart = i)
  else if (numberStart > -1)
    addUnit(i)
  else if (cssVar > -1)
    addCssVar(i)

  if (char === 40) // (
    fn.push(x.slice(Math.max(lastSpace, valueStart), i))
  else if (char === 41) // )
    fn.pop()
  else if (char === 9 || char === 32) // ws \n
    lastSpace = i + 1
  else if (char === 36) // $
    cssVar = i
}

function addCssVar(i) {
  if (!isLetter(char)) {
    value = value + x.slice(valueStart, cssVar) + 'var(--' + x.slice(cssVar + 1, i) + ')'
    valueStart = i
    cssVar = -1
  }
}

function addUnit(i) {
  if (!isUnit(char)) {
    value = value + x.slice(valueStart, i) + getUnit(prop, last(fn))
    valueStart = i
  }
  numberStart = -1
}

function getUnit(prop, fn = '') {
  prop = shorthand(prop)
  const id = prop + ',' + fn
  if (id in unitCache)
    return unitCache[id]

  return unitCache[id] = (
    fn && isPxFunction(fn)
      ? 'px'
      : isDegFunction(fn)
        ? 'deg'
        : fn
          ? ''
          : px(prop)
  )
}

export function formatValue(v, { property, unit }) {
  if (!v && v !== 0)
    return ''

  isFunction(v) && (v = v())
  if (typeof v === 'number')
    return v + unit

  typeof v !== 'string' && (v = '' + v)
  if (v.charCodeAt(0) === 36)
    return 'var(--' + v.slice(1) + ')'

  x = v
  value = ''
  valueStart = 0
  numberStart = lastSpace = -1
  fn.length = 0
  prop = property
  for (let i = 0; i <= v.length; i++) {
    char = v.charCodeAt(i)
    handleValue(i)
  }
  return value + v.slice(valueStart)
}

function getPath(selectors) {
  let a = ''
    , b = ''

  selectors.forEach(x =>
    x.charCodeAt(0) === 64 && x !== '@font-face'
      ? (a += x + '{')
      : (b += x)
  )
  return a + (b === '@font-face' || b === ':root' ? '' : '&') + b
}

function px(x) {
  x = shorthand(x)
  if (asCssVar(x) || x in pxCache)
    return pxCache[x]

  try {
    div.style[x] = '1px'
    div.style.setProperty(x, '1px')
    return pxCache[x] = div.style[x].slice(-3) === '1px' ? 'px' : ''
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
    x.indexOf('--') !== 0 && console.error(x, 'css property not found') // eslint-disable-line
  }
  return x
}
