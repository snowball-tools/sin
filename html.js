import s from './index.js'
import View from './view.js'

let lastWasText = false

const open = new Set([
  'AREA',
  'BASE',
  'BR',
  'COL',
  'EMBED',
  'HR',
  'IMG',
  'INPUT',
  'LINK',
  'META',
  'PARAM',
  'SOURCE',
  'TRACK',
  'WBR'
])

s.html = async function(view) {
  return await update(view)
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
  const tag = (view.tag.name || 'div')
  return '<'
    + tag
    + Object.entries(view.attrs).map(([k, v]) =>
      ' ' + k + '="' + v + '"'
    ).join('')
    + '>'
    + (view.text
      ? view.text
      : view.children && view.children.length
        ? await updateChildren(view.children)
        : ''
    )+ (open.has(tag) ? '' : '</' + tag + '>')
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


console.time('w')
s.html(
  s`h1`(
    s(async() => () => s`h2`('woo')),
    s`button`({}, ['hej', s`input`, 'dig']),
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
