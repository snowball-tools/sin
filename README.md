<img align="center" width="100%"
  alt="Finally a proper marriage of HTML, CSS & JS"
  src="sin.svg?sanitize=true"
/>

# Sin

## The Syntax

Sin relies heavily on tagged templates to strip aways as much visual clutter as possible while still being basic Javascript needing no compilation to run.

## The Components

All components in Sin are made to allow overriding styles of the first returned element. The beauty of the Sin component model is that you will never have to change your callsite usage if you need to advance your component complexity.

## The Styled Component ```s`` ```



## The Stateless Component `s(fn)`

## The Stateful Component `s(fn => fn)`

## The Async Component `s(async fn => fn)`

## Routing `s.route`

Sin includes the most `get out of your way` router possible. There is always a scoped router available in context, and a root router at `s.route`. and once you get into nested routing territory there's a scoped router available for you in context. Using `href` is highly encouraged and the default way of telling Sin to route away. Every sin `route` instance even has a sweet .toString method, so you can simple do `href: route + 'sub-page'` and forget about your nested worries. You can also use `route.has()` if you want to highlight which route is active, and if that's too boring we'll set an attribute `[active]` for you to use for styling.

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
      '/': 'Welcome to the world',
      '/:user': ({ user }) => 'You are checking out ' + user,
      '/profile': 'The glory of you'
    })
  )
])
```
