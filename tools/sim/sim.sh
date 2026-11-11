#!/bin/sh
# Builds and runs the pacing sim. Usage: sh tools/sim/sim.sh [active|casual|idle] [stopAsc]
cd "$(dirname "$0")/../.." || exit 1
npx esbuild tools/sim/run-sim.ts --bundle --platform=node --outfile=tools/sim/.sim.cjs --define:import.meta.env='{}' \
  --alias:@=./client/src --alias:@assets=./attached_assets --loader:.mp3=empty --loader:.png=empty --loader:.css=empty --log-level=error \
  && node tools/sim/.sim.cjs "$@"
