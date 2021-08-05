export default class View {
  constructor(component, tag, level = 0, attrs, children) {
    this.level = level
    this.instance = null
    this.component = component
    this.tag = tag
    this.attrs = attrs
    this.key = attrs && attrs.key
    this.dom = null
    this.children = children
  }
}
