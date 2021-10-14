import window from './window.js'
import parse, { ats, renderValue } from './parse.js'
import router, { routeState, cleanSlash } from './router.js'
import View from './view.js'
import http from './http.js'
import Stream from './stream.js'

const document = window.document

export default function s(...x) {
  return S.bind(
    typeof x[0] === 'function'
      ? new View(x[0])
      : tagged(x)
  )
}

const components = new WeakMap()
    , removing = new WeakSet()
    , streams = new WeakMap()
    , arrays = new WeakMap()
    , rarrays = new WeakMap()
    , lives = new WeakMap()
    , attrs = new WeakMap()
    , keyCache = new WeakMap()
    , mounts = new Map()
    , defaults = { node: document.createElement('DIV'), name: 'DIV', classes: '' }
    , resolved = Promise.resolve()

let idle = true

s.pathmode = ''
s.redraw = redraw
s.mount = mount
s.stream = Stream
s.css = (xs, ...args) => parse([xs, args], defaults, 0, true)

s.route = router(s, '', {
  url: typeof window !== 'undefined' && window.location,
  notFound: () => { /* noop */ },
  title: () => { /* noop */ },
  head: () => { /* noop */ }
})

s.http = http
s.http.redraw = redraw
s.request = (url, o) => (o ? http(url, o) : http(url.url, url))
  .then(({ body }) => body)
  .catch(x => (x.response = x.body, Promise.reject(x)))

