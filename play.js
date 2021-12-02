import s from './src/index.js'

window.run = s.redraw

s.mount(() => [
  s`button`({
    onclick: () => p('redraw')
  },
    Date.now()
  ),
  s((attrs, children, { reload, ignore, redraw }) => {
    ignore(true)
    const x = Date.now()
    return () => s`button`({
      onclick: e => {
        redraw()
        e.redraw = false
      }
    }, x + ' - ' + Date.now())
  })
])




















function nestedRouting() {
  const nested = s(async({ id }, children, { route }) => {
    await new Promise(r => setTimeout(r, 500))
    const items = [
      ...Array(
        5 + Math.ceil(Math.random() * 5)
      ).keys()
    ]

    return () => s`
      d flex
    `(
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
  }, 'Loading')

  s.mount(({ route }) =>
    s`main
      ff sans-serif
    `(
      s`a
        d block
        p 8
      `({
        href: '/4/1//2/3/0/4/2'
      }, 'long test'),
      s`
        p 6 16
        br 20
        bc #eee
        mb 16
      `(
        location.pathname.split('/').join(' / ')
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
    s`button`({ onclick: start }, ''),
    xs[current].split('').map(key => s`div`({ key, id: key }, key))
  ])

  function start() {
    current = 0
    console.time('udomdiff')
    const timer = setInterval(() => {
      if (document.body.textContent !== xs[current]) {
        p('OH NO', current, xs[current], '!==', document.body.textContent)
        clearInterval(timer)
        return
      }

      if (current + 1 === xs.length) {
        console.timeEnd('udomdiff')
        console.log('all good')
        return clearInterval(timer)
      }

      current++
      s.redraw()
    }, 0)
  }
}
