import s from './index.js'

window.run = s.redraw

s.css`
  @keyframes fade {
    from {
      o 0
    }
  }

  * {
    animation 1s fade
  }
`

const counter = s(({ count = 3 }) => () =>
  s`button`({
    key: count,
    onclick: () => count++
  }, count)
)

const wat = s(() => counter({ ke: 'counter' }))

const waiter = s(() => {
  return ({ sub }) => [s`h1`({ ke: 'h1' }, 'hej'), sub
    ? waiter({ ke: 'waiter' })
    : wat({ ke: 'wat' })]
})

s.mount(() => waiter({ sub: true }))
