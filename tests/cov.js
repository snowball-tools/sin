import fs from 'fs'
import path from 'path'
import { rewrite } from '../bin/develop/shared.js'

run(JSON.parse(fs.readFileSync('./coverage.json')))

function run(x) {
  let totalBytes = 0
  let coveredBytes = 0
  let uncoveredDetails = []

  x.forEach(script => {
    script.functions.forEach(func => {
      func.ranges.forEach(range => {
        totalBytes += range.endOffset - range.startOffset
        if (range.count > 0) {
          coveredBytes += range.endOffset - range.startOffset
        } else {
          uncoveredDetails.push({
            ...script,
            ...func,
            ...range
          })
        }
      })
    })
  })

  const coveragePercent = (coveredBytes / totalBytes) * 100
  p(`Coverage: ${coveragePercent.toFixed(2)}%`)

  // List uncovered functions and branches
  uncoveredDetails.filter(x => p(x.url) === 'http://127.0.0.1:1443/index.js').forEach(x => {
    p(`Uncovered in Script ${ x.url.replace('http://127.0.0.1:1443', '') } (${x.scriptId}): Function "${x.functionName}"`) // Range: ${ x.startOffset } - ${ x.endOffset }`)
    const file = path.resolve('./index.js')
    p(rewrite(fs.readFileSync(file, 'utf8'), file).slice(x.startOffset, x.endOffset))
  })
}
