export default parse

const doc = typeof document !== 'undefined' && window.document
    , style = doc.createElement('style')

const prefix = 'uid'
    , cache = new WeakMap()
    , cssVars = window.CSS && CSS.supports('color', 'var(--support-test)')
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
  , colon = -1
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
  , rules = null
  , append = true
  , at = false
  , styles = false

function propValue(x, v) {
  return x + ':' + v + ';'
}

function splitSelector(x) {
  return x.replace(/,\s*[\:\[]?/g, x => noSpace(x.charCodeAt(x.length - 1)) ? ',&' + x[x.length - 1] : ',& ')
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
        index || style.sheet.cssRules.length
      )
    } catch (e) {
      console.error('Insert rule error:', e, rule)
    }
  }
}

function parse([xs, ...args], parent, nesting = 0) {
  if (cache.has(xs)) {
    const prev = cache.get(xs)
    prev.args = args
    return prev
  }

  const vars = []
  name = id = classes = rule = value = ''
  selectors.length = 0
  valueStart = -1
  rules = null
  styles = false

  for (let j = 0; j < xs.length; j++) {
    x = xs[j]
    rules
      ? parseStyles(0, j === xs.length - 1)
      : parseSelector(xs, j, args, parent)

    if (j < args.length && valueStart >= 0) {
      value += xs[j].slice(valueStart) + arg(j, vars, args)
      valueStart = 0
    }
  }

  if (rules) {
    className = prefix + ++uid
    classes ? classes += ' ' + className : classes = className

    for (let i = 0; i < nesting; i++)
      className += '.' + className

    Object.entries(rules).forEach(([k, v]) => {
      insert(k.replace(/&/g, '.' + className) + '{' + v)
    })
  }

  const result = { name, id, classes, args, vars }
  cache.set(xs, result)

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
    } else if (!isStartChar(char) || Number.isNaN(char)) {
      classes = (classIdx !== -1 ? x.slice(classIdx + 1, i).replace(/\./g, ' ') : '') + classes
      id = (idIdx !== -1 ? x.slice(idIdx, classIdx || i) : '') || parent?.id
      name = x.slice(0, id
        ? idIdx - 1
        : (classIdx !== -1 ? classIdx : i)
      ).toUpperCase() || parent?.name
      idIdx = classIdx = -1
      styles = true
    } else if (char === 35) { // #
      idIdx = i + 1
    } else if (classIdx === -1 && char === 46) { // .
      classIdx = i
    }
  }
}

function parseStyles(idx, end) {
  for (let i = idx;i <= x.length; i++) {
    char = x.charCodeAt(i)

    if (quote === -1 && valueStart >= 0 && (colon ? char === 59 : valueEndChar(char))) {
      rule += propValue(prop, value + x.slice(valueStart, i))
      start = valueStart = colon = -1
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
        animation = x.slice(valueStart, i).trim()
        keyframes = ''
        rule = ''
      } else if (animation) {
        keyframe = x.slice(start, i).trim()
        rule = ''
      } else {
        rule && (rules[path || '&'] = rule)
        !selectors.length && (at = startChar === 64)
        selector = x.slice(start, i).trim()
        selector.indexOf(',') !== -1 && (selector = splitSelector(selector))
        selectors.push(
          (noSpace(startChar) ? '' : ' ') + selector
          + (startChar === 64 ? '{' : '')
          + (x.slice(start, start + 6) === '@media' ? '&' : '')
        )
        path = (at ? '' : '&') + selectors.join('')
        rule = rules[path || '&'] || ''
      }
      start = valueStart = -1
      prop = ''
    } else if (char === 125 || (Number.isNaN(char) && end)) { // }
      if (keyframe) {
        keyframes += keyframe + '{' + rule + '}'
        keyframe = rule = ''
      } else if (animation) {
        insert('@keyframes ' + prefix + uid + '{' + keyframes + '}')
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
    } else if (start === -1 && isStartChar(char)) {
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
