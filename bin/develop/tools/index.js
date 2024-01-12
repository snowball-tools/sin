import './userland.js'
import s from 'SIN'

import '../log.js'

import api from './api.js'
import menu from './menu.js'
import inspect from './inspect.js'

s.scroll = false
s.style(Object.assign(document.createElement('style'), { wat: 'hej' }))

const root = Object.assign(document.createElement('div'), { id: 'sintools'})
document.documentElement.appendChild(root)

api.redraw.observe(s.redraw)

s.css`
  #sintools { font-family ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace }
  #sintools *, #sintools:before, #sintools:before { box-sizing border-box }
`

s.mount(root, () => [
  menu,
  inspect
])
