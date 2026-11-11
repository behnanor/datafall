// DataFall full pacing sim (v1.04): the base greedy sim (run-sim.ts) plus every system that changes pacing:
// Run Protocols, Network Events, contract crypto, Paragon Lab (I/II/III, Abyss Core), boss fights with their
// modifiers, the Core finale, Endless with Abyss Boons and Core Echoes.
// Uses the REAL game tables and formulas from useGame.ts / runVariety.ts / abyssBoons.ts / bossVariants.ts.
// Boss-fight constants live inside BossEncounter.tsx (not exported) and are copied in BOSS below.
//
// Usage: sh tools/sim/full-sim.sh [active|casual|idle] [stopAsc]
// Env toggles (all on by default, set to 0 to switch off): PROTO EVENTS CONTRACTS PARAGON BOSSES
//   VERBOSE=1 prints every ascension, BOSSTABLE=1 prints the boss table (required clicks/s per fight).
import {
  INITIAL_STATE, PRESTIGE_UPGRADES, PARAGON_UPGRADES, getAscensionCost, getPrestigeGainBreakdown,
  computeProductionRates, computeParagonBonuses, getEffectiveValue, type Upgrade,
} from '../../client/src/lib/useGame';
import {
  RUN_PROTOCOLS, rollProtocolOffer, combineRunMods, NETWORK_EVENTS, scaleEventMods, SIGNAL_FORK_OPTIONS,
  ENCRYPTED_CACHE_CLICKS, ENCRYPTED_CACHE_SECONDS, ENCRYPTED_CACHE_DATA_SECONDS, ENCRYPTED_CACHE_CRYPTO_SECONDS,
  ROGUE_BROKER_COST_SHARE, LATE_FIRST_EVENT_ASCENSION, LATE_FIRST_EVENT_MIN_SEC, LATE_FIRST_EVENT_MAX_SEC, FIRST_EVENT_MIN_SEC, FIRST_EVENT_MAX_SEC, EVENT_GAP_MIN_SEC, EVENT_GAP_MAX_SEC,
  type RunMods, type RunProtocolId, type NetworkEventId,
} from '../../client/src/lib/runVariety';
import { ABYSS_BOONS, getAbyssBoonOffer, computeAbyssBoonTotals, ABYSS_BOON_EVERY_DEPTHS, type AbyssBoonId } from '../../client/src/lib/abyssBoons';
import {
  getBossVariant, getEchoPrestigeMultiplier, BOUNTY_PRESTIGE_MULTIPLIER, BOSS_DEFEAT_PRESTIGE_SHARE,
  BOSS_ASSIST_TIME_MULTIPLIER, BOSS_ASSIST_HP_MULTIPLIER, getBossPowerMultiplier, PHASING_CYCLE_MS, PHASING_OFF_MS,
  type BossVariant,
} from '../../client/src/lib/bossVariants';

// What-if knobs for tuning: ABYSSMULT (Abyss Core cost growth), ABYSSPCT (its % per level), BOONPCT (Surge/Deep Ledger %).
if (process.env.ABYSSMULT) PARAGON_UPGRADES.find(u => u.id === 'abyss_core')!.costMultiplier = Number(process.env.ABYSSMULT);
if (process.env.ABYSSPCT) PARAGON_UPGRADES.find(u => u.id === 'abyss_core')!.effect.value = Number(process.env.ABYSSPCT);
if (process.env.BOONPCT) for (const b of ABYSS_BOONS) { if (b.productionBoost) b.productionBoost = Number(process.env.BOONPCT); if (b.cryptoBoost) b.cryptoBoost = Number(process.env.BOONPCT); }
const env = (k: string, d = '1') => (process.env[k] ?? d) !== '0';
const mode = (process.argv[2] || 'active') as 'active' | 'casual' | 'idle';
const stopAsc = Number(process.argv[3] || 50);
// PREMERGE=1 approximates v1.04 before PRs #8-#12: no protocols/events/contract share, no Paragon III/Abyss Core/boons.
if (process.env.PREMERGE) { process.env.PROTO = '0'; process.env.EVENTS = '0'; process.env.CONTRACTS = '0'; }
const OPT = { proto: env('PROTO'), events: env('EVENTS'), contracts: env('CONTRACTS'), paragon: env('PARAGON'), bosses: env('BOSSES') };
const CLICKS_PER_S = Number(process.env.CPS) || (mode === 'active' ? 5 : mode === 'casual' ? 2 : 0.5);
// Clicks per second a player of this kind manages in a boss fight (short burst), and how many weak spots they hit.
const FIGHT_CPS = mode === 'active' ? 8 : mode === 'casual' ? 6 : 4;
const WEAK_HIT = mode === 'active' ? 0.7 : mode === 'casual' ? 0.5 : 0.3;
const CONTRACT_SETS = mode === 'active' ? 4 : mode === 'casual' ? 2 : 1;
const BASE_CRYPTO_VALUE = 400;
// POLICY=skilled: each run, try several crypto valuations for the greedy buyer and keep the fastest (a player who
// knows how to balance data machines and rigs). POLICY=basic (default): fixed valuation like run-sim.ts.
const CV_LIST = process.env.POLICY === 'skilled' ? [25, 100, 400, 1600, 6400, 25600] : [BASE_CRYPTO_VALUE];
const NO_BOOSTS = { productionBoost: 0, clickBoost: 0, critBoost: 0, cryptoBoost: 0, critDamageBoost: 0 };

