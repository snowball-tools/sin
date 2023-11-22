/* eslint no-unused-vars: 0 */

import s from 'sin'

function inheritTest() {
  const c = s(({ yas }) =>
    (yas ? s`strong#a
      bc blue
    ` : s`div#b
      bc green
    `)`
    `('hej')
  )

  s.mount(() => [
    s`button`({
      onclick: () => p('wat')
    }, 'red'),
    c({
      yas: true
    }),
    c({
      yas: false
    })
  ])
}

async function ssrfun() {
  s.css`
    * {
      animation 3s {
        from { o 0 }
      }
    }
  `

  s.isServer || await s.sleep(2000)

  //export default
  s.mount(({}, [], { route }) => [
    s`button`({
      onclick: s.redraw,
      key: 2
    }, 'redraw'),
    route({
      '/': s(async() => {
        p('init', 1)
        s.isServer || await s.sleep(2000)
        return () => s(async() => {
          p('init', 2)
          s.isServer || await s.sleep(2000)
          return () => '-1'
        })
      })
    }),
    s(() => {
      console.log('init', Date.now())
      return () => s`h1`('b')
    })({ key: 4 })
  ])
}

function routingSpam() {
  s.mount(({}, [], { route }) =>
    s`main`(
      s`a`({
        href: '/'
      },
        '/'
      ),
      s`a`({
        href: '/wat'
      },
        '/wat'
      ),
      s`a`({
        href: '/dat'
      },
        '/dat'
      ),
      route({
        '/...': s(({ wat, init = performance.now() }, [], { route }) => () => s`h1`('anything', route.path, init))
      }),
      route({
        '/*': s(({ wat, init = performance.now() }, [], { route }) => () => s`h1`('anything', route.path, init))
      }),
      route({
        '/?': s(({ wat, init = performance.now() }, [], { route }) => () => s`h1`('anything', route.path, init))
      })
    )
  )
}

function sTrust() {
  s.css`
    * { animation 1s { from { o 0 } } }
  `
  const xs = []
  const xs2 = []

  s.mount(() => [
    s`button`({
      onclick: () => xs2.push(xs.push(xs.length)),
      key: Math.random()
    }, 'add'),
    xs.map(x => s`li`(x)),
    xs.length % 2
      ? s.trust('<h1>hej</h1><p>wat</p>')
      : s.trust('<h1>hej</h1><p>wat</p>'), // should do nothing
    xs2.map(x => s`li`(x)),
    xs.length % 2
      ? s.trust('<h1>hej</h1><p>wat</p>')
      : s.trust('<h2>hej</h2><p>wat</p>'), // should recreate
    xs2.map(x => s`li`(x)),
  ])
}

function parentTagArgsInherit() {
  const xs = [10,20,30]

  // width is not 50, 60 and 70 but just 50
  s.mount(() =>
    xs.map(x =>
      s`
        bc blue
        w ${ '20px' }
        h ${ '20px' }
      ``
        w ${ x + 40 + 'px' }
        h ${ x + 40 + 'px' }
      ``
        border 10px solid blue
      ``
        bc yellow
        h ${ x + 50 + 'px' }
      `('hej')
    )
  )
}

function autosizeTextarea() {
  s.css`
    html {
      box-sizing: border-box;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
  `


  let value = 'Initial text'

  const textareaAutosize = s((attrs, children) =>
    s`textarea
      resize none
      overflow hidden
    `({
      ...attrs,
      oninput: (e, dom) => {
        dom.style.height = 'auto'
        dom.style.height = dom.scrollHeight + (dom.offsetHeight - dom.clientHeight) + 'px'
        attrs.oninput
          ? attrs.oninput(e, dom)
          : e.redraw = false
      }
    },
      children
    )
  )

  s.mount(() => [
    Date.now(),
    textareaAutosize`
      border none
      bs 0 0 10 black
    `({
    }, value)
  ])
}

