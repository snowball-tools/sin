export default class View {
  constructor(component, tag = null, level = 0, attrs = {}, children = null) {
    const text = children
      && children.length === 1
      && typeof children[0] === 'string'
      ? children
      : null

    this.level = level
    this.instance = null
    this.component = component
    this.tag = tag
    this.attrs = attrs
    this.key = 'key' in attrs ? attrs.key : null
    this.dom = null
    this.children = text === null ? children : null
    this.text = text
  }
}
