import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import { pipeline } from 'node:stream/promises'
import { createRequire } from 'node:module'

const binaryName = `uws_${ process.platform }_${ process.arch }_${ process.versions.modules }.node`
const binaryPath = path.join(import.meta.dirname, binaryName)

fs.existsSync(binaryPath) || await download()

let uws
try {
  uws = createRequire(import.meta.url)(binaryPath)
} catch(e) {
  await download()
  uws = createRequire(import.meta.url)(binaryPath)
}

export default uws

async function download(url = 'https://raw.githubusercontent.com/porsager/uWebSockets.js/v20.47.0/' + binaryName, retries = 0) {
  return new Promise((resolve, reject) => {
    https.get(url, async res => {
      if (retries > 10)
        return reject(new Error('Could not download uWebSockets binary - too many redirects - latest: ' + res.headers.location))

      if (res.statusCode === 302)
        return (res.destroy(), resolve(download(res.headers.location, retries + 1)))

      if (res.statusCode !== 200)
        return reject(new Error('Could not download uWebSockets binary - error code: ' + res.statusCode + ' - ' + url))

      pipeline(res, fs.createWriteStream(binaryPath)).then(resolve, reject)
    })
    .on('error', reject)
    .end()
  })
}
