<img align="center" width="100%"
  alt="Finally a proper marriage of HTML, CSS & JS"
  src="sin.svg?sanitize=true"
/>

# 🔥 sìn

Sin merges HTML, CSS & Javascript to form a highly composable framework that'll cheer you up and never get in your way.

## The "Sintax"

```js
s`[tagName][#id][...classNames]
  [...styles]
`(
  [attributes],
  [...children]
)
```

Sin relies heavily on tagged templates to strip aways as much visual clutter as possible while still being basic Javascript needing no compilation to run. No more XMLy syntax and css is relieved from its colons and semicolons (if you want to). The most used css properties are even available by their initials as shorthands. If you feel like skipping units, like px or deg Sin will also happily add these for you.

## The Components

All components in Sin are made to allow overriding styles anywhere they're used. The beauty of the Sin component model is that you will never have to change your callsite usage, even if you need to advance the complexity of your component.

## The Styled Component ```s`` ```

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

## Routing `s.route`

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

sin create

sin development

sin production

sin build

sin generate
