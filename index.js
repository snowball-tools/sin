import window from './window.js'
import parse, { atReplacer, renderValue, style } from './parse.js'
import router, { routeState, cleanSlash } from './router.js'
import View from './view.js'
import http from './http.js'
import Stream from './stream.js'
import { className, ignoredAttr } from './shared.js'

const document = window.document
    , NS = {
      html: 'http://www.w3.org/1999/xhtml',
      svg: 'http://www.w3.org/2000/svg',
      math: 'http://www.w3.org/1998/Math/MathML'
    }

export default function s(...x) {
  const type = typeof x[0]
  return type === 'string'
    ? S(Object.assign([x[0]], { raw: [] }))(...x.slice(1))
    : S.bind(
      type === 'function'
        ? new View(x[0])
        : tagged(x)
    )
}

function S(...x) {
  return x[0] && Array.isArray(x[0].raw)
    ? S.bind(tagged(x, this))
    : execute(x, this)
}

const components = new WeakMap()
    , removing = new WeakSet()
    , streams = new WeakMap()
    , arrays = new WeakMap()
    , lives = new WeakMap()
    , attrs = new WeakMap()
    , keyCache = new WeakMap()
    , mounts = new Map()
    , resolved = Promise.resolve()

let idle = true

s.pathmode = ''
s.redraw = redraw
s.mount = mount
s.stream = Stream
s.css = (...x) => parse(x, null, 0, true)
s.animate = animate
s.value = value
s.style = style

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

s.bss = { at: atReplacer, global: s.css }
s.trust = x => s(() => {
  const div = document.createElement('div')
      , frag = new DocumentFragment()

  div.innerHTML = x

  while (div.lastChild)
    frag.appendChild(div.lastChild)

  return () => frag
})

function animate(dom) {
  dom.setAttribute('animate', 'entry')
  requestAnimationFrame(() => dom.removeAttribute('animate'))
  return () => {
    dom.setAttribute('animate', 'exit')
    return new Promise(r => dom.addEventListener('transitionend', r))
  }
}

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

