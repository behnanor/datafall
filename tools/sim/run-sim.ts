// DataFall pacing sim: runs the REAL economy functions from useGame.ts (costs, production, ascension
// cost and reward), so it stays in sync with the game. Greedy player, 1-second steps.
// Approximate on purpose: ignores pickups, Time Warp, crits, contracts, loot boxes, bosses, Paragon,
// Black Market, cosmetics bought with Nodes. Prestige is spent greedily on the main stat upgrades.
//
// Usage:  npx esbuild tools/sim/run-sim.ts --bundle --platform=node --outfile=/tmp/sim.cjs \
//           --define:import.meta.env='{}' --alias:@=./client/src --log-level=error && node /tmp/sim.cjs [active|idle] [stopAsc]
import {
  INITIAL_STATE, PRESTIGE_UPGRADES, getAscensionCost, getPrestigeGainBreakdown,
  computeProductionRates, getEffectiveValue, type Upgrade,
} from '../../client/src/lib/useGame';

const mode = process.argv[2] || 'active';
const stopAsc = Number(process.argv[3] || 10);
const CLICKS_PER_S = mode === 'active' ? 5 : mode === 'casual' ? 2 : 0.5;
const NO_BOOSTS = { productionBoost: 0, clickBoost: 0, critBoost: 0, cryptoBoost: 0, critDamageBoost: 0 } as any;
const CRYPTO_VALUE = 400; // data/s that 1 crypto/s is worth to the greedy buyer

const prestige = PRESTIGE_UPGRADES.map(p => ({ ...p, count: 0 }));
let prestigeBank = 0;
let asc = 0;
let lastDps = 0;
let totalT = 0;

const costOf = (u: Upgrade) => {
  const c: Record<string, number> = {};
  for (const [k, v] of Object.entries(u.baseCost)) c[k] = Math.floor((v as number) * Math.pow(u.costMultiplier, u.count));
  return c;
};

function oneRun() {
  const ups: Upgrade[] = (INITIAL_STATE.upgrades as Upgrade[]).map(u => ({ ...u, count: asc > 0 && (u.id === 'unlock_click_upgrades' || u.id === 'unlock_crypto_mining' || u.id === 'zero_day') ? 1 : 0 }));
  const get = (id: string) => ups.find(u => u.id === id)!;
  const head = prestige.find(p => p.effect.type === 'starting_bonus')!;
  let data = head.count * head.effect.value * lastDps, credits = 0, crypto = 0;
  const need = getAscensionCost(asc);
  const clickBoost = prestige.filter(p => p.effect.type === 'click_boost').reduce((m, p) => m * (1 + p.effect.value * p.count), 1);
  let t = 0, lastBuy = 0, longestGap = 0, gapAt = 0;
  const events: string[] = [];
  const mark = (s: string) => events.push(`${(t / 60).toFixed(1)}m ${s}`);
  let rates = { data: 0, credits: 0, crypto: 0 };
  const recompute = () => { rates = computeProductionRates({ upgrades: ups, prestigeUpgrades: prestige, cosmeticBoosts: NO_BOOSTS, paragonProductionMultiplier: 1, paragonCryptoMultiplier: 1, adjacencyProductionBoost: 0, adjacencyCryptoBoost: 0 }); };
  recompute();
  while (crypto < need && t < 100 * 3600) {
    const click = (1 + ups.filter(u => u.effect.type === 'click').reduce((s, u) => s + getEffectiveValue(u), 0)) * clickBoost;
    data += rates.data + CLICKS_PER_S * click; credits += rates.credits; crypto += rates.crypto; t++;
    // greedy buying (sell data for Nodes at 100:1 when needed)
    for (let k = 0; k < 30; k++) {
      let best: { u: Upgrade; c: Record<string, number>; score: number } | null = null;
      for (const u of ups) {
        if ((u.requiredAscensions ?? 0) > asc) continue;
        const open = u.category === 'fabrication' || (u.category === 'click_upgrades' && get('unlock_click_upgrades').count > 0) || (u.category === 'crypto_mining' && get('unlock_crypto_mining').count > 0);
        if (!open) continue;
        const c = costOf(u);
        const dataCost = (c.data || 0) + Math.max(0, (c.credits || 0) - credits) * 100;
        if (u.effect.type === 'unlock') { if (u.count === 0 && data >= dataCost) { best = { u, c, score: -1 }; break; } continue; }
        let gain = 0;
        if (u.effect.type === 'production') {
          const before = getEffectiveValue(u) ; u.count++; const after = getEffectiveValue(u); u.count--;
          gain = after; void before;
          if (u.effect.resource === 'crypto') gain *= CRYPTO_VALUE;
        } else if (u.effect.type === 'click') gain = CLICKS_PER_S * u.effect.value * clickBoost;
        else continue;
        if (gain <= 0) continue;
        const score = dataCost / gain;
        if (!best || score < best.score) best = { u, c, score };
      }
      if (!best) break;
      const dataCost = (best.c.data || 0) + Math.max(0, (best.c.credits || 0) - credits) * 100;
      if (data < dataCost) break;
      const cr = best.c.credits || 0;
      if (credits < cr) { data -= (cr - credits) * 100; credits = cr; }
      credits -= cr; data -= best.c.data || 0;
      best.u.count++;
      if (best.u.count === 1) mark(`first ${best.u.id}`);
      const gap = t - lastBuy; if (gap > longestGap) { longestGap = gap; gapAt = lastBuy; }
      lastBuy = t;
      recompute();
    }
  }
  lastDps = rates.data;
  return { t, events, longestGap, gapAt, crypto };
}

console.log(`mode=${mode} clicks/s=${CLICKS_PER_S}`);
while (asc < stopAsc) {
  const r = oneRun();
  totalT += r.t;
  const gain = getPrestigeGainBreakdown(r.crypto, asc, prestige).total;
  prestigeBank += gain;
  asc++;
  console.log(`asc ${String(asc).padStart(2)} | run ${(r.t / 60).toFixed(1).padStart(6)} min | total ${(totalT / 3600).toFixed(2).padStart(6)} h | longest wait ${(r.longestGap / 60).toFixed(1)} min @${(r.gapAt / 60).toFixed(1)}m | +${gain} prestige`);
  if (asc === 1 || process.env.EVENTS) console.log('   ' + r.events.join(' | '));
  // spend prestige: cheapest of production/crypto/click/prestige-gain/head start
  const want = ['p_prod', 'p_crypto', 'p_click', 'p_prestige', 'p_starting', 'p_mega_prestige'];
  for (let k = 0; k < 500; k++) {
    const opts = prestige.filter(p => want.includes(p.id) && p.count < p.maxLevel).map(p => ({ p, c: Math.floor(p.cost * Math.pow(p.costMultiplier, p.count)) })).sort((a, b) => a.c - b.c);
    if (!opts.length || opts[0].c > prestigeBank) break;
    prestigeBank -= opts[0].c; opts[0].p.count++;
  }
}
console.log('prestige:', prestige.filter(p => p.count).map(p => `${p.id}:${p.count}`).join(' '));
