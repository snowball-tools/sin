import s from './index.js'

window.run = s.redraw

let xs = []

s.mount(() => [
  'hej',
  s``({
    key: 'wat'
  },
    s`button`({
      onclick: () => xs = []
    }, 'empty'),
    s`button`({
      onclick: () => xs = [...Array(Math.floor(Math.random() * 10)).keys()]
    }, 'create'),
    s`ul`(
      xs.map(x => s`li`({
        key: x
      }, x))
    )
  )
])
