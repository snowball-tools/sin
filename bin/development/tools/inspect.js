import S from '../../../src/index.js'
import s from '../../../src/index.js?sintools'
import { stackTrace } from '../../../src/shared.js'

const rect = s.live(null)
    , eventOptions = { capture: true, passive: true }
    , last = { log: s.live(), error: s.live() }
    , logs = []
    , showLog = s.live(0, showLogChange)

export const goto = s.event()
export const log = s.event(newLog)
export const hmr = s.event(S.redraw)

let over = null
  , inspecting = false
  , logTimer
  , top = false

function newLog(x) {
  x.type === 'error'
    ? last.log(x)
    : last.error(x)
  logs.unshift(x)
  showLog(Date.now())
  s.redraw()
}

function showLogChange() {
  clearInterval(logTimer)
  logTimer = setTimeout(s.redraw, 3010)
}

window.addEventListener('mouseover', mouseover, eventOptions)
window.addEventListener('keydown', keydown, eventOptions)

const div = document.createElement('div')
div.id = 'sindev'
document.documentElement.appendChild(div)

s.scroll = false

s.mount(div, s(({}, [], { ignore }) => {
  return () => [
    window.hasOwnProperty(stackTrace) && rect && s`
      all initial
      position fixed
      z-index 666665
      pointer-events none
      transition opacity 0.3s
      transform-origin ${
        rect.get(x => x.left + x.width / 2)
      } ${
        rect.get(x => x.top + x.height / 2)
      }
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
        t ${ rect.get(x => x.bottom + 8) }
        l ${ rect.get(x => x.left) }
        animation 0.3s {
          from { o 0 }
        }
      `(
        rect.get(x =>
          Math.round(x.left) + ',' + Math.round(x.top) + ' <' +
          over.tagName.toLowerCase() + '> ' + Math.round(x.width) + 'x' + Math.round(x.height)
        )
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
              width: rect.get(x => x.width + 8),
              height: rect.get(x => x.height + 8),
              x: rect.get(x => x.left - 4),
              y: rect.get(x => x.top - 4)
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
    ),
    s`
      all initial
      position fixed
      zi 666666
      c white
      b ${ top ? 'initial' : 0 }
      t ${ top ? 0 : 'initial' }
      h 64
      r 0
      l 0
      pointer-events none
      font-family ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace
      fs 12

      * {
        box-sizing border-box
        pointer-events auto
      }

      transition transform 0.3s
      [animate] {
        transform translateY(${ top ? -100 : 100 })
      }
    `({
      dom: s.animate,
      key: top
    },
      false && s`
        position absolute
        height min(calc(100vh - 100px), 500px)
        w calc(100% - 40px)
        l 20
        t -500
        br 8
        p 4
        backdrop-filter blur(16)
        bc rgb(30 30 30/75%)
        bi linear-gradient(-180deg, rgb(211 234 255/.15), rgb(100 180 255/.10) 15%, rgb(155 100 215/.05) 80%, rgb(155 150 200/.05))
        bs 0 1 12 -4 rgb(0 0 0/.35), 0 0 4 -1 rgb(0 0 0/.35), inset 0 .5 1 rgb(255 255 255/0.5)
        transform-origin 50% calc(100% + 30px)
        animation .5s {
          from {
            transform scale(0) translateY(-300)
          }
        }
      `(
        s`
          w 100%
          h 100%
          p 8 0
          mask-image linear-gradient(transparent, black 8px, black calc(100% - 8px), transparent)
          mask-size 100%
          mask-position 0 0, 100% 0
          mask-repeat no-repeat
          d flex
          fd column-reverse
          overflow auto
          overscroll-behavior contain
        `(
          logs.map((x, i, xs) =>
            s`
              d flex
              ai center
              gap 6
              m 0 8
              p 4
              h 20
              br 4
              flex-wrap nowrap
              :hover {
                background rgb(255 255 255/.05)
              }
            `(
              s`
                o .5
                fs 10
                min-width 50
                ta right
              `({
                title: new Date(x.timestamp)
              },
                xs[i + 1]
                  ? ((x.timestamp - xs[i + 1].timestamp) / 1000).toFixed(3) + 's'
                  : 0
              ),
              s`
                fg 1
              `(
                // s`pre`(JSON.stringify(x)),
                x.args.map(x =>
                  s`
                    white-space nowrap
                  `({
                    title: x.type + (x.subtype ? ' (' + x.subtype + ')' : '')
                  },
                    x.value
                      ? x.value
                      : x.description.split('\n')[0])
                )
              ),
              s.with(x.stackTrace?.callFrames.find(x =>
                x.url.indexOf('node_modules/') === -1
              ), x =>
                s`
                  fs 10
                  ta right
                  d flex
                  overflow hidden
                  white-space nowrap
                  text-overflow ellipsis
                `(
                  false && s``(x.functionName + ' at '),
                  s`span
                    flex-shrink 0
                    fg 1
                    border-bottom 1px solid rgba(255,255,255,.3)
                    o 0.65
                    cursor pointer
                    :hover {
                      o 1
                    }
                  `({
                    onclick: () => goto({
                      file: x.url.slice(location.origin.length),
                      line: (x.lineNumber + 1),
                      column: (x.columnNumber + 1)
                    })
                  },
                    x.url.slice(location.origin.length) + ':' + (x.lineNumber + 1)
                  )
                )
              )
            )
          )
        )
      ),
      logs.length > 0 && s`
        position absolute
        b 18
        r calc(50% + 32px)
        bc rgba(0 0 0/.25)
        bi linear-gradient(rgba(0 0 0/.05), rgba(0 0 0/.1))
        backdrop-filter blur(8)
        h 32
        min-width 32
        br 18
        d grid
        pi center
        ai center
        c white
        p 0 4
        d flex
        fd row-reverse
        transition .3s min-width
        animation .3s {
          from {
            transform translateX(36) scaleX(0)
            o 0
          }
        }
      `(
        s`
          d grid
          pi center
          min-width 24
          flex-shrink 0
          p 0 8
          h 24
          br 12
          fw bold
          bc rgb(30 30 30/65%)
          bi linear-gradient(-185deg, rgb(211 234 255/.15), rgb(100 180 255/.15) 15%, rgb(255 0 15/.15) 80%, rgb(255 150 0/.15))
        `({
          onmouseenter: showLog.set(() => Date.now()),
          onclick: () => showLog(showLog() ? 0 : Date.now())
        }, logs.length),
        logs.length > 0 && s`
          transition .3s max-width
          overflow hidden
          c black
          max-width ${ x => x.scrollWidth + 8 }
          [animate], [closed] {
            max-width 0
            o 0
          }
        `({
          closed: showLog.get(x => Date.now() - x > 3000),
          dom: s.animate,
          key: logs.length
        },
          s`
            d flex
            gap 6
            m 0 8
            flex-wrap no-wrap
          `(
            logs[logs.length - 1].args.map(x =>
              s`
                white-space nowrap
              `({
                title: x.type
              }, x.value)
            )
          )
        )
      ),
      s`
        position absolute
        b 16
        bc rgba(255 0 0/.25)
        bi linear-gradient(rgba(0 0 0/.05), rgba(0 0 0/.1))
        backdrop-filter blur(8)
        w 36
        h 36
        br 30
        d grid
        pi center
        c white
        max-width ${ x => x.scrollWidth }
        transform translateX(${ x => window.innerWidth / 2 + 36 })
        animation .5s {
          from, 70% {
            transform translateX(${ x => window.innerWidth / 2 - 18 })
            o 0
          }
        }
      `(
        '🚨'
      ),
      s`
        position absolute
        b 8
        l calc(50% - 26px)
        bc rgba(0 0 0/.05)
        backdrop-filter blur(8)
        p 4
        br 30
        d flex
        ai center
        c white
        animation 1.5s {
          from {
            bc transparent
          }
        }
      `(
        s`
          w 44
          h 44
          br 22
          p 6
          bc rgb(30 30 30/65%)
          bi linear-gradient(-185deg, rgb(211 234 255/.15), rgb(100 180 255/.15) 15%, rgb(255 0 15/.15) 80%, rgb(255 150 0/.15))
          bs 0 1 12 -4 rgb(0 0 0/.35), 0 0 4 -1 rgb(0 0 0/.35)
          animation 0.5s {
            from {
              transform scale(0) rotate(-180)
              o 0
            }
            80% {
              transform scale(1.1)
            }
          }
        `({
          onclick: () => top = !top,
          dom: x => {
            hmr.observe(() => {
              document.body.animate([
                { opacity: 1 },
                { opacity: 0.4 },
                { opacity: 1 }
              ], { duration: 300, easing: 'ease-out' })
              x.animate([
                { transform: 'rotate(0)' },
                { transform: 'rotate(180deg) scale(1.1)' },
                { transform: 'rotate(360deg)' }
              ], { duration: 300, easing: 'ease-out' })
            })
          }
        },
          s.trust`
            <svg viewBox="0 0 480 480" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M279.285 28.0767C317.536 66.3278 317.536 128.345 279.285 166.596L246.57 199.311L198.3 151.041L189.727 159.615C170.2 179.141 170.2 210.799 189.726 230.326L202.641 243.24L155.765 290.116L136.688 271.039C98.4372 232.788 98.4373 170.771 136.688 132.52L260.208 9L279.285 28.0767ZM236.474 277.073L200.712 312.835C162.46 351.086 162.46 413.103 200.711 451.354L219.788 470.431L343.308 346.911C381.559 308.66 381.559 246.643 343.308 208.392L324.231 189.315L280.403 233.143L288.674 241.414C308.2 260.94 308.2 292.599 288.674 312.125L280.1 320.699L236.474 277.073Z" fill="white"/>
            </svg>
          `
        )
      )
    )
  ]
}))


