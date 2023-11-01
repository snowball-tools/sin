import window from './window.js'
import { isFunction, cleanSlash, scrollRestore } from './shared.js'

let routing = false

const routeState = {}

function tokenizePath(x) {
  return x.split(/(?=\/)/)
}

function params(path, xs) {
  return path.reduce((acc, x, i) => {
    x[1] === ':' && (acc[x.slice(2)] = decodeURIComponent(xs[i].slice(1)))
    return acc
  }, {})
}

export default function router(s, root, rootContext) {
  const location = route.location = rootContext.location
  const routed = s(({ key, path, route, ...attrs }, [view], context) => { // eslint-disable-line
    context.route = router(s, path.replace(/\/$/, ''), rootContext)
    context.route.parent = route
    context.parent = route
    route.key = key
    context.root = route.parent ? route.parent.root : route
    return () => resolve(view, attrs, context)
  })

  route.query = rootContext.query

  route.toString = route
  route.has = x => x === '/'
    ? (getPath(location) === root || (getPath(location) === '/' && root === ''))
    : getPath(location).indexOf(cleanSlash(root + '/' + x)) === 0

  Object.defineProperty(route, 'path', {
    get() {
      const path = getPath(location)
          , idx = path.indexOf('/', root.length + 1)

      return idx === -1 ? path : path.slice(0, idx)
    }
  })

  return route

  function resolve(view, attrs, context) {
    let result = isFunction(view) ? view(attrs, [], context) : view
    return result && isFunction(result.then)
      ? s(() => result)(attrs)
      : result
  }

  function getPath(location, x = 0) {
    return (s.pathmode[0] === '#'
      ? location.hash.slice(s.pathmode.length + x)
      : s.pathmode[0] === '?'
        ? location.search.slice(s.pathmode.length + x)
        : location.pathname.slice(s.pathmode + x)
    ).replace(/(.)\/$/, '$1')
  }

  function reroute(path, { state, replace = false, preventScroll } = {}) {
    if (path === getPath(location) + location.search)
      return

    s.pathmode[0] === '#'
      ? window.location.hash = s.pathmode + path
      : s.pathmode[0] === '?'
        ? window.location.search = s.pathmode + path
        : window.history[replace ? 'replaceState' : 'pushState'](state, null, s.pathmode + path)
    routeState[path] = state
    path.indexOf(location.search) > -1 && rootContext.query(location.search)
    s.redraw().then(() =>
      preventScroll || s.route.preventScroll
        ? s.route.preventScroll = false
        : scrollTo(0, 0)
    )
  }

  function popstate({ state = {} } = {}) {
    s.redraw().then(() =>
      scrollRestore(state.scrollLeft || 0, state.scrollTop || 0)
    )
  }

  function route(routes, options = {}) {
    if (typeof routes === 'undefined')
      return root + '/'

    if (typeof routes === 'string')
      return reroute(cleanSlash(routes[0] === '/' ? routes : '/' + routes), options)

    if (!routing) {
      routing = true
      s.pathmode[0] === '#'
        ? window.addEventListener('hashchange', s.redraw, { passive: true })
        : isFunction(window.history.pushState) && window.addEventListener('popstate', popstate, { passive: true })
    }

    const path = getPath(location, root.length)
    const pathTokens = tokenizePath(path)

    const { match, view } = matchRoutes(routes, pathTokens)

    const current = root + (match
      ? match.map((x, i) => pathTokens[i]).join('')
      : '?'
    )

    if (view === undefined || match[0] === '/?')
      rootContext.doc.status(404)

    route.params = params(match || [], pathTokens)

    return routed({
      key: current || '?',
      path: match && match[0] === '/*' ? '' : current,
      route,
      ...(route.parent ? route.parent.params : {}),
      ...(root + path === current && routeState[root + path] || window.history.state || {}),
      ...route.params
    },
      view
    )
  }
}

function matchRoutes(routes, paths) {
  let max = 0
  let match
  let view

  function tryMatch(m, v) {
    m.charCodeAt(0) !== 47 && (m = '/' + m)
    m = tokenizePath(cleanSlash(m))

    if (typeof v === 'object' && v != null) {
      for (let key in v)
        tryMatch(m + key, v[key])
      return
    }

    const score = getScore(m, paths)
    if (score > max) {
      max = score
      match = m
      view = v
    }
  }

  for (const x in routes)
    tryMatch(x, routes[x])

  return { match, view }
}

function getScore(match, path) {
  return match.reduce((acc, x, i) =>
    acc + (
      x === '/?' ? 1
      : x === path[i] ? 6
      : x && path[i] && x.toLowerCase() === path[i].toLowerCase() ? 5
      : x[1] === ':' && path[i] && path[i].length > 1 ? 4
      : x === '/' && !path[i] ? 3
      : x === '/*' ? 2
      : -Infinity
    )
  , 0)
}
