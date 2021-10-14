export default typeof window !== 'undefined'
  ? window
  : proxy()

function proxy() {
  return {
    location: {},
    document: {
      createElement: (x) => {
        const dom = {
          tagName: x.toUpperCase(),
          setAttribute: (x, v) => dom.x = v,
          getAttribute: x => dom[x]
        }
        return dom
      }
    }
  }
}
