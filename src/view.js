export default class View {
  constructor(inline, component, tag = null, level = 0, attrs = null, children = null) {
    this.level = level
    this.component = component
    this.inline = inline
    this.tag = tag
    this.attrs = attrs
    this.key = attrs ? attrs.key : undefined
    this.dom = null
    this.children = children
  }
}
