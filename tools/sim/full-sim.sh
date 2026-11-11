#!/bin/sh
# Builds and runs the full v1.04 pacing sim. Usage: sh tools/sim/full-sim.sh [active|casual|idle] [stopAsc]
cd "$(dirname "$0")/../.." || exit 1
npx esbuild tools/sim/run-full-sim.ts --bundle --platform=node --outfile=tools/sim/.full-sim.cjs --define:import.meta.env='{}' \
  --alias:@=./client/src --alias:@assets=./attached_assets --loader:.mp3=empty --loader:.png=empty --loader:.css=empty --log-level=error \
  && node tools/sim/.full-sim.cjs "$@"
