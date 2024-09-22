import fs from 'fs'

const react = fs.readFileSync('bin/install/react.json', { encoding: 'utf8' })

let start
let c = 10

JSON.parse(react)
const versions = (react.toString().match(/(:{|},)"\d+\.\d+\.\d+[^"]*":{"/g) || []).map(x => x.slice(3, -4))
p(Object.keys(JSON.parse(react).versions).join(',') === versions.join(','))

start = performance.now()
for (let i = 0; i < c; i++) {
  Object.keys(JSON.parse(react).versions)
}
p(performance.now() -start)

start = performance.now()
for (let i = 0; i < c; i++) {
  (react.toString().match(/(:{|},)"\d+\.\d+\.\d+[^"]*":{"/g) || []).map(x => x.slice(3, -4))
}
p(performance.now() -start)
