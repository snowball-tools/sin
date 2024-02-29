<![Sin](https://sinjs.com/sin.svg)

- 🔥 Full Stack Web Framework
- 💍 HTML, CSS & JS in a sinful threesome
- 🧐 SPA, MPA, SSR, SSG, CLI, ACME, WAT
- 👩‍💻 Best DX in town (sub eye blink Hot reload)
- 💨 Lean and Fast (Only 2 dependencies) 12kbish
- 🐦 Follow on [Twitter](https://twitter.com/rporsager)

# 🔥 Sìn.js - Your only dependency!

```js



// Flems gif with nice code sample



```

# 4-5 line missions statement
Sin started out as a simple view library in the spirit of Mithril.js, but is now much more than that.
If you understand html, css and javascript you will understand sin. You're not learning some custom abstraction that is out of style in a year or two (jsx, tailwind)

# Getting Started

#### Just import and go!
```js
import sin from 'https://sinjs.com'
```

### Local development
```bash
npx sin create
```

#### Good old fashioned non module script
```js
<script src="https://sinjs.com"></script>
<script>s.mount(() => s`h1`('Hello Sinners'))</script>
```

# Table of Contents

* [Sintax](#sintax)
  - tagged template literals
  - functions
  - closures
  - javascript (the good parts)!
* [CSS](#css)
  - lean
  - shorthands
  - variables
  - reset
  - animations
* [Events](#events)
  - onclick
  - s.on
  - dom lifecycle
  - s.animate
* [Components](#components)
  - styled
  - stateless
  - stateful
  - async
* [Routing](#routing)
  - context.route
  - href
  - Recursive nested context
  - Lazy /yo: () => import('./yo.js') - code splitting
  - Query route.query
* [Structure](#structure)
  - index.js
  - +/index.js
  - export default s.mount // ssr
  - export default function(app) // server routing
  - +build
  - +public
* [HTTP](#http)
  - s.http
  - s.http.get
  - ...
* [CLI](#cli)
  - dev
  - prod
  - --live
  - building

## Components

All components in Sin are made to allow overriding styles anywhere they're used. The beauty of the Sin component model is that you will never have to change your callsite usage, even if you need to advance the complexity of your component.

## The Styled Component

#### ```s`` ```

The styled component is the most basic form of component in Sin. It has no logic, but only defines the tag name and styles.
```js
// Definition
const wonderButton = s`button
  background hotpink
`

// Usage
wonderButton({
  onclick: () => alert('Are you really using alert? Hell yeah!')
},
  'My wonderful button!'
)

```


## The Stateless Component `s(() => ...)`
```js
// Definition
const wonderButton = s(({ onclick, ...attrs }, children) =>
  s`button
    background hotpink
  `({
    ...attrs,
    onclick: e => {
      alert('I was clicked')
      onclick(e)
    }
  }
    children
  )
)

// Usage
wonderButton({
  onclick: () => alert('Are you really using alert? Yuck!')
},
  'My wonderful button!'
)
```

## The Stateful Component `s(() => () => ...)`

## The Async Component `s(async() => () => ...)`

# Routing

### `s.route`

Sin includes the most `get out of your way` router possible. There is always a scoped router available in context which let's you implement routing (as nested as you like) — not being concerned about the mount point. Using `href` is highly encouraged and the default way of telling Sin to route away. Every sin `route` instance even has a sweet .toString method, so you can simply do `href: route + 'sub-page'`. You can also use `route.has()` if you want to highlight which route is active, and if that's too boring Sin sets an `[active]` attribute for you to use for styling.

Ok, enough talk - here's an example

```js
s.mount(({ route }) => [
  s`nav`(
    ['/', '/murray', '/lysander', '/profile'].map(x =>
      s`a
        background ${ route.has(path) && 'lightblue' }
      `({
        href: '/' + x
      },
        x.slice(1) || 'Home'
      )
    )
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

## Simplifying and improving common tasks

### Lean CSS

`:` and `;` are optional for single line definitions. No more bloated syntax.

### CSS units

Sin will automatically add px as a units if left out unless the relevant css property takes a unitless value.

### CSS property shorthands

The most popular CSS properties can be references by its initials. A few popular properties have overlapping initials, so the most used one

### @ Media queries


###

## The CLI

### Minimum node version

The Sin CLI uses features introduced in node.js version 20, so you need to use this environment for development. This is also required for production when using the built-in sin runtime.

### sin create

### sin develop

### sin production

### sin build

### sin generate
