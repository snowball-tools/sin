import parse from './parse.js'
import router, { routeState, cleanSlash } from './router.js'
import View from './view.js'
import http from './http.js'
import Stream from './stream.js'
import pws from 'pws'

s.pws = pws
s.http = http
s.http.redraw = redraw
s.request = (url, o) => (o ? http(url, o) : http(url.url, url))
  .then(({ body }) => body)
  .catch(x => (x.response = x.body, Promise.reject(x)))

export default function s(...x) {
  return S.bind(
    typeof x[0] === 'function'
      ? new View(x)
      : tagged(x)
  )
}

const components = new WeakMap()
    , removing = new WeakSet()
    , streams = new WeakMap()
    , arrays = new WeakMap()
    , lives = new WeakMap()
    , attrs = new WeakMap()
    , keys = new WeakMap()
    , mounts = new Map()
    , defaults = { name: 'DIV', classes: '', i: 0 }

let idle = true

s.pathmode = ''
s.redraw = redraw
s.mount = mount
s.stream = Stream
s.css = (xs, ...args) => parse([xs, args], null, 0, true)

s.route = router(s, '', {
  url: window.location,
  notFound: () => {},
  title: () => {},
  head: () => {}
})

function link(dom) {
  dom.addEventListener('click', e => {
    if (
      !e.defaultPrevented &&
      (e.button === 0 || e.which === 0 || e.which === 1) &&
      (!e.currentTarget.target || e.currentTarget.target === '_self') &&
      !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey
    ) {
      e.preventDefault()
      const state = attrs.get(dom).state
      window.history.pushState(state, null, dom.getAttribute('href'))
      routeState[dom.getAttribute('href')] = state
      s.redraw()
    }
  })
}

function S(...x) {
  return Array.isArray(x[0]) && Array.isArray(x[0].raw)
    ? S.bind(tagged(x, this))
    : execute(x, this)
}

function tagged(x, parent) {
  return new View(
    parent && parent.component,
    parse(x, parent ? parent.tag : defaults, parent ? parent.level + 1 : 0),
    parent ? parent.level + 1 : 0
  )
}

function execute(x, parent) {
  const hasAttrs = isAttrs(x && x[0])
  return new View(
    parent.component,
    parent.tag,
    parent ? parent.level + 1 : 0,
    hasAttrs ? x[0] : {},
    hasAttrs
      ? Array.isArray(x[1]) && x.length === 2
        ? x[1]
        : x.slice(1)
      : Array.isArray(x[0]) && x.length === 1
        ? x[0]
        : x
  )
}

function isAttrs(x) {
  return !(x instanceof View) && typeof x === 'object' && !(x instanceof Date) && !Array.isArray(x)
}

function mount(dom, view) {
  !view && (
    view = dom,
    dom = document.body
  )
  mounts.set(dom, view)
  redraw()
}

function redraw() {
  idle && (requestAnimationFrame(globalRedraw), idle = false)
}

function globalRedraw() {
  mounts.forEach((view, dom) => diffs(dom, [].concat(view({ route: s.route }))))
  idle = true
}

function diffs(parent, views, first, prev) {
  const oldKeyed = keys.has(first || parent.firstChild)
      , newKeyed = views[0] instanceof View && views[0].key != null

  return oldKeyed && newKeyed
    ? keyed(parent, views, first, oldKeyed, newKeyed, prev)
    : nonKeyed(parent, views, first, oldKeyed, newKeyed, prev)
}

function nonKeyed(parent, views, first, oldKeyed, newKeyed, prev) {
  const newKeys = newKeyed && new Array(views.length)

  let i = 0
    , dom = first === undefined ? parent.firstChild : first
    , last = dom && dom.previousSibling
    , next

  while (i < views.length) {
    if (!removing.has(dom)) {
      dom = last = (!prev || i < prev.length)
        ? diff(dom, views[i], parent)
        : parent.insertBefore(diff(null, views[i], null), dom)
      newKeys && (newKeys[i] = { dom, key: views[i].key })
      i === 0 && newKeyed && (newKeyed = dom)
      i++
    }
    dom && (dom = dom.nextSibling)
  }

  while (dom && !removing.has(dom) && (!prev || i++ < prev.length)) {
    next = dom.nextSibling
    removeChild(dom, parent)
    dom = next
  }

  newKeyed
    ? keys.set(newKeyed, newKeys)
    : oldKeyed && keys.delete(first || parent.firstChild)

  return last
}

