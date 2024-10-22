export function best(target, versions) {
  const ranges = buildRanges(target)
  let best
  for (const x of versions) {
    const v = parseVersion(x)
    v.version = otob(v)
    if (!satisfiesRanges(v, ranges))
      continue

    if (!best || better(v, best))
      best = v
  }

  return best && best.raw
}

function better(a, b) {
  return a.version > b.version
      || betterCombo(a.version, b.version, a.pre, a.preVersion, b.pre, b.preVersion)
}

function betterCombo(av, bv, an, ai, bn, bi) {
  return av === bv && (bn && (!an || (an === bn && ai > bi) || (an > bn)))
}

function lowerCombo(av, bv, an, ai, bn, bi) {
  return (!an && av >= bv) || (an && bn && (
    av === bv && (an > bn || (an === bn && ai >= bi))
  ))
}

function upperCombo(av, bv, an, ai, bn, bi) {
  return av < bv || !an || (!an && !bn) || (
    av === bv &&
    (an < bn || (an === bn && ai < bi))
  )
}

function satisfiesLower(a, b) {
  return a.version >= b.version
      && lowerCombo(a.version, b.version, a.pre, a.preVersion, b.pre, b.preVersion)
}

function satisfiesUpper(a, b) {
  return a.version < b.version
      && upperCombo(a.version, b.version, a.pre, a.preVersion, b.pre, b.preVersion)
}

export function satisfies(version, range) {
  return satisfiesRanges(parseVersion(version), buildRanges(range))
}

function satisfiesRanges(v, ranges) {
  if (typeof ranges === 'string')
    return v.raw === ranges

  v.version || (v.version = otob(v))
  return ranges.some(ands =>
    ands.every(({ lower, upper }) =>
      lower && upper
        ? satisfiesLower(v, lower) && satisfiesUpper(v, upper)
        : lower
        ? satisfiesLower(v, lower)
        : upper && satisfiesUpper(v, upper)
    )
  )
}

export function isDistTag(x) {
  return x !== 'x' && x !== 'X' && !/[^a-z]/.test(x)
}

export function isVersion(x) {
  return /^\d+\.\d+\.\d+($|[-+])/.test(x) // /[ _|=<>xX*^~]/.test(x)
}

export function buildRanges(x) {
  if (isVersion(x))
    return x

  return x.replace(/\s-\s/g, '_').replace(/\s+([0-9])/g, '$1').split(/\s*\|\|\s*/).map(x =>
    x.split(/\s+/).map(buildRange)
  )
}

export function serializeRanges(xs) {
  return xs.map(ands =>
    ands.flatMap(({ lower, upper }) =>
      lower && upper
        ? ['>=' + serializeVersion(lower), '<' + serializeVersion(upper)]
        : lower
        ? '>=' + serializeVersion(lower)
        : upper
        ? '<' + serializeVersion(upper)
        : []
    ).join(' ')
  ).join(' || ')
}

export function serializeVersion(x) {
  return x.major + '.' + (x.minor === -1 ? 0 : x.minor) + '.' + (x.patch === -1 ? 0 : x.patch)
    + (x.pre ? '-' + x.pre + (x.preVersion !== null ? '.' + x.preVersion : '') : '')
    + (x.build ? '+' + x.build + (x.buildVersion !== null ? '.' + x.buildVersion : '') : '')
}

