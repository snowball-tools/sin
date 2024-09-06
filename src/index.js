import View from './view.js'
import http from './http.js'
import live from './live.js'
import window from './window.js'
import router from './router.js'
import query from './query.js'
import { unit, parse, alias, formatValue, styleElement } from './style.js'
import {
  scrollRestore,
  isObservable,
  ignoredAttr,
  scrollSize,
  stackTrace,
  cleanHref,
  isFunction,
  className,
  styleProp,
  resolved,
  mergeTag,
  isTagged,
  getName,
  isEvent,
  asArray,
  hasOwn,
  getId,
  noop
} from './shared.js'

const document = window.document
    , NS = {
      svg: 'http://www.w3.org/2000/svg',
      math: 'http://www.w3.org/1998/Math/MathML'
    }

const removing = new WeakSet()
    , mounts = new Map()
    , $deferrable = Symbol('deferrable')
    , $observable = Symbol('observable')
    , $component = Symbol('component')
    , $async = Symbol('cycle')
    , $event = Symbol('event')
    , $arrayEnd = Symbol('$arrayEnd')
    , $arrayStart = Symbol('$arrayStart')
    , $live = Symbol('live')
    , $size = Symbol('size')
    , $life = Symbol('life')
    , $attr = Symbol('attr')
    , $keyIndex = Symbol('keyIndex')
    , $keys = Symbol('keys')
    , $key = Symbol('key')
    , $s = Symbol('s')

let afterUpdate = []
  , redrawer
  , redrawed

export default function s(...x) {
  const type = typeof x[0]
  return type === 'string'
    ? S(Object.assign([x[0]], { raw: [] }))(...x.slice(1))
    : hasOwn.call(x[0], $s)
      ? x[0](...x.slice(1))
      : bind(S, isTagged(x[0])
        ? tagged(x)
        : type === 'function'
          ? new View(s.redrawing, x)
          : new View(s.redrawing, [x[1], x[0]])
    )
}

function S(...x) {
  return isTagged(x[0])
    ? bind(S, tagged(x, this))
    : execute(x, this)
}

function tagged(x, parent) {
  const nesting = parent ? parent.nesting + 1 : 0
  return new View(
    parent && parent.inline,
    parent && parent.component,
    parse(x, parent && parent.tag, nesting),
    nesting
  )
}

function bind(x, that) {
  const fn = x.bind(that)
  fn[$s] = true
  return fn
}

s.redrawing = false
s.sleep = (x, ...xs) => new Promise(r => setTimeout(r, x, ...xs))
s.with = (x, fn) => x === undefined ? x : fn(x)
s.isAttrs = isAttrs
s.is = { server: s.isServer = window.isServerSin || false }
s.redraw = redraw
s.redraw.force = force
s.mount = mount
s.css = (...x) => parse(x, null, 0, true)
s.css.alias = alias
s.css.reset = reset
s.css.unit = unit
s.style = styleElement
s.animate = animate
s.http = http
s.live = live
s.event = event
s.on = on
s.trust = trust
s.route = router(s, '', { location: window.location, query: query(s, window.location) })
s.route.prefix = ''
s.window = window
s.scroll = true
s.View = View
s.error = s((error) => {
  console.error(error) // eslint-disable-line
  return () => s`pre;all initial;d block;c white;bc #ff0033;p 8 12;br 6;overflow auto;fs 12`(s`code`(
    'Unexpected Error: ' + (error.message || error)
  ))
})
s.jsx = s((_, xs) => xs.slice(1))

const trusted = s(({ strings, values = [] }) => {
  const div = document.createElement('div')
  const raw = Array.isArray(strings.raw)
    ? [...strings.raw]
    : [strings.trim()]
  raw[0] = raw[0].trimStart()
  raw[raw.length - 1] = raw[raw.length - 1].trimEnd()
  div.innerHTML = String.raw({ raw }, ...values)
  const nodes = [...div.childNodes, document.createComment('trust')]
  return () => nodes
})

function event(fn) {
  const observers = new Set(fn ? [fn] : [])
  event.observe = observe
  return event

  function event(...xs) {
    [...observers].forEach(fn => fn(...xs))
  }

  function observe(x, once) {
    const fn = once ? ((...xs) => (observers.delete(fn), x(...xs))) : x
    observers.add(fn)
    return () => observers.delete(fn)
  }
}

