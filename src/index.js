import View from './view.js'
import http from './http.js'
import live from './live.js'
import window from './window.js'
import { parse, medias, formatValue } from './style.js'
import { router, cleanSlash } from './router.js'
import {
  className,
  ignoredAttr,
  isObservable,
  isFunction,
  isTagged,
  styleProp,
  notValue,
  isServer,
  isEvent,
  asArray,
  noop
} from './shared.js'

const document = window.document
    , NS = {
      svg: 'http://www.w3.org/2000/svg',
      math: 'http://www.w3.org/1998/Math/MathML'
    }

export default function s(...x) {
  const type = typeof x[0]
  return type === 'string'
    ? S(Object.assign([x[0]], { raw: [] }))(...x.slice(1))
    : bind(S, isTagged(x[0])
        ? tagged(x)
        : type === 'function'
          ? new View(redrawing, x)
          : new View(redrawing, [x[1], x[0]])
    )
}

function S(...x) {
  return isTagged(x[0])
    ? bind(S, tagged(x, this))
    : execute(x, this)
}

function tagged(x, parent) {
  const level = parent ? parent.level + 1 : 0
  return new View(
    parent && parent.inline,
    parent && parent.component,
    parse(x, parent && parent.tag, level),
    level
  )
}

function bind(x, that) {
  const fn = x.bind(that)
  fn[sSymbol] = true
  return fn
}

const removing = new WeakSet()
    , mounts = new Map()
    , deferrableSymbol = Symbol('deferrable')
    , observableSymbol = Symbol('observable')
    , componentSymbol = Symbol('component')
    , eventSymbol = Symbol('event')
    , arraySymbol = Symbol('array')
    , liveSymbol = Symbol('live')
    , sizeSymbol = Symbol('size')
    , lifeSymbol = Symbol('life')
    , attrSymbol = Symbol('attr')
    , keysSymbol = Symbol('keys')
    , keySymbol = Symbol('key')
    , sSymbol = Symbol('s')

let idle = true
  , afterUpdate = []
  , redrawing = false

s.isServer = isServer
s.pathmode = ''
s.redraw = redraw
s.mount = mount
s.css = (...x) => parse(x, null, 0, true)
s.animate = animate
s.http = http
s.http.redraw = !s.isServer && redraw
s.medias = medias
s.live = live
s.on = on
s.trust = trust
s.route = router(s, '', { location: window.location })
s.window = window
s.catcher = s(({ error }) => {
  isServer
    ? console.error(error) // eslint-disable-line
    : Promise.resolve().then(() => { throw error })
  return () => s`pre;all initial;d block;ws pre-wrap;m 0;c white;bc #ff0033;p 8 12;br 6;overflow auto`(
    s`code`(
      error && error.stack || error || new Error('Unknown Error').stack
    )
  )
})

function trust(x) {
  return s(() => {
    const div = document.createElement('div')
        , frag = new DocumentFragment()

    div.innerHTML = x

    return () => [...div.childNodes]
  })
}

function on(target, event, fn, options) {
  return () => {
    const handleEvent = e => callHandler(fn, e)
    target.addEventListener(event, handleEvent, options)
    return () => target.removeEventListener(event, handleEvent, options)
  }
}

function animate(dom) {
  dom.setAttribute('animate', 'entry')
  requestAnimationFrame(() => dom.removeAttribute('animate'))
  return (deferrable) => deferrable && new Promise(r => {
    let running = false
    dom.setAttribute('animate', 'exit')
    dom.addEventListener('transitionrun', () => (running = true, end(r)), { once: true, passive: true })
    raf3(() => running
      ? end(r)
      : r()
    )
  })

  function end(r) {
    dom.addEventListener('transitionend', r, { once: true, passive: true })
    dom.addEventListener('transitioncancel', r, { once: true, passive: true })
  }
}

function link(dom, route) {
  dom.addEventListener('click', e => {
    if (
      !e.defaultPrevented &&
      (e.button === 0 || e.which === 0 || e.which === 1) &&
      (!e.currentTarget.target || e.currentTarget.target === '_self') &&
      !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey
    ) {
      e.preventDefault()
      const state = dom[attrSymbol].state
      route(dom.getAttribute('href'), { state })
    }
  })
}

