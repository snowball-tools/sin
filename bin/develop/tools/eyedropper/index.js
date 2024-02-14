import { P3toOKLCH, sRGBtoOKLCH } from './color.js'
import { createRequire } from 'module'

const eyeDropper = createRequire(import.meta.url)('./eyedropper.node')

export default function(fn) {
  let color

  const timer = setInterval(fetch, 50)
  fetch()

  return () => clearInterval(timer)

  function fetch() {
    const x = eyeDropper()

    if (color && color[0] === x[0] && color[1] === x[1] && color[2] === x[2])
      return

    color = x
    const xs = x.map(x => x / 255)
    fn(x[3] ? P3toOKLCH(xs) : sRGBtoOKLCH(xs))
  }
}
