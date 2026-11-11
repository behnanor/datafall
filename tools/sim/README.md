# Pacing sim

`run-sim.ts` imports the real economy code from `client/src/lib/useGame.ts` (upgrade costs, production,
ascension cost and prestige reward), so it always matches the current game numbers.

```
sh tools/sim/sim.sh active 50    # 5 clicks/s, greedy buyer, up to ascension 50
sh tools/sim/sim.sh casual 10    # 2 clicks/s
sh tools/sim/sim.sh idle 10      # 0.5 clicks/s
EVENTS=1 sh tools/sim/sim.sh active 5   # also print the first purchase of every machine per run
```

It prints minutes per run, total hours, the longest wait between two purchases ("dead stretch") and the
prestige earned. It is an optimistic greedy player: no pickups, Time Warp, crits, loot, bosses, Paragon or
Black Market, so real players are slower. Use it to compare before/after a balance change, not as a forecast.
