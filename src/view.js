import window from './window.js'
import { hasOwn, stackTrace } from './shared.js'

export default class View {
  constructor(inline, component, tag = null, level = 0, attrs = null, children = null) {
    if (
      tag && tag.name === 'input' && attrs && !attrs.disabled && (
        ('value' in attrs && !('oninput' in attrs)) ||
        ('checked' in attrs && !('oninput' in attrs) && !('onchange' in attrs))
      )
    )
      throw new Error('oninput handler required when value is set on input - Bypass check by setting oninput: false')

    this.level = level
    this.component = component
    this.inline = inline
    this.tag = tag
    this.attrs = attrs
    this.key = attrs ? attrs.key : undefined
    this.dom = null
    this.children = children
    this[stackTrace] = hasOwn.call(window, stackTrace) ? new Error().stack : null
  }
}
