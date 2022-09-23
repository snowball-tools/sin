import http from 'http'
import esbuild from 'esbuild'

import ssr from '../../ssr/node.js'
import app from './index.js'

esbuild.build({
  entryPoints: ['./index.js'],
  bundle: true,
  write: false
}).then(({ outputFiles: [{ text }] }) => {
  http.createServer(
  	ssr(app, {
  		body: '<script type="module">' + text + '</script>'
  	})
  ).listen(3100)
})
