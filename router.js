let routing = false

export const routeState = {}

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

export default function router(s, root, attrs) {
  const routed = s(({ route, key, ...attrs }, [view], context) => {
    context.route = route
    return () => typeof view === 'function'
      ? view(attrs, [], context)
      : view
  })

  Object.assign(route, attrs)
  route.toString = route
  route.has = x => x === '/'
    ? (getPath(route.url) === root || (getPath(route.url) === '/' && root === ''))
    : getPath(route.url).indexOf(cleanSlash(root + '/' + x)) === 0

  Object.defineProperty(route, 'current', {
    get() {
      const path = getPath(route.url)
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

  function reroute(path, options = {}) {
    s.pathmode[0] === '#'
      ? window.location.hash = s.pathmode + path
      : s.pathmode[0] === '?'
        ? window.location.search = s.pathmode + path
        : window.history[options.replace ? 'replaceState' : 'pushState'](options.state, null, s.pathmode + path)
    routeState[path] = options.state
    s.redraw()
  }

  function route(routes, options = {}) {
    if (typeof routes === 'undefined')
      return root + '/'

    if (typeof routes === 'string')
      return reroute(cleanSlash(routes[0] === '/' ? routes : '/' + routes), options)

    if (!routing) {
      routing = true
      s.pathmode[0] === '#'
        ? window.addEventListener('hashchange', () => s.redraw())
        : typeof window.history.pushState === 'function' && window.addEventListener('popstate', s.redraw)
    }

    const path = getPath(route.url, root.length)
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

    const subRoute = router(s, current.replace(/\/$/, ''), attrs)
    subRoute.parent = route

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
