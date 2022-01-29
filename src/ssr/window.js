import window from '../window.js'
import px from './px.js'

const noop = () => { /* noop */ }

Object.assign(window, {
  addEventListener: noop,
  location: {
    pathname: '',
    hash: '',
    search: ''
  },
  history: {
    pushState(state, title, path) {
      window.history.state = state
      const url = new URL(path, 'http://x')
      window.location.pathname = url.pathname
      window.location.hash = url.hash
      window.location.search = url.search
    },
    state: null
  },
  document: {
    title: '',
    documentElement: {
      style: {
      }
    },
    getElementById: () => null,
    querySelector: () => null,
    createElement: x => {
      const dom = {
        tagName: x.toUpperCase(),
        setAttribute: (x, v) => dom.x = v,
        getAttribute: x => dom[x],
        style: {
          ...px,
          setProperty: function(prop) {
            this[prop] = '1' + (px[prop] || '')
          }
        }
      }
      x === 'style' && Object.assign(dom, {
        sheet: {
          insertRule: (rule, index) => index
            ? dom.sheet.cssRules.splice(index, 0, rule)
            : dom.sheet.cssRules.push(rule),
          cssRules: []
        }
      })
      return dom
    }
  }
})