function keyed(parent, b, first, oldKeyed, newKeyed) {
  const a = keys.get(first || parent.firstChild)
      , bLength = b.length
      , aLength = a.length
      , before = a[aLength - 1].dom.nextSibling

  let aEnd = aLength
    , bEnd = bLength
    , aStart = 0
    , bStart = 0
    , i = 0
    , bx = null
    , ax = null
    , dom
    , view

  while (aStart < aEnd || bStart < bEnd) {
    if (aEnd === aStart) {
      dom = bEnd < bLength
        ? bStart
          ? b[bStart - 1].dom.nextSibling
          : b[bEnd - bStart].dom
        : before

      while (bStart < bEnd) {
        view = b[bStart++]
        parent.insertBefore(diff(ax && ax.has(view.key) ? ax.get(view.key).dom : null, view), dom)
      }
    } else if (bEnd === bStart) {
      while (aStart < aEnd) {
        view = a[aStart++]
        if (!bx || !bx.has(view.key))
          removeChild(view.dom, parent)
      }
    } else if (a[aStart].key === b[bStart].key) {
      diff(a[aStart].dom, b[bStart])
      aStart++
      bStart++
    } else if (a[aEnd - 1].key === b[bEnd - 1].key) {
      diff(a[aEnd - 1].dom, b[bEnd - 1])
      aEnd--
      bEnd--
    } else if (a[aStart].key === b[bEnd - 1].key && b[bStart].key === a[aEnd - 1].key) {
      diff(a[aStart].dom, b[bEnd - 1])
      diff(a[aEnd - 1].dom, b[bStart])
      view = a[--aEnd]
      dom = view.dom.nextSibling
      parent.insertBefore(b[bStart++].dom, a[aStart++].dom.nextSibling)
      parent.insertBefore(b[--bEnd].dom, dom)
      a[aEnd] = b[bEnd]
    } else {
      if (!bx) {
        bx = new Map()
        i = bStart
        while (i < bEnd)
          bx.set(b[i].key, i++)
      }

      view = a[aStart]
      if (bx.has(view.key)) {
        const index = bx.get(view.key)
        if (bStart < index && index < bEnd) {
          i = aStart
          let sequence = 1
          while (++i < aEnd && i < bEnd && bx.get(a[i].key) === index + sequence)
            sequence++

          if (!ax)
            ax = a.reduce((acc, x) => (acc.set(x.key, x), acc), new Map())

          if (sequence > index - bStart) {
            while (bStart < index) {
              view = b[bStart++]
              parent.insertBefore(diff(ax.has(view.key) ? ax.get(view.key).dom : null, view), a[aStart].dom)
            }
          } else {
            view = b[bStart++]
            parent.replaceChild(diff(ax.has(view.key) ? ax.get(view.key).dom : null, view), a[aStart++].dom)
          }
        } else {
          aStart++
        }
      } else {
        view = a[aStart++]
        view && removeChild(view.dom, parent)
      }
    }
  }

  keys.set(b[0].dom, b)
  a[0].dom !== b[0].dom && keys.delete(a[0].dom)
  return b[b.length - 1].dom
}


function diff(dom, view, parent, tree, keyChange) {
  return isStream(view)
    ? diffStream(dom, view, parent, tree, keyChange)
    : typeof view === 'function'
      ? diff(dom, view(), parent, tree, keyChange)
      : view instanceof View
        ? view.component
          ? diffComponent(dom, view, parent, tree, keyChange)
          : diffView(dom, view, parent, keyChange)
        : Array.isArray(view)
          ? diffArray(dom, view, parent, keyChange)
          : diffValue(dom, view, parent, keyChange)
}

function isStream(view) {
  return view && view.constructor === Stream
}

function diffStream(dom, view, parent, tree, keyChange) {
  if (streams.has(dom))
    return streams.get(dom)

  let newDom
    , first

  view.map(x => {
    newDom = diff(dom, x, parent)
    first = arrays.has(newDom) ? arrays.get(newDom) : newDom
    dom !== first && (dom && streams.delete(dom), streams.set(first, newDom))
    dom = first
  })

  return newDom
}

function isSingleText(xs) {
  return xs && xs.length === 1 && (typeof xs[0] === 'string' || typeof xs[0] === 'number')
}

function diffArray(dom, view, parent) {
  const prev = dom && dom.nodeType === 8 && dom.nodeValue.slice(1, -1)
      , comment = diffValue(dom, '[' + view.length + ']', parent, false, true)

  dom = diffs(parent, view, comment.nextSibling, prev && { length: parseInt(prev) })
  arrays.set(dom, comment)

  return dom
}

