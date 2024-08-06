import s from 'sin'
import t from './test'

const $ = window.document.querySelector.bind(window.document)

function xStyle() {
  return window.getComputedStyle(xDom())
}

function xDom() {
  return window.x
}

t`CSS`(

  t`Variables`(

    t`Defining`(() => {
      let dom
      s.mount(() => s`#x
        --a 1
        $b 2
        --1 3
        $2 4
      `({
        dom: x => dom = x
      }))
      return ['1234',
        xStyle().getPropertyValue('--a') +
        xStyle().getPropertyValue('--b') +
        xStyle().getPropertyValue('--1') +
        xStyle().getPropertyValue('--2')
      ]
    }),

    t`Using`(() => {
      s.mount(() => s`#x
        --a 1
        $b 2
        --1 3
        $2 4
        --a1 5
        $a2 6
        --1a 7
        $2a 8
        w calc((var(--a) + $a + var(--b) + $b + var(--1) + $1 + var(--2) + $2 + var(--a1) + $a1 + var(--a2) + $a2 + var(--1a) + $1a + var(--2a) + $2a) * 1px)
      `({}))
      return ['72px', xStyle().width]
    }),

    t`Color /opacity`(() => {
      s.mount(() => s`#x $blue oklab(.5 .5 .5);c $blue/.3`)
      return ['oklab(0.5 0.5 0.5 / 0.3)', xStyle().color]
    }),

    t`Color /opacity %`(() => {
      s.mount(() => s`#x $blue oklab(.5 .5 .5);c $blue/30%`)
      return ['oklab(0.5 0.5 0.5 / 0.3)', xStyle().color]
    }),

    t`Dynamic Color /opacity`(() => {
      s.mount(() => s`#x $blue oklab(.5 .5 .5);c $blue/${ .3 }`)
      return ['oklab(0.5 0.5 0.5 / 0.3)', xStyle().color]
    }),

    t`Dynamic Color /opacity %`(() => {
      s.mount(() => s`#x $blue oklab(.5 .5 .5);c $blue/${ '30%' }`)
      return ['oklab(0.5 0.5 0.5 / 0.3)', xStyle().color]
    }),

    t`Multiple Dynamic Color /opacity`(() => {
      s.css`:root{$blue blue}`
      s.mount(() => [
        s`h1`('Quick color demo'),
        [1, 2, 3, 4].map(x =>
          s`
            bc $blue/${ 1 / x }`('yolo')
        )
      ])
      return [1, 1]
    })

  ),

  t`Shorthands`(

    t`$() for calc()`(() => {
      s.mount(() => s`#x
        bc blue
        w $(3 * 4px)
      `())
      return ['12px', xStyle().width]
    }),

    t`$() for calc() with parameter`(() => {
      s.mount(() => s`#x
        bc blue
        w $(${ 3 } * 4px)
      `())
      return ['12px', xStyle().width]
    }),

    t`/ in calc()`(() => {
      s.mount(() => s`#x
        bc blue
        w $(200px / 2)
      `())
      return ['100px', xStyle().width]
    }),

    t`dynamic custom units with / in calc()`(() => {
      s.css.unit('n', x => x * 10 + 'px')
      s.mount(() => s`#x
        bc blue
        w $(${ '20n' } / 2)
      `())
      return ['100px', xStyle().width]
    }),

    t`Nested @keyframes`(() => {
      s.mount(() =>
        s`
          p {
            animation 1s infinite {
              from { transform rotate(360) }
            }
          }
        `(
          s`p#x`('animating')
        )
      )
      return [1, xDom().getAnimations().length]
    })

  ),

  t`Scoping with &`(() => {
    s.mount(() =>
      s`#x.bar
        &.first, &.bar { c rgb(1 1 1) }
      `('red')
    )
    return ['rgb(1, 1, 1)', xStyle().color]
  }),

  t`Custom units`(
    s`Simple`(() => {
      s.css.unit('n', x => x * 4 + 'px')
      s.mount(() => s`#x w 4n`)
      return ['16px', xStyle().width]
    }),

    t`Dynamic`(() => {
      s.css.unit('n', x => x * 10 + 'px')
      s.mount(() => s`#x w ${ '4n' }`)
      return ['40px', xStyle().width]
    }),

    t`Dynamic Multiple`(() => {
      s.css.unit('n', x => x * 10 + 'px')
      s.mount(() => s`#x $b blue;c $b/0.5;h ${ '4n' }`)
      return ['40px', xStyle().height]
    }),

    t`In calc()`(() => {
      s.css.unit('n', x => x * 10 + 'px')
      s.mount(() => s`#x w $(4 * 4n)`)
      return ['160px', xStyle().width]
    })
  )

)

t`Rendering`(

  t`Mounts and makes correct element tag`(() => {
    s.mount(() => s`h1`)
    return [
      'H1',
      document.body.firstChild.tagName
    ]
  }),

  t`No unnecesarry attrs`(() => {
    s.mount(() => s``('Hello'))
    return [
      '',
      $('body>*').getAttributeNames().join(',')
    ]
  }),

  t`Has correct child content`(() => {
    s.mount(() => s``('Hello'))
    return [
      'Hello',
      document.body.firstChild.textContent
    ]
  }),

  t`Sets attributes`(() => {
    s.mount(() => s`h1`({ title: 'Hello' }))
    return [
      'Hello',
      document.body.firstChild.title
    ]
  }),

  t`Keyed diffing changes correctly`(() => {
    const xs = [
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
      'cab',
      'bcd'
    ]

    let i = 0
    s.mount(() => s`#x`(
      xs[i].split('').map(key => s`div`({ key, id: key }, key))
    ))

    for (; i < xs.length; i++) {
      s.redraw.force()
      if (xs[i] !== xDom().textContent)
        return [xs[i], xDom().textContent]
    }

    return [1, 1]
  })

)

t`Components`(

  t`onremove`(() => {
    let called
      , show = true

    s.mount(() => [
      show && s(({}, [], { onremove }) => {
        onremove(() => called = true)
        return () => s``('Hej')
      })
    ])

    show = false
    s.redraw.force()

    return [
      true,
      called
    ]
  }),

  t`onremove nested`(() => {
    let called
      , show = true

    s.mount(() => [
      show && s``(
        s(({}, [], { onremove }) => {
          onremove(() => called = true)
          return () => s``('Hej')
        })
      )
    ])

    show = false
    s.redraw.force()

    return [
      true,
      called
    ]
  }),

  t`onremove with no children`(() => {
    let called
      , show = true

    s.mount(() => [
      show && s(({}, [], { onremove }) => {
        onremove(() => called = true)
        return () => false
      })
    ])

    show = false
    s.redraw.force()

    return [
      true,
      called
    ]
  }),

  t`onremove nested with no children`(() => {
    let called
      , show = true

    s.mount(() => [
      show && s``(
        s(({}, [], { onremove }) => {
          onremove(() => called = true)
          return () => []
        })
      )
    ])

    show = false
    s.redraw.force()

    return [
      true,
      called
    ]
  })
)