// ---- seeded RNG (events/contracts are random in the game; seeded here so runs are comparable) ----
const rng = (seed: number) => { let s = (seed * 2654435761 + 1) >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

// ---- persistent state ----
const prestige = PRESTIGE_UPGRADES.map(p => ({ ...p, count: 0 }));
const paragon: Record<string, number> = {};
const boons: AbyssBoonId[] = [];
let prestigeBank = 0, asc = 0, lastDps = 0, totalT = 0, prevProtocol: RunProtocolId | null = null;
let finaleDone = false, finaleFails = 0, signalCleared = false;
const stats = { contractCrypto: 0, contractPrestige: 0, eventCount: 0, bossWins: 0, bossLosses: 0, prestigeLostToDefeat: 0, protocolPicks: {} as Record<string, number> };

const costOf = (u: Upgrade) => {
  const c: Record<string, number> = {};
  for (const [k, v] of Object.entries(u.baseCost)) c[k] = Math.floor((v as number) * Math.pow(u.costMultiplier, u.count));
  return c;
};
const pBonuses = () => computeParagonBonuses(paragon);
const boonTotals = () => computeAbyssBoonTotals(boons);

interface RunResult { cv?: number; t: number; crypto: number; longestGap: number; gapAt: number; events: number; contractCrypto: number; contractPrestige: number }

const rollFirst = (r: () => number, rate: number) => {
  const [lo, hi] = asc >= LATE_FIRST_EVENT_ASCENSION ? [LATE_FIRST_EVENT_MIN_SEC, LATE_FIRST_EVENT_MAX_SEC] : [FIRST_EVENT_MIN_SEC, FIRST_EVENT_MAX_SEC];
  return Math.round((lo + r() * (hi - lo)) / Math.max(0.25, rate));
};
function oneRun(protocol: RunProtocolId | null, seed: number, CRYPTO_VALUE = BASE_CRYPTO_VALUE): RunResult {
  const ups: Upgrade[] = (INITIAL_STATE.upgrades as Upgrade[]).map(u => ({ ...u, count: asc > 0 && (u.id === 'unlock_click_upgrades' || u.id === 'unlock_crypto_mining' || u.id === 'zero_day') ? 1 : 0 }));
  const get = (id: string) => ups.find(u => u.id === id)!;
  const head = prestige.find(p => p.effect.type === 'starting_bonus')!;
  let data = head.count * head.effect.value * lastDps * Number(process.env.HEADMULT ?? 1), credits = 0, crypto = 0;
  const need = getAscensionCost(asc);
  const pb = pBonuses(), bt = boonTotals();
  const boosts = { ...NO_BOOSTS, productionBoost: bt.productionBoost, cryptoBoost: bt.cryptoBoost, clickBoost: bt.clickBoost };
  const clickBoost = prestige.filter(p => p.effect.type === 'click_boost').reduce((m, p) => m * (1 + p.effect.value * p.count), 1) * pb.clickMultiplier * (1 + bt.clickBoost / 100);
  const sellBase = 1 + prestige.filter(p => p.effect.type === 'sell_boost').reduce((s, p) => s + p.effect.value * p.count, 0);
  const proto = protocol ? RUN_PROTOCOLS.find(p => p.id === protocol)!.mods : null;
  const r = rng(seed);
  let t = 0, lastBuy = 0, longestGap = 0, gapAt = 0, nEvents = 0;
  // events
  let evMods: Partial<RunMods> | null = null, evEnds = 0;
  const baseMods = combineRunMods(proto);
  let nextEventIn = rollFirst(r, baseMods.eventRate);
  let lastEv: NetworkEventId | null = null;
  // contracts: a set every 60 s from the start of the run (claim the crypto ones, then refresh)
  let contractSetsLeft = OPT.contracts ? CONTRACT_SETS : 0, nextContractAt = 30, cCrypto = 0, cPrestige = 0;
  let mods = baseMods;
  let rates = { data: 0, credits: 0, crypto: 0 };
  const recompute = () => {
    mods = combineRunMods(proto, evMods);
    rates = computeProductionRates({ upgrades: ups, prestigeUpgrades: prestige, cosmeticBoosts: boosts, paragonProductionMultiplier: pb.productionMultiplier, paragonCryptoMultiplier: pb.cryptoMultiplier, adjacencyProductionBoost: 0, adjacencyCryptoBoost: 0, runDataMultiplier: mods.data, runCryptoMultiplier: mods.crypto });
  };
  recompute();
  const clickValue = () => (1 + ups.filter(u => u.effect.type === 'click').reduce((s, u) => s + getEffectiveValue(u), 0)) * clickBoost * mods.click;
  while (crypto < need && t < 200 * 3600) {
    data += rates.data + CLICKS_PER_S * clickValue(); credits += rates.credits; crypto += rates.crypto; t++;
    // ---- contracts ----
    if (contractSetsLeft > 0 && t >= nextContractAt) {
      contractSetsLeft--; nextContractAt = t + 60;
      const shares = [0.01, 0.01, 0.02, 0.02, 0.04];
      for (const share of shares) {
        const type = Math.floor(r() * 8); // sell_data, collect_pickups, spend_credits, reach_production, rapid_clicks, crit_streak, upgrade_single, maintain_resources
        const givesCrypto = [0, 2, 3, 5, 7].includes(type);
        if (type === 5 && mode === 'idle') continue; // crit streak needs clicks
        if (givesCrypto) { const c = Math.floor(need * share); crypto += c; cCrypto += c; }
        if (type === 0 || type === 5) cPrestige += Math.floor(getPrestigeGainBreakdown(need, asc).total * share);
      }
    }
    // ---- network events (countdown pauses while one runs) ----
    if (OPT.events && asc + t > 0) {
      if (evMods && t >= evEnds) { evMods = null; recompute(); }
      if (!evMods && --nextEventIn <= 0) {
        nextEventIn = Math.round((EVENT_GAP_MIN_SEC + r() * (EVENT_GAP_MAX_SEC - EVENT_GAP_MIN_SEC)) / Math.max(0.25, baseMods.eventRate));
        const cryptoOn = get('unlock_crypto_mining').count > 0 && rates.crypto > 0;
        const pool = NETWORK_EVENTS.filter(e => e.id !== lastEv && (!e.needsCrypto || cryptoOn) && (!e.needsCredits || credits >= 100));
        let x = r() * pool.reduce((s, e) => s + e.weight, 0);
        const ev = pool.find(e => (x -= e.weight) <= 0) ?? pool[pool.length - 1];
        lastEv = ev.id; nEvents++;
        const power = baseMods.eventPower;
        if (ev.kind === 'buff') { evMods = scaleEventMods(ev.mods, power); evEnds = t + ev.durationSec; nextEventIn += 0; }
        else if (ev.kind === 'cache') {
          if (CLICKS_PER_S * ENCRYPTED_CACHE_SECONDS >= ENCRYPTED_CACHE_CLICKS) {
            data += Math.max(rates.data * ENCRYPTED_CACHE_DATA_SECONDS, clickValue() * 50) * power;
            crypto += rates.crypto * ENCRYPTED_CACHE_CRYPTO_SECONDS * power;
          }
        } else if (ev.id === 'rogue_broker') { credits *= 1 - ROGUE_BROKER_COST_SHARE; evMods = scaleEventMods(ev.mods, power); evEnds = t + ev.durationSec; }
        else if (ev.id === 'signal_fork') { const o = SIGNAL_FORK_OPTIONS.idle; evMods = scaleEventMods(o.mods, power); evEnds = t + o.durationSec; }
        recompute();
      }
    }
    // ---- greedy buying (sell data for Nodes when needed) ----
    const dataPerNode = pb.nodeConversionDataCost / (sellBase * mods.sell) * Number(process.env.SELLPENALTY || 1);
    for (let k = 0; k < 30; k++) {
      let best: { u: Upgrade; c: Record<string, number>; score: number } | null = null;
      for (const u of ups) {
        if ((u.requiredAscensions ?? 0) > asc) continue;
        const open = u.category === 'fabrication' || (u.category === 'click_upgrades' && get('unlock_click_upgrades').count > 0) || (u.category === 'crypto_mining' && get('unlock_crypto_mining').count > 0);
        if (!open) continue;
        const c = costOf(u);
        const dataCost = (c.data || 0) + Math.max(0, (c.credits || 0) - credits) * dataPerNode;
        if (u.effect.type === 'unlock') { if (u.count === 0 && data >= dataCost) { best = { u, c, score: -1 }; break; } continue; }
        let gain = 0;
        if (u.effect.type === 'production') { u.count++; gain = getEffectiveValue(u); u.count--; if (u.effect.resource === 'crypto') gain *= CRYPTO_VALUE; }
        else if (u.effect.type === 'click') gain = CLICKS_PER_S * u.effect.value * clickBoost;
        else continue;
        if (gain <= 0) continue;
        const score = dataCost / gain;
        if (!best || score < best.score) best = { u, c, score };
      }
      if (!best) break;
      const dataCost = (best.c.data || 0) + Math.max(0, (best.c.credits || 0) - credits) * dataPerNode;
      if (data < dataCost) break;
      const cr = best.c.credits || 0;
      if (credits < cr) { data -= (cr - credits) * dataPerNode; credits = cr; }
      credits -= cr; data -= best.c.data || 0;
      best.u.count++;
      const gap = t - lastBuy; if (gap > longestGap) { longestGap = gap; gapAt = lastBuy; }
      lastBuy = t;
      recompute();
    }
  }
  evMods = null; recompute();
  if (process.env.DEBUGRUN) console.log(`   [asc ${asc}] start data ${(head.count * head.effect.value * lastDps).toExponential(2)} need ${need.toExponential(2)} end data/s ${rates.data.toExponential(2)} crypto/s ${rates.crypto.toExponential(2)} t=${t}s machines ${ups.filter(u => u.count > 0).map(u => u.id + ":" + u.count).join(" ")}`);
  lastDps = rates.data;
  return { t, crypto, longestGap, gapAt, events: nEvents, contractCrypto: cCrypto, contractPrestige: cPrestige };
}

// ---------------- boss fights ----------------
const BOSS = {
  regular: [[15, 20], [18, 20], [20, 18], [22, 18], [25, 16], [28, 16], [30, 15], [32, 15], [35, 14], [38, 14]] as Array<[number, number]>,
  late: [38, 15] as [number, number],
  signal: [42, 35, 1.0], finale: [55, 50, 1.5], echo: [55, 50, 1.5],
  weakMult: 10 / 3, finaleWeakMult: 5, weakEveryMs: 2500, volatileWeakEveryMs: 1250, finaleWeakEveryMs: 3500,
  weakLifeMs: 3000, evasiveLifeMs: 1800, regen: 0.015, armored: 0.3, signalShields: [0, 0.2, 0.35], finaleShields: [0, 0.3, 0.5], critMult: 2.5,
  overclock: 1.35, overclockMs: 6000, breachEveryMs: 9500, breachTime: 2, maxTimeBuffer: 8,
};
type FightKind = 'normal' | 'signal' | 'echo' | 'finale';
interface FightSetup { kind: FightKind; mods: string[]; level: number; power: number; bonusSec: number; assist: boolean; weaken: number; echoTier: number; crit: number }
function fightSetup(kind: FightKind, v: BossVariant | null, level: number, assist = false): FightSetup {
  const pb = pBonuses(), bt = boonTotals();
  const permClick = prestige.filter(p => p.effect.type === 'click_boost').reduce((s, p) => s + p.effect.value * p.count * 100, 0) + pb.clickBoostPercent;
  const dmg = pb.bossDamageMultiplier * bt.bossDamageMultiplier;
  const power = (kind === 'normal' || kind === 'signal' ? getBossPowerMultiplier(permClick) : 1) * Math.max(1, dmg);
  const weaken = Math.min(0.6, Math.min(0.5, 0.1 * finaleFails) + (signalCleared ? 0.15 : 0));
  const crit = 0.05 + prestige.find(p => p.id === 'p_crit')!.count * 0.01 + pb.critChanceBonus + bt.critBoost / 100;
  return { kind, mods: v?.modifiers ?? [], level, power, bonusSec: (pb as any).bossTimeSeconds + bt.bossBonusSeconds, assist: assist && kind === 'normal', weaken, echoTier: v?.depth ? Math.max(1, Math.floor(v.depth / 10)) : 0, crit };
}
/** Deterministic expected-value fight. Returns remaining HP share (<= 0 means win). */
function fight(s: FightSetup, cps: number, weakHit: number): number {
  const m = new Set(s.mods);
  const [baseClicks, timeLimit, bossMult] = s.kind === 'normal' ? [...(s.level >= 10 ? BOSS.late : BOSS.regular[Math.min(s.level, 9)]), 1] : (BOSS as any)[s.kind];
  const ascF = Math.min(4, 1 + 0.25 * Math.log2(s.level + 1) + 0.015 * s.level);
  let hp = baseClicks * bossMult * ascF * (s.kind === 'finale' ? 1 - Math.min(0.5, s.weaken) : 1) * (m.has('bulky') ? 1.25 : 1) * (m.has('bounty') ? 1.2 : 1) * (m.has('volatile') ? 1.2 : 1) * (s.kind === 'echo' ? 1 + 0.15 * (s.echoTier - 1) : 1);
  if (s.assist) hp *= BOSS_ASSIST_HP_MULTIPLIER;
  const maxHp = hp;
  let T = Math.round(timeLimit * (m.has('swift') ? 0.8 : 1) * (s.assist ? BOSS_ASSIST_TIME_MULTIPLIER : 1)) + Math.floor(s.bonusSec);
  const phase = s.kind === 'finale' || s.kind === 'echo' ? BOSS.finaleShields : s.kind === 'signal' ? BOSS.signalShields : null;
  const flat = m.has('armored') ? BOSS.armored : 0;
  const shields = !!phase || flat > 0;
  const weakMult = s.kind === 'finale' || s.kind === 'echo' ? BOSS.finaleWeakMult : BOSS.weakMult;
  const weakEvery = s.kind === 'finale' ? BOSS.finaleWeakEveryMs : m.has('volatile') ? BOSS.volatileWeakEveryMs : BOSS.weakEveryMs;
  const breach = !m.has('jammed') && mode !== 'idle';
  const dt = 0.05;
  let t = 0, nextWeak = 0, nextBreach = BOSS.breachEveryMs / 1000, overUntil = -1;
  const weakLife = (m.has('evasive') ? BOSS.evasiveLifeMs : BOSS.weakLifeMs) / 1000;
  let spots: Array<{ exp: number; v: number }> = []; // live weak spots (v = chance the player goes for it)
  const T0 = T;
  while (t < T && hp > 0) {
    if (t >= nextWeak) { spots.push({ exp: t + weakLife, v: weakHit }); nextWeak += weakEvery / 1000; }
    if (breach && t >= nextBreach) { T = Math.min(T0 + BOSS.maxTimeBuffer, T + BOSS.breachTime); overUntil = t + BOSS.overclockMs / 1000; spots.push({ exp: t + weakLife, v: weakHit }, { exp: t + weakLife, v: weakHit }); nextBreach += BOSS.breachEveryMs / 1000; }
    spots = spots.filter(sp => sp.exp > t && sp.v > 1e-9).slice(-3);
    const clicks = cps * dt;
    let weakClicks = 0, budget = clicks;
    for (const sp of spots) { const use = Math.min(sp.v, budget); sp.v -= use; budget -= use; weakClicks += use; if (budget <= 0) break; }
    const normal = clicks - weakClicks;
    const phased = m.has('phasing') && ((t * 1000) % PHASING_CYCLE_MS) >= PHASING_CYCLE_MS - PHASING_OFF_MS;
    const shield = shields ? Math.max(flat, phase ? phase[hp / maxHp > 2 / 3 ? 0 : hp / maxHp > 1 / 3 ? 1 : 2] : 0) : 0;
    const crit = shields ? Math.min(1, s.crit) : 0;
    const critMult = phase ? BOSS.critMult : 1; // the x2.5 crit bonus is for phase-shield fights only (Armored: crits just pierce)
    const normalHit = phased ? 0 : (crit * critMult + (1 - crit) * (1 - shield));
    const weakHitDmg = weakMult * (crit * critMult + (1 - crit) * 1);
    const oc = t < overUntil ? BOSS.overclock : 1;
    hp -= s.power * oc * (normal * normalHit + weakClicks * weakHitDmg);
    if (m.has('regen') && hp > 0) hp = Math.min(maxHp, hp + maxHp * BOSS.regen * dt);
    t += dt;
  }
  return hp / maxHp;
}
const requiredCps = (s: FightSetup, weakHit = WEAK_HIT) => {
  let lo = 0.2, hi = 60;
  if (fight(s, hi, weakHit) > 0) return Infinity;
  for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (fight(s, mid, weakHit) <= 0) hi = mid; else lo = mid; }
  return hi;
};

