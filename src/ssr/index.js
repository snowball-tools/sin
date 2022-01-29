import './window.js'
import View from '../view.js'
import { className, ignoredAttr, isEvent, isFunction, asArray } from '../shared.js'
import { formatValue, cssRules } from '../style.js'
import { router } from '../router.js'
import s from '../index.js'

let lastWasText = false

class TimeoutError extends Error {}

const defaultTimeout = 1000 * 30
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
  let head = ''
  Object.assign(attrs, serverAttrs)
  Object.assign(context, serverContext)

  context.head.observe(x => head += x instanceof View ? headElement(x) : x)

  context.route = router(s, '', context)
  context.uid = 1

  let x
  try {
    x = view(attrs, [], context)
  } catch (error) {
    x = context.catcher(error, attrs, [], context)
  }

  const html = await Promise.race([
    updateChildren(asArray(x), context),
    new Promise((r, e) => setTimeout(e, 'timeout' in context ? context.timeout : defaultTimeout, new TimeoutError()))
  ]).catch(async error => {
    context.status(error instanceof TimeoutError ? 408 : 500)
    return await updateChildren([].concat(context.catcher(error)), context)
  })

  return {
    status: context.status(),
    title: context.title(),
    css: '<style class="sin">' + cssRules().join('') + '</style>', // perhaps remove classes according to names in html
    html,
    head
  }

  // '<style class="sin">' + css() + '</style>'
}

async function update(view, context) {
  return isFunction(view)
    ? update(view(), context)
    : view instanceof View
      ? view.component
        ? updateComponent(view, context)
        : updateElement(view, context)
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
    + Object.entries(view.attrs).reduce((acc, [k, v]) =>
      acc += renderAttr(k, v),
      ''
    )
    + (view.tag.args.length ? Object.entries(view.tag.vars).reduce((acc, [k, v]) =>
      acc += k + ':' + formatValue(view.tag.args[v.index], v.unit) + ';',
      ' style="'
    ) + '"' : '')
    + '>'
}

function renderAttr(k, v) {
  return ignoredAttr(k) || isEvent(k) || v === false
    ? ''
    : (' ' + k + (
      v === true
        ? ''
        : '="' + v + '"'
    ))
}

function getClassName(view) {
  const classes = className(view)
  return classes
    ? ' class="' + classes + '"'
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
  const x = (lastWasText ? '<!--,-->' : '') + view
  lastWasText = true
  return x
}

function updateComment(view) {
  lastWasText = false
  return '<!--' + (typeof view === 'string' ? view.replace(/--/g, '- -') : view) + '-->'
}

async function updateComponent(view, context) {
  lastWasText = false
  let x = view.component[0](view.attrs, view.children, context)
  const isAsync = x && isFunction(x.then) && ('<!--' + context.uid++ + 'async-->') || ''
  isAsync && (x = await x)
  isFunction(x) && (x = x())
  return isAsync + (await update(x, context)) + isAsync
}