function trust(strings, ...values) {
  return trusted({ key: '' + strings, strings, values })
}

function on(target, event, fn, options) {
  typeof options === 'function' && ([fn, options] = [options, fn])
  return (...xs) => {
    const handleEvent = e => callHandler(fn, e, ...xs)
    target.addEventListener(event, handleEvent, options)
    return () => target.removeEventListener(event, handleEvent, options)
  }
}

function animate(dom) {
  dom.setAttribute('animate', 'entry')
  requestAnimationFrame(() => dom.removeAttribute('animate'))
  return (deferrable) => deferrable && new Promise(r => {
    let running = false
    dom.addEventListener('transitionrun', () => (running = true, end(r)), { once: true, passive: true })
    dom.setAttribute('animate', 'exit')
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => running || r())))
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
      const state = dom[$attr].state
      route(dom.getAttribute('href'), { state })
    }
  })
}

function execute(xs, parent) {
  const hasAttrs = isAttrs(xs[0])
  return new View(
    parent.inline,
    parent.component,
    parent.tag,
    parent ? parent.nesting + 1 : 0,
    hasAttrs ? xs.shift() : undefined,
    xs.length === 1 && Array.isArray(xs[0])
      ? xs[0]
      : xs
  )
}

function isAttrs(x) {
  return x !== null
    && typeof x === 'object'
    && !(x instanceof View)
    && !Array.isArray(x)
    && !(x instanceof Date)
    && !(x instanceof window.Node)
    && !isFunction(x.then)
}

function mount(dom, view, attrs = {}, context = {}) {
  if (!isFunction(view)) {
    context = attrs || {}
    attrs = view || {}
    view = dom
    dom = document.body
    if (!dom)
      throw new Error('document.body does not exist.')
  } else if (!dom) {
    throw new Error('The dom element you tried to mount to does not exist.')
  }

  view instanceof View === false && !hasOwn.call(view, $s) && (view = s(view))

  hasOwn.call(context, 'location') || (context.location = window.location)
  hasOwn.call(context, 'error') || (context.error = s.error)

  if (s.is.server)
    return { view, attrs, context, View }

  dom[stackTrace] = new Error().stack
  s.scroll && scrollRestoration(context)

  context.hydrating = shouldHydrate(dom.firstChild)
  const doc = {
    head: context.hydrating ? noop : head,
    lang: s.live(document.documentElement.lang, x => document.documentElement.lang = x),
    title: s.live(document.title, x => document.title = x),
    status: noop,
    headers: noop
  }

  context.doc = doc
  context.route = router(s, '', { doc: context.doc, location: context.location, query: s.route.query })
  mounts.set(dom, { view, attrs, context })
  draw({ view, attrs, context }, dom)
}

function scrollRestoration(context) {
  let depth = 0
  context[$async] = x => depth !== -1 && (depth += x) || (depth = 0, scrollSize(0, 0))
  window.history.scrollRestoration = 'manual'
  scrollRestore(...(history.state?.scroll || []))
  let scrollTimer

  setTimeout(() => {
    document.addEventListener('scroll', save, { passive: true })
    document.addEventListener('resize', save, { passive: true })
    depth === 0 && (depth = -1, scrollSize(0, 0))
  }, 200)

  function save() {
    clearTimeout(scrollTimer)
    scrollTimer = setTimeout(scrollSave, 100)
  }
}

function scrollSave() {
  window.history.replaceState({
    ...history.state,
    scroll: [
      document.documentElement.scrollLeft || document.body.scrollLeft,
      document.documentElement.scrollTop || document.body.scrollTop,
      document.documentElement.scrollWidth,
      document.documentElement.scrollHeight
    ]
  }, null, location.pathname + location.search + location.hash)
}

function head(x) {
  if (Array.isArray(x))
    return x.forEach(head)
  const dom = document.createElement(getName(x.tag))
  for (const attr in x.attrs)
    dom.setAttribute(attr, x.attrs[attr])
  x.children.length && (dom.innerHTML = x.children[0])
  document.head.appendChild(dom)
}

function shouldHydrate(dom) {
  const hydrate = dom && dom.nodeType === 8 && dom.data === 'h' && (dom.remove(), true)
  if (hydrate) {
    let node
    const nodes = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_COMMENT)
    while ((node = walker.nextNode()))
      node.data === ',' && nodes.push(node)
    nodes.forEach(x => x.remove())
  }
  return hydrate
}

