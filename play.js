import s from './index.js'

window.run = s.redraw

// reroute doesn't happen on logi

let key = 1
const c = s(() => {
  p('init')
  return (_, c) => c
})

s.mount(({ route }) =>
  s(async() => {
    route.title('Beat')

    return () => c({ key }, 'hsjaa' + key)
  })()
)

setTimeout(() => {
  key = 2
  s.redraw()
}, 1000)



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
    s`button`({ onclick: start }),
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
