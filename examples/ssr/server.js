import html from '../../src/ssr/index.js'
import app from './index.js'
import http from 'http'
import esbuild from 'esbuild'

esbuild.build({
  entryPoints: ['./index.js'],
  bundle: true,
  write: false
}).then(({ outputFiles: [{ text: script }] }) => {
  http.createServer(ssr(app)).listen(3100)

  const wrap = ({ html, style, title, head }) => `<!doctype html>
  <html>
  <head>
    <meta charset="utf8">
    <title>${ title }</title>
    <link rel="icon" href="data:;base64,iVBORw0KGgo=">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${ p(style, 'CSS') }
    ${ head }
  </head>
  <body>${ p(html, 'HTML') }<script>${ script }</script></body>
  </html>
  `

  function ssr(app, attrs, context) {
    return async function(req, res, next) {
      const x = await html(app, attrs, { ...context, location: new URL(req.url, 'http://localhost/') })
      res.statusCode = x.status || 200
      res.end(
        x.html.slice(0, 15).toLowerCase() === '<!doctype html>'
          ? x.html.replace('</title>', '</title>' + x.style).replace('</body>', script + '</body>')
          : wrap(x)
      )
    }
  }
})