function scrollHistory() {
  s.mount(({}, [], { route }) => [
    s`main
      position relative
      pb 50vh
    `(
      s`a`({
        href: '/'
      }, 'home'),
      s`a`({
        href: '/next'
      }, 'next'),
      s(async() => {
        await s.sleep(500)
        return () => [
          route({
            '/': () => s(async() => {
              await s.sleep(2000)
              return () => [...Array(100)].map((x, i) => s`h1`('home ', i, Math.round(Math.random() * 10)))
            }),
            '/next': () => [...Array(100)].map((x, i) => s`h1`('next', i))
          })
        ]
      })
    )
  ])
}

function virtBAD() {
  s.css`
    html, body {
      height 100%
      min-height 100%
    }
  `
  const virtual = s(({
    data,
    rows,
    columns
  }, [view]) => {
    const from = s.live(0)
    const size = s.live(1)
    const height = s.live(0)
    const items = s.live.from(from, size, (from, size) =>
      data(from, from + size).map(x =>
        view({
          dom,
          data: x,
          i: from + x
        })
      )
    )

    function dom(x) {
      if (!x.parentNode)
        return

      const h = x.offsetHeight
      const ch = x.parentNode.offsetHeight
      height(height + h)
      height() < ch && size(size + 1)
      return () => height(height - h)
    }

    return () => items
  })

  const xs = [...Array(10000)].map((x, i) => i)

  s.mount(() =>
    virtual({
      data: (from, to) => xs.slice(from, to)
    },
      s(({ data, i }) => s``({ id: i }, 'Hello', data, i))
    )
  )

  function occlu() {
    const watso = s(({ data, count, height: defaultHeight }, [view]) => {
      const length = 8
          , heights = new Array(count).fill(null)
          , height = x => heights.slice(0, x).reduce((a, b) => a + (b === null ? defaultHeight : b), 0)
          , scroll = s.live(0)
          , translate = s.live(0)
          , offset = s.live.from(scroll, x => {
            let index = 0
            let height = heights[index]
            while (height < x)
              height += heights[++index] || defaultHeight
            translate(Math.max(0, height - (heights[index] || defaultHeight)))
            return index
          })
          , items = s.live.from(offset, x =>
            data(Math.max(0, x), Math.min(x + length, count)).map((item, i) =>
              view({ dom, key: item, item, index: x + i })
            )
          )

      const doms = [
        x => x.parentNode.style.minHeight = height(count) + 'px',
        s.on(
          document,
          'scroll',
          scroll.set(() => document.documentElement.scrollTop || document.body.scrollTop),
          { passive: true }
        )
      ]

      function dom(dom, { index }) {
        heights[index] = (dom.offsetTop + dom.offsetHeight - (
            dom.previousElementSibling
              ? (dom.previousElementSibling.offsetTop + dom.offsetHeight)
              : 0
          )) || defaultHeight
      }

      return () =>
        s`
          transform translateY(${ translate })
        `({
          dom: doms
        },
          items
        )
    })

    const xs = [...Array(10000)].map((x, i) => i)

    let watsoi = false
    s.css`
      body { m 0 }
    `

    const child = s(({ item, index }, [], { redraw }) =>
      s`
        h 100
        bc lightblue
        ta center
        p 40
        will-change transform
        animation 0.5s {
          from {
            transform rotateX(-90deg)
            opacity 0
          }
        }
      `({
        id: 'a' + index
      },
        index + 'is good', Date.now(),
        s``({ onclick: redraw }, 'yas')
      )
    )

    s.mount(() => [
      watsoi ? xs.map(x => child({ index: x })) : watso`
        d grid
        gap 20
      `({
        height: 200,
        count: xs.length,
        data: (from, to) => xs.slice(from, to)
      },
        child
      ),
      s`button
        position fixed
        top 0
        right 0
      `({
        onclick: () => watsoi = !watsoi
      },
        'switch'
      )
    ])
  }
}

function lively() {
  const lively = s.live(0)
      , many = s.live.from(lively, x => [...Array(x)].map((x, i) => s`li`(i)))

  s.mount(() => [
    lively,
    s`
      background hsl(${ lively.get(x => x * 20) }, 100%, 50%)
    `('yo'),
    s``({ onclick: lively.set(() => lively + 1) }, 'inc'),
    s``({ onclick: lively.set(() => lively - 1) }, 'dec')
  ])
}