function tagged(x, parent) {
  const level = parent ? parent.level + 1 : 0
  return new View(
    parent && parent.component,
    parse(x, parent && parent.tag, level),
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

function mount(dom, view, attrs = {}, context = {}) {
  if (typeof view !== 'function') {
    context = attrs || {}
    attrs = view || {}
    view = dom
    dom = document.body
  }

  attrs.route = context.route = s.route
  mounts.set(dom, { view, attrs, context })
  updates(dom, [].concat(view(attrs, [], context)), context)
  return view
}

function redraw() {
  idle && (resolved.then(globalRedraw), idle = false)
}

function globalRedraw() {
  mounts.forEach(({ view, attrs, context }, dom) => updates(dom, [].concat(view(attrs, [], context)), context))
  idle = true
}

function updates(parent, next, context, before, last = parent.lastChild) {
  const keys = next[0] && next[0].key != null && new Array(next.length)
      , ref = before ? before.nextSibling : parent.firstChild
      , tracked = keyCache.has(ref)
      , after = last ? last.nextSibling : null

  keys && (keys.rev = {}) && tracked
    ? keyed(parent, context, keyCache.get(ref), next, keys, after)
    : nonKeyed(parent, context, next, keys, ref, after)

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

function nonKeyed(parent, context, next, keys, dom, after = null) { // eslint-disable-line
  let i = 0
    , temp
    , view

  while (i < next.length) {
    if (dom === null || !removing.has(dom)) {
      view = next[i]
      temp = dom !== after
        ? update(dom, view, context, parent)
        : update(null, view, context)
      dom === after && parent.insertBefore(temp.dom, after)
      keys && Ref(keys, temp.first, view.key, i)
      dom = temp.last
      i++
    }
    if (dom !== null) {
      dom = dom.nextSibling
      dom !== null && dom.nodeType === 8 && dom.nodeValue === ',' && (dom = remove(dom, parent).after)
    }
  }

  while (dom && dom !== after)
    dom = remove(dom, parent).after
}

function keyed(parent, context, as, bs, keys, after) { // eslint-disable-line
  const map = as.rev

  let ai = as.length - 1
    , bi = bs.length - 1
    , a = as[ai]
    , b = bs[bi]
    , temp = -1

  outer: while (true) { // eslint-disable-line
    while (a.key === b.key) {
      after = updateView(a.dom, b, context, parent).first
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
        temp = updateView(as[temp].dom, b, context, parent)
        insertBefore(parent, temp, after)
        after = temp.first
        Ref(keys, after, b.key, bi)
      } else if (temp !== bi) {
        temp = updateView(as[temp].dom, b, context, parent)
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
      temp = updateView(null, b, context)
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


function update(dom, view, context, parent, stack, create) {  // eslint-disable-line
  return typeof view === 'function'
    ? view.constructor === Stream
      ? updateStream(dom, view, context, parent)
      : update(dom, view(), context, parent, stack, create)
    : view instanceof View
      ? updateView(dom, view, context, parent, stack, create)
      : Array.isArray(view)
        ? updateArray(dom, view, context, parent)
        : view instanceof Node
          ? Ret(view)
          : updateValue(dom, view, parent, create)
}

function updateView(dom, view, context, parent, stack, create) {  // eslint-disable-line
  return view.component
    ? updateComponent(dom, view, context, parent, stack, create)
    : updateElement(dom, view, context, parent, create)
}

function updateStream(dom, view, context, parent) {
  if (streams.has(dom))
    return streams.get(dom)

  let newDom
    , first

  view.map(x => {
    newDom = update(dom, x, context, parent)
    first = arrays.has(newDom) ? arrays.get(newDom).dom : newDom
    dom !== first && (dom && streams.delete(dom), streams.set(first, newDom))
    dom = first
  })

  return Ret(newDom)
}

function Ret(dom, first = dom, last = first) {
  return { dom, first, last }
}

function updateArray(dom, view, context, parent) {
  const last = arrays.has(dom) ? arrays.get(dom) : dom
  const comment = updateValue(dom, '[' + view.length, parent, false, 8)

  if (parent) {
    const after = last ? last.nextSibling : null
    updates(parent, view, context, comment.first, last)

    const nextLast = after ? after.previousSibling : parent.lastChild
    last !== nextLast && arrays.set(comment.first, nextLast)
    return Ret(comment.dom, comment.first, nextLast)
  }

  parent = new DocumentFragment()
  parent.appendChild(comment.dom)
  updates(parent, view, context, comment.first, last)
  arrays.set(comment.first, parent.lastChild)
  return Ret(parent, comment.first, parent.lastChild)
}

function updateValue(
  dom,
  view,
  parent,
  create,
  nodeType = typeof view === 'boolean' || view == null ? 8 : 3
) {
  const nodeChange = create || !dom || dom.nodeType !== nodeType

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

function updateElement(
  dom,
  view,
  context,
  parent,
  create = dom === null || tagChanged(dom, view)
) {
  const previousNS = context.NS
  create && replace(
    dom,
    dom = createElement(view, context),
    parent
  )

  const prev = attributes(dom, view, context, create)
  view.attrs.domSize = view.children && view.children.length

  view.attrs.domSize
    ? updates(dom, view.children, context)
    : prev && prev.domSize && dom.hasChildNodes() && removeChildren(dom.firstChild, dom)

  context.NS = previousNS

  return Ret(dom)
}

function tagChanged(dom, view) {
  return dom.tagName !== (view.tag.name || 'DIV').toUpperCase()
}

function createElement(view, context) {
  const is = view.attrs.is
  return (context.NS || (context.NS = view.attrs.xmlns || NS[view.tag.name]))
    ? is
      ? document.createElementNS(context.NS, view.tag.name, { is })
      : document.createElementNS(context.NS, view.tag.name)
    : is
      ? document.createElement(view.tag.name || 'DIV', { is })
      : document.createElement(view.tag.name || 'DIV')
}

function removeChildren(dom, parent) {
  do dom = remove(dom, parent).after
  while (dom)
}

function Stack(view, context) {
  const life = []
  view.attrs.life = fn => Array.isArray(fn)
    ? life.push(...fn)
    : life.push(fn)

  const xs = []
  let i = 0
    , top = 0

  return {
    life,
    get exhausted() {
      return i >= xs.length
    },
    get key() {
      return i < xs.length
        ? xs[i].key
        : null
    },
    next(instance) {
      if (arguments.length) {
        xs.length = i
        xs[i] = ({ key: null, instance })
      }
      return i < xs.length && xs[top = i++]
    },
    pop() {
      return --i === 0 && !(xs.length = top + 1, top = 0)
    }
  }
}

function updateComponent( // eslint-disable-line
  dom,
  view,
  context,
  parent,
  stack = components.has(dom) ? components.get(dom) : Stack(view, context),
  create = stack.exhausted || stack.key !== view.key
) {
  const x = create
    ? stack.next(view.component(view.attrs, view.children, context))
    : stack.next()

  const promise = x.instance && typeof x.instance.then === 'function'
  view.key && (x.key = view.key)
  let next

  if (promise) {
    next = updateValue(dom, 'pending', parent, false, 8)
    create && x.instance.catch(x => (console.error(x), x)).then(view => {
      if (!components.has(next.first))
        return

      x.instance = view
      redraw()
    })
  } else {
    next = update(
      dom,
      mergeTag(
        typeof x.instance === 'function'
          ? x.instance(view.attrs, view.children, context)
          : create
            ? x.instance
            : view.component(view.attrs, view.children, context),
        view
      ),
      context,
      parent,
      stack,
      create || undefined
    )
  }

  const changed = dom !== next.first

  stack.pop() && (changed || create) && (
    changed && components.delete(dom),
    components.set(next.first, stack),
    !promise && giveLife(next.first, view.attrs, view.children, context, stack.life)
  )

  return next
}

function mergeTag(a, b) {
  if (!b?.tag)
    return a

  if (!a?.tag)
    return (a.tag = b.tag, a)

  a.tag = {
    id: b.tag.id || a.tag.id,
    name: b.tag.name || a.tag.name,
    classes: (a.tag.classes ? a.tag.classes + ' ' : '') + b.tag.classes,
    args: b.tag.args,
    vars: b.tag.vars,
    parent: a.tag
  }

  return a
}

function empty(o) {
  for (const x in o)
    return false
  return true
}

function attributes(dom, view, context, init) {
  let has = false
    , tag = view.tag
    , attr

  const prev = !init && attrs.has(dom) ? attrs.get(dom) : undefined
  prev && view.attrs && (view.attrs.handleEvent = prev.handleEvent)

  'id' in view.attrs === false
    && view.tag.id
    && (view.attrs.id = view.tag.id)

  if ((init && view.tag.classes) ||
     view.attrs.class !== (prev && prev.class) ||
     view.attrs.className !== (prev && prev.className)
  )
    dom.className = className(view)

  for (attr in view.attrs) {
    if (!ignoredAttr(attr) && (!prev || prev[attr] !== view.attrs[attr])) {
      !has && (has = true)
      updateAttribute(dom, context, view.attrs, attr, prev && prev[attr], view.attrs[attr])
    }
  }

  if (prev) {
    for (const attr in prev) {
      if (attr in view.attrs === false) {
        isEvent(attr)
          ? removeEvent(dom, attrs, attr)
          : dom.removeAttribute(attr)
      }
    }
  }

  if (view.tag) {
    setVars(dom, view.tag.vars, view.tag.args, init)
    while ((tag = tag.parent))
      setVars(dom, tag.vars, tag.args, init)
  }

  init && view.attrs.life && giveLife(dom, view.attrs, view.children, context, view.attrs.life)

  has
    ? attrs.set(dom, view.attrs)
    : prev && empty(view.attrs) && attrs.delete(dom)

  return prev
}

function setVars(dom, vars, args, init) {
  for (const id in vars) {
    const { unit, index } = vars[id]
    const value = args[index]
    value && value.constructor === Stream
      ? init && value.map(x => dom.style.setProperty(id, renderValue(x, unit)))
      : dom.style.setProperty(id, renderValue(value, unit))
  }
}

function giveLife(dom, attrs, children, context, life) {
  life = [].concat(life)
    .map(x => typeof x === 'function' && x(dom, attrs, children, context))
    .filter(x => typeof x === 'function')

  life.length && lives.set(dom, (lives.get(dom) || []).concat(life))
}

function updateAttribute(dom, context, attrs, attr, old, value) { // eslint-disable-line
  if (old === value)
    return

  if (attr === 'href' && value && !value.match(/^([a-z]+:)?\/\//)) {
    value = s.pathmode + cleanSlash(value)
    link(dom)
  }

  const on = isEvent(attr)
  if (on && typeof old === typeof value)
    return

  on
    ? value
      ? addEvent(dom, attrs, attr)
      : removeEvent(dom, attrs, attr)
    : !value && value !== 0
      ? dom.removeAttribute(attr)
      : !context.NS && attr in dom && typeof value !== 'boolean'
        ? dom[attr] = value
        : dom.setAttribute(attr, value === true ? '' : value)
}

function isEvent(x) {
  return x.charCodeAt(0) === 111 && x.charCodeAt(1) === 110 // on
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
function removeArray(dom, parent, lives) {
  if (!arrays.has(dom))
    return dom.nextSibling

  const last = arrays.get(dom)
  if (dom === last)
    return dom.nextSibling

  const after = last.nextSibling
  dom = dom.nextSibling
  do {
    const x = remove(dom, parent, false)
    x.life && lives.push(x.life)
    dom = x.after
  } while (dom && dom !== after)

  return after
}

function remove(dom, parent, instant = true) {
  if (!parent || removing.has(dom))
    return { after: dom.nextSibling, life: null }

  const lives = []

  let after = dom.nextSibling
  if (dom.nodeType === 8)
    after = removeArray(dom, parent, lives)

  if (dom.nodeType !== 1) {
    instant && parent.removeChild(dom)
    return { after, life: null }
  }

  let child = dom.firstChild
  while (child !== null) {
    const life = remove(child, dom, false).life
    life && lives.push(life)
    child = child.nextSibling
  }

  const life = defer(dom, parent, lives)
  instant && !life && parent.removeChild(dom)

  return {
    after,
    life
  }
}

function value(v, fn) {
  const observers = new Set()
  value.valueOf = () => v
  value.stringOf = () => v
  typeof fn === 'function' && observers.add(fn)

  return function(x) {
    if (typeof x === 'function')
      return derived(x)
    else if (arguments.length === 0)
      return v

    v = x
    observers.forEach(call)
    return v
  }

  function derived(fn) {
    const x = value(v)
    observers.add(v => x(fn(v)))
    return x
  }

  function call(fn) {
    fn(v)
  }
}
