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
  styleProp,
  notValue,
  isServer,
  isEvent,
  asArray,
  noop
} from './shared.js'

const document = window.document
    , NS = {
      html: 'http://www.w3.org/1999/xhtml',
      svg: 'http://www.w3.org/2000/svg',
      math: 'http://www.w3.org/1998/Math/MathML'
    }

s.isServer = isServer

export default function s(...x) {
  const type = typeof x[0]
  return type === 'string'
    ? S(Object.assign([x[0]], { raw: [] }))(...x.slice(1))
    : S.bind(
      type === 'function'
        ? isFunction(x[1])
          ? new View(x.reverse())
          : new View(x)
        : tagged(x)
    )
}

function S(...x) {
  return x[0] && Array.isArray(x[0].raw)
    ? S.bind(tagged(x, this))
    : execute(x, this)
}

const removing = new WeakSet()
    , mounts = new Map()
    , deferrableSymbol = Symbol('deferrable')
    , observableSymbol = Symbol('observable')
    , componentSymbol = Symbol('component')
    , eventSymbol = Symbol('event')
    , arraySymbol = Symbol('array')
    , liveSymbol = Symbol('stream')
    , sizeSymbol = Symbol('size')
    , lifeSymbol = Symbol('life')
    , attrSymbol = Symbol('attr')
    , keySymbol = Symbol('key')

let idle = true
  , afterUpdate = []

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

