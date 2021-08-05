import parse from './parse.js'

const components = new WeakMap()
    , removing = new WeakSet()
    , lives = new WeakMap()
    , attrs = new WeakMap()
    , keys = new WeakMap()
    , mounts = new Map()
    , defaults = { name: 'DIV', classes: '', i: 0 }

let idle = true
let redrawing = false

class View {
  constructor(component, tag, level = 0, attrs, children) {
    this.level = level
    this.fn = null
    this.component = component
    this.tag = tag
    this.attrs = attrs
    this.key = attrs && attrs.key
    this.dom = null
    this.children = children
  }
}

export default function s(...x) {
  return S.bind(
    typeof x[0] === 'function'
      ? new View(x)
      : tagged(x)
  )
}

s.pathmode = ''
s.redraw = redraw
s.mount = mount

s.route = router('', {
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
    hasAttrs ? x.slice(1) : x
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
  redrawing && (redrawing = false)
  idle && Promise.resolve().then(globalRedraw)
  idle = false
}

function globalRedraw() {
  redrawing = true
  mounts.forEach((view, dom) => diffs(dom, [].concat(view({ route: s.route }))))
  idle = true
  redrawing === false
    ? redraw()
    : (redrawing = false)
}

function diffs(parent, b) {
  const oldKeyed = keys.has(parent)
      , newKeyed = b[0] instanceof View && b[0].key

  oldKeyed && newKeyed
    ? keyed(parent, b)
    : nonKeyed(parent, b, oldKeyed, newKeyed)
}

function nonKeyed(parent, b, oldKeyed, newKeyed) {
  let i = 0
    , dom = parent.firstChild

  while (i < b.length) {
    if (!removing.has(dom))
      dom = diff(dom, b[i++], parent)
    dom && (dom = dom.nextSibling)
  }

  while (dom)
    dom = diff(dom, null, parent).nextSibling

  newKeyed
    ? keys.set(parent, b)
    : oldKeyed && keys.delete(parent)
}

function keyed(parent, b) {
  const a = keys.get(parent)
      , bLength = b.length

  let aEnd = a.length
    , bEnd = bLength
    , aStart = 0
    , bStart = 0
    , i = 0
    , map = null
    , dom
    , view

  while (aStart < aEnd || bStart < bEnd) {
    if (aEnd === aStart) {
      dom = bEnd < bLength
        ? bStart
          ? b[bStart - 1].dom.nextSibling
          : b[bEnd - bStart].dom
        : null // if before other node

      while (bStart < bEnd) {
        view = b[bStart++]
        parent.insertBefore(diff(null, view, null, 0, true), dom)
      }
    } else if (bEnd === bStart) {
      while (aStart < aEnd) {
        view = a[aStart++]
        if (!map || !map.has(view.key))
          parent.removeChild(view.dom)
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
      if (!map) {
        map = new Map()
        i = bStart
        while (i < bEnd)
          map.set(b[i].key, i++)
      }

      view = a[aStart]
      if (map.has(view.key)) {
        const index = map.get(view.key)
        if (bStart < index && index < bEnd) {
          i = aStart
          let sequence = 1
          while (++i < aEnd && i < bEnd && map.get(a[i].key) === index + sequence)
            sequence++

          if (sequence > index - bStart) {
            while (bStart < index)
              parent.insertBefore(diff(null, b[bStart++]), view.dom)
          } else {
            view = b[bStart++]
            parent.replaceChild(diff(null, view), a[aStart++].dom)
          }
        } else {
          aStart++
        }
      } else {
        view = a[aStart++]
        view && parent.removeChild(view.dom)
      }
    }
  }

  keys.set(parent, b)
}

function diff(dom, view, parent, i, keyChange) {
  return typeof view === 'function'
    ? diff(dom, view(), parent, i, keyChange)
    : view instanceof View && view.component
      ? diffComponent(dom, view, parent, i, keyChange)
      : diffView(dom, view, parent, keyChange)
}

function isSingleText(xs) {
  return xs && xs.length === 1 && (typeof xs[0] === 'string' || typeof xs[0] === 'number')
}

function diffView(dom, view, parent, keyChange) {
  const nodeChange = keyChange || changed(dom, view)
  nodeChange && (replace(dom, dom = create(view), parent))

  if (view instanceof View) {
    view.dom = dom
    view.children && (
      isSingleText(view.children)
        ? dom.textContent = '' + view.children[0]
        : diffs(dom, view.children)
    )
    attributes(dom, view, nodeChange)
  } else if (!nodeChange) {
    dom.nodeValue != view && (dom.nodeValue = view)
  }

  return dom
}

function diffComponent(dom, view, parent, i, keyChange) {
  return components.has(dom) && !keyChange
    ? updateComponent(dom, view, parent, i)
    : createComponent(dom, view, parent, i, keyChange)
}

function updateComponent(dom, view, parent, i = 0) {
  const tree = components.get(dom)
      , prev = tree[i]

  if (!prev)
    return createComponent(dom, view, parent, tree, i)

  if (typeof prev.fn === 'function') {
    const newDom = diff(dom, mergeTag(prev.fn(view.attrs, view.children), view), parent, i + 1)
    newDom !== dom && (components.set(newDom, tree), components.delete(dom))
    return newDom
  } else if (prev.fn && typeof prev.fn.then === 'function') {
    return dom
  }

  return diff(dom, prev.fn, parent, i + 1)
}

function createComponent(dom, view, parent, i, keyChange) {
  const x = view.component[0](view.attrs, view.children)

  if (typeof x === 'function') {
    const newDom = diff(dom, mergeTag(x(view.attrs, view.children), view), parent, i, keyChange)
        , tree = components.get(newDom) || []
    view.fn = x
    tree.unshift(view)
    newDom !== dom && (components.set(newDom, tree), components.delete(dom))
    return newDom
  } else if (x && typeof x.then === 'function') {
    const newDom = document.createComment('pending')
        , tree = components.get(newDom) || []
    view.fn = x
    tree.unshift(view)
    newDom !== dom && (components.set(newDom, tree), components.delete(dom))
    x.then(result => {
      view.fn = result
      redraw()
    })
    replace(dom, newDom, parent)
    return newDom
  }

  return diff(dom, mergeTag(x, view), parent, i, keyChange)
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

  if (view instanceof View) {
    const className = (view.attrs.class || '') + (view.tag.classes ? ' ' + view.tag.classes : '')
    if (className !== (dom.getAttribute('class') || '')) {
      if (className) {
        !has && (has = true)
        dom.setAttribute('class', className)
      } else {
        dom.removeAttribute('class')
      }
    }
    for (let i = 0; i < (view.tag ? view.tag.vars.length : 0); i++)
      dom.style.setProperty('--uid' + (i + 1), view.tag.args[i])
  }

  has
    ? attrs.set(dom, view.attrs)
    : prev && empty(view.attrs) && attrs.delete(dom)
}

function giveLife(dom, view) {
  const life = view.attrs.life(dom)
  typeof life === 'function' && lives.set(dom, life)
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

  if (attr === 'href') {
    value = s.pathmode + cleanSlash(value)
    link(dom)
  }

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
    return dom

  if (!old)
    return parent.appendChild(dom)

  if (!dom)
    return parent.removeChild(old)

  remove(old, parent)
    ? parent.insertBefore(dom, old)
    : parent.replaceChild(dom, old)
}

function remove(dom, parent) {
  components.delete(dom)

  if (!lives.has(dom))
    return false

  const life = lives.get(dom)()

  if (!life || typeof life.then !== 'function')
    return

  removing.add(dom)
  life.then(() => {
    parent.removeChild(dom)
    removing.delete(dom)
  })
  return true
}

function changed(dom, view) {
  return !dom
      || !view
      || (view instanceof View ? dom.nodeName !== view.tag.name : dom)
}

function create(x) {
  return x instanceof View
    ? document.createElement(x.tag.name)
    : typeof x === 'string' || typeof x === 'number' || x instanceof Date
      ? document.createTextNode(x)
      : document.createComment(x)
}