function click(e) {
  if (!window.hasOwnProperty(stackTrace))
    return

  e.preventDefault()
  e.stopPropagation()

  let dom = e.target
  while (dom) {
    if (dom.hasOwnProperty(stackTrace)) {
      const x = parseStackTrace(dom[stackTrace])[3]
      if (x)
        return goto(x)
    }

    dom = dom.parentNode
  }
}

function keydown(e) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
    window.hasOwnProperty(stackTrace)
      ? hide()
      : show()
  } else if (inspecting && e.key === 'Escape') {
    hide()
  }
}

function mouseover(e) {
  if (over === e.target || div.contains(e.target))
    return

  over = e.target
  window[stackTrace] && rect(over.getBoundingClientRect())
}

function blur() {
  window.hasOwnProperty(stackTrace) && hide()
}

function show() {
  inspecting = window[stackTrace] = true
  over
    ? rect(over.getBoundingClientRect())
    : rect(document.body.getBoundingClientRect())
  window.addEventListener('click', click, eventOptions)
  window.addEventListener('blur', blur, eventOptions)
  s.redraw()
  S.redraw()
}

function hide() {
  inspecting = false
  delete window[stackTrace]
  window.removeEventListener('click', click)
  window.removeEventListener('blur', blur)
  s.redraw()
  S.redraw()
}

export function parseStackTrace(x) {
  return String(x).split('\n').reduce((acc, x) => (
    x = x.match(/( +at )?([^/]*)[@(](.+):([0-9]+):([0-9]+)/i), // check if really unnecessary escape char
    x && acc.push({
      name: x[2].trim(),
      file: x[3].replace(window.location.origin, ''),
      line: parseInt(x[4]),
      column: parseInt(x[5])
    }),
    acc
  ), [])
}