function redraw() {
  if (!redrawer) {
    window.requestAnimationFrame(globalRedraw)
    redrawer = s.is.server
      ? resolved
      : new Promise(r => redrawed = r)
  }
  return redrawer
}

function force() {
  return new Promise(r => {
    redrawed = r
    globalRedraw()
  })
}

function globalRedraw() {
  redrawer = null
  mounts.forEach(draw)
  redrawed()
}

function draw(m, dom) {
  beforeUpdates()
  try {
    m.doms = updates(dom, asArray(m.view(m.attrs)), m.context, m.doms && m.doms.dom.previousSibling, m.doms && m.doms.last)
  } catch (error) {
    m.attrs.error = error
    m.doms = updates(dom, asArray(m.context.error(error, m.attrs, [], m.context)), m.context, m.doms && m.doms.dom.previousSibling, m.doms && m.doms.last)
  } finally {
    afterUpdates()
  }
}

function beforeUpdates() {
  s.redrawing = true
}

function afterUpdates() {
  afterUpdate.forEach(fn => fn())
  afterUpdate = []
  s.redrawing = false
}

function updates(parent, next, context, before, last = parent.lastChild) {
  const keys = next[0] && next[0].key !== undefined && new Array(next.length)
      , ref = getNext(before, parent)
      , tracked = ref && hasOwn.call(ref, $keys)
      , after = last ? last.nextSibling : null

  keys && (keys.rev = new Map()) && tracked
    ? keyed(parent, context, ref[$keys], next, keys, after, ref)
    : nonKeyed(parent, context, next, keys, ref, after)

  const first = getNext(before, parent)
  keys && (first[$keys] = keys) // could be unnecessary since set in keyed and nonKeyed (do tests)

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
  dom[$keys] = keys
  dom[$keyIndex] = i
  keys.rev.set(key, i)
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
    if (dom !== null)
      dom = dom.nextSibling
  }

  while (dom && dom !== after)
    dom = remove(dom, parent)
}

function keyed(parent, context, as, bs, keys, after, ref) {
  const map = as.rev
      , next = new Set()

  for (const x of bs) {
    if (x.key === undefined)
      return nonKeyed(parent, context, bs, keys, ref, after)

    next.add(x.key)
  }

  let ai = as.length - 1
    , bi = bs.length - 1
    , a = as[ai]
    , b = bs[bi]
    , temp = -1

  outer: while (true) { // eslint-disable-line
    while (a && !next.has(a.key)) {
      remove(a.dom, parent)
      map.delete(a.key)
      a = as[--ai]
    }

    while (a && a.key === b.key) {
      after = update(a.dom, b, context, parent).first
      Ref(keys, after, b.key, bi)
      map.delete(b.key)

      if (bi === 0)
        break outer // eslint-disable-line

      if (ai === 0) {
        b = bs[--bi]
        break
      }

      a = as[--ai]
      b = bs[--bi]
    }

    if (map.has(b.key)) {
      temp = map.get(b.key)
      if (temp > bi) {
        temp = update(as[temp].dom, b, context, parent)
        insertBefore(parent, temp, after)
        after = temp.first
        Ref(keys, after, b.key, bi)
      } else if (temp !== bi) {
        temp = update(as[temp].dom, b, context, parent)
        insertBefore(parent, temp, after)
        after = temp.first
        Ref(keys, after, b.key, bi)
      } else {
        a = as[--ai]
        continue
      }
      map.delete(b.key)
      if (bi === 0)
        break
      b = bs[--bi]
    } else {
      temp = update(null, b, context)
      insertBefore(parent, temp, after)
      after = temp.first
      Ref(keys, after, b.key, bi)
      if (bi === 0)
        break
      b = bs[--bi]
    }
  }

  map.forEach((v, k) => remove(as[v].dom, parent))
}

function insertBefore(parent, { first, last }, before) {
  let temp = first
    , dom

  do {
    dom = temp
    temp = dom.nextSibling
  } while (parent.insertBefore(dom, before) !== last)
}

