![Sin](https://sinjs.com/sin.svg)

- 🔥 Full Stack Web Framework
- 💍 HTML, CSS & JS in a sinful threesome
- 🧐 SPA, MPA, SSR, SSG, CLI, ACME, WAT
- 👩‍💻 Best DX in town (sub eye blink hot reload)
- 🏎️ Lean and Fast (Only 2 dependencies) 12kbish
- 🐦 Follow on [Twitter](https://twitter.com/rporsager)

# 🔥 Sìn.js - Your only dependency!

```js



// Flems gif with nice code sample



```

# 4-5 line missions statement
Sin started out as a simple view library in the spirit of Mithril.js, but is now much more than that.
If you understand html, css and javascript you will understand sin. You're not learning some custom abstraction that is out of style in a year or two (jsx, tailwind)

# Getting Started

#### Global install


```bash
npm install -g sin
```

#### Just import and go!
```js
import sin from 'https://sinjs.com'
```

### Local development
```bash
npx sin create
```

Or if you have installed Sin globally
```bash
sin create
```

#### Good old fashioned non module script
```js
<script src="https://sinjs.com"></script>
<script>s.mount(() => s`h1`('Hello Sinners'))</script>
```

# Table of Contents

* [Syntax](#syntax)
  - [Tagged Template Literals](#tagged-template-literals)
  - [Functions](#functions)
  - [Closures](#closures)
  - [JavaScript (The Good Parts)](#javascript-the-good-parts)
* [CSS](#css)
  - [Lean](#lean)
  - [Shorthands](#shorthands)
  - [Variables](#variables)
  - [Reset](#reset)
  - [Animations](#animations)
* [Events](#events)
  - [Onclick](#onclick)
  - [s.on](#son)
  - [DOM Lifecycle](#dom-lifecycle)
  - [s.animate](#sanimate)
* [Components](#components)
  - [Styled](#styled)
  - [Stateless](#stateless)
  - [Stateful](#stateful)
  - [Async](#async)
  - [Context](#context)
  - [Lifecycle](#component-lifecycle)
* [Routing](#routing)
  - [context.route](#contextroute)
  - [Href](#href)
  - [Recursive Nested Context](#recursive-nested-context)
  - [Lazy (Code Splitting)](#lazy-code-splitting)
  - [Query Route.query](#query-routequery)
* [Project Structure](#project-structure)
  - [Index.js](#indexjs)
  - [+Index.js](#indexjs-1)
  - [export default s.mount (SSR)](#export-default-smount-ssr)
  - [export default function(app) (Server Routing)](#export-default-functionapp-server-routing)
  - [+Build](#build)
  - [+Public](#public)
* [HTTP](#http)
  - [s.http](#shttp)
  - [s.http[Method]](#shttpmethod)
* [CLI](#cli)
  - [Create](#create)
  - [Dev](#dev)
    - [--Live](#live)
  - [Start](#start)
  - [Build](#build-1)
  - [Generate](#generate)
  - [Install (Private Registry Proxy)](#install-private-registry-proxy)
  - [Acme](#acme)
  - [Version](#version)
  - [Building](#building)
* [TEST](#test)
  - [CLI Test](#cli-test)
  - [Sin/Test](#sintest)

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

The Stateless component accepts an object for attributes and an array of children
```js
// Definition
const statelessWonderButton = s(({ onclick, ...attrs }, children) =>
  wonderButton({
    ...attrs,
    onclick: e => {
      alert('I was clicked')
      onclick(e)
    }
  },
    children
  )
)

// Usage
statelessWonderButton({
  onclick: () => alert('Are you really using alert? Yuck!')
},
  'My wonderful button!'
)
```

## The Stateful Component `s(() => () => ...)`

The Stateful Component retains its state across redraws.
```js
// Definition
const wonderStateButton = s(() => {
  let count = 0
  return () => wonderButton({
  onclick: () => count++
  },
  `My wonderful button was clicked ${count} time${0 == count || count > 1 ? "'s" : "" }!`
  )
})

// Usage
s.mount(() => WonderStateButton)
```
The Async Component accepts an object that can handle the loading and error states.
## The Async Component `s(async() => () => ...)`
```js
// Definition
const wonderAsyncButton = s(
  {loading: wonderButton('Fetching Data...'), error: e => wonderButton(`oh oh there was an error: ${e}`)},
  async () => {
    let users = []
    users = await s.sleep(3000).then(_ => s.http('https://jsonplaceholder.typicode.com/users'))
    return async ()=>  wonderButton('Data Fetched Successfully'
  )
})

// Usage
s.mount(() => wonderAsyncButton)
```

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

### HTML Elements, Id's & Classes

Sin defaults to creating div elements if an HTML element type is not specified.

```js
s``('I am a div!'),
s`div`('I am also a div!')
```

Add Id's `#` and Classes `.` right after the element type or at the start of the tagged template literal.

```js
s`button#wonderButton`('I have an ID of wi)
```


CSS styles start at the first white space or newline after HTML element type, id's and classes.

```js
s`span font-size: 16px; text-decoration: underline; color: pink;`(),
s`span
  font-size: 16px;
  text-decoration: underline;
  color: pink;
`()
```

### Lean CSS

`:` and `;` are optional for single line definitions. No more bloated syntax.

```js
s`span
  font-size 16px
  text-decoration underline
  color pink
`()
```

Important note: It's not possible to mix shorthand and standard styling conventions : and ; you will lose the lean sintax (shorthand, implict unit)
```diff
+  font-size 16
+  fs 16
+  font-size: 16;
-  fs: 16;
-  font-size: 16
-  font-size 16;
```

### CSS units

Sin will automatically add px as a unit if left out unless the relevant css property takes a unitless value.

```js
s`span
  font-size 16
  text-decoration underline
  color pink
`()
```

### CSS variables

Convenient way to access your css variables
```css
s.css`
:root {
  $red tomato
 }
 `
 ```
 ```js
 s`
   $pink hotpink
 `(

   s`button
     bc $red
     c $pink
   `('red')
 )
 ```

### CSS property shorthands

The most popular CSS properties can be references by its initials.
A few popular properties have overlapping initials, Sin choose to support the most commonly used.

<details>
<summary>See list of abbreviations</summary>
| abbreviation | keyword |
| ----- | ----- |
| ai | align-items |
| b | bottom |
| bc | background-color |
| br | border-radius |
| bs | box-shadow |
| bi | background-image |
| c | color |
| d | display |
| fg | flex-grow |
| fb | flex-basis |
| f | float |
| fd | flex-direction |
| ff | font-family |
| fs | font-size |
| fw | font-weight |
| g | gap |
| ga | grid-area |
| gg | grid-gap |
| gta | grid-template-areas |
| gtc | grid-template-columns |
| gtr | grid-template-rows |
| h | height |
| jc | justify-content |
| l | left |
| lh | line-height |
| ls | letter-spacing |
| m | margin |
| mb | margin-bottom |
| ml | margin-left |
| mr | margin-right |
| mt | margin-top |
| o | opacity |
| p | padding |
| pb | padding-bottom |
| pl | padding-left |
| pr | padding-right |
| pt | padding-top |
| pi | place-items |
| pe | pointer-events |
| r | right |
| t | top |
| ta | text-align |
| td | text-decoration |
| tt | text-transform |
| ts | text-shadow |
| us | user-select |
| ws | white-space |
| w | width |
| zi | z-index |
</details>

### CSS reset
To reduce browser inconsistencies you can use Sin's opinionated css reset style rules when writing your global CSS, by adding `.reset` to `s.css`.

```js
s.css.reset`
  your global css here
`
```

<details>
  <summary>The CSS reset includes:</summary>

  ```css
  *, *::before, *::after {
    box-sizing border-box
  }

  input, button, textarea, select {
    font inherit
    text-transform none
  }

  * {
    margin 0
    padding 0
    overflow-wrap break-word
    hyphens auto
  }

  body {
    font-family system-ui, sans-serif
  }

  p {
    line-height 1.5
  }

  img, svg, video, canvas, audio, iframe, embed, object {
    display block
    va middle
  }

  img, video {
    max-width 100%
    height auto
  }

  ol, ul, li {
    list-style none
  }

  body {
    min-height 100svh
  }

  body {
    -webkit-font-smoothing antialiased
    text-rendering optimizeLegibility
  }
  ```
</details>


### @ Media queries

You can define alias for media and later use them in your CSS

```css
s.css.alias({
  mobile: '@media (max-width: 767.98px)',
  tablet: '@media (max-width: 1200px)',
  desktop: '@media (min-width: 1500px)',
  ios: '@supports (-webkit-touch-callout: none)'
})

s`
  @mobile { display none }
`('Not visible on mobile devices...')

```




## Syntax

### Tagged Template Literals

Content here.

### Functions

Content here.

### Closures

Content here.

### JavaScript (The Good Parts)

Content here.

## CSS

### Lean

Content here.

### Shorthands

Content here.

### Variables

Content here.

### Reset

Content here.

### Animations

Content here.



## Events

### Onclick

Event handlers provide the event object and the current dom object as parameters

```js
s``(
  {
    onclick: (e, dom) => { }
  }
)
```

### s.on

Content here.

### DOM Lifecycle

Content here.

### s.animate

```js
  s``(
    [animate=entry] {
      opacity 1
    }

    [animate=exit] {
      opacity 0
    }
`({
  dom: s.animate
})

```


## Components

### Styled

Content here.

### Stateless

Content here.

### Stateful

Content here.

### Async

Content here.

### Not shure where to put this --- utils?

Trust to render html string

```js
  s.trust('<svg ....>')

```

Adding properties to the document

```js
s.mount(({}, [], { doc }) => {
  doc.title('My page title')
  doc.lang('da')
  doc.head([
    s`link`({ rel: 'icon', href: '/favicon.ico', sizes: 'any' }),
    s`meta`({ name: 'apple-mobile-web-app-capable', content: 'yes' })
  ])
})
```

## Component Lifecycle

## Reload

## Refresh

## Redraw

## Ignore

## onremove


## Routing

### Context.route

Content here.

### Href

Content here.

### Recursive Nested Context

Content here.

### Lazy (Code Splitting)

Content here.

### Query Route.query

Content here.



## Project Structure

### Index.js

Content here.

### +Index.js

Content here.

### Export Default S.mount (SSR)

Content here.

### Export Default Function(App) (Server Routing)

Content here.

### +Build

Content here.

### +Public

Content here.



## HTTP

### S.http

```js
const x = await s.http(<url>)
```

### S.http[Method]


post
```js
s.http.post(<url>, { body: { content } })
```

put/file upload
```js
const status = { loaded: 0, total: 0 }
const x = (await s.http.put(<url>, {
  body: file,
  responseType: 'text',
  config: xhr => xhr.upload.addEventListener('progress', e => {
    status.loaded = e.loaded
    status.total = e.total
    s.redraw()
  })
}).xhr).getResponseHeader('ETag').slice(1, -1)
```

## CLI

The Sin CLI uses features introduced in node.js version 20.10, so you need to use this environment for development. This is also required for production when using the built-in sin runtime.

### Create

Content here.

### Dev

#### --Live


```js

const wat = s.live(1)

wat.observe(x => {
  console.log('value updated:', x)
})

s.mount(() => s``(
  s`button`(
    {
      onclick: () => wat(wat() + 1)
    },
    'update wat'
  )
))

```


```js
 let dog = s.live((localStorage.getItem('dog') || 'greyhound'))

 dog.observe(x => {
    localStorage.setItem('dog', x)
 })

 s.mount(() => s``(
   s`select`(
     {
       onchange: (x) => dog(x)
     },
     'chihuahua,bulldog,greyhound'.split(',').map(d =>
       s`option`(
         {
           selected: d == dog()
         },
         d
       )
     )
   )
 ))
```

### Start

Content here.

### Build

Content here.

### Generate

Content here.

### Install (Private Registry Proxy)

Content here.

### Acme

Content here.

### Version

Content here.

### Building

Content here.



## TEST

### CLI Test

Content here.

### Sin/Test

Content here.