// ---------------- prestige spending ----------------
function spendPrestige() {
  const want = ['p_prod', 'p_crypto', 'p_click', 'p_prestige', 'p_starting', 'p_mega_prestige', 'p_crit'].filter(id => !(process.env.NOHEAD && id === 'p_starting'));
  const paragonWant = ['softcap_breaker', 'crypto_echo', 'persistent_momentum', 'overclock_lattice', 'quantum_ledger', 'singularity_tap', 'breach_driver', 'chrono_siege', 'abyss_core'];
  for (let k = 0; k < 5000; k++) {
    const opts: Array<{ c: number; buy: () => void }> = [];
    for (const p of prestige) if (want.includes(p.id) && p.count < p.maxLevel) opts.push({ c: Math.floor(p.cost * Math.pow(p.costMultiplier, p.count)), buy: () => { p.count++; } });
    if (OPT.paragon && asc >= 20) for (const u of PARAGON_UPGRADES) {
      if (process.env.PREMERGE && ['breach_driver', 'chrono_siege', 'abyss_core'].includes(u.id)) continue;
      if (!paragonWant.includes(u.id) || asc < (u.requiredAscensions ?? 0) || (u.requiresFinale && !finaleDone)) continue;
      const lvl = paragon[u.id] ?? 0; if (lvl >= u.maxLevel) continue;
      opts.push({ c: Math.floor(u.baseCost * Math.pow(u.costMultiplier, lvl)), buy: () => { paragon[u.id] = lvl + 1; } });
    }
    opts.sort((a, b) => a.c - b.c);
    if (!opts.length || opts[0].c > prestigeBank) break;
    prestigeBank -= opts[0].c; opts[0].buy();
  }
}
const BOON_PRIORITY: AbyssBoonId[] = ['surge', 'miner', 'harvest', 'echo_hunter', 'breach', 'striker', 'chrono', 'lethal', 'precision'];

