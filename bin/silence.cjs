const xs = process.listeners('warning')
process.removeAllListeners('warning')
process.prependListener('warning', x =>
  x.message.indexOf('Custom ESM Loaders') === 0 || xs.forEach(l => l(x))
)