function update(dom, view, context, parent, stack, create, component) {
  return isObservable(view)
    ? updateLive(dom, view, context, parent, stack, create)
    : isFunction(view)
      ? update(dom, view(), context, parent, stack, create)
      : view instanceof View
        ? updateView(dom, view, context, parent, stack, create)
        : view instanceof Promise
          ? updateView(dom, s(() => view)(), context, parent, stack, create)
          : Array.isArray(view)
            ? updateArray(dom, view, context, parent, create, component)
            : view instanceof Node
              ? updateNode(dom, view, context)
              : updateValue(dom, view, parent, create, undefined, component)
}

function updateNode(dom, view, context) {
  return dom && context.hydrating
    ? Ret(dom)
    : Ret(view)
}

function updateView(dom, view, context, parent, stack, create) {
  return view.component
    ? updateComponent(dom, view, context, parent, stack, create)
    : updateElement(dom, view, context, parent, create)
}

function updateLive(dom, view, context, parent) {
  if (dom && hasOwn.call(dom, $live) && dom[$live].view === view)
    return run(view())

  const result = run(view())
  observe(dom, view, run)

  return result

  function run(x) {
    beforeUpdates()
    const doms = update(dom, x, context, parent || dom && dom.parentNode)
    afterUpdates()
    if (dom !== doms.first)
      observe(doms.first, view, run)
    dom = doms.first
    doms.first[$live] = { view, doms }
    return doms
  }
}

function Ret(dom, first = dom, last = first) {
  return { dom, first, last }
}

function fromComment(dom) {
  if (!dom || dom.nodeType !== 8 || dom.data.charCodeAt(0) !== 91) // [
    return

  let l = parseInt(dom.data.slice(1))
  let last = dom
  let char
  while (l && last.nextSibling) {
    last = last.nextSibling
    if (last.nodeType === 8) {
      char = last.data.charCodeAt(0)
      l += char === 91 ? parseInt(last.data.slice(1)) - 1 // [
         : char === 97 ? 1 // a
         : -1
    } else {
      l--
    }
  }
  markArray(dom, last)
  return last
}

function markArray(first, last) {
  (last || first)[$arrayStart] = first
  first[$arrayEnd] = last
}

function getArray(dom) {
  return dom && hasOwn.call(dom, $arrayEnd) ? dom[$arrayEnd] : fromComment(dom)
}

function updateArray(dom, view, context, parent, create, component) {
  create && dom && parent && (dom = updateArray(dom, [], context, parent).first)
  let last = getArray(dom) || dom
  const comment = updateValue(dom, '[' + view.length, parent, false, 8, component)
  if (dom !== comment.dom)
    last = comment.last
  if (parent) {
    const after = last ? last.nextSibling : null
    updates(parent, view, context, comment.first, last)

    const nextLast = after ? after.previousSibling : parent.lastChild
    last !== nextLast && markArray(comment.first, nextLast)
    return Ret(comment.dom, comment.first, nextLast)
  }

  parent = new DocumentFragment()
  parent.appendChild(comment.dom)
  updates(parent, view, context, comment.first, last)
  markArray(comment.first, parent.lastChild)
  return Ret(parent, comment.first, parent.lastChild)
}

function updateValue(
  dom,
  view,
  parent,
  create,
  nodeType = typeof view === 'boolean' || view == null ? 8 : 3,
  component = false
) {
  const nodeChange = create || !dom || dom.nodeType !== nodeType
  if (dom && hasOwn.call(dom, $component) && hasOwn.call(dom, $component) !== component)
    removeCall(dom)

  nodeChange && replace(
    dom,
    dom = nodeType === 8
      ? document.createComment(view)
      : document.createTextNode(view),
    parent
  )

  if (!nodeChange && dom.data !== '' + view)
    dom.data = view

  return Ret(dom)
}

function updateElement(
  dom,
  view,
  context,
  parent,
  create = dom === null || tagChanged(dom, view, context)
) {
  const previousNS = context.NS
  if (view.attrs.xmlns || NS[getName(view.tag)])
    context.NS = view.attrs.xmlns || NS[getName(view.tag)]

  create && replace(
    dom,
    dom = createElement(view, context),
    parent
  )

  const size = view.children && view.children.length
  attributes(dom, view, context, create)

  size
    ? updates(dom, view.children, context)
    : dom[$size] && removeChildren(dom.firstChild, dom)

  dom[$size] = size

  context.NS = previousNS
  hasOwn.call(view, 'key') && (dom[$key] = view.key)

  return Ret(dom)
}

