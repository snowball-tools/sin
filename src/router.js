import window from './window.js'
import { isFunction, cleanSlash, scrollRestore } from './shared.js'

let routing = false

const routeState = {}

function tokenizePath(x) {
  return x.split(/(?=\/)/)
}

function getScore(match, path) {
  return match.reduce((acc, x, i) =>
    acc + (
      x === '/?' ? 1
      : x === path[i] ? 6
      : x && path[i] && x.toLowerCase() === path[i].toLowerCase() ? 5
      : x[1] === ':' && path[i] && path[i].length > 1 ? 4
      : x === '/' && !path[i] ? 3
      : x === '*' || x === '/*' ? 2
      : -Infinity
    )
  , 0)
}

function params(path, xs) {
  return path.reduce((acc, x, i) => {
    x[1] === ':' && (acc[x.slice(2)] = decodeURIComponent(xs[i].slice(1)))
    return acc
  }, {})
}

export default function router(s, root, rootContext) {
  const location = route.location = rootContext.location
  const routed = s(({ key, route, ...attrs }, [view], context) => { // eslint-disable-line
    context.route = router(s, key.replace(/\/$/, ''), rootContext)
    context.parent = route
    context.root = route.parent ? route.parent.root : route
    return () => typeof view === 'string'
      ? import((view[0] === '/' ? '' : route) + view).then(x => resolve(x.default, attrs, context))
      : resolve(view, attrs, context)
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
    s.redraw()
    state && requestAnimationFrame(() => scrollRestore(state.scrollLeft, state.scrollTop))
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

    const [, match, view] = Object
      .entries(routes)
      .reduce((acc, [match, view]) => {
        match.charCodeAt(0) === 47 || (match = '/' + match) // /
        match = tokenizePath(cleanSlash(match))
        const score = getScore(match, pathTokens)
        return score > acc[0]
          ? [score, match, view]
          : acc
      }, [0])

    const current = root + (match && match[0] === '/*'
      ? '/'
      : match.map((x, i) => pathTokens[i]).join(''))

    if (view === undefined || match[0] === '/?')
      rootContext.doc.status(404)

    return routed({
      key: current || '?',
      route,
      ...(root + path === current && routeState[root + path] || {}),
      ...params(match || [], pathTokens)
    },
      view
    )
  }
}