function diffMoves() {
  const xs = s.live([1, 2, 3])
      , wats = s.live.from(xs, xs =>
        xs.map(x =>
          s`
          animation 1s {
            from { transform scale(0) }
          }
        `({ key: x, dom: () => p('init', x) },
          x
        ))
      )

  s.mount(() =>
    s``(wats)
  )

  setTimeout(() => {
    xs([0, 1, 2])
    s.redraw()
  }, 2000)
}

function nestedInsideMediaIssue(fixed) {
  s.mount(() =>
    s`
      span {
        bc hotpink
      }

      @media screen and (max-width: 600px) {
        span {
          bc yellow
        }
      }
    `(
      s`span
        p 40
      `('hej')
    )
  )
}

function wat() {
  let checked = false
  s.mount(() => [
    s`button`({
      onclick: () => checked = !checked
    }, 'yas'),
    s`input`({
      type: 'date',
      value: new Date()
    }),
    s`input`({
      type: 'text',
      value: undefined
    }),
    s`input`({
      type: 'checkbox',
      checked: checked,
      onclick: () => checked = !checked
    }),
    s`a`({ href: 'http://sinjs.com' }, 'hej'),
    checked && s`ul`(
      [...Array(2000)].map((x, i) => s`li`(i))
    ),
    s`h1`('hej'),
    s`h1`('hejsa'),
    s`h1`('hejmed'),

    s`h1`('hejdig')
  ])
}

function mathml() {
  s.mount(() =>
    s`div`(
      s`math
        display block
      `(
        s`mtable`(
          s`mtr
            c blue
            fw bold
          `({
            onclick: () => alert('wat')
          },
            s`mtd`(
              s`msup`(
                s`mi`('c'),
                s`mn`('2')
              ),
              s`mo`('+'),
              s`mn`('4'),
              s`mo`('⋅'),
              s`mo`('('),
              s`mfrac`(
                s`mn`('1'),
                s`mn`('2')
              ),
              s`mi`('a'),
              s`mi`('b'),
              s`mo`(')')
            )
          )
        )
      )
    )
  )
}

function cssComments() {
  s.css`
    /*
    body {
      background: blue
    }
    */

    body {
      background: /* background: red */ green;
      background red // green
      // background: red
    }
  `
}

function onremoveTest() {
  let show = false
  s.mount(() => [
    s`button`({ onclick: () => show = !show }, 'toggle'),
    show && s(({}, [], { onremove }) => {
      p('init')
      onremove(() => p('remove'))
      return () => s`h1`('Hejsa der')
    })
  ])
}

function cssDom() {
  let show
    , text = 'Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source. Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of "de Finibus Bonorum et Malorum" (The Extremes of Good and Evil) by Cicero, written in 45 BC. This book is a treatise on the theory of ethics, very popular during the Renaissance. The first line of Lorem Ipsum, "Lorem ipsum dolor sit amet..", comes from a line in section 1.10.32.'

  s.mount(() => [
    s`button
      bc blue
      c white
      fs 40

      animation 1s {
        from { o 0 }
      }
    `({
      onclick: () => show = !show,
      dom: s.on(document, 'keydown', (e, dom) => p(dom))
    }, 'toggle it'),
    show && s`div
      w 200
      transition max-height 1s
      overflow hidden
      max-height ${ x => x.scrollHeight }
      [animate] {
        max-height 0
      }

      [animate=exit] {
        transition max-height 3s
      }
    `({
      dom: s.animate,
      oninput: (e) => {
        text = e.target.textContent
      },
      contenteditable: true
    },
      text
    )
  ])
}