function removeChildren(dom, parent) {
  while (dom)
    dom = remove(dom, parent)
}

function tagChanged(dom, view, context) {
  return (dom[$key] !== view.key && !context.hydrating) // eslint-disable-line
       || (context.NS
         ? dom.nodeName !== getName(view.tag)
         : dom.nodeName.toLowerCase() !== (getName(view.tag).toLowerCase() || 'div')
       )
}

function createElement(view, context) {
  const is = view.attrs.is
  return context.NS
    ? is
      ? document.createElementNS(context.NS, getName(view.tag), { is })
      : document.createElementNS(context.NS, getName(view.tag))
    : is
      ? document.createElement(getName(view.tag) || 'div', { is })
      : document.createElement(getName(view.tag) || 'div')
}

class Instance {
  constructor(init, view, error, loading, hydrating) {
    this.init = init
    this.key = undefined
    this.view = view
    this.error = error
    this.caught = undefined
    this.loading = loading
    this.hydrating = hydrating
    this.onremoves = undefined
    this.promise = undefined
    this.stateful = undefined
    this.next = undefined
    this.ignore = false
    this.context = undefined
    this.recreate = false
    this.attrs = null
    this.children = null
  }
}

class Stack {
  constructor() {
    this.xs = []
    this.i = 0
    this.top = 0
    this.bottom = 0
    this.dom = null
  }

  changed(view, context) {
    if (this.i >= this.xs.length)
      return true

    const instance = this.xs[this.i]
    const x = (instance.key !== view.key && !context.hydrating) || (instance.init && instance.init !== view.component[0])
    x && instance.onremoves && instance.onremoves.forEach(x => x())
    return x
  }

  add(view, context, optimistic) {
    const index = this.i
    const [init, options] = view.component
    const instance = new Instance(
      view.inline ? false : init,
      init,
      options && options.error || context.error,
      options && options.loading || context.loading,
      context.hydrating
    )

    const update = (e, recreate, optimistic) => {
      beforeUpdates()
      e instanceof Event && (e.redraw = false)
      const keys = this.dom.first[$keys]
      const keyIndex = this.dom.first[$keyIndex]
      this.i = this.bottom = index
      instance.attrs !== null && (view.attrs = instance.attrs)
      instance.children !== null && (view.children = instance.children)
      updateComponent(this.dom.first, view, context, this.dom.first.parentNode, this, recreate, optimistic, true)
      hasOwn.call(this.dom.first, $keys) || (
        this.dom.first[$keys] = keys,
        this.dom.first[$keyIndex] = keyIndex
      )
      keys && (keys[keyIndex].dom = this.dom.first)
      this.i = this.bottom = 0
      afterUpdates()
    }

    const redraw = e => update(e, false, true, true)
    const reload = e => {
      instance.onremoves && (instance.onremoves.forEach(x => x()), instance.onremoves = undefined)
      update(e, true)
    }
    const refresh = e => {
      instance.onremoves && (instance.onremoves.forEach(x => x()), instance.onremoves = undefined)
      update(e, true, true)
    }
    instance.context = Object.create(context, {
      hydrating: { value: context.hydrating, writable: true },
      onremove: { value: fn => { onremoves(instance, fn) } },
      ignore: { value: x => { instance.ignore = x } },
      refresh: { value: refresh },
      redraw: { value: redraw },
      reload: { value: reload }
    })

    const next = catchInstance(true, instance, view)

    isObservable(view.attrs.reload) && onremoves(instance, view.attrs.reload.observe(reload))
    isObservable(view.attrs.redraw) && onremoves(instance, view.attrs.redraw.observe(redraw))
    isObservable(view.attrs.refresh) && onremoves(instance, view.attrs.refresh.observe(refresh))

    instance.promise = next && isFunction(next.then) && next
    instance.stateful = instance.promise || (isFunction(next) && !next[$s])
    instance.view = instance.promise ? optimistic ? this.xs[this.i].view : instance.loading : next
    this.xs.length = this.top = this.i
    return this.xs[this.i++] = instance
  }
  next(component) {
    const instance = this.i < this.xs.length && this.xs[this.top = this.i++]
    instance.attrs = component.attrs
    instance.children = component.children
    return instance
  }
  pop() {
    return --this.i === this.bottom && !(this.xs.length = this.top + 1, this.top = 0)
  }
}

