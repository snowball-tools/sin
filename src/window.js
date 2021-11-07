export default typeof window !== 'undefined'
  ? window
  : proxy()

function proxy() {
  return {
    location: {},
    document: {
      documentElement: {
        style: {
        }
      },
      querySelector: () => null,
      createElement: (x) => {
        const dom = {
          tagName: x.toUpperCase(),
          setAttribute: (x, v) => dom.x = v,
          getAttribute: x => dom[x],
          style: {
            setProperty: () => true
          }
        }
        x === 'style' && Object.assign(dom, {
          sheet: {
            insertRule: (rule, index) => index
              ? dom.sheet.cssRules.splice(index, 0, fixCurlies(rule))
              : dom.sheet.cssRules.push(fixCurlies(rule)),
            cssRules: []
          }
        })
        return dom
      }
    }
  }
}

function fixCurlies(x) {
  return x + x.match(/\{/g).map(() => '}').join('')
}
