const log = [{
  timestamp: ,
  url: ,
  logs: []
}, {

}]

function log(x) {
  log[0].logs.unshift(x)
  cut(log[0].logs, 1024)
}

function cut(xs, max) {
  xs.length > xs.splice(max)
}

function navigated(url) {
  log.unshift({
    timestamp: Date.now(),
    url,
    logs: []
  })
  log.length > 20 && log.pop()
  log.forEach((x, i) => cut(x, Math.min(64, 2 ** (10 - i)))
}

## Todo
- allow direct views to route (`route({ '/' : s`...`(...) })`)
- dialogs for installing packages
- connect to all tabs (devtools)
- p.alert (opens log window)
- p.watch (tracks variable value)
- regression href: null sets attribute
- readd implicit create if `sin dev` in empty dir
- remove undefined behvior for s.with
- allow variadic args to s.with with last being fn
- how about bubbling errors?
- ensure we resolve symbolic links when watching to prevent dual watch
- add commit id to version
- deferrable shorter removal children are not removed first (deferrableBug)
- check responseText: 'text' on ssr
- Connect to all chrome tabs
- debug bar (thin line at top - show hmr, errors etc)
- perhaps add --watch-modules to include node_modules
- Should the topmost route.parent always = '/' ?
- Local redraw on async component resolve
- add route.previous that points to previous pathname
- improve ${ dom => ... } in css with ssr
- handle # anchor hrefs correctly
- ssr should also handle query params
- fix bug in async components returning arrays (route especially)

## Thoughts
- route.key ?
- make route(path) relative
- allow extend with route()`...`(...)
- Ronald sin decorators
- Should local redraw be raf throttled too?
- should s.http only parse json if response header content-type ~= '/json'?
- rename s.signal to s.event?
- Could we remove the min Width/Height for scroll restoration after async component completion? (if new drawing is by a child)
- do optimistic component reloads (cache view results) on navigation
- live.from could simply be an overload of live(...)
- Filter library internal lines in stack traces (perhaps devtools blackboxing)
- Check anchor handling (#wee scroll etc)
- document.querySelector(location.hash).scrollIntoView() on load ? (no need if ssr)
- streaming ssr by waiting for first context.head() call
- Document Cleanup of life if component changes but dom node stays the same (only issue w non keyed)
- document required d:(d colon) for `d` usage in svg to prevent display shorthand
- [s.key]:, [s.dom]:, [s.reload]:
- improvement for nested css (make separate classes that are toggled instead of uncached css)
- traverse nonKeyed in reverse too
- support css block comments (becomes hard if mixed into values)
- support // comments in css (---||---)
- iframe island - https://flems.io/#0=N4IgtglgJlA2CmIBcBWA7AOgEwGYA0IAZhAgM7IDaoAdgIZiJIgYAWALmLCAQMYD21NvEHIQIAL54a9RswBW5XgKEimpDFHgAjAK4BzAAQBeA2wBOO+AB1q-aqTYGIhMzOMHSACk-ADdlY7iAJTGAHwGwDYGBmbwbDpm1AaeIUbhpAAGzq4MUdEGWnxmmmYG1ALWSQYZPnnRsM7wSAZQfGBhEXX5XdGkcQAqEAx8OmzeqeGRVfn5dg4ebACeCO6tPDoMghh6cQCiCJtspABCi-20egByMp4A5ADK-QCaADK7t0EUAIwAuhg8sAqlz4mk85ksQR6+QADp5WmB-sphGwAOoQaitADuGj460OrHgtCgGFo0OhwigAGEWCQoJ4HMt4EFIdN8pIDAAGFkzaLwxGCZFojF8bFrDbIjCFKCLDAMhAYMC0Mx6dHuDlQ9RgEaCOFtfkBIVYnF4iVSxZ4PxIwTcnmxeKJZITTqsmbqLSkdRy+DqWJagBu8HpSwQNp5HgV2rGfP8gvRRrF+LNFuoOlgsFDbK64jywRsueoNgQjn4OkEapsmsj4w62RkGTyWh4MXgUBsNSm0RjgmaKQ6mRYXy6jYKsEseXbXQEAIgPAA1j2nSXBABqZc5i23FjwOS3AzLy2ltgs4JBbggfhgaEkeBmURaWhaeBcAh9BA8NgQATkJhfAAcSAAFgkKQQDoBhRH+D0zy7NhRAkH4CAaahZ2-KhQJkURSHRAABR82FoM8Ei4Jh2DYaFSCQAB6SjS2hWc9ERMBKKw6hsK+DAOQ4gBaMweAwABOSitDMEU+jMZj0QwDZiQUM8lnJTCeDMCBoVgl8n3gd9P3sUQ-wANjQJAviwLj9MMr5+PgggwNkWsGAMWhSA8CAAC94EtQRaHRG8JCAA