function diffValue(dom, view, parent, keyChange, array) {
  const nodeChange = keyChange || !dom || !view || (array !== (dom.nodeType === 8 && dom.nodeValue.charCodeAt(0) === 91))
  nodeChange && replace(
    dom,
    dom = !array && (typeof view === 'string' || typeof view === 'number' || view instanceof Date)
      ? document.createTextNode(view)
      : document.createComment(view),
    parent
  )

  dom.nodeValue != view && (dom.nodeValue = '' + view)

  return dom
}

function diffView(dom, view, parent, keyChange) {
  const nodeChange = keyChange || !dom || !view || dom.nodeName !== view.tag.name
  nodeChange && replace(
    dom,
    dom = document.createElement(view.tag.name),
    parent
  )

  view.dom = dom
  view.children && (
    isSingleText(view.children)
      ? dom.textContent = '' + view.children[0]
      : diffs(dom, view.children)
  )
  attributes(dom, view, nodeChange)

  return dom
}

function Tree() {
  const xs = []
  const tree = {
    xs,
    i: 0,
    max: 0,
    peek: () => xs[tree.i],
    prev: () => {
      tree.i--
    },
    next: () => {
      tree.i++
      tree.max = tree.i
      return tree
    },
    add: (x) => xs.push(x)
  }

  return tree
}

function diffComponent(dom, view, parent, tree, keyChange) {
  return !keyChange && (tree || components.has(dom))
    ? updateComponent(dom, view, parent, tree || components.get(dom))
    : createComponent(dom, view, parent, tree, keyChange)
}

function updateComponent(dom, view, parent, tree) {
  const prev = tree && tree.peek()

  if (!prev)
    return createComponent(dom, view, parent, tree)

  if (typeof prev.instance === 'function') {
    const newDom = diff(dom, mergeTag(tree.peek().instance(view.attrs, view.children), view), parent, tree.next())
    tree.prev()
    tree.i === 0 && (tree.xs.length = tree.max)
    newDom !== dom && (components.set(newDom, tree), components.delete(dom))
    return newDom
  } else if (prev.instance && typeof prev.instance.then === 'function') {
    tree.i === 0 && (tree.xs.length = tree.max)
    return dom
  }

  return diff(dom, prev.instance, parent, tree.next())
}

function createComponent(dom, view, parent, tree = Tree(), keyChange) {
  const x = view.component[0](view.attrs, view.children, () => diff(dom, view))

  if (typeof x === 'function') {
    tree.add(view)
    const newDom = diff(dom, mergeTag(x(view.attrs, view.children), view), parent, tree.next(), keyChange)
    tree.prev()
    view.instance = x
    newDom !== dom && (components.set(newDom, tree), components.delete(dom))
    return dom = newDom
  } else if (x && typeof x.then === 'function') {
    const newDom = document.createComment('pending')
    view.instance = x
    tree.add(view)
    newDom !== dom && (components.set(newDom, tree), components.delete(dom))
    x.then(result => {
      view.instance = result
      redraw()
    })
    replace(dom, newDom, parent)
    return dom = newDom
  }

  return diff(dom, mergeTag(x, view), parent, tree, keyChange)
}

function mergeTag(a, b) {
  if (!b?.tag)
    return a

  if (!a?.tag)
    return (a.tag = b.tag, a)

  a.tag = {
    id: b.tag.id || a.tag.id,
    name: b.tag.name || a.tag.name,
    classes: a.tag.classes + b.tag.classes,
    args: b.tag.args,
    vars: b.tag.vars
  }

  return a
}

function ignoreAttr(x) {
  return x === 'key' || x === 'handleEvent' || x === 'class' || x === 'className'
}

function empty(o) {
  for (const x in o)
    return false
  return true
}

