import View from './view.js'
import { className, ignoredAttr } from './shared.js'
import { renderValue, css } from './style.js'
import s from './index.js'

let lastWasText = false

const TIMEOUT = {}
    , timeout = 1000 * 2

const open = new Set([
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

export default async function html(view, context = {}) {
  context.statusCode = () => ''
  context.headers = () => ''
  const body = await Promise.race([
    p(await update(view, context)),
    new Promise((r, e) => setTimeout(e, timeout, TIMEOUT))
  ]).catch(err => {
    context.statusCode(err === TIMEOUT ? 408 : 500)
    return ''
  })

  return {
    statusCode: context.statusCode(),
    headers: context.headers(),
    body: `<style>${ css() }</style>${ body }`
  }
}

async function update(view, context) {
  return typeof view === 'function'
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

async function updateElement(view, context) {
  lastWasText = false
  const tag = (view.tag.name || 'div').toLowerCase()
  return '<'
    + tag
    + getClassName(view)
    + Object.entries(view.attrs).reduce((acc, [k, v]) =>
      acc += ignoredAttr(k) ? '' : (' ' + k + '="' + v + '"'),
      ''
    )
    + (view.tag.args.length ? Object.entries(view.tag.vars).reduce((acc, [k, v]) =>
      acc += k + ':' + renderValue(view.tag.args[v.index], v.unit) + ';',
      ' style="'
    ) + '"' : '')
    + '>'
    + (open.has(tag)
      ? ''
      : (view.text
        ? view.text
        : view.children && view.children.length
          ? await updateChildren(view.children, context)
          : ''
      ) + '</' + tag + '>'
    )
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
  return '<!--' + xs.length + '-->' + (await Promise.all(xs.map(x => update(x, context)))).join('')
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
  let x = view.component(view.attrs, view.children, context)
  if (x && typeof x.then === 'function')
    x = await x

  if (typeof x === 'function')
    x = x()

  return update(x, context)
}


console.time('w')
html(
  s`h1`(
    s(async() => {
      await new Promise(r => setTimeout(r, 3000))
      return () => s`h2`('woo')
    }),
    s`button`({class:'wat'}, ['hej', s`input`, 'dig']),
      s`;bc white;br 0.5rem;p 1.5rem;@md{d flex}`(
      s`img;h 4rem;w 4rem;br 100%;m auto;@md{w 6rem;h 6rem;m 0;mr 1.5rem}`({
        src:'https://randomuser.me/api/portraits/women/17.jpg'
      }),
      s`div;ta center;@md{ta left}`(
        s`h2;fs 1.125rem`('Erin Lindford'),
        s`;c var(--purple500)`('Customer Support'),
        s`;c var(--gray600)`('erinlindford@example.com'),
        s`;c var(--gray600)`('(555) 765-4321')
      )
    ),
    false,
    'wat',
    'that',
    [
      s`h1`, s`h2`, s`h3`
    ],
    'what',
    s`button`
  )
).then(x => {
  console.timeEnd('w')
  p(x)
})

