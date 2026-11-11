// v1.04 Prestige Shop guidance: who each upgrade is for, and which affordable upgrade speeds up
// progress the most for its price. Reviews called the shop buffs "bad": idle players bought
// click/pickup upgrades and felt nothing, and 18 cards gave no hint where to start.

export type PrestigePlaystyle = 'everyone' | 'active' | 'idle';

const PLAYSTYLE_BY_ID: Record<string, PrestigePlaystyle> = {
  p_prod: 'everyone',
  p_crypto: 'everyone',
  p_prestige: 'everyone',
  p_mega_prestige: 'everyone',
  p_starting: 'everyone',
  p_sell: 'everyone',
  p_click: 'active',
  p_crit: 'active',
  p_crit_mult: 'active',
  p_mega_crit: 'active',
  p_luck: 'active',
  p_pickup: 'active',
  p_signal: 'active',
  p_timewarp_chance: 'active',
  p_timewarp_power: 'active',
  p_timewarp_sync: 'active',
  p_offline: 'idle',
  p_offline_window: 'idle',
};

export const getPrestigePlaystyle = (id: string): PrestigePlaystyle => PLAYSTYLE_BY_ID[id] ?? 'everyone';

type ShopUpgrade = {
  id: string;
  cost: number;
  costMultiplier: number;
  maxLevel: number;
  count: number;
  effect: { type: string; value: number };
};

export const getPrestigeLevelCost = (upgrade: Pick<ShopUpgrade, 'cost' | 'costMultiplier' | 'count'>): number =>
  Math.floor(upgrade.cost * Math.pow(upgrade.costMultiplier, upgrade.count));

// Rough share of overall progress speed that the next level adds. Production, crypto and prestige
// gain scale an ascension directly; clicks are only part of data income, so they count for less.
// Niche upgrades (crit, pickups, Time Warp, offline) are left out on purpose: they are good for
// some players, but never the safe default.
const nextLevelGain = (upgrade: ShopUpgrade): number => {
  const { type, value } = upgrade.effect;
  const relative = value / (1 + value * upgrade.count);
  if (type === 'production_boost' || type === 'crypto_boost' || type === 'prestige_mult') return relative;
  if (type === 'click_boost') return relative * 0.35;
  return 0;
};

/** The affordable upgrade with the best progress per prestige, or null when nothing fits the budget. */
export const getBestValuePrestigeUpgradeId = (upgrades: ShopUpgrade[], balance: number): string | null => {
  let bestId: string | null = null;
  let bestScore = 0;
  for (const upgrade of upgrades) {
    if (upgrade.count >= upgrade.maxLevel) continue;
    const cost = getPrestigeLevelCost(upgrade);
    if (cost <= 0 || cost > balance) continue;
    const score = nextLevelGain(upgrade) / cost;
    if (score > bestScore) {
      bestScore = score;
      bestId = upgrade.id;
    }
  }
  return bestId;
};
