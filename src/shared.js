export const isServer = typeof window === 'undefined' || typeof window.document === 'undefined'

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

export function isCssVar(x) {
  return x[0] === '-' && x[1] === '-'
}

export function ignoredAttr(x) {
  return x === 'dom' || x === 'is' || x === 'key' || x === 'handleEvent'
      || x === 'class' || x === 'className' || x === 'style'
}

export function className(view) {
  return (classes(view.attrs.class) + classes(view.attrs.className) + view.tag.classes).trim()
}

export function asArray(x) {
  return Array.isArray(x) ? x : [x]
}

function classes(x) {
  if (isFunction(x))
    return classes(x())

  return x
    ? typeof x === 'object' && !(isObservable(x))
      ? Object.keys(x).reduce((acc, c) => acc + x[c] ? c + ' ' : '', '')
      : x + ' '
    : ''
}
