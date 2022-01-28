import s from '../../src/index.js'

const nested = s(async({}, [], { route }) => {
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
}, null, 'Loading')

export default s.mount(({}, [], { route }) =>
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
      route.path.split('/').join(' / ')
    ),
    nested({ route })
  )
)

