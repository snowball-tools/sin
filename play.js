import s from './index.js'

window.run = s.redraw

let fun = ['a0']
  , shit = ['b0']

const wat = () =>
  s`div`(
    s`button`({
      onclick: () => fun.push('a' + fun.length)
    }, 'fun+'),
    s`button`({
      onclick: () => (fun.pop())
    }, 'fun-'),
    s`button`({
      onclick: () => shit.push('b' + shit.length)
    }, 'shit+'),
    s`button`({
      onclick: () => (shit.pop())
    }, 'shit-'),
    fun.map(x => s`li`({  wat: x }, x)),
    s`section`(Date.now()),
    shit.map(x => s`li`({  wat: x }, x)),
    'lol'
  )

setTimeout(() =>
s.mount(wat)
, 3000)

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
