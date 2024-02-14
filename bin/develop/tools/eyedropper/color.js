export function P3toOKLCH(x) {
  return OKLab_to_OKLCH(XYZ_to_OKLab(lin_P3_to_XYZ(lin_P3(x))))
}

export function sRGBtoOKLCH(x) {
  return OKLab_to_OKLCH(XYZ_to_OKLab(lin_sRGB_to_XYZ(lin_sRGB(x))))
}

export function OKLCHtoHEX(x) {
  return '#' + gam_sRGB(XYZ_to_lin_sRGB(OKLab_to_XYZ(OKLCH_to_OKLab(x)))).map(x =>
    Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, '0')
  ).join('')
}

export function OKLCHtoCSS([l, c, h]) {
  return `oklch(${ cut(l * 100, 1) }% ${ cut(c, 3) } ${ cut(h, 1) })`
}

function cut(x, n) {
  const factor = Math.pow(10, n)
  return Math.round(x * factor) / factor
}

function lin_sRGB(RGB) {
  return RGB.map(x => {
    const abs = Math.abs(x)
    return abs <= 0.04045
      ? x / 12.92
      : (x < 0 ? -1 : 1) * (Math.pow((abs + 0.055) / 1.055, 2.4))
  })
}

function gam_sRGB(RGB) {
  return RGB.map(x => {
    const abs = Math.abs(x)
    return abs > 0.0031308
      ? (x < 0 ? -1 : 1) * (1.055 * Math.pow(abs, 1/2.4) - 0.055)
      : 12.92 * x
  })
}

function lin_sRGB_to_XYZ(rgb) {
  return multiplyMatrices(
    [
      [ 506752 / 1228815,  87881 / 245763,   12673 /   70218 ],
      [  87098 /  409605, 175762 / 245763,   12673 /  175545 ],
      [   7918 /  409605,  87881 / 737289, 1001167 / 1053270 ]
    ],
    rgb
  )
}

function XYZ_to_lin_sRGB(XYZ) {
  return multiplyMatrices(
    [
      [   12831 /   3959,    -329 /    214, -1974 /   3959 ],
      [ -851781 / 878810, 1648619 / 878810, 36519 / 878810 ],
      [     705 /  12673,   -2585 /  12673,   705 /    667 ]
    ],
    XYZ
  )
}

function lin_P3(RGB) {
  return lin_sRGB(RGB)
}

function lin_P3_to_XYZ(rgb) {
  return multiplyMatrices(
    [
      [ 608311 / 1250200, 189793 / 714400,  198249 / 1000160 ],
      [  35783 /  156275, 247089 / 357200,  198249 / 2500400 ],
      [      0 /       1,  32229 / 714400, 5220557 / 5000800 ]
    ],
    rgb
  )
}

function XYZ_to_OKLab(XYZ) {
  return multiplyMatrices(
    [
      [ 0.2104542683093140,  0.7936177747023054, -0.0040720430116193 ],
      [ 1.9779985324311684, -2.4285922420485799,  0.4505937096174110 ],
      [ 0.0259040424655478,  0.7827717124575296, -0.8086757549230774 ]
    ],
    multiplyMatrices(
      [
         [ 0.8190224379967030, 0.3619062600528904, -0.1288737815209879 ],
         [ 0.0329836539323885, 0.9292868615863434,  0.0361446663506424 ],
         [ 0.0481771893596242, 0.2642395317527308,  0.6335478284694309 ]
      ],
      XYZ
    ).map(c => Math.cbrt(c))
  )
}

function OKLab_to_XYZ(OKLab) {
  return multiplyMatrices(
    [
       [  1.2268798758459243, -0.5578149944602171,  0.2813910456659647 ],
       [ -0.0405757452148008,  1.1122868032803170, -0.0717110580655164 ],
       [ -0.0763729366746601, -0.4214933324022432,  1.5869240198367816 ]
    ],
    multiplyMatrices(
      [
        [ 1.0000000000000000,  0.3963377773761749,  0.2158037573099136 ],
        [ 1.0000000000000000, -0.1055613458156586, -0.0638541728258133 ],
        [ 1.0000000000000000, -0.0894841775298119, -1.2914855480194092 ]
      ],
      OKLab
    ).map(c => c ** 3)
  )
}

function OKLab_to_OKLCH(OKLab) {
  const hue = Math.atan2(OKLab[2], OKLab[1]) * 180 / Math.PI
  return [
    OKLab[0],
    Math.sqrt(OKLab[1] ** 2 + OKLab[2] ** 2),
    hue >= 0 ? hue : hue + 360
  ]
}

function OKLCH_to_OKLab(OKLCH) {
  return [
    OKLCH[0],
    OKLCH[1] * Math.cos(OKLCH[2] * Math.PI / 180),
    OKLCH[1] * Math.sin(OKLCH[2] * Math.PI / 180)
  ]
}

function multiplyMatrices(A, B) {
  const m = A.length
  Array.isArray(A[0]) || (A = [A])
  Array.isArray(B[0]) || (B = B.map(x => [x]))

  let p = B[0].length
  let B_cols = B[0].map((_, i) => B.map(x => x[i]))
  let product = A.map(row => B_cols.map(x => {
    return Array.isArray(row)
      ? row.reduce((a, c, i) => a + c * (x[i] || 0), 0)
      : x.reduce((a, c) => a + c * row, 0)
  }))

  m === 1 && (product = product[0])
  return p === 1
    ? product.map(x => x[0])
    : product
}
