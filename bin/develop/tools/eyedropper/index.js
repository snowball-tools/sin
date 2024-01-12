import Color from './color.js'
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
    fn(
      new Color(x[3] ? 'p3' : 'srgb',
      x.slice(0, 3).map(x => x / 255)).to('oklch').toString({ precision: 3 }).replace('none', '0')
    )
  }
}
