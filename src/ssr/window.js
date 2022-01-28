import window from '../window.js'
import px from './px.js'

const noop = () => { /* noop */ }

Object.assign(window, {
  addEventListener: noop,
  history: {
    pushState: noop
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
