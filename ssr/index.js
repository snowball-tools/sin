import window from './window.js'
import {
  cleanHref,
  className,
  ignoredAttr,
  tryPromise,
  isPromise,
  isEvent,
  isFunction,
  getName,
  getId,
  asArray,
  notValue,
  hasOwn,
  mergeTag,
  noop
} from '../src/shared.js'
import { asLocation, wrap } from './shared.js'
import { formatValue, cssRules } from '../src/style.js'
import router from '../src/router.js'
import s from '../src/index.js'
import mimes from '../shared/server/mimes.js'
import query from '../src/query.js'

export { wrap }

class TimeoutError extends Error {}

s.is = { server: s.isServer = window.isServerSin = true }
s.title = process.env.SIN_TITLE
s.mimes = mimes
s.trust = trust

let lastWasText = false
  , wasText = false

const noscript = process.env.SIN_NOSCRIPT
const ignoredServerAttr = x => x !== 'href' && x !== 'type' && ignoredAttr(x)
const $uid = Symbol('uid')
const defaultTimeout = 1000 * 60 * 2
const voidTags = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
])

export default function(mount, serverAttrs = {}, serverContext = {}) {
  if (!mount)
    return {}

  let { view, attrs, context, View } = mount
  serverContext.location = window.location = asLocation(
    typeof serverContext.location === 'string'
      ? new URL(serverContext.location, 'http://localhost/')
      : serverContext.location
  )

  serverContext.View = View
  serverContext.query = query(s, window.location)

  const headers = {
    Server: 'Sin',
    'Content-Type': 'text/html; charset=UTF-8',
    ...(serverContext.headers || {})
  }

  let head = ''
    , links = new Set()

  const doc = {
    lang: s.live(),
    title: s.live(s.title),
    status: s.live(200),
    doctype: s.live('html'),
    links: s.live('', x => links.add(x)),
    head: s.live('', x => [].concat(x).forEach(x => head += typeof x === 'string' ? x : update(x, { ...context, noscript: true }))),
    headers: s.live({}, x => Object.assign(headers, x))
  }

  attrs = { ...attrs, ...serverAttrs }
  context = {
    ...context,
    ...serverContext,
    noscript,
    doc,
    [$uid]: 1,
    onremove: noop,
    ignore: noop,
    redraw: noop,
    refresh: noop,
    reload: noop
  }

  context.route = router(s, '', context)

  let x
  try {
    x = view(attrs, [], context)
  } catch (error) {
    x = context.error(error, attrs, [], context)
  }

  let result = updateChildren(asArray(x), context)
  isPromise(result) && (result =
    Promise.race([
      result,
      new Promise((r, e) => setTimeout(e, 'timeout' in context ? context.timeout : defaultTimeout, new TimeoutError()).unref())
    ]).catch(error => {
      context.doc.status(error instanceof TimeoutError ? 408 : 500)
      return tryPromise(updateChildren([].concat(context.error(error, attrs, [], context)), context), x => x)
    })
  )

  return tryPromise(result, (x, was) => {
    const css = '<style class=sin>' + cssRules().join('') + '</style>'

    return {
      headers,
      links,
      status: context.doc.status(),
      title: context.doc.title() || s.title,
      lang: context.doc.lang(),
      css, // perhaps remove classes according to names in html
      html: (context.noscript || !mount ? '' : '<!--h-->') + x,
      head
    }
  })
}

function update(view, context) {
  wasText = false
  const x = isFunction(view)
    ? update(view(), context)
    : view instanceof context.View
      ? view.component
        ? updateComponent(view, context)
        : updateElement(view, context)
      : view instanceof Promise
        ? update(s(() => view)(), context)
        : view instanceof window.Node
          ? view.trusted
          : Array.isArray(view)
            ? updateArray(view, context)
            : typeof view === 'boolean' || view == null
              ? updateComment(view, context)
              : (wasText = updateText(view, context))
  lastWasText = wasText
  wasText = false
  return x
}

