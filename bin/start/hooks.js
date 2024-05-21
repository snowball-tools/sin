import esbuild from 'esbuild'
import config from '../config.js'
import { loader, resolve } from '../hooks.js'

const sucrase = await import('sucrase').catch(() => null)

export const load = loader((...xs) => modify(...xs))
export { resolve }

function modify(x, file) {
  if (/\.tsx?$/.test(file)) {
    try {
      x = sucrase && !file.endsWith('.tsx')
        ? sucrase.transform(x, { transforms: ['typescript'] }).code
        : esbuild.transformSync(x, {
            jsx: 'transform',
            loader: file.endsWith('.tsx') ? 'tsx' : 'ts',
            logLevel: config.debug ? 'debug' : undefined,
            tsconfigRaw: config.tsconfigRaw
          }).code
    }
    catch (err) {
      console.error("[Sin] modify failed:", err)
      throw err
    }
  }

  return x
}