function trust(x) {
  return s(() => {
    const div = document.createElement('div')
        , frag = new DocumentFragment()

    div.innerHTML = x

    while (div.lastChild)
      frag.appendChild(div.lastChild)

    return () => frag
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
  if (!isFunction(view)) {
    context = attrs || {}
    attrs = view || {}
    view = dom
    dom = document.body
  }

  'location' in context || (context.location = window.location)
  'catcher' in context || (context.catcher = catcher)

  if (isServer)
    return { view, attrs, context }

  context.title = s.live(document.title, x => document.title = x)
  context.status = context.head = context.headers = noop

  context.route = router(s, '', context)
  mounts.set(dom, { view, attrs, context })
  draw({ view, attrs, context }, dom)
}

function catcher(error) {
  isServer
    ? console.error(error) // eslint-disable-line
    : Promise.resolve().then(() => { throw error })
  return s`pre;all initial;d block;ws pre-wrap;m 0;c white;bc #ff0033;p 8 12;br 6;overflow auto`(
    s`code`(
      error && error.stack || error || new Error('Unknown Error').stack
    )
  )
}

function redraw() {
  idle && (requestAnimationFrame(globalRedraw), idle = false)
}

function globalRedraw() {
  mounts.forEach(draw)
  idle = true
}

function draw({ view, attrs, context }, dom) {
  try {
    const x = view(attrs, [], context)
    updates(dom, asArray(x), context)
  } catch (error) {
    updates(dom, asArray(context.catcher(error, attrs, [], context)), context)
  }
  afterUpdate.forEach(fn => fn())
  afterUpdate = []
}

function updates(parent, next, context, before, last = parent.lastChild) {
  const keys = next[0] && next[0].key != null && new Array(next.length)
      , ref = getNext(before, parent)
      , tracked = ref && keySymbol in ref
      , after = last ? last.nextSibling : null

  keys && (keys.rev = {}) && tracked
    ? keyed(parent, context, ref[keySymbol], next, keys, after)
    : nonKeyed(parent, context, next, keys, ref, after)

  const first = getNext(before, parent)
  keys && (first[keySymbol] = keys)

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
  return isFunction(view)
    ? isObservable(view)
      ? updateLive(dom, view, context, parent, stack, create)
      : update(dom, view(), context, parent, stack, create)
    : view instanceof View
      ? updateView(dom, view, context, parent, stack, create)
      : Array.isArray(view)
        ? updateArray(dom, view, context, parent)
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
  if (dom && liveSymbol in dom)
    return dom[liveSymbol]

  let result
  run(view())
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

function updateArray(dom, view, context, parent) {
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

  return Ret(dom)
}

function removeChildren(dom, parent) {
  while (dom)
    dom = remove(dom, parent, false)
  parent.innerHTML = ''
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

function Stack() {
  const xs = []
  let i = 0
    , top = 0

  const stack = {
    life: [],
    get exhausted() {
      return i >= xs.length
    },
    get key() {
      return i < xs.length
        ? xs[i].key
        : null
    },
    add(view, context, parent, stack) {
      const [init, options] = view.component
      const instance = {
        id: window.count = (window.count || 0) + 1,
        key: null,
        view: init,
        catcher: options && options.catcher || context.catcher,
        loader: options && options.loader || context.loader
      }

      instance.context = createContext(view, context, parent, stack, instance)
      const next = catchInstance(true, instance, view, instance.context, stack)

      instance.promise = next && isFunction(next.then) && next
      instance.stateful = instance.promise || isFunction(next)
      instance.view = instance.promise ? instance.loader : next
      xs.length = i
      xs[i] = instance
      return xs[top = i++]
    },
    next(view, context, parent, stack) {
      const instance = i < xs.length && xs[top = i++]
      instance && (instance.context = createContext(view, context, parent, stack, instance))
      return instance
    },
    pop() {
      return --i === 0 && !(xs.length = top + 1, top = 0)
    },
    cut() {
      return xs.length = top = i
    }
  }

  return stack
}

function createContext(view, context, parent, stack, instance) {
  return Object.create(context, {
    onremove: { value: fn => stack.life.push(() => fn) },
    redraw: { value: () => updateComponent(stack.dom.first, view, context, parent, stack, false, true) },
    reload: { value: () => updateComponent(stack.dom.first, view, context, parent, stack, true) },
    ignore: { value: x => instance.ignore = x }
  })
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
  x.last.remove()
}

function updateComponent(
  dom,
  component,
  context,
  parent,
  stack = dom && dom[componentSymbol] || Stack(),
  create = stack.exhausted || stack.key !== component.key,
  force = false
) {
  const instance = create
    ? stack.add(component, context, parent, stack)
    : stack.next(component, context, parent, stack)

  if (!create && !force && instance.ignore) {
    stack.pop()
    return stack.dom
  }

  component.key && create && (instance.key = component.key)

  const hydrating = instance.promise && dom && dom.nodeType === 8 && dom.nodeValue.charCodeAt(0) === 97 // a
  const next = instance.next = hydrating
    ? hydrate(dom)
    : update(
      dom,
      mergeTag(catchInstance(create, instance, component, instance.context, stack), component),
      instance.context,
      parent,
      stack,
      create || undefined
    )

  create && instance.promise && instance.promise
    .then(view => instance.view = view)
    .catch(error => instance.view = instance.catcher.bind(null, error))
    .then(() => instance.next.first[componentSymbol] && (
      hydrating && dehydrate(next, stack),
      delete stack.dom.first[lifeSymbol],
      instance.promise = false,
      redraw()
    ))

  const changed = dom !== next.first

  if (stack.pop() && (changed || create)) {
    stack.dom = instance.next = next
    next.first[componentSymbol] = stack
    !instance.promise && giveLife(next.first, component.attrs, component.children, instance.context, stack.life)
  }

  return next
}

function catchInstance(create, instance, view, context, stack) {
  try {
    return resolveInstance(create, instance, view, context)
  } catch (error) {
    instance.view = instance.catcher.bind(null, error)
    stack.cut()
    return resolveInstance(instance.stateful || create, instance, view, context)
  }
}

function resolveInstance(create, instance, view, context) {
  return instance.stateful || create
    ? isFunction(instance.view)
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

function attributes(dom, view, context, create) {
  let tag = view.tag

  const prev = dom[attrSymbol]

  'id' in view.attrs === false
    && view.tag.id
    && (view.attrs.id = view.tag.id)

  if ((create && view.tag.classes) ||
     view.attrs.class !== (prev && prev.class) ||
     view.attrs.className !== (prev && prev.className) ||
     dom.className !== view.tag.classes
  )
    setClass(dom, view)

  create && observe(dom, view.attrs.class, () => setClass(dom, view))
  create && observe(dom, view.attrs.className, () => setClass(dom, view))

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

function setClass(dom, view) {
  const x = className(view)
  x
    ? dom.className = x
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
    init || reapply && setVar(dom, id, value.value, cssVar, init, init)
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

  if (attr === 'href' && value && !value.match(/^([a-z]+:|\/\/)/)) {
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

  e.redraw !== false && !(isObservable(handler)) && redraw()
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
      dom = after
      after = dom.nextSibling
    }
    if (dom.nodeValue.charCodeAt(0) === 91) { // [
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
        deferrable || root && promise && isFunction(promise.then) && promises.push(promise)
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