// ---------------- main loop ----------------
console.log(`mode=${mode} clicks/s=${CLICKS_PER_S} fight cps=${FIGHT_CPS} weak-hit=${WEAK_HIT} | ${Object.entries(OPT).map(([k, v]) => `${k}=${v ? 'on' : 'off'}`).join(' ')}`);
const milestones: Record<number, number> = {};
let ascAt2h = -1;
const bossRows: string[] = [];
while (asc < stopAsc) {
  // finale gate at 50
  if (asc === 50 && !finaleDone && OPT.bosses) {
    let tries = 0;
    while (!finaleDone && tries < 10) {
      tries++;
      const s = fightSetup('finale', null, 50);
      if (fight(s, FIGHT_CPS, WEAK_HIT) <= 0) finaleDone = true; else finaleFails++;
      totalT += 90;
    }
    const s = fightSetup('finale', null, 50); s.weaken = signalCleared ? 0.15 : 0;
    console.log(`FINALE: ${finaleDone ? 'won' : 'LOST'} after ${tries} tries (needs ${requiredCps(s).toFixed(1)} cps on first try, power x${s.power.toFixed(2)}, time +${s.bonusSec}s)`);
  } else if (asc === 50 && !OPT.bosses) finaleDone = true;
  // Run Protocol: the player is offered 3 (not the previous one); oracle pick = the fastest run.
  let protocol: RunProtocolId | null = null;
  const seed = asc * 7919 + 13;
  let cands: Array<RunProtocolId | null> = [null];
  if (process.env.FIXED && asc >= 1) cands = [process.env.FIXED === 'standard' ? null : process.env.FIXED as RunProtocolId];
  else if (OPT.proto && asc >= 1) cands = [null, ...rollProtocolOffer(asc, prevProtocol)];
  const snapshot = lastDps;
  let bestT = Infinity, bestCv = BASE_CRYPTO_VALUE;
  if (cands.length > 1 || CV_LIST.length > 1) for (const cand of cands) for (const cv of CV_LIST) {
    lastDps = snapshot;
    const res = oneRun(cand, seed, cv);
    if (res.t < bestT) { bestT = res.t; protocol = cand; bestCv = cv; }
  } else protocol = cands[0];
  lastDps = snapshot;
  if (asc >= 1 && OPT.proto) { stats.protocolPicks[protocol ?? 'standard'] = (stats.protocolPicks[protocol ?? 'standard'] ?? 0) + 1; prevProtocol = protocol; }
  const r = oneRun(protocol, seed, bestCv);
  totalT += r.t;
  let gain = getPrestigeGainBreakdown(r.crypto, asc, prestige).total + r.contractPrestige;
  stats.contractCrypto += r.contractCrypto; stats.contractPrestige += r.contractPrestige; stats.eventCount += r.events;
  // boss fight for this ascension
  let bossNote = '';
  if (OPT.bosses) {
    const v = getBossVariant(asc);
    const kind: FightKind = v.kind === 'normal' ? 'normal' : v.kind;
    const s = fightSetup(kind, v, asc);
    const need = requiredCps(s);
    const needAssist = kind === 'normal' ? requiredCps(fightSetup(kind, v, asc, true)) : need;
    const won = need <= FIGHT_CPS || needAssist <= FIGHT_CPS;
    const bt = boonTotals();
    if (won) {
      stats.bossWins++;
      if (kind === 'signal') signalCleared = true;
      const echoMult = kind === 'echo' ? getEchoPrestigeMultiplier(v.depth ?? 10) + bt.echoBonus : 1;
      gain = Math.floor(gain * echoMult * (finaleDone ? bt.prestigeMultiplier : 1) * (v.modifiers.includes('bounty') ? BOUNTY_PRESTIGE_MULTIPLIER : 1));
    } else { stats.bossLosses++; const kept = Math.floor(gain * BOSS_DEFEAT_PRESTIGE_SHARE); stats.prestigeLostToDefeat += gain - kept; gain = kept; }
    bossNote = `${kind}${v.depth ? ' d' + v.depth : ''} [${v.modifiers.join(',')}] needs ${need === Infinity ? 'INF' : need.toFixed(1)} cps${kind === 'normal' ? ` (assist ${needAssist.toFixed(1)})` : ''} ${won ? 'WON' : 'LOST'}`;
    bossRows.push(`asc ${String(asc + 1).padStart(3)} ${bossNote}`);
  }
  prestigeBank += gain;
  asc++;
  if (totalT <= 2 * 3600) ascAt2h = asc;
  milestones[asc] = totalT;
  if (process.env.VERBOSE || asc <= 3 || asc % 5 === 0) console.log(`asc ${String(asc).padStart(3)} | run ${(r.t / 60).toFixed(1).padStart(6)} min | total ${(totalT / 3600).toFixed(2).padStart(6)} h | wait ${(r.longestGap / 60).toFixed(1)}m | +${gain} prestige | proto ${protocol ?? '-'} | ev ${r.events} | contract crypto ${(100 * r.contractCrypto / getAscensionCost(asc - 1)).toFixed(0)}%${process.env.VERBOSE ? ' | ' + bossNote : ''}`);
  // Endless boons (picked from the real seeded offer)
  if (finaleDone && asc > 50 && !process.env.PREMERGE) {
    while (Math.floor((asc - 50) / ABYSS_BOON_EVERY_DEPTHS) > boons.length) {
      const offer = getAbyssBoonOffer(boons.length);
      boons.push(BOON_PRIORITY.find(b => offer.includes(b))!);
    }
  }
  spendPrestige();
}
if (process.env.BOSSTABLE) console.log(bossRows.join('\n'));
const h = (a: number) => (milestones[a] !== undefined ? (milestones[a] / 3600).toFixed(2) + 'h' : '-');
console.log(`\nSUMMARY ${mode}: asc1 ${(milestones[1] / 60).toFixed(1)}m | asc reached in 2h: ${ascAt2h} | asc10 ${h(10)} asc20 ${h(20)} asc30 ${h(30)} asc40 ${h(40)} asc50 ${h(50)} | d10 ${h(60)} d25 ${h(75)} d50 ${h(100)}`);
console.log(`boss wins ${stats.bossWins} losses ${stats.bossLosses} (prestige lost ${stats.prestigeLostToDefeat}) | events ${stats.eventCount} | protocols ${JSON.stringify(stats.protocolPicks)}`);
console.log('prestige:', prestige.filter(p => p.count).map(p => `${p.id}:${p.count}`).join(' '));
console.log('paragon:', Object.entries(paragon).map(([k, v]) => `${k}:${v}`).join(' '), '| boons:', boons.join(','));
const pb = pBonuses(), bt = boonTotals();
console.log(`end multipliers: paragon prod x${pb.productionMultiplier.toFixed(2)} crypto x${pb.cryptoMultiplier.toFixed(2)} | boons prod +${bt.productionBoost}% crypto +${bt.cryptoBoost}% prestige x${bt.prestigeMultiplier.toFixed(2)} echo +${bt.echoBonus} | boss dmg x${(pb.bossDamageMultiplier * bt.bossDamageMultiplier).toFixed(2)} +${(pb as any).bossTimeSeconds + bt.bossBonusSeconds}s`);