function liveOptimizationSample() {
  const xs = [...Array(200).keys()]
  const selected = s.live(2)
  const value = s.live()

  s.mount(() => [
    s`h1`('Yo'),
    s``('Redrew at: ', Date.now()),
    xs.map(id =>
      s`div
        :active { bc red }
        [selected] { bc lightblue }
      `({
        selected: selected.if(id),
        onclick: selected.set(id)
      },
        id
      ),
      s`input`({
        value,
        oninput: value.set(e => e.target.value)
      })
    )
  ])
}

function imbaFunSample() {
  const xs = [...Array(50000).keys()]
  s.css`
    body {
      ff sans-serif
    }
  `

  const mark = s`mark
    position absolute
    t 0
    l 0
    border-radius: 2px;
    p 8
    zi 1
    bc yellow
    c teal
  `

  const li = s`div
    d inline-block
    m 2
    p 4 2
    bc #eee
    br 6
    :hover { bc lightblue }
  `

  s.mount(s(({ x = 20, y = 20, title = 'hey' }) => () =>
    s`main
      min-height 100vh
    `({ onmousemove: e => (x = e.pageX, y = e.pageY) },
      s`input`({ value: title, oninput: e => title = e.target.value }),
      s`label`(`Mouse is at ${ x } ${ y }`),
      mark` transform translate(${ x }, ${ y }) rotate(${ x + y })`('Item'),
      s`div`(xs.slice(0, y * 4).map(x =>
        li(x % 12 ? x : title)
      ))
    )
  ))
}

function testSpecificity() {
  s.css`
    :root {
      bc #ddd
    }

    body {
      bc #eee
    }
  `

  s.mount(() => [
    s`div
      animation 1s {
        from { o 0 }
      }

      p {
        bc blue
      }

      p:hover {
        bc yellow
      }

      @media (max-width: 800px) {
        p {
          bc hotpink
        }

        p:hover {
          bc tomato
        }
      }
    `(
      'yo',
      s`p
        bc red

        :hover {
          bc teal
        }

        @media (max-width: 800px) {
          bc gray

          :hover {
            bc black
          }
        }`(
        'hello'
      )
    )
  ])
}

function asyncComponentArraysErrorFixed() {
  window.s = s
  s.mount(() => s`div`(
    s(async() => {
      await s.sleep(1000)
      return () => [
        2,
        3,
        4,
        5,
        s(async() => {
          await s.sleep(1000)
          return () => [1, 2, 3]
        })
      ]
    }),
    s`h1`('nice'),
    s`button`({ onclick: () => {} }, 'hej')
  ))
}

function routingIssue() {
  const x = s(async({}, [], { route }) => () => route({
    '/': () => [
      s`a`({ href: route + 'some_id' }, 'some_id'),
      'main'
    ],
    '/:id': ({ id }) => s`a`({ href: route }, 'yo', id)
  }))

  s.mount(({}, [], { route }) => [
    s`a`({ href: '/' }, 'home'),
    s`a`({ href: '/test' }, 'test'),
    s``(
      route({
        '/': s(async() => () => 'home'),
        '/test': x
      })
    )
  ])
}

function reloadAsync() {
  let show = true
  s.mount(() =>
    s`main
       d grid
    `(
      s`button`({
        onclick: show = !show
      }, 'hej'),
      s(async({}, [], { reload }) => {
        await s.sleep(2000)

        return () => s``(
          'Yas',
          Date.now(),
          s``({
            onclick: () => reload(true)
          }, 'reload')
        )
      })
    )
  )
}

