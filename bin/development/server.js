/* eslint no-console:0 */

import path from 'path'
import fs from 'fs'
import Url from 'url'
import ey from 'ey'

import './log.js'
import '../env.js'
import { gracefulRead, transform } from './shared.js'
import ssr, { wrap } from '../../ssr/index.js'

const cwd = process.cwd()
    , run = false // todo
    , noscript = false // todo
    , port = process.env.PORT
    , url = 'http://localhost:' + port
    , { mount, entry } = await getMount()
    , sinRoot = path.join(Url.fileURLToPath(new URL('.', import.meta.url)), '..', '..')

const app = ey()

const serverPath = path.join(cwd, run ? '' : '+', 'index.js')
if (fs.existsSync(serverPath)) {
  const x = await import(Url.pathToFileURL(serverPath))
  typeof x.default === 'function' && await x.default(app)
}

app.get(r => {
  r.header('Cache-Control', 'no-store')
  if (r.url.indexOf('/.') !== -1) // Don't serve hidden paths or dir up hacks
    return r.status(403).end()
})

app.get(
  app.files('+public', {
    compressions: false,
    cache: false
  })
)

app.get(
  '/node_modules/sin',
  app.files(sinRoot, {
    compressions: false,
    cache: false,
    transform
  })
)

app.get(
  app.files({
    compressions: false,
    cache: false,
    transform
  })
)

app.get(async r => {
  const x = await ssr(
    mount,
    {},
    { location: 'http://' + (r.headers.host || url) + r.url }
  )

  r.end(wrap(x, {
    head: '<script type=module src="/node_modules/sin/bin/development/browser.js"></script>',
    body: noscript ? '' : '<script type=module async defer src="/' + entry + '"></script>'
  }), x.status || 200, x.headers)
})

await app.listen(port)
console.log('Listening on', port)

async function getMount() {
  const entry = path.basename(process.env.SIN_ENTRY)
      , hasMount = (await gracefulRead(process.env.SIN_ENTRY)).indexOf('export default ') !== -1

  return hasMount
    ? { entry, mount: (await import(process.env.SIN_ENTRY)).default }
    : { entry }
}