function onremoves(instance, x) {
  instance.onremoves
    ? instance.onremoves.add(x)
    : instance.onremoves = new Set([x])
}

function hydrate(dom) {
  const id = '/' + dom.data
  let last = dom.nextSibling
  while (last && (last.nodeType !== 8 || last.data !== id))
    last = last.nextSibling

  const x = Ret(dom.nextSibling, dom.nextSibling, last.previousSibling)
  hasOwn.call(last, $arrayStart) && markArray(last[$arrayStart], last.previousSibling)
  hasOwn.call(dom, $component) && (x.first[$component] = dom[$component])
  if (hasOwn.call(dom, $keys)) {
    const keys = dom[$keys]
    const keyIndex = dom[$keyIndex]
    x.first[$keys] = keys
    x.first[$keyIndex] = keyIndex
    keys[dom[$keyIndex]].dom = x.first
  }
  dom.remove()
  last.remove()
  return x
}

function bounds(dom) {
  const id = '/' + dom.data
  let last = dom.nextSibling
  while (last && (last.nodeType !== 8 || last.data !== id))
    last = last.nextSibling
  return Ret(dom, dom, last)
}

function updateComponent(
  dom,
  component,
  context,
  parent,
  stack = dom && dom[$component] || new Stack(),
  create = stack.changed(component, context),
  optimistic = false,
  local = false
) {
  const instance = create
    ? stack.add(component, context, optimistic)
    : stack.next(component)

  if (!create && instance.ignore && !local) {
    stack.pop()
    return stack.dom
  }

  component.key !== undefined && (create || context.hydrating) && (instance.key = component.key)

  const hydratingAsync = instance.promise && dom && dom.nodeType === 8 && dom.data.charCodeAt(0) === 97 // a

  if (hydratingAsync) {
    instance.next = bounds(dom)
  } else {
    let view = catchInstance(create, instance, component)
    view && hasOwn.call(view, $s) && (view = view(component.attrs, component.children, instance.context))
    instance.next = update(
      dom,
      !instance.caught && !instance.promise && view instanceof View
        ? mergeTag(view, component)
        : view,
      instance.context,
      parent,
      stack,
      (create || instance.recreate) && !instance.hydrating && !optimistic ? true : undefined,
      stack
    )
    instance.hydrating && (instance.hydrating = instance.context.hydrating = false)
    instance.recreate && (instance.recreate = false)
  }

  let i = stack.i - 1
  if (create && instance.promise) {
    context[$async](1)
    instance.promise
      .then(view => instance.view = view && hasOwn.call(view, 'default') ? view.default : view)
      .catch(error => {
        instance.caught = error
        instance.view = resolveError(instance, component, error)
      })
      .then(() => hasOwn.call(instance.next.first, $component) && stack.xs[i] === instance && (
        hydratingAsync && (stack.dom = hydrate(dom)),
        context.hydrating = false,
        instance.recreate = true,
        instance.promise = false,
        instance.context.redraw(),
        context[$async](-1)
      ))
  }

  const changed = dom !== instance.next.first

  if (stack.pop() && (changed || create)) {
    stack.dom = instance.next
    instance.next.first[$component] = stack
  }

  return instance.next
}

function catchInstance(create, instance, view) {
  try {
    return instance.stateful || create
      ? isFunction(instance.view) && !instance.view[$s]
        ? instance.view(view.attrs, view.children, instance.context)
        : instance.view
      : view.component[0](view.attrs, view.children, instance.context)
  } catch (error) {
    return resolveError(instance, view, error)
  }
}

function resolveError(instance, view, error) {
  return hasOwn.call(instance.error, $s)
    ? instance.error().component[0](error, view.attrs, view.children, instance.context)
    : instance.error(error, view.attrs, view.children, instance.context)
}