export function buildRange(x) {
  const c = x.charCodeAt(0)
  let $
    , lower = null
    , upper = null

  if (!x || x === '*' || x === 'x' || x === 'X') {
    lower = { major: 0, minor: 0, patch: 0 }
  } else if (c === 126) { // ~
    lower = parseVersion(x.slice(1).replace(/\.[xX*]/g, '.0'))
    upper = lower.minor === -1
      ? { major: lower.major + 1, minor: 0, patch: 0 }
      : { major: lower.major, minor: lower.minor + 1, patch: 0 }
  } else if (c === 94) { // ^
    lower = parseVersion(x.slice(1).replace(/\.[xX*]/g, ''))
    upper = lower.major === 0 && lower.minor === 0 && lower.patch !== -1
      ? { major: lower.major, minor: lower.minor, patch: lower.patch + 1 }
      : lower.major === 0 && lower.minor !== -1
      ? { major: lower.major, minor: lower.minor + 1, patch: 0 }
      : { major: lower.major + 1, minor: 0, patch: 0 }
  } else if (c === 60) { // <
    $ = x.charCodeAt(1) === 61
    upper = parseVersion(x.slice($ ? 2 : 1).replace(/\.[xX*]/g, ''))
    upper.patch === -1 && (upper.patch = 0)
    upper.minor === -1 && (upper.minor = 0)
    $ && (upper.patch++)
  } else if (c === 61) { // =
    lower = parseVersion(x.slice(1).replace(/\.[xX*]/g, ''))
    lower.patch === -1 && (lower.patch = 0)
    lower.minor === -1 && (lower.minor = 0)
    upper = { major: lower.major, minor: lower.minor, patch: lower.patch + 1 }
  } else if (c === 62) { // >
    $ = x.charCodeAt(1) === 61
    lower = parseVersion(x.slice($ ? 2 : 1).replace(/\.[xX*]/g, ''))
    lower.patch === -1 && (lower.patch = 0)
    lower.minor === -1 && (lower.minor = 0)
    $ || (lower.patch++)
  } else if (($ = x.indexOf('_')) > -1) {
    lower = parseVersion(x.slice(0, $).replace(/\.[xX*]/g, ''))
    upper = parseVersion(x.slice($ + 1).replace(/\.[xX*]/g, ''))
    upper.minor === -1
      ? upper.major++
      : upper.patch === -1
      ? upper.minor++
      : upper.patch++
  } else if (c >= 48 && c <= 57) { // 0 9
    const noX = x.replace(/\.[xX*]/g, '')
    lower = parseVersion(noX)
    upper = parseVersion(noX)
    upper.minor === -1
      ? upper.major++
      : upper.patch === -1
      ? upper.minor++
      : upper.patch++
  }

  if (lower) {
    lower.minor === -1 && (lower.minor = 0)
    lower.patch === -1 && (lower.patch = 0)
    lower.version = otob(lower)
  }

  if (upper) {
    upper.minor === -1 && (upper.minor = 0)
    upper.patch === -1 && (upper.patch = 0)
    upper.version = otob(upper)
  }

  return {
    lower,
    upper
  }
}

export function parseVersion(x) {
  let i = 0
  let l = 0
  let c = -1
  let pi = -1
  let bi = -1
  let major = -1
  let minor = -1
  let patch = -1
  let pre = ''
  let preVersion = -1
  let build = ''
  let buildVersion = -1

  while (i < x.length) {
    c = x.charCodeAt(i)
    if (c === 46 && (pi === -1 || !pre)) { // .
      parts()
    } else if (c === 45) { // -
      parts()
      pi = i + 1
    } else if (c === 43) { // +
      parts()
      bi = i + 1
    } else if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) { // A Z a z
      pi === -1 && (parts(), pi = i)
    }
    i++
  }
  parts()

  return {
    raw: x,
    major,
    minor,
    patch,
    pre,
    preVersion: pre ? (preVersion === -1 ? null : preVersion) : null,
    build,
    buildVersion: build ? (buildVersion === -1 ? null : buildVersion) : null
  }

  function parts() {
    bi !== -1
      ? (build === '' ? build = x.slice(bi, i) : buildVersion = ~~x.slice(l, i))
      : pi !== -1
      ? (pre === '' ? pre = x.slice(pi, i) : preVersion = Number(x.slice(l, i)))
      : major === -1
      ? major = ~~x.slice(l, i)
      : minor === -1
      ? minor = ~~x.slice(l, i)
      : patch === -1 && (patch = ~~x.slice(l, i))
    l = i + 1
  }
}

export function otob({ major, minor, patch }) {
  return vtob(major, minor, patch)
}

export function vtob(major, minor, patch) {
  return (BigInt(major) << (2n * 53n)) | (BigInt(minor) << 53n) | BigInt(patch)
}

export function btov(x) {
  const max = (1n << 53n) - 1n
  return {
    major: (x >> (2n * 53n)) & max,
    minor: (x >> 53n) & max,
    patch: x & max
  }
}
