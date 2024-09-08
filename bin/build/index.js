import '../env.js'
import config from '../config.js'
import build from 'sin/build'

await build(config)

console.log('🔥 Built in', performance.now()) // eslint-disable-line
