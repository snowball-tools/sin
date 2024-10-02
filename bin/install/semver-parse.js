// chrome
// most simple version parseChar is 2x faster
// most complex version is same speed

// safari
// most simple version is same speed
// most complex version parseReg is 50% faster

function parseReg(x) {
  const [_, major, minor = 0, patch = 0, prerelease, prereleaseVersion, build, buildVersion]
    = x.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-(\w+)(?:\.(\d+))?)?(?:\+(\w+)(?:\.(\d+))?)?$/i)

  return {
    major: ~~major,
    minor: ~~minor,
    patch: ~~patch,
    prerelease: prerelease,
    prereleaseVersion: prereleaseVersion ? ~~prereleaseVersion : 0,
    build: build,
    buildVersion: buildVersion ? ~~buildVersion : 0
  }
}

export function parseChar(x) {
  let i = 0
  let l = 0
  let c = -1
  let pi = -1
  let bi = -1
  let major = -1
  let minor = -1
  let patch = -1
  let prerelease = ''
  let prereleaseVersion = -1
  let build = ''
  let buildVersion = -1

  while (i < x.length) {
    c = x.charCodeAt(i)
    if (c === 46) { // .
      parts()
    } else if (c === 45) { // -
      parts()
      pi = i + 1
    } else if (c === 43) { // +
      parts()
      bi = i + 1
    }
    i++
  }
  parts(l, i)

  return {
    major,
    minor: minor === -1 ? null : minor,
    patch: patch === -1 ? null : patch,
    prerelease: prerelease || null,
    prereleaseVersion: prerelease ? (prereleaseVersion === -1 ? 0 : prereleaseVersion) : null,
    build: build || null,
    buildVersion: build ? (buildVersion === -1 ? 0 : buildVersion) : null
  }

  function parts() {
    bi !== -1
      ? (build === '' ? build = x.slice(bi, i) : buildVersion = ~~x.slice(l, i))
      : pi !== -1
      ? (prerelease === '' ? prerelease = x.slice(pi, i) : prereleaseVersion = ~~x.slice(l, i))
      : major === -1
      ? major = ~~x.slice(l, i)
      : minor === -1
      ? minor = ~~x.slice(l, i)
      : patch === -1 && (patch = ~~x.slice(l, i))
    l = i + 1
  }
}

function parseFusion(x, pi = x.indexOf('-'), bi = x.indexOf('+')) {
  const [_, major, minor = 0, patch = 0] = (
    pi !== -1 ? x.slice(0, pi) : bi !== -1 ? x.slice(0, bi) : x
  ).match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))/)

  const build = bi === -1 ? undefined : x.slice(bi + 1).split('.')
      , prerelease = pi === -1 ? undefined : x.slice(pi + 1, bi === -1 ? x.length : bi).split('.')

  return {
    major: ~~major,
    minor: ~~minor,
    patch: ~~patch,
    prerelease: prerelease ? prerelease[0] : undefined,
    prereleaseVersion: prerelease ? ~~(prerelease[1] || 0) : undefined,
    build: build ? build[0] : undefined,
    buildVersion: build ? ~~(build[1] || 0) : undefined
  }
}

/*

p(parseReg('1.1.1-pre.2+build.20'))
p(parseChar('1.1.1-pre.2+build.20'))
p(parseFusion('1.1.1-pre.2+build.20'))

let c = 1000000
let start

for(let i = 0; i < c; i++)
  parseChar('1.1.1-pre.2')

start = performance.now()
for(let i = 0; i < c; i++)
  parseChar('1.1.1-pre.2')
p(performance.now() - start)

for(let i = 0; i < c; i++)
  parseReg('1.1.1-pre.2')

start = performance.now()
for(let i = 0; i < c; i++)
  parseReg('1.1.1-pre.2')
p(performance.now() - start)

for(let i = 0; i < c; i++)
  parseFusion('1.1.1-pre.2')

start = performance.now()
for(let i = 0; i < c; i++)
  parseFusion('1.1.1-pre.2')
p(performance.now() - start)

*/
