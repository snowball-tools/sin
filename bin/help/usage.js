/* eslint no-console: 0 */

import c from '../color.js'

console.log(`
Usage: sin ${ c.bold`command` }

${ c.dim`Any command can be shortened anywhere down to its first letter` }

sin ${ c.bold`s` }${ c.dim`tart` }         Starts a full production setup
sin ${ c.bold`c` }${ c.dim`reate` }        Create a new sin project
sin ${ c.bold`d` }${ c.dim`evelop` }       Starts the sin development setup
sin ${ c.bold`g` }${ c.dim`enerate` }      Generate static HTML
sin ${ c.bold`b` }${ c.dim`uild` }         Build and bundle browser js

sin ${ c.bold`v` }${ c.dim`ersion` }       Print the current versions
sin ${ c.bold`h` }${ c.dim`elp` }          Print the full help
`)
