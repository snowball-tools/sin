import './window.js'
import View from '../src/view.js'
import { className, ignoredAttr, isEvent, isFunction, asArray, notValue } from '../src/shared.js'
import { formatValue, cssRules } from '../src/style.js'
import { router } from '../src/router.js'
import s from '../src/index.js'

let lastWasText = false

class TimeoutError extends Error {}

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

export default async function({ view, attrs, context }, serverAttrs = {}, serverContext = {}) {
  const headers = {
    Server: 'Sin',
    'Content-Type': 'text/html; charset=UTF-8',
    ...(serverContext.headers || {})
  }

  let head = ''

  attrs = { ...attrs, ...serverAttrs }
  context = {
    ...context,
    ...serverContext,
    title: s.live(''),
    status: s.live(200),
    head: s.live('', x => head += x instanceof View ? headElement(x) : x),
    headers: s.live({}),
    route: router(s, '', context),
    uid: 1
  }

  context.headers.observe(x => Object.assign(headers, x))

  let x
  try {
    x = view(attrs, [], context)
  } catch (error) {
    attrs.error = error
    x = context.catcher(attrs, [], context)
  }

  const html = await Promise.race([
    updateChildren(asArray(x), context),
    new Promise((r, e) => setTimeout(e, 'timeout' in context ? context.timeout : defaultTimeout, new TimeoutError()))
  ]).catch(async error => {
    context.status(error instanceof TimeoutError ? 408 : 500)
    attrs.error = error
    return await updateChildren([].concat(context.catcher(attrs, [], context)), context)
  })

  return {
    status: context.status(),
    headers,
    title: context.title(),
    css: '<style class="sin">' + cssRules().join('') + '</style>', // perhaps remove classes according to names in html
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
        acc += k + ':' + formatValue(view.tag.args[v.index], v) + ';', ''
      )
      + (view.attrs.style || '')
    )
    + '"'
}

function renderAttr(k, v) {
  return ignoredAttr(k) || isEvent(k) || notValue(v)
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
  const isAsync = x && isFunction(x.then) && ('<!--a' + context.uid++ + '-->') || ''
  isAsync && (x = await x)
  'default' in x && (x = x.default)
  isFunction(x) && (x = x())
  return isAsync + (await update(x, context)) + isAsync
}

function escape(x = '') {
  let s = ''
  let c = -1
  let l = -1
  for (let i = 0; i < x.length; i++) {
    c = x.charCodeAt(i)
    c === 60 ? s += x.slice(l + 1, l = i) + '&lt;' :   // <
      c === 62 ? s += x.slice(l + 1, l = i) + '&gt;' :   // >
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
    c !== 45 && (c < 97 || c > 122) && (c < 65 || c > 90) && (s += x.slice(l + 1, l = i))  // -a-zA-Z
  }
  return s || x
}

function escapeAttrValue(x = '') {
  let s = ''
  let c = -1
  let l = -1
  for (let i = 0; i < x.length; i++) {
    c = x.charCodeAt(i)
    c === 34 ? s += x.slice(l + 1, l = i) + '&quot;' :   // "
      c === 60 ? s += x.slice(l + 1, l = i) + '&lt;' :   // <
      c === 62 ? s += x.slice(l + 1, l = i) + '&gt;' :   // >
      c === 38 && (s += x.slice(l + 1, l = i) + '&amp;') // &
  }
  return s || x
}