s.bss = { at: ats, global: s.css }
s.trust = x => s(({ life }) => {
  const div = document.createElement('div')
      , frag = new DocumentFragment()

  div.innerHTML = x

  while (div.lastChild)
    frag.appendChild(div.lastChild)

  return () => frag
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
  return x[0] && Array.isArray(x[0].raw)
    ? S.bind(tagged(x, this))
    : execute(x, this)
}

function tagged(x, parent) {
  const level = parent ? parent.level + 1 : 0
  return new View(
    parent && parent.component,
    parse(x, parent && parent.tag || defaults, level),
    level
  )
}

function execute(x, parent) {
  const hasAttrs = isAttrs(x && x[0])
  return new View(
    parent.component,
    parent.tag,
    parent ? parent.level + 1 : 0,
    hasAttrs ? x.shift() : {},
    x.length === 1 && Array.isArray(x[0])
      ? x[0]
      : x
  )
}

function isAttrs(x) {
  return x
    && typeof x === 'object'
    && !(x instanceof Date)
    && !Array.isArray(x)
    && !(x instanceof View)
}

function mount(dom, view) {
  !view && (
    view = dom,
    dom = document.body
  )
  mounts.set(dom, view)
  redraw()
  return view
}

function redraw() {
  idle && (resolved.then(globalRedraw), idle = false)
}

function globalRedraw() {
  mounts.forEach((view, dom) => diffs(dom, [].concat(view({ route: s.route }))))
  idle = true
}

function diffs(parent, next, before, last = parent.lastChild) {
  const keys = next[0] && next[0].key != null && new Array(next.length)
      , ref = before ? before.nextSibling : parent.firstChild
      , tracked = keyCache.has(ref)
      , after = last ? last.nextSibling : null

  keys && (keys.rev = {}) && tracked
    ? keyed(parent, keyCache.get(ref), next, diffView, remove, keys, after)
    : nonKeyed(parent, next, diff, remove, keys, ref, after)

  const first = before ? before.nextSibling : parent.firstChild
  if (keys) {
    keyCache.set(first, keys)
    first !== ref && keyCache.delete(ref)
  }

  return Ret(first, after && after.previousSibling || parent.lastChild)
}

function Ref(keys, dom, key, i) {
  keys[i] = { dom, key }
  keys.rev[key] = i
}

function nonKeyed(parent, next, diff, remove, keys, dom, after = null) { // eslint-disable-line
  let i = 0
    , temp
    , view

  while (i < next.length) {
    if (!removing.has(dom)) {
      view = next[i]
      temp = dom !== after
        ? diff(dom, view, parent)
        : diff(null, view)
      dom === after && parent.insertBefore(temp.dom, after)
      keys && Ref(keys, temp.first, view.key, i)
      dom = temp.last
      i++
    }
    dom && (dom = dom.nextSibling)
  }

  while (dom !== after)
    dom = remove(dom, parent).after
}

function keyed(parent, as, bs, diff, remove, keys, after) { // eslint-disable-line
  const map = as.rev

  let ai = as.length - 1
    , bi = bs.length - 1
    , a = as[ai]
    , b = bs[bi]
    , temp = -1

  outer: while (true) { // eslint-disable-line
    while (a.key === b.key) {
      after = diff(a.dom, b, parent).first
      Ref(keys, after, b.key, bi)
      delete map[b.key]

      if (bi === 0)
        break outer

      if (ai === 0) {
        b = bs[--bi]
        break
      }

      a = as[--ai]
      b = bs[--bi]
    }

    if (b.key in map) {
      temp = map[b.key]
      if (temp > bi) {
        temp = diff(as[temp].dom, b, parent)
        insertBefore(parent, temp, after)
        after = temp.first
        Ref(keys, after, b.key, bi)
      } else if (temp !== bi) {
        temp = diff(as[temp].dom, b, parent)
        insertBefore(parent, temp, after)
        after = temp.first
        Ref(keys, after, b.key, bi)
      } else {
        a = as[--ai]
        continue
      }
      delete map[b.key]
      if (bi === 0)
        break
      b = bs[--bi]
    } else {
      temp = diff(null, b)
      insertBefore(parent, temp, after)
      after = temp.first
      Ref(keys, after, b.key, bi)
      if (bi === 0)
        break
      b = bs[--bi]
    }
  }

  for (const k in map)
    remove(as[map[k]].dom, parent)
}

function insertBefore(parent, { first, last }, before) {
  let temp = first
    , dom

  do {
    dom = temp
    temp = dom.nextSibling
  } while (parent.insertBefore(dom, before) !== last)
}


function diff(dom, view, parent, tree, keyChange) {
  return typeof view === 'function'
    ? view.constructor === Stream
      ? diffStream(dom, view, parent)
      : diff(dom, view(), parent, tree, keyChange)
    : view instanceof View
      ? diffView(dom, view, parent, tree, keyChange)
      : Array.isArray(view)
        ? diffArray(dom, view, parent)
        : view instanceof Node
          ? Ret(view)
          : diffValue(dom, view, parent, keyChange)
}

function diffView(dom, view, parent, tree, keyChange) {
  return view.component
    ? diffComponent(dom, view, parent, tree, keyChange)
    : diffElement(dom, view, parent, keyChange)
}

function diffStream(dom, view, parent) {
  if (streams.has(dom))
    return streams.get(dom)

  let newDom
    , first

  view.map(x => {
    newDom = diff(dom, x, parent)
    first = arrays.has(newDom) ? arrays.get(newDom).dom : newDom
    dom !== first && (dom && streams.delete(dom), streams.set(first, newDom))
    dom = first
  })

  return Ret(newDom)
}

function Ret(dom, first = dom, last = first) {
  return { dom, first, last }
}

function diffArray(dom, view, parent) {
  const last = arrays.has(dom) ? arrays.get(dom) : dom
  const comment = diffValue(dom, '[' + view.length, parent, false, 8)

  if (parent) {
    const after = last ? last.nextSibling : null
    diffs(parent, view, comment.first, last)

    const nextLast = after ? after.previousSibling : parent.lastChild
    last !== nextLast && arrays.set(comment.first, nextLast)
    rarrays.set(nextLast, comment.first)
    return Ret(comment.dom, comment.first, nextLast)
  }

  parent = new DocumentFragment()
  parent.appendChild(comment.dom)
  diffs(parent, view, comment.first, last)
  arrays.set(comment.first, parent.lastChild)
  rarrays.set(parent.lastChild, comment.first)
  return Ret(parent, comment.first, parent.lastChild)
}

function diffValue(dom, view, parent, keyChange, nodeType = typeof view === 'boolean' || view == null ? 8 : 3) {
  const nodeChange = keyChange || !dom || dom.nodeType !== nodeType

  nodeChange && replace(
    dom,
    dom = nodeType === 8
      ? document.createComment(view)
      : document.createTextNode(view),
    parent
  )

  if (!nodeChange && dom.nodeValue !== '' + view)
    dom.nodeValue = view

  return Ret(dom)
}

function diffElement(dom, view, parent, nodeChange = dom === null || dom.tagName !== view.tag.name) {
  nodeChange && replace(
    dom,
    dom = view.tag.node.cloneNode(),
    parent
  )

  if (view.children && view.children.length)
    diffs(dom, view.children)
  else if (view.text === null)
    dom.hasChildNodes() && removeChildren(dom.firstChild, dom)
  else if (view.textContent !== view.text)
    dom.textContent = view.text || ''

  attributes(dom, view, nodeChange)

  return Ret(dom)
}

function removeChildren(dom, parent) {
  do dom = remove(dom, parent).after
  while (dom)
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
      tree.i <= tree.xs.length && (tree.max = ++tree.i)
      return tree
    },
    add: (x) => xs.push(x)
  }

  return tree
}

function diffComponent(dom, view, parent, tree, keyChange) {
  dom = !keyChange && (tree || components.has(dom))
    ? updateComponent(dom, view, parent, tree || components.get(dom))
    : createComponent(dom, view, parent, tree, keyChange)

  return dom
}