function execute(x, parent) {
  const hasAttrs = isAttrs(x && x[0])
  return new View(
    parent.inline,
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
  if (!isFunction(view)) {
    context = attrs || {}
    attrs = view || {}
    view = dom
    dom = document.body
  }

  view instanceof View === false && (view = s(view))

  'location' in context || (context.location = window.location)
  'catcher' in context || (context.catcher = s.catcher)

  if (isServer)
    return { view, attrs, context }

  context.title = s.live(document.title, x => document.title = x)
  context.status = context.head = context.headers = noop
  context.hydrating = shouldHydrate(dom.firstChild)

  context.route = router(s, '', context)
  mounts.set(dom, { view, attrs, context })
  draw({ view, attrs, context }, dom)
}

function shouldHydrate(dom) {
  return dom && dom.nodeType === 8 && dom.nodeValue === 'h' && (dom.remove(), true)
}

function redraw() {
  idle && (requestAnimationFrame(globalRedraw), idle = false)
}

function globalRedraw() {
  mounts.forEach(draw)
  idle = true
}

function draw({ view, attrs, context }, dom) {
  redrawing = true
  try {
    const x = view(attrs, [], context)
    updates(dom, asArray(x), context)
  } catch (error) {
    attrs.error = error
    updates(dom, asArray(context.catcher(attrs)), context)
  }
  redrawing = false
  afterUpdate.forEach(fn => fn())
  afterUpdate = []
}

function updates(parent, next, context, before, last = parent.lastChild) {
  const keys = next[0] && next[0].key !== undefined && new Array(next.length)
      , ref = getNext(before, parent)
      , tracked = ref && keysSymbol in ref
      , after = last ? last.nextSibling : null

  keys && (keys.rev = {}) && tracked
    ? keyed(parent, context, ref[keysSymbol], next, keys, after)
    : nonKeyed(parent, context, next, keys, ref, after)

  const first = getNext(before, parent)
  keys && (first[keysSymbol] = keys)

  return Ret(first, after && after.previousSibling || parent.lastChild)
}

function getNext(before, parent) {
  let dom = before ? before.nextSibling : parent.firstChild
  while (removing.has(dom))
    dom = dom.nextSibling

  return dom
}

function Ref(keys, dom, key, i) {
  keys[i] = { dom, key }
  keys.rev[key] = i
}

function nonKeyed(parent, context, next, keys, dom, after = null) {
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
      dom !== null && dom.nodeType === 8 && dom.nodeValue === ',' && (dom = remove(dom, parent))
    }
  }

  while (dom && dom !== after)
    dom = remove(dom, parent)
}