function attributes(dom, view, init) {
  let has = false
  const prev = attrs.has(dom) && attrs.get(dom)
  prev && view.attrs && (view.attrs.handleEvent = prev.handleEvent)

  for (const attr in view.attrs) {
    if (attr === 'life') {
      init && giveLife(dom, view)
    } else if (!ignoreAttr(attr) && prev[attr] !== view.attrs[attr]) {
      !has && (has = true)
      updateAttribute(dom, view.attrs, attr, prev[attr], view.attrs[attr])
    }
  }

  if (attrs) {
    for (const attr in prev) {
      if (attr in view.attrs === false)
        removeAttribute(dom, prev, attr)
    }
  }

  const className = (view.attrs.class ? view.attrs.class + ' ' : '') + view.tag.classes
  if (className !== (dom.getAttribute('class') || '')) {
    if (className) {
      !has && (has = true)
      dom.setAttribute('class', className)
    } else {
      dom.removeAttribute('class')
    }
  }
  for (let i = 0; i < (view.tag ? view.tag.vars.length : 0); i++) {
    const arg = view.tag.args[i]
        , id = '--' + parse.prefix + (i + 1)

    arg && arg.constructor === Stream
      ? init && arg.map(x => dom.style.setProperty(id, x))
      : dom.style.setProperty(id, typeof arg === 'function' ? arg(dom) : arg)
  }

  has
    ? attrs.set(dom, view.attrs)
    : prev && empty(view.attrs) && attrs.delete(dom)
}

function giveLife(dom, view) {
  const life = [].concat(view.attrs.life)
    .map(x => x(dom, () => diff(dom, view)))
    .filter(x => typeof x === 'function')

  life.length && lives.set(dom, life)
}

function updateAttribute(dom, attrs, attr, old, value) { // eslint-disable-line
  if (old === value)
    return

  if (attr === 'href') {
    value = s.pathmode + cleanSlash(value)
    link(dom)
  }

  const on = attr.charCodeAt(0) === 111 && attr.charCodeAt(1) === 110
  if (on && typeof old === typeof value)
    return

  on
    ? value
      ? addEvent(dom, attrs, attr)
      : removeEvent(dom, attrs, attr)
    : !value && value !== 0
      ? dom.removeAttribute(attr)
      : attr in dom && typeof value !== 'boolean'
        ? dom[attr] = value
        : dom.setAttribute(attr, value === true ? '' : value)
}

function removeAttribute(dom, attrs, attr) {
  return attr.charCodeAt(0) === 111 && attr.charCodeAt(1) === 110
    ? removeEvent(dom, attrs, attr)
    : dom.removeAttribute(attr)
}

function removeEvent(dom, attrs, name) {
  dom.removeEventListener(name.slice(2), attrs.handleEvent)
}

function addEvent(dom, attrs, name) {
  !attrs.handleEvent && (attrs.handleEvent = handleEvent(dom, attrs))
  dom.addEventListener(name.slice(2), attrs.handleEvent)
}

function handleEvent(dom) {
  return {
    handleEvent: function(e) {
      const handler = attrs.get(dom)['on' + event.type]
      const result = typeof handler === 'function'
        ? handler.call(e.currentTarget, e)
        : handler && typeof handler.handleEvent === 'function' && handler.handleEvent(e)

      e.redraw !== false && redraw()
      result && typeof result.then === 'function' && result.then(redraw)
    }
  }
}

function replace(old, dom, parent) {
  if (!parent)
    return

  !old
    ? parent.appendChild(dom)
    : !dom
      ? parent.removeChild(old)
      : removeChild(old, parent, false)
        ? parent.insertBefore(dom, old)
        : parent.replaceChild(dom, old)
}

function defer(dom, parent, children) {
  if (!lives.has(dom))
    return children && children.length ? (removing.add(dom), Promise.allSettled(children)) : false

  const life = lives.get(dom).map(x => x()).filter(x => x && typeof x.then === 'function')

  lives.delete(dom)

  if (life.length === 0)
    return children && children.length ? (removing.add(dom), Promise.allSettled(children)) : false

  removing.add(dom)
  return Promise.allSettled(life.concat(children || [])).then(() => {
    removing.delete(dom)
    removeChild(dom, parent)
  })
}

function removeArray(dom, parent, count) {
  let next
  while (count && dom) {
    next = dom.nextSibling
    !removing.has(dom) && (removeChild(dom, parent), count--)
    dom = next
  }
}

function removeChild(dom, parent, remove = true) {
  if (!parent)
    return

  if (dom.nodeType === 8 && dom.nodeValue.charCodeAt(0) === 91)
    return removeArray(dom.nextSibling, parent, parseInt(dom.nodeValue.slice(1, -1)))

  if (dom.nodeType !== 1)
    return

  const lives = []
  let child = dom.firstChild
  while (child) {
    const life = removeChild(child, dom, false)
    life && lives.push(life)
    child = child.nextSibling
  }

  return defer(dom, parent, lives) || (remove && parent.removeChild(dom) && false)
}