function attributes(dom, view, context) {
  let tag = view.tag
    , value

  const prev = dom[$attr] || (context.hydrating && getAttributes(dom)) || undefined
      , create = !prev

  if (create && hasOwn.call(view.attrs, 'id') === false) {
    const id = getId(view.tag)
    id && (dom.id = id)
  }

  setClass(dom, view)
  create && observe(dom, view.attrs.class, () => setClass(dom, view))
  create && observe(dom, view.attrs.className, () => setClass(dom, view))

  view.attrs.type != null && setAttribute(dom, 'type', view.attrs.type)

  for (const attr in view.attrs) {
    if (ignoredAttr(attr)) {
      if (attr === 'deferrable') {
        dom[$deferrable] = view.attrs[attr]
      }
    } else if (!prev || prev[attr] !== view.attrs[attr]) {
      updateAttribute(dom, view.attrs, attr, prev && prev[attr], view.attrs[attr], create)
    }
  }

  if (hasOwn.call(view.attrs, 'value')) {
    if (!prev && getName(tag) === 'input' && dom.value !== '' + view.attrs.value) {
      let start
        , end
      if (dom === document.activeElement) {
        start = dom.selectionStart
        end = dom.selectionEnd
      }
      updateAttribute(dom, view.attrs, 'value', dom.value, view.attrs.value, create)
      if (dom === document.activeElement && (dom.selectionStart !== start || dom.selectionEnd !== end))
        dom.setSelectionRange(start, end)
    } else if (!prev || prev.value !== view.attrs.value) {
      updateAttribute(dom, view.attrs, 'value', prev && prev.value, view.attrs.value, create)
    }
  }

  if (hasOwn.call(view.attrs, 'href') && (context.hydrating || !prev || prev.href !== view.attrs.href)) {
    value = view.attrs.href
    const internal = !String(value).match(/^[a-z]+:|\/\//) && !view.attrs.target && !view.attrs.download
    internal && (value = cleanHref(view.attrs.href))
    updateAttribute(dom, view.attrs, 'href', prev && prev.href, value, create)
    if (value && internal) {
      view.attrs.href = s.route.prefix + value
      link(dom, context.route)
    }
  }

  if (prev) {
    for (const attr in prev) {
      if (hasOwn.call(view.attrs, attr) === false) {
        isEvent(attr)
          ? removeEvent(dom, attr)
          : ignoredAttr(attr)
            ? (attr === 'deferrable' && (dom[$deferrable] = false))
            : dom.removeAttribute(attr)
      }
    }
  }

  const reapply = updateStyle(dom, view.attrs.style, prev && prev.style)

  if (tag) {
    setVars(dom, tag.vars, tag.args, create || context.hydrating, reapply)
    while ((tag = tag.parent))
      setVars(dom, tag.vars, tag.args, create || context.hydrating, reapply)
  }

  if ((create || context.hydrating) && view.attrs.dom)
    giveLife(dom, view.attrs, view.children, context, view.attrs.dom)

  hasOwn.call(view, stackTrace) && (dom[stackTrace] = view[stackTrace])

  dom[$attr] = view.attrs
}

function getAttributes(dom) {
  if (!dom || !dom.hasAttributes())
    return

  const attrs = {}
  for (const attr of dom.attributes) {
    attrs[attr.name] = attr.value || true
  }
  return attrs
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

  const has = hasOwn.call(dom, $observable)
  const xs = has
    ? dom[$observable]
    : new Set()
  has || (dom[$observable] = xs)
  xs.add(x.observe(fn))
}

function setClass(dom, view) {
  const x = className(view)
  if (dom.className == x)
    return
  x
    ? dom instanceof SVGElement
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
    if (init || reapply)
      setVar(dom, id, value(), cssVar, init, init)
    return
  }

  if (isFunction(value))
    return resolved.then(() => setVar(dom, id, value(dom), cssVar, init, reapply, after))

  dom.style.setProperty(id, formatValue(value, cssVar))
  after && afterUpdate.push(() => dom.style.setProperty(id, formatValue(value, cssVar)))
}

function giveLife(dom, attrs, children, context, life) {
  afterUpdate.push(() => {
    asArray(life).forEach(async l => {
      let x = isFunction(l) && l(dom, attrs, children, context)
      x && isFunction(x.then) && (x = await x, redraw())
      isFunction(x) && (hasOwn.call(dom, $life)
        ? dom[$life].push(x)
        : dom[$life] = [x]
      )
    }, [])
  })
}

function updateAttribute(dom, attrs, attr, old, value, create) { // eslint-disable-line
  if (old === value)
    return

  const on = isEvent(attr)
  if (on && typeof old === typeof value)
    return

  on
    ? value
      ? addEvent(dom, attrs, attr)
      : removeEvent(dom, attr)
    : (
      setAttribute(dom, attr, value),
      create && observe(dom, value, x => setAttribute(dom, attr, x))
    )
}

