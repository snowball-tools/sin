import window from './window.js'
import { isFunction } from './shared.js'

let routing = false

const routeState = {}

export function cleanSlash(x) {
  return String(x).replace(/\/+/g, '/').replace(/(.)\/$/, '$1')
}

function tokenizePath(x) {
  return x.split(/(?=\/)/)
}

function getScore(match, current) {
  return match.reduce((acc, x, i) =>
    acc + (
      x === '404' ? 1
      : x === current[i] ? 6
      : x && current[i] && x.toLowerCase() === current[i].toLowerCase() ? 5
      : x[1] === ':' && current[i] && current[i].length > 1 ? 4
      : x === '/' && !current[i] ? 3
      : x === '*' || x === '/*' ? 2
      : -Infinity
    )
  , 0)
}

function params(path, current) {
  return path.reduce((acc, x, i) => {
    x[1] === ':' && (acc[x.slice(2)] = decodeURIComponent(current[i].slice(1)))
    return acc
  }, {})
}

function resolve(view, attrs, context) {
  return isFunction(view) ? view(attrs, [], context) : view
}

export function router(s, root, location) {
  const routed = s((attrs, [view], context) => { // eslint-disable-line
    context.route = attrs.route
    return () => typeof view === 'string'
      ? import((view[0] === '/' ? '' : route) + view).then(x => resolve(x.default, attrs, context))
      : resolve(view, attrs, context)
  })

  route.toString = route
  route.has = x => x === '/'
    ? (getPath(location) === root || (getPath(location) === '/' && root === ''))
    : getPath(location).indexOf(cleanSlash(root + '/' + x)) === 0

  Object.defineProperty(route, 'current', {
    get() {
      const path = getPath(location)
          , idx = path.indexOf('/', root.length + 1)

      return idx === -1 ? path : path.slice(0, idx)
    }
  })

  return route

  function getPath(location, x = 0) {
    return (s.pathmode[0] === '#'
      ? location.hash.slice(s.pathmode.length + x)
      : s.pathmode[0] === '?'
        ? location.search.slice(s.pathmode.length + x)
        : location.pathname.slice(s.pathmode + x)
    ).replace(/(.)\/$/, '$1')
  }

  function reroute(path, { state, replace = false, scroll = rootChange(path) } = {}) {
    if (path === route.current)
      return

    s.pathmode[0] === '#'
      ? window.location.hash = s.pathmode + path
      : s.pathmode[0] === '?'
        ? window.location.search = s.pathmode + path
        : window.history[replace ? 'replaceState' : 'pushState'](state, null, s.pathmode + path)
    routeState[path] = state
    s.redraw()
    scroll && scrollTo(0, 0)
  }

  function rootChange(path) {
    return path.split('/')[1] !== route.current.split('/')[1]
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
        : isFunction(window.history.pushState) && window.addEventListener('popstate', s.redraw, { passive: true })
    }

    const path = getPath(location, root.length)
    const pathTokens = tokenizePath(path)

    const [_, match, view = options.notFound] = Object // eslint-disable-line
      .entries(routes)
      .reduce((acc, [match, view]) => {
        match = tokenizePath(cleanSlash(match))
        const score = getScore(match, pathTokens)
        return score > acc[0]
          ? [score, match, view]
          : acc
      }, [0])

    const current = root + (match && match[0] !== '*'
      ? match.map((x, i) => pathTokens[i]).join('')
      : '')

    if (view === undefined || options.notFound)
      route.notFound(true)

    const subRoute = router(s, current.replace(/\/$/, ''), location)
    subRoute.parent = route
    subRoute.root = route.parent ? route.parent.root : route

    return routed({
      key: current || '/',
      route: subRoute,
      ...(root + path === current && routeState[root + path] || {}),
      ...params(match || [], pathTokens)
    },
      view
    )
  }
}
