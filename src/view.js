import { isFunction } from './shared.js'

export default class View {
  constructor(component, tag = null, level = 0, attrs = null, children = null) {
    this.level = level
    this.component = component && (isFunction(component[0]) ? component : component.reverse())
    this.tag = tag
    this.attrs = attrs
    this.key = attrs && 'key' in attrs ? attrs.key : null
    this.dom = null
    this.children = children
  }
}
