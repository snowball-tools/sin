import window from './window.js'

export default function Query(s, l) {
  const U = URLSearchParams
  let last = l.search
  let usp = new U(last)
  let temp

  const query = { replace: x => (usp = new U(x), update()) }
  for (const key in U.prototype)
    query[key] = (...xs) => (temp = USP()[key](...xs), update(), temp)

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