function setAttribute(dom, attr, value) {
  if (value == null)
    value = ''

  if (isFunction(value))
    return setAttribute(dom, attr, value())

  asProp(dom, attr)
    ? dom[attr] = value
    : !value && value !== 0
      ? dom.removeAttribute(attr)
      : dom.setAttribute(attr, value === true ? '' : value)
}

function asProp(dom, attr) {
  return dom instanceof SVGElement === false
      && attr !== 'href'
      && attr !== 'list'
      && attr !== 'form'
      && attr !== 'tabIndex'
      && attr !== 'download'
      && attr !== 'width'
      && attr !== 'height'
      && attr in dom
}

function removeEvent(dom, name) {
  dom.removeEventListener(name.slice(2), dom[$event])
}

function addEvent(dom, attrs, name) {
  dom.addEventListener(
    name.slice(2),
    dom[$event] || (dom[$event] = handleEvent(dom))
  )
}

function handleEvent(dom) {
  return {
    handleEvent: e => callHandler(dom[$attr]['on' + e.type], e, dom)
  }
}

function callHandler(handler, e, ...xs) {
  if (Array.isArray(handler))
    return handler.forEach(x => callHandler(x, e, ...xs))

  const result = isFunction(handler)
    ? handler.call(e.currentTarget, e, ...xs)
    : isFunction(handler.handleEvent) && handler.handleEvent(e, ...xs)

  if (e.redraw === false) {
    delete e.redraw
    return
  }

  !isObservable(result) && !isObservable(handler) && redraw()
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
  removeCall(dom)
  parent.removeChild(dom)
}

function removeCall(dom) {
  const x = hasOwn.call(dom, $component) && dom[$component]
  x && x.i <= x.top && (x.i ? x.xs.slice(x.i) : x.xs).forEach(x => x.onremoves && x.onremoves.forEach(x => x()))
  hasOwn.call(dom, $observable) && dom[$observable].forEach(x => x())
}

function remove(dom, parent, root = true, promises = [], deferrable = false) {
  let after = dom.nextSibling
  if (removing.has(dom))
    return after

  if (dom.nodeType === 8) {
    if (dom.data.charCodeAt(0) === 97) { // a
      after = dom.nextSibling
      removeChild(parent, dom)
      if (!after)
        return after
      dom = after
      after = dom.nextSibling
    } else if (dom.data.charCodeAt(0) === 91) { // [
      after = removeArray(dom, parent, root, promises, deferrable)
    }
  }

  if (dom.nodeType !== 1) {
    root
      ? removeChild(parent, dom)
      : removeCall(dom)
    return after
  }

  if (hasOwn.call(dom, $life)) {
    for (const life of dom[$life]) {
      try {
        const promise = life(deferrable || root)
        if (deferrable || root)
          promise && isFunction(promise.then) && promises.push(promise)
      } catch (error) {
        console.error(error) // eslint-disable-line
      }
    }
  }

  !deferrable && (deferrable = dom[$deferrable] || false)
  let child = dom.firstChild
  while (child) {
    remove(child, dom, false, promises, deferrable)
    child = child.nextSibling
  }

  root
    ? (promises.length === 0
      ? removeChild(parent, dom)
      : (
        removing.add(dom),
        Promise.allSettled(promises).then(() => removeChild(parent, dom))
      )
    )
    : removeCall(dom)

  return after
}

function reset(x = [], ...xs) {
  // I always want these
  s.css`
    *,*::before,*::after{box-sizing border-box}
    input,button,textarea,select{font inherit;tt none}
    *{m 0;p 0;overflow-wrap break-word;hyphens auto}
    body{ff system-ui, sans-serif}
    p{lh 1.5}
    img,svg,video,canvas,audio,iframe,embed,object{d block;va middle}
    img,video{max-width 100%;h auto}
    ol,ul,li{list-style none}
    body{min-height 100svh}
    body{-webkit-font-smoothing: antialiased;text-rendering: optimizeLegibility;}
  `

  // These are more rare
  s.css`
    img,video{background-repeat no-repeat;background-size cover;object-size cover;shape-margin 0.75rem}
    button,[type='button'],[type='reset'],[type='submit']{-webkit-appearance button;bc transparent;bi none}
    button,input,optgroup,select,textarea{c inherit}
    :target{scroll-margin-block 5ex}
  `

  return s.css(x, ...xs)
}