// BOSSPROBE=1: clicks/s needed for the special fights at different crit chances and boss-damage levels.
if (process.env.BOSSPROBE) {
  console.log('\nBOSS PROBE (clicks/s needed; weak spots hit 70% / 0%)');
  const cases: Array<[string, FightKind, number, string[], number]> = [
    ['Core Signal (asc 45)', 'signal', 44, [], 0], ['THE CORE (asc 50, signal cleared)', 'finale', 50, [], 0],
    ['Echo I (d10)', 'echo', 60, ['volatile'], 1], ['Echo III (d30)', 'echo', 80, ['volatile', 'swift'], 3], ['Echo V (d50)', 'echo', 100, ['jammed', 'phasing', 'evasive'], 5], ['Echo X (d100)', 'echo', 150, ['bulky', 'volatile', 'bounty'], 10],
    ['Normal asc 49 bulky+volatile', 'normal', 48, ['bulky', 'volatile'], 0], ['Normal asc 49 armored+volatile', 'normal', 48, ['armored', 'volatile'], 0], ['Normal asc 49 no mods', 'normal', 48, [], 0],
  ];
  for (const [label, kind, level, mods, tier] of cases) {
    const row: string[] = [];
    for (const crit of [0.1, 0.2, 0.35, 0.6]) for (const power of [1, 1.5]) {
      const s: FightSetup = { kind, mods, level, power, bonusSec: 0, assist: false, weaken: kind === 'finale' ? 0.15 : 0, echoTier: tier, crit };
      row.push(`${requiredCps(s, 0.7).toFixed(1)}/${requiredCps(s, 0).toFixed(1)}`);
    }
    console.log(`${label.padEnd(34)} ${row.join('  ')}`);
  }
  console.log('columns: crit 10% (x1, x1.5 dmg) | crit 20% | crit 35% | crit 60%');
}
