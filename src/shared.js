export function ignoredAttr(x) {
  return x === 'dom' || x === 'is' || x === 'key' || x === 'handleEvent' || x === 'class' || x === 'className'
}

export function className(view) {
  return (
    classes(view.attrs.class) + classes(view.attrs.className) + view.tag.classes
  ).trim()
}

function classes(x) {
  if (typeof x === 'function')
    return classes(x())

  return x
    ? typeof x === 'object'
      ? Object.keys(x).reduce((acc, c) => acc + x[c] ? c + ' ' : '', '')
      : x + ' '
    : ''
}
