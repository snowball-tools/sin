import window from './window.js'
import View from '../src/view.js'
import { cleanSlash, className, ignoredAttr, isEvent, isFunction, asArray, notValue, hasOwn } from '../src/shared.js'
import { asLocation, wrap } from './shared.js'
import { formatValue, cssRules } from '../src/style.js'
import router from '../src/router.js'
import s from '../src/index.js'
import mimes from 'ey/src/mimes.js'
import query from '../src/query.js'

export { wrap }

class TimeoutError extends Error {}

s.isServer = true
s.mimes = mimes
s.trust = trust

let lastWasText = false

const ignoredServerAttr = x => x !== 'href' && x !== 'type' && ignoredAttr(x)
const uidSymbol = Symbol('uid')
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

export default async function({ view = () => '', attrs = {}, context = {} } = {}, serverAttrs = {}, serverContext = {}) {
  serverContext.location = window.location = asLocation(
    typeof serverContext.location === 'string'
      ? new URL(serverContext.location, 'http://localhost/')
      : serverContext.location
  )

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
    title: s.live(''),
    status: s.live(200),
    links: s.live('', x => links.add(x)),
    head: s.live('', x => [].concat(x).forEach(x => head += x instanceof View ? headElement(x) : x)),
    headers: s.live({}, x => Object.assign(headers, x))
  }

  attrs = { ...attrs, ...serverAttrs }
  context = {
    ...context,
    ...serverContext,
    doc,
    [uidSymbol]: 1
  }

  context.route = router(s, '', context)

  let x
  try {
    x = view(attrs, [], context)
  } catch (error) {
    x = context.error(error, attrs, [], context)
  }

  const html = '<!--h-->' + await Promise.race([
    updateChildren(asArray(x), context),
    new Promise((r, e) => setTimeout(e, 'timeout' in context ? context.timeout : defaultTimeout, new TimeoutError()).unref())
  ]).catch(async error => {
    context.doc.status(error instanceof TimeoutError ? 408 : 500)
    return await updateChildren([].concat(context.error(error, attrs, [], context)), context)
  })

  const css = '<style class="sin">'
    + cssRules().map(x => x.startsWith('@media') ? x + '}' : x).join('')
    + '</style>'

  return {
    headers,
    links,
    status: context.doc.status(),
    title: context.doc.title(),
    lang: context.doc.lang(),
    css, // perhaps remove classes according to names in html
    html,
    head
  }
}

async function update(view, context) {
  return isFunction(view)
    ? update(view(), context)
    : view instanceof View
      ? view.component
        ? updateComponent(view, context)
        : updateElement(view, context)
      : view instanceof Promise
        ? update(s(() => view)(), context)
        : view instanceof window.Node
          ? view.trusted
          : Array.isArray(view)
            ? updateArray(view, context)
            : view || view === 0 || view === ''
              ? updateText(view)
              : updateComment(view)
}

function tagName(view) {
  return (view.tag.name || 'div').toLowerCase()
}

async function updateElement(view, context) {
  lastWasText = false
  const tag = tagName(view)
  const internal = !String(view.attrs.href).match(/^[a-z]+:|\/\//)
  hasOwn.call(view.attrs, 'id') === false && view.tag.id && (view.attrs.id = view.tag.id)
  if (hasOwn.call(view.attrs, 'href') && internal) {
    view.attrs.href = cleanSlash(view.attrs.href)
    context.doc.links(view.attrs.href)
  }
  return openingTag(view, tag)
    + (voidTags.has(tag)
      ? ''
      : (view.children && view.children.length
        ? await updateChildren(view.children, context)
        : ''
      ) + '</' + tag + '>'
    )
}

function headElement(view) {
  const tag = tagName(view)
  return openingTag(view, tag)
      + (voidTags[tag]
        ? ''
        : (view.children
          ? view.children.join('')
          : ''
        ) + (
          voidTags.has(tag)
            ? ''
            : '</' + tag + '>'
        )
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
        acc += k + ':' + formatValue(view.tag.args[v.index], v) + ';', ''
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

async function updateChildren(xs, context) {
  lastWasText = false
  return (await Promise.all(xs.map(x => update(x, context)))).join('')
}

async function updateArray(xs, context) {
  lastWasText = false
  return '<!--[' + xs.length + '-->' + (await Promise.all(xs.map(x => update(x, context)))).join('')
}

function updateText(view) {
  const x = (lastWasText ? '<!--,-->' : '') + escape(view)
  lastWasText = true
  return x
}

function updateComment(view) {
  lastWasText = false
  return '<!--' + view + '-->'
}

async function updateComponent(view, context) {
  lastWasText = false
  let x = view.component[0](view.attrs, view.children, context)
  const isAsync = x && isFunction(x.then) && ('<!--a' + context[uidSymbol]++ + '-->') || ''
  isAsync && (x = await x)
  x && hasOwn.call(x, 'default') && (x = x.default)
  isFunction(x) && (x = x(view.attrs, view.children, context))
  return isAsync + (await update(x, context)) + isAsync.replace('a', '/a')
}

function escape(x = '') {
  let s = ''
  let c = -1
  let l = -1
  for (let i = 0; i < x.length; i++) {
    c = x.charCodeAt(i)
    c === 60 ? s += x.slice(l + 1, l = i) + '&lt;' : // <
      c === 62 ? s += x.slice(l + 1, l = i) + '&gt;' : // >
      c === 38 && (s += x.slice(l + 1, l = i) + '&amp;') // &
  }
  return s || x
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
  let s = ''
  let c = -1
  let l = -1
  for (let i = 0; i < x.length; i++) {
    c = x.charCodeAt(i)
    c === 34 ? s += x.slice(l + 1, l = i) + '&quot;' : // "
      c === 60 ? s += x.slice(l + 1, l = i) + '&lt;' : // <
      c === 62 ? s += x.slice(l + 1, l = i) + '&gt;' : // >
      c === 38 && (s += x.slice(l + 1, l = i) + '&amp;') // &
  }
  return s || x
}

function trust(strings, ...values) {
  Array.isArray(strings.raw) || (strings = Object.assign([strings], { raw: [strings] }))
  const html = String.raw(strings, ...values)
      , count = rootNodeCount(html)

  return new window.Node('<!--[' + count + '-->' + html + '<!--,-->')
}

function rootNodeCount(x) {
  let char = -1
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
        voidTags.has(x.slice(start, i).toLowerCase())
          ? depth === 0 && count++
          : depth++
        start = -1
      }
    } else if (char === 47) {
      start === i && (start = -1, end = i + 1)
    }
  }
  return count
}
