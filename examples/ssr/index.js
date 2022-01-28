import s from '../../src/index.js'

export default s.mount(({ route }) => [
  s`div`(
    'hej', wat, 'patrick'
  )
])


/*
console.time('w')
html(
  s`h1`(
    s(async() => {
      await new Promise(r => setTimeout(r, 3000))
      return () => s`h2`('woo')
    }),
    s`button`({class:'wat'}, ['hej', s`input`, 'dig']),
      s`;bc white;br 0.5rem;p 1.5rem;@md{d flex}`(
      s`img;h 4rem;w 4rem;br 100%;m auto;@md{w 6rem;h 6rem;m 0;mr 1.5rem}`({
        src:'https://randomuser.me/api/portraits/women/17.jpg'
      }),
      s`div;ta center;@md{ta left}`(
        s`h2;fs 1.125rem`('Erin Lindford'),
        s`;c var(--purple500)`('Customer Support'),
        s`;c var(--gray600)`('erinlindford@example.com'),
        s`;c var(--gray600)`('(555) 765-4321')
      )
    ),
    false,
    'wat',
    'that',
    [
      s`h1`, s`h2`, s`h3`
    ],
    'what',
    s`button`
  )
).then(x => {
  console.timeEnd('w')
  p(x)
})

*/