function updateElement(view, context) {
  const tag = context.NS
    ? getName(view.tag)
    : (getName(view.tag) || 'div').toLowerCase()
  const internal = !String(view.attrs.href).match(/^[a-z]+:|\/\//)
  if (hasOwn.call(view.attrs, 'id') === false) {
    const id = getId(view.tag)
    id && (view.attrs.id = id)
  }
  if (getName(view.tag) === 'a' && hasOwn.call(view.attrs, 'href') && internal) {
    view.attrs.href = cleanHref(view.attrs.href)
    context.doc.links(view.attrs.href)
  }
  return tryPromise(updateChildren(view.children, context), x =>
    elementString(view, tag, x)
  )
}

function elementString(view, tag, content) {
  return openingTag(view, tag)
    + (voidTags.has(tag)
      ? ''
      : (view.children && view.children.length
        ? content
        : ''
      ) + '</' + tag + '>'
    )
}

function openingTag(view, tag) {
  return '<'
    + tag
    + getClassName(view)
    + Object.entries(view.attrs).reduce((acc, [k, v]) => acc += renderAttr(k, v), '')
    + getCssVars(view)
    + '>'
}

function getCssVars(view) {
  if (!view.tag.args.length)
    return ''

  return ' style="'
    + escapeAttrValue(
      Object.entries(view.tag.vars).reduce((acc, [k, v]) =>
        acc += k + ': ' + formatValue(view.tag.args[v.index], v) + ';', ''
      )
      + (view.attrs.style || '')
    )
    + '"'
}

function renderAttr(k, v) {
  return ignoredServerAttr(k) || isEvent(k) || notValue(v)
    ? ''
    : (' ' + escapeAttr(k) + (
      v === true
        ? ''
        : '="' + escapeAttrValue(v) + '"'
    ))
}

function getClassName(view) {
  const classes = className(view)
  return classes
    ? ' class="' + escape(classes) + '"'
    : ''
}

function updateChildren(xs, context) {
  let async = false
  const results = xs.map(x => {
    const result = update(x, context)
    isPromise(result) && (async = true)
    return result
  })
  return async
    ? Promise.all(results).then(xs => xs.join(''))
    : results.join('')
}

function updateArray(xs, context) {
  let async = false
  const results = xs.map(x => {
    const result = update(x, context)
    isPromise(result) && (async = true)
    return result
  })

  const first = (context.noscript ? '' : '<!--[' + xs.length + '-->')
  return async
    ? Promise.all(results).then(x => first + x.join(''))
    : first + results.join('')
}

function updateText(view, context) {
  return (lastWasText && !context.noscript ? '<!--,-->' : '') + escape(view)
}

function updateComment(view) {
  return '<!--' + view + '-->'
}

function updateComponent(view, context) {
  let x = view.component[0](view.attrs, view.children, context)
  mergeTag(x, view)
  return tryPromise(x, (x, wasPromise) => {
    const asyncId = wasPromise && ('<!--a' + context[$uid]++ + '-->') || ''
    x && hasOwn.call(x, 'default') && (x = x.default) // we might be able to move check above
    isFunction(x) && (x = x(view.attrs, view.children, context))
    return tryPromise(update(x, context), x => (
      context.noscript ? '' : asyncId)
      + x
      + (context.noscript ? '' : asyncId.replace('a', '/a'))
    )
  })
}

function escape(x = '') {
  x = '' + x
  let s = ''
  let c = -1
  let l = -1
  for (let i = 0; i < x.length; i++) {
    c = x.charCodeAt(i)
    c === 60 ? s += x.slice(l + 1, l = i) + '&lt;' : // <
    c === 62 ? s += x.slice(l + 1, l = i) + '&gt;' : // >
    c === 38 && (s += x.slice(l + 1, l = i) + '&amp;') // &
  }
  return l !== -1
    ? s + x.slice(l + 1)
    : x
}

function escapeAttr(x = '') {
  let s = ''
  let c = -1
  let l = -1
  for (let i = 0; i < x.length; i++) {
    c = x.charCodeAt(i)
    c !== 45 && (c < 97 || c > 122) && (c < 65 || c > 90) && (s += x.slice(l + 1, l = i)) // -a-zA-Z
  }
  return s || x
}

function escapeAttrValue(x = '') {
  typeof x === 'string' || (x = '' + x)
  let s = ''
  let c = -1
  let l = -1
  for (let i = 0; i < x.length; i++) {
    c = x.charCodeAt(i)
    c === 34 ? s += x.slice(l + 1, l = i) + '&quot;' : // "
    c === 60 ? s += x.slice(l + 1, l = i) + '&lt;' :   // <
    c === 62 ? s += x.slice(l + 1, l = i) + '&gt;' :   // >
    c === 38 && (s += x.slice(l + 1, l = i) + '&amp;') // &
  }
  return s || x
}

function trust(strings, ...values) {
  const html = String.raw({ raw: Array.isArray(strings.raw) ? strings.raw : [strings] }, ...values)
      , count = rootNodeCount(html) + 1

  return new window.Node(
      (noscript ? '' : '<!--[' + count + '-->')
    + html.trim()
    + (noscript ? '' : '<!--trust-->')
  )
}

function rootNodeCount(x) {
  let char = -1
    , last = -1
    , start = -1
    , end = -1
    , count = 0
    , depth = 0

  for (let i = 0; i < x.length; i++) {
    char = x.charCodeAt(i)
    if (char === 60) { // <
      start = i + 1
    } else if (char === 62) { // >
      if (end >= 0) {
        --depth || count++
        end = -1
      } else if (start >= 0) {
        last === 47 || voidTags.has(x.slice(start, i).toLowerCase()) // /
          ? depth === 0 && count++
          : depth++
        start = -1
      }
    } else if (char === 47) { // /
      start === i && (start = -1, end = i + 1)
    }
    last = char
  }
  return count
}