function keyed(parent, context, as, bs, keys, after) {
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

function update(dom, view, context, parent, stack, create) {
  return isObservable(view)
    ? updateLive(dom, view, context, parent, stack, create)
    : isFunction(view)
      ? update(dom, view(), context, parent, stack, create)
      : view instanceof View
        ? updateView(dom, view, context, parent, stack, create)
        : view instanceof Promise
          ? updateView(dom, s(() => view)(), context, parent, stack, create)
          : Array.isArray(view)
            ? updateArray(dom, view, context, parent, create)
            : view instanceof Node
              ? Ret(view)
              : updateValue(dom, view, parent, create)
}

function updateView(dom, view, context, parent, stack, create) {
  return view.component
    ? updateComponent(dom, view, context, parent, stack, create)
    : updateElement(dom, view, context, parent, create)
}

function updateLive(dom, view, context, parent) {
  if (dom && liveSymbol in dom && dom[liveSymbol] === view)
    return dom[liveSymbol]

  let result
  run(view.value)
  view.observe(run)

  return result

  function run(x) {
    result = update(dom, x, context, parent || dom && dom.parentNode)
    result.first[liveSymbol] = result
    dom = result.first
  }
}

function Ret(dom, first = dom, last = first) {
  return { dom, first, last }
}

function nthAfter(dom, n) {
  while (dom && --n > 0)
    dom = dom.nextSibling
  return dom
}

function fromComment(dom) {
  if (!dom)
    return

  const last = dom.nodeType === 8 && dom.nodeValue.charCodeAt(0) === 91
      && nthAfter(dom.nextSibling, parseInt(dom.nodeValue.slice(1)))
  last && (dom[arraySymbol] = last)
  return last
}

function getArray(dom) {
  return dom && arraySymbol in dom ? dom[arraySymbol] : fromComment(dom)
}

function updateArray(dom, view, context, parent, create) {
  create && dom && parent && (dom = updateArray(dom, [], context, parent).first)
  const last = getArray(dom) || dom
  const comment = updateValue(dom, '[' + view.length, parent, false, 8)

  if (parent) {
    const after = last ? last.nextSibling : null
    updates(parent, view, context, comment.first, last)

    const nextLast = after ? after.previousSibling : parent.lastChild
    last !== nextLast && (comment.first[arraySymbol] = nextLast)
    return Ret(comment.dom, comment.first, nextLast)
  }

  parent = new DocumentFragment()
  parent.appendChild(comment.dom)
  updates(parent, view, context, comment.first, last)
  comment.first[arraySymbol] = parent.lastChild
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
  view.attrs.xmlns || NS[view.tag.name] && (context.NS = view.attrs.xmlns || NS[view.tag.name])
  create && replace(
    dom,
    dom = createElement(view, context),
    parent
  )

  const size = view.children && view.children.length
  attributes(dom, view, context, create)

  size
    ? updates(dom, view.children, context)
    : dom[sizeSymbol] && removeChildren(dom.firstChild, dom)

  dom[sizeSymbol] = size

  context.NS = previousNS
  view.key !== undefined && (dom[keySymbol] = view.key)

  return Ret(dom)
}

function removeChildren(dom, parent) {
  while (dom)
    dom = remove(dom, parent)
}

function tagChanged(dom, view) {
  return dom[keySymbol] !== view.key // eslint-disable-line
      || dom.nodeName.toUpperCase() !== (view.tag.name || 'div').toUpperCase()
}

function createElement(view, context) {
  const is = view.attrs.is
  return context.NS
    ? is
      ? document.createElementNS(context.NS, view.tag.name, { is })
      : document.createElementNS(context.NS, view.tag.name)
    : is
      ? document.createElement(view.tag.name || 'DIV', { is })
      : document.createElement(view.tag.name || 'DIV')
}

class Instance {
  constructor(init, id, view, catcher, loader, hydrating) {
    this.init = init
    this.id = id
    this.key = undefined
    this.view = view
    this.catcher = catcher
    this.loader = loader
    this.hydrating = hydrating
  }
}

class Stack {
  constructor() {
    this.life = []
    this.xs = []
    this.i = 0
    this.top = 0
  }

  changed(view) {
    if (this.i >= this.xs.length)
      return true

    const instance = this.xs[this.i]
    return instance.key !== view.key || (instance.init && instance.init !== view.component[0])
  }
  add(view, context, parent) {
    const [init, options] = view.component
    const instance = new Instance(
      view.inline ? false : init,
      window.count = (window.count || 0) + 1,
      init,
      options && options.catcher || context.catcher,
      options && options.loader || context.loader,
      context.hydrating
    )
    instance.context = Object.create(context, {
      onremove: { value: fn => this.life.push(() => fn) },
      redraw: { value: () => updateComponent(this.dom.first, view, context, parent, this, false, true) },
      reload: { value: () => updateComponent(this.dom.first, view, context, parent, this, true) },
      ignore: { value: x => instance.ignore = x }
    })

    const next = catchInstance(true, instance, view, instance.context, this)

    instance.promise = next && isFunction(next.then) && next
    instance.stateful = instance.promise || (isFunction(next) && !next[sSymbol])
    instance.view = instance.promise ? instance.loader : next
    this.xs.length = this.i
    this.xs[this.i] = instance
    return this.xs[this.top = this.i++]
  }
  next() {
    return this.i < this.xs.length && this.xs[this.top = this.i++]
  }
  pop() {
    return --this.i === 0 && !(this.xs.length = this.top + 1, this.top = 0)
  }
  cut() {
    return this.xs.length = this.top = this.i
  }
}

function hydrate(dom) {
  let last = dom.nextSibling
  while (last && (last.nodeType !== 8 || last.nodeValue !== dom.nodeValue))
    last = last.nextSibling
  return Ret(dom, dom, last)
}

function dehydrate(x, stack) {
  x.first.nextSibling[componentSymbol] = stack
  x.first.remove()
  x.last && x.last.remove()
}

function updateComponent(
  dom,
  component,
  context,
  parent,
  stack = dom && dom[componentSymbol] || new Stack(),
  create = stack.changed(component),
  force = false
) {
  const instance = create
    ? stack.add(component, context, parent)
    : stack.next()

  if (!create && !force && instance.ignore) {
    stack.pop()
    return stack.dom
  }

  component.key && create && (instance.key = component.key)

  const hydratingAsync = instance.promise && dom && dom.nodeType === 8 && dom.nodeValue.charCodeAt(0) === 97 // a

  if (hydratingAsync) {
    instance.next = hydrate(dom)
  } else {
    let view = catchInstance(create, instance, component, instance.context, stack)
    view && view[sSymbol] && (view = view())
    instance.next = update(
      dom,
      !instance.error && !instance.promise && view instanceof View
        ? mergeTag(view, component)
        : view,
      instance.context,
      parent,
      stack,
      (create || instance.recreate) && !instance.hydrating ? true : undefined
    )
    instance.hydrating && (instance.hydrating = false)
    instance.recreate && (instance.recreate = false)
  }

  create && instance.promise && instance.promise
    .then(view => instance.view = 'default' in view ? view.default : view)
    .catch(error => {
      instance.error = component.attrs.error = error
      instance.view = instance.catcher
    })
    .then(() => instance.next.first[componentSymbol] && (
      hydratingAsync && dehydrate(instance.next, stack),
      instance.recreate = true,
      instance.promise = false,
      redraw()
    ))

  const changed = dom !== instance.next.first

  if (stack.pop() && (changed || create)) {
    stack.dom = instance.next
    instance.next.first[componentSymbol] = stack
    !instance.promise && giveLife(instance.next.first, component.attrs, component.children, instance.context, stack.life)
  }

  return instance.next
}

function catchInstance(create, instance, view, context, stack) {
  try {
    return resolveInstance(create, instance, view, context)
  } catch (error) {
    instance.error = view.attrs.error = error
    instance.view = instance.catcher
    stack.cut()
    return resolveInstance(create, instance, view, context)
  }
}

function resolveInstance(create, instance, view, context) {
  return instance.stateful || create
    ? isFunction(instance.view) && !instance.view[sSymbol]
      ? instance.view(view.attrs, view.children, context)
      : instance.view
    : view.component[0](view.attrs, view.children, context)
}

function mergeTag(a, b) {
  if (!b || !b.tag)
    return a

  if (!a || !a.tag)
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

function attributes(dom, view, context) {
  let tag = view.tag

  const prev = dom[attrSymbol]
      , create = !prev

  'id' in view.attrs === false
    && view.tag.id
    && (view.attrs.id = view.tag.id)

  if ((create && view.tag.classes) ||
     view.attrs.class !== (prev && prev.class) ||
     view.attrs.className !== (prev && prev.className) ||
     dom.className !== view.tag.classes
  )
    setClass(dom, view, context)

  create && observe(dom, view.attrs.class, () => setClass(dom, view, context))
  create && observe(dom, view.attrs.className, () => setClass(dom, view, context))

  view.attrs.type != null && setAttribute(dom, 'type', view.attrs.type, context)

  for (const attr in view.attrs) {
    if (ignoredAttr(attr)) {
      attr === 'deferrable' && (dom[deferrableSymbol] = view.attrs[attr])
    } else if (!prev || prev[attr] !== view.attrs[attr]) {
      const value = view.attrs[attr]
      create && observe(dom, value, x => setAttribute(dom, attr, x, context))
      updateAttribute(dom, context, view.attrs, attr, prev && prev[attr], value)
    }
  }

  if (prev) {
    for (const attr in prev) {
      if (attr in view.attrs === false) {
        isEvent(attr)
          ? removeEvent(dom, attr)
          : ignoredAttr(attr)
            ? (attr === 'deferrable' && (dom[deferrableSymbol] = false))
            : dom.removeAttribute(attr)
      }
    }
  }

  const reapply = updateStyle(dom, view.attrs.style, prev && prev.style)

  if (view.tag) {
    setVars(dom, view.tag.vars, view.tag.args, create, reapply)
    while ((tag = tag.parent))
      setVars(dom, tag.vars, tag.args, create, reapply)
  }

  create && view.attrs.dom && giveLife(dom, view.attrs, view.children, context, view.attrs.dom)

  dom[attrSymbol] = view.attrs
}

function updateStyle(dom, style, old) {
  if (old === style)
    return

  if (style == null)
    return (dom.style.cssText = '', true)

  if (typeof style !== 'object')
    return (dom.style.cssText = style, true)

  if (old == null || typeof old !== 'object') {
    dom.style.cssText = ''
    for (const x in style) {
      const value = style[x]
      value != null && dom.style.setProperty(styleProp(x), value + '')
    }
    return true
  }

  for (const x in style) {
    let value = style[x]
    if (value != null && (value = (value + '')) !== (old[x] + ''))
      dom.style.setProperty(styleProp(x), value)
  }

  for (const x in old) {
    if (old[x] != null && style[x] == null)
      dom.style.removeProperty(styleProp(x))
  }

  return true
}

function observe(dom, x, fn) {
  if (!(isObservable(x)))
    return

  const has = observableSymbol in dom
  const xs = has
    ? dom[observableSymbol]
    : new Set()
  has || (dom[observableSymbol] = xs)
  xs.add(x.observe(fn))
}

function setClass(dom, view, context) {
  const x = className(view)
  x
    ? context.NS
      ? dom.setAttribute('class', x)
      : dom.className = x
    : dom.removeAttribute('class')
}

function setVars(dom, vars, args, init, reapply) {
  for (const id in vars) {
    const cssVar = vars[id]
    const value = args[cssVar.index]
    setVar(dom, id, value, cssVar, init, reapply)
  }
}

function setVar(dom, id, value, cssVar, init, reapply, after) {
  if (isObservable(value)) {
    init && value.observe(x => dom.style.setProperty(id, formatValue(x, cssVar)))
    if (init || reapply) setVar(dom, id, value.value, cssVar, init, init)
    return
  }

  if (isFunction(value))
    return setVar(dom, id, value(dom), cssVar, init, reapply, after)

  dom.style.setProperty(id, formatValue(value, cssVar))
  after && afterUpdate.push(() => dom.style.setProperty(id, formatValue(value, cssVar)))
}

function giveLife(dom, attrs, children, context, life) {
  afterUpdate.push(() => {
    life = [].concat(life)
      .map(x => isFunction(x) && x(dom, attrs, children, context))
      .filter(x => isFunction(x))

    life.length && (dom[lifeSymbol] = (dom[lifeSymbol] || []).concat(life))
  })
}

function updateAttribute(dom, context, attrs, attr, old, value) { // eslint-disable-line
  if (old === value)
    return

  if (attr === 'href' && value && !String(value).match(/^([a-z]+:|\/\/)/)) {
    value = s.pathmode + cleanSlash(value)
    link(dom, context.route)
  }

  const on = isEvent(attr)
  if (on && typeof old === typeof value)
    return

  on
    ? value
      ? addEvent(dom, attrs, attr)
      : removeEvent(dom, attr)
    : setAttribute(dom, attr, value, context)
}

function setAttribute(dom, attr, value, context) {
  if (isFunction(value))
    return setAttribute(dom, attr, value(), context)

  !context.NS && attr in dom
    ? dom[attr] = value
    : notValue(value)
      ? dom.removeAttribute(attr)
      : dom.setAttribute(attr, value === true ? '' : value)
}

function removeEvent(dom, name) {
  dom.removeEventListener(name.slice(2), dom[eventSymbol])
}

function addEvent(dom, attrs, name) {
  dom.addEventListener(
    name.slice(2),
    dom[eventSymbol] || (dom[eventSymbol] = handleEvent(dom))
  )
}

function handleEvent(dom) {
  return {
    handleEvent: e => callHandler(dom[attrSymbol]['on' + e.type], e)
  }
}

function callHandler(handler, e) {
  const result = isFunction(handler)
    ? handler.call(e.currentTarget, e)
    : isFunction(handler.handleEvent) && handler.handleEvent(e)

  e.redraw !== false && !isObservable(result) && !isObservable(handler) && redraw()
  result && isFunction(result.then) && result.then(redraw)
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

function removeArray(dom, parent, root, promises, deferrable) {
  const last = getArray(dom)

  if (!last)
    return dom.nextSibling

  if (dom === last)
    return dom.nextSibling

  const after = last.nextSibling
  dom = dom.nextSibling
  if (!dom)
    return after
  do
    dom = remove(dom, parent, root, promises, deferrable)
  while (dom && dom !== after)

  return after
}

function removeChild(parent, dom) {
  observableSymbol in dom && dom[observableSymbol].forEach(x => x())
  parent.removeChild(dom)
}

function remove(dom, parent, root = true, promises = [], deferrable = false) {
  let after = dom.nextSibling
  if (removing.has(dom))
    return after

  if (dom.nodeType === 8) {
    if (dom.nodeValue.charCodeAt(0) === 97) { // a
      after = dom.nextSibling
      removeChild(parent, dom)
      if (!after)
        return after
      dom = after
      after = dom.nextSibling
    } else if (dom.nodeValue.charCodeAt(0) === 91) { // [
      after = removeArray(dom, parent, root, promises, deferrable)
    }
  }

  if (dom.nodeType !== 1) {
    root && removeChild(parent, dom)
    return after
  }

  if (lifeSymbol in dom) {
    for (const life of dom[lifeSymbol]) {
      try {
        const promise = life(deferrable || root)
        if (deferrable || root)
          promise && isFunction(promise.then) && promises.push(promise)
      } catch (error) {
        console.error(error) // eslint-disable-line
      }
    }
  }

  !deferrable && (deferrable = dom[deferrableSymbol] || false)
  let child = dom.firstChild
  while (child) {
    remove(child, dom, false, promises, deferrable)
    child = child.nextSibling
  }

  root && (promises.length === 0
    ? removeChild(parent, dom)
    : (
      removing.add(dom),
      Promise.allSettled(promises).then(() => removeChild(parent, dom))
    )
  )

  return after
}

function raf3(fn) {
  requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(fn)))
}
