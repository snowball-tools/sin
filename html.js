import View from './view.js'
import { className, ignoredAttr } from './shared.js'
import { renderValue } from './parse.js'

let lastWasText = false

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

export default async function html(view) {
  const result = await update(view)
  return result
}

async function update(view) {
  return typeof view === 'function'
    ? update(view())
    : view instanceof View
      ? view.component
        ? updateComponent(view)
        : updateElement(view)
      : Array.isArray(view)
        ? updateArray(view)
        : view || view === 0 || view === ''
          ? updateText(view)
          : updateComment(view)
}

async function updateElement(view) {
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
          ? await updateChildren(view.children)
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

async function updateChildren(xs) {
  lastWasText = false
  return (await Promise.all(xs.map(update))).join('')
}

async function updateArray(xs) {
  lastWasText = false
  return '<!--' + xs.length + '-->' + (await Promise.all(xs.map(update))).join('')
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

async function updateComponent(view) {
  lastWasText = false
  let x = view.component()
  if (typeof x.then === 'function')
    x = await x

  if (typeof x === 'function')
    x = x()

  return update(x)
}

/*
console.time('w')
s.html(
  s`h1`(
    s(async() => () => s`h2`('woo')),
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
*/