function updateComponent(dom, view, parent, tree) {
  const prev = tree && tree.peek()

  if (!prev)
    return createComponent(dom, view, parent, tree)

  if (typeof prev.instance === 'function') {
    const v = mergeTag(prev.instance(view.attrs, view.children), view)
    const next = diff(dom, v, parent, tree.next())
    tree.prev()
    tree.i === 0 && (tree.xs.length = tree.max, tree.max = 0)
    next.first !== dom && (components.set(next.first, tree), components.delete(dom))
    return next
  } else if (prev.instance && typeof prev.instance.then === 'function') {
    tree.max++
    return Ret(dom)
  }

  return diff(dom, prev.instance, parent, tree)
}

function createComponent(dom, view, parent, tree = Tree(), keyChange) {
  const x = view.component({ life: () => {}, ...view.attrs }, view.children, () => diff(dom, view))

  if (typeof x === 'function') {
    tree.add(view)
    const v = mergeTag(x(view.attrs, view.children), view)
    const next = diff(dom, v, parent, tree.next(), keyChange)
    tree.prev()
    view.instance = x
    next.first !== dom && (components.set(next.first, tree), components.delete(dom))
    return next
  } else if (x && typeof x.then === 'function') {
    const next = document.createComment('pending')
    view.instance = x
    tree.add(view)
    tree.max++
    next !== dom && (components.set(next, tree), components.delete(dom))
    x.catch(x => (console.error(x), x)).then(result => {
      if (!components.has(next))
        return

      view.instance = result
      redraw()
    })
    replace(dom, next, parent)
    return Ret(next)
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
    node: b.tag.node || a.tag.node,
    name: b.tag.name || a.tag.name,
    classes: (a.tag.classes ? a.tag.classes + ' ' : '') + b.tag.classes,
    args: b.tag.args,
    vars: b.tag.vars,
    parent: a.tag
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
    , tag = view.tag
    , attr

  const prev = attrs.has(dom) && attrs.get(dom)
  prev && view.attrs && (view.attrs.handleEvent = prev.handleEvent)

  for (attr in view.attrs) {
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

  const className = (view.attrs.class ? view.attrs.class + ' ' : '')
    + (view.attrs.className ? view.attrs.className + ' ' : '')
    + view.tag.classes

  if (className !== (dom.getAttribute('class') || '')) {
    if (className) {
      !has && (has = true)
      dom.setAttribute('class', className)
    } else {
      dom.removeAttribute('class')
    }
  }

  if (view.tag) {
    setVars(dom, view.tag.vars, view.tag.args, init)
    while ((tag = tag.parent))
      setVars(dom, tag.vars, tag.args, init)
  }

  has
    ? attrs.set(dom, view.attrs)
    : prev && empty(view.attrs) && attrs.delete(dom)
}

function setVars(dom, vars, args, init) {
  for (const id in vars) {
    const { prop, index } = vars[id]
    const value = args[index]
    value && value.constructor === Stream
      ? init && value.map(x => dom.style.setProperty(id, renderValue(prop, x)))
      : dom.style.setProperty(id, renderValue(prop, typeof value === 'function' ? value(dom) : value))
  }
}

function giveLife(dom, view) {
  const life = [].concat(view.attrs.life)
    .map(x => typeof x === 'function' && x(dom, () => diff(dom, view)))
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
  !attrs.handleEvent && (attrs.handleEvent = handleEvent(dom))
  dom.addEventListener(name.slice(2), attrs.handleEvent)
}

function handleEvent(dom) {
  return {
    handleEvent: function(e) {
      const handler = attrs.get(dom)['on' + e.type]
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

  if (old) {
    parent.insertBefore(dom, old)
    remove(old, parent)
  }

  return dom
}

function defer(dom, parent, children) {
  if (!lives.has(dom))
    return children.length && (removing.add(dom), Promise.allSettled(children))

  const life = lives.get(dom).map(x => x()).filter(x => x && typeof x.then === 'function')

  lives.delete(dom)

  if (life.length === 0)
    return children.length && (removing.add(dom), Promise.allSettled(children))

  removing.add(dom)
  return Promise.allSettled(life.concat(children)).then(() => {
    removing.delete(dom)
    remove(dom, parent)
  })
}
function removeArray(dom, parent) {
  if (!arrays.has(dom))
    return dom.nextSibling

  const last = arrays.get(dom)
  if (dom === last)
    return dom.nextSibling

  const after = last.nextSibling
  dom = dom.nextSibling
  do {
    !dom && console.trace(dom, last)
    dom = remove(dom, parent).after
  } while (dom && dom !== last)

  return after
}

function remove(dom, parent, instant = true) {
  if (!parent || removing.has(dom))
    return { after: dom.nextSibling }

  let after = dom.nextSibling
  if (dom.nodeType === 8)
    after = removeArray(dom, parent)

  if (dom.nodeType !== 1) {
    instant && parent.removeChild(dom)
    return { after }
  }

  const lives = []
  let child = dom.firstChild
  while (child !== null) {
    const life = remove(child, dom, false).life
    life && lives.push(life)
    child = child.nextSibling
  }

  const life = defer(dom, parent, lives)
  instant && !life && parent.removeChild(dom)

  return {
    life,
    after
  }
}
