export default function(s) {
  const selectorParser = /(?:(^|#|\.)([^#.[\]]+))|(\[(.+?)(?:\s*=\s*("|'|)((?:\\["'\]]|.)*?)\5)?\])/g
      , selectorCache = {}

  function m(a, b, ...rest) {
    if (typeof a === 'function' || (a && typeof a.view === 'function'))
      return component.apply(null, arguments)

    const { tag, attrs } = compileSelector(a)
    b && typeof b === 'object' && b instanceof Date === false && Array.isArray(b) === false && b instanceof s.View === false
      ? Object.assign(attrs, b, mergeClass(attrs, b))
      : rest.unshift(b)

    return s(tag, attrs, ...rest)
  }

  function mergeClass(a, b) {
    return {
      className: (a.className ? a.className + ' ' : '') + (b.className || ''),
      class: (a.class ? a.class + ' ' : '') + (b.class || '')
    }
  }

  function compileSelector(selector) {
    let match
      , tag = 'div'

    const classes = []
        , attrs = {}

    while ((match = selectorParser.exec(selector))) {
      const type = match[1]
          , value = match[2]
      if (type === '' && value !== '') {
        tag = value
      } else if (type === '#') {
        attrs.id = value
      } else if (type === '.') {
        classes.push(value)
      } else if (match[3][0] === '[') {
        let attrValue = match[6]
        if (attrValue) attrValue = attrValue.replace(/\\(["'])/g, '$1').replace(/\\\\/g, '\\')
        if (match[4] === 'class') classes.push(attrValue)
        else attrs[match[4]] = attrValue === '' ? attrValue : attrValue || true
      }
    }
    if (classes.length > 0) attrs.className = classes.join(' ')
    return selectorCache[selector] = { tag, attrs }
  }

  function component(c, ...children) {
    const a = isAttrs(children[0]) ? children.shift() : {}
    return s(() => {
      const state = {}
      const attrs = { ...a }
      call(c.oninit || c, [{ attrs, state, children }], c)

      return ({ attrs, children }) => {
        const view = c.view({ state, attrs, children })
        view.attrs ? (
          view.attrs.dom = view.attrs.dom
            ? [fn].concat(view.attrs.dom)
            : fn
        ) :
        view.attrs = { dom: fn }
        return view

        function fn(dom) {
          call(c.oncreate, [{ state, attrs, children, dom }], c)
          return () => call(c.onbeforeremove || c.onremove, [{ state, attrs, children, dom }])
        }
      }
    })({ attrs: a, children })
  }

  function isAttrs(x) {
    return x && typeof x === 'object' && x instanceof Date === false
             && Array.isArray(x) === false && x instanceof s.View === false
  }

  function call(x, args) {
    return x && typeof x === 'function' && x.apply(null, args)
  }

  m.mount = function(dom, view) {
    s.mount(dom, () => m(view))
  }

  return m
}
