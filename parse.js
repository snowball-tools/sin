import window from './window.js'

export default parse

const document = window.document
    , style = document && document.querySelector && (document.querySelector('.sin') || document.createElement('style'))
    , prefix = style && style.getAttribute('id') || 'sin-' + ('000000' + (Math.random() * Math.pow(36, 6) | 0).toString(36)).slice(-6)
    , dom = document.createElement('div')
    , vendorRegex = /^(o|O|ms|MS|Ms|moz|Moz|webkit|Webkit|WebKit)([A-Z])/
    , snake = x => x.replace(/(\B[A-Z])/g, '-$1').toLowerCase()
    , findWidth = x => x ? x.hasOwnProperty('width') ? x : findWidth(Object.getPrototypeOf(x)) : {}
    , initials = (acc, x) => (acc[x.split('-').map(x => x[0]).join('')] = x, acc)
    , propCache = {}
    , atsCache = {}

export const ats = x => Object.entries(x).forEach(([k, v]) => atsCache['@' + k] = v)

parse.prefix = prefix

const pxCache = {
  flex: 0,
  border: 1,
  transform: 1,
  'line-height': 0,
  'box-shadow': 1,
  'border-top': 1,
  'border-left': 1,
  'border-right': 1,
  'border-bottom': 1
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

const popular = ['align-items','bottom','background-color','border-radius','box-shadow','background-image','color','display','float','flex-direction','font-family','font-size','height','justify-content','left','line-height','letter-spacing','margin','margin-bottom','margin-left','margin-right','margin-top','opacity','padding','padding-bottom','padding-left','padding-right','padding-top','right','top','text-align','text-decoration','text-transform','width']
const shorthands = Object.assign(properties.reduce(initials, {}), popular.reduce(initials, {}))

const cache = new WeakMap()
    , cssVars = typeof window !== 'undefined' && window.CSS && CSS.supports('color', 'var(--support-test)')
    , isStartChar = x => x !== 32 && x !== 9 && x !== 10 && x !== 13 && x !== 59
    , quoteChar = x => x === 34 || x === 39
    , propEndChar = x => x === 32 || x === 58 || x === 9
    , valueEndChar = x => x === 59 || x === 10 || x === 125
    , noSpace = x => x === 58 || x === 64 || x === 38 || x === 91
    , selectors = []
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
  , uid = 0
  , className = ''
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
  , at = false
  , styles = false
  , cacheable = true
  , fontFaces = -1

function shorthand(x) {
  return shorthands[x] || x
}

function propValue(x, v) {
  x = colon ? x : renderProp(x)

  return x
    + ':' +
   (colon ? v : renderValue(x, v))
    + ';'
}

function renderProp(x) {
  return propCache[x] || (propCache[x] = vendor(shorthand(x)))
}

export function renderValue(prop, value) {
  return px(prop)
    ? ('' + value).replace(/(^| )?(-?[0-9.]+)( |$)/g, '$1$2px$3')
    : value
}

function splitSelector(x) {
  return x.replace(/,\s*[:[]?/g, x => noSpace(x.charCodeAt(x.length - 1)) ? ',&' + x[x.length - 1] : ',& ')
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
  valueStart = fontFaces = -1
  rules = root ? {} : null
  styles = false
  cacheable = true

  x = xs[0]
  for (let j = 0; j < xs.length; j++) {
    rules
      ? parseStyles(0, j === xs.length - 1)
      : parseSelector(xs, j, args, parent)

    x = xs[j + 1]
    if (j < args.length) {
      if (valueStart >= 0) {
        vars[varName = '--' + prefix + uid + j] = { prop, index: j }
        value += xs[j].slice(valueStart) + 'var(' + varName + ')'
        valueStart = 0
      } else {
        x += args[j] + ';'
        cacheable = false
      }
    }
  }

  if (rules) {
    if (root) {
      Object.entries(rules).forEach(([k, v]) =>
        insert(k.replace(/&\s*/g, '') + '{' + v)
      )
    } else {
      className = prefix + uid++
      classes += (classes ? ' ' : '') + className
      for (let i = 0; i < nesting; i++)
        className += '.' + className

      Object.entries(rules).forEach(([k, v]) => {
        insert(k.replace(/&/g, '.' + className) + '{' + v)
      })
    }
  }


  const node = name ? document.createElement(name) : parent.node
  name && node.setAttribute('class', classes)

  const result = {
    node,
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
      classes = (classIdx !== -1 ? x.slice(classIdx + 1, i).replace(/\./g, ' ') : '') + classes + parent.classes
      id = (idIdx !== -1 ? x.slice(idIdx, classIdx || i) : '') || parent?.id
      name = x.slice(0, id
        ? idIdx - 1
        : (classIdx !== -1 ? classIdx : i)
      ).toUpperCase() || parent.name
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

    if (quote === -1 && valueStart >= 0 && (colon ? char === 59 : valueEndChar(char))) {
      prop === '@import'
        ? insert(prop + ' ' + x.slice(valueStart, i), 0)
        : rule += propValue(prop, value + x.slice(valueStart, i))
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
        !selectors.length && (at = startChar === 64)
        selector = at
          ? atHelper(x.slice(start, i).trim())
          : x.slice(start, i).trim()
        selector.indexOf(',') !== -1 && (selector = splitSelector(selector))
        selectors.push(
          (noSpace(startChar) ? '' : ' ') + selector
          + (at
            ? selector.indexOf('@font-face') === 0
              ? Array(++fontFaces + 1).join(' ')
              : '{'
            : ''
          )
          + (x.slice(start, start + 6) === '@media' ? '&' : '')
        )
        path = (at ? '' : '&') + selectors.join('')
        rule = rules[path || '&'] || ''
      }
      start = valueStart = -1
      prop = ''
    } else if (char === 125 || (i === x.length && end)) { // }
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
        path = (at ? '' : '&') + selectors.join('')
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
    }
  }
}

function px(x) {
  if ((x[0] === '-' && x[1] === '-') || x in pxCache)
    return pxCache[x]

  try {
    dom.style[x] = '1px'
    dom.style.setProperty(x, '1px')
    return pxCache[x] = dom.style[x].slice(-3) === '1px'
  } catch (err) {
    return pxCache[x] = false
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