function testCSSParsing() {
  // @charset "utf-8" - cannot be inserted dynamically
  s.css`
    @import 'custom.css'

    @counter-style thumbs {
      system: cyclic
      symbols: "\\1F44D"
      suffix: " "
              }

    @keyframes fade {
      from { o 0 }
      to { o 1 }
    }

    @supports (display: grid) {
      div {
        display: grid
      }
      span {
        display: grid
      }
    }

    @media (max-width:500px) {
      div {
        bc gray
      }
    }

    * {
      animation fade 1s
    }
    ul {
      list-style: thumbs
    }

    @font-face {
      font-family Avenir
      font-weight normal
      src url("/fonts/e9167238-3b3f-4813-a04a-a384394eed42.eot?#iefix")
      src: url("/fonts/e9167238-3b3f-4813-a04a-a384394eed42.eot?#iefix") format("eot"),
          url("/fonts/2cd55546-ec00-4af9-aeca-4a3cd186da53.woff2") format("woff2"),
          url("/fonts/1e9892c0-6927-4412-9874-1b82801ba47a.woff") format("woff"),
          url("/fonts/46cf1067-688d-4aab-b0f7-bd942af6efd8.ttf") format("truetype")
    }

    @font-face {
      font-family Avenir
      font-weight 600
      src url("/fonts/1a7c9181-cd24-4943-a9d9-d033189524e0.eot?#iefix")
      src: url("/fonts/1a7c9181-cd24-4943-a9d9-d033189524e0.eot?#iefix") format("eot"),
          url("/fonts/627fbb5a-3bae-4cd9-b617-2f923e29d55e.woff2") format("woff2"),
          url("/fonts/f26faddb-86cc-4477-a253-1e1287684336.woff") format("woff"),
          url("/fonts/63a74598-733c-4d0c-bd91-b01bffcd6e69.ttf") format("truetype")
    }
  `

  s.mount(() =>
    s`div
      bc teal

      @media (max-width:700px) {
        ff impact

        div {
          bc blue
        }
      }

      @media screen {
        @media (min-width: 1px) {
          @media (min-height: 1px) {
            @media (max-width: 9999px) {
              @media (max-height: 9999px) {
                span {
                  fs 100
                }
              }
            }

            div {
              c white
            }
          }
        }
      }

      div {
        animation fade 2s
        bc yellow

        span {
          bc green
        }
      }
    `(
      1,
      s`span`('yo'),
      s`div`(
        2,
        s`span`('f')
      )
    )
  )
}

function dndLists() {
  const a = [...Array(10)].map((x, i) => ({ key: i + 1 }))
  const b = [...Array(10)].map((x, i) => ({ key: i + 11 }))
  const d = []

  const item = s((x) => () =>
    s`li
      w 200
      h 20
      bc steelblue
      br 5
      max-height 20
      overflow-y hidden
      transition all 0.3s
      animation 0.3s {
        from { o 0 max-height 0 }
      }
      [animate] {
        max-height 0
      }

      [removed] {
        opacity 0
      }
    `({
      dom: s.animate,
      draggable: true,
      removed: x.dragging,
      life: dom => {

      },
      ondragstart: e => {
        x.dragging = true
      },
      ondragend: e => {
        x.dragging = false
        a.splice(a.indexOf(x), 1)
      },
      ondragover: e => {
        e.preventDefault()
        p(x.key, e.clientY)
      },
      ondragenter: e => {
        e.target.style.marginTop = '20px'
      },
      ondragleave: e => {
        e.target.style.marginTop = '0px'
      },
      ondrop: (e) => {
      }
    }, x.key)
  )

  s.mount(() => [
    s`ul`(
      a.map(item)
    ),
    s`ul`(
      b.map(item)
    )
  ])
}

function keyIssue(fixed) {
  let wat = false
  const wats = []

  const x = s(() => (a, c) => [s`h1`({ dom: () => wats.push(c[0]) }, c[0])])

  s.mount(() => s`main`(
    s`button`({ onclick: () => wat = !wat }, 'toggle'),
    wat
      ? x({
        key: 'a'
      }, '1')
      : x({
        key: 'b'
      }, '2'),
    s`h2`('yas'),
    wats
  ))
}

function routeIssue(fixed) {
  const routers = []

  s.mount((a, c, { route }) => [
    route.id,
    s`button`({ onclick: () => p('redraw') }, 'redraw'),
    s`div`(routers.join(',')),
    s`a`({ href: 'a' }, 'a'),
    s`a`({ href: 'b' }, 'b'),
    s`a`({ href: 'c' }, 'c'),
    route({
      '/a': s((a, c, { route }) => [
        routers.push(route.id) && route.id,
        s`h1`('a'),
        s`a`({
          href: route + 'c'
        }, 'c'),
        s`a`({
          href: route + 'd'
        }, 'd'),
        route({
          '/c': () => s`h1`('c'),
          '/d': ({}, [], { route }) => s`h1`('d' + route.id)
        })
      ]),
      '/b': () => 'b',
      '/c': () => import('./wat.js')
    })
  ])
}

