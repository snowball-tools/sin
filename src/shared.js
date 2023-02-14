export const stackTrace = Symbol('stackTrace')

export const hasOwn = {}.hasOwnProperty

export function cleanSlash(x) {
  return x && String(x).replace(/\/+/g, '/').replace(/(.)\/$/, '$1')
}

export function notValue(x) {
  return !x && x !== 0 && x !== ''
}

export function snake(x) {
  return x.replace(/(\B[A-Z])/g, '-$1').toLowerCase()
}

export function isObservable(x) {
  return x && isFunction(x.observe)
}

export function isFunction(x) {
  return typeof x === 'function'
}

export function isEvent(x) {
  return x.charCodeAt(0) === 111 && x.charCodeAt(1) === 110 // on
}

export function isTagged(x) {
  return x && Array.isArray(x.raw)
}

export function asCssVar(x) {
  return x.charCodeAt(0) === 36 // 36
    ? '--' + x.slice(1)
    : x.charCodeAt(0) === 45 && x.charCodeAt(1) === 45 // -
    ? x
    : null
}

export function ignoredAttr(x) {
  return x === 'dom' || x === 'is' || x === 'key' || x === 'handleEvent' || x === 'type'
  || x === 'class' || x === 'className' || x === 'style' || x === 'deferrable' || x === 'href'
}

export function className(view) {
  return (classes(view.attrs.class) + classes(view.attrs.className) + view.tag.classes).trim()
}

export function asArray(x) {
  return Array.isArray(x) ? x : [x]
}

export function noop() {
  // noop
}

export function styleProp(x) {
  return asCssVar(x) || (
    x === 'cssFloat'
      ? 'float'
      : snake(x)
  )
}

function classes(x) {
  return isObservable(x) || isFunction(x)
    ? classes(x())
    : !x
    ? ''
    : typeof x === 'object'
    ? classObject(x)
    : x + ' '
}

function classObject(x) {
  let c = ''
  for (const k in x)
    c += (c ? ' ' : '') + (x[k] || '')
  return c
}
