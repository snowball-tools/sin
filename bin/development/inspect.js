import s from '../../src/index.js'
import { stackTrace } from '../../src/shared.js'

const goto = s.signal()

export default goto

let rect = null
  , over = null

window.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
    window.hasOwnProperty(stackTrace)
      ? hide()
      : show()
  }
})

const div = document.createElement('div')
div.id = 'sindev'
document.documentElement.appendChild(div)

s.mount(div, () =>
  window.hasOwnProperty(stackTrace) && rect && s`
    all initial
    position fixed
    z-index 200000
    pointer-events none
    transition opacity 0.3s
    transform-origin ${ rect.left + rect.width / 2 }px ${ rect.top + rect.height / 2 }px
    l 0
    b 0
    r 0
    t 0
    animation 0.3s {
      from {
        o 0
        transform scale(2)
      }
    }
  `({
    dom: dom => () => new Promise(res => {
      dom.style.opacity = 0
      setTimeout(res, 300)
    })
  },
    s`span
      ff monospace
      fs 10
      zi 1
      p 2 4
      bc white
      position absolute
      white-space nowrap
      br 3
      bs 0 0 3px rgba(0,0,0,.5)
      t ${ rect.bottom + 8 }
      l ${ rect.left }
      animation 0.3s {
        from { o 0 }
      }
    `(
      Math.round(rect.left) + ',' + Math.round(rect.top) + ' <' +
      over.tagName.toLowerCase() + '> ' + Math.round(rect.width) + 'x' + Math.round(rect.height)
    ),
    s`svg
      position absolute
      top 0
      left 0
    `({
      width: '100%',
      height: '100%'
    },
      s`defs`(
        s`mask#hole`(
          s`rect`({
            width: 10000,
            height: 10000,
            fill: 'white'
          }),
          s`rect
            transition all 0.3s
          `({
            fill: 'black',
            rx: 4,
            ry: 4,
            width: rect.width + 8,
            height: rect.height + 8,
            x: rect.left - 4,
            y: rect.top - 4
          })
        )
      ),
      s`rect`({
        fill: 'rgba(0, 150, 255, 0.5)',
        width: '100%',
        height: '100%',
        mask: 'url(#hole)'
      })
    )
  )
)


function click(e) {
  if (!window.hasOwnProperty(stackTrace))
    return

  e.preventDefault()
  e.stopPropagation()

  let dom = e.target
  while (dom) {
    if (dom.hasOwnProperty(stackTrace))
      return goto(dom[stackTrace])

    dom = dom.parentNode
  }
}

function mouseover(e) {
  if (over === e.target)
    return

  over = e.target
  rect = over.getBoundingClientRect()
  window.hasOwnProperty(stackTrace) && s.redraw()
}

function blur() {
  window.hasOwnProperty(stackTrace) && hide()
}

function show() {
  window[stackTrace] = true
  window.addEventListener('click', click, true)
  window.addEventListener('blur', blur)
  window.addEventListener('mouseover', mouseover)
  mouseover({ target: document.body })
  s.redraw()
}

function hide() {
  delete window[stackTrace]
  window.removeEventListener('click', click)
  window.removeEventListener('blur', blur)
  window.removeEventListener('mouseover', mouseover)
  s.redraw()
}