function asyncIssue() {
  const button = s(async({ count = 0 }) => ({}, [x]) =>
    s`button
      bc yellow
      p 12 20
      tt uppercase
      br 100
      border none
      animation 2s {
        from { o 0 }
      }
    `({
      onclick: () => count++
    },
      x.split('').reverse().join(''),
      s`strong
        fs 40
      `(count)
    )
  )

  s.mount(() => [
    button('Count'),
    button`
      bc gray

      :hover {
        bc blue
      }
      span {
        fw bold
        fs 60
      }
    `(
      'Count',
      s`span`('0')
    )
  ])
}

function hue() {
  const hue = s.live(200)

  s.mount(() => [
    s`input`({
      type: 'range',
      min: 0,
      max: 1,
      step: 0.0001,
      oninput: hue.set(e => e.target.value)
    }, 'red'),
    s`h1
      background hsl(${ hue.get(e => e * 255) }, 100%, 50%)
    `(
      Date.now(),
      'hej',
      hue
    ),
    s`h2`('wat')
  ])
}

function cssFun() {
  s.css`
    * {
      animation 5s {
        from { o 0 }
      }
    }
  `

  const bc = s(({ bc = '0' }, _, { route }) => {
    return () => [...Array(10)].map((x, i) =>
      s`a
        d grid
        pi center
        ff sans-serif
        w 300
        h 300
        m 80
        bc ${ bc }
        fs 100
      `({
        href: '/yellow'
      },
        s`nav
          fs 20
        `(
          ['one', 'two', 'three'].map(x =>
            s`a`({ href: route + i + '/' + x }, x)
          )
        ),
        route({
          ['/' + i + '/']: 0,
          ['/' + i + '/one']: 1,
          ['/' + i + '/two']: 2,
          ['/' + i + '/three']: 3,
          '*': 7
        })
      )
    )
  })

  s.mount(({}, [], { route }) => [
    s`nav`(
      ['/', '/red', '/blue', '/yellow'].map(x =>
        s`a
          d inline-block
          m 20
        `({ href: x }, x)
      )
    ),
    s`main`(
      route({
        '/': bc,
        '/:bc': bc
      })
    )
  ])
}

function liveTest() {
  const counter = s.live(1, p)

  s.mount(() => [
    s`button
      background ${ counter.if(5, 'blue', 'red') }
    `({
      onclick: counter.set(e => counter + 1)
    },
      'Increment', Date.now()
    ),
    counter
  ])
}

function nestedRouting() {
  const nested = s({
    loading: 'Loading'
  }, async({ id }, children, { route }) => {
    await s.sleep(500)
    const items = [
      ...Array(
        5 + Math.ceil(Math.random() * 5)
      ).keys()
    ]

    return () => s`
      d flex
    `(
      'wat',
      s`nav
        w 100
        mr 4m
      `(
        items.map(x =>
          s`a
            p 4
            c black
            display block
            [selected] {
              bc hsl(200, 100%, 50%)
              c white
            }
          `({
            selected: route.has(x),
            href: route + x
          }, x)
        )
      ),
      route({
        '/:id': nested
      })
    )
  })

  s.mount(({}, [], { route }) =>
    s`main
      ff sans-serif
    `(
      s`a
        d block
        p 8
      `({
        href: '/4/1/2/3/0/4/2'
      }, 'long test'),
      s`
        p 6 16
        br 20
        bc #eee
        mb 16
      `(
        route.path.split('/').join(' / ')
      ),
      nested({ route })
    )
  )
}

