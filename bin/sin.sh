#! /bin/sh

node --trace-uncaught --no-warnings --watch --experimental-loader "$(dirname $0)/loader.js" "$(dirname $0)/index.js" $@
