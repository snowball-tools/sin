export function parseAcceptEncoding(x, preferred = []) {
  return (x || '').split(',')
    .map(x => (x = x.split(';q='), { type: x[0].trim(), q: parseFloat(x[1] || 1) }))
    .filter(x => x.q !== 0)
    .sort((a, b) => b.q === a.q
      ? preferred.indexOf(a.type) - preferred.indexOf(b.type)
      : b.q - a.q)
}

export function wrap({ html, css, title, head }, body = '') {
  return html.slice(0, 15).toLowerCase() === '<!doctype html>'
      ? html.replace('</head>', head + css + '</head>').replace('</body>', body + '</body>')
      : `<!doctype html>
<html><head>
<meta charset="utf8">
<title>${ title }</title>
<link rel="icon" href="data:;base64,iVBORw0KGgo=">
<meta name="viewport" content="width=device-width, initial-scale=1">${
  head
}${
  css
}</head>
<body>${
  html
}
${
  body
}</body>
</html>`
}