function modals() {
  const modals = []
  let show = false

  const modal = () =>
    show && s`.overlay
      position fixed
      d grid
      t 0
      l 0
      w 100%
      h 100%
      bc rgba(0,0,0,0.75)

      transition opacity 0.3s
      [animate] {
        o 0
      }

      [animate=exit] {
        pointer-events none
      }
    `({
      onclick: (e) => e.target === e.currentTarget && modal.close(),
      dom: s.animate
    },
      modals.map((modal, i) =>
        s`div
          position absolute
          w 300
          h 300
          p 20
          bc white
          as center
          js center
          br 8
          transform translateY(${ (modals.length - 1 - i) * -26 }) scale(${ 1 + -(modals.length - 1 - i) * 0.1 })
          zi ${ i }
          bs 0 2px 20px -5px black
          transition opacity 0.3s, transform 0.3s
          [animate] {
            opacity 0
            transform scale(1.5) translateY(80)
          }

          [animate=exit] {
            pointer-events none
          }

        `({
          key: i,
          dom: s.animate
        },
          modal.children
        )
      )
    )

  modal.show = (attrs, children) => {
    modals.push({ attrs, children })
    show = true
  }

  modal.close = () => {
    const current = modals.pop()
    current && current.attrs.onclose && current.attrs.onclose()
    if (modals.length === 0) {
      setTimeout(() => {
        show = modals.length > 0
        s.redraw()
      }, 100)
    }
  }

  // reroute doesn't happen on logi
  s.mount(() => [
    s`button`({
      onclick: () => modal.show({
        onclose: () => p('closed outer')
      }, () => [
        s`h1`('Hello'),

        s`button`({
          onclick: () => modal.show({
            onclose: () => p('closed inner')
          }, () => s`h1`('I am inner'))
        }, 'show more'),

        s`button`({
          onclick: modal.close
        }, 'close')

      ])
    }, 'show modal'),
    modal
  ])


  function testNestingMediaAndUnits() {
    let size = 20
    s.mount(() =>
      s`.hej
        transform rotateZ(20deg) scale(0.5) translateY(200px) skew(200deg)
        font-size ${ size }
        fg 1

        @media (max-width: 600) {
          border 10px solid black
          fg 1
        }

        button {
          bc blue

          @media (max-width: 500) {
            bc red

            span {
              bc green
            }
          }

          fs 2em
        }
      `({
        onclick: () => size++
      },
        s`button`('he', s`span`('nooo'))
      )
    )
  }
}

function udomdiffTest() {
  let xs = [
    'bcd',
    'bcd',
    'abcd',
    'dcba',
    'abcd',
    'abcdef',
    'abcghidef',
    'abcghide',
    'cghide',
    'cgde',
    '',
    'abcdef',
    'abgidef',
    'abcdef',
    'jgabcdefhi',
    'abcdef',
    'agcdhi',
    'igadhc',
    'chdagi',
    'dfg',
    'abcdfg',
    'abcdefg',
    'gfedcba',
    'fdbaeg',
    'abcdef',
    'abcdefhij',
    'abcdehfij',
    'abidehfcj',
    'abcdefhij',
    'abcdefghijk',
    'ghi',
    'abcd',
    'bcad',
    'abcde',
    'dabcf',
    'ade',
    'df',
    'bdck',
    'ckbd',
    '',
    'abcd',
    'abdec',
    'abc',
    'cab'
  ]

  xs = xs.concat(xs, xs, xs, xs, xs)

  let current = 0
  s.mount(() => [
    s`button
      w 30
      h 30
    `({ onclick: start }, ''),
    xs[current].split('').map(key => s`div`({ key, id: key }, key))
  ])

  function start() {
    current = 0
    console.time('udomdiff')
    s.redraw()
    requestAnimationFrame(run)
  }

  function run() {
    if (document.body.textContent !== xs[current]) {
      console.log('OH NO', current, xs[current], '!==', document.body.textContent)
      console.timeEnd('udomdiff')
      return
    }

    if (current + 1 === xs.length) {
      console.timeEnd('udomdiff')
      console.log('all good')
      return
    }

    current++
    s.redraw()
    requestAnimationFrame(run)
  }
}
