node --require "$(dirname $0)/silence.cjs" --experimental-loader "$(dirname $0)/loader.js" "$(dirname $0)/index.js" $@
