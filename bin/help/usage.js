/* eslint no-console: 0 */

import s from '../style.js'

console.log(`
Usage: sin ${ s.bold`command` }

${ s.gray`Any command can be shortened anywhere down to its first letter` }

sin ${ s.bold`c`}${ s.gray`reate` }        Create a new sin project
sin ${ s.bold`d`}${ s.gray`evelopment` }   Starts the sin development setup
sin ${ s.bold`p`}${ s.gray`roduction` }    Starts a full production setup
sin ${ s.bold`g`}${ s.gray`enerate` }      Generate static HTML
sin ${ s.bold`b`}${ s.gray`uild` }         Build and bundle browser js

sin ${ s.bold`v`}${ s.gray`ersion` }       Print the current versions
sin ${ s.bold`h`}${ s.gray`elp` }          Print the full help
`)
