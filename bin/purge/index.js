const xs = argv[1] === 'all'
  ? fs.readdirSync(home).filter(x => fs.statSync(path.join(home, x)).isDirectory())
  : [name]

for (const x of xs) {
  process.stdout.write('Clear ' + x + ' ' + s.gray('(' + path.join(home, x) + ')') + ' ... ')
  await fsp.rm(path.join(home, x), { recursive: true, force: true }).catch(() => {})
  console.log('done')
}
process.exit(0)
