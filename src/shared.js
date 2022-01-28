import { Observable } from './live.js'

export const isServer = typeof window === 'undefined' || typeof window.document === 'undefined'

export function isFunction(x) {
  return typeof x === 'function'
}

export function ignoredAttr(x) {
  return x === 'dom' || x === 'is' || x === 'key' || x === 'handleEvent' || x === 'class' || x === 'className'
}

export function className(view) {
  return (classes(view.attrs.class) + classes(view.attrs.className) + view.tag.classes).trim()
}

export function isEvent(x) {
  return x.charCodeAt(0) === 111 && x.charCodeAt(1) === 110 // on
}

function classes(x) {
  if (isFunction(x))
    return classes(x())

  return x
    ? typeof x === 'object' && !(x instanceof Observable)
      ? Object.keys(x).reduce((acc, c) => acc + x[c] ? c + ' ' : '', '')
      : x + ' '
    : ''
}
