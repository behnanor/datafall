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

## Full sim (v1.04 systems)

`run-full-sim.ts` adds everything that changes pacing on top of the base sim: Run Protocols (best of the real
seeded offer), Network Events (seeded, real weights/durations), contract crypto (1/2/4% of the ascension cost),
Paragon Lab I/II/III and Abyss Core, boss fights with their modifiers (constants copied from BossEncounter.tsx),
the Core finale, and Endless with Abyss Boons and Core Echoes.

```
sh tools/sim/full-sim.sh active 100           # all systems on, up to ascension 100 (= Endless depth 50)
PREMERGE=1 sh tools/sim/full-sim.sh active 100 # roughly v1.04 before PRs #8-#12 (no protocols/events/contract share/Paragon III/boons)
POLICY=skilled sh tools/sim/full-sim.sh active 100   # buyer tries several data/crypto balances per run (slower to run)
BOSSTABLE=1 ... / BOSSPROBE=1 ...              # clicks per second each boss fight needs
```

Toggles (set to 0 to switch off): PROTO EVENTS CONTRACTS PARAGON BOSSES. What-if knobs: NOHEAD=1 (no Head Start),
HEADMULT, FIXED=<protocol id|standard>, CPS, ABYSSMULT, ABYSSPCT, BOONPCT, VERBOSE=1, DEBUGRUN=1.
Same caveat as the base sim: optimistic, no time spent in menus, boss intros or loot boxes. Compare runs, don't forecast.
