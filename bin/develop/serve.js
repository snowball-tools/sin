/* eslint no-console:0 */

import path from 'path'
import fs from 'fs'
import Url from 'url'
import ey from 'ey'

import './log.js'
import '../env.js'
import { tryRead, transform } from './shared.js'
import ssr, { wrap } from '../../ssr/index.js'

const cwd = process.cwd()
    , port = process.env.PORT
    , url = 'http://127.0.0.1:' + port
    , { mount, entry } = await getMount()
    , sinRoot = path.join(Url.fileURLToPath(new URL('.', import.meta.url)), '..', '..')

const head = getTools()
const app = ey()

const serverPath = path.join(cwd, process.env.SIN_RAW ? '' : '+', 'index.js')
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
    transform(buffer, filePath) {
      process.send(filePath)
      return transform(buffer, filePath)
    }
  })
)

app.get(
  app.files({
    compressions: false,
    cache: false,
    transform(buffer, filePath) {
      process.send(filePath)
      return transform(buffer, filePath)
    }
  })
)

app.get(async r => {
  const x = await ssr(
    mount,
    {},
    { location: 'http://' + (r.headers.host || url) + r.url }
  )

  const html = wrap(x, {
    head,
    body: process.env.SIN_NOSCRIPT ? '' : '<script type=module async defer src="/' + entry + '"></script>'
  })

  r.end(html, x.status || 200, x.headers)
})

await app.listen(port)

async function getMount() {
  const entry = path.basename(process.env.SIN_ENTRY)
      , hasMount = (await tryRead(process.env.SIN_ENTRY)).indexOf('export default ') !== -1

  return {
    mount: hasMount && (await import(process.env.SIN_ENTRY)).default,
    entry
  }
}

function getTools() {
  return `
    <script id=sintools port="${ process.env.SIN_TOOLS_PORT }" type=module async ${
      process.env.SIN_DEBUG
        ? 'src="/node_modules/sin/bin/develop/tools/index.js">'
        : 'src="/node_modules/sin/bin/develop/tools/dist.js">'
    }</script>
  `.trim()
}
