/* eslint no-console: 0 */

import c from '../color.js'

console.log(`
Usage: sin ${ c.bold`command` }

${ c.gray`Any command can be shortened anywhere down to its first letter` }

sin ${ c.bold`s` }${ c.gray`tart` }         Starts a full production setup
sin ${ c.bold`c` }${ c.gray`reate` }        Create a new sin project
sin ${ c.bold`d` }${ c.gray`evelop` }       Starts the sin development setup
sin ${ c.bold`g` }${ c.gray`enerate` }      Generate static HTML
sin ${ c.bold`b` }${ c.gray`undle` }        Build and bundle browser js

sin ${ c.bold`v` }${ c.gray`ersion` }       Print the current versions
sin ${ c.bold`h` }${ c.gray`elp` }          Print the full help
`)
