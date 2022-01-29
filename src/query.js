import window from './window.js'

export default function Query(s, l) {
  const U = URLSearchParams
  let last = l.search
  let usp = new U(last)

  const query = { replace: x => (usp = new U(x), update()) }
  for (let key in U.prototype)
    query[key] = (...xs) => (key = USP()[key](...xs), update(), key)

  return query

  function USP() {
    return last === l.search ? usp : (last = l.search, usp = new U(last))
  }

  function update() {
    window.history.pushState(
      window.history.state,
      null,
      l.pathname + (usp + '' ? '?' + (usp + '').replace(/=$/g, '') : '') + l.hash // eslint-disable-line
    )
    s.redraw()
  }
}
