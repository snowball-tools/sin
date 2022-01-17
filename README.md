<img align="center" width="100%"
  alt="Finally a proper marriage of HTML, CSS & JS"
  src="sin.svg?sanitize=true"
/>

# Sin

## The "Sintax"

Sin relies heavily on tagged templates to strip aways as much visual clutter as possible while still being basic Javascript needing no compilation to run.

## The Components

All components in Sin are made to allow overriding styles of the first returned element. The beauty of the Sin component model is that you will never have to change your callsite usage if you need to advance your component complexity.

## The Styled Component ```s`` ```

## The Stateless Component `s(fn)`

## The Stateful Component `s(fn => fn)`

## The Async Component `s(init, error, loading)`

## Routing `s.route`

Sin includes the most `get out of your way` router possible. There is always a scoped router available in context which let's you implement routing (as nested as you like) — not being concerned about the mount point. Using `href` is highly encouraged and the default way of telling Sin to route away. Every sin `route` instance even has a sweet .toString method, so you can simply do `href: route + 'sub-page'`. You can also use `route.has()` if you want to highlight which route is active, and if that's too boring Sin sets an `[active]` attribute for you to use for styling.

Ok, enough talk - here's an example

```js
const a = s((attrs, [path, title], { route }) => s`a
  bc ${ route.has(path) && 'blue' }
`({
  ...attrs,
  href: path
}, title))

s.mount(({ route }) => [
  s`nav`(
    a('/', 'Home'),
    a('/murray', 'Murray'),
    a('/lysander', 'Lysander'),
    a('/profile', 'Profile'),
  ),
  s`main`(
    route({
      '/': () => 'Welcome to the world',
      '/:user': ({ user }) => 'You are checking out ' + user,
      '/profile': () => 'The glory of you'
    })
  )
])
```

## The Helpers

### Media queries

### CSS units

### CSS property shorthands

### 

## Web3

Sin was born to be Web3! It even has a pyramid shaped logo, so it'll fit right in!
