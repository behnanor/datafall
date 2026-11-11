import { emitJuiceBanner } from './juice';
import { isSpecialBoss, BOSS_DEFEAT_PRESTIGE_SHARE, pick6 } from './bossVariants';
import { getUnlockedAbyssVariants } from './endless';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { unlockSteamAchievement, isSteamAvailable } from './steamIntegration';
import { localizeInlineText, useI18n } from './i18n';
import {
  getLocalizedTutorialObjectiveText,
  getLocalizedTutorialPhaseText,
  getResourceLabel,
  getUpgradeCategoryLabel,
  localizePrestigeUpgradeText,
  localizeUpgradeText,
} from './gameText';
import {
  localizeAchievementText,
  localizeCatalogEntry,
  localizeContractText,
  localizeOptionalCatalogEntry,
} from './gameLocale';
// Note: steamIntegration.unlockSteamAchievement already accepts either an internal id or a Steam API name.
// Keeping useGame.ts free of extra mapping imports avoids missing-file build errors.

// Format numbers with B/T notation and thousand separators
export const formatNumber = (num: number): string => {
  if (!Number.isFinite(num)) return '0';

  const abs = Math.abs(num);
  if (abs < 1000) {
    if (Number.isInteger(num)) return num.toLocaleString();
    return num.toFixed(1).replace(/\.0$/, '');
  }

  const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  const rawTier = Math.floor(Math.log10(abs) / 3);
  if (rawTier >= suffixes.length) {
    return num.toExponential(2).replace('e+', 'e');
  }
  const tier = rawTier;
  const scaled = num / Math.pow(1000, tier);

  let value: string;
  const scaledAbs = Math.abs(scaled);
  if (scaledAbs >= 100) value = scaled.toFixed(0);
  else if (scaledAbs >= 10) value = scaled.toFixed(1);
  else value = scaled.toFixed(2);

  return `${value.replace(/\.0+$|(\.\d*[1-9])0+$/, '$1')}${suffixes[tier]}`;
};

export type ResourceType = 'credits' | 'data' | 'silicon' | 'interest' | 'crypto' | 'prestige';

export interface Resource {
  amount: number;
  perSecond: number;
  unlocked: boolean;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  cost: { [key in ResourceType]?: number };
  baseCost: { [key in ResourceType]?: number };
  effect: {
    type: 'production' | 'click' | 'click_multiplier' | 'crit_chance' | 'crit_multiplier' | 'unlock';
    resource?: ResourceType;
    value: number;
    unlocksCategory?: 'fabrication' | 'crypto_mining' | 'click_upgrades';
  };
  count: number;
  costMultiplier: number;
  category: 'fabrication' | 'crypto_mining' | 'click_upgrades';
  unlockedCategory?: 'click_upgrades' | 'crypto_mining';
  // Overclock tier: hidden and unbuyable until this many ascensions.
  requiredAscensions?: number;
}

// Contracts/Missions System - Unique objectives (different from achievements)
export type ContractObjectiveType = 
  | 'sell_data'           // Sell X data for credits (conversion challenge)
  | 'collect_pickups'     // Collect X floating pickups
  | 'spend_credits'       // Spend X credits on upgrades
  | 'reach_production'    // Reach X data/second production rate
  | 'rapid_clicks'        // Click X times quickly (within contract period)
  | 'crit_streak'         // Land X crits (tracked fresh per contract)
  | 'upgrade_single'      // Level up a single upgrade X times
  | 'maintain_resources'; // Keep resource above X threshold

export interface ContractNPC {
  id: string;
  name: string;
  title: string;
  avatar: string;
  color: string;
}

export interface Contract {
  id: string;
  npcId: string;
  title: string;
  description: string;
  objectiveType: ContractObjectiveType;
  targetAmount: number;
  currentProgress: number;
  rewards: {
    credits?: number;
    data?: number;
    crypto?: number;
    prestige?: number;
  };
  status: 'active' | 'completed' | 'claimed';
  expiresAt: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface ContractsState {
  activeContracts: Contract[];
  completedToday: number;
  lastRefreshTime: number;
  totalContractsCompleted: number;
  refreshesRemaining: number; // 3 refreshes per run, resets on ascension
}

// Room Organizer - Machine Positions
export interface MachinePosition {
  upgradeId: string;
  gridX: number;
  gridY: number;
}

export interface RoomLayout {
  version?: number;
  machinePositions: MachinePosition[];
}

// -----------------------------
// Definitions that were implicitly relied on elsewhere in this file.
// In the original project these likely lived above, or were imported from
// other modules. If those modules exist in your repo, you can switch back to
// imports later, but these local definitions stop the build/runtime from
// exploding.
// -----------------------------

// Music playlist used by the background music system.
// Empty-string entry is intentionally safe: HTMLAudioElement accepts it and
// will just fail to load instead of crashing the game.
const MUSIC_TRACKS: string[] = [
  '/DreamCybers2_1.mp3',
  '/DreamCybers2_2.mp3',
  '/Untitled.mp3',
  '/boatt_1764627346155.mp3',
];

// Floating pickup list cap (prevents unbounded growth)
const MAX_FLOATING_PICKUPS = 24;
const FLOATING_PICKUP_LIFETIME_MS = 30000;
const AUTO_PICKUP_MIN_DELAY_MS = 42000;
const AUTO_PICKUP_MAX_DELAY_MS = 60000;
const AUTO_PICKUP_MIN_DELAY_MULTIPLIER = 0.82;
const AUTO_PICKUP_DYNAMIC_MIN_DELAY_MULTIPLIER = 0.8;
const TIME_WARP_BASE_TRIGGER_CHANCE = 0.05;
const TIME_WARP_BASE_COOLDOWN_MS = 100000;
const TIME_WARP_MIN_COOLDOWN_MS = 30000;
const TIME_WARP_MAX_BONUS_SECONDS = 3 * 60 * 60;
const TIME_WARP_PITY_STREAK_MIN = 5;
const TIME_WARP_PITY_STREAK_MAX = 13;
const TIME_WARP_COOLDOWN_JITTER_MIN = 0.72;
const TIME_WARP_COOLDOWN_JITTER_MAX = 1.35;
const COMBO_CHAIN_MIN_SPAWNS = 6;
const COMBO_CHAIN_MAX_SPAWNS = 7;
const COMBO_CHAIN_STEP_MS = 130;
const COMBO_CHAIN_PICKUP_LIFETIME_MS = 4200;
const COMBO_CHAIN_FINAL_REWARD_MULTIPLIER = 1;
const AUTOCLICK_PICKUP_BASE_DURATION_MS = 12000;
const CRIT_PICKUP_BASE_DURATION_MS = 7000;
const UPGRADE_PACE_BASE_INTERVAL_MS = 20000;
const UPGRADE_PACE_MAX_SPEEDUP = 2.35;
const TIME_WARP_MINIGAME_DURATION_MS = 7000;
const TIME_WARP_MINIGAME_SMOOTH_CAP = 9.5;
const TIME_WARP_MINIGAME_CADENCE_BASE = 0.25;
const TIME_WARP_MINIGAME_CADENCE_WINDOW_MS = 170;
const TIME_WARP_REWARD_VARIANCE_MIN = 0.82;
const TIME_WARP_REWARD_VARIANCE_MAX = 1.22;
const TIME_WARP_REWARD_SPIKE_CHANCE = 0.14;
const TIME_WARP_REWARD_SPIKE_MIN = 1.22;
const TIME_WARP_REWARD_SPIKE_MAX = 1.42;
// v1.03 economy: ascension cost follows a power curve instead of an exponential one, so it keeps
// pace with prestige power. Sim (audit/v1.03-sim.md): asc 50 after ~52 h of active play.
const ASCENSION_BASE_COST = 600;
const ASCENSION_COST_POWER = 2.65;
const ASCENSION_PASSIVE_PRESTIGE_ASSIST_SHARE = 0.35;
const ASCENSION_PASSIVE_PRESTIGE_TARGET_MULTIPLIER = 4.5;
const ASCENSION_PASSIVE_PRESTIGE_MAX_BONUS =
  (ASCENSION_PASSIVE_PRESTIGE_TARGET_MULTIPLIER - 1) * ASCENSION_PASSIVE_PRESTIGE_ASSIST_SHARE;
const ASCENSION_PRESTIGE_FLAT_BASE = 120;
const ASCENSION_PRESTIGE_BASE_MULTIPLIER = 6;
const ASCENSION_PRESTIGE_FLAT_PER_ASCENSION = 25;
// Holding more crypto than required pays off: +50% reward per doubling of the requirement, up to x3.
const ASCENSION_OVERSHOOT_PER_DOUBLING = 0.5;
const ASCENSION_OVERSHOOT_MAX_MULTIPLIER = 3;
// Passive credit (Node) income as a share of data production, online and offline.
export const CREDIT_TRICKLE_RATE = 0.01;
// v1.04 "pay with data": after the first ascension, buying something you are short on Nodes for
// sells just enough data for the missing Nodes (same rate as the Convert button). Selling by hand
// before every rig was a chore with no decision in it; the tutorial still teaches Convert first.
export const AUTO_SELL_UNLOCK_ASCENSION = 1;
export interface NodeSaleRate { dataPerNode: number; nodesPerSale: number }
export const getAutoSellPlan = (
  cost: Partial<Record<string, number>>,
  have: { data: number; credits: number },
  rate: NodeSaleRate | null | undefined,
): { dataToSell: number; nodesGained: number } | null => {
  const missingNodes = (cost.credits ?? 0) - have.credits;
  if (!rate || missingNodes <= 0 || rate.dataPerNode <= 0 || rate.nodesPerSale <= 0) return null;
  let sales = Math.ceil(missingNodes / rate.nodesPerSale);
  if (Math.floor(sales * rate.nodesPerSale) < missingNodes) sales += 1;
  const dataToSell = sales * rate.dataPerNode;
  if (have.data - (cost.data ?? 0) < dataToSell) return null;
  return { dataToSell, nodesGained: Math.floor(sales * rate.nodesPerSale) };
};
// Save-data marker for the v1.03 economy migration (prestige merges/refunds). Saves stay v11.
const ECONOMY_VERSION = 103;
// Test builds (VITE_TEST_BUILD=true) save separately and start from a read-only copy of the live save.
export const IS_TEST_BUILD = import.meta.env.VITE_TEST_BUILD === 'true';
// Demo build: ascensions stop at DEMO_ASCENSION_LIMIT and an end screen links to the full game.
export const IS_DEMO_BUILD = import.meta.env.VITE_DEMO_BUILD === 'true';
export const DEMO_ASCENSION_LIMIT = Math.max(1, Number(import.meta.env.VITE_DEMO_ASCENSION_LIMIT) || 1); // March demo: ended at the first ascension
// Automation (unlocks at ascension 15): auto-buy miners/rigs and auto-ascend at a crypto multiple.
export const AUTOMATION_UNLOCK_ASCENSION = 15;
export const AUTO_ASCEND_MULTIPLE_OPTIONS = [1, 1.5, 2, 3, 5] as const;
export const AUTO_BUY_MODES = ['cheapest', 'payback', 'crypto'] as const;
export type AutoBuyMode = (typeof AUTO_BUY_MODES)[number];
export interface AutomationSettings {
  autoBuy: boolean;
  autoBuyMode: AutoBuyMode;
  autoAscend: boolean;
  autoAscendMultiple: number;
}
const INITIAL_AUTOMATION: AutomationSettings = { autoBuy: false, autoBuyMode: 'cheapest', autoAscend: false, autoAscendMultiple: 2 };
const migrateAutomation = (saved: unknown): AutomationSettings => {
  const s = (saved || {}) as Partial<AutomationSettings>;
  const multiple = Number(s.autoAscendMultiple);
  return {
    autoBuy: !!s.autoBuy,
    autoBuyMode: (AUTO_BUY_MODES as readonly string[]).includes(s.autoBuyMode as string) ? (s.autoBuyMode as AutoBuyMode) : 'cheapest',
    autoAscend: !!s.autoAscend,
    autoAscendMultiple: (AUTO_ASCEND_MULTIPLE_OPTIONS as readonly number[]).includes(multiple) ? multiple : INITIAL_AUTOMATION.autoAscendMultiple,
  };
};

export interface TutorialObjective {
  id: string;
  text: string;
}

export interface TutorialPhase {
  title: string;
  description: string;
}

export type TutorialPhaseWithObjectives = TutorialPhase & {
  objectives: Array<TutorialObjective & { completed: boolean }>;
  reward?: { resource: 'data' | 'credits'; amount: number } | null;
  phaseIndex?: number;
  phaseCount?: number;
};


export interface TutorialState {
  started?: boolean;
  skipped: boolean;
  currentPhase: number;
  completedObjectives: string[];
  rewardGranted?: boolean;
  /** Number of phases whose small step reward was already paid. */
  phaseRewardsGranted?: number;
  version?: number;
}

export type TutorialRewardCosmeticType = 'skin' | 'theme' | 'accessory' | 'headstyle' | 'pet';

export interface TutorialReward {
  cosmeticType: TutorialRewardCosmeticType;
  itemId: string;
  itemName: string;
  itemDescription: string;
  price: number;
  currency: 'credits' | 'crypto' | 'ascension';
}

// v1.04: the tutorial now follows the real core loop (click -> miner -> nodes -> click tab ->
// mining -> ascend). Camera/right-click tips live in the panel footer instead of being
// required steps, and Prestige/Cosmetics are only pointed at after the first ascension
// (players have nothing to spend there before that).
export const TUTORIAL_VERSION = 2;

const TUTORIAL_PHASES: TutorialPhase[] = [
  { title: 'Boot Sequence', description: 'Click the core to pull data, then let a miner do it for you.' },
  { title: 'Data Market', description: 'Sell data for Nodes and use them to unlock the Click tab.' },
  { title: 'Click Power', description: 'Make every click stronger, then open the Mining protocol.' },
  { title: 'Mining', description: 'Mining rigs turn Nodes into crypto. Crypto is what you need to Ascend.' },
  { title: 'Ascension', description: 'Collect enough crypto, then Ascend for Prestige. After your first ascension, spend Prestige in the Prestige Shop and check the Cosmetics Market.' },
];

const TUTORIAL_OBJECTIVES: Array<{ objectives: TutorialObjective[] }> = [
  {
    objectives: [
      { id: 'click_core', text: 'Click the core to generate your first data.' },
      { id: 'buy_first_upgrade', text: 'Buy a Basic Data Miner in the Factory tab (10 data).' },
    ],
  },
  {
    objectives: [
      { id: 'convert_data', text: 'Convert data into nodes using the Convert controls. (100 Data = 1 Node)' },
      { id: 'unlock_click_tab', text: 'Buy Manual Intrusion Protocol (5 Nodes) to unlock the Click tab.' },
    ],
  },
  {
    objectives: [
      { id: 'buy_click_upgrade', text: 'Buy Manual Override in the Click tab.' },
      { id: 'unlock_mining', text: 'Buy Mining Protocol Access in the Click tab to unlock Mining.' },
    ],
  },
  {
    objectives: [
      { id: 'open_mining_tab', text: 'Open the Mining tab.' },
      { id: 'earn_crypto', text: 'Buy a Basic Mining Rig and start earning crypto.' },
    ],
  },
  {
    objectives: [
      { id: 'open_ascend', text: 'Open the Ascend window (check reset rewards and requirements).' },
    ],
  },
];

// Small reward for finishing each phase, so progress feels good right away.
// Tuned to the next step's cost so it helps without skipping the loop.
// The last phase keeps its cosmetic reward (see getTutorialRewardCandidate).
export const TUTORIAL_PHASE_REWARDS: Array<{ resource: 'data' | 'credits'; amount: number } | null> = [
  { resource: 'data', amount: 50 },
  { resource: 'credits', amount: 10 },
  { resource: 'credits', amount: 40 },
  { resource: 'data', amount: 1000 },
  null,
];

const TUTORIAL_ALL_OBJECTIVE_IDS = TUTORIAL_OBJECTIVES.flatMap(p => p.objectives.map(o => o.id));

const INITIAL_TUTORIAL: TutorialState = {
  started: false,
  skipped: false,
  currentPhase: 0,
  completedObjectives: [],
  rewardGranted: false,
  phaseRewardsGranted: 0,
  version: TUTORIAL_VERSION,
};

const CLICK_UPGRADE_DISCOUNT_RATE = 0.22;
const applyClickUpgradeDiscount = (cost: number): number =>
  Math.max(1, Math.floor(cost * (1 - CLICK_UPGRADE_DISCOUNT_RATE)));

const resolveTutorialPhase = (currentPhase: number, completedObjectives: string[]): number => {
  let phase = currentPhase;

  while (phase < TUTORIAL_PHASES.length - 1) {
    const phaseObjectives = TUTORIAL_OBJECTIVES[phase]?.objectives || [];
    const isPhaseComplete = phaseObjectives.every(obj => completedObjectives.includes(obj.id));
    if (!isPhaseComplete) break;
    phase += 1;
  }

  return phase;
};

// Tutorial saves from before v1.04 used 6 phases (with camera, Prestige and Cosmetics steps).
// Finished tutorials stay finished; unfinished ones restart at the first open step of the new flow.
const migrateTutorial = (saved: unknown): TutorialState => {
  const raw = (saved && typeof saved === 'object' ? saved : {}) as Partial<TutorialState>;
  const completedObjectives = Array.isArray(raw.completedObjectives)
    ? raw.completedObjectives.filter((id): id is string => typeof id === 'string')
    : [];
  const merged: TutorialState = {
    ...INITIAL_TUTORIAL,
    ...raw,
    skipped: !!raw.skipped,
    rewardGranted: !!raw.rewardGranted,
    completedObjectives,
  };

  if ((raw.version ?? 1) < TUTORIAL_VERSION) {
    const lastPhase = TUTORIAL_PHASES.length - 1;
    const wasFinished = !!raw.rewardGranted || completedObjectives.includes('open_ascend');
    if (wasFinished) {
      merged.completedObjectives = Array.from(new Set([...completedObjectives, ...TUTORIAL_ALL_OBJECTIVE_IDS]));
      merged.currentPhase = lastPhase;
    } else {
      merged.currentPhase = resolveTutorialPhase(0, completedObjectives);
    }
    merged.version = TUTORIAL_VERSION;
  }

  const phase = Number.isFinite(merged.currentPhase) ? Math.floor(merged.currentPhase) : 0;
  merged.currentPhase = Math.max(0, Math.min(TUTORIAL_PHASES.length - 1, phase));
  // Old saves (or saves without the field) get no retroactive step rewards.
  const granted = (raw.version ?? 1) >= TUTORIAL_VERSION && typeof raw.phaseRewardsGranted === 'number' && Number.isFinite(raw.phaseRewardsGranted)
    ? Math.floor(raw.phaseRewardsGranted)
    : merged.currentPhase;
  merged.phaseRewardsGranted = Math.max(0, Math.min(TUTORIAL_PHASES.length, granted));
  return merged;
};

// Migration helpers: merge saved data with the current canonical definitions.
// These prevent old saves (or partially written cloud saves) from breaking the game.
const migrateUpgrades = (saved: unknown): Upgrade[] => {
  const base = (INITIAL_STATE.upgrades as Upgrade[]).map(u => ({ ...u }));
  if (!Array.isArray(saved)) return base;

  const savedCounts = new Map<string, number>();
  for (const item of saved) {
    const id = (item as any)?.id;
    const count = (item as any)?.count;
    if (typeof id === 'string' && typeof count === 'number' && Number.isFinite(count)) {
      savedCounts.set(id, Math.max(0, Math.floor(count)));
    }
  }

  return base.map(u => ({
    ...u,
    count: savedCounts.get(u.id) ?? u.count ?? 0,
  }));
};

const migratePrestigeUpgrades = (saved: unknown): PrestigeUpgrade[] => {
  const base = PRESTIGE_UPGRADES.map(p => ({ ...p }));
  if (!Array.isArray(saved)) return base;

  const legacyIdMap: Record<string, string> = {
    p_auto: 'p_crypto',
    p_cost: 'p_sell',
  };

  const savedCounts = new Map<string, number>();
  for (const item of saved) {
    const id = (item as any)?.id;
    const count = (item as any)?.count;
    if (typeof id === 'string' && typeof count === 'number' && Number.isFinite(count)) {
      const targetId = legacyIdMap[id] ?? id;
      const nextCount = Math.max(0, Math.floor(count));
      savedCounts.set(targetId, (savedCounts.get(targetId) ?? 0) + nextCount);
    }
  }

  return base.map(p => ({
    ...p,
    count: Math.min(p.maxLevel, savedCounts.get(p.id) ?? p.count ?? 0),
  }));
};

export const INITIAL_STATE = {
  resources: {
    credits: { amount: 0, perSecond: 0, unlocked: true },
    data: { amount: 0, perSecond: 0, unlocked: true },
    silicon: { amount: 0, perSecond: 0, unlocked: false },
    interest: { amount: 0, perSecond: 0, unlocked: true },
    crypto: { amount: 0, perSecond: 0, unlocked: true },
    prestige: { amount: 0, perSecond: 0, unlocked: true },
  },
  upgrades: [
    // Fabrication - Unlock Click
    {
      id: 'unlock_click_upgrades',
      name: 'Manual Intrusion Protocol',
      description: 'Unlock direct manual execution methods.',
      cost: { credits: 5 },
      baseCost: { credits: 5 },
      effect: { type: 'unlock', value: 1, unlocksCategory: 'click_upgrades' },
      count: 0,
      costMultiplier: 1,
      category: 'fabrication',
      unlockedCategory: 'click_upgrades',
    },
    // Fabrication
    {
      id: 'data_miner_v1',
      name: 'Basic Data Miner',
      description: 'Simple script to mine Data automatically.',
      cost: { data: 10 },
      baseCost: { data: 10 },
      effect: { type: 'production', resource: 'data', value: 1 },
      count: 0,
      costMultiplier: 1.15,
      category: 'fabrication',
    },
    {
      id: 'data_miner_v2',
      name: 'Advanced Data Miner',
      description: 'Optimized algorithms for faster Data mining.',
      cost: { data: 150 },
      baseCost: { data: 150 },
      effect: { type: 'production', resource: 'data', value: 5 },
      count: 0,
      costMultiplier: 1.15,
      category: 'fabrication',
    },
    {
      id: 'botnet_node',
      name: 'Botnet Cluster',
      description: 'Infects vulnerable devices to mine Data en masse.',
      cost: { data: 2000 },
      baseCost: { data: 2000 },
      effect: { type: 'production', resource: 'data', value: 30 },
      count: 0,
      costMultiplier: 1.15,
      category: 'fabrication',
    },
    {
      id: 'quantum_server',
      name: 'Quantum Server',
      description: 'Leverages quantum superposition for massive Data yields.',
      cost: { data: 25000 },
      baseCost: { data: 25000 },
      effect: { type: 'production', resource: 'data', value: 200 },
      count: 0,
      costMultiplier: 1.15,
      category: 'fabrication',
    },
    {
      id: 'ai_core',
      name: 'AI Core',
      description: 'Self-improving AI that generates Data at an exponential rate.',
      cost: { data: 300000 },
      baseCost: { data: 300000 },
      effect: { type: 'production', resource: 'data', value: 1500 },
      count: 0,
      costMultiplier: 1.15,
      category: 'fabrication',
    },
    {
      id: 'neural_network',
      name: 'Global Neural Network',
      description: 'Connects the entire planet to your Data processing grid.',
      cost: { data: 3500000 },
      baseCost: { data: 3500000 },
      effect: { type: 'production', resource: 'data', value: 12000 },
      count: 0,
      costMultiplier: 1.15,
      category: 'fabrication',
    },
    {
      id: 'singularity_nexus',
      name: 'Singularity Nexus',
      description: 'Transcends reality itself. Infinite computational recursion.',
      cost: { data: 40000000 },
      baseCost: { data: 40000000 },
      effect: { type: 'production', resource: 'data', value: 100000 },
      count: 0,
      costMultiplier: 1.15,
      category: 'fabrication',
    },
    // Overclock tier (ascension 40)
    {
      id: 'overclock_core',
      name: 'Overclocked Core',
      description: 'A singularity core pushed far past its safety limits.',
      cost: { data: 500000000 },
      baseCost: { data: 500000000 },
      effect: { type: 'production', resource: 'data', value: 800000 },
      count: 0,
      costMultiplier: 1.15,
      category: 'fabrication',
      requiredAscensions: 40,
    },
    // Click Upgrades - Unlock Crypto Mining
    {
      id: 'unlock_crypto_mining',
      name: 'Mining Protocol Access',
      description: 'Establish connection to decentralized mining networks.',
      cost: { data: 1500, credits: 60 }, // v1.03: was 3,900 + 156; first ascension ~63 -> ~30 min (sim)
      baseCost: { data: 1500, credits: 60 },
      effect: { type: 'unlock', value: 1, unlocksCategory: 'crypto_mining' },
      count: 0,
      costMultiplier: 1,
      category: 'click_upgrades',
      unlockedCategory: 'crypto_mining',
    },
    // Click Upgrades
    {
      id: 'manual_override',
      name: 'Manual Override',
      description: 'Increases base click value by 1.',
      cost: { data: applyClickUpgradeDiscount(25) },
      baseCost: { data: applyClickUpgradeDiscount(25) },
      effect: { type: 'click', value: 1 },
      count: 0,
      costMultiplier: 1.23,
      category: 'click_upgrades',
    },
    {
      id: 'zero_day',
      name: 'Zero-Day Payload',
      description: 'Increases chance to find critical vulnerabilities (+0.5% per level).',
      cost: { data: applyClickUpgradeDiscount(3500), credits: applyClickUpgradeDiscount(80) },
      baseCost: { data: applyClickUpgradeDiscount(3500), credits: applyClickUpgradeDiscount(80) },
      effect: { type: 'crit_chance', value: 0.005 }, // +0.5% chance
      count: 0,
      costMultiplier: 1.24,
      category: 'click_upgrades',
    },
    {
      id: 'exploit_finder',
      name: 'Exploit Finder',
      description: 'Increases critical hit damage multiplier.',
      cost: { data: applyClickUpgradeDiscount(800), credits: applyClickUpgradeDiscount(40) },
      baseCost: { data: applyClickUpgradeDiscount(800), credits: applyClickUpgradeDiscount(40) },
      effect: { type: 'crit_multiplier', value: 1.5 }, // +1.5x multiplier per level
      count: 0,
      costMultiplier: 1.24,
      category: 'click_upgrades',
    },
    // Crypto Mining Upgrades (buy with credits, generate crypto)
    {
      id: 'crypto_rig_basic',
      name: 'Basic Mining Rig',
      description: 'A simple crypto mining setup. Generates crypto passively.',
      cost: { credits: 100 },
      baseCost: { credits: 100 },
      effect: { type: 'production', resource: 'crypto', value: 0.5 },
      count: 0,
      costMultiplier: 1.15,
      category: 'crypto_mining',
    },
    {
      id: 'crypto_rig_advanced',
      name: 'Advanced Mining Rig',
      description: 'High-performance mining hardware for faster crypto generation.',
      cost: { credits: 1000 },
      baseCost: { credits: 1000 },
      effect: { type: 'production', resource: 'crypto', value: 3 },
      count: 0,
      costMultiplier: 1.15,
      category: 'crypto_mining',
    },
    {
      id: 'crypto_farm',
      name: 'Crypto Farm',
      description: 'Industrial-scale crypto mining operation.',
      cost: { credits: 10000 },
      baseCost: { credits: 10000 },
      effect: { type: 'production', resource: 'crypto', value: 20 },
      count: 0,
      costMultiplier: 1.15,
      category: 'crypto_mining',
    },
    {
      id: 'quantum_miner',
      name: 'Quantum Miner',
      description: 'Quantum computing applied to blockchain algorithms.',
      cost: { credits: 100000 },
      baseCost: { credits: 100000 },
      effect: { type: 'production', resource: 'crypto', value: 150 },
      count: 0,
      costMultiplier: 1.15,
      category: 'crypto_mining',
    },
    {
      id: 'mining_datacenter',
      name: 'Mining Datacenter',
      description: 'Massive facility dedicated to crypto extraction.',
      cost: { credits: 1000000 },
      baseCost: { credits: 1000000 },
      effect: { type: 'production', resource: 'crypto', value: 1200 },
      count: 0,
      costMultiplier: 1.15,
      category: 'crypto_mining',
    },
    // Overclock tier (ascension 40)
    {
      id: 'overclock_rig',
      name: 'Overclocked Rig',
      description: 'Liquid-cooled mining array running far beyond spec.',
      cost: { credits: 10000000 },
      baseCost: { credits: 10000000 },
      effect: { type: 'production', resource: 'crypto', value: 10000 },
      count: 0,
      costMultiplier: 1.15,
      category: 'crypto_mining',
      requiredAscensions: 40,
    }
  ] as Upgrade[],
};

// Calculate checkpoint multiplier
export const getCheckpointMultiplier = (count: number, category?: string): number => {
  // Crypto mining uses 25-level checkpoints
  if (category === 'crypto_mining') {
    if (count >= 100) return 8; // Was 4
    if (count >= 75) return 6;  // Was 3.5
    if (count >= 50) return 4.5; // Was 3
    if (count >= 25) return 2.5; // Was 2
    return 1;
  }
  // Click upgrades and fabrication use 25-level checkpoints
  if (count >= 100) return 10; // Was 4
  if (count >= 75) return 7.5; // Was 3.5
  if (count >= 50) return 5;   // Was 3
  if (count >= 25) return 3;   // Was 2
  return 1;
};

const ROOM_LAYOUT_VERSION = 2;
const ROOM_LAYOUT_GRID_SIZE = 8;
const ADJACENCY_PATTERN_MIN_LENGTH = 3;
const ADJACENCY_CLICK_BOOST_PER_CHAIN = 2.5;
const ADJACENCY_PRODUCTION_BOOST_PER_CHAIN = 2.5;
const ADJACENCY_CRYPTO_BOOST_PER_CLUSTER = 3;
const ADJACENCY_CLICK_LUCK_PER_CHAIN = 0.6;
const ADJACENCY_PRODUCTION_LUCK_PER_CHAIN = 0.6;
const ADJACENCY_CRYPTO_LUCK_PER_CLUSTER = 1;
const ADJACENCY_MAX_CLICK_BOOST = 30;
const ADJACENCY_MAX_PRODUCTION_BOOST = 40;
const ADJACENCY_MAX_CRYPTO_BOOST = 35;
const ADJACENCY_MAX_LUCK_BOOST = 20;

interface AdjacencyFormationState {
  machineCount: number;
  adjacentPairs: number;
  clickChains: number;
  productionChains: number;
  cryptoClusters: number;
  clickBoostPercent: number;
  productionBoostPercent: number;
  cryptoBoostPercent: number;
  luckFromClickPercent: number;
  luckFromProductionPercent: number;
  luckFromCryptoPercent: number;
  luckBoostPercent: number;
}

const migrateRoomLayout = (saved: unknown): RoomLayout => {
  if (!saved || typeof saved !== 'object') {
    return { version: ROOM_LAYOUT_VERSION, machinePositions: [] };
  }

  const layout = saved as any;
  const positions = Array.isArray(layout.machinePositions) ? layout.machinePositions : [];
  const isCurrentVersion = layout.version === ROOM_LAYOUT_VERSION;

  const mapped: MachinePosition[] = positions
    .map((pos: any) => {
      if (!pos || typeof pos.upgradeId !== 'string') return null;
      const x = Number(pos.gridX);
      const y = Number(pos.gridY);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

      // v2 convention: gridX = column, gridY = row.
      // Legacy data had these two axes swapped.
      const col = isCurrentVersion ? x : y;
      const row = isCurrentVersion ? y : x;

      return {
        upgradeId: pos.upgradeId,
        gridX: Math.max(0, Math.min(ROOM_LAYOUT_GRID_SIZE - 1, Math.floor(col))),
        gridY: Math.max(0, Math.min(ROOM_LAYOUT_GRID_SIZE - 1, Math.floor(row))),
      };
    })
    .filter((v: MachinePosition | null): v is MachinePosition => v !== null);

  // Keep one machine per upgrade and one machine per tile.
  const seenUpgrades = new Set<string>();
  const seenTiles = new Set<string>();
  const deduped = mapped.filter((pos: MachinePosition) => {
    if (seenUpgrades.has(pos.upgradeId)) return false;
    const tileKey = `${pos.gridX}:${pos.gridY}`;
    if (seenTiles.has(tileKey)) return false;
    seenUpgrades.add(pos.upgradeId);
    seenTiles.add(tileKey);
    return true;
  });

  return { version: ROOM_LAYOUT_VERSION, machinePositions: deduped };
};

const toRoomTileKey = (gridX: number, gridY: number): string => `${gridX}:${gridY}`;

const clampRoomGridCoord = (value: number): number =>
  Math.max(0, Math.min(ROOM_LAYOUT_GRID_SIZE - 1, Math.floor(value)));

const generateDeterministicRoomTile = (upgradeId: string): { gridX: number; gridY: number } => {
  const hash = upgradeId.split('').reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0);
  const seededRandom = Math.abs(Math.sin(hash) * 10000) % 1;
  const gridY = Math.floor(seededRandom * ROOM_LAYOUT_GRID_SIZE);
  const gridX = Math.floor(((seededRandom * 100) % 1) * ROOM_LAYOUT_GRID_SIZE);
  return { gridX, gridY };
};

const resolveNearestFreeRoomTile = (
  preferredGridX: number,
  preferredGridY: number,
  occupiedTiles: Set<string>
): { gridX: number; gridY: number } => {
  const startX = clampRoomGridCoord(preferredGridX);
  const startY = clampRoomGridCoord(preferredGridY);
  const startKey = toRoomTileKey(startX, startY);

  if (!occupiedTiles.has(startKey)) {
    return { gridX: startX, gridY: startY };
  }

  let best: { gridX: number; gridY: number; distance: number } | null = null;
  for (let gridY = 0; gridY < ROOM_LAYOUT_GRID_SIZE; gridY++) {
    for (let gridX = 0; gridX < ROOM_LAYOUT_GRID_SIZE; gridX++) {
      const key = toRoomTileKey(gridX, gridY);
      if (occupiedTiles.has(key)) continue;
      const distance = Math.abs(gridX - startX) + Math.abs(gridY - startY);
      if (
        !best ||
        distance < best.distance ||
        (distance === best.distance && (gridY < best.gridY || (gridY === best.gridY && gridX < best.gridX)))
      ) {
        best = { gridX, gridY, distance };
      }
    }
  }

  return best ? { gridX: best.gridX, gridY: best.gridY } : { gridX: startX, gridY: startY };
};

const countLinearPatternSets = (values: number[], minLength: number): number => {
  if (values.length < minLength) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  let sets = 0;
  let runStart = 0;

  for (let i = 1; i <= sorted.length; i++) {
    const isBoundary = i === sorted.length || sorted[i] !== sorted[i - 1] + 1;
    if (!isBoundary) continue;
    const runLength = i - runStart;
    if (runLength >= minLength) {
      sets += Math.floor(runLength / minLength);
    }
    runStart = i;
  }

  return sets;
};

const buildEffectiveMachineLayout = (
  upgrades: Upgrade[],
  savedPositions: MachinePosition[]
): MachinePosition[] => {
  const savedByUpgradeId = new Map<string, MachinePosition>(
    savedPositions.map(position => [position.upgradeId, position])
  );

  const occupiedTiles = new Set<string>();
  const resolved: MachinePosition[] = [];

  upgrades.forEach(upgrade => {
    if (upgrade.count <= 0) return;
    if (upgrade.effect.type !== 'production' || !upgrade.effect.resource) return;

    const savedPosition = savedByUpgradeId.get(upgrade.id);
    const fallback = generateDeterministicRoomTile(upgrade.id);
    const preferredGridX = savedPosition?.gridX ?? fallback.gridX;
    const preferredGridY = savedPosition?.gridY ?? fallback.gridY;
    const tile = resolveNearestFreeRoomTile(preferredGridX, preferredGridY, occupiedTiles);

    occupiedTiles.add(toRoomTileKey(tile.gridX, tile.gridY));
    resolved.push({
      upgradeId: upgrade.id,
      gridX: tile.gridX,
      gridY: tile.gridY,
    });
  });

  return resolved;
};

const calculateAdjacencyFormation = (positions: MachinePosition[]): AdjacencyFormationState => {
  const occupiedTiles = new Set<string>(positions.map(pos => toRoomTileKey(pos.gridX, pos.gridY)));

  let adjacentPairs = 0;
  positions.forEach(pos => {
    if (occupiedTiles.has(toRoomTileKey(pos.gridX + 1, pos.gridY))) adjacentPairs += 1;
    if (occupiedTiles.has(toRoomTileKey(pos.gridX, pos.gridY + 1))) adjacentPairs += 1;
  });

  const rowToColumns = new Map<number, number[]>();
  const columnToRows = new Map<number, number[]>();
  positions.forEach(pos => {
    const rowCols = rowToColumns.get(pos.gridY) ?? [];
    rowCols.push(pos.gridX);
    rowToColumns.set(pos.gridY, rowCols);

    const colRows = columnToRows.get(pos.gridX) ?? [];
    colRows.push(pos.gridY);
    columnToRows.set(pos.gridX, colRows);
  });

  let clickChains = 0;
  rowToColumns.forEach(columns => {
    clickChains += countLinearPatternSets(columns, ADJACENCY_PATTERN_MIN_LENGTH);
  });

  let productionChains = 0;
  columnToRows.forEach(rows => {
    productionChains += countLinearPatternSets(rows, ADJACENCY_PATTERN_MIN_LENGTH);
  });

  let cryptoClusters = 0;
  for (let gridY = 0; gridY < ROOM_LAYOUT_GRID_SIZE - 1; gridY++) {
    for (let gridX = 0; gridX < ROOM_LAYOUT_GRID_SIZE - 1; gridX++) {
      const hasSquare =
        occupiedTiles.has(toRoomTileKey(gridX, gridY)) &&
        occupiedTiles.has(toRoomTileKey(gridX + 1, gridY)) &&
        occupiedTiles.has(toRoomTileKey(gridX, gridY + 1)) &&
        occupiedTiles.has(toRoomTileKey(gridX + 1, gridY + 1));
      if (hasSquare) cryptoClusters += 1;
    }
  }

  const clickBoostPercent = Math.min(ADJACENCY_MAX_CLICK_BOOST, clickChains * ADJACENCY_CLICK_BOOST_PER_CHAIN);
  const productionBoostPercent = Math.min(ADJACENCY_MAX_PRODUCTION_BOOST, productionChains * ADJACENCY_PRODUCTION_BOOST_PER_CHAIN);
  const cryptoBoostPercent = Math.min(ADJACENCY_MAX_CRYPTO_BOOST, cryptoClusters * ADJACENCY_CRYPTO_BOOST_PER_CLUSTER);
  const luckFromClickPercent = clickChains * ADJACENCY_CLICK_LUCK_PER_CHAIN;
  const luckFromProductionPercent = productionChains * ADJACENCY_PRODUCTION_LUCK_PER_CHAIN;
  const luckFromCryptoPercent = cryptoClusters * ADJACENCY_CRYPTO_LUCK_PER_CLUSTER;
  const luckBoostPercent = Math.min(
    ADJACENCY_MAX_LUCK_BOOST,
    luckFromClickPercent + luckFromProductionPercent + luckFromCryptoPercent
  );

  return {
    machineCount: positions.length,
    adjacentPairs,
    clickChains,
    productionChains,
    cryptoClusters,
    clickBoostPercent,
    productionBoostPercent,
    cryptoBoostPercent,
    luckFromClickPercent,
    luckFromProductionPercent,
    luckFromCryptoPercent,
    luckBoostPercent,
  };
};

// Get checkpoint interval for category
const getCheckpointInterval = (category: string): number => {
  if (category === 'crypto_mining') return 25;
  if (category === 'click_upgrades') return 25;
  return 25;
};

// Get checkpoint progress info
export const getCheckpointProgress = (count: number, category: string): { current: number; max: number; nextCheckpoint: number } => {
  const interval = getCheckpointInterval(category);
  // The checkpoint at a multiple of the interval is already reached, so the next one is the following
  // multiple (0 -> 25, 25 -> 50, 30 -> 50). The old ceil() said "at lvl 0" for unbought cards.
  const safeCount = Math.max(0, Math.floor(count));
  const nextCheckpoint = (Math.floor(safeCount / interval) + 1) * interval;
  const currentInCycle = safeCount % interval;
  return { current: currentInCycle, max: interval, nextCheckpoint };
};

// Get effective upgrade value with new mechanics:
// - Production: First level is base value, then each level adds 10% of base value
// - Click / crit chance / crit multiplier: Linear progression by level count
// - Every checkpoint applies the global checkpoint multiplier
export const getEffectiveValue = (upgrade: Upgrade): number => {
  if (upgrade.count === 0) return 0;
  const baseValue = upgrade.effect.value;
  const interval = getCheckpointInterval(upgrade.category);
  
  const checkpointsPassed = Math.floor(upgrade.count / interval);
  
  let valuePerLevel: number;
  
  // Click + crit upgrades use true per-level linear scaling.
  if (
    upgrade.effect.type === 'click' ||
    upgrade.effect.type === 'crit_chance' ||
    upgrade.effect.type === 'crit_multiplier'
  ) {
    valuePerLevel = baseValue * upgrade.count;
  } else {
    // Production and other types use 10% incremental progression
    // Level 1 = base, Level 2 = base * 1.1, Level 3 = base * 1.2, etc
    valuePerLevel = baseValue * (1 + 0.1 * (upgrade.count - 1));
  }
  
  const finalValue = valuePerLevel * getCheckpointMultiplier(upgrade.count, upgrade.category);
  
  return finalValue;
};

// Ascension reset rules:
// - Keep click upgrades category unlocked after first ascension.
// - v1.04: keep Mining Protocol Access unlocked too. Re-buying the same unlock every run was a
//   1-2 minute chore at the start of each run (sell data, wait for 60 Nodes) with no decision in it.
// - Reset Zero-Day Payload to level 1 so crit chance bonus is recalculated from low baseline.
const buildAscendedUpgrades = (): Upgrade[] => {
  return (INITIAL_STATE.upgrades as Upgrade[]).map(upgrade => {
    const count =
      upgrade.id === 'unlock_click_upgrades' ? 1 :
      upgrade.id === 'unlock_crypto_mining' ? 1 :
      upgrade.id === 'zero_day' ? 1 :
      0;
    const nextCost: Partial<Record<ResourceType, number>> = {};
    for (const [key, val] of Object.entries(upgrade.baseCost) as Array<[string, unknown]>) {
      const k = key as ResourceType;
      const v = typeof val === 'number' && Number.isFinite(val) ? val : 0;
      nextCost[k] = Math.floor(v * Math.pow(upgrade.costMultiplier, count));
    }

    return {
      ...upgrade,
      count,
      cost: nextCost,
    };
  });
};

export interface FloatingPickupItem {
  id: string;
  x: number;
  y: number;
  type: 'data' | 'credits' | 'crit' | 'autoclick' | 'combo';
  value: number;
  speedMultiplier?: number;
  expiresAt?: number;
  lifetimeMs?: number;
  comboChain?: boolean;
}

interface AutoPickupSpawnSnapshot {
  dataPerSecond: number;
  dataAmount: number;
  creditsAmount: number;
  totalDataCollected: number;
  totalUpgradesPurchased: number;
  totalAscensions: number;
  dataPerClick: number;
  visiblePickupCount: number;
}

interface ActiveComboChainSession {
  startedAt: number;
  dataCollectedAtStart: number;
  collectedPickupCount: number;
  pendingPickupIds: Set<string>;
}

export interface TimeWarpMiniGameState {
  id: string;
  startedAt: number;
  endsAt: number;
  durationMs: number;
  clicks: number;
  effectiveClicks: number;
  maxSeconds: number;
  projectedSeconds: number;
  rewardVarianceMultiplier: number;
  lastClickAt: number;
}

export interface TimeWarpResolutionFeedback {
  id: string;
  resolvedAt: number;
  bonusSeconds: number;
  clicks: number;
  dataBonus: number;
  creditsBonus: number;
  cryptoBonus: number;
}

export interface PrestigeUpgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  costMultiplier: number;
  maxLevel: number;
  effect: {
    type:
      | 'click_boost'
      | 'production_boost'
      | 'crit_chance_boost'
      | 'luck_boost'
      | 'crit_mult_boost'
      | 'prestige_mult'
      | 'cost_reduction'
      | 'crypto_boost'
      | 'starting_bonus'
      | 'offline_boost'
      | 'offline_time'
      | 'checkpoint_speed'
      | 'sell_boost'
      | 'pickup_value'
      | 'pickup_spawn_rate'
      | 'time_warp_chance'
      | 'time_warp_seconds'
      | 'time_warp_cooldown';
    value: number;
  };
  count: number;
}

// Ascension cost: 600 x (ascensions + 1)^2.65 crypto. For the first 10 ascensions it blends in from the
// pre-v1.03 curve (1000 x 1.45^n), so existing low-ascension saves do not see their next cost jump ~10x.
const ASCENSION_COST_BLEND_BELOW = 10;
export const getAscensionCost = (ascensionCount: number): number => {
  const n = Math.max(0, ascensionCount);
  const powerCurve = ASCENSION_BASE_COST * Math.pow(1 + n, ASCENSION_COST_POWER);
  if (n >= ASCENSION_COST_BLEND_BELOW) return Math.floor(powerCurve);
  const weight = Math.pow(n / ASCENSION_COST_BLEND_BELOW, 2);
  const legacyCurve = 1000 * Math.pow(1.45, n);
  return Math.floor(powerCurve * weight + legacyCurve * (1 - weight));
};

// Veteran bonus (shown in the ascension preview): grows from x1 toward x2.2 over many ascensions.
export const getAscensionVeteranMultiplier = (ascensionCount: number): number => {
  const safeAscensionCount = Math.max(0, ascensionCount);
  if (safeAscensionCount === 0) return 1;

  const ramp = 1 - Math.exp(-safeAscensionCount / 18);
  return 1 + ASCENSION_PASSIVE_PRESTIGE_MAX_BONUS * Math.pow(ramp, 1.18);
};

export const getAscensionOvershootMultiplier = (crypto: number, ascensionCount: number): number => {
  const required = getAscensionCost(ascensionCount);
  if (crypto <= required) return 1;
  return Math.min(
    ASCENSION_OVERSHOOT_MAX_MULTIPLIER,
    1 + ASCENSION_OVERSHOOT_PER_DOUBLING * Math.log2(crypto / required)
  );
};

export interface PrestigeGainBreakdown {
  base: number;
  veteranMultiplier: number;
  overshootMultiplier: number;
  flatBonus: number;
  upgradeMultiplier: number;
  total: number;
}

const getPrestigeUpgradeGainMultiplier = (prestigeUpgrades: Array<Pick<PrestigeUpgrade, 'count' | 'effect'>>): number => {
  let multiplier = 1;
  prestigeUpgrades.forEach(p => {
    if (p.count > 0 && p.effect.type === 'prestige_mult') multiplier *= 1 + p.effect.value * p.count;
  });
  return multiplier;
};

// Every part of the ascension reward, so the UI can show exactly how it is built.
export const getPrestigeGainBreakdown = (
  crypto: number,
  ascensionCount: number,
  prestigeUpgrades: Array<Pick<PrestigeUpgrade, 'count' | 'effect'>> = []
): PrestigeGainBreakdown => {
  const empty = { base: 0, veteranMultiplier: 1, overshootMultiplier: 1, flatBonus: 0, upgradeMultiplier: 1, total: 0 };
  if (crypto < getAscensionCost(ascensionCount)) return empty;

  const base = (Math.floor(10 * Math.log2(1 + crypto)) + Math.floor(Math.pow(crypto, 0.12))) * ASCENSION_PRESTIGE_BASE_MULTIPLIER;
  const veteranMultiplier = getAscensionVeteranMultiplier(ascensionCount);
  const overshootMultiplier = getAscensionOvershootMultiplier(crypto, ascensionCount);
  const flatBonus = ASCENSION_PRESTIGE_FLAT_BASE + Math.max(0, ascensionCount) * ASCENSION_PRESTIGE_FLAT_PER_ASCENSION;
  const upgradeMultiplier = getPrestigeUpgradeGainMultiplier(prestigeUpgrades);
  const total = Math.floor((Math.floor(base * veteranMultiplier * overshootMultiplier) + flatBonus) * upgradeMultiplier);
  return { base, veteranMultiplier, overshootMultiplier, flatBonus, upgradeMultiplier, total };
};

// Reward before prestige-upgrade multipliers (kept for existing callers).
export const calculatePrestigeGain = (crypto: number, ascensionCount: number = 0): number =>
  getPrestigeGainBreakdown(crypto, ascensionCount).total;

// v1.04: Cursed Fate (+0.5% -> +1% crit chance), Lethal Precision (+8% -> +12% crit damage) and
// Market Arbitrage (+4% -> +6% Nodes) gave too little to notice per level. Only counts are saved, so
// existing levels get the new values on load.
export const PRESTIGE_UPGRADES: PrestigeUpgrade[] = [
  // v1.03: costs re-targeted so the whole shop (~300k) is affordable by about ascension 50.
  { id: 'p_click', name: 'Eternal Strike', description: '+5% click power per level.', cost: 25, costMultiplier: 1.10, maxLevel: 40, effect: { type: 'click_boost', value: 0.05 }, count: 0 },
  // Quantum Forge (p_mega_prod) was merged into this one; old levels are converted on load.
  { id: 'p_prod', name: 'Legacy Production', description: '+10% production per level.', cost: 30, costMultiplier: 1.10, maxLevel: 60, effect: { type: 'production_boost', value: 0.10 }, count: 0 },
  { id: 'p_starting', name: 'Head Start', description: 'Start each run with 1 minute of your last run\'s data production per level.', cost: 50, costMultiplier: 1.6, maxLevel: 10, effect: { type: 'starting_bonus', value: 60 }, count: 0 },

  { id: 'p_crit', name: 'Cursed Fate', description: '+1% crit chance per level.', cost: 50, costMultiplier: 1.12, maxLevel: 30, effect: { type: 'crit_chance_boost', value: 0.01 }, count: 0 },
  { id: 'p_crit_mult', name: 'Lethal Precision', description: '+12% crit damage per level.', cost: 60, costMultiplier: 1.12, maxLevel: 25, effect: { type: 'crit_mult_boost', value: 0.12 }, count: 0 },
  // Capped where the click drop chance reaches 100% (30% base + 24 x 3%).
  { id: 'p_luck', name: 'Fortune Protocol', description: '+3% chance per level that a click drops a pickup.', cost: 45, costMultiplier: 1.15, maxLevel: 24, effect: { type: 'luck_boost', value: 0.03 }, count: 0 },
  { id: 'p_pickup', name: 'Scavenger Network', description: '+10% pickup value per level.', cost: 48, costMultiplier: 1.12, maxLevel: 30, effect: { type: 'pickup_value', value: 0.1 }, count: 0 },
  { id: 'p_signal', name: 'Signal Amplifier', description: '+7% floating pickup spawn rate per level.', cost: 95, costMultiplier: 1.26, maxLevel: 12, effect: { type: 'pickup_spawn_rate', value: 0.07 }, count: 0 },
  { id: 'p_timewarp_chance', name: 'Temporal Hook', description: '+2.5% Time Warp trigger chance per level.', cost: 180, costMultiplier: 1.25, maxLevel: 12, effect: { type: 'time_warp_chance', value: 0.025 }, count: 0 },
  { id: 'p_timewarp_power', name: 'Chrono Compression', description: '+90s production burst per Time Warp trigger.', cost: 260, costMultiplier: 1.25, maxLevel: 14, effect: { type: 'time_warp_seconds', value: 90 }, count: 0 },
  { id: 'p_timewarp_sync', name: 'Phase Lock', description: '-6s Time Warp cooldown per level (min 30s).', cost: 300, costMultiplier: 1.25, maxLevel: 10, effect: { type: 'time_warp_cooldown', value: 6 }, count: 0 },

  { id: 'p_sell', name: 'Market Arbitrage', description: '+6% more Nodes when selling data, per level.', cost: 110, costMultiplier: 1.18, maxLevel: 20, effect: { type: 'sell_boost', value: 0.06 }, count: 0 },
  { id: 'p_prestige', name: 'Ascension Catalyst', description: '+4% prestige gain per level.', cost: 150, costMultiplier: 1.25, maxLevel: 15, effect: { type: 'prestige_mult', value: 0.04 }, count: 0 },
  { id: 'p_offline', name: 'Passive Matrix', description: '+5% offline earnings per level.', cost: 90, costMultiplier: 1.18, maxLevel: 20, effect: { type: 'offline_boost', value: 0.05 }, count: 0 },

  { id: 'p_crypto', name: 'Chain Singularity', description: '+12% crypto production per level.', cost: 210, costMultiplier: 1.30, maxLevel: 10, effect: { type: 'crypto_boost', value: 0.12 }, count: 0 },
  { id: 'p_mega_crit', name: 'Fatal Algorithm', description: '+25% crit damage per level.', cost: 300, costMultiplier: 1.5, maxLevel: 6, effect: { type: 'crit_mult_boost', value: 0.25 }, count: 0 },
  { id: 'p_mega_prestige', name: 'Transcendence Core', description: '+10% prestige gain per level.', cost: 500, costMultiplier: 1.8, maxLevel: 5, effect: { type: 'prestige_mult', value: 0.1 }, count: 0 },
  { id: 'p_offline_window', name: 'Chrono Vault', description: '+1.2h max offline progression per level.', cost: 1200, costMultiplier: 1.6, maxLevel: 5, effect: { type: 'offline_time', value: 4320 }, count: 0 },
];

// Pre-v1.03 prestige prices, used only to refund levels removed by the economy migration.
const LEGACY_PRESTIGE_PRICES: Record<string, { cost: number; costMultiplier: number }> = {
  p_click: { cost: 25, costMultiplier: 1.15 },
  p_prod: { cost: 30, costMultiplier: 1.18 },
  p_starting: { cost: 20, costMultiplier: 1.12 },
  p_luck: { cost: 45, costMultiplier: 1.18 },
  p_mega_prod: { cost: 250, costMultiplier: 1.6 },
};

const sumLevelCosts = (cost: number, costMultiplier: number, fromLevel: number, toLevel: number): number => {
  let total = 0;
  for (let level = fromLevel; level < toLevel; level++) total += Math.floor(cost * Math.pow(costMultiplier, level));
  return total;
};

// One-time v1.03 prestige migration on raw saved upgrades: merges Quantum Forge into Legacy Production
// (+15%/lvl -> +10%/lvl, 1.5 levels each), trims levels above the new caps, and refunds the difference.
export const migratePrestigeEconomyV103 = (saved: unknown): { upgrades: unknown; refund: number } => {
  if (!Array.isArray(saved)) return { upgrades: saved, refund: 0 };
  const list = saved.map((u: any) => ({ ...u }));
  const find = (id: string) => list.find((u: any) => u?.id === id);
  let refund = 0;

  const megaProd = find('p_mega_prod');
  const megaLevels = Math.max(0, Math.floor(megaProd?.count || 0));
  const prod = find('p_prod');
  if (megaLevels > 0) {
    const legacy = LEGACY_PRESTIGE_PRICES.p_mega_prod;
    const spentOnMega = sumLevelCosts(legacy.cost, legacy.costMultiplier, 0, megaLevels);
    const newProd = PRESTIGE_UPGRADES.find(p => p.id === 'p_prod')!;
    const currentProd = Math.max(0, Math.floor(prod?.count || 0));
    const targetProd = Math.min(newProd.maxLevel, currentProd + Math.round(megaLevels * 1.5));
    const addedCost = sumLevelCosts(newProd.cost, newProd.costMultiplier, currentProd, targetProd);
    refund += Math.max(0, spentOnMega - addedCost);
    if (prod) prod.count = targetProd;
    else list.push({ id: 'p_prod', count: targetProd });
  }

  for (const upgrade of PRESTIGE_UPGRADES) {
    const entry = find(upgrade.id);
    const count = Math.max(0, Math.floor(entry?.count || 0));
    if (!entry || count <= upgrade.maxLevel) continue;
    const legacy = LEGACY_PRESTIGE_PRICES[upgrade.id] ?? { cost: upgrade.cost, costMultiplier: upgrade.costMultiplier };
    refund += sumLevelCosts(legacy.cost, legacy.costMultiplier, upgrade.maxLevel, count);
    entry.count = upgrade.maxLevel;
  }

  return { upgrades: list.filter((u: any) => u?.id !== 'p_mega_prod'), refund: Math.floor(refund) };
};

const BASE_MAX_OFFLINE_TIME_SECONDS = 8 * 60 * 60;
const getMaxOfflineTimeSeconds = (savedPrestigeUpgrades: Array<any>): number => {
  let extraSeconds = 0;
  savedPrestigeUpgrades.forEach((upgrade: any) => {
    if (upgrade?.count > 0 && upgrade?.effect?.type === 'offline_time') {
      extraSeconds += upgrade.effect.value * upgrade.count;
    }
  });
  return Math.max(BASE_MAX_OFFLINE_TIME_SECONDS, Math.floor(BASE_MAX_OFFLINE_TIME_SECONDS + extraSeconds));
};

const getTimeWarpProjectedSeconds = (maxSeconds: number, effectiveClicks: number, rewardVarianceMultiplier: number = 1): number => {
  if (maxSeconds <= 0 || effectiveClicks <= 0) return 0;
  const normalized = 1 - Math.exp(-effectiveClicks / TIME_WARP_MINIGAME_SMOOTH_CAP);
  return Math.floor(Math.max(0, Math.min(maxSeconds, maxSeconds * normalized * Math.max(0.1, rewardVarianceMultiplier))));
};

const getUpgradePaceSpawnDelayMultiplier = (avgIntervalMs: number, idleMs: number): number => {
  const effectiveInterval = Math.max(0, Math.max(avgIntervalMs, idleMs));
  const slowRatio = effectiveInterval / UPGRADE_PACE_BASE_INTERVAL_MS;
  if (slowRatio <= 1) return 1;

  const extraSlow = slowRatio - 1;
  const speedup = 1 + Math.min(
    UPGRADE_PACE_MAX_SPEEDUP - 1,
    Math.pow(extraSlow, 0.65) * 0.9
  );

  return 1 / speedup;
};

const getScaledNodeFloaterValueFromSnapshot = (
  baseValue: number,
  snapshot: Pick<
    AutoPickupSpawnSnapshot,
    'dataAmount' | 'creditsAmount' | 'totalDataCollected' | 'totalUpgradesPurchased'
  >,
  source: 'auto' | 'click' | 'debug' = 'auto'
): number => {
  const safeBase = Math.max(0, Math.floor(baseValue));
  const dataLog = Math.log10(Math.max(10, snapshot.dataAmount + snapshot.totalDataCollected + 1));
  const nodesLog = Math.log10(Math.max(10, snapshot.creditsAmount + 1));
  const progressionFloor = Math.floor(
    dataLog * 1.8 +
    nodesLog * 2.4 +
    snapshot.totalUpgradesPurchased / 16
  );
  const minimum = source === 'auto' ? 5 : 1;

  return Math.max(minimum, safeBase, progressionFloor);
};

const getAutoPickupTargetCount = (totalUpgradesPurchased: number, totalAscensions: number): number => {
  const lateGameHasExtraLane =
    totalUpgradesPurchased >= 260 ||
    (totalUpgradesPurchased >= 160 && totalAscensions >= 10);
  return lateGameHasExtraLane ? 2 : 1;
};

const getAutoPickupDensityDelayMultiplier = (visiblePickupCount: number, targetPickupCount: number): number => {
  if (visiblePickupCount >= targetPickupCount) return 1;
  const shortage = Math.max(0, targetPickupCount - visiblePickupCount);
  return Math.max(0.9, 1 - shortage * 0.06);
};

const getVeteranAutoPickupDelayMultiplier = (totalAscensions: number): number => {
  const safeAscensions = Math.max(0, totalAscensions);
  if (safeAscensions <= 3) return 1;
  return Math.min(1.18, 1 + (safeAscensions - 3) * 0.012);
};

const getFloatingPickupSpeedMultiplier = (totalAscensions: number): number => {
  const safeAscensions = Math.max(0, totalAscensions);
  const veteranBump = 1 + Math.min(0.24, safeAscensions * 0.008);
  const speedRoll = Math.random();
  const variantMultiplier =
    speedRoll < 0.1 ? 2 :
    speedRoll < 0.55 ? 1.3 :
    1;

  return Number((variantMultiplier * veteranBump).toFixed(3));
};

const getDiminishingPickupDurationMs = (baseDurationMs: number, stackIndex: number): number => {
  const safeBase = Math.max(200, baseDurationMs);
  const safeStack = Math.max(0, stackIndex);
  const geometricFalloff = Math.pow(0.5, safeStack);
  const logarithmicDamping = 1 + Math.log2(safeStack + 1) * 0.14;
  return Math.max(350, Math.floor((safeBase * geometricFalloff) / logarithmicDamping));
};

const rollTimeWarpPityThreshold = (): number =>
  TIME_WARP_PITY_STREAK_MIN +
  Math.floor(Math.random() * (TIME_WARP_PITY_STREAK_MAX - TIME_WARP_PITY_STREAK_MIN + 1));

const getRandomizedTimeWarpCooldownMs = (baseCooldownMs: number): number => {
  const jitterMultiplier =
    TIME_WARP_COOLDOWN_JITTER_MIN +
    Math.random() * (TIME_WARP_COOLDOWN_JITTER_MAX - TIME_WARP_COOLDOWN_JITTER_MIN);
  return Math.max(TIME_WARP_MIN_COOLDOWN_MS, Math.floor(baseCooldownMs * jitterMultiplier));
};

const rollTimeWarpRewardVarianceMultiplier = (): number => {
  const baseMultiplier =
    TIME_WARP_REWARD_VARIANCE_MIN +
    Math.random() * (TIME_WARP_REWARD_VARIANCE_MAX - TIME_WARP_REWARD_VARIANCE_MIN);
  const spikeMultiplier =
    Math.random() < TIME_WARP_REWARD_SPIKE_CHANCE
      ? TIME_WARP_REWARD_SPIKE_MIN +
        Math.random() * (TIME_WARP_REWARD_SPIKE_MAX - TIME_WARP_REWARD_SPIKE_MIN)
      : 1;

  return Number((baseMultiplier * spikeMultiplier).toFixed(3));
};

// Achievement System - Steam-compatible format with prestige rewards
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: number;
  claimed?: boolean;
  progress?: number;
  maxProgress?: number;
  hidden?: boolean;
  category: 'clicking' | 'resources' | 'upgrades' | 'prestige' | 'special';
  prestigeReward: number;
}

// Stats for leaderboard tracking
export interface PlayerStats {
  totalClicks: number;
  totalCrits: number;
  totalDataCollected: number;
  totalCreditsEarned: number;
  totalCryptoMined: number;
  totalUpgradesPurchased: number;
  totalAscensions: number;
  totalPrestigeEarned: number;
  totalPrestigeSpent: number;
  highestDataPerSecond: number;
  highestCreditsHeld: number;
  highestCryptoHeld: number;
  fastestAscension: number;
  pickupsCollected: number;
  critPickupsCollected: number;
  playTime: number;
  checkpointsMilestones: number;
  totalPrestigeUpgradesPurchased: number;
  totalCosmeticsOwned: number;
  dailyAscensions: number;
  dailyAscensionDate: string;
}

const getCurrentUtcDateStamp = (): string => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

const incrementDailyAscensionStats = (stats: PlayerStats, amount: number = 1): PlayerStats => {
  const safeAmount = Math.max(0, Math.floor(amount));
  const today = getCurrentUtcDateStamp();
  const currentDailyCount = stats.dailyAscensionDate === today ? stats.dailyAscensions : 0;

  return {
    ...stats,
    dailyAscensions: currentDailyCount + safeAmount,
    dailyAscensionDate: today,
  };
};

const INITIAL_STATS: PlayerStats = {
  totalClicks: 0,
  totalCrits: 0,
  totalDataCollected: 0,
  totalCreditsEarned: 0,
  totalCryptoMined: 0,
  totalUpgradesPurchased: 0,
  totalAscensions: 0,
  totalPrestigeEarned: 0,
  totalPrestigeSpent: 0,
  highestDataPerSecond: 0,
  highestCreditsHeld: 0,
  highestCryptoHeld: 0,
  fastestAscension: Infinity,
  pickupsCollected: 0,
  critPickupsCollected: 0,
  playTime: 0,
  checkpointsMilestones: 0,
  totalPrestigeUpgradesPurchased: 0,
  totalCosmeticsOwned: 0,
  dailyAscensions: 0,
  dailyAscensionDate: getCurrentUtcDateStamp(),
};

// Contract NPCs - Cyberpunk characters that give missions
// Minimum contract reward as a share of the next ascension's crypto cost / minimum prestige reward.
const CONTRACT_REWARD_SHARE: Record<'easy' | 'medium' | 'hard', number> = { easy: 0.01, medium: 0.02, hard: 0.04 };

export const CONTRACT_NPCS: ContractNPC[] = [
  { id: 'ghost', name: 'Ghost', title: 'Data Broker', avatar: 'ghost', color: '#22d3ee' },
  { id: 'cipher', name: 'Cipher', title: 'Crypto Dealer', avatar: 'key', color: '#f59e0b' },
  { id: 'nova', name: 'Nova', title: 'Tech Runner', avatar: 'zap', color: '#a855f7' },
  { id: 'razor', name: 'Razor', title: 'Corp Fixer', avatar: 'target', color: '#ef4444' },
  { id: 'echo', name: 'Echo', title: 'Net Ghost', avatar: 'radio', color: '#10b981' },
];

// Initial contracts state
const INITIAL_CONTRACTS: ContractsState = {
  activeContracts: [],
  completedToday: 0,
  lastRefreshTime: 0,
  totalContractsCompleted: 0,
  refreshesRemaining: 3,
};

// Initial room layout
const INITIAL_ROOM_LAYOUT: RoomLayout = {
  version: ROOM_LAYOUT_VERSION,
  machinePositions: [],
};

// Achievement tier generator for 250+ achievements
const generateTieredAchievements = (): Achievement[] => {
  const achievements: Achievement[] = [];
  
  // Helper to format large numbers
  const formatNum = (n: number): string => {
    if (n >= 1000000000) return `${n / 1000000000}B`;
    if (n >= 1000000) return `${n / 1000000}M`;
    if (n >= 1000) return `${n / 1000}K`;
    return n.toString();
  };
  
  // Click achievements - 15 tiers (removed: Click Titan, Click Overlord, Click Immortal, Click Eternal, Click Transcendent)
  const clickTiers = [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
  const clickNames = ['First Steps', 'Warmed Up', 'Getting Started', 'Click Apprentice', 'Click Adept', 'Clicking Machine', 'Click Master', 'Click Expert', 'Carpal Tunnel', 'Click Veteran', 'Click Legend', 'Click Champion', 'Click Conqueror', 'Click Emperor', 'Click God'];
  clickTiers.forEach((tier, i) => {
    achievements.push({
      id: `clicks_${tier}`,
      name: clickNames[i] || `Clicker ${i + 1}`,
      description: `Click ${formatNum(tier)} times`,
      icon: i < 5 ? 'mouse-pointer' : i < 10 ? 'mouse-pointer-click' : i < 15 ? 'zap' : 'activity',
      unlocked: false,
      progress: 0,
      maxProgress: tier,
      category: 'clicking',
      prestigeReward: Math.ceil(Math.pow(1.5, i) * 0.5),
    });
  });
  
  // Critical hit achievements - 12 tiers (removed: Critical Titan, Crit Immortal, Critical Eternal)
  const critTiers = [1, 10, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000];
  const critNames = ['Lucky Strike', 'Critical Start', 'Crit Curious', 'Critical Mass', 'Crit Adept', 'Crit Master', 'Critical Expert', 'Crit Legend', 'Critical Champion', 'Crit Overlord', 'Critical Emperor', 'Crit God'];
  critTiers.forEach((tier, i) => {
    achievements.push({
      id: `crits_${tier}`,
      name: critNames[i] || `Critical ${i + 1}`,
      description: tier === 1 ? 'Land your first critical hit' : `Land ${formatNum(tier)} critical hits`,
      icon: i < 5 ? 'star' : i < 10 ? 'sparkles' : 'flame',
      unlocked: false,
      progress: tier === 1 ? undefined : 0,
      maxProgress: tier === 1 ? undefined : tier,
      category: 'clicking',
      prestigeReward: Math.ceil(Math.pow(1.6, i) * 0.8),
    });
  });
  
  // Data collection achievements - 20 tiers
  const dataTiers = [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000, 5000000, 10000000, 50000000, 100000000, 500000000, 1000000000, 5000000000, 10000000000, 50000000000, 100000000000, 500000000000];
  const dataNames = ['Data Beginner', 'Data Collector', 'Data Hoarder', 'Data Accumulator', 'Data Stacker', 'Data Mogul', 'Data Baron', 'Data Tycoon', 'Data Emperor', 'Data King', 'Data Legend', 'Data Champion', 'Data Overlord', 'Data Master', 'Data God', 'Data Titan', 'Data Immortal', 'Data Eternal', 'Data Transcendent', 'Data Infinite'];
  dataTiers.forEach((tier, i) => {
    achievements.push({
      id: `data_${tier}`,
      name: dataNames[i] || `Data ${i + 1}`,
      description: `Collect ${formatNum(tier)} total data`,
      icon: i < 5 ? 'database' : i < 10 ? 'server' : i < 15 ? 'hard-drive' : 'cloud',
      unlocked: false,
      progress: 0,
      maxProgress: tier,
      category: 'resources',
      prestigeReward: Math.ceil(Math.pow(1.4, i) * 1),
    });
  });
  
  // Credits earned achievements - 15 tiers (removed: Credit Infinite, and other extremes)
  const creditTiers = [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000, 5000000, 10000000, 50000000, 100000000, 500000000, 1000000000];
  const creditNames = ['Pocket Change', 'Some Savings', 'Entrepreneur', 'Business Owner', 'Wealthy', 'Rich', 'Tycoon', 'Millionaire', 'Multi-Millionaire', 'Billionaire', 'Node Baron', 'Node King', 'Node Emperor', 'Node Legend', 'Node God'];
  creditTiers.forEach((tier, i) => {
    achievements.push({
      id: `credits_${tier}`,
      name: creditNames[i] || `Nodes ${i + 1}`,
      description: `Earn ${formatNum(tier)} total nodes`,
      icon: i < 5 ? 'coins' : i < 10 ? 'banknote' : i < 15 ? 'landmark' : 'gem',
      unlocked: false,
      progress: 0,
      maxProgress: tier,
      category: 'resources',
      prestigeReward: Math.ceil(Math.pow(1.4, i) * 1),
    });
  });
  
  // Crypto achievements - 14 tiers (removed: Crypto Transcendent, Crypto Eternal, Crypto Immortal)
  const cryptoTiers = [1, 10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000, 5000000, 10000000];
  const cryptoNames = ['Crypto Curious', 'Crypto Starter', 'Crypto Collector', 'Crypto Investor', 'Crypto Trader', 'Crypto Expert', 'Crypto Master', 'Crypto Whale', 'Crypto Mogul', 'Crypto Baron', 'Crypto King', 'Crypto Emperor', 'Crypto Legend', 'Crypto God'];
  cryptoTiers.forEach((tier, i) => {
    achievements.push({
      id: `crypto_${tier}`,
      name: cryptoNames[i] || `Crypto ${i + 1}`,
      description: `Mine ${formatNum(tier)} crypto`,
      icon: i < 5 ? 'bitcoin' : i < 10 ? 'wallet' : 'trending-up',
      unlocked: false,
      progress: 0,
      maxProgress: tier,
      category: 'resources',
      prestigeReward: Math.ceil(Math.pow(1.5, i) * 1.5),
    });
  });
  
  // Upgrade purchase achievements - 17 tiers (removed: Dimensional God, Multiversal Titan, Omniversal Being)
  const upgradeTiers = [1, 5, 10, 25, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000, 1500, 2000, 3000];
  const upgradeNames = ['First Investment', 'Getting Started', 'Growing Business', 'Expanding', 'Industrial', 'Growing Empire', 'Major Player', 'Industry Leader', 'Corporate Giant', 'Mega Corp', 'Global Power', 'World Dominator', 'Continental King', 'Planetary Ruler', 'Solar Emperor', 'Galactic Overlord', 'Universal Master'];
  upgradeTiers.forEach((tier, i) => {
    achievements.push({
      id: `upgrades_${tier}`,
      name: upgradeNames[i] || `Upgrader ${i + 1}`,
      description: tier === 1 ? 'Purchase your first upgrade' : `Purchase ${formatNum(tier)} total upgrades`,
      icon: i < 5 ? 'arrow-up-circle' : i < 10 ? 'trending-up' : i < 15 ? 'factory' : 'building',
      unlocked: false,
      progress: tier === 1 ? undefined : 0,
      maxProgress: tier === 1 ? undefined : tier,
      category: 'upgrades',
      prestigeReward: Math.ceil(Math.pow(1.5, i) * 1),
    });
  });
  
  // Checkpoint achievements - 9 tiers (removed: Checkpoint Eternal)
  const checkpointTiers = [1, 5, 10, 25, 50, 100, 200, 500, 1000];
  const checkpointNames = ['Milestone Reached', 'Checkpoint Hunter', 'Checkpoint Master', 'Checkpoint Expert', 'Checkpoint Legend', 'Checkpoint Champion', 'Checkpoint Overlord', 'Checkpoint God', 'Checkpoint Titan'];
  checkpointTiers.forEach((tier, i) => {
    achievements.push({
      id: `checkpoints_${tier}`,
      name: checkpointNames[i] || `Checkpoint ${i + 1}`,
      description: tier === 1 ? 'Reach your first checkpoint' : `Reach ${tier} checkpoints`,
      icon: 'flag',
      unlocked: false,
      progress: tier === 1 ? undefined : 0,
      maxProgress: tier === 1 ? undefined : tier,
      category: 'upgrades',
      prestigeReward: Math.ceil(Math.pow(1.8, i) * 2),
    });
  });
  
  // Ascension achievements - 6 tiers
  const ascendTiers = [1, 2, 5, 10, 15, 25, 50];
  const ascendNames = ['Transcendence', 'Reborn', 'Cycle Begun', 'Eternal Cycle', 'Self-Running', 'Ascension Adept', 'Ascension Master'];
  ascendTiers.forEach((tier, i) => {
    achievements.push({
      id: `ascend_${tier}`,
      name: ascendNames[i] || `Ascension ${i + 1}`,
      description: tier === 1 ? 'Ascend for the first time' : `Ascend ${tier} times`,
      icon: i < 5 ? 'sunrise' : i < 10 ? 'refresh-cw' : 'infinity',
      unlocked: false,
      progress: tier === 1 ? undefined : 0,
      maxProgress: tier === 1 ? undefined : tier,
      category: 'prestige',
      prestigeReward: Math.ceil(Math.pow(2, i) * 2),
    });
  });
  
  // Prestige spending achievements - 9 tiers (removed: Prestige Eternal, Immortal, Titan, God, Emperor, King)
  const prestigeTiers = [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
  const prestigeNames = ['Prestige Spender', 'Prestige Investor', 'Prestige Collector', 'Prestige Hoarder', 'Prestige Master', 'Prestige Expert', 'Prestige Legend', 'Prestige Champion', 'Prestige Overlord'];
  prestigeTiers.forEach((tier, i) => {
    achievements.push({
      id: `prestige_spent_${tier}`,
      name: prestigeNames[i] || `Prestige ${i + 1}`,
      description: `Spend ${formatNum(tier)} prestige points`,
      icon: i < 5 ? 'gem' : i < 10 ? 'award' : 'crown',
      unlocked: false,
      progress: 0,
      maxProgress: tier,
      category: 'prestige',
      prestigeReward: Math.ceil(Math.pow(1.5, i) * 3),
    });
  });
  
  // Prestige upgrade purchase achievements - 8 tiers
  const pUpgradeTiers = [1, 5, 10, 25, 50, 100, 200, 500];
  const pUpgradeNames = ['Eternal Power', 'Growing Legacy', 'Permanent Progress', 'Eternal Investor', 'Legacy Master', 'Eternal Expert', 'Legacy Legend', 'Eternal Champion'];
  pUpgradeTiers.forEach((tier, i) => {
    achievements.push({
      id: `prestige_upgrades_${tier}`,
      name: pUpgradeNames[i] || `Prestige Upgrade ${i + 1}`,
      description: tier === 1 ? 'Purchase a prestige upgrade' : `Purchase ${tier} prestige upgrades`,
      icon: 'gem',
      unlocked: false,
      progress: tier === 1 ? undefined : 0,
      maxProgress: tier === 1 ? undefined : tier,
      category: 'prestige',
      prestigeReward: Math.ceil(Math.pow(1.8, i) * 2),
    });
  });
  
  // Pickup achievements - 5 tiers
  const pickupTiers = [10, 50, 100, 250, 500];
  const pickupNames = ['Scavenger', 'Collector', 'Pickup Pro', 'Pickup Expert', 'Pickup Master'];
  pickupTiers.forEach((tier, i) => {
    achievements.push({
      id: `pickups_${tier}`,
      name: pickupNames[i] || `Pickup ${i + 1}`,
      description: `Collect ${formatNum(tier)} floating pickups`,
      icon: 'gift',
      unlocked: false,
      progress: 0,
      maxProgress: tier,
      category: 'special',
      prestigeReward: Math.ceil(Math.pow(1.5, i) * 1),
    });
  });
  
  // Crit pickup achievements - 3 tiers (removed: Jackpot Eternal, God, Emperor, Overlord, Champion, Legend, Expert)
  const critPickupTiers = [1, 10, 25];
  const critPickupNames = ['Jackpot!', 'Jackpot Hunter', 'Jackpot Master'];
  critPickupTiers.forEach((tier, i) => {
    achievements.push({
      id: `crit_pickups_${tier}`,
      name: critPickupNames[i] || `Crit Pickup ${i + 1}`,
      description: tier === 1 ? 'Collect your first critical pickup' : `Collect ${tier} critical pickups`,
      icon: 'target',
      unlocked: false,
      progress: tier === 1 ? undefined : 0,
      maxProgress: tier === 1 ? undefined : tier,
      category: 'special',
      prestigeReward: Math.ceil(Math.pow(1.7, i) * 2),
    });
  });
  
  // Data per second achievements - 15 tiers
  const dpsTiers = [10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000, 5000000, 10000000, 50000000, 100000000];
  const dpsNames = ['Data Flow', 'Data Stream', 'Data River', 'Data Rapids', 'Data Waterfall', 'Data Tsunami', 'Optimized Systems', 'High Throughput', 'Maximum Throughput', 'Unlimited Bandwidth', 'Data Superhighway', 'Data Dimension', 'Data Universe', 'Data Multiverse', 'Data Omniverse'];
  dpsTiers.forEach((tier, i) => {
    achievements.push({
      id: `dps_${tier}`,
      name: dpsNames[i] || `DPS ${i + 1}`,
      description: `Reach ${formatNum(tier)} data per second`,
      icon: i < 5 ? 'gauge' : i < 10 ? 'rocket' : 'zap',
      unlocked: false,
      category: 'special',
      prestigeReward: Math.ceil(Math.pow(1.6, i) * 2),
    });
  });
  
  // Speed run achievements - 4 tiers
  const speedTiers = [600, 480, 360, 300];
  const speedNames = ['Speed Runner', 'Quick Ascender', 'Fast Tracker', 'Rapid Riser'];
  speedTiers.forEach((tier, i) => {
    const mins = Math.floor(tier / 60);
    const secs = tier % 60;
    const timeStr = mins > 0 ? `${mins}m${secs > 0 ? ` ${secs}s` : ''}` : `${secs}s`;
    achievements.push({
      id: `speed_${tier}`,
      name: speedNames[i] || `Speed ${i + 1}`,
      description: `Ascend in under ${timeStr}`,
      icon: 'timer',
      unlocked: false,
      hidden: true,
      category: 'special',
      prestigeReward: Math.ceil(Math.pow(2.5, i) * 5),
    });
  });

  // Playtime achievements - 7 tiers (removed: Eternal Gamer, Lifetime Player, True Dedication)
  const playtimeTiers = [300, 1800, 3600, 7200, 18000, 36000, 86400];
  const playtimeNames = ['5 Minutes', '30 Minutes', '1 Hour', '2 Hours', '5 Hours', '10 Hours', '1 Day'];
  const playtimeTitles = ['Quick Look', 'Getting Hooked', 'Dedicated', 'Committed', 'Addicted', 'No Life', 'Marathon Runner'];
  playtimeTiers.forEach((tier, i) => {
    achievements.push({
      id: `playtime_${tier}`,
      name: playtimeTitles[i] || `Playtime ${i + 1}`,
      description: `Play for ${playtimeNames[i]}`,
      icon: 'clock',
      unlocked: false,
      progress: 0,
      maxProgress: tier,
      category: 'special',
      prestigeReward: Math.ceil(Math.pow(1.5, i) * 2),
    });
  });
  
  // Cosmetics purchase achievements - 5 tiers (removed: Aesthete, Ultimate Cosmetics)
  const cosmeticsTiers = [1, 5, 10, 25, 50];
  const cosmeticsNames = ['Collector', 'Fashion Starter', 'Style Enthusiast', 'Cosmetics Master', 'Fashion Icon'];
  cosmeticsTiers.forEach((tier, i) => {
    achievements.push({
      id: `cosmetics_${tier}`,
      name: cosmeticsNames[i] || `Cosmetics ${i + 1}`,
      description: tier === 1 ? 'Buy your first cosmetic item' : `Buy ${tier} cosmetic items`,
      icon: 'palette',
      unlocked: false,
      progress: tier === 1 ? undefined : 0,
      maxProgress: tier === 1 ? undefined : tier,
      category: 'special',
      prestigeReward: Math.ceil(Math.pow(1.6, i) * 1),
    });
  });
  
  // Secret/hidden achievements - 10 special ones
  const secretAchievements: Achievement[] = [
    { id: 'secret_1000_clicks_no_upgrade', name: 'Purist', description: 'Click 1000 times without buying upgrades', icon: 'lock', unlocked: false, hidden: true, category: 'special', prestigeReward: 25 },
    { id: 'secret_max_crit', name: 'Critical Overload', description: 'Reach 50% crit chance', icon: 'flame', unlocked: false, hidden: true, category: 'special', prestigeReward: 50 },
    { id: 'secret_millionaire', name: 'Crypto Millionaire', description: 'Hold 1M+ nodes and 1000+ crypto at once', icon: 'trophy', unlocked: false, hidden: true, category: 'special', prestigeReward: 100 },
    { id: 'secret_all_upgrades', name: 'Complete Collection', description: 'Own at least 1 of every upgrade type', icon: 'check-circle', unlocked: false, hidden: true, category: 'special', prestigeReward: 75 },
    { id: 'secret_prestige_hoarder', name: 'Prestige Hoarder', description: 'Ascend with 1000+ crypto', icon: 'piggy-bank', unlocked: false, hidden: true, category: 'special', prestigeReward: 150 },
    { id: 'secret_speed_demon', name: 'Speed Demon', description: 'Click 100 times in 10 seconds', icon: 'zap', unlocked: false, hidden: true, category: 'special', prestigeReward: 30 },
    { id: 'secret_patient', name: 'Patient One', description: 'Wait 5 minutes without clicking', icon: 'hourglass', unlocked: false, hidden: true, category: 'special', prestigeReward: 20 },
    { id: 'secret_lucky_streak', name: 'Lucky Streak', description: 'Land 10 crits in a row', icon: 'star', unlocked: false, hidden: true, category: 'special', prestigeReward: 40 },
    { id: 'secret_night_owl', name: 'Night Owl', description: 'Play at midnight', icon: 'moon', unlocked: false, hidden: true, category: 'special', prestigeReward: 15 },
    { id: 'secret_perfectionist', name: 'Perfectionist', description: 'Unlock 100 achievements', icon: 'award', unlocked: false, hidden: true, category: 'special', prestigeReward: 200 },
  ];
  
  // v1.03 milestones (automation, challenges, finale, Endless).
  const v103Achievements: Achievement[] = [
    { id: 'automation_first', name: 'Autopilot', description: 'Turn on automation for the first time', icon: 'cpu', unlocked: false, category: 'special', prestigeReward: 50 },
    { id: 'challenge_no_clicks', name: 'Hands Off', description: 'Complete the Hands Off challenge', icon: 'hand', unlocked: false, category: 'special', prestigeReward: 150 },
    { id: 'challenge_half_crypto', name: 'Drought Survivor', description: 'Complete the Crypto Drought challenge', icon: 'droplet', unlocked: false, category: 'special', prestigeReward: 150 },
    { id: 'challenge_sprint', name: 'Overclock Sprinter', description: 'Complete the Overclock Sprint challenge', icon: 'timer', unlocked: false, category: 'special', prestigeReward: 150 },
    { id: 'challenge_bare_metal', name: 'Bare Metal', description: 'Complete the Bare Metal challenge', icon: 'shield', unlocked: false, category: 'special', prestigeReward: 150 },
    { id: 'challenge_all', name: 'Challenger', description: 'Complete every challenge', icon: 'trophy', unlocked: false, category: 'special', prestigeReward: 400 },
    { id: 'finale_breach', name: 'Core Breached', description: 'Break the Core and finish DataFall', icon: 'zap', unlocked: false, category: 'special', prestigeReward: 1000 },
    { id: 'endless_5', name: 'Deep Dive', description: 'Reach Endless depth 5', icon: 'infinity', unlocked: false, category: 'special', prestigeReward: 200 },
    { id: 'endless_10', name: 'Deeper Still', description: 'Reach Endless depth 10', icon: 'infinity', unlocked: false, category: 'special', prestigeReward: 400 },
    { id: 'endless_25', name: 'Abyss Runner', description: 'Reach Endless depth 25', icon: 'infinity', unlocked: false, category: 'special', prestigeReward: 800 },
  ];
  achievements.push(...v103Achievements);

  achievements.push(...secretAchievements);
  
  // Add claimed: false to all achievements
  return achievements.map(a => ({ ...a, claimed: false }));
};

const ACHIEVEMENTS: Achievement[] = generateTieredAchievements();

// Keeps saved progress but always uses the current catalog, so achievements added in updates appear in old saves.
const migrateAchievements = (saved: unknown): Achievement[] => {
  if (!Array.isArray(saved)) return ACHIEVEMENTS;
  const byId = new Map<string, any>(saved.filter((a: any) => a && typeof a.id === 'string').map((a: any) => [a.id, a]));
  return ACHIEVEMENTS.map(a => {
    const s = byId.get(a.id);
    return s ? { ...a, unlocked: !!s.unlocked, claimed: !!s.claimed, progress: s.progress ?? a.progress, unlockedAt: s.unlockedAt } : a;
  });
};

// ============== COSMETICS SYSTEM ==============
export interface CharacterSkin {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'credits' | 'crypto' | 'ascension';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  palette: {
    primary: string;
    secondary: string;
    glow: string;
    accent: string;
  };
  boost?: PetBoost;
  paletteMode?: 'solid' | 'gradient' | 'animated';
  gradientColors?: string[];
  animationSpeed?: number;
  ascensionRequirement?: number;
  isRelicShopOnly?: boolean;
}

export interface OrbitalPlanet {
  type: 'crystal' | 'lava' | 'gas_giant' | 'nebula' | 'black_hole' | 'binary_star' | 'death_star';
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  ringColor?: string;
  hasRings?: boolean;
  hasAtmosphere?: boolean;
  hasMoons?: boolean;
  position?: { left: string; top: string };
  scale?: number;
}

export interface RoomTheme {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'credits' | 'crypto' | 'ascension';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  colors: {
    background: string;
    nebula1: string;
    nebula2: string;
    floorLight: string;
    floorDark: string;
    gridBorder: string;
  };
  boost?: PetBoost;
  orbitalPlanet?: OrbitalPlanet;
  ascensionRequirement?: number;
}

export const CHARACTER_SKINS: CharacterSkin[] = [
  {
    id: 'default',
    name: 'Neon Violet',
    description: 'The classic cyberpunk hacker look',
    price: 0,
    currency: 'credits',
    rarity: 'common',
    palette: { primary: '#8b5cf6', secondary: '#6d28d9', glow: 'rgba(139, 92, 246, 0.6)', accent: '#a78bfa' },
    boost: { productionBoost: 1 }
  },
  {
    id: 'cyan_pulse',
    name: 'Cyan Pulse',
    description: 'Cool blue cybernetic enhancement',
    price: 10000,
    currency: 'credits',
    rarity: 'common',
    palette: { primary: '#06b6d4', secondary: '#0891b2', glow: 'rgba(6, 182, 212, 0.6)', accent: '#22d3ee' },
    boost: { clickBoost: 1 }
  },
  {
    id: 'ember_core',
    name: 'Ember Core',
    description: 'Fiery orange modifications',
    price: 20000,
    currency: 'credits',
    rarity: 'common',
    palette: { primary: '#f97316', secondary: '#ea580c', glow: 'rgba(249, 115, 22, 0.6)', accent: '#fb923c' },
    boost: { productionBoost: 1 }
  },
  {
    id: 'toxic_green',
    name: 'Toxic Green',
    description: 'Radioactive green implants',
    price: 100000,
    currency: 'credits',
    rarity: 'rare',
    palette: { primary: '#22c55e', secondary: '#16a34a', glow: 'rgba(34, 197, 94, 0.6)', accent: '#4ade80' },
    boost: { productionBoost: 1, clickBoost: 1 }
  },
  {
    id: 'blood_chrome',
    name: 'Blood Chrome',
    description: 'Crimson chrome cybernetics',
    price: 200000,
    currency: 'credits',
    rarity: 'rare',
    palette: { primary: '#ef4444', secondary: '#dc2626', glow: 'rgba(239, 68, 68, 0.6)', accent: '#f87171' },
    boost: { clickBoost: 4, critBoost: 2 }
  },
  {
    id: 'gold_elite',
    name: 'Gold Elite',
    description: 'Luxurious golden enhancements',
    price: 300000,
    currency: 'credits',
    rarity: 'epic',
    palette: { primary: '#fbbf24', secondary: '#f59e0b', glow: 'rgba(251, 191, 36, 0.6)', accent: '#fcd34d' },
    boost: { productionBoost: 2, cryptoBoost: 1 }
  },
  {
    id: 'plasma_pink',
    name: 'Plasma Pink',
    description: 'Hot pink energy signature',
    price: 400000,
    currency: 'credits',
    rarity: 'epic',
    palette: { primary: '#ec4899', secondary: '#db2777', glow: 'rgba(236, 72, 153, 0.6)', accent: '#f472b6' },
    boost: { clickBoost: 2, critBoost: 2 }
  },
  {
    id: 'void_walker',
    name: 'Void Walker',
    description: 'Dark matter infused tech',
    price: 5000000,
    currency: 'credits',
    rarity: 'legendary',
    palette: { primary: '#6366f1', secondary: '#4f46e5', glow: 'rgba(99, 102, 241, 0.7)', accent: '#818cf8' },
    boost: { productionBoost: 1, clickBoost: 1, cryptoBoost: 0 }
  },
  {
    id: 'quantum_ghost',
    name: 'Quantum Ghost',
    description: 'Phase-shifted ethereal form',
    price: 75,
    currency: 'ascension',
    rarity: 'legendary',
    palette: { primary: '#e879f9', secondary: '#d946ef', glow: 'rgba(232, 121, 249, 0.7)', accent: '#f0abfc' },
    boost: { productionBoost: 2, clickBoost: 1, critBoost: 1 }
  },
  {
    id: 'singularity',
    name: 'Singularity',
    description: 'Beyond human comprehension',
    price: 100,
    currency: 'ascension',
    rarity: 'legendary',
    palette: { primary: '#ffffff', secondary: '#e2e8f0', glow: 'rgba(255, 255, 255, 0.8)', accent: '#f1f5f9' },
    boost: { productionBoost: 2, clickBoost: 2, critBoost: 1, cryptoBoost: 1 }
  },
  {
    id: 'relic_luminous_core',
    name: 'Luminous Core',
    description: 'Relic body forged from condensed crypto light',
    price: 2800000,
    currency: 'crypto',
    rarity: 'legendary',
    palette: { primary: '#67e8f9', secondary: '#1d4ed8', glow: 'rgba(103, 232, 249, 0.9)', accent: '#fde047' },
    paletteMode: 'animated',
    gradientColors: ['#67e8f9', '#22d3ee', '#3b82f6', '#c084fc', '#67e8f9'],
    animationSpeed: 2.8,
    isRelicShopOnly: true
  },
];

export const ROOM_THEMES: RoomTheme[] = [
  {
    id: 'default',
    name: 'Neon Night',
    description: 'Classic cyberpunk atmosphere',
    price: 0,
    currency: 'credits',
    rarity: 'common',
    colors: {
      background: '#0f172a',
      nebula1: 'rgba(139, 92, 246, 0.4)',
      nebula2: 'rgba(6, 182, 212, 0.3)',
      floorLight: 'rgba(6, 182, 212, 0.15)',
      floorDark: 'rgba(139, 92, 246, 0.1)',
      gridBorder: 'rgba(6, 182, 212, 0.25)'
    },
    boost: { productionBoost: 1 }
  },
  {
    id: 'arctic_lab',
    name: 'Arctic Lab',
    description: 'Cold sterile research facility',
    price: 1000000,
    currency: 'credits',
    rarity: 'common',
    colors: {
      background: '#0c1929',
      nebula1: 'rgba(56, 189, 248, 0.3)',
      nebula2: 'rgba(186, 230, 253, 0.2)',
      floorLight: 'rgba(56, 189, 248, 0.12)',
      floorDark: 'rgba(186, 230, 253, 0.08)',
      gridBorder: 'rgba(56, 189, 248, 0.3)'
    },
    boost: { productionBoost: 1 }
  },
  {
    id: 'crimson_bunker',
    name: 'Crimson Bunker',
    description: 'Underground military installation',
    price: 3750000,
    currency: 'credits',
    rarity: 'rare',
    colors: {
      background: '#1a0a0a',
      nebula1: 'rgba(239, 68, 68, 0.35)',
      nebula2: 'rgba(251, 146, 60, 0.25)',
      floorLight: 'rgba(239, 68, 68, 0.15)',
      floorDark: 'rgba(185, 28, 28, 0.1)',
      gridBorder: 'rgba(239, 68, 68, 0.3)'
    },
    boost: { clickBoost: 4, critBoost: 2 }
  },
  {
    id: 'toxic_wasteland',
    name: 'Toxic Wasteland',
    description: 'Irradiated industrial zone',
    price: 10000000,
    currency: 'credits',
    rarity: 'rare',
    colors: {
      background: '#0a1a0a',
      nebula1: 'rgba(34, 197, 94, 0.35)',
      nebula2: 'rgba(163, 230, 53, 0.25)',
      floorLight: 'rgba(34, 197, 94, 0.15)',
      floorDark: 'rgba(22, 163, 74, 0.1)',
      gridBorder: 'rgba(74, 222, 128, 0.3)'
    },
    boost: { productionBoost: 2, cryptoBoost: 1 }
  },
  {
    id: 'golden_palace',
    name: 'Golden Palace',
    description: 'Opulent corporate headquarters',
    price: 12500000,
    currency: 'credits',
    rarity: 'epic',
    colors: {
      background: '#1a1506',
      nebula1: 'rgba(251, 191, 36, 0.35)',
      nebula2: 'rgba(245, 158, 11, 0.25)',
      floorLight: 'rgba(251, 191, 36, 0.15)',
      floorDark: 'rgba(217, 119, 6, 0.1)',
      gridBorder: 'rgba(252, 211, 77, 0.35)'
    },
    boost: { productionBoost: 3, cryptoBoost: 3 }
  },
  {
    id: 'synthwave_sunset',
    name: 'Synthwave Sunset',
    description: 'Retro-futuristic pink paradise',
    price: 50000000,
    currency: 'credits',
    rarity: 'epic',
    colors: {
      background: '#1a0a1a',
      nebula1: 'rgba(236, 72, 153, 0.4)',
      nebula2: 'rgba(168, 85, 247, 0.3)',
      floorLight: 'rgba(236, 72, 153, 0.15)',
      floorDark: 'rgba(168, 85, 247, 0.1)',
      gridBorder: 'rgba(244, 114, 182, 0.35)'
    },
    boost: { clickBoost: 1, critBoost: 1, productionBoost: 1 }
  },
  {
    id: 'deep_void',
    name: 'Deep Void',
    description: 'The darkness between stars',
    price: 375,
    currency: 'ascension',
    rarity: 'legendary',
    colors: {
      background: '#050510',
      nebula1: 'rgba(99, 102, 241, 0.25)',
      nebula2: 'rgba(139, 92, 246, 0.2)',
      floorLight: 'rgba(99, 102, 241, 0.1)',
      floorDark: 'rgba(79, 70, 229, 0.08)',
      gridBorder: 'rgba(129, 140, 248, 0.2)'
    },
    boost: { productionBoost: 2, clickBoost: 2, cryptoBoost: 1 }
  },
  {
    id: 'quantum_realm',
    name: 'Quantum Realm',
    description: 'Reality bends to your will',
    price: 750,
    currency: 'ascension',
    rarity: 'legendary',
    colors: {
      background: '#0a0a14',
      nebula1: 'rgba(232, 121, 249, 0.4)',
      nebula2: 'rgba(192, 132, 252, 0.3)',
      floorLight: 'rgba(232, 121, 249, 0.15)',
      floorDark: 'rgba(192, 132, 252, 0.1)',
      gridBorder: 'rgba(240, 171, 252, 0.35)'
    },
    boost: { productionBoost: 3, clickBoost: 2, critBoost: 2, cryptoBoost: 1 }
  },
];

export interface CharacterAccessory {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'credits' | 'crypto' | 'ascension';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  type: 'hat' | 'glasses' | 'headphones';
  boost?: PetBoost;
  ascensionRequirement?: number;
  isRelicShopOnly?: boolean;
}

export const CHARACTER_ACCESSORIES: CharacterAccessory[] = [
  // Common (Gray)
  {
    id: 'none',
    name: 'None',
    description: 'No accessory equipped',
    price: 0,
    currency: 'credits',
    rarity: 'common',
    type: 'hat',
    boost: { critBoost: 1 }
  },
  {
    id: 'cowboy_hat',
    name: 'Cowboy Hat',
    description: 'Yeehaw, cyber cowboy',
    price: 8000,
    currency: 'credits',
    rarity: 'common',
    type: 'hat',
    boost: { clickBoost: 1 }
  },
  {
    id: 'bowler_hat',
    name: 'Bowler Hat',
    description: 'Classic gentleman hacker',
    price: 12000,
    currency: 'credits',
    rarity: 'common',
    type: 'hat',
    boost: { productionBoost: 1 }
  },
  {
    id: 'beanie',
    name: 'Beanie',
    description: 'Cozy hacker vibes',
    price: 6000,
    currency: 'credits',
    rarity: 'common',
    type: 'hat',
    boost: { clickBoost: 1 }
  },
  {
    id: 'sunglasses',
    name: 'Cyber Shades',
    description: 'Too cool for the matrix',
    price: 22500,
    currency: 'credits',
    rarity: 'common',
    type: 'glasses',
    boost: { critBoost: 1 }
  },
  // Rare (Blue)
  {
    id: 'propeller_hat',
    name: 'Propeller Hat',
    description: 'Silly but aerodynamic',
    price: 30000,
    currency: 'credits',
    rarity: 'rare',
    type: 'hat',
    boost: { clickBoost: 4 }
  },
  {
    id: 'top_hat',
    name: 'Top Hat',
    description: 'Distinguished cyber aristocrat',
    price: 42000,
    currency: 'credits',
    rarity: 'rare',
    type: 'hat',
    boost: { productionBoost: 2, cryptoBoost: 1 }
  },
  {
    id: 'vr_visor',
    name: 'VR Visor',
    description: 'See the code',
    price: 80000,
    currency: 'credits',
    rarity: 'rare',
    type: 'glasses',
    boost: { critBoost: 2, productionBoost: 1 }
  },
  {
    id: 'headphones',
    name: 'DJ Headphones',
    description: 'Drop the bass, hack the system',
    price: 100000,
    currency: 'credits',
    rarity: 'rare',
    type: 'headphones',
    boost: { productionBoost: 4 }
  },
  {
    id: 'gaming_headset',
    name: 'Gaming Headset',
    description: 'Pro gamer setup with mic',
    price: 120000,
    currency: 'credits',
    rarity: 'rare',
    type: 'headphones',
    boost: { clickBoost: 4, critBoost: 2 }
  },
  // Epic (Purple)
  {
    id: 'crown',
    name: 'Royal Crown',
    description: 'King of the digital realm',
    price: 300000,
    currency: 'credits',
    rarity: 'epic',
    type: 'hat',
    boost: { productionBoost: 2, clickBoost: 2, cryptoBoost: 2 }
  },
  {
    id: 'halo',
    name: 'Digital Halo',
    description: 'Angelic data overflow',
    price: 750000,
    currency: 'credits',
    rarity: 'epic',
    type: 'hat',
    boost: { productionBoost: 6, critBoost: 4 }
  },
  {
    id: 'monocle',
    name: 'Cyber Monocle',
    description: 'Sophisticated analysis',
    price: 750000,
    currency: 'credits',
    rarity: 'epic',
    type: 'glasses',
    boost: { critBoost: 3, cryptoBoost: 2 }
  },
  {
    id: 'neural_link',
    name: 'Neural Link',
    description: 'Direct brain interface',
    price: 400000,
    currency: 'credits',
    rarity: 'epic',
    type: 'headphones',
    boost: { productionBoost: 3, clickBoost: 2 }
  },
  // Legendary (Yellow)
  {
    id: 'horns',
    name: 'Demon Horns',
    description: 'Embrace the dark web',
    price: 250,
    currency: 'ascension',
    rarity: 'legendary',
    type: 'hat',
    boost: { clickBoost: 2, critBoost: 2, cryptoBoost: 1 }
  },
  {
    id: 'antenna',
    name: 'Signal Antenna',
    description: 'Intercept all frequencies',
    price: 250,
    currency: 'ascension',
    rarity: 'legendary',
    type: 'headphones',
    boost: { productionBoost: 2, clickBoost: 2, cryptoBoost: 1 }
  },
  {
    id: 'relic_quantum_wings',
    name: 'Quantum Wings',
    description: 'Ultra-rare relic accessory from deep space ruins',
    price: 54000000,
    currency: 'crypto',
    rarity: 'legendary',
    type: 'hat',
    isRelicShopOnly: true
  },
];

export interface CharacterHeadStyle {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'credits' | 'crypto' | 'ascension';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  boost?: PetBoost;
  ascensionRequirement?: number;
  isRelicShopOnly?: boolean;
}

export const CHARACTER_HEAD_STYLES: CharacterHeadStyle[] = [
  {
    id: 'default',
    name: 'Cyber Agent',
    description: 'Standard issue operative head',
    price: 0,
    currency: 'credits',
    rarity: 'common',
    boost: { clickBoost: 1 }
  },
  {
    id: 'android',
    name: 'Android Unit',
    description: 'Synthetic humanoid design',
    price: 6000,
    currency: 'credits',
    rarity: 'rare',
    boost: { productionBoost: 1, clickBoost: 1 }
  },
  {
    id: 'skull',
    name: 'Skull Face',
    description: 'Death incarnate, chrome plated',
    price: 30000,
    currency: 'credits',
    rarity: 'rare',
    boost: { critBoost: 2, clickBoost: 1 }
  },
  {
    id: 'tv_head',
    name: 'Broadcast Head',
    description: 'Retro CRT monitor face',
    price: 64000,
    currency: 'credits',
    rarity: 'rare',
    boost: { productionBoost: 2, cryptoBoost: 1 }
  },
  {
    id: 'helmet',
    name: 'Combat Helmet',
    description: 'Military-grade tactical headgear',
    price: 80000,
    currency: 'credits',
    rarity: 'rare',
    boost: { clickBoost: 4, critBoost: 2 }
  },
  {
    id: 'alien',
    name: 'Xenomorph',
    description: 'Elongated alien cranium',
    price: 450000,
    currency: 'credits',
    rarity: 'epic',
    boost: { productionBoost: 2, critBoost: 2 }
  },
  {
    id: 'cube',
    name: 'Voxel Core',
    description: 'Geometric digital construct',
    price: 675000,
    currency: 'credits',
    rarity: 'epic',
    boost: { productionBoost: 3, clickBoost: 1 }
  },
  {
    id: 'orb',
    name: 'Holo Sphere',
    description: 'Floating energy orb consciousness',
    price: 900000,
    currency: 'credits',
    rarity: 'epic',
    boost: { clickBoost: 3, cryptoBoost: 2 }
  },
  {
    id: 'glitch',
    name: 'Glitch Entity',
    description: 'Corrupted data visualization',
    price: 150,
    currency: 'ascension',
    rarity: 'legendary',
    boost: { productionBoost: 2, clickBoost: 1, critBoost: 1 }
  },
  {
    id: 'void',
    name: 'Void Walker',
    description: 'Pure darkness with starlight eyes',
    price: 500,
    currency: 'ascension',
    rarity: 'legendary',
    boost: { productionBoost: 2, critBoost: 2, cryptoBoost: 1 }
  },
  {
    id: 'triangle',
    name: 'Pyramid Mind',
    description: 'Ancient geometry meets future tech',
    price: 750,
    currency: 'ascension',
    rarity: 'legendary',
    boost: { productionBoost: 2, clickBoost: 2, critBoost: 1, cryptoBoost: 1 }
  },
  {
    id: 'relic_celestial_crown',
    name: 'Celestial Crown',
    description: 'Relic headstyle with a stellar halo matrix',
    price: 14500000,
    currency: 'crypto',
    rarity: 'legendary',
    isRelicShopOnly: true
  },
];

export type CryptoRelicSlot = 'skin' | 'headstyle' | 'accessory' | 'wing';

export interface CryptoRelicNode {
  id: string;
  name: string;
  description: string;
  slot: CryptoRelicSlot;
  cosmeticId: string;
  // Base crypto cost for level 1 upgrade.
  cost: number;
  // Linear cost growth applied per current level (e.g. 0.35 => +35% per level).
  costLinearScale: number;
  requires: string[];
  // Permanent gain applied each level.
  perLevelBoost: PetBoost;
}

export const CRYPTO_RELIC_SHOP_UNLOCK_ASCENSION = 5;

export const CRYPTO_RELIC_TREE: CryptoRelicNode[] = [
  {
    id: 'relic_node_body',
    name: 'Luminous Core',
    description: 'Permanent bonus to production, clicks, crit and crypto. Grows every level, no need to equip.',
    slot: 'skin',
    cosmeticId: 'relic_luminous_core',
    cost: 2800000,
    costLinearScale: 0.35,
    requires: [],
    perLevelBoost: { productionBoost: 1.5, clickBoost: 1.4, critBoost: 0.25, cryptoBoost: 1.0 },
  },
  {
    id: 'relic_node_head',
    name: 'Celestial Crown',
    description: 'Bigger permanent bonus to production, clicks, crit and crypto. Requires Luminous Core.',
    slot: 'headstyle',
    cosmeticId: 'relic_celestial_crown',
    cost: 7500000,
    costLinearScale: 0.4,
    requires: ['relic_node_body'],
    perLevelBoost: { productionBoost: 2.0, clickBoost: 1.7, critBoost: 0.35, cryptoBoost: 1.3 },
  },
  {
    id: 'relic_node_accessory',
    name: 'Quantum Wings',
    description: 'Largest permanent bonus to production, clicks, crit and crypto. Requires Celestial Crown.',
    slot: 'wing',
    cosmeticId: 'relic_quantum_wings',
    cost: 18000000,
    costLinearScale: 0.45,
    requires: ['relic_node_head'],
    perLevelBoost: { productionBoost: 2.6, clickBoost: 2.1, critBoost: 0.45, cryptoBoost: 2.05 },
  },
];

// v1.03: relic prices follow the current ascension requirement (~1.5x per level for the first node),
// so the Relic Shop is usable as soon as it unlocks instead of costing millions of crypto.
const RELIC_NODE_PRICE_WEIGHT: Record<string, number> = { relic_node_body: 1, relic_node_head: 1.6, relic_node_accessory: 2.5 };
export const getCryptoRelicUpgradeCost = (node: CryptoRelicNode, currentLevel: number, totalAscensions: number): number => {
  const safeLevel = Math.max(0, Math.floor(currentLevel));
  const weight = RELIC_NODE_PRICE_WEIGHT[node.id] ?? 1;
  return Math.max(1, Math.floor(1.5 * getAscensionCost(totalAscensions) * weight * (1 + node.costLinearScale * safeLevel)));
};

export interface PetBoost {
  productionBoost?: number;
  clickBoost?: number;
  critBoost?: number;
  cryptoBoost?: number;
  // v1.03: capes and wings raise crit damage (multiplies the crit multiplier)
  critDamageBoost?: number;
}

export interface CharacterPet {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'credits' | 'crypto' | 'ascension';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  boost: PetBoost;
  isAscensionPet?: boolean;
  ascensionRequirement?: number;
}

export const CHARACTER_PETS: CharacterPet[] = [
  {
    id: 'none',
    name: 'No Pet',
    description: 'Go solo',
    price: 0,
    currency: 'credits',
    rarity: 'common',
    boost: {}
  },
  {
    id: 'cosmic_dog',
    name: 'Cosmic Pup',
    description: '+1% Production Rate',
    price: 2500000,
    currency: 'credits',
    rarity: 'uncommon',
    boost: { productionBoost: 1 }
  },
  {
    id: 'geo_cat',
    name: 'Poly Cat',
    description: '+1% Click Value',
    price: 3000000,
    currency: 'credits',
    rarity: 'uncommon',
    boost: { clickBoost: 1 }
  },
  {
    id: 'cyber_fox',
    name: 'Neon Fox',
    description: '+1% Crit Chance',
    price: 4000000,
    currency: 'credits',
    rarity: 'uncommon',
    boost: { critBoost: 1 }
  },
  {
    id: 'holo_bird',
    name: 'Holo Sparrow',
    description: '+1% Crypto Rate',
    price: 5000000,
    currency: 'credits',
    rarity: 'uncommon',
    boost: { cryptoBoost: 1 }
  },
  {
    id: 'robo_bunny',
    name: 'Mecha Bunny',
    description: '+6% Production Rate',
    price: 7500000,
    currency: 'credits',
    rarity: 'rare',
    boost: { productionBoost: 6 }
  },
  {
    id: 'data_snake',
    name: 'Data Serpent',
    description: '+3% Click Value',
    price: 10000000,
    currency: 'credits',
    rarity: 'rare',
    boost: { clickBoost: 3 }
  },
  {
    id: 'pixel_dragon',
    name: 'Pixel Drake',
    description: '+6% Crit Chance',
    price: 25000000,
    currency: 'credits',
    rarity: 'rare',
    boost: { critBoost: 6 }
  },
  {
    id: 'void_cat',
    name: 'Void Kitten',
    description: '+2% Production, +1% Click',
    price: 50000000,
    currency: 'credits',
    rarity: 'legendary',
    boost: { productionBoost: 2, clickBoost: 1 }
  },
  {
    id: 'quantum_hamster',
    name: 'Quantum Hamster',
    description: '+2% Click, +1% Crit',
    price: 90000000,
    currency: 'credits',
    rarity: 'legendary',
    boost: { clickBoost: 2, critBoost: 1 }
  },
];

export const ASCENSION_PETS: CharacterPet[] = [
  {
    id: 'ascension_spark',
    name: 'Spark Wisp',
    description: '+2% All Stats',
    price: 0,
    currency: 'ascension',
    rarity: 'uncommon',
    boost: { productionBoost: 2, clickBoost: 2, critBoost: 2, cryptoBoost: 2 },
    isAscensionPet: true,
    ascensionRequirement: 1
  },
  {
    id: 'ascension_ember',
    name: 'Data Ember',
    description: '+4% Production',
    price: 0,
    currency: 'ascension',
    rarity: 'rare',
    boost: { productionBoost: 4 },
    isAscensionPet: true,
    ascensionRequirement: 5
  },
  {
    id: 'ascension_phantom',
    name: 'Cyber Phantom',
    description: '+4% Click, +2% Crit',
    price: 0,
    currency: 'ascension',
    rarity: 'rare',
    boost: { clickBoost: 4, critBoost: 2 },
    isAscensionPet: true,
    ascensionRequirement: 10
  },
  {
    id: 'ascension_nexus',
    name: 'Nexus Core',
    description: '+6% Production, +4% Crit',
    price: 0,
    currency: 'ascension',
    rarity: 'epic',
    boost: { productionBoost: 6, critBoost: 4 },
    isAscensionPet: true,
    ascensionRequirement: 15
  },
  {
    id: 'ascension_oracle',
    name: 'Oracle Spirit',
    description: '+8% Production, +6% Click',
    price: 0,
    currency: 'ascension',
    rarity: 'epic',
    boost: { productionBoost: 8, clickBoost: 6 },
    isAscensionPet: true,
    ascensionRequirement: 25
  },
  {
    id: 'ascension_infinity',
    name: 'Infinity Entity',
    description: '+10% All Stats',
    price: 0,
    currency: 'ascension',
    rarity: 'legendary',
    boost: { productionBoost: 10, clickBoost: 10, critBoost: 10, cryptoBoost: 10 },
    isAscensionPet: true,
    ascensionRequirement: 50
  },
];

export const ASCENSION_SKINS: CharacterSkin[] = [
  // Shop stat-budget anchors:
  // rare focused ~4, epic hybrid ~10-12, early legendary all-round ~32,
  // mid legendary hybrid ~36, late legendary all-round ~48, paragon ~48+ specialized.
  {
    id: 'asc_aurora',
    name: 'Aurora Shift',
    description: '+4% Production - Shifting aurora colors',
    price: 75,
    currency: 'ascension',
    rarity: 'rare',
    palette: { primary: '#34d399', secondary: '#10b981', glow: 'rgba(52, 211, 153, 0.6)', accent: '#6ee7b7' },
    boost: { productionBoost: 4 },
    paletteMode: 'gradient',
    gradientColors: ['#34d399', '#06b6d4', '#a78bfa', '#34d399'],
    ascensionRequirement: 1
  },
  {
    id: 'asc_nebula',
    name: 'Nebula Core',
    description: '+6% Production, +4% Crit - Purple cosmic gradient',
    price: 150,
    currency: 'ascension',
    rarity: 'epic',
    palette: { primary: '#a855f7', secondary: '#9333ea', glow: 'rgba(168, 85, 247, 0.7)', accent: '#c084fc' },
    boost: { productionBoost: 6, critBoost: 4 },
    paletteMode: 'gradient',
    gradientColors: ['#a855f7', '#ec4899', '#8b5cf6', '#a855f7'],
    ascensionRequirement: 3
  },
  {
    id: 'asc_solar',
    name: 'Solar Flare',
    description: '+8% Click, +4% Production - Animated solar pulse',
    price: 250,
    currency: 'ascension',
    rarity: 'epic',
    palette: { primary: '#fcd34d', secondary: '#f59e0b', glow: 'rgba(252, 211, 77, 0.7)', accent: '#fde68a' },
    boost: { clickBoost: 8, productionBoost: 4 },
    paletteMode: 'animated',
    gradientColors: ['#fbbf24', '#f97316', '#ef4444', '#fbbf24'],
    animationSpeed: 2,
    ascensionRequirement: 3
  },
  {
    id: 'asc_eclipse',
    name: 'Eclipse Shadow',
    description: '+8% All Stats - Dark void gradient',
    price: 400,
    currency: 'ascension',
    rarity: 'legendary',
    palette: { primary: '#1e293b', secondary: '#0f172a', glow: 'rgba(30, 41, 59, 0.8)', accent: '#475569' },
    boost: { productionBoost: 8, clickBoost: 8, critBoost: 8, cryptoBoost: 8 },
    paletteMode: 'gradient',
    gradientColors: ['#1e293b', '#312e81', '#1e1b4b', '#1e293b'],
    ascensionRequirement: 5
  },
  {
    id: 'asc_prismatic',
    name: 'Prismatic Entity',
    description: '+10% Production, +10% Crypto - Rainbow shimmer',
    price: 600,
    currency: 'ascension',
    rarity: 'legendary',
    palette: { primary: '#f472b6', secondary: '#06b6d4', glow: 'rgba(244, 114, 182, 0.6)', accent: '#a78bfa' },
    boost: { productionBoost: 10, cryptoBoost: 10 },
    paletteMode: 'animated',
    gradientColors: ['#ef4444', '#f97316', '#fbbf24', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899', '#ef4444'],
    animationSpeed: 4,
    ascensionRequirement: 6
  },
  {
    id: 'asc_transcendent',
    name: 'Transcendent Being',
    description: '+12% All Stats - Pure light radiance',
    price: 1000,
    currency: 'ascension',
    rarity: 'legendary',
    palette: { primary: '#f0f9ff', secondary: '#bae6fd', glow: 'rgba(240, 249, 255, 0.9)', accent: '#7dd3fc' },
    boost: { productionBoost: 12, clickBoost: 12, critBoost: 12, cryptoBoost: 12 },
    paletteMode: 'animated',
    gradientColors: ['#f0f9ff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#bae6fd', '#e0f2fe', '#f0f9ff'],
    animationSpeed: 3,
    ascensionRequirement: 10
  },
  {
    id: 'paragon_apex_core',
    name: 'Apex Core',
    description: '+14% Production, +12% Click, +12% Crypto, +10% Crit - Paragon-grade body shell',
    price: 1850,
    currency: 'ascension',
    rarity: 'legendary',
    palette: { primary: '#22d3ee', secondary: '#0ea5e9', glow: 'rgba(34, 211, 238, 0.85)', accent: '#f472b6' },
    boost: { productionBoost: 14, clickBoost: 12, cryptoBoost: 12, critBoost: 10 },
    paletteMode: 'animated',
    gradientColors: ['#22d3ee', '#38bdf8', '#a78bfa', '#f472b6', '#22d3ee'],
    animationSpeed: 3.4,
    ascensionRequirement: 50
  },
];

export const ASCENSION_HEAD_STYLES: CharacterHeadStyle[] = [
  {
    id: 'asc_crystal',
    name: 'Crystal Mind',
    description: '+4% Click',
    price: 75,
    currency: 'ascension',
    rarity: 'rare',
    boost: { clickBoost: 4 },
    ascensionRequirement: 1
  },
  {
    id: 'asc_flame',
    name: 'Flame Wraith',
    description: '+6% Production',
    price: 125,
    currency: 'ascension',
    rarity: 'epic',
    boost: { productionBoost: 6 },
    ascensionRequirement: 3
  },
  {
    id: 'asc_storm',
    name: 'Storm Cloud',
    description: '+6% Crit, +4% Click',
    price: 200,
    currency: 'ascension',
    rarity: 'epic',
    boost: { critBoost: 6, clickBoost: 4 },
    ascensionRequirement: 3
  },
  {
    id: 'asc_celestial',
    name: 'Celestial Halo',
    description: '+8% Production, +4% Crypto',
    price: 300,
    currency: 'ascension',
    rarity: 'legendary',
    boost: { productionBoost: 8, cryptoBoost: 4 },
    ascensionRequirement: 5
  },
  {
    id: 'asc_galaxy',
    name: 'Galaxy Brain',
    description: '+8% Production, +8% Click, +6% Crit, +6% Crypto',
    price: 475,
    currency: 'ascension',
    rarity: 'legendary',
    boost: { productionBoost: 8, clickBoost: 8, critBoost: 6, cryptoBoost: 6 },
    ascensionRequirement: 8
  },
  {
    id: 'asc_omega',
    name: 'Omega Form',
    description: '+10% Production, +10% Click',
    price: 500,
    currency: 'ascension',
    rarity: 'legendary',
    boost: { productionBoost: 10, clickBoost: 10 },
    ascensionRequirement: 5
  },
  {
    id: 'paragon_quantum_crown',
    name: 'Quantum Crownframe',
    description: '+14% Crit, +12% Click, +8% Production',
    price: 1450,
    currency: 'ascension',
    rarity: 'legendary',
    boost: { critBoost: 14, clickBoost: 12, productionBoost: 8 },
    ascensionRequirement: 50
  },
];

export const ASCENSION_ACCESSORIES: CharacterAccessory[] = [
  {
    id: 'asc_wings_small',
    name: 'Data Wings',
    description: '+4% Production',
    price: 100,
    currency: 'ascension',
    rarity: 'rare',
    type: 'hat',
    boost: { productionBoost: 4 },
    ascensionRequirement: 1
  },
  {
    id: 'asc_third_eye',
    name: 'Third Eye',
    description: '+6% Crit',
    price: 175,
    currency: 'ascension',
    rarity: 'epic',
    type: 'glasses',
    boost: { critBoost: 6 },
    ascensionRequirement: 3
  },
  {
    id: 'asc_crown_energy',
    name: 'Energy Crown',
    description: '+6% Click, +4% Crypto',
    price: 250,
    currency: 'ascension',
    rarity: 'epic',
    type: 'hat',
    boost: { clickBoost: 6, cryptoBoost: 4 },
    ascensionRequirement: 3
  },
  {
    id: 'asc_void_helm',
    name: 'Void Helm',
    description: '+8% Crypto, +4% Crit',
    price: 350,
    currency: 'ascension',
    rarity: 'legendary',
    type: 'hat',
    boost: { cryptoBoost: 8, critBoost: 4 },
    ascensionRequirement: 5
  },
  {
    id: 'asc_cosmic_visor',
    name: 'Cosmic Visor',
    description: '+8% Crit, +6% Click',
    price: 450,
    currency: 'ascension',
    rarity: 'legendary',
    type: 'glasses',
    boost: { critBoost: 8, clickBoost: 6 },
    ascensionRequirement: 5
  },
  {
    id: 'asc_divine_aura',
    name: 'Divine Aura',
    description: '+10% Production, +10% Click, +8% Crit, +8% Crypto',
    price: 625,
    currency: 'ascension',
    rarity: 'legendary',
    type: 'headphones',
    boost: { productionBoost: 10, clickBoost: 10, critBoost: 8, cryptoBoost: 8 },
    ascensionRequirement: 10
  },
  {
    id: 'paragon_void_diadem',
    name: 'Void Diadem',
    description: '+14% Crypto, +12% Crit, +10% Production',
    price: 1600,
    currency: 'ascension',
    rarity: 'legendary',
    type: 'hat',
    boost: { cryptoBoost: 14, critBoost: 12, productionBoost: 10 },
    ascensionRequirement: 50
  },
];

export interface CharacterCape {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'credits' | 'crypto' | 'ascension';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  boost?: PetBoost;
}

export interface CharacterWing {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'credits' | 'crypto' | 'ascension';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  boost?: PetBoost;
}

export const BLACK_MARKET_UNLOCK_ASCENSION = 10;

export const BLACK_MARKET_CAPES: CharacterCape[] = [
  {
    id: 'none',
    name: 'No Cape',
    description: 'Keep your profile clean and minimal.',
    price: 0,
    currency: 'ascension',
    rarity: 'common',
    boost: {},
  },
  {
    id: 'bm_void_cape',
    name: 'Void Veil Cape',
    description: 'Dark market stealth weave with low-noise trails.',
    price: 260,
    currency: 'ascension',
    rarity: 'rare',
    boost: { productionBoost: 3, clickBoost: 2 },
  },
  {
    id: 'bm_plasma_cape',
    name: 'Plasma Mantle',
    description: 'Reactive plasma cloth that amplifies click output.',
    price: 420,
    currency: 'ascension',
    rarity: 'epic',
    boost: { clickBoost: 6, critBoost: 3 },
  },
  {
    id: 'bm_singularity_cape',
    name: 'Singularity Shroud',
    description: 'Legendary drape built from compressed event-horizon fiber.',
    price: 720,
    currency: 'ascension',
    rarity: 'legendary',
    boost: { productionBoost: 8, clickBoost: 6, critBoost: 5, cryptoBoost: 5 },
  },
];

export const BLACK_MARKET_WINGS: CharacterWing[] = [
  {
    id: 'none',
    name: 'No Wings',
    description: 'No wing module equipped.',
    price: 0,
    currency: 'ascension',
    rarity: 'common',
    boost: {},
  },
  {
    id: 'bm_ion_wings',
    name: 'Ion Wings',
    description: 'Dual ion vanes tuned for sustained fabrication output.',
    price: 280,
    currency: 'ascension',
    rarity: 'rare',
    boost: { productionBoost: 4, cryptoBoost: 2 },
  },
  {
    id: 'bm_prism_wings',
    name: 'Prism Wings',
    description: 'Split-spectrum emitters that sharpen critical hits.',
    price: 460,
    currency: 'ascension',
    rarity: 'epic',
    boost: { critBoost: 5, clickBoost: 4 },
  },
  {
    id: 'bm_quantum_wings_mk2',
    name: 'Quantum Wings Mk-II',
    description: 'Black market wing frame with recursive phase blades.',
    price: 760,
    currency: 'ascension',
    rarity: 'legendary',
    boost: { productionBoost: 7, clickBoost: 7, critBoost: 5, cryptoBoost: 5 },
  },
];

export type BlackMarketUpgradeId = 'click_overflow' | 'adjacency_matrix';

export interface BlackMarketUpgrade {
  id: BlackMarketUpgradeId;
  name: string;
  description: string;
  cost: number;
  currency: 'ascension';
}

export const BLACK_MARKET_UPGRADES: BlackMarketUpgrade[] = [
  {
    id: 'click_overflow',
    name: 'Click Overflow',
    description: 'Allows crit chance over 100%. Overflow converts into extra crit multiplier.',
    cost: 900,
    currency: 'ascension',
  },
  {
    id: 'adjacency_matrix',
    name: 'Adjacency Matrix',
    description: 'One-time passive. Arrange miners: horizontal 3s boost click, vertical 3s boost production, 2x2 squares boost crypto. All patterns add luck.',
    cost: 1050,
    currency: 'ascension',
  },
];

export const PARAGON_LAB_UNLOCK_ASCENSION = 20;

export type ParagonUpgradeId =
  | 'softcap_breaker'
  | 'node_compression'
  | 'crypto_echo'
  | 'persistent_momentum'
  | 'floater_reactor'
  | 'timewarp_overdrive'
  | 'critical_singularity'
  | 'chrono_stabilizer'
  | 'overclock_lattice'
  | 'quantum_ledger'
  | 'singularity_tap'
  | 'critical_cascade';

export interface ParagonUpgrade {
  id: ParagonUpgradeId;
  // v1.03 Paragon II modules unlock later than the lab itself.
  requiredAscensions?: number;
  name: string;
  description: string;
  baseCost: number;
  costMultiplier: number;
  maxLevel: number;
  effect: {
    type:
      | 'production_boost_pct'
      | 'node_conversion_pct'
      | 'crypto_boost_pct'
      | 'click_boost_pct'
      | 'pickup_spawn_pct'
      | 'time_warp_power_pct'
      | 'crit_chance_pct'
      | 'time_warp_cooldown_pct';
    value: number;
  };
}

export const PARAGON_II_UNLOCK_ASCENSION = 25;
export const PARAGON_UPGRADES: ParagonUpgrade[] = [
  {
    id: 'softcap_breaker',
    name: 'Softcap Breaker',
    description: '+7% production per level. Stacks with all other bonuses.',
    baseCost: 260,
    costMultiplier: 1.65,
    maxLevel: 10,
    effect: { type: 'production_boost_pct', value: 7 },
  },
  {
    id: 'node_compression',
    name: 'Node Compression',
    description: 'Selling is cheaper: 6% less data per Node per level (minimum 40 data).',
    baseCost: 190,
    costMultiplier: 1.58,
    maxLevel: 8,
    effect: { type: 'node_conversion_pct', value: 6 },
  },
  {
    id: 'crypto_echo',
    name: 'Crypto Echo',
    description: 'Boosts crypto production from all mining sources.',
    baseCost: 220,
    costMultiplier: 1.62,
    maxLevel: 8,
    effect: { type: 'crypto_boost_pct', value: 9 },
  },
  {
    id: 'persistent_momentum',
    name: 'Persistent Momentum',
    description: '+6% data per click per level.',
    baseCost: 170,
    costMultiplier: 1.56,
    maxLevel: 10,
    effect: { type: 'click_boost_pct', value: 6 },
  },
  {
    id: 'floater_reactor',
    name: 'Floater Reactor',
    description: 'Floating pickups appear 5% more often per level.',
    baseCost: 210,
    costMultiplier: 1.6,
    maxLevel: 8,
    effect: { type: 'pickup_spawn_pct', value: 5 },
  },
  {
    id: 'timewarp_overdrive',
    name: 'Timewarp Overdrive',
    description: 'Raises Time Warp payout from mini-game clicks.',
    baseCost: 250,
    costMultiplier: 1.68,
    maxLevel: 8,
    effect: { type: 'time_warp_power_pct', value: 10 },
  },
  {
    id: 'critical_singularity',
    name: 'Critical Singularity',
    description: '+3.5% crit chance per level.',
    baseCost: 230,
    costMultiplier: 1.66,
    maxLevel: 8,
    effect: { type: 'crit_chance_pct', value: 3.5 },
  },
  {
    id: 'chrono_stabilizer',
    name: 'Chrono Stabilizer',
    description: 'Time Warp recharges 5% faster per level.',
    baseCost: 240,
    costMultiplier: 1.64,
    maxLevel: 8,
    effect: { type: 'time_warp_cooldown_pct', value: 5 },
  },
  // v1.03 Paragon II (ascension 25). v1.04: same bonus per level as the Paragon I twin (it was less than half)
  // and cheaper to start (450 instead of 600), so the later unlock is never a worse buy per prestige.
  {
    id: 'overclock_lattice',
    name: 'Overclock Lattice',
    description: '+7% production per level. Paragon II.',
    baseCost: 450,
    costMultiplier: 1.5,
    maxLevel: 10,
    requiredAscensions: PARAGON_II_UNLOCK_ASCENSION,
    effect: { type: 'production_boost_pct', value: 7 },
  },
  {
    id: 'quantum_ledger',
    name: 'Quantum Ledger',
    description: '+9% crypto production per level. Paragon II.',
    baseCost: 450,
    costMultiplier: 1.5,
    maxLevel: 10,
    requiredAscensions: PARAGON_II_UNLOCK_ASCENSION,
    effect: { type: 'crypto_boost_pct', value: 9 },
  },
  {
    id: 'singularity_tap',
    name: 'Singularity Tap',
    description: '+8% data per click per level. Paragon II.',
    baseCost: 450,
    costMultiplier: 1.5,
    maxLevel: 10,
    requiredAscensions: PARAGON_II_UNLOCK_ASCENSION,
    effect: { type: 'click_boost_pct', value: 8 },
  },
  {
    id: 'critical_cascade',
    name: 'Critical Cascade',
    description: '+3.5% crit chance per level. Paragon II.',
    baseCost: 450,
    costMultiplier: 1.5,
    maxLevel: 10,
    requiredAscensions: PARAGON_II_UNLOCK_ASCENSION,
    effect: { type: 'crit_chance_pct', value: 3.5 },
  },
];

export const ASCENSION_ROOM_THEMES: RoomTheme[] = [
  {
    id: 'asc_crystal_cave',
    name: 'Ice Giant Orbit',
    description: '+4% Production - View from icy moon orbit',
    price: 150,
    currency: 'ascension',
    rarity: 'rare',
    colors: {
      background: '#0c1631',
      nebula1: 'rgba(147, 197, 253, 0.4)',
      nebula2: 'rgba(196, 181, 253, 0.3)',
      floorLight: 'rgba(147, 197, 253, 0.15)',
      floorDark: 'rgba(196, 181, 253, 0.1)',
      gridBorder: 'rgba(219, 234, 254, 0.3)'
    },
    boost: { productionBoost: 4 },
    orbitalPlanet: {
      type: 'crystal',
      primaryColor: '#93c5fd',
      secondaryColor: '#1e3a5f',
      accentColor: '#dbeafe',
      hasAtmosphere: true,
      hasMoons: true,
      position: { left: '2%', top: '3%' },
      scale: 0.9
    },
    ascensionRequirement: 1
  },
  {
    id: 'asc_void_station',
    name: 'Event Horizon',
    description: '+6% Crypto - Station at black hole edge',
    price: 250,
    currency: 'ascension',
    rarity: 'epic',
    colors: {
      background: '#030712',
      nebula1: 'rgba(31, 41, 55, 0.5)',
      nebula2: 'rgba(17, 24, 39, 0.4)',
      floorLight: 'rgba(55, 65, 81, 0.1)',
      floorDark: 'rgba(31, 41, 55, 0.08)',
      gridBorder: 'rgba(75, 85, 99, 0.2)'
    },
    boost: { cryptoBoost: 6 },
    orbitalPlanet: {
      type: 'black_hole',
      primaryColor: '#18181b',
      secondaryColor: '#3f3f46',
      accentColor: '#f97316',
      ringColor: 'rgba(249, 115, 22, 0.6)',
      hasRings: true,
      position: { left: '60%', top: '5%' },
      scale: 1.1
    },
    ascensionRequirement: 3
  },
  {
    id: 'asc_solar_forge',
    name: 'Lava World Close-Up',
    description: '+8% Production, +4% Click - Volcanic planet surface',
    price: 375,
    currency: 'ascension',
    rarity: 'epic',
    colors: {
      background: '#1c1917',
      nebula1: 'rgba(251, 191, 36, 0.4)',
      nebula2: 'rgba(245, 158, 11, 0.3)',
      floorLight: 'rgba(251, 191, 36, 0.12)',
      floorDark: 'rgba(245, 158, 11, 0.08)',
      gridBorder: 'rgba(252, 211, 77, 0.25)'
    },
    boost: { productionBoost: 8, clickBoost: 4 },
    orbitalPlanet: {
      type: 'lava',
      primaryColor: '#ef4444',
      secondaryColor: '#7f1d1d',
      accentColor: '#fbbf24',
      hasAtmosphere: true,
      position: { left: '5%', top: '8%' },
      scale: 1.0
    },
    ascensionRequirement: 3
  },
  {
    id: 'asc_nebula_core',
    name: 'Gas Giant Storm',
    description: '+8% All Stats - Inside massive storm bands',
    price: 500,
    currency: 'ascension',
    rarity: 'legendary',
    colors: {
      background: '#0f0720',
      nebula1: 'rgba(168, 85, 247, 0.5)',
      nebula2: 'rgba(236, 72, 153, 0.4)',
      floorLight: 'rgba(168, 85, 247, 0.15)',
      floorDark: 'rgba(236, 72, 153, 0.1)',
      gridBorder: 'rgba(192, 132, 252, 0.35)'
    },
    boost: { productionBoost: 8, clickBoost: 8, critBoost: 8, cryptoBoost: 8 },
    orbitalPlanet: {
      type: 'gas_giant',
      primaryColor: '#a855f7',
      secondaryColor: '#581c87',
      accentColor: '#e879f9',
      ringColor: 'rgba(192, 132, 252, 0.5)',
      hasRings: true,
      hasAtmosphere: true,
      position: { left: '55%', top: '2%' },
      scale: 1.15
    },
    ascensionRequirement: 5
  },
  {
    id: 'asc_dimension_rift',
    name: 'Binary Star System',
    description: '+10% Crypto, +6% Crit - Twin suns dance',
    price: 650,
    currency: 'ascension',
    rarity: 'legendary',
    colors: {
      background: '#0a0a0a',
      nebula1: 'rgba(6, 182, 212, 0.4)',
      nebula2: 'rgba(139, 92, 246, 0.4)',
      floorLight: 'rgba(6, 182, 212, 0.12)',
      floorDark: 'rgba(139, 92, 246, 0.1)',
      gridBorder: 'rgba(34, 211, 238, 0.3)'
    },
    boost: { cryptoBoost: 10, critBoost: 6 },
    orbitalPlanet: {
      type: 'binary_star',
      primaryColor: '#06b6d4',
      secondaryColor: '#8b5cf6',
      accentColor: '#fbbf24',
      position: { left: '3%', top: '5%' },
      scale: 0.85
    },
    ascensionRequirement: 4
  },
  {
    id: 'asc_transcendence',
    name: 'Cosmic Nebula Heart',
    description: '+12% All Stats - Birth of stars',
    price: 1200,
    currency: 'ascension',
    rarity: 'legendary',
    colors: {
      background: '#0f0f1a',
      nebula1: 'rgba(236, 72, 153, 0.6)',
      nebula2: 'rgba(168, 85, 247, 0.5)',
      floorLight: 'rgba(236, 72, 153, 0.15)',
      floorDark: 'rgba(168, 85, 247, 0.1)',
      gridBorder: 'rgba(244, 114, 182, 0.4)'
    },
    boost: { productionBoost: 12, clickBoost: 12, critBoost: 12, cryptoBoost: 12 },
    ascensionRequirement: 10,
    orbitalPlanet: {
      type: 'nebula',
      primaryColor: '#ec4899',
      secondaryColor: '#a855f7',
      accentColor: '#fbbf24',
      hasAtmosphere: true,
      position: { left: '50%', top: '0%' },
      scale: 1.2
    }
  },
  {
    id: 'asc_star_of_death',
    name: 'Star of Death',
    description: '+10% Production, +10% Click, +8% Crit, +8% Crypto - Ultimate weapon in orbit',
    price: 950,
    currency: 'ascension',
    rarity: 'legendary',
    colors: {
      background: '#05080a',
      nebula1: 'rgba(75, 85, 99, 0.3)',
      nebula2: 'rgba(55, 65, 81, 0.3)',
      floorLight: 'rgba(107, 114, 128, 0.1)',
      floorDark: 'rgba(55, 65, 81, 0.1)',
      gridBorder: 'rgba(156, 163, 175, 0.3)'
    },
    boost: { productionBoost: 10, clickBoost: 10, critBoost: 8, cryptoBoost: 8 },
    ascensionRequirement: 6,
    orbitalPlanet: {
      type: 'death_star',
      primaryColor: '#6b7280',
      secondaryColor: '#374151',
      accentColor: '#22c55e',
      position: { left: '50%', top: '5%' },
      scale: 1.5
    }
  },
  {
    id: 'paragon_singularity_vault',
    name: 'Singularity Vault',
    description: '+16% Production, +14% Crypto, +10% Click - End-game command deck',
    price: 2100,
    currency: 'ascension',
    rarity: 'legendary',
    colors: {
      background: '#040617',
      nebula1: 'rgba(34, 211, 238, 0.26)',
      nebula2: 'rgba(168, 85, 247, 0.3)',
      floorLight: 'rgba(34, 211, 238, 0.16)',
      floorDark: 'rgba(59, 7, 100, 0.2)',
      gridBorder: 'rgba(125, 211, 252, 0.38)'
    },
    boost: { productionBoost: 16, cryptoBoost: 14, clickBoost: 10 },
    ascensionRequirement: 50,
    orbitalPlanet: {
      type: 'black_hole',
      primaryColor: '#0b122b',
      secondaryColor: '#1e1b4b',
      accentColor: '#67e8f9',
      ringColor: 'rgba(167, 139, 250, 0.6)',
      hasRings: true,
      hasAtmosphere: true,
      position: { left: '68%', top: '3%' },
      scale: 1.25
    }
  },
];

export interface CosmeticsState {
  ownedSkins: string[];
  ownedThemes: string[];
  ownedAccessories: string[];
  ownedCapes: string[];
  ownedWings: string[];
  ownedHeadStyles: string[];
  ownedPets: string[];
  ownedClickEffects: string[];
  ownedLootBoxSkins: string[];
  ownedMachineBoxSkins: string[];
  cryptoRelicLevels: Record<string, number>;
  ownedAscensionPets: string[];
  ownedAscensionSkins: string[];
  ownedAscensionHeadStyles: string[];
  ownedAscensionAccessories: string[];
  ownedAscensionThemes: string[];
  activeSkinId: string;
  activeThemeId: string;
  activeAccessoryId: string;
  activeCapeId: string;
  activeWingId: string;
  activeHeadStyleId: string;
  activePetId: string;
  activeClickEffectId: string;
  activeLootBoxSkinId: string;
  activeMachineBoxSkinId: string;
  activeAscensionPetId: string;
  blackMarketClickOverflowPurchased: boolean;
  blackMarketAdjacencyPurchased: boolean;
  paragonLevels: Record<string, number>;
}

export interface ClickEffect {
  id: string;
  name: string;
  description: string;
  rarity: 'rare' | 'epic' | 'legendary';
  boost: Pick<PetBoost, 'clickBoost' | 'critBoost'>;
}

export interface LootBoxSkin {
  id: string;
  name: string;
  description: string;
  rarity: LootRarity;
  // Loot box rarity luck bonus applied while opening ascension loot.
  luckBonus: number;
  isLootBoxExclusive: boolean;
  colors: {
    bodyFrom: string;
    bodyVia: string;
    bodyTo: string;
    sideLeft: string;
    sideRight: string;
    topFrom: string;
    topTo: string;
    core: string;
    glow: string;
    accent: string;
  };
}

export interface MachineBoxSkin {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'crypto';
  rarity: LootRarity;
  // Loot box rarity luck bonus applied while opening ascension loot.
  luckBonus: number;
  // v1.03: miner skins boost crypto gain (set by the item economy table).
  boost?: PetBoost;
  // Allows this skin to be dropped from loot boxes in addition to crypto-shop purchase.
  canDropFromLootBox: boolean;
  colors: {
    primary: string;
    secondary: string;
    glow: string;
    // 0..1 blend factor applied to base machine variant colors.
    mix: number;
  };
}

export const CLICK_EFFECTS: ClickEffect[] = [
  {
    id: 'ember_surge',
    name: 'Ember Surge',
    description: 'Ignites each click with short-lived fire sparks.',
    rarity: 'rare',
    boost: { clickBoost: 0.8, critBoost: 0.4 },
  },
  {
    id: 'ion_arc',
    name: 'Ion Arc',
    description: 'High-voltage arc lines burst from impact points.',
    rarity: 'rare',
    boost: { clickBoost: 0.9, critBoost: 0.5 },
  },
  {
    id: 'phase_shatter',
    name: 'Phase Shatter',
    description: 'Violet shards split outward with each tap.',
    rarity: 'epic',
    boost: { clickBoost: 1.1, critBoost: 0.7 },
  },
  {
    id: 'plasma_wave',
    name: 'Plasma Wave',
    description: 'Dense plasma bloom leaves a neon afterglow.',
    rarity: 'epic',
    boost: { clickBoost: 1.3, critBoost: 0.8 },
  },
  {
    id: 'solar_flare',
    name: 'Solar Flare',
    description: 'Legendary flare pulse with golden fragments.',
    rarity: 'legendary',
    boost: { clickBoost: 1.6, critBoost: 1.0 },
  },
];

type LootRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
type LootCosmeticType = 'skin' | 'theme' | 'accessory' | 'headstyle' | 'pet' | 'clickeffect' | 'boxskin' | 'machineboxskin';

export const LOOT_BOX_SKINS: LootBoxSkin[] = [
  {
    id: 'default',
    name: 'Neon Crate',
    description: 'Standard ascension crate frame.',
    rarity: 'common',
    luckBonus: 0,
    isLootBoxExclusive: false,
    colors: {
      bodyFrom: 'rgba(30, 41, 59, 0.95)',
      bodyVia: 'rgba(76, 29, 149, 0.92)',
      bodyTo: 'rgba(2, 6, 23, 0.96)',
      sideLeft: 'rgba(236, 72, 153, 0.4)',
      sideRight: 'rgba(34, 211, 238, 0.4)',
      topFrom: 'rgba(103, 232, 249, 0.35)',
      topTo: 'rgba(168, 85, 247, 0.35)',
      core: '#f0abfc',
      glow: 'rgba(236, 72, 153, 0.45)',
      accent: '#67e8f9',
    },
  },
  {
    id: 'ember_vault',
    name: 'Ember Vault',
    description: 'Industrial furnace shell with hot plasma seams.',
    rarity: 'rare',
    luckBonus: 2,
    isLootBoxExclusive: true,
    colors: {
      bodyFrom: 'rgba(69, 10, 10, 0.95)',
      bodyVia: 'rgba(124, 45, 18, 0.92)',
      bodyTo: 'rgba(28, 25, 23, 0.96)',
      sideLeft: 'rgba(251, 113, 133, 0.45)',
      sideRight: 'rgba(251, 146, 60, 0.45)',
      topFrom: 'rgba(253, 186, 116, 0.35)',
      topTo: 'rgba(239, 68, 68, 0.35)',
      core: '#f97316',
      glow: 'rgba(249, 115, 22, 0.5)',
      accent: '#fbbf24',
    },
  },
  {
    id: 'glacier_matrix',
    name: 'Glacier Matrix',
    description: 'Cryo-forged casing with ionized blue edges.',
    rarity: 'rare',
    luckBonus: 2,
    isLootBoxExclusive: true,
    colors: {
      bodyFrom: 'rgba(8, 47, 73, 0.95)',
      bodyVia: 'rgba(15, 118, 110, 0.9)',
      bodyTo: 'rgba(2, 6, 23, 0.96)',
      sideLeft: 'rgba(56, 189, 248, 0.45)',
      sideRight: 'rgba(34, 211, 238, 0.45)',
      topFrom: 'rgba(125, 211, 252, 0.38)',
      topTo: 'rgba(22, 163, 74, 0.28)',
      core: '#22d3ee',
      glow: 'rgba(34, 211, 238, 0.5)',
      accent: '#a5f3fc',
    },
  },
  {
    id: 'pulse_cataclysm',
    name: 'Pulse Cataclysm',
    description: 'Epic surge plating with prismatic reactor rails.',
    rarity: 'epic',
    luckBonus: 3,
    isLootBoxExclusive: true,
    colors: {
      bodyFrom: 'rgba(30, 27, 75, 0.96)',
      bodyVia: 'rgba(91, 33, 182, 0.92)',
      bodyTo: 'rgba(3, 7, 18, 0.98)',
      sideLeft: 'rgba(232, 121, 249, 0.48)',
      sideRight: 'rgba(59, 130, 246, 0.48)',
      topFrom: 'rgba(192, 132, 252, 0.42)',
      topTo: 'rgba(99, 102, 241, 0.36)',
      core: '#e879f9',
      glow: 'rgba(192, 132, 252, 0.55)',
      accent: '#67e8f9',
    },
  },
  {
    id: 'void_relic_case',
    name: 'Void Relic Case',
    description: 'Legendary deep-space container with singularity glow.',
    rarity: 'legendary',
    luckBonus: 4,
    isLootBoxExclusive: true,
    colors: {
      bodyFrom: 'rgba(2, 6, 23, 0.98)',
      bodyVia: 'rgba(49, 46, 129, 0.94)',
      bodyTo: 'rgba(3, 7, 18, 0.99)',
      sideLeft: 'rgba(217, 70, 239, 0.52)',
      sideRight: 'rgba(34, 211, 238, 0.52)',
      topFrom: 'rgba(250, 204, 21, 0.34)',
      topTo: 'rgba(168, 85, 247, 0.4)',
      core: '#facc15',
      glow: 'rgba(250, 204, 21, 0.55)',
      accent: '#c4b5fd',
    },
  },
];

export const MACHINE_BOX_SKINS: MachineBoxSkin[] = [
  {
    id: 'default',
    name: 'Grid Miner',
    description: 'Default miner casing on the checkerboard.',
    price: 0,
    currency: 'crypto',
    rarity: 'common',
    luckBonus: 0,
    canDropFromLootBox: false,
    colors: {
      primary: '#06b6d4',
      secondary: '#0891b2',
      glow: 'rgba(6, 182, 212, 0.6)',
      mix: 0,
    },
  },
  {
    id: 'fusion_cyan',
    name: 'Fusion Cyan Miner',
    description: 'Clean cyan overdrive shell for miner stacks.',
    price: 2800000,
    currency: 'crypto',
    rarity: 'uncommon',
    luckBonus: 1,
    canDropFromLootBox: true,
    colors: {
      primary: '#22d3ee',
      secondary: '#3b82f6',
      glow: 'rgba(34, 211, 238, 0.75)',
      mix: 0.4,
    },
  },
  {
    id: 'ember_core_box',
    name: 'Ember Core Miner',
    description: 'High-heat industrial miner skin.',
    price: 6200000,
    currency: 'crypto',
    rarity: 'rare',
    luckBonus: 2,
    canDropFromLootBox: true,
    colors: {
      primary: '#fb923c',
      secondary: '#ef4444',
      glow: 'rgba(249, 115, 22, 0.78)',
      mix: 0.45,
    },
  },
  {
    id: 'phase_prism_box',
    name: 'Phase Prism Miner',
    description: 'Epic violet prism sheen across all miners.',
    price: 14500000,
    currency: 'crypto',
    rarity: 'epic',
    luckBonus: 3,
    canDropFromLootBox: true,
    colors: {
      primary: '#c084fc',
      secondary: '#8b5cf6',
      glow: 'rgba(192, 132, 252, 0.82)',
      mix: 0.55,
    },
  },
  {
    id: 'singularity_chrome',
    name: 'Singularity Chrome Miner',
    description: 'Legendary black-chrome miner frame with deep-space glow.',
    price: 38000000,
    currency: 'crypto',
    rarity: 'legendary',
    luckBonus: 4,
    canDropFromLootBox: true,
    colors: {
      primary: '#facc15',
      secondary: '#6366f1',
      glow: 'rgba(250, 204, 21, 0.85)',
      mix: 0.62,
    },
  },
];

interface LootDropCandidate {
  cosmeticType: LootCosmeticType;
  id: string;
  name: string;
  rarity: LootRarity;
  isAscensionCatalogItem: boolean;
  // v1.03: owned items can drop again; duplicates pay credits instead.
  owned?: boolean;
}

export type LootBoxReward =
  | {
      kind: 'cosmetic';
      cosmeticType: LootCosmeticType;
      itemId: string;
      itemName: string;
      rarity: LootRarity;
      isAscensionItem: boolean;
      // v1.03: 'welcome' = the returning-player gift (different dialog text).
      source?: 'welcome';
    }
  | {
      kind: 'fallback';
      data: number;
      credits: number;
      crypto: number;
      source?: 'welcome';
    };

// ---------------------------------------------------------------------------------------------
// v1.03 item economy: ONE source of truth for every cosmetic's stat and price.
// Each slot boosts a single stat; the rarity decides how much and what it costs. Applied once at
// module load, so owned items simply get their new stats (save data only stores ids).
// ---------------------------------------------------------------------------------------------
export type ItemStat = 'productionBoost' | 'clickBoost' | 'critBoost' | 'cryptoBoost' | 'critDamageBoost';

// Credit-shop items: +% and price in credits (machine skins use the same numbers in crypto).
export const RARITY_ECONOMY: Record<LootRarity, { value: number; price: number }> = {
  common: { value: 2, price: 10_000 },
  uncommon: { value: 4, price: 30_000 },
  rare: { value: 6, price: 100_000 },
  epic: { value: 9, price: 400_000 },
  legendary: { value: 12, price: 1_500_000 },
};

// Ascension (prestige-priced) items: stronger, and equipping several gives a set bonus.
export const ASCENSION_RARITY_VALUE: Record<LootRarity, number> = {
  common: 12,
  uncommon: 12,
  rare: 15,
  epic: 18,
  legendary: 22,
};
const PARAGON_ITEM_VALUE = 25; // the asc-50 'paragon_*' set
// +5% production, clicks and crypto for each equipped ascension item beyond the first (max +15%).
export const ASCENSION_SET_BONUS_PER_ITEM = 5;
export const ASCENSION_SET_BONUS_MAX = 15;

// Which stat each slot boosts.
export const SLOT_STAT = {
  skin: 'productionBoost',
  headstyle: 'productionBoost',
  accessory: 'productionBoost',
  pet: 'clickBoost',
  theme: 'cryptoBoost',
  machineboxskin: 'cryptoBoost',
  clickeffect: 'critBoost',
  cape: 'critDamageBoost',
  wing: 'critDamageBoost',
} as const satisfies Record<string, ItemStat>;

type EconomyItem = {
  id: string;
  rarity: LootRarity;
  price?: number;
  currency?: string;
  boost?: PetBoost;
  isRelicShopOnly?: boolean;
};

const applyCreditItemEconomy = (items: EconomyItem[], stat: ItemStat) => {
  items.forEach(item => {
    if (item.isRelicShopOnly) return; // relic items get their power from the relic tree
    if ((item.price ?? 0) <= 0 && item.currency !== undefined) {
      item.boost = {}; // free default items give no bonus
      return;
    }
    item.boost = { [stat]: RARITY_ECONOMY[item.rarity].value };
    // Prestige-priced legendaries inside the credit catalogs keep their prestige price.
    if (item.currency === 'credits' || item.currency === 'crypto') item.price = RARITY_ECONOMY[item.rarity].price;
  });
};

const applyAscensionItemEconomy = (items: EconomyItem[], stat: ItemStat) => {
  items.forEach(item => {
    if ((item.price ?? 0) <= 0 && item.currency === 'ascension' && item.id === 'none') {
      item.boost = {};
      return;
    }
    const value = item.id.startsWith('paragon_') ? PARAGON_ITEM_VALUE : ASCENSION_RARITY_VALUE[item.rarity];
    item.boost = { [stat]: value };
  });
};

applyCreditItemEconomy(CHARACTER_SKINS, SLOT_STAT.skin);
applyCreditItemEconomy(CHARACTER_HEAD_STYLES, SLOT_STAT.headstyle);
applyCreditItemEconomy(CHARACTER_ACCESSORIES, SLOT_STAT.accessory);
applyCreditItemEconomy(CHARACTER_PETS, SLOT_STAT.pet);
applyCreditItemEconomy(ROOM_THEMES, SLOT_STAT.theme);
applyCreditItemEconomy(MACHINE_BOX_SKINS, SLOT_STAT.machineboxskin);
CLICK_EFFECTS.forEach(effect => { effect.boost = { critBoost: RARITY_ECONOMY[effect.rarity].value }; });
MACHINE_BOX_SKINS.forEach(skin => { skin.luckBonus = 0; }); // miners now boost crypto instead of loot luck
applyAscensionItemEconomy(ASCENSION_SKINS, SLOT_STAT.skin);
applyAscensionItemEconomy(ASCENSION_HEAD_STYLES, SLOT_STAT.headstyle);
applyAscensionItemEconomy(ASCENSION_ACCESSORIES, SLOT_STAT.accessory);
applyAscensionItemEconomy(ASCENSION_ROOM_THEMES, SLOT_STAT.theme);
applyAscensionItemEconomy(ASCENSION_PETS, SLOT_STAT.pet);
applyAscensionItemEconomy(BLACK_MARKET_CAPES, SLOT_STAT.cape);
applyAscensionItemEconomy(BLACK_MARKET_WINGS, SLOT_STAT.wing);

// Credit value of an item for loot-box duplicates (50% of its credit-shop price by rarity).
export const getDuplicateCreditValue = (rarity: LootRarity): number => Math.floor(RARITY_ECONOMY[rarity].price * 0.5);

const LOOTBOX_FALLBACK_BONUS = {
  data: 1000,
  credits: 1000,
  crypto: 1000,
} as const;

const LOOTBOX_RARITY_PRIORITY: Record<'legendary' | 'epic' | 'rare', LootRarity[]> = {
  legendary: ['legendary', 'epic', 'rare', 'uncommon', 'common'],
  epic: ['epic', 'legendary', 'rare', 'uncommon', 'common'],
  rare: ['rare', 'epic', 'legendary', 'uncommon', 'common'],
};

const rollLootboxTargetRarity = (luckBonusPercent: number = 0): 'legendary' | 'epic' | 'rare' => {
  // v1.03 base odds: 10% legendary, 30% epic, 60% rare. Crate luck shifts them upward.
  const luck = Math.max(0, luckBonusPercent);
  const legendaryChance = Math.min(0.25, 0.10 + luck * 0.005);
  const epicOnlyChance = Math.min(0.45, 0.30 + luck * 0.01);
  const roll = Math.random();
  if (roll < legendaryChance) return 'legendary';
  if (roll < legendaryChance + epicOnlyChance) return 'epic';
  return 'rare';
};

// Only items the player could unlock at their current ascension count can drop (ascensionRequirement).
const buildLootboxCandidates = (cosmetics: CosmeticsState, totalAscensions: number): LootDropCandidate[] => {
  const candidates: LootDropCandidate[] = [];

  const ownedSkins = new Set<string>([...cosmetics.ownedSkins, ...cosmetics.ownedAscensionSkins]);
  const ownedThemes = new Set<string>([...cosmetics.ownedThemes, ...cosmetics.ownedAscensionThemes]);
  const ownedAccessories = new Set<string>([...cosmetics.ownedAccessories, ...cosmetics.ownedAscensionAccessories]);
  const ownedHeadStyles = new Set<string>([...cosmetics.ownedHeadStyles, ...cosmetics.ownedAscensionHeadStyles]);
  const ownedPets = new Set<string>([...cosmetics.ownedPets, ...cosmetics.ownedAscensionPets]);
  const ownedClickEffects = new Set<string>(cosmetics.ownedClickEffects);
  const ownedLootBoxSkins = new Set<string>(cosmetics.ownedLootBoxSkins);
  const ownedMachineBoxSkins = new Set<string>(cosmetics.ownedMachineBoxSkins);

  const addItems = <T extends { id: string; name: string; rarity: LootRarity; price: number; isRelicShopOnly?: boolean; ascensionRequirement?: number }>(
    items: T[],
    cosmeticType: LootCosmeticType,
    ownedSet: Set<string>,
    isAscensionCatalogItem: boolean = false
  ) => {
    items.forEach(item => {
      if (item.price <= 0) return;
      if (item.isRelicShopOnly) return;
      if ((item.ascensionRequirement ?? 0) > totalAscensions) return;
      candidates.push({
        cosmeticType,
        id: item.id,
        name: item.name,
        rarity: item.rarity,
        isAscensionCatalogItem,
        owned: ownedSet.has(item.id),
      });
    });
  };

  addItems(CHARACTER_SKINS, 'skin', ownedSkins, false);
  addItems(ASCENSION_SKINS, 'skin', ownedSkins, true);
  addItems(ROOM_THEMES, 'theme', ownedThemes, false);
  addItems(ASCENSION_ROOM_THEMES, 'theme', ownedThemes, true);
  addItems(CHARACTER_ACCESSORIES, 'accessory', ownedAccessories, false);
  addItems(ASCENSION_ACCESSORIES, 'accessory', ownedAccessories, true);
  addItems(CHARACTER_HEAD_STYLES, 'headstyle', ownedHeadStyles, false);
  addItems(ASCENSION_HEAD_STYLES, 'headstyle', ownedHeadStyles, true);
  addItems(CHARACTER_PETS, 'pet', ownedPets, false);
  CLICK_EFFECTS.forEach(effect => {
    candidates.push({
      cosmeticType: 'clickeffect',
      id: effect.id,
      name: effect.name,
      rarity: effect.rarity,
      isAscensionCatalogItem: false,
      owned: ownedClickEffects.has(effect.id),
    });
  });

  LOOT_BOX_SKINS.forEach(boxSkin => {
    if (!boxSkin.isLootBoxExclusive) return;
    candidates.push({
      cosmeticType: 'boxskin',
      id: boxSkin.id,
      name: boxSkin.name,
      rarity: boxSkin.rarity,
      isAscensionCatalogItem: false,
      owned: ownedLootBoxSkins.has(boxSkin.id),
    });
  });

  MACHINE_BOX_SKINS.forEach(machineSkin => {
    if (!machineSkin.canDropFromLootBox) return;
    if (machineSkin.price <= 0) return;
    candidates.push({
      cosmeticType: 'machineboxskin',
      id: machineSkin.id,
      name: machineSkin.name,
      rarity: machineSkin.rarity,
      isAscensionCatalogItem: false,
      owned: ownedMachineBoxSkins.has(machineSkin.id),
    });
  });

  return candidates;
};

const pickLootboxCandidate = (candidates: LootDropCandidate[], luckBonusPercent: number = 0): LootDropCandidate | null => {
  if (candidates.length === 0) return null;

  const targetRarity = rollLootboxTargetRarity(luckBonusPercent);
  const priority = LOOTBOX_RARITY_PRIORITY[targetRarity];

  for (const rarity of priority) {
    const pool = candidates.filter(candidate => candidate.rarity === rarity);
    if (pool.length > 0) {
      return pool[Math.floor(Math.random() * pool.length)];
    }
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
};

const getActiveLootLuckBonus = (cosmetics: CosmeticsState): number => {
  const activeLootBoxSkin = LOOT_BOX_SKINS.find(skin => skin.id === cosmetics.activeLootBoxSkinId) || LOOT_BOX_SKINS[0];
  const activeMinerSkin = MACHINE_BOX_SKINS.find(skin => skin.id === cosmetics.activeMachineBoxSkinId) || MACHINE_BOX_SKINS[0];
  return Math.max(0, (activeLootBoxSkin?.luckBonus || 0) + (activeMinerSkin?.luckBonus || 0));
};

const isRelicCosmeticOwned = (cosmetics: CosmeticsState, slot: CryptoRelicSlot, cosmeticId: string): boolean => {
  if (slot === 'skin') {
    return cosmetics.ownedSkins.includes(cosmeticId) || cosmetics.ownedAscensionSkins.includes(cosmeticId);
  }
  if (slot === 'headstyle') {
    return cosmetics.ownedHeadStyles.includes(cosmeticId) || cosmetics.ownedAscensionHeadStyles.includes(cosmeticId);
  }
  if (slot === 'wing') {
    // Compatibility: old saves could store relic_quantum_wings in accessory ownership.
    return cosmetics.ownedWings.includes(cosmeticId)
      || cosmetics.ownedAccessories.includes(cosmeticId)
      || cosmetics.ownedAscensionAccessories.includes(cosmeticId);
  }
  return cosmetics.ownedAccessories.includes(cosmeticId) || cosmetics.ownedAscensionAccessories.includes(cosmeticId);
};

const scalePetBoost = (boost: PetBoost, level: number): PetBoost => {
  const multiplier = Math.max(0, level);
  return {
    productionBoost: (boost.productionBoost || 0) * multiplier,
    clickBoost: (boost.clickBoost || 0) * multiplier,
    critBoost: (boost.critBoost || 0) * multiplier,
    cryptoBoost: (boost.cryptoBoost || 0) * multiplier,
  };
};

const getRelicNodeLevel = (cosmetics: CosmeticsState, relicId: string): number => {
  const relic = CRYPTO_RELIC_TREE.find(node => node.id === relicId);
  if (!relic) return 0;

  const storedLevel = cosmetics.cryptoRelicLevels?.[relicId];
  if (typeof storedLevel === 'number' && Number.isFinite(storedLevel) && storedLevel > 0) {
    return Math.floor(storedLevel);
  }

  return isRelicCosmeticOwned(cosmetics, relic.slot, relic.cosmeticId) ? 1 : 0;
};

const isRelicNodePurchased = (cosmetics: CosmeticsState, relicId: string): boolean => {
  return getRelicNodeLevel(cosmetics, relicId) > 0;
};

const INITIAL_COSMETICS: CosmeticsState = {
  ownedSkins: ['default'],
  ownedThemes: ['default'],
  ownedAccessories: ['none'],
  ownedCapes: ['none'],
  ownedWings: ['none'],
  ownedHeadStyles: ['default'],
  ownedPets: ['none'],
  ownedClickEffects: [],
  ownedLootBoxSkins: ['default'],
  ownedMachineBoxSkins: ['default'],
  cryptoRelicLevels: {},
  ownedAscensionPets: [],
  ownedAscensionSkins: [],
  ownedAscensionHeadStyles: [],
  ownedAscensionAccessories: [],
  ownedAscensionThemes: [],
  activeSkinId: 'default',
  activeThemeId: 'default',
  activeAccessoryId: 'none',
  activeCapeId: 'none',
  activeWingId: 'none',
  activeHeadStyleId: 'default',
  activePetId: 'none',
  activeClickEffectId: 'none',
  activeLootBoxSkinId: 'default',
  activeMachineBoxSkinId: 'default',
  activeAscensionPetId: 'none',
  blackMarketClickOverflowPurchased: false,
  blackMarketAdjacencyPurchased: false,
  paragonLevels: {},
};

// Merge cosmetics from an old/partial save into the current canonical shape.
// Keeps defaults, dedupes, and ensures active selections are owned.
const migrateCosmetics = (saved: unknown): CosmeticsState => {
  const base: CosmeticsState = { ...INITIAL_COSMETICS };
  if (!saved || typeof saved !== 'object') return base;
  const s: any = saved;

  const uniq = (arr: string[]) => Array.from(new Set(arr));
  const normArr = (v: any): string[] => {
    if (!Array.isArray(v)) return [];
    return v.filter((x) => typeof x === 'string' && x.length > 0);
  };
  const normId = (v: any, fallback: string) => (typeof v === 'string' && v.length > 0 ? v : fallback);

  base.ownedSkins = uniq([...(base.ownedSkins || []), ...normArr(s.ownedSkins)]);
  base.ownedThemes = uniq([...(base.ownedThemes || []), ...normArr(s.ownedThemes)]);
  base.ownedAccessories = uniq([...(base.ownedAccessories || []), ...normArr(s.ownedAccessories)]);
  base.ownedCapes = uniq([...(base.ownedCapes || []), ...normArr(s.ownedCapes)]);
  base.ownedWings = uniq([...(base.ownedWings || []), ...normArr(s.ownedWings)]);
  base.ownedHeadStyles = uniq([...(base.ownedHeadStyles || []), ...normArr(s.ownedHeadStyles)]);
  base.ownedPets = uniq([...(base.ownedPets || []), ...normArr(s.ownedPets)]);
  base.ownedClickEffects = uniq([...(base.ownedClickEffects || []), ...normArr(s.ownedClickEffects)]);
  base.ownedLootBoxSkins = uniq([...(base.ownedLootBoxSkins || []), ...normArr(s.ownedLootBoxSkins)]);
  base.ownedMachineBoxSkins = uniq([...(base.ownedMachineBoxSkins || []), ...normArr(s.ownedMachineBoxSkins)]);

  base.ownedAscensionPets = uniq([...(base.ownedAscensionPets || []), ...normArr(s.ownedAscensionPets)]);
  base.ownedAscensionSkins = uniq([...(base.ownedAscensionSkins || []), ...normArr(s.ownedAscensionSkins)]);
  base.ownedAscensionHeadStyles = uniq([...(base.ownedAscensionHeadStyles || []), ...normArr(s.ownedAscensionHeadStyles)]);
  base.ownedAscensionAccessories = uniq([...(base.ownedAscensionAccessories || []), ...normArr(s.ownedAscensionAccessories)]);
  base.ownedAscensionThemes = uniq([...(base.ownedAscensionThemes || []), ...normArr(s.ownedAscensionThemes)]);

  const relicLevels: Record<string, number> = {};
  if (s.cryptoRelicLevels && typeof s.cryptoRelicLevels === 'object') {
    Object.entries(s.cryptoRelicLevels as Record<string, unknown>).forEach(([relicId, value]) => {
      const exists = CRYPTO_RELIC_TREE.some(node => node.id === relicId);
      if (!exists) return;
      const numericValue = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(numericValue) || numericValue <= 0) return;
      relicLevels[relicId] = Math.floor(numericValue);
    });
  }

  // Backward compatibility: legacy saves had relic unlocks only as owned cosmetics.
  CRYPTO_RELIC_TREE.forEach(node => {
    const legacyOwned = isRelicCosmeticOwned(base, node.slot, node.cosmeticId);
    const migratedLevel = Math.max(relicLevels[node.id] || 0, legacyOwned ? 1 : 0);
    if (migratedLevel <= 0) return;

    relicLevels[node.id] = migratedLevel;

    if (node.slot === 'skin') {
      base.ownedSkins = uniq([...base.ownedSkins, node.cosmeticId]);
    } else if (node.slot === 'headstyle') {
      base.ownedHeadStyles = uniq([...base.ownedHeadStyles, node.cosmeticId]);
    } else if (node.slot === 'wing') {
      base.ownedWings = uniq([...base.ownedWings, node.cosmeticId]);
    } else {
      base.ownedAccessories = uniq([...base.ownedAccessories, node.cosmeticId]);
    }
  });

  base.cryptoRelicLevels = relicLevels;

  base.activeSkinId = normId(s.activeSkinId, base.activeSkinId);
  base.activeThemeId = normId(s.activeThemeId, base.activeThemeId);
  base.activeAccessoryId = normId(s.activeAccessoryId, base.activeAccessoryId);
  base.activeCapeId = normId(s.activeCapeId, base.activeCapeId);
  base.activeWingId = normId(s.activeWingId, base.activeWingId);
  base.activeHeadStyleId = normId(s.activeHeadStyleId, base.activeHeadStyleId);
  base.activePetId = normId(s.activePetId, base.activePetId);
  base.activeClickEffectId = normId(s.activeClickEffectId, base.activeClickEffectId);
  base.activeLootBoxSkinId = normId(s.activeLootBoxSkinId, base.activeLootBoxSkinId);
  base.activeMachineBoxSkinId = normId(s.activeMachineBoxSkinId, base.activeMachineBoxSkinId);
  base.activeAscensionPetId = normId(s.activeAscensionPetId, base.activeAscensionPetId);
  base.blackMarketClickOverflowPurchased = !!s.blackMarketClickOverflowPurchased;
  base.blackMarketAdjacencyPurchased = !!s.blackMarketAdjacencyPurchased;
  base.paragonLevels = {};
  if (s.paragonLevels && typeof s.paragonLevels === 'object') {
    Object.entries(s.paragonLevels as Record<string, unknown>).forEach(([upgradeId, rawValue]) => {
      const exists = PARAGON_UPGRADES.some(upgrade => upgrade.id === upgradeId);
      if (!exists) return;
      const numericValue = typeof rawValue === 'number' ? rawValue : Number(rawValue);
      if (!Number.isFinite(numericValue) || numericValue <= 0) return;
      base.paragonLevels[upgradeId] = Math.floor(numericValue);
    });
  }

  // Ensure actives are owned, otherwise fall back to safe defaults.
  if (!base.ownedSkins.includes(base.activeSkinId)) base.activeSkinId = base.ownedSkins[0] || 'default';
  if (!base.ownedThemes.includes(base.activeThemeId)) base.activeThemeId = base.ownedThemes[0] || 'default';
  if (!base.ownedAccessories.includes(base.activeAccessoryId)) base.activeAccessoryId = base.ownedAccessories[0] || 'none';
  if (!base.ownedCapes.includes(base.activeCapeId)) base.activeCapeId = base.ownedCapes[0] || 'none';
  if (!base.ownedWings.includes(base.activeWingId)) base.activeWingId = base.ownedWings[0] || 'none';
  if (!base.ownedHeadStyles.includes(base.activeHeadStyleId)) base.activeHeadStyleId = base.ownedHeadStyles[0] || 'default';
  if (!base.ownedPets.includes(base.activePetId)) base.activePetId = base.ownedPets[0] || 'none';
  if (base.activeClickEffectId !== 'none' && !base.ownedClickEffects.includes(base.activeClickEffectId)) {
    base.activeClickEffectId = 'none';
  }
  if (!base.ownedLootBoxSkins.includes(base.activeLootBoxSkinId)) {
    base.activeLootBoxSkinId = base.ownedLootBoxSkins[0] || 'default';
  }
  if (!base.ownedMachineBoxSkins.includes(base.activeMachineBoxSkinId)) {
    base.activeMachineBoxSkinId = base.ownedMachineBoxSkins[0] || 'default';
  }
  if (!base.ownedAscensionPets.includes(base.activeAscensionPetId)) base.activeAscensionPetId = base.ownedAscensionPets[0] || 'none';

  // Legacy relic compatibility: when quantum wings were an accessory, move active slot to wing.
  if (base.activeAccessoryId === 'relic_quantum_wings') {
    base.activeAccessoryId = 'none';
    base.activeWingId = 'relic_quantum_wings';
    base.ownedWings = uniq([...base.ownedWings, 'relic_quantum_wings']);
  }

  // Also ensure actives exist in owned lists.
  if (base.activeSkinId) base.ownedSkins = uniq([...base.ownedSkins, base.activeSkinId]);
  if (base.activeThemeId) base.ownedThemes = uniq([...base.ownedThemes, base.activeThemeId]);
  if (base.activeAccessoryId) base.ownedAccessories = uniq([...base.ownedAccessories, base.activeAccessoryId]);
  if (base.activeCapeId) base.ownedCapes = uniq([...base.ownedCapes, base.activeCapeId]);
  if (base.activeWingId) base.ownedWings = uniq([...base.ownedWings, base.activeWingId]);
  if (base.activeHeadStyleId) base.ownedHeadStyles = uniq([...base.ownedHeadStyles, base.activeHeadStyleId]);
  if (base.activePetId) base.ownedPets = uniq([...base.ownedPets, base.activePetId]);
  if (base.activeClickEffectId && base.activeClickEffectId !== 'none') {
    base.ownedClickEffects = uniq([...base.ownedClickEffects, base.activeClickEffectId]);
  }
  if (base.activeLootBoxSkinId) {
    base.ownedLootBoxSkins = uniq([...base.ownedLootBoxSkins, base.activeLootBoxSkinId]);
  }
  if (base.activeMachineBoxSkinId) {
    base.ownedMachineBoxSkins = uniq([...base.ownedMachineBoxSkins, base.activeMachineBoxSkinId]);
  }
  if (base.activeAscensionPetId) base.ownedAscensionPets = uniq([...base.ownedAscensionPets, base.activeAscensionPetId]);

  return base;
};

const applyLootboxRewardToCosmetics = (prev: CosmeticsState, candidate: LootDropCandidate): CosmeticsState => {
  const addUnique = (list: string[], id: string): string[] => (list.includes(id) ? list : [...list, id]);

  if (candidate.cosmeticType === 'skin') {
    return candidate.isAscensionCatalogItem
      ? { ...prev, ownedAscensionSkins: addUnique(prev.ownedAscensionSkins, candidate.id) }
      : { ...prev, ownedSkins: addUnique(prev.ownedSkins, candidate.id) };
  }

  if (candidate.cosmeticType === 'theme') {
    return candidate.isAscensionCatalogItem
      ? { ...prev, ownedAscensionThemes: addUnique(prev.ownedAscensionThemes, candidate.id) }
      : { ...prev, ownedThemes: addUnique(prev.ownedThemes, candidate.id) };
  }

  if (candidate.cosmeticType === 'accessory') {
    return candidate.isAscensionCatalogItem
      ? { ...prev, ownedAscensionAccessories: addUnique(prev.ownedAscensionAccessories, candidate.id) }
      : { ...prev, ownedAccessories: addUnique(prev.ownedAccessories, candidate.id) };
  }

  if (candidate.cosmeticType === 'headstyle') {
    return candidate.isAscensionCatalogItem
      ? { ...prev, ownedAscensionHeadStyles: addUnique(prev.ownedAscensionHeadStyles, candidate.id) }
      : { ...prev, ownedHeadStyles: addUnique(prev.ownedHeadStyles, candidate.id) };
  }

  if (candidate.cosmeticType === 'clickeffect') {
    const nextOwned = addUnique(prev.ownedClickEffects, candidate.id);
    return {
      ...prev,
      ownedClickEffects: nextOwned,
      activeClickEffectId: prev.activeClickEffectId === 'none' ? candidate.id : prev.activeClickEffectId,
    };
  }

  if (candidate.cosmeticType === 'boxskin') {
    const nextOwned = addUnique(prev.ownedLootBoxSkins, candidate.id);
    return {
      ...prev,
      ownedLootBoxSkins: nextOwned,
      activeLootBoxSkinId: candidate.id,
    };
  }

  if (candidate.cosmeticType === 'machineboxskin') {
    const nextOwned = addUnique(prev.ownedMachineBoxSkins, candidate.id);
    return {
      ...prev,
      ownedMachineBoxSkins: nextOwned,
      activeMachineBoxSkinId: candidate.id,
    };
  }

  return { ...prev, ownedPets: addUnique(prev.ownedPets, candidate.id) };
};

const getTutorialRewardCandidate = (): TutorialReward | null => {
  const cyanPulse = CHARACTER_SKINS.find(item => item.id === 'cyan_pulse');
  if (!cyanPulse) return null;
  return {
    cosmeticType: 'skin',
    itemId: cyanPulse.id,
    itemName: cyanPulse.name,
    itemDescription: cyanPulse.description,
    price: cyanPulse.price,
    currency: cyanPulse.currency,
  };
};

const applyTutorialRewardToCosmetics = (prev: CosmeticsState, reward: TutorialReward): CosmeticsState => {
  const addUnique = (list: string[], id: string): string[] => (list.includes(id) ? list : [...list, id]);
  if (reward.cosmeticType === 'skin') return { ...prev, ownedSkins: addUnique(prev.ownedSkins, reward.itemId) };
  if (reward.cosmeticType === 'theme') return { ...prev, ownedThemes: addUnique(prev.ownedThemes, reward.itemId) };
  if (reward.cosmeticType === 'accessory') return { ...prev, ownedAccessories: addUnique(prev.ownedAccessories, reward.itemId) };
  if (reward.cosmeticType === 'headstyle') return { ...prev, ownedHeadStyles: addUnique(prev.ownedHeadStyles, reward.itemId) };
  return { ...prev, ownedPets: addUnique(prev.ownedPets, reward.itemId) };
};


type SaveSlot = 'primary' | 'test';

const getActiveSaveSlot = (): SaveSlot => 'primary';
const ACTIVE_SAVE_SLOT = getActiveSaveSlot();
// The demo keeps its own namespace and save file (save.demo.v3.json, like the March demo) so it never touches a full save.
// Resource tick. Each tick re-renders the game screen, so keep it low; production uses real elapsed time.
const GAME_TICK_MS = 250;

const FULL_SAVE_NAMESPACE = 'cyberpunk_clicker_save_v11';
const DEMO_SAVE_NAMESPACE = 'cyberpunk_clicker_save_v13_demo'; // same as the March demo, so its saves continue
const PRIMARY_SAVE_NAMESPACE = import.meta.env.VITE_DEMO_BUILD === 'true' ? DEMO_SAVE_NAMESPACE : FULL_SAVE_NAMESPACE;
const TEST_SAVE_NAMESPACE = 'cyberpunk_clicker_save_v11_test_floater_pass';
const SAVE_NAMESPACE = ACTIVE_SAVE_SLOT === 'primary' ? PRIMARY_SAVE_NAMESPACE : TEST_SAVE_NAMESPACE;
const SAVE_KEY = SAVE_NAMESPACE;
const BACKUP_SAVE_KEY = `${SAVE_NAMESPACE}_backup`;
const LEGACY_SAVE_NAMESPACE = 'cyberpunk_clicker_save_v10';
const BACKUP_SAVE_NAMESPACE = 'cyberpunk_clicker_save_v3';

// Steam Cloud Configuration
// When running as Steam game via Electron, saves go to: %USERPROFILE%/AppData/Local/DataFall/<slot-file>.json
// The Electron main process handles file I/O and syncs with Steam Cloud
const STEAM_SAVE_PATH = 'DataFall'; // Folder name in AppData/Local
const PRIMARY_STEAM_SAVE_FILE = import.meta.env.VITE_DEMO_BUILD === 'true' ? 'save.demo.v3.json' : 'save.json';
const TEST_STEAM_SAVE_FILE = 'save.test.floater-pass.json';
const STEAM_SAVE_FILE = ACTIVE_SAVE_SLOT === 'primary' ? PRIMARY_STEAM_SAVE_FILE : TEST_STEAM_SAVE_FILE;

// Check if running in Electron/Steam environment
const isElectronEnvironment = (): boolean => {
  return typeof window !== 'undefined' && 
    (window as unknown as { electronAPI?: unknown }).electronAPI !== undefined;
};

// Storage abstraction for browser (localStorage) vs Steam (Steam Cloud via Electron main process)
// - Browser: localStorage under SAVE_KEY
// - Steam/Electron: IPC to main process which writes %LOCALAPPDATA%/DataFall/save.json and syncs Steam Cloud

export interface SaveData {
  resources?: any;
  upgrades?: any;
  prestigeUpgrades?: any;
  achievements?: any;
  stats?: any;
  elapsedTime?: number;
  masterVolume?: boolean;
  musicVolume?: number;
  sfxVolume?: number;
  isMusicPlaying?: boolean;
  cosmetics?: any;
  contracts?: any;
  roomLayout?: any;
  tutorial?: any;
  version?: number;
  lastSaveTimestamp?: number;
  saveNamespace?: string;
  economyVersion?: number;
  automation?: AutomationSettings;
  challenges?: ChallengeState;
  finale?: FinaleState;
  whatsNew?: WhatsNewState;
}

// v1.03: returning players (saves from before v1.03) see a one-time "What's new" screen and get one loot box.
export const WHATS_NEW_VERSION = '1.03';
export interface WhatsNewState {
  seenVersion: string;
  giftClaimed: boolean;
}
const SEEN_WHATS_NEW: WhatsNewState = { seenVersion: WHATS_NEW_VERSION, giftClaimed: true };

// v1.04 save safety: the save file is read and written directly through the Electron main process
// (df:load-file / df:save-file). This no longer waits for Steam: the file is local and Steam Auto-Cloud
// syncs it on its own. Loading also reports when a save exists but can't be read, so the game never
// starts fresh and lets autosave write over it.
type ElectronSaveApi = {
  saveFile?: (payload: { data: string | null; fileName: string }) => Promise<{ ok?: boolean; reason?: string } | undefined>;
  loadFile?: (payload: { fileName: string; namespace?: string }) => Promise<{ ok?: boolean; data?: string | null; reason?: string } | undefined>;
  quarantineSave?: (payload: { fileName: string }) => Promise<{ ok?: boolean; folder?: string; reason?: string } | undefined>;
  openSaveFolder?: () => Promise<{ ok?: boolean } | undefined>;
  onFlushSaveRequest?: (callback: () => Promise<void>) => (() => void) | undefined;
  importLiveSave?: () => Promise<{ data?: string | null } | undefined>;
  importDemoSave?: () => Promise<{ data?: string | null } | undefined>;
};
const getElectronSaveApi = (): ElectronSaveApi | null => {
  if (typeof window === 'undefined') return null;
  return ((window as unknown as { electronAPI?: ElectronSaveApi }).electronAPI) ?? null;
};

export type SaveLoadResult =
  | { status: 'ok'; data: SaveData; from: string }
  | { status: 'none' }
  | { status: 'error'; reason: string };

const storageAdapter = {
  save: async (data: SaveData): Promise<boolean> => {
    try {
      const payload: SaveData = { ...data, saveNamespace: SAVE_NAMESPACE, economyVersion: ECONOMY_VERSION };
      const saveString = JSON.stringify(payload);

      // Always keep a quick local fallback. This helps with crashes / Alt+F4 where async IPC may not finish.
      try {
        const previousSave = localStorage.getItem(SAVE_KEY);
        if (previousSave && previousSave !== saveString) {
          localStorage.setItem(BACKUP_SAVE_KEY, previousSave);
        }
        localStorage.setItem(SAVE_KEY, saveString);
      } catch {
        // ignore localStorage errors (quota / disabled)
      }

      const api = getElectronSaveApi();
      if (api?.saveFile) {
        // Desktop: main process writes %LOCALAPPDATA%/DataFall/<file> (+ backups); Steam Auto-Cloud syncs it.
        const result = await api.saveFile({ data: saveString, fileName: STEAM_SAVE_FILE });
        if (!result?.ok) console.log('[Save] file save failed:', result?.reason);
        return !!result?.ok;
      }

      // Browser-only path (localStorage already written above)
      return true;
    } catch (e: any) {
      console.log('[Save] save error:', e?.message || e);
      return false;
    }
  },


  load: async (): Promise<SaveLoadResult> => {
    // One-way cleanup: drop legacy namespace while keeping primary/test and v3 backup untouched.
    try {
      localStorage.removeItem(LEGACY_SAVE_NAMESPACE);
    } catch {
      // ignore localStorage errors
    }

    const normalizeLoaded = (value: any): SaveData | null => {
      try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        if (!parsed || typeof parsed !== 'object') return null;
        const data = parsed as SaveData;
        // Hard-cut old save slots (local + cloud) after namespace bump.
        if (data.saveNamespace !== SAVE_NAMESPACE) return null;
        return data;
      } catch {
        return null;
      }
    };

    // Save rescue: build 1.0.1 (live briefly on 2026-11-03) wrote a fresh v8 save.json over
    // players' v11 progress, while their v11 localStorage copies stayed intact. So we take the newest
    // valid copy of the current namespace among the save file and both localStorage keys.
    // Never delete the v11 keys here.
    const candidates: Array<{ from: string; data: SaveData }> = [];
    let fileWasReset = false;
    const api = getElectronSaveApi();
    if (api?.loadFile) {
      let fileResult: { ok?: boolean; data?: string | null; reason?: string } | undefined;
      try {
        // The namespace lets the main process skip a save.json of another slot and look for this
        // slot's newest copy in save.json.bak and backups/.
        fileResult = await api.loadFile({ fileName: STEAM_SAVE_FILE, namespace: SAVE_NAMESPACE });
      } catch (e: any) {
        fileResult = { ok: false, reason: e?.message || String(e) };
      }
      if (!fileResult || fileResult.ok === false) {
        // A save file exists but can't be read (locked by antivirus, permissions, corrupt). A local copy
        // could be older than that file (e.g. it was synced from another PC), so don't guess: report it.
        const reason = fileResult?.reason || 'save file could not be read';
        console.log('[Save] save file could not be read:', reason);
        return { status: 'error', reason };
      }
      // Reset Data writes "null" to the file. Remember it so the demo save isn't imported again.
      if (typeof fileResult.data === 'string' && fileResult.data.trim() === 'null') fileWasReset = true;
      if (fileResult.data) {
        const normalizedFile = normalizeLoaded(fileResult.data);
        if (normalizedFile) candidates.push({ from: 'file', data: normalizedFile });
        else console.log('[Save] save file has no save for this slot; checking local copies');
      }
    }
    for (const key of [SAVE_KEY, BACKUP_SAVE_KEY]) {
      let raw: string | null = null;
      try {
        raw = localStorage.getItem(key);
      } catch {
        raw = null;
      }
      const candidate = raw ? normalizeLoaded(raw) : null;
      if (candidate) candidates.push({ from: key, data: candidate });
    }

    let newest: { from: string; data: SaveData } | null = null;
    for (const candidate of candidates) {
      if (!newest || (candidate.data.lastSaveTimestamp ?? 0) > (newest.data.lastSaveTimestamp ?? 0)) {
        newest = candidate;
      }
    }
    if (!newest && IS_TEST_BUILD && !IS_DEMO_BUILD) {
      // First launch of a test build: start from the real game's save (read-only import).
      try {
        const imported = await api?.importLiveSave?.();
        const importedSave = imported?.data ? normalizeLoaded(imported.data) : null;
        if (importedSave) newest = { from: 'live-save-import', data: importedSave };
      } catch {
        // no live save available; start fresh
      }
    }
    if (!newest && !IS_DEMO_BUILD && !fileWasReset) {
      // Full game with no save of its own: carry over the demo progress once (read-only copy).
      // Not after Reset Data: the player asked for a clean start.
      try {
        const demo = await api?.importDemoSave?.();
        const parsed = demo?.data ? JSON.parse(demo.data) : null;
        if (parsed && parsed.saveNamespace === DEMO_SAVE_NAMESPACE) {
          newest = { from: 'demo-save-import', data: { ...parsed, saveNamespace: SAVE_NAMESPACE } };
        }
      } catch {
        // no demo save; start fresh
      }
    }
    if (!newest) return { status: 'none' };
    console.log('[Save] loading newest save from', newest.from, newest.data.lastSaveTimestamp);
    return { status: 'ok', data: newest.data, from: newest.from };
  },

  // Reset progress: empty both local copies and write "null" to the file (the main process keeps the
  // old save in backups/ as a rollback copy). Resolves false if the file could not be written.
  clear: async (): Promise<boolean> => {
    try {
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem(BACKUP_SAVE_KEY);
      // Current namespace can be cleared safely; keep original v3 as backup.
      localStorage.removeItem(LEGACY_SAVE_NAMESPACE);
    } catch {
      // ignore localStorage errors
    }
    const api = getElectronSaveApi();
    if (!api?.saveFile) return true;
    try {
      const result = await api.saveFile({ data: 'null', fileName: STEAM_SAVE_FILE });
      return !!result?.ok;
    } catch {
      return false;
    }
  },

  // The save file could not be read and the player chose to continue: move it aside (kept in backups).
  quarantine: async (): Promise<boolean> => {
    const api = getElectronSaveApi();
    if (!api?.quarantineSave) return true;
    try {
      const result = await api.quarantineSave({ fileName: STEAM_SAVE_FILE });
      return !!result?.ok;
    } catch {
      return false;
    }
  },

  openFolder: async (): Promise<void> => {
    try {
      await getElectronSaveApi()?.openSaveFolder?.();
    } catch {
      // ignore
    }
  },
};

export interface OfflineProgress {
  timeAway: number;
  dataEarned: number;
  creditsEarned: number;
  cryptoEarned: number;
  maxTime?: number;
}

// Sum of every equipped cosmetic + all relic node levels, in percent points.
export const computeCosmeticBoosts = (cosmetics: CosmeticsState): Required<PetBoost> => {
  const total: Required<PetBoost> = {
    productionBoost: 0,
    clickBoost: 0,
    critBoost: 0,
    cryptoBoost: 0,
    critDamageBoost: 0,
  };

  const addBoost = (boost?: PetBoost) => {
    if (!boost) return;
    total.productionBoost += boost.productionBoost || 0;
    total.clickBoost += boost.clickBoost || 0;
    total.critBoost += boost.critBoost || 0;
    total.cryptoBoost += boost.cryptoBoost || 0;
    total.critDamageBoost += boost.critDamageBoost || 0;
  };

  const activeSkin =
    CHARACTER_SKINS.find(s => s.id === cosmetics.activeSkinId) ||
    ASCENSION_SKINS.find(s => s.id === cosmetics.activeSkinId);
  const activeTheme =
    ROOM_THEMES.find(t => t.id === cosmetics.activeThemeId) ||
    ASCENSION_ROOM_THEMES.find(t => t.id === cosmetics.activeThemeId);
  const activeAccessory =
    CHARACTER_ACCESSORIES.find(a => a.id === cosmetics.activeAccessoryId) ||
    ASCENSION_ACCESSORIES.find(a => a.id === cosmetics.activeAccessoryId);
  const activeCape =
    BLACK_MARKET_CAPES.find(cape => cape.id === cosmetics.activeCapeId);
  const activeWing =
    BLACK_MARKET_WINGS.find(wing => wing.id === cosmetics.activeWingId);
  const activeHeadStyle =
    CHARACTER_HEAD_STYLES.find(h => h.id === cosmetics.activeHeadStyleId) ||
    ASCENSION_HEAD_STYLES.find(h => h.id === cosmetics.activeHeadStyleId);
  const activePet =
    CHARACTER_PETS.find(p => p.id === cosmetics.activePetId) ||
    ASCENSION_PETS.find(p => p.id === cosmetics.activePetId);
  const activeClickEffect = CLICK_EFFECTS.find(effect => effect.id === cosmetics.activeClickEffectId);
  const activeAscensionPet = ASCENSION_PETS.find(p => p.id === cosmetics.activeAscensionPetId);

  addBoost(activeSkin?.boost);
  addBoost(activeTheme?.boost);
  addBoost(activeAccessory?.boost);
  addBoost(activeCape?.boost);
  addBoost(activeWing?.boost);
  addBoost(activeHeadStyle?.boost);
  addBoost(activePet?.boost);
  addBoost(activeClickEffect?.boost);
  addBoost(MACHINE_BOX_SKINS.find(skin => skin.id === cosmetics.activeMachineBoxSkinId)?.boost);

  // Ascension set bonus: +5% production, clicks and crypto per equipped ascension item beyond the first.
  const equippedAscensionItems = [
    ASCENSION_SKINS.some(s => s.id === cosmetics.activeSkinId),
    ASCENSION_HEAD_STYLES.some(h => h.id === cosmetics.activeHeadStyleId),
    ASCENSION_ACCESSORIES.some(a => a.id === cosmetics.activeAccessoryId),
    ASCENSION_ROOM_THEMES.some(r => r.id === cosmetics.activeThemeId),
  ].filter(Boolean).length;
  const setBonus = Math.min(ASCENSION_SET_BONUS_MAX, Math.max(0, equippedAscensionItems - 1) * ASCENSION_SET_BONUS_PER_ITEM);
  addBoost({ productionBoost: setBonus, clickBoost: setBonus, cryptoBoost: setBonus });

  // Crypto relic tree grants permanent linear bonuses based on relic level (independent of equip).
  CRYPTO_RELIC_TREE.forEach(node => {
    const relicLevel = getRelicNodeLevel(cosmetics, node.id);
    if (relicLevel > 0) addBoost(scalePetBoost(node.perLevelBoost, relicLevel));
  });

  // Prevent accidental double-count if a legacy save has the same pet in both slots.
  if (activeAscensionPet && activeAscensionPet.id !== activePet?.id) {
    addBoost(activeAscensionPet.boost);
  }

  return total;
};

export const computeParagonBonuses = (paragonLevels: Record<string, number> | undefined) => {
  const totals = {
    productionBoostPercent: 0,
    nodeConversionPercent: 0,
    cryptoBoostPercent: 0,
    clickBoostPercent: 0,
    pickupSpawnPercent: 0,
    timeWarpPowerPercent: 0,
    critChancePercent: 0,
    timeWarpCooldownPercent: 0,
  };

  Object.entries(paragonLevels || {}).forEach(([upgradeId, rawLevel]) => {
    const upgrade = PARAGON_UPGRADES.find(item => item.id === upgradeId);
    if (!upgrade) return;
    const level = Math.max(0, Math.floor(rawLevel || 0));
    if (level <= 0) return;
    const totalValue = upgrade.effect.value * level;
    if (upgrade.effect.type === 'production_boost_pct') {
      totals.productionBoostPercent += totalValue;
    } else if (upgrade.effect.type === 'node_conversion_pct') {
      totals.nodeConversionPercent += totalValue;
    } else if (upgrade.effect.type === 'crypto_boost_pct') {
      totals.cryptoBoostPercent += totalValue;
    } else if (upgrade.effect.type === 'click_boost_pct') {
      totals.clickBoostPercent += totalValue;
    } else if (upgrade.effect.type === 'pickup_spawn_pct') {
      totals.pickupSpawnPercent += totalValue;
    } else if (upgrade.effect.type === 'time_warp_power_pct') {
      totals.timeWarpPowerPercent += totalValue;
    } else if (upgrade.effect.type === 'crit_chance_pct') {
      totals.critChancePercent += totalValue;
    } else if (upgrade.effect.type === 'time_warp_cooldown_pct') {
      totals.timeWarpCooldownPercent += totalValue;
    }
  });

  const nodeConversionRatio = Math.max(0.4, 1 - totals.nodeConversionPercent / 100);
  return {
    ...totals,
    nodeConversionDataCost: Math.max(40, Math.floor(100 * nodeConversionRatio)),
    productionMultiplier: 1 + totals.productionBoostPercent / 100,
    cryptoMultiplier: 1 + totals.cryptoBoostPercent / 100,
    clickMultiplier: 1 + totals.clickBoostPercent / 100,
    pickupSpawnMultiplier: Math.max(0.35, 1 - totals.pickupSpawnPercent / 100),
    timeWarpPowerMultiplier: 1 + totals.timeWarpPowerPercent / 100,
    critChanceBonus: totals.critChancePercent / 100,
    timeWarpCooldownMultiplier: Math.max(0.45, 1 - totals.timeWarpCooldownPercent / 100),
  };
};

type ProductionInput = {
  upgrades: Upgrade[];
  prestigeUpgrades: Array<Pick<PrestigeUpgrade, 'count' | 'effect'>>;
  cosmeticBoosts: Required<PetBoost>;
  paragonProductionMultiplier: number;
  paragonCryptoMultiplier: number;
  adjacencyProductionBoost: number;
  adjacencyCryptoBoost: number;
  // Challenge handicap (Crypto Drought halves crypto).
  cryptoChallengeMultiplier?: number;
};

// Every global multiplier on machine output: data machines get `data`, crypto rigs get `crypto`.
// Shared by the production tick and the upgrade cards, so a card shows what the machine really adds.
export const computeProductionMultipliers = (input: Omit<ProductionInput, 'upgrades'>): { data: number; crypto: number } => {
  let productionMultiplier = 1;
  let cryptoMultiplier = 1;
  input.prestigeUpgrades.forEach(p => {
    if (p.count > 0 && p.effect.type === 'production_boost') productionMultiplier += p.effect.value * p.count;
    if (p.count > 0 && p.effect.type === 'crypto_boost') cryptoMultiplier += p.effect.value * p.count;
  });
  productionMultiplier *= (1 + input.cosmeticBoosts.productionBoost / 100);
  cryptoMultiplier *= (1 + input.cosmeticBoosts.cryptoBoost / 100);
  productionMultiplier *= input.paragonProductionMultiplier;
  cryptoMultiplier *= input.paragonCryptoMultiplier;
  if (input.adjacencyProductionBoost > 0) productionMultiplier *= (1 + input.adjacencyProductionBoost);
  if (input.adjacencyCryptoBoost > 0) cryptoMultiplier *= (1 + input.adjacencyCryptoBoost);
  cryptoMultiplier *= input.cryptoChallengeMultiplier ?? 1;
  return { data: productionMultiplier, crypto: productionMultiplier * cryptoMultiplier };
};

// Per-second production for every resource. Used by the live tick AND offline progress, so both
// apply exactly the same per-level sum and multipliers (prestige, cosmetics/relics, Paragon, adjacency).
export const computeProductionRates = (input: ProductionInput): Record<'data' | 'credits' | 'crypto', number> => {
  const multipliers = computeProductionMultipliers(input);
  const rates = { data: 0, credits: 0, crypto: 0 };
  input.upgrades.forEach(u => {
    if (u.effect.type !== 'production' || !u.effect.resource) return;
    const resource = u.effect.resource as 'data' | 'credits' | 'crypto';
    if (!(resource in rates)) return;
    // Sum each individual upgrade instance at its respective level
    let totalProduction = 0;
    for (let i = 1; i <= u.count; i++) {
      totalProduction += getEffectiveValue({ ...u, count: i });
    }
    rates[resource] += totalProduction * (resource === 'crypto' ? multipliers.crypto : multipliers.data);
  });
  // Passive Node income: a small share of data production arrives as credits without selling.
  rates.credits += rates.data * CREDIT_TRICKLE_RATE;
  return rates;
};

// Challenge runs (unlock at ascension 30): restart the current run with a handicap; ascending while the
// challenge is active completes it and grants a permanent bonus. Saved as an optional field (v11 compatible).
// Finale (ascension 50): "Breach the Core" final boss, ending credits, then Endless mode with its own
// leaderboard (depth = ascensions beyond 50). The Infinity Entity pet is granted and kept.
export const FINALE_UNLOCK_ASCENSION = 50;
export interface FinaleState {
  completed: boolean;
  completedAt: number | null;
  // Pity: every failed attempt weakens the Core by 10% HP (max -50%).
  failedAttempts: number;
  // v1.03: beating the asc-45 Core Signal weakens the final Core by a further 15%.
  signalCleared: boolean;
  // v1.03 Endless: selected abyss click-burst palette (0 = off).
  abyssVariant: number;
}
const INITIAL_FINALE: FinaleState = { completed: false, completedAt: null, failedAttempts: 0, signalCleared: false, abyssVariant: 0 };
export const CORE_SIGNAL_WEAKEN = 0.15;
export const getFinaleWeaken = (finale: FinaleState): number =>
  Math.min(0.6, Math.min(0.5, 0.1 * Math.max(0, finale.failedAttempts)) + (finale.signalCleared ? CORE_SIGNAL_WEAKEN : 0));
const migrateFinale = (saved: unknown): FinaleState => {
  const s = (saved || {}) as Partial<FinaleState>;
  return {
    completed: !!s.completed,
    completedAt: typeof s.completedAt === 'number' ? s.completedAt : null,
    failedAttempts: Number.isFinite(s.failedAttempts) ? Math.max(0, Math.floor(s.failedAttempts as number)) : 0,
    signalCleared: !!s.signalCleared,
    abyssVariant: Number.isFinite(s.abyssVariant) ? Math.max(0, Math.floor(s.abyssVariant as number)) : 0,
  };
};
export const getEndlessDepth = (totalAscensions: number): number => Math.max(0, totalAscensions - FINALE_UNLOCK_ASCENSION);

export const CHALLENGE_UNLOCK_ASCENSION = 30;
export const CHALLENGE_SPRINT_LIMIT_SECONDS = 30 * 60;
export type ChallengeId = 'no_clicks' | 'half_crypto' | 'sprint' | 'bare_metal';
export const CHALLENGES: Array<{ id: ChallengeId; reward: PetBoost }> = [
  { id: 'no_clicks', reward: { productionBoost: 10 } },
  { id: 'half_crypto', reward: { cryptoBoost: 10 } },
  { id: 'sprint', reward: { clickBoost: 15 } },
  { id: 'bare_metal', reward: { productionBoost: 5, clickBoost: 5, cryptoBoost: 5 } },
];
export interface ChallengeState {
  active: ChallengeId | null;
  completed: ChallengeId[];
}
const INITIAL_CHALLENGES: ChallengeState = { active: null, completed: [] };
const isChallengeId = (value: unknown): value is ChallengeId => CHALLENGES.some(c => c.id === value);
const migrateChallenges = (saved: unknown): ChallengeState => {
  const s = (saved || {}) as Partial<ChallengeState>;
  return {
    active: isChallengeId(s.active) ? s.active : null,
    completed: Array.isArray(s.completed) ? Array.from(new Set(s.completed.filter(isChallengeId))) : [],
  };
};
// Permanent bonuses from completed challenges, in percent points (same units as cosmetic boosts).
export const computeChallengeRewardBoost = (completed: ChallengeId[]): Required<PetBoost> => {
  const total = { productionBoost: 0, clickBoost: 0, critBoost: 0, cryptoBoost: 0, critDamageBoost: 0 };
  CHALLENGES.forEach(challenge => {
    if (!completed.includes(challenge.id)) return;
    for (const [key, value] of Object.entries(challenge.reward) as Array<[keyof PetBoost, number]>) total[key] += value || 0;
  });
  return total;
};
// Cosmetic boosts as they apply during a run: Bare Metal disables them, completed challenges always add.
export const computeRunBoosts = (cosmetics: CosmeticsState, challenges: ChallengeState): Required<PetBoost> => {
  const base = challenges.active === 'bare_metal'
    ? { productionBoost: 0, clickBoost: 0, critBoost: 0, cryptoBoost: 0, critDamageBoost: 0 }
    : computeCosmeticBoosts(cosmetics);
  const rewards = computeChallengeRewardBoost(challenges.completed);
  return {
    productionBoost: base.productionBoost + rewards.productionBoost,
    clickBoost: base.clickBoost + rewards.clickBoost,
    critBoost: base.critBoost + rewards.critBoost,
    cryptoBoost: base.cryptoBoost + rewards.cryptoBoost,
    critDamageBoost: base.critDamageBoost + rewards.critDamageBoost,
  };
};

export const useGame = () => {
  const { language, t } = useI18n();
  const l = useCallback((en: string, tr: string, pt: string, es?: string, ru?: string) => (
    localizeInlineText(language, en, tr, pt, es, ru)
  ), [language]);
  // We must block ALL save paths until the first async load finishes, otherwise a fresh state overwrites a real save.
  const [loadReady, setLoadReady] = useState<boolean>(false);
  const loadReadyRef = useRef<boolean>(false);
  useEffect(() => {
    loadReadyRef.current = loadReady;
  }, [loadReady]);

  // --- State init (always start clean, then async-load overrides) ---
  const [resources, setResources] = useState<typeof INITIAL_STATE.resources>(INITIAL_STATE.resources);
  const [upgrades, setUpgrades] = useState<Upgrade[]>(() => migrateUpgrades(undefined));
  const [prestigeUpgrades, setPrestigeUpgrades] = useState<PrestigeUpgrade[]>(migratePrestigeUpgrades(undefined));
  const [floatingPickups, setFloatingPickups] = useState<FloatingPickupItem[]>([]);
  const [pickupSpawningPaused, setPickupSpawningPaused] = useState<boolean>(false);
  const [upgradePaceDelayMultiplier, setUpgradePaceDelayMultiplier] = useState<number>(1);
  const [autoClickBoostEndTime, setAutoClickBoostEndTime] = useState<number>(0);
  const [critBoostEndTime, setCritBoostEndTime] = useState<number>(0);
  const [activeTimeWarpMiniGame, setActiveTimeWarpMiniGame] = useState<TimeWarpMiniGameState | null>(null);
  const [timeWarpFeedback, setTimeWarpFeedback] = useState<TimeWarpResolutionFeedback | null>(null);
  const timeWarpCooldownUntilRef = useRef<number>(0);
  const autoClickBoostEndTimeRef = useRef<number>(0);
  const critBoostEndTimeRef = useRef<number>(0);
  const autoClickPickupStackRef = useRef<number>(0);
  const critPickupStackRef = useRef<number>(0);
  const lastUpgradePurchaseAtRef = useRef<number>(Date.now());
  const avgUpgradePurchaseIntervalMsRef = useRef<number>(UPGRADE_PACE_BASE_INTERVAL_MS);
  const comboSpawnTimeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const floatingPickupRemovalTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const achievementToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comboAutoclickSpawnLockedRef = useRef<boolean>(false);
  const comboCritSpawnLockedRef = useRef<boolean>(false);
  const timeWarpEligiblePickupStreakRef = useRef<number>(0);
  const timeWarpPityThresholdRef = useRef<number>(rollTimeWarpPityThreshold());
  const activeTimeWarpMiniGameRef = useRef<TimeWarpMiniGameState | null>(null);
  const lastTick = useRef(Date.now());
  const lastManualClickTimeRef = useRef<number>(0);
  const lastAutoClickTimeRef = useRef<number>(0);
  const queuedContractProgressRef = useRef<Partial<Record<ContractObjectiveType, number>>>({});
  const queuedContractFlushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const CLICK_COOLDOWN_MS = 59; // ~17 clicks/sec max
  const upgradesRef = useRef(upgrades);
  const statsRef = useRef<PlayerStats>(INITIAL_STATS);
  const activeComboChainSessionRef = useRef<ActiveComboChainSession | null>(null);
  const autoPickupSnapshotRef = useRef<AutoPickupSpawnSnapshot>({
    dataPerSecond: 0,
    dataAmount: 0,
    creditsAmount: 0,
    totalDataCollected: 0,
    totalUpgradesPurchased: 0,
    totalAscensions: 0,
    dataPerClick: 1,
    visiblePickupCount: 0,
  });

  const getLocalizedLootCandidateName = useCallback((candidate: LootDropCandidate): string => {
    let source: { id: string; name: string; description: string } | null = null;

    switch (candidate.cosmeticType) {
      case 'skin':
        source = (candidate.isAscensionCatalogItem ? ASCENSION_SKINS : CHARACTER_SKINS).find(item => item.id === candidate.id) ?? null;
        break;
      case 'theme':
        source = (candidate.isAscensionCatalogItem ? ASCENSION_ROOM_THEMES : ROOM_THEMES).find(item => item.id === candidate.id) ?? null;
        break;
      case 'accessory':
        source = (candidate.isAscensionCatalogItem ? ASCENSION_ACCESSORIES : CHARACTER_ACCESSORIES).find(item => item.id === candidate.id) ?? null;
        break;
      case 'headstyle':
        source = (candidate.isAscensionCatalogItem ? ASCENSION_HEAD_STYLES : CHARACTER_HEAD_STYLES).find(item => item.id === candidate.id) ?? null;
        break;
      case 'pet':
        source = (candidate.isAscensionCatalogItem ? ASCENSION_PETS : CHARACTER_PETS).find(item => item.id === candidate.id) ?? null;
        break;
      case 'clickeffect':
        source = CLICK_EFFECTS.find(item => item.id === candidate.id) ?? null;
        break;
      case 'boxskin':
        source = LOOT_BOX_SKINS.find(item => item.id === candidate.id) ?? null;
        break;
      case 'machineboxskin':
        source = MACHINE_BOX_SKINS.find(item => item.id === candidate.id) ?? null;
        break;
    }

    return localizeOptionalCatalogEntry(source, language)?.name ?? candidate.name;
  }, [language]);

  // Keep upgradesRef in sync with upgrades state
  useEffect(() => {
    upgradesRef.current = upgrades;
  }, [upgrades]);

  useEffect(() => {
    activeTimeWarpMiniGameRef.current = activeTimeWarpMiniGame;
  }, [activeTimeWarpMiniGame]);

  useEffect(() => {
    autoClickBoostEndTimeRef.current = autoClickBoostEndTime;
    if (Date.now() >= autoClickBoostEndTime) {
      autoClickPickupStackRef.current = 0;
    }
  }, [autoClickBoostEndTime]);

  useEffect(() => {
    critBoostEndTimeRef.current = critBoostEndTime;
    if (Date.now() >= critBoostEndTime) {
      critPickupStackRef.current = 0;
    }
  }, [critBoostEndTime]);

  const clearComboSpawnTimeouts = useCallback(() => {
    if (comboSpawnTimeoutsRef.current.length === 0) return;
    comboSpawnTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    comboSpawnTimeoutsRef.current = [];
  }, []);

  const clearFloatingPickupRemovalTimeout = useCallback((pickupId: string) => {
    const timeout = floatingPickupRemovalTimeoutsRef.current.get(pickupId);
    if (!timeout) return;
    clearTimeout(timeout);
    floatingPickupRemovalTimeoutsRef.current.delete(pickupId);
  }, []);

  const scheduleFloatingPickupRemoval = useCallback((pickupId: string, delayMs: number) => {
    clearFloatingPickupRemovalTimeout(pickupId);
    const timeout = setTimeout(() => {
      floatingPickupRemovalTimeoutsRef.current.delete(pickupId);
      setFloatingPickups(prev => prev.filter(p => p.id !== pickupId));
    }, delayMs);
    floatingPickupRemovalTimeoutsRef.current.set(pickupId, timeout);
  }, [clearFloatingPickupRemovalTimeout]);

  const clearAllFloatingPickupRemovalTimeouts = useCallback(() => {
    if (floatingPickupRemovalTimeoutsRef.current.size === 0) return;
    floatingPickupRemovalTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    floatingPickupRemovalTimeoutsRef.current.clear();
  }, []);

  const queueAchievementToastClear = useCallback(() => {
    if (achievementToastTimeoutRef.current !== null) {
      clearTimeout(achievementToastTimeoutRef.current);
    }
    achievementToastTimeoutRef.current = setTimeout(() => {
      achievementToastTimeoutRef.current = null;
      setNewlyUnlockedAchievement(null);
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      clearComboSpawnTimeouts();
      clearAllFloatingPickupRemovalTimeouts();
      if (achievementToastTimeoutRef.current !== null) {
        clearTimeout(achievementToastTimeoutRef.current);
      }
    };
  }, [clearComboSpawnTimeouts, clearAllFloatingPickupRemovalTimeouts]);

  useEffect(() => {
    const refreshPaceAssist = () => {
      const now = Date.now();
      const idleMs = Math.max(0, now - lastUpgradePurchaseAtRef.current);
      const nextMultiplier = getUpgradePaceSpawnDelayMultiplier(
        avgUpgradePurchaseIntervalMsRef.current,
        idleMs
      );
      setUpgradePaceDelayMultiplier(prev =>
        Math.abs(prev - nextMultiplier) < 0.01 ? prev : nextMultiplier
      );
    };

    refreshPaceAssist();
    const interval = setInterval(refreshPaceAssist, 1500);
    return () => clearInterval(interval);
  }, []);

  const [lastUpgradeInfo, setLastUpgradeInfo] = useState<{ name: string; effect: string } | null>(null);
  const [masterVolume, setMasterVolume] = useState(true);
  const [musicVolume, setMusicVolume] = useState(0.2);
  const [sfxVolume, setSfxVolume] = useState(0.5);
  const [isMusicPlaying, setIsMusicPlaying] = useState(true);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS);
  const [stats, setStats] = useState<PlayerStats>(INITIAL_STATS);
  const [newlyUnlockedAchievement, setNewlyUnlockedAchievement] = useState<Achievement | null>(null);
  const [newlyUnlockedAscensionPetId, setNewlyUnlockedAscensionPetId] = useState<string | null>(null);
  const [newlyUnlockedTutorialReward, setNewlyUnlockedTutorialReward] = useState<TutorialReward | null>(null);
  const [pendingAscensionPetUnlocks, setPendingAscensionPetUnlocks] = useState<string[]>([]);
  const [cosmetics, setCosmetics] = useState<CosmeticsState>(INITIAL_COSMETICS);
  const [contracts, setContracts] = useState<ContractsState>(INITIAL_CONTRACTS);
  const [roomLayout, setRoomLayout] = useState<RoomLayout>(INITIAL_ROOM_LAYOUT);
  const [tutorial, setTutorial] = useState<TutorialState>(INITIAL_TUTORIAL);
  const [automation, setAutomation] = useState<AutomationSettings>(INITIAL_AUTOMATION);
  const [challenges, setChallenges] = useState<ChallengeState>(INITIAL_CHALLENGES);
  const [finale, setFinale] = useState<FinaleState>(INITIAL_FINALE);
  const [whatsNew, setWhatsNew] = useState<WhatsNewState>(SEEN_WHATS_NEW);
  const challengesRef = useRef<ChallengeState>(INITIAL_CHALLENGES);
  challengesRef.current = challenges;

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);
  const [offlineProgress, setOfflineProgress] = useState<OfflineProgress | null>(null);

  const effectiveMachineLayout = useMemo(() => {
    return buildEffectiveMachineLayout(upgrades, roomLayout.machinePositions);
  }, [upgrades, roomLayout.machinePositions]);

  const adjacencyFormation = useMemo(() => {
    return calculateAdjacencyFormation(effectiveMachineLayout);
  }, [effectiveMachineLayout]);

  const activeAdjacencyClickBoost = useMemo(() => {
    if (!cosmetics.blackMarketAdjacencyPurchased) return 0;
    return adjacencyFormation.clickBoostPercent / 100;
  }, [cosmetics.blackMarketAdjacencyPurchased, adjacencyFormation.clickBoostPercent]);

  const activeAdjacencyProductionBoost = useMemo(() => {
    if (!cosmetics.blackMarketAdjacencyPurchased) return 0;
    return adjacencyFormation.productionBoostPercent / 100;
  }, [cosmetics.blackMarketAdjacencyPurchased, adjacencyFormation.productionBoostPercent]);

  const activeAdjacencyCryptoBoost = useMemo(() => {
    if (!cosmetics.blackMarketAdjacencyPurchased) return 0;
    return adjacencyFormation.cryptoBoostPercent / 100;
  }, [cosmetics.blackMarketAdjacencyPurchased, adjacencyFormation.cryptoBoostPercent]);

  const activeAdjacencyLuckBoostPercent = useMemo(() => {
    if (!cosmetics.blackMarketAdjacencyPurchased) return 0;
    return adjacencyFormation.luckBoostPercent;
  }, [cosmetics.blackMarketAdjacencyPurchased, adjacencyFormation.luckBoostPercent]);

  const activeCosmeticBoosts = useMemo<Required<PetBoost>>(() => computeRunBoosts(cosmetics, challenges), [
    challenges,
    cosmetics.activeSkinId,
    cosmetics.activeThemeId,
    cosmetics.activeAccessoryId,
    cosmetics.activeCapeId,
    cosmetics.activeWingId,
    cosmetics.activeHeadStyleId,
    cosmetics.activePetId,
    cosmetics.activeClickEffectId,
    cosmetics.activeAscensionPetId,
    cosmetics.cryptoRelicLevels,
    cosmetics.ownedSkins,
    cosmetics.ownedHeadStyles,
    cosmetics.ownedAccessories,
    cosmetics.ownedCapes,
    cosmetics.ownedWings,
    cosmetics.ownedAscensionSkins,
    cosmetics.ownedAscensionHeadStyles,
    cosmetics.ownedAscensionAccessories,
  ]);

  const activeParagonBonuses = useMemo(() => {
    return computeParagonBonuses(cosmetics.paragonLevels);
  }, [cosmetics.paragonLevels]);

  // Data -> Node rate for "pay with data" (same as the Convert button: Node Compression + Market Arbitrage).
  const nodeSaleRate = useMemo<NodeSaleRate>(() => {
    let nodesPerSale = 1;
    prestigeUpgrades.forEach(p => {
      if (p.count > 0 && p.effect.type === 'sell_boost') nodesPerSale += p.effect.value * p.count;
    });
    return { dataPerNode: activeParagonBonuses.nodeConversionDataCost, nodesPerSale };
  }, [prestigeUpgrades, activeParagonBonuses.nodeConversionDataCost]);
  const nodeSaleRateRef = useRef(nodeSaleRate);
  nodeSaleRateRef.current = nodeSaleRate;

  const activePickupBoosts = useMemo(() => {
    let spawnRateBonus = 0;
    let timeWarpChanceBonus = 0;
    let timeWarpSeconds = 0;
    let timeWarpCooldownReductionSeconds = 0;

    prestigeUpgrades.forEach(upgrade => {
      if (upgrade.count <= 0) return;

      if (upgrade.effect.type === 'pickup_spawn_rate') {
        spawnRateBonus += upgrade.effect.value * upgrade.count;
      } else if (upgrade.effect.type === 'time_warp_chance') {
        timeWarpChanceBonus += upgrade.effect.value * upgrade.count;
      } else if (upgrade.effect.type === 'time_warp_seconds') {
        timeWarpSeconds += upgrade.effect.value * upgrade.count;
      } else if (upgrade.effect.type === 'time_warp_cooldown') {
        timeWarpCooldownReductionSeconds += upgrade.effect.value * upgrade.count;
      }
    });

    return {
      spawnDelayMultiplier: Math.max(
        AUTO_PICKUP_MIN_DELAY_MULTIPLIER,
        (1 - spawnRateBonus) * activeParagonBonuses.pickupSpawnMultiplier
      ),
      timeWarpChance: Math.min(0.8, TIME_WARP_BASE_TRIGGER_CHANCE + timeWarpChanceBonus),
      timeWarpSeconds: Math.min(TIME_WARP_MAX_BONUS_SECONDS, Math.max(0, Math.floor(timeWarpSeconds))),
      timeWarpCooldownMs: Math.max(
        TIME_WARP_MIN_COOLDOWN_MS,
        Math.floor((TIME_WARP_BASE_COOLDOWN_MS - Math.floor(timeWarpCooldownReductionSeconds * 1000)) * activeParagonBonuses.timeWarpCooldownMultiplier)
      ),
    };
  }, [prestigeUpgrades, activeParagonBonuses.pickupSpawnMultiplier, activeParagonBonuses.timeWarpCooldownMultiplier]);

  // Save helper used by autosave + manual save
  const saveGameState = useCallback(async (data: SaveData): Promise<boolean> => {
    if (!loadReadyRef.current) return false;
    return await storageAdapter.save(data);
  }, []);
const applyLoadedState = useCallback((rawBase: SaveData) => {
    // v1.03 economy migration (once per save): merge/trim prestige upgrades and refund the difference.
    let base = rawBase;
    if ((rawBase.economyVersion ?? 0) < ECONOMY_VERSION) {
      const { upgrades: migratedPrestige, refund } = migratePrestigeEconomyV103(rawBase.prestigeUpgrades);
      const savedResources = rawBase.resources || INITIAL_STATE.resources;
      base = {
        ...rawBase,
        prestigeUpgrades: migratedPrestige,
        resources: refund > 0
          ? { ...savedResources, prestige: { ...savedResources.prestige, amount: (savedResources.prestige?.amount || 0) + refund } }
          : savedResources,
        economyVersion: ECONOMY_VERSION,
      };
      if (refund > 0) console.log('[Save] v1.03 prestige refund:', refund);
    }
    // Apply every slice we actually use.
    const baseResources = base.resources || INITIAL_STATE.resources;
    const baseStats = { ...INITIAL_STATS, ...(base.stats || {}) };

    // Compute offline progress from the loaded timestamp (and apply earnings once).
    let resourcesToApply = baseResources;
    let statsToApply = baseStats;

    try {
      const lastSave = base.lastSaveTimestamp;
      if (lastSave) {
        const now = Date.now();
        const timePassed = Math.floor((now - lastSave) / 1000);
        const savedPrestigeUpgrades = (base.prestigeUpgrades || []) as any[];
        const maxOfflineTime = getMaxOfflineTimeSeconds(savedPrestigeUpgrades);
        const effectiveTime = Math.min(timePassed, maxOfflineTime);

        if (effectiveTime >= 60) {
          // Same per-level sum and multipliers as the live tick (previously offline counted only each
          // upgrade's top level and skipped cosmetics/relics/Paragon/adjacency/crypto bonuses).
          const offlineUpgrades = migrateUpgrades(base.upgrades);
          const offlinePrestigeUpgrades = migratePrestigeUpgrades(base.prestigeUpgrades);
          const offlineCosmetics = migrateCosmetics(base.cosmetics);
          const offlineParagon = computeParagonBonuses(offlineCosmetics.paragonLevels);
          const offlineAdjacency = offlineCosmetics.blackMarketAdjacencyPurchased
            ? calculateAdjacencyFormation(
                buildEffectiveMachineLayout(offlineUpgrades, migrateRoomLayout(base.roomLayout).machinePositions)
              )
            : null;
          const rates = computeProductionRates({
            upgrades: offlineUpgrades,
            prestigeUpgrades: offlinePrestigeUpgrades,
            cosmeticBoosts: computeRunBoosts(offlineCosmetics, migrateChallenges(base.challenges)),
            cryptoChallengeMultiplier: migrateChallenges(base.challenges).active === 'half_crypto' ? 0.5 : 1,
            paragonProductionMultiplier: offlineParagon.productionMultiplier,
            paragonCryptoMultiplier: offlineParagon.cryptoMultiplier,
            adjacencyProductionBoost: offlineAdjacency ? offlineAdjacency.productionBoostPercent / 100 : 0,
            adjacencyCryptoBoost: offlineAdjacency ? offlineAdjacency.cryptoBoostPercent / 100 : 0,
          });

          // Offline earns 50% of the online rate, plus Passive Matrix (offline_boost) on top.
          let offlineMultiplier = 0.5;
          offlinePrestigeUpgrades.forEach(p => {
            if (p.count > 0 && p.effect.type === 'offline_boost') offlineMultiplier *= 1 + p.effect.value * p.count;
          });

          const dataEarned = Math.floor(rates.data * effectiveTime * offlineMultiplier);
          const creditsEarned = Math.floor(rates.credits * effectiveTime * offlineMultiplier);
          const cryptoEarned = Math.floor(rates.crypto * effectiveTime * offlineMultiplier);

          if (dataEarned > 0 || creditsEarned > 0 || cryptoEarned > 0) {
            resourcesToApply = {
              ...baseResources,
              data: { ...baseResources.data, amount: baseResources.data.amount + dataEarned },
              credits: { ...baseResources.credits, amount: baseResources.credits.amount + creditsEarned },
              crypto: { ...baseResources.crypto, amount: baseResources.crypto.amount + cryptoEarned },
            };

            statsToApply = {
              ...baseStats,
              totalDataCollected: baseStats.totalDataCollected + dataEarned,
              totalCreditsEarned: baseStats.totalCreditsEarned + creditsEarned,
              totalCryptoMined: baseStats.totalCryptoMined + cryptoEarned,
            };

            setOfflineProgress({
              timeAway: effectiveTime,
              dataEarned,
              creditsEarned,
              cryptoEarned,
              maxTime: maxOfflineTime,
            });
          }
        }
      }
    } catch {
      // Offline calc should never block loading.
    }

    setResources(resourcesToApply);
    setUpgrades(migrateUpgrades(base.upgrades));
    setPrestigeUpgrades(migratePrestigeUpgrades(base.prestigeUpgrades));
    setAchievements(migrateAchievements(base.achievements));
    setStats(statsToApply);
    setCosmetics(migrateCosmetics(base.cosmetics));
    setContracts(base.contracts || INITIAL_CONTRACTS);
    setRoomLayout(migrateRoomLayout(base.roomLayout));
    setAutomation(migrateAutomation(base.automation));
    setChallenges(migrateChallenges(base.challenges));
    setFinale(migrateFinale(base.finale));
    // A save from before v1.03 (with real progress) is a returning player: show What's new + gift once.
    {
      const saved = base.whatsNew as Partial<WhatsNewState> | undefined;
      const returning = (rawBase.economyVersion ?? 0) < ECONOMY_VERSION && ((baseStats.totalClicks ?? 0) > 0 || (baseStats.totalAscensions ?? 0) > 0);
      setWhatsNew(saved && typeof saved.seenVersion === 'string'
        ? { seenVersion: saved.seenVersion, giftClaimed: !!saved.giftClaimed }
        : returning ? { seenVersion: '', giftClaimed: false } : SEEN_WHATS_NEW);
    }
    setTutorial(migrateTutorial(base.tutorial));
    setElapsedTime(base.elapsedTime || 0);
    setMasterVolume(base.masterVolume ?? true);
    setMusicVolume(base.musicVolume ?? 0.2);
    setSfxVolume(base.sfxVolume ?? 0.5);
    setIsMusicPlaying(base.isMusicPlaying ?? true);
  }, []);

  // Async load: run on mount, apply loaded data, then unblock saving.
  // v1.04: the save file is read directly (no waiting for Steam). If a save exists but can't be read,
  // or applying it throws, autosave stays locked and the player gets a retry screen instead of a fresh
  // game that would overwrite the real save.
  const [saveLoadError, setSaveLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  useEffect(() => {
    if (loadReadyRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const result = await storageAdapter.load();
        if (cancelled) return;
        console.log('[Save] load result:', result.status);
        if (result.status === 'error') {
          setSaveLoadError(result.reason || 'unreadable');
          return;
        }
        if (result.status === 'ok') applyLoadedState(result.data);
        setSaveLoadError(null);
        setLoadReady(true);
      } catch (e: any) {
        console.log('[Save] load failed:', e?.message || e);
        if (!cancelled) setSaveLoadError(e?.message || String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyLoadedState, loadAttempt]);

  const retrySaveLoad = useCallback(() => {
    setSaveLoadError(null);
    setLoadAttempt(n => n + 1);
  }, []);

  // Moves the unreadable file into the backups folder (never deletes it), then loads again, which picks
  // the newest local copy or starts fresh.
  const continueWithoutUnreadableSave = useCallback(async () => {
    const ok = await storageAdapter.quarantine();
    if (!ok) return false;
    setSaveLoadError(null);
    setLoadAttempt(n => n + 1);
    return true;
  }, []);

  const openSaveFolder = useCallback(() => {
    void storageAdapter.openFolder();
  }, []);

  const clearOfflineProgress = useCallback(() => {
    setOfflineProgress(null);
  }, []);

  // Create persistent audio context (fix for multiple sounds)
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const getAudioContext = useCallback((): AudioContext | null => {
    if (audioContextRef.current) return audioContextRef.current;
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return null;
    try {
      audioContextRef.current = new AudioContext();
      return audioContextRef.current;
    } catch {
      return null;
    }
  }, []);

  // Game feel: fast manual clicking raises the click pitch a little (up to +6 semitones),
  // and every click gets a tiny random detune so long sessions don't sound like one repeated beep.
  const clickStreakRef = useRef<{ count: number; last: number }>({ count: 0, last: 0 });
  const noteManualClickForSound = useCallback((now: number) => {
    const streak = clickStreakRef.current;
    streak.count = now - streak.last < 400 ? streak.count + 1 : 0;
    streak.last = now;
  }, []);
  const getClickPitchFactor = () => {
    const streak = clickStreakRef.current;
    const active = Date.now() - streak.last < 400 ? streak.count : 0;
    const semitones = Math.min(24, active) * 0.25;
    return Math.pow(2, semitones / 12) * (1 + (Math.random() - 0.5) * 0.06);
  };

  // Cyberpunk-themed sounds
  const playSound = useCallback((type: 'click' | 'buy_fab' | 'buy_black' | 'sell' | 'crit' | 'checkpoint' | 'achievement' | 'pickup' | 'job_claim' | 'boss_hit' | 'weakspot_hit' | 'ascend_available' | 'prestige_realm' | 'loot_open' | 'loot_reveal_rare' | 'loot_reveal_epic' | 'loot_reveal_legendary' | 'loot_reveal_fallback' | 'timewarp_open' | 'timewarp_close' | 'open_cosmetics' | 'celebrate' | 'shop_unlock' | 'legendary' | 'finale') => {
    const ctx = getAudioContext();
    if (!ctx || sfxVolume === 0 || !masterVolume) return;

    const vol = sfxVolume;

    // v1.03 celebration SFX: short synthwave arpeggios built with Web Audio (no new assets).
    const tone = (freq: number, start: number, duration: number, wave: OscillatorType, peak: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(peak * vol, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration + 0.02);
    };
    if (type === 'celebrate') {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.07, 0.35, 'triangle', 0.12));
      return;
    }
    if (type === 'shop_unlock') {
      [392, 587.33, 783.99].forEach((f, i) => tone(f, i * 0.09, 0.4, 'sawtooth', 0.06));
      tone(1567.98, 0.3, 0.5, 'sine', 0.08);
      return;
    }
    if (type === 'legendary') {
      tone(220, 0, 0.8, 'sawtooth', 0.05);
      [659.25, 830.61, 987.77, 1318.51, 1661.22].forEach((f, i) => tone(f, i * 0.06, 0.5, 'square', 0.05));
      return;
    }
    if (type === 'finale') {
      [[261.63, 329.63, 392], [293.66, 369.99, 440], [329.63, 415.3, 493.88], [392, 493.88, 587.33, 783.99]]
        .forEach((chord, i) => chord.forEach(f => tone(f, i * 0.45, i === 3 ? 2.2 : 1.1, 'sawtooth', 0.035)));
      [1046.5, 1318.51, 1567.98, 2093].forEach((f, i) => tone(f, 1.4 + i * 0.08, 0.6, 'triangle', 0.06));
      return;
    }

    if (type === 'click') {
      // Sharp digital click - two quick beeps
      const pitch = getClickPitchFactor();
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(1200 * pitch, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(800 * pitch, ctx.currentTime + 0.06);
      gain1.gain.setValueAtTime(0.12 * vol, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.06);
      
      // Second beep
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(900 * pitch, ctx.currentTime + 0.08);
      osc2.frequency.exponentialRampToValueAtTime(600 * pitch, ctx.currentTime + 0.13);
      gain2.gain.setValueAtTime(0.08 * vol, ctx.currentTime + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.13);
      osc2.start(ctx.currentTime + 0.08);
      osc2.stop(ctx.currentTime + 0.13);
    } else if (type === 'ascend_available') {
      // Triumphant rising swell for ascension availability
      const startTime = ctx.currentTime;
      [440, 554.37, 659.25, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime + i * 0.1);
        gain.gain.setValueAtTime(0, startTime + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.15 * vol, startTime + i * 0.1 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + i * 0.1 + 0.4);
        osc.start(startTime + i * 0.1);
        osc.stop(startTime + i * 0.1 + 0.4);
      });
    } else if (type === 'prestige_realm') {
      // Deep digital transition for prestige realm
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      filter.type = 'lowpass';
      osc.frequency.setValueAtTime(110, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.5);
      filter.frequency.setValueAtTime(1000, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.2 * vol, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } else if (type === 'crit') {
      // High-pitched crit sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2000, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15 * vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
      // Game feel: a short low "thump" under the crit chime so crits feel like an impact.
      const thump = ctx.createOscillator();
      const thumpGain = ctx.createGain();
      thump.connect(thumpGain);
      thumpGain.connect(ctx.destination);
      thump.type = 'sine';
      thump.frequency.setValueAtTime(150, ctx.currentTime);
      thump.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.12);
      thumpGain.gain.setValueAtTime(0.22 * vol, ctx.currentTime);
      thumpGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
      thump.start();
      thump.stop(ctx.currentTime + 0.15);
    } else if (type === 'buy_fab') {
      // Fabrication buy sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1 * vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'buy_black') {
      // Black market buy sound - ominous
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12 * vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'open_cosmetics') {
      // Cosmetics panel open: bright neon arpeggio, distinct from shop buy sounds.
      const startTime = ctx.currentTime;
      const notes = [740, 987.77, 1244.51];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = i === 2 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, startTime + i * 0.045);
        gain.gain.setValueAtTime(0.0001, startTime + i * 0.045);
        gain.gain.linearRampToValueAtTime(0.1 * vol, startTime + i * 0.045 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + i * 0.045 + 0.16);
        osc.start(startTime + i * 0.045);
        osc.stop(startTime + i * 0.045 + 0.18);
      });
    } else if (type === 'sell') {
      // Sell sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1 * vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'checkpoint') {
      // Triumphant checkpoint sound
      const startTime = ctx.currentTime;
      
      [1, 0.7, 0.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * 800, startTime + i * 0.1);
        osc.frequency.exponentialRampToValueAtTime(freq * 1200, startTime + i * 0.1 + 0.15);
        gain.gain.setValueAtTime(0.12 * vol, startTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + i * 0.1 + 0.15);
        osc.start(startTime + i * 0.1);
        osc.stop(startTime + i * 0.1 + 0.15);
      });
    } else if (type === 'achievement') {
      // Achievement unlock fanfare - rising arpeggio
      const startTime = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime + i * 0.08);
        gain.gain.setValueAtTime(0.15 * vol, startTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + i * 0.08 + 0.2);
        osc.start(startTime + i * 0.08);
        osc.stop(startTime + i * 0.08 + 0.2);
      });
    } else if (type === 'pickup') {
      // Satisfying pickup collect sound - quick rising chime
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();
      
      osc1.connect(gain1);
      osc2.connect(gain2);
      gain1.connect(ctx.destination);
      gain2.connect(ctx.destination);
      
      // First tone - quick rising blip
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(600, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
      gain1.gain.setValueAtTime(0.12 * vol, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.1);
      
      // Second tone - shimmer
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1400, ctx.currentTime + 0.05);
      osc2.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.12);
      gain2.gain.setValueAtTime(0.08 * vol, ctx.currentTime + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc2.start(ctx.currentTime + 0.05);
      osc2.stop(ctx.currentTime + 0.15);
    } else if (type === 'job_claim') {
      // Job/contract claim sound - short rewarding confirmation chime.
      const startTime = ctx.currentTime;
      const notes = [740, 988];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime + i * 0.06);
        gain.gain.setValueAtTime(0.12 * vol, startTime + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + i * 0.06 + 0.18);
        osc.start(startTime + i * 0.06);
        osc.stop(startTime + i * 0.06 + 0.18);
      });
    } else if (type === 'boss_hit') {
      // Heavy impact sound for hitting the boss
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15 * vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'weakspot_hit') {
      // Satisfying critical hit sound - high-pitched burst with shimmer
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();
      
      osc1.connect(gain1);
      osc2.connect(gain2);
      gain1.connect(ctx.destination);
      gain2.connect(ctx.destination);
      
      // Main burst
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1500, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(2500, ctx.currentTime + 0.08);
      gain1.gain.setValueAtTime(0.2 * vol, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.15);
      
      // Shimmer overlay
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(2000, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + 0.1);
      gain2.gain.setValueAtTime(0.1 * vol, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc2.start();
      osc2.stop(ctx.currentTime + 0.12);
    } else if (type === 'timewarp_open') {
      // Time warp spawn sound: rising "beeeooopp" with soft shimmer.
      const startTime = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const shimmerOsc = ctx.createOscillator();
      const shimmerGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      shimmerOsc.connect(shimmerGain);
      shimmerGain.connect(ctx.destination);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(520, startTime);
      filter.frequency.exponentialRampToValueAtTime(1800, startTime + 0.34);
      filter.Q.setValueAtTime(2.8, startTime);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, startTime);
      osc.frequency.exponentialRampToValueAtTime(980, startTime + 0.34);
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.16 * vol, startTime + 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
      osc.start(startTime);
      osc.stop(startTime + 0.42);

      shimmerOsc.type = 'sine';
      shimmerOsc.frequency.setValueAtTime(920, startTime + 0.12);
      shimmerOsc.frequency.exponentialRampToValueAtTime(1320, startTime + 0.34);
      shimmerGain.gain.setValueAtTime(0.0001, startTime + 0.1);
      shimmerGain.gain.linearRampToValueAtTime(0.08 * vol, startTime + 0.16);
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.42);
      shimmerOsc.start(startTime + 0.1);
      shimmerOsc.stop(startTime + 0.44);
    } else if (type === 'timewarp_close') {
      // Time warp resolve sound: reversed contour (high to low).
      const startTime = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const tailOsc = ctx.createOscillator();
      const tailGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      tailOsc.connect(tailGain);
      tailGain.connect(ctx.destination);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, startTime);
      filter.frequency.exponentialRampToValueAtTime(420, startTime + 0.38);
      filter.Q.setValueAtTime(1.2, startTime);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1020, startTime);
      osc.frequency.exponentialRampToValueAtTime(240, startTime + 0.36);
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.17 * vol, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
      osc.start(startTime);
      osc.stop(startTime + 0.42);

      tailOsc.type = 'sine';
      tailOsc.frequency.setValueAtTime(560, startTime + 0.1);
      tailOsc.frequency.exponentialRampToValueAtTime(220, startTime + 0.4);
      tailGain.gain.setValueAtTime(0.0001, startTime + 0.08);
      tailGain.gain.linearRampToValueAtTime(0.08 * vol, startTime + 0.16);
      tailGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.44);
      tailOsc.start(startTime + 0.08);
      tailOsc.stop(startTime + 0.46);
    } else if (type === 'loot_open') {
      // Mechanical crate open: low latch + short energy swipe
      const startTime = ctx.currentTime;

      const latchOsc = ctx.createOscillator();
      const latchGain = ctx.createGain();
      latchOsc.connect(latchGain);
      latchGain.connect(ctx.destination);
      latchOsc.type = 'square';
      latchOsc.frequency.setValueAtTime(180, startTime);
      latchOsc.frequency.exponentialRampToValueAtTime(120, startTime + 0.08);
      latchGain.gain.setValueAtTime(0.18 * vol, startTime);
      latchGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
      latchOsc.start(startTime);
      latchOsc.stop(startTime + 0.1);

      const swipeOsc = ctx.createOscillator();
      const swipeGain = ctx.createGain();
      swipeOsc.connect(swipeGain);
      swipeGain.connect(ctx.destination);
      swipeOsc.type = 'triangle';
      swipeOsc.frequency.setValueAtTime(520, startTime + 0.06);
      swipeOsc.frequency.exponentialRampToValueAtTime(980, startTime + 0.18);
      swipeGain.gain.setValueAtTime(0.1 * vol, startTime + 0.06);
      swipeGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
      swipeOsc.start(startTime + 0.06);
      swipeOsc.stop(startTime + 0.2);
    } else if (type === 'loot_reveal_rare') {
      // Rare reveal: clean short cyber chime
      const startTime = ctx.currentTime;
      [760, 1010].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime + idx * 0.07);
        gain.gain.setValueAtTime(0.14 * vol, startTime + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + idx * 0.07 + 0.2);
        osc.start(startTime + idx * 0.07);
        osc.stop(startTime + idx * 0.07 + 0.2);
      });
    } else if (type === 'loot_reveal_epic') {
      // Epic reveal: brighter layered shimmer
      const startTime = ctx.currentTime;
      [690, 880, 1180].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = idx === 2 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, startTime + idx * 0.06);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.12, startTime + idx * 0.06 + 0.2);
        gain.gain.setValueAtTime(0.15 * vol, startTime + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + idx * 0.06 + 0.24);
        osc.start(startTime + idx * 0.06);
        osc.stop(startTime + idx * 0.06 + 0.24);
      });
    } else if (type === 'loot_reveal_legendary') {
      // Legendary reveal: long fanfare with rich highs
      const startTime = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = i >= 3 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, startTime + i * 0.075);
        gain.gain.setValueAtTime(0.18 * vol, startTime + i * 0.075);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + i * 0.075 + 0.32);
        osc.start(startTime + i * 0.075);
        osc.stop(startTime + i * 0.075 + 0.32);
      });
    } else if (type === 'loot_reveal_fallback') {
      // Fallback reveal: calm confirmation tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(640, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.14);
      gain.gain.setValueAtTime(0.12 * vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  }, [getAudioContext, sfxVolume, masterVolume]);

  // Achievement checking function - does NOT auto-grant prestige, must be claimed
  const unlockAchievement = useCallback((achievementId: string) => {
    setAchievements(prev => {
      const updated = prev.map(a => {
        if (a.id === achievementId && !a.unlocked) {
          const unlocked = { ...a, unlocked: true, unlockedAt: Date.now(), claimed: false };
          setNewlyUnlockedAchievement(unlocked);
          playSound('achievement');
          queueAchievementToastClear();
			  // Sync with Steam if available (internal id -> Steam API name)
			  if (isSteamAvailable()) {
				unlockSteamAchievement(achievementId);
			  }
          return unlocked;
        }
        return a;
      });
      return updated;
    });
  }, [playSound]);

  const updateAchievementProgress = useCallback((achievementId: string, progress: number) => {
    setAchievements(prev => prev.map(a => {
      if (a.id === achievementId && !a.unlocked && a.maxProgress) {
        const newProgress = Math.min(progress, a.maxProgress);
        if (newProgress >= a.maxProgress) {
          const unlocked = { ...a, unlocked: true, unlockedAt: Date.now(), progress: newProgress, claimed: false };
          setNewlyUnlockedAchievement(unlocked);
          playSound('achievement');
          queueAchievementToastClear();
			  // Sync with Steam if available (internal id -> Steam API name)
			  if (isSteamAvailable()) {
				unlockSteamAchievement(achievementId);
			  }
          return unlocked;
        }
        return { ...a, progress: newProgress };
      }
      return a;
    }));
  }, [playSound]);

  // Claim prestige reward for a completed achievement
  const claimAchievementReward = useCallback((achievementId: string) => {
    const achievement = achievements.find(a => a.id === achievementId);
    if (!achievement || !achievement.unlocked || achievement.claimed) return;
    
    // Grant prestige reward
    if (achievement.prestigeReward > 0) {
      setResources(r => ({
        ...r,
        prestige: { ...r.prestige, amount: r.prestige.amount + achievement.prestigeReward }
      }));
      playSound('crit');
    }
    
    // Mark as claimed
    setAchievements(prev => prev.map(a => 
      a.id === achievementId ? { ...a, claimed: true } : a
    ));
  }, [achievements, playSound]);
  
  // Claim all unlocked but unclaimed achievements at once
  const claimAllAchievements = useCallback(() => {
    const unclaimedList = achievements.filter(a => a.unlocked && !a.claimed);
    if (unclaimedList.length === 0) return;
    
    // Calculate total prestige reward
    const totalReward = unclaimedList.reduce((sum, a) => sum + a.prestigeReward, 0);
    
    if (totalReward > 0) {
      setResources(r => ({
        ...r,
        prestige: { ...r.prestige, amount: r.prestige.amount + totalReward }
      }));
      playSound('crit');
    }
    
    // Mark all as claimed
    setAchievements(prev => prev.map(a => 
      a.unlocked && !a.claimed ? { ...a, claimed: true } : a
    ));
  }, [achievements, playSound]);

  // Total prestige earned from all sources (for stats)
  const totalPrestigeEarned = useMemo(() => {
    const ascensionPrestige = stats.totalPrestigeEarned;
    const achievementPrestige = achievements
      .filter(a => a.claimed)
      .reduce((sum, a) => sum + a.prestigeReward, 0);
    return ascensionPrestige + achievementPrestige;
  }, [stats.totalPrestigeEarned, achievements]);

  // Check achievements based on current stats - dynamically checks all tiered achievements
  const checkAchievements = useCallback((currentStats: PlayerStats, dataPerSecond: number) => {
    // Check all achievements dynamically
    achievements.forEach(a => {
      if (a.unlocked) return;
      
      const id = a.id;

      // Secret Achievements / Hardcoded checks
      if (id === 'secret_millionaire' && resources.credits.amount >= 1000000 && resources.crypto.amount >= 1000) {
        unlockAchievement(id);
        return;
      }
      
      // Click achievements
      if (id.startsWith('clicks_')) {
        const tier = parseInt(id.replace('clicks_', ''));
        if (a.maxProgress) updateAchievementProgress(id, currentStats.totalClicks);
        else if (currentStats.totalClicks >= tier) unlockAchievement(id);
      }
      
      // Crit achievements  
      if (id.startsWith('crits_')) {
        const tier = parseInt(id.replace('crits_', ''));
        if (tier === 1 && currentStats.totalCrits >= 1) unlockAchievement(id);
        else if (a.maxProgress) updateAchievementProgress(id, currentStats.totalCrits);
      }
      
      // Data achievements
      if (id.startsWith('data_') && !id.startsWith('data_rate')) {
        if (a.maxProgress) updateAchievementProgress(id, currentStats.totalDataCollected);
      }
      
      // Credit achievements
      if (id.startsWith('credits_')) {
        if (a.maxProgress) updateAchievementProgress(id, currentStats.totalCreditsEarned);
      }
      
      // Crypto achievements
      if (id.startsWith('crypto_')) {
        if (a.maxProgress) updateAchievementProgress(id, currentStats.totalCryptoMined);
      }
      
      // Upgrade achievements
      if (id.startsWith('upgrades_')) {
        const tier = parseInt(id.replace('upgrades_', ''));
        if (tier === 1 && currentStats.totalUpgradesPurchased >= 1) unlockAchievement(id);
        else if (a.maxProgress) updateAchievementProgress(id, currentStats.totalUpgradesPurchased);
      }
      
      // Ascension achievements
      if (id.startsWith('ascend_')) {
        const tier = parseInt(id.replace('ascend_', ''));
        if (tier === 1 && currentStats.totalAscensions >= 1) unlockAchievement(id);
        else if (a.maxProgress) updateAchievementProgress(id, currentStats.totalAscensions);
      }
      
      // Prestige spent achievements
      if (id.startsWith('prestige_spent_')) {
        if (a.maxProgress) updateAchievementProgress(id, currentStats.totalPrestigeSpent);
      }
      
      // Pickup achievements
      if (id.startsWith('pickups_')) {
        if (a.maxProgress) updateAchievementProgress(id, currentStats.pickupsCollected);
      }
      
      // Crit pickup achievements
      if (id.startsWith('crit_pickups_')) {
        const tier = parseInt(id.replace('crit_pickups_', ''));
        if (tier === 1 && currentStats.critPickupsCollected >= 1) unlockAchievement(id);
        else if (a.maxProgress) updateAchievementProgress(id, currentStats.critPickupsCollected);
      }
      
      // DPS achievements
      if (id.startsWith('dps_')) {
        const tier = parseInt(id.replace('dps_', ''));
        if (dataPerSecond >= tier) unlockAchievement(id);
      }
      
      // Speed achievements
      if (id.startsWith('speed_') && currentStats.totalAscensions > 0) {
        const tier = parseInt(id.replace('speed_', ''));
        if (currentStats.fastestAscension <= tier) unlockAchievement(id);
      }
      
      // Playtime achievements
      if (id.startsWith('playtime_')) {
        if (a.maxProgress) updateAchievementProgress(id, currentStats.playTime);
      }
      
      // Checkpoint achievements
      if (id.startsWith('checkpoints_')) {
        const tier = parseInt(id.replace('checkpoints_', ''));
        if (tier === 1 && currentStats.checkpointsMilestones >= 1) unlockAchievement(id);
        else if (a.maxProgress) updateAchievementProgress(id, currentStats.checkpointsMilestones);
      }
      
      // Prestige upgrade purchase achievements
      if (id.startsWith('prestige_upgrades_')) {
        const tier = parseInt(id.replace('prestige_upgrades_', ''));
        if (tier === 1 && currentStats.totalPrestigeUpgradesPurchased >= 1) unlockAchievement(id);
        else if (a.maxProgress) updateAchievementProgress(id, currentStats.totalPrestigeUpgradesPurchased);
      }
      
      // Cosmetics purchase achievements
      if (id.startsWith('cosmetics_')) {
        const tier = parseInt(id.replace('cosmetics_', ''));
        if (tier === 1 && currentStats.totalCosmeticsOwned >= 1) unlockAchievement(id);
        else if (a.maxProgress) updateAchievementProgress(id, currentStats.totalCosmeticsOwned);
      }
    });
  }, [achievements, unlockAchievement, updateAchievementProgress, resources]);

  const resolveTimeWarpMiniGame = useCallback((stateOverride?: TimeWarpMiniGameState | null) => {
    const activeState = stateOverride ?? activeTimeWarpMiniGameRef.current;
    if (!activeState) return;

    activeTimeWarpMiniGameRef.current = null;
    setActiveTimeWarpMiniGame(null);

    const bonusSeconds = Math.max(0, Math.floor(activeState.projectedSeconds));
    const timeWarpDataBonus = Math.floor(resources.data.perSecond * bonusSeconds);
    const timeWarpCreditsBonus = Math.floor(resources.credits.perSecond * bonusSeconds);
    const timeWarpCryptoBonus = Math.floor(resources.crypto.perSecond * bonusSeconds);

    if (timeWarpDataBonus > 0 || timeWarpCreditsBonus > 0 || timeWarpCryptoBonus > 0) {
      setResources(prev => ({
        ...prev,
        data: { ...prev.data, amount: prev.data.amount + timeWarpDataBonus },
        credits: { ...prev.credits, amount: prev.credits.amount + timeWarpCreditsBonus },
        crypto: { ...prev.crypto, amount: prev.crypto.amount + timeWarpCryptoBonus },
      }));
    }

    setStats(s => {
      const updated = {
        ...s,
        totalDataCollected: s.totalDataCollected + Math.max(0, timeWarpDataBonus),
        totalCreditsEarned: s.totalCreditsEarned + Math.max(0, timeWarpCreditsBonus),
        totalCryptoMined: s.totalCryptoMined + Math.max(0, timeWarpCryptoBonus),
      };
      checkAchievements(updated, resources.data.perSecond);
      return updated;
    });

    const summary = [
      timeWarpDataBonus > 0 ? `+${formatNumber(timeWarpDataBonus)} ${l('DATA', 'VERİ', 'DADOS')}` : null,
      timeWarpCreditsBonus > 0 ? `+${formatNumber(timeWarpCreditsBonus)} ${l('NODES', 'DİZİN', 'NODES', 'NODOS', 'УЗЛЫ')}` : null,
      timeWarpCryptoBonus > 0 ? `+${formatNumber(timeWarpCryptoBonus)} ${l('CRYPTO', 'KRİPTO', 'CRIPTO')}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    setTimeWarpFeedback({
      id: `timewarp-feedback-${Date.now()}-${Math.random()}`,
      resolvedAt: Date.now(),
      bonusSeconds,
      clicks: activeState.clicks,
      dataBonus: timeWarpDataBonus,
      creditsBonus: timeWarpCreditsBonus,
      cryptoBonus: timeWarpCryptoBonus,
    });

    playSound('timewarp_close');

    if (bonusSeconds > 0) {
      setLastUpgradeInfo({
        name: l('TIME WARP', 'ZAMAN YARIĞI', 'DISTORÇÃO TEMPORAL'),
        effect: l(
          `${summary || 'Burst complete'} (${(bonusSeconds / 60).toFixed(1)}m from ${activeState.clicks} clicks)`,
          `${summary || 'Patlama tamamlandı'} (${activeState.clicks} tıklamadan ${(bonusSeconds / 60).toFixed(1)}d)`,
          `${summary || 'Explosao concluida'} (${(bonusSeconds / 60).toFixed(1)}m a partir de ${activeState.clicks} cliques)`,
        ),
      });
    } else {
      setLastUpgradeInfo({
        name: l('TIME WARP', 'ZAMAN YARIĞI', 'DISTORÇÃO TEMPORAL'),
        effect: l(
          'Anomaly collapsed with no stored charge.',
          'Anomali depolanan yük olmadan çöktü.',
          'A anomalia colapsou sem carga armazenada.',
        ),
      });
    }
  }, [
    language,
    resources.data.perSecond,
    resources.credits.perSecond,
    resources.crypto.perSecond,
    checkAchievements,
    playSound,
  ]);

  const clearTimeWarpFeedback = useCallback(() => {
    setTimeWarpFeedback(null);
  }, []);

  const startTimeWarpMiniGame = useCallback((maxSeconds?: number, options?: { replaceActive?: boolean }) => {
    const replaceActive = !!options?.replaceActive;
    if (activeTimeWarpMiniGameRef.current && !replaceActive) return false;

    const now = Date.now();
    const fallbackSeconds = 10 * 60;
    const boostedMaxSeconds = Math.floor(
      Math.max(
        30,
        Math.floor(
          maxSeconds ??
            (activePickupBoosts.timeWarpSeconds > 0
              ? activePickupBoosts.timeWarpSeconds
              : fallbackSeconds)
        )
      ) * activeParagonBonuses.timeWarpPowerMultiplier
    );
    const resolvedMaxSeconds = Math.max(
      30,
      boostedMaxSeconds
    );
    const rewardVarianceMultiplier = rollTimeWarpRewardVarianceMultiplier();

    const minigameState: TimeWarpMiniGameState = {
      id: `timewarp-${now}-${Math.random()}`,
      startedAt: now,
      endsAt: now + TIME_WARP_MINIGAME_DURATION_MS,
      durationMs: TIME_WARP_MINIGAME_DURATION_MS,
      clicks: 0,
      effectiveClicks: 0,
      maxSeconds: resolvedMaxSeconds,
      projectedSeconds: 0,
      rewardVarianceMultiplier,
      lastClickAt: now - TIME_WARP_MINIGAME_CADENCE_WINDOW_MS,
    };

    activeTimeWarpMiniGameRef.current = minigameState;
    setActiveTimeWarpMiniGame(minigameState);
    timeWarpCooldownUntilRef.current = now + getRandomizedTimeWarpCooldownMs(activePickupBoosts.timeWarpCooldownMs);
    timeWarpPityThresholdRef.current = rollTimeWarpPityThreshold();
    playSound('timewarp_open');
    return true;
  }, [activePickupBoosts.timeWarpCooldownMs, activePickupBoosts.timeWarpSeconds, playSound, activeParagonBonuses.timeWarpPowerMultiplier]);

  const onTimeWarpMiniGameClick = useCallback(() => {
    if (!activeTimeWarpMiniGameRef.current) return;

    playSound('click');
    setActiveTimeWarpMiniGame(prev => {
      if (!prev) return prev;

      const now = Date.now();
      const deltaMs = Math.max(1, now - prev.lastClickAt);
      const cadenceRatio = 1 - Math.exp(-deltaMs / TIME_WARP_MINIGAME_CADENCE_WINDOW_MS);
      const cadenceWeight = TIME_WARP_MINIGAME_CADENCE_BASE + (1 - TIME_WARP_MINIGAME_CADENCE_BASE) * cadenceRatio;
      const nextEffectiveClicks = prev.effectiveClicks + cadenceWeight;
      const projectedSeconds = getTimeWarpProjectedSeconds(
        prev.maxSeconds,
        nextEffectiveClicks,
        prev.rewardVarianceMultiplier
      );

      const nextState: TimeWarpMiniGameState = {
        ...prev,
        clicks: prev.clicks + 1,
        effectiveClicks: nextEffectiveClicks,
        projectedSeconds,
        lastClickAt: now,
      };
      activeTimeWarpMiniGameRef.current = nextState;
      return nextState;
    });
  }, [playSound, queueAchievementToastClear]);

  useEffect(() => {
    if (!activeTimeWarpMiniGame) return;

    const remainingMs = activeTimeWarpMiniGame.endsAt - Date.now();
    if (remainingMs <= 0) {
      resolveTimeWarpMiniGame(activeTimeWarpMiniGame);
      return;
    }

    const timeout = setTimeout(() => {
      resolveTimeWarpMiniGame();
    }, remainingMs + 10);

    return () => clearTimeout(timeout);
  }, [activeTimeWarpMiniGame, resolveTimeWarpMiniGame]);

  // Game Loop
  // v1.04 CPU: production rates only change when upgrades/boosts change, so compute them once per change
  // instead of on every tick. The loop runs at 4 Hz (was 10 Hz): every resources update re-renders the
  // whole game screen, and production is time-based (delta), so the totals are identical.
  const productionMultipliers = useMemo(() => computeProductionMultipliers({
    cryptoChallengeMultiplier: challenges.active === 'half_crypto' ? 0.5 : 1,
    prestigeUpgrades,
    cosmeticBoosts: activeCosmeticBoosts,
    paragonProductionMultiplier: activeParagonBonuses.productionMultiplier,
    paragonCryptoMultiplier: activeParagonBonuses.cryptoMultiplier,
    adjacencyProductionBoost: activeAdjacencyProductionBoost,
    adjacencyCryptoBoost: activeAdjacencyCryptoBoost,
  }), [prestigeUpgrades, activeCosmeticBoosts, activeAdjacencyProductionBoost, activeAdjacencyCryptoBoost, activeParagonBonuses.productionMultiplier, activeParagonBonuses.cryptoMultiplier, challenges.active]);
  const productionRates = useMemo(() => computeProductionRates({
    upgrades,
    cryptoChallengeMultiplier: challenges.active === 'half_crypto' ? 0.5 : 1,
    prestigeUpgrades,
    cosmeticBoosts: activeCosmeticBoosts,
    paragonProductionMultiplier: activeParagonBonuses.productionMultiplier,
    paragonCryptoMultiplier: activeParagonBonuses.cryptoMultiplier,
    adjacencyProductionBoost: activeAdjacencyProductionBoost,
    adjacencyCryptoBoost: activeAdjacencyCryptoBoost,
  }), [upgrades, prestigeUpgrades, activeCosmeticBoosts, activeAdjacencyProductionBoost, activeAdjacencyCryptoBoost, activeParagonBonuses.productionMultiplier, activeParagonBonuses.cryptoMultiplier, challenges.active]);

  useEffect(() => {
    const rates = productionRates;
    const interval = setInterval(() => {
      const now = Date.now();
      const delta = (now - lastTick.current) / 1000;
      lastTick.current = now;

      const dataProducedThisTick = rates.data * delta;
      const creditsProducedThisTick = rates.credits * delta;
      const cryptoProducedThisTick = rates.crypto * delta;

      // Immutable update: the old code mutated prev's nested objects, which breaks memo checks and
      // double-counts production if React replays the updater.
      setResources(prev => {
        const next = { ...prev };
        (Object.keys(next) as ResourceType[]).forEach(key => {
          next[key] = { ...prev[key], perSecond: 0 };
        });
        (['data', 'credits', 'crypto'] as const).forEach(resource => {
          next[resource].amount += rates[resource] * delta;
          next[resource].perSecond = rates[resource];
        });

        // 'interest' stays in the resource map only so older saves keep loading; it has no gameplay.
        next.interest.amount = 0;
        next.interest.perSecond = 0;

        (Object.keys(next) as ResourceType[]).forEach(key => {
          if (next[key].amount < 0) next[key].amount = 0; 
        });

        return next;
      });

      // Update stats with production data, credits and crypto
      if (dataProducedThisTick > 0 || creditsProducedThisTick > 0 || cryptoProducedThisTick > 0) {
        setStats(s => ({
          ...s,
          totalDataCollected: s.totalDataCollected + dataProducedThisTick,
          totalCreditsEarned: s.totalCreditsEarned + creditsProducedThisTick,
          totalCryptoMined: s.totalCryptoMined + cryptoProducedThisTick,
        }));
      }
    }, GAME_TICK_MS);

    return () => clearInterval(interval);
  }, [productionRates]);

  // Handle resource changes and play sounds for ascend availability
  const prevCanAscend = useRef(false);
  useEffect(() => {
    const requiredCrypto = getAscensionCost(stats.totalAscensions);
    const canAscend = resources.crypto.amount >= requiredCrypto;
    if (canAscend && !prevCanAscend.current) {
      playSound('ascend_available');
    }
    prevCanAscend.current = canAscend;
  }, [resources.crypto.amount, playSound, stats.totalAscensions]);

  const getCurrentDataPerClick = useCallback((): number => {
    let baseClick = 1;
    let multiplier = 1;

    upgrades.forEach(u => {
      if (u.count > 0) {
        if (u.effect.type === 'click') baseClick += getEffectiveValue(u);
        if (u.effect.type === 'click_multiplier') multiplier += getEffectiveValue(u);
      }
    });

    prestigeUpgrades.forEach(p => {
      if (p.count > 0 && p.effect.type === 'click_boost') {
        baseClick *= (1 + p.effect.value * p.count);
      }
    });

    baseClick *= (1 + activeCosmeticBoosts.clickBoost / 100);
    baseClick *= activeParagonBonuses.clickMultiplier;
    if (activeAdjacencyClickBoost > 0) {
      baseClick *= (1 + activeAdjacencyClickBoost);
    }
    return baseClick * multiplier;
  }, [upgrades, prestigeUpgrades, activeCosmeticBoosts.clickBoost, activeAdjacencyClickBoost, activeParagonBonuses.clickMultiplier]);
  const currentDataPerClick = useMemo(() => getCurrentDataPerClick(), [getCurrentDataPerClick]);

  const clickTuning = useMemo(() => {
    let baseClick = 1;
    let multiplier = 1;
    let critChance = 0.05;
    let critMult = stats.totalAscensions > 0 ? 1.5 : 0;
    let dropChance = 0.3;

    upgrades.forEach(u => {
      if (u.count <= 0) return;
      if (u.effect.type === 'click') baseClick += getEffectiveValue(u);
      if (u.effect.type === 'click_multiplier') multiplier += getEffectiveValue(u);
      if (u.effect.type === 'crit_chance') critChance += getEffectiveValue(u);
      if (u.effect.type === 'crit_multiplier') critMult += getEffectiveValue(u);
    });

    prestigeUpgrades.forEach(p => {
      if (p.count <= 0) return;
      if (p.effect.type === 'click_boost') {
        baseClick *= (1 + p.effect.value * p.count);
      }
      if (p.effect.type === 'crit_chance_boost') {
        critChance += p.effect.value * p.count;
      }
      if (p.effect.type === 'crit_mult_boost') {
        critMult *= (1 + p.effect.value * p.count);
      }
      if (p.effect.type === 'luck_boost') {
        dropChance += p.effect.value * p.count;
      }
    });

    baseClick *= (1 + activeCosmeticBoosts.clickBoost / 100);
    // Paragon "Persistent Momentum": previously only applied to the displayed value, not to real clicks.
    baseClick *= activeParagonBonuses.clickMultiplier;
    if (activeAdjacencyClickBoost > 0) {
      baseClick *= (1 + activeAdjacencyClickBoost);
    }

    critChance += activeCosmeticBoosts.critBoost / 100;
    critChance += activeParagonBonuses.critChanceBonus;
    critMult *= 1 + activeCosmeticBoosts.critDamageBoost / 100;

    if (activeAdjacencyLuckBoostPercent > 0) {
      dropChance += activeAdjacencyLuckBoostPercent / 100;
    }

    return {
      baseClick,
      multiplier,
      critChance,
      critMult,
      dropChance,
    };
  }, [
    upgrades,
    prestigeUpgrades,
    activeCosmeticBoosts.clickBoost,
    activeCosmeticBoosts.critBoost,
    activeCosmeticBoosts.critDamageBoost,
    activeAdjacencyClickBoost,
    activeAdjacencyLuckBoostPercent,
    activeParagonBonuses.critChanceBonus,
    activeParagonBonuses.clickMultiplier,
    stats.totalAscensions,
  ]);

  const getScaledNodeFloaterValue = useCallback((baseValue: number, source: 'auto' | 'click' | 'debug' = 'auto'): number => {
    return getScaledNodeFloaterValueFromSnapshot(baseValue, {
      dataAmount: resources.data.amount,
      creditsAmount: resources.credits.amount,
      totalDataCollected: stats.totalDataCollected,
      totalUpgradesPurchased: stats.totalUpgradesPurchased,
    }, source);
  }, [
    resources.credits.amount,
    resources.data.amount,
    stats.totalDataCollected,
    stats.totalUpgradesPurchased,
  ]);

  useEffect(() => {
    autoPickupSnapshotRef.current = {
      dataPerSecond: resources.data.perSecond,
      dataAmount: resources.data.amount,
      creditsAmount: resources.credits.amount,
      totalDataCollected: stats.totalDataCollected,
      totalUpgradesPurchased: stats.totalUpgradesPurchased,
      totalAscensions: stats.totalAscensions,
      dataPerClick: currentDataPerClick,
      visiblePickupCount: floatingPickups.length,
    };
  }, [
    resources.data.perSecond,
    resources.credits.perSecond,
    resources.data.amount,
    resources.credits.amount,
    stats.totalDataCollected,
    stats.totalUpgradesPurchased,
    stats.totalAscensions,
    currentDataPerClick,
    floatingPickups.length,
  ]);

  const extendAutoClickBoost = useCallback((baseDurationMs: number): number => {
    const now = Date.now();
    if (now >= autoClickBoostEndTimeRef.current) {
      autoClickPickupStackRef.current = 0;
    }

    const addMs = getDiminishingPickupDurationMs(baseDurationMs, autoClickPickupStackRef.current);
    autoClickPickupStackRef.current += 1;
    const nextEndTime = Math.max(now, autoClickBoostEndTimeRef.current) + addMs;
    autoClickBoostEndTimeRef.current = nextEndTime;
    setAutoClickBoostEndTime(nextEndTime);
    return addMs;
  }, []);

  const extendCritBoost = useCallback((baseDurationMs: number): number => {
    const now = Date.now();
    if (now >= critBoostEndTimeRef.current) {
      critPickupStackRef.current = 0;
    }

    const addMs = getDiminishingPickupDurationMs(baseDurationMs, critPickupStackRef.current);
    critPickupStackRef.current += 1;
    const nextEndTime = Math.max(now, critBoostEndTimeRef.current) + addMs;
    critBoostEndTimeRef.current = nextEndTime;
    setCritBoostEndTime(nextEndTime);
    return addMs;
  }, []);

  const finalizeActiveComboChainSession = useCallback((immediateDataCollected = 0) => {
    const session = activeComboChainSessionRef.current;
    if (!session || session.pendingPickupIds.size > 0) return;

    const comboDurationMs = Math.max(0, Date.now() - session.startedAt);
    const totalDataCollectedDuringCombo = Math.max(
      0,
      statsRef.current.totalDataCollected + immediateDataCollected - session.dataCollectedAtStart
    );
    const floaterCount = Math.max(0, session.collectedPickupCount);
    activeComboChainSessionRef.current = null;

    if (floaterCount <= 0 || totalDataCollectedDuringCombo <= 0) {
      setLastUpgradeInfo({
        name: l('COMBO COMPLETE', 'KOMBO TAMAMLANDI', 'COMBO CONCLUIDO'),
        effect: l(
          `${floaterCount} pickups chained in ${(comboDurationMs / 1000).toFixed(1)}s.`,
          `${(comboDurationMs / 1000).toFixed(1)}sn içinde ${floaterCount} floater zincirlendi.`,
          `${floaterCount} coletas encadeadas em ${(comboDurationMs / 1000).toFixed(1)}s.`,
        ),
      });
      return;
    }

    const comboReward = Math.max(
      1,
      Math.floor(totalDataCollectedDuringCombo * floaterCount * COMBO_CHAIN_FINAL_REWARD_MULTIPLIER)
    );

    setResources(prev => ({
      ...prev,
      data: { ...prev.data, amount: prev.data.amount + comboReward },
    }));

    setStats(prev => {
      const updated = {
        ...prev,
        totalDataCollected: prev.totalDataCollected + comboReward,
      };
      checkAchievements(updated, resources.data.perSecond);
      return updated;
    });

    setLastUpgradeInfo({
      name: l('COMBO PAYOUT', 'KOMBO ÖDÜLÜ', 'PAGAMENTO DE COMBO'),
      effect: l(
        `+${formatNumber(comboReward)} DATA from ${formatNumber(totalDataCollectedDuringCombo)} x ${floaterCount} pickups.`,
        `+${formatNumber(comboReward)} VERİ (${formatNumber(totalDataCollectedDuringCombo)} x ${floaterCount} floater).`,
        `+${formatNumber(comboReward)} DADOS (${formatNumber(totalDataCollectedDuringCombo)} x ${floaterCount} coletas).`,
      ),
    });
    playSound('checkpoint');
  }, [checkAchievements, resources.data.perSecond, playSound, language]);

  const ensureActiveComboChainSession = useCallback((pickupIds: string[]) => {
    if (pickupIds.length === 0) return;

    const activeSession = activeComboChainSessionRef.current;
    if (!activeSession) {
      activeComboChainSessionRef.current = {
        startedAt: Date.now(),
        dataCollectedAtStart: statsRef.current.totalDataCollected,
        collectedPickupCount: 0,
        pendingPickupIds: new Set(pickupIds),
      };
      return;
    }

    pickupIds.forEach(id => activeSession.pendingPickupIds.add(id));
  }, []);

  const settleActiveComboChainPickupCollect = useCallback((pickup: FloatingPickupItem, immediateDataCollected = 0) => {
    const activeSession = activeComboChainSessionRef.current;
    if (!activeSession) return;

    activeSession.collectedPickupCount += 1;
    if (pickup.comboChain) {
      activeSession.pendingPickupIds.delete(pickup.id);
    }

    finalizeActiveComboChainSession(immediateDataCollected);
  }, [finalizeActiveComboChainSession]);

  const settleActiveComboChainPickupMiss = useCallback((pickupId: string) => {
    const activeSession = activeComboChainSessionRef.current;
    if (!activeSession) return;
    if (!activeSession.pendingPickupIds.delete(pickupId)) return;

    finalizeActiveComboChainSession();
  }, [finalizeActiveComboChainSession]);

  const removeFloatingPickup = useCallback((pickupId: string) => {
    clearFloatingPickupRemovalTimeout(pickupId);
    setFloatingPickups(prev => prev.filter(p => p.id !== pickupId));
    settleActiveComboChainPickupMiss(pickupId);
  }, [clearFloatingPickupRemovalTimeout, settleActiveComboChainPickupMiss]);

  const spawnComboChainPickups = useCallback(() => {
    comboAutoclickSpawnLockedRef.current = false;
    comboCritSpawnLockedRef.current = false;

    const totalSpawns =
      COMBO_CHAIN_MIN_SPAWNS +
      Math.floor(Math.random() * (COMBO_CHAIN_MAX_SPAWNS - COMBO_CHAIN_MIN_SPAWNS + 1));
    const width = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const height = typeof window !== 'undefined' ? window.innerHeight : 1080;
    const spawnAreaLeft = width * 0.32;
    const spawnAreaRight = width * 0.68;
    const spawnAreaTop = height * 0.24;
    const spawnAreaBottom = height * 0.78;

    const pickupIds = Array.from({ length: totalSpawns }, (_, index) => `combo-chain-${Date.now()}-${index}-${Math.random()}`);
    ensureActiveComboChainSession(pickupIds);

    for (let index = 0; index < totalSpawns; index++) {
      const id = pickupIds[index];
      const spawnTimeout = setTimeout(() => {
        const weightedTypes: Array<'data' | 'credits' | 'autoclick' | 'crit' | 'combo'> = [
          'data', 'data', 'data', 'data',
          'credits', 'credits', 'credits',
        ];
        // Rare chain-extension pickup for active play loops.
        weightedTypes.push('combo');
        if (!comboAutoclickSpawnLockedRef.current) {
          weightedTypes.push('autoclick', 'autoclick');
        }
        if (!comboCritSpawnLockedRef.current) {
          weightedTypes.push('crit', 'crit');
        }
        const type = weightedTypes[Math.floor(Math.random() * weightedTypes.length)];
        const value =
          type === 'data'
            ? Math.max(
                8,
                Math.floor(resources.data.perSecond * 0.3 + getCurrentDataPerClick() * (1.35 + Math.random() * 0.9))
              )
            : type === 'credits'
              ? getScaledNodeFloaterValue(
                  2 + Math.floor(resources.credits.perSecond * (0.16 + Math.random() * 0.14)),
                  'auto'
                )
              : type === 'autoclick'
                ? Math.max(1, Math.floor(AUTOCLICK_PICKUP_BASE_DURATION_MS / 1000))
                : 0;
        const x = spawnAreaLeft + Math.random() * Math.max(10, spawnAreaRight - spawnAreaLeft);
        const y = spawnAreaTop + Math.random() * Math.max(10, spawnAreaBottom - spawnAreaTop);
        const expiresAt = Date.now() + COMBO_CHAIN_PICKUP_LIFETIME_MS;
        const speedMultiplier = getFloatingPickupSpeedMultiplier(stats.totalAscensions);

        setFloatingPickups(prev => {
          const updated = [
            ...prev,
            { id, x, y, type, value, speedMultiplier, comboChain: true, lifetimeMs: COMBO_CHAIN_PICKUP_LIFETIME_MS, expiresAt },
          ];
          return updated.slice(-MAX_FLOATING_PICKUPS);
        });

        const removalTimeout = setTimeout(() => {
          removeFloatingPickup(id);
        }, COMBO_CHAIN_PICKUP_LIFETIME_MS);
        comboSpawnTimeoutsRef.current.push(removalTimeout);
      }, index * COMBO_CHAIN_STEP_MS);

      comboSpawnTimeoutsRef.current.push(spawnTimeout);
    }
  }, [
    ensureActiveComboChainSession,
    resources.data.perSecond,
    resources.credits.perSecond,
    stats.totalAscensions,
    getCurrentDataPerClick,
    getScaledNodeFloaterValue,
    removeFloatingPickup,
  ]);

  // Auto-spawn floating pickups on a persistent timer. The timer reads fresh
  // values from refs so normal 100 ms resource ticks do not keep resetting it.
  useEffect(() => {
    if (pickupSpawningPaused) return;

    const scheduleNextPickup = () => {
      const snapshot = autoPickupSnapshotRef.current;
      const targetPickupCount = getAutoPickupTargetCount(
        snapshot.totalUpgradesPurchased,
        snapshot.totalAscensions
      );
      const densityDelayMultiplier = getAutoPickupDensityDelayMultiplier(
        snapshot.visiblePickupCount,
        targetPickupCount
      );
      const veteranDelayMultiplier = getVeteranAutoPickupDelayMultiplier(snapshot.totalAscensions);
      const effectiveDelayMultiplier = Math.max(
        AUTO_PICKUP_DYNAMIC_MIN_DELAY_MULTIPLIER,
        activePickupBoosts.spawnDelayMultiplier * upgradePaceDelayMultiplier * densityDelayMultiplier * veteranDelayMultiplier
      );
      const minDelay = AUTO_PICKUP_MIN_DELAY_MS * effectiveDelayMultiplier;
      const maxDelay = AUTO_PICKUP_MAX_DELAY_MS * effectiveDelayMultiplier;
      const delay = minDelay + Math.random() * (maxDelay - minDelay);
      return setTimeout(() => {
        const currentSnapshot = autoPickupSnapshotRef.current;

        // Random position in the visible area (avoiding edges)
        const x = 100 + Math.random() * (window.innerWidth - 200);
        const y = 100 + Math.random() * (window.innerHeight - 200);
        
        // Random type with weighted distribution:
        // autoclick 18%, data 30%, credits 32%, crit 13%, combo 7%.
        const rand = Math.random();
        const pickupType: 'data' | 'credits' | 'crit' | 'autoclick' | 'combo' =
          rand < 0.18 ? 'autoclick' :
          rand < 0.48 ? 'data' :
          rand < 0.80 ? 'credits' :
          (rand < 0.93 ? 'crit' : 'combo');
        
        // Data pickup scales from both passive production and active click power.
        // This keeps data pickups useful for click-focused builds.
        let value = 0;
        if (pickupType === 'data') {
          const productionComponent = currentSnapshot.dataPerSecond * 0.5;
          const clickComponent = currentSnapshot.dataPerClick * 6;
          value = Math.max(10, Math.floor(productionComponent + clickComponent));
        } else if (pickupType === 'credits') {
          const baseCredits =
            5 +
            Math.floor(currentSnapshot.totalUpgradesPurchased / 20);
          value = getScaledNodeFloaterValueFromSnapshot(baseCredits, currentSnapshot, 'auto');
        } else if (pickupType === 'autoclick') {
          value = Math.max(1, Math.floor(AUTOCLICK_PICKUP_BASE_DURATION_MS / 1000));
        } else if (pickupType === 'combo') {
          value = 0;
        }
        
        const id = `auto-${Date.now()}-${Math.random()}`;
        const speedMultiplier = getFloatingPickupSpeedMultiplier(currentSnapshot.totalAscensions);
        setFloatingPickups(prev => {
          const updated = [...prev, { id, x, y, type: pickupType, value, speedMultiplier }];
          const overflow = updated.length - MAX_FLOATING_PICKUPS;
          if (overflow > 0) {
            updated.slice(0, overflow).forEach(pickup => clearFloatingPickupRemovalTimeout(pickup.id));
          }
          return updated.slice(-MAX_FLOATING_PICKUPS);
        });
        
        // Auto-remove after lifetime if not clicked
        scheduleFloatingPickupRemoval(id, FLOATING_PICKUP_LIFETIME_MS);
        
        // Schedule next pickup
        timeoutRef.current = scheduleNextPickup();
      }, delay);
    };
    
    const timeoutRef = { current: scheduleNextPickup() };
    
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [pickupSpawningPaused, activePickupBoosts.spawnDelayMultiplier, upgradePaceDelayMultiplier, scheduleFloatingPickupRemoval, clearFloatingPickupRemovalTimeout]);

  useEffect(() => {
    if (!pickupSpawningPaused) return;
    clearAllFloatingPickupRemovalTimeouts();
    setFloatingPickups([]);
    activeComboChainSessionRef.current = null;
  }, [pickupSpawningPaused, clearAllFloatingPickupRemovalTimeouts]);

  // Update contract progress based on player actions (defined early to be used by other callbacks)
  const updateContractProgress = useCallback((type: ContractObjectiveType, amount: number) => {
    setContracts(prev => ({
      ...prev,
      activeContracts: prev.activeContracts.map(contract => {
        if (contract.status !== 'active' || contract.objectiveType !== type) return contract;
        
        let newProgress = contract.currentProgress;
        
        // Different progress semantics for different objective types
        if (type === 'reach_production' || type === 'maintain_resources') {
          // Threshold-based: check if current value meets or exceeds target
          newProgress = amount; // Set to current value, not accumulate
        } else {
          // Accumulating objectives: add to current progress
          newProgress = contract.currentProgress + amount;
        }
        
        const isCompleted = newProgress >= contract.targetAmount;
        
        return {
          ...contract,
          currentProgress: Math.min(newProgress, contract.targetAmount),
          status: isCompleted ? 'completed' : 'active',
        };
      }),
    }));
  }, []);

  const flushQueuedContractProgress = useCallback(() => {
    queuedContractFlushTimeoutRef.current = null;
    const queuedEntries = Object.entries(queuedContractProgressRef.current) as Array<[ContractObjectiveType, number]>;
    if (queuedEntries.length === 0) return;

    queuedContractProgressRef.current = {};
    setContracts(prev => ({
      ...prev,
      activeContracts: prev.activeContracts.map(contract => {
        if (contract.status !== 'active') return contract;
        const queuedAmount = queuedEntries.find(([type]) => type === contract.objectiveType)?.[1];
        if (!queuedAmount) return contract;

        const newProgress = contract.currentProgress + queuedAmount;
        const isCompleted = newProgress >= contract.targetAmount;

        return {
          ...contract,
          currentProgress: Math.min(newProgress, contract.targetAmount),
          status: isCompleted ? 'completed' : 'active',
        };
      }),
    }));
  }, []);

  const queueContractProgress = useCallback((type: ContractObjectiveType, amount: number) => {
    if (amount <= 0) return;
    queuedContractProgressRef.current[type] = (queuedContractProgressRef.current[type] ?? 0) + amount;

    if (queuedContractFlushTimeoutRef.current !== null) return;
    queuedContractFlushTimeoutRef.current = setTimeout(() => {
      flushQueuedContractProgress();
    }, 50);
  }, [flushQueuedContractProgress]);

  useEffect(() => {
    return () => {
      if (queuedContractFlushTimeoutRef.current !== null) {
        clearTimeout(queuedContractFlushTimeoutRef.current);
      }
      flushQueuedContractProgress();
    };
  }, [flushQueuedContractProgress]);

  // Check threshold-based contracts whenever resources change (not on interval)
  useEffect(() => {
    // Update immediately when production changes
    updateContractProgress('reach_production', resources.data.perSecond);
  }, [resources.data.perSecond, updateContractProgress]);

  useEffect(() => {
    // Update immediately when data amount changes
    updateContractProgress('maintain_resources', resources.data.amount);
  }, [resources.data.amount, updateContractProgress]);

  const getClickOutcome = useCallback((now: number) => {
    let effectiveCritChance = Math.max(0, clickTuning.critChance);
    let effectiveCritMult = clickTuning.critMult;

    if (critBoostEndTime > now) {
      effectiveCritChance = Math.max(effectiveCritChance, 1);
      effectiveCritMult = Math.max(effectiveCritMult, 1.5);
    }

    const critOverflow = cosmetics.blackMarketClickOverflowPurchased
      ? Math.max(0, effectiveCritChance - 1)
      : 0;
    const finalCritChance = Math.min(1, effectiveCritChance);
    const adjustedCritMult = effectiveCritMult * (1 + critOverflow);
    const isCrit = (adjustedCritMult > 0) && (Math.random() < finalCritChance);
    const finalValue = clickTuning.baseClick * clickTuning.multiplier * (isCrit ? adjustedCritMult : 1);

    return { value: finalValue, isCrit };
  }, [clickTuning, cosmetics.blackMarketClickOverflowPurchased, critBoostEndTime]);

  const clickResource = useCallback((type: ResourceType, x?: number, y?: number, options?: { timestamp?: number; source?: 'manual' | 'autoclick' }) => {
    const now = options?.timestamp ?? Date.now();
    const source = options?.source ?? 'manual';
    const effectiveCooldownMs = source === 'autoclick' ? 50 : CLICK_COOLDOWN_MS;
    const lastClickTimeRef = source === 'autoclick' ? lastAutoClickTimeRef : lastManualClickTimeRef;

    if (now - lastClickTimeRef.current < effectiveCooldownMs) {
      return { value: 0, isCrit: false };
    }
    // Hands Off challenge: clicks earn nothing.
    if (challengesRef.current.active === 'no_clicks') return { value: 0, isCrit: false };
    lastClickTimeRef.current = now;

    const { value: finalValue, isCrit } = getClickOutcome(now);

    if (source === 'manual') noteManualClickForSound(now);
    playSound(isCrit ? 'crit' : 'click');

    setResources(prev => {
      const res = prev[type];
      return {
        ...prev,
        [type]: { ...res, amount: res.amount + finalValue }
      };
    });

    setStats(prev => {
      const updated = {
        ...prev,
        totalClicks: prev.totalClicks + 1,
        totalCrits: prev.totalCrits + (isCrit ? 1 : 0),
        totalDataCollected: type === 'data' ? prev.totalDataCollected + finalValue : prev.totalDataCollected,
      };
      if (Math.floor(updated.totalClicks / 10) > Math.floor(prev.totalClicks / 10)) {
        checkAchievements(updated, resources.data.perSecond);
      }
      return updated;
    });

    queueContractProgress('rapid_clicks', 1);
    if (isCrit) {
      queueContractProgress('crit_streak', 1);
    }

    if (Math.random() < clickTuning.dropChance && x !== undefined && y !== undefined) {
      const pickupType: 'data' | 'credits' | 'crit' = Math.random() < 0.7 ? 'data' : (Math.random() < 0.5 ? 'credits' : 'crit');
      const pickupValue =
        pickupType === 'crit'
          ? 0
          : pickupType === 'credits'
            ? getScaledNodeFloaterValue(Math.floor(finalValue * 0.1), 'click')
            : Math.floor(finalValue * 0.1);
      const id = `${Date.now()}-${Math.random()}`;
      const speedMultiplier = getFloatingPickupSpeedMultiplier(stats.totalAscensions);
      setFloatingPickups(prev => {
        const updated = [...prev, { id, x: x + 30, y: y - 30, type: pickupType, value: pickupValue, speedMultiplier }];
        const overflow = updated.length - MAX_FLOATING_PICKUPS;
        if (overflow > 0) {
          updated.slice(0, overflow).forEach(pickup => clearFloatingPickupRemovalTimeout(pickup.id));
        }
        return updated.slice(-MAX_FLOATING_PICKUPS);
      });
      scheduleFloatingPickupRemoval(id, FLOATING_PICKUP_LIFETIME_MS);
    }

    return { value: finalValue, isCrit };
  }, [checkAchievements, clickTuning.dropChance, getClickOutcome, getScaledNodeFloaterValue, noteManualClickForSound, playSound, queueContractProgress, resources.data.perSecond, scheduleFloatingPickupRemoval, clearFloatingPickupRemovalTimeout, stats.totalAscensions]);

  const clickResourceBurst = useCallback((type: ResourceType, count: number, options?: { timestamp?: number; source?: 'manual' | 'autoclick'; intervalMs?: number }) => {
    if (count <= 0) {
      return { processedClicks: 0, totalValue: 0, hadCrit: false, critCount: 0 };
    }
    if (challengesRef.current.active === 'no_clicks') {
      return { processedClicks: 0, totalValue: 0, hadCrit: false, critCount: 0 };
    }

    const source = options?.source ?? 'autoclick';
    const effectiveCooldownMs = source === 'autoclick' ? 50 : CLICK_COOLDOWN_MS;
    const intervalMs = Math.max(effectiveCooldownMs, options?.intervalMs ?? effectiveCooldownMs);
    const lastClickTimeRef = source === 'autoclick' ? lastAutoClickTimeRef : lastManualClickTimeRef;
    const anchorTime = options?.timestamp ?? Date.now();

    let processedClicks = 0;
    let totalValue = 0;
    let critCount = 0;

    for (let i = 0; i < count; i++) {
      const simulatedTimestamp = anchorTime - ((count - 1 - i) * intervalMs);
      if (simulatedTimestamp - lastClickTimeRef.current < effectiveCooldownMs) {
        continue;
      }

      lastClickTimeRef.current = simulatedTimestamp;
      const { value, isCrit } = getClickOutcome(simulatedTimestamp);
      processedClicks += 1;
      totalValue += value;
      critCount += isCrit ? 1 : 0;
    }

    if (processedClicks === 0) {
      return { processedClicks: 0, totalValue: 0, hadCrit: false, critCount: 0 };
    }

    playSound(critCount > 0 ? 'crit' : 'click');

    setResources(prev => {
      const res = prev[type];
      return {
        ...prev,
        [type]: { ...res, amount: res.amount + totalValue }
      };
    });

    setStats(prev => {
      const updated = {
        ...prev,
        totalClicks: prev.totalClicks + processedClicks,
        totalCrits: prev.totalCrits + critCount,
        totalDataCollected: type === 'data' ? prev.totalDataCollected + totalValue : prev.totalDataCollected,
      };
      if (Math.floor(updated.totalClicks / 10) > Math.floor(prev.totalClicks / 10)) {
        checkAchievements(updated, resources.data.perSecond);
      }
      return updated;
    });

    queueContractProgress('rapid_clicks', processedClicks);
    if (critCount > 0) {
      queueContractProgress('crit_streak', critCount);
    }

    return {
      processedClicks,
      totalValue,
      hadCrit: critCount > 0,
      critCount,
    };
  }, [checkAchievements, getClickOutcome, playSound, queueContractProgress, resources.data.perSecond]);

  const sellResource = useCallback((type: ResourceType, amount: number) => {
     // Calculate sell boost from prestige upgrades
     let sellMultiplier = 1;
     prestigeUpgrades.forEach(p => {
       if (p.count > 0 && p.effect.type === 'sell_boost') {
         sellMultiplier += p.effect.value * p.count;
       }
     });
     
     setResources(prev => {
          const needed = activeParagonBonuses.nodeConversionDataCost * amount;
          if (prev[type].amount < needed) return prev;
          playSound('sell');
          const next = { ...prev };
          next[type].amount -= needed;
         const creditsGained = Math.floor(amount * sellMultiplier);
         next.credits.amount += creditsGained;
         // Track credits earned
         setStats(s => {
           const updated = { ...s, totalCreditsEarned: s.totalCreditsEarned + creditsGained };
           checkAchievements(updated, resources.data.perSecond);
           return updated;
         });
         // Update contract progress for selling data
         updateContractProgress('sell_data', needed);
         return next;
     });
  }, [playSound, checkAchievements, resources.data.perSecond, prestigeUpgrades, activeParagonBonuses.nodeConversionDataCost]);

  const sellAllResource = useCallback((type: ResourceType) => {
    // Calculate sell boost from prestige upgrades
    let sellMultiplier = 1;
    prestigeUpgrades.forEach(p => {
      if (p.count > 0 && p.effect.type === 'sell_boost') {
        sellMultiplier += p.effect.value * p.count;
      }
    });
    
    setResources(prev => {
        const conversionCost = activeParagonBonuses.nodeConversionDataCost;
        const sellable = Math.floor(prev[type].amount / conversionCost);
        if (sellable === 0) return prev;
        playSound('sell');
        const next = { ...prev };
        next[type].amount -= sellable * conversionCost;
        const creditsGained = Math.floor(sellable * sellMultiplier);
        next.credits.amount += creditsGained;
        // Track credits earned
        setStats(s => {
          const updated = { ...s, totalCreditsEarned: s.totalCreditsEarned + creditsGained };
          checkAchievements(updated, resources.data.perSecond);
          return updated;
        });
        // Update contract progress for selling data
        updateContractProgress('sell_data', sellable * conversionCost);
        return next;
    });
  }, [playSound, checkAchievements, resources.data.perSecond, prestigeUpgrades, activeParagonBonuses.nodeConversionDataCost]);

  const buyUpgrade = useCallback((upgradeId: string, quantity: number = 1, options?: { silent?: boolean }) => {
    let totalBought = 0;
    let totalCreditsSpent = 0;
    setResources(currentResources => {
      let nextRes = { ...currentResources };
      // Use ref to get the latest upgrade state (avoids stale closure issues)
      const upgrade = upgradesRef.current.find(u => u.id === upgradeId);
      if (!upgrade) return nextRes;
      if ((upgrade.requiredAscensions ?? 0) > statsRef.current.totalAscensions) return nextRes;      // One-time unlock upgrades: can only be bought once and ignore bulk-buy quantity
      const isOneTimeUnlock = upgrade.effect?.type === 'unlock' || upgradeId === 'unlock_click_upgrades' || upgradeId === 'unlock_crypto_mining';
      if (isOneTimeUnlock && upgrade.count >= 1) {
        return nextRes;
      }

      const effectiveQuantity = isOneTimeUnlock ? 1 : quantity;
      // Calculate the current cost from baseCost and current count (not from cached upgrade.cost)
      let currentCost: Partial<Record<ResourceType, number>> = {};
      for (const [key, val] of Object.entries(upgrade.baseCost) as Array<[string, unknown]>) {
        const k = key as ResourceType;
        const v = typeof val === 'number' && Number.isFinite(val) ? val : 0;
        currentCost[k] = Math.floor(v * Math.pow(upgrade.costMultiplier, upgrade.count));
      }
      let currentCount = upgrade.count;
      let autoSoldData = 0;
      let autoSoldNodes = 0;
      const saleRate = statsRef.current.totalAscensions >= AUTO_SELL_UNLOCK_ASCENSION ? nodeSaleRateRef.current : null;
      
      for (let i = 0; i < effectiveQuantity; i++) {
        // Pay with data: sell just enough data for the missing Nodes (after the first ascension).
        const autoSell = getAutoSellPlan(currentCost, { data: nextRes.data.amount, credits: nextRes.credits.amount }, saleRate);
        if (autoSell) {
          nextRes.data = { ...nextRes.data, amount: nextRes.data.amount - autoSell.dataToSell };
          nextRes.credits = { ...nextRes.credits, amount: nextRes.credits.amount + autoSell.nodesGained };
          autoSoldData += autoSell.dataToSell;
          autoSoldNodes += autoSell.nodesGained;
        }
        let canAfford = true;
        for (const [res, amount] of Object.entries(currentCost) as Array<[string, unknown]>) {
          const r = res as ResourceType;
          const a = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
          if (nextRes[r].amount < a) {
            canAfford = false;
            break;
          }
        }
        if (!canAfford) break;
        
        if (i === 0 && !options?.silent) playSound(upgrade.category === 'crypto_mining' ? 'buy_black' : 'buy_fab');
        
        // Deduct the actual cost and track credits spent
        for (const [res, amount] of Object.entries(currentCost) as Array<[string, unknown]>) {
          const r = res as ResourceType;
          const a = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
          nextRes[r].amount -= a;
          if (r === 'credits') totalCreditsSpent += a;
        }
        totalBought++;
        currentCount++;
        
        // Update cost for the next purchase
        for (const [key, val] of Object.entries(upgrade.baseCost) as Array<[string, unknown]>) {
          const k = key as ResourceType;
          const v = typeof val === 'number' && Number.isFinite(val) ? val : 0;
          currentCost[k] = Math.floor(v * Math.pow(upgrade.costMultiplier, currentCount));
        }
      }
      
      if (totalBought > 0) {
        const now = Date.now();
        const elapsedSinceLastPurchase = now - lastUpgradePurchaseAtRef.current;
        if (elapsedSinceLastPurchase > 500) {
          const prevAvg = avgUpgradePurchaseIntervalMsRef.current;
          const nextAvg = (prevAvg * 0.8) + (elapsedSinceLastPurchase * 0.2);
          avgUpgradePurchaseIntervalMsRef.current = Math.max(2500, Math.min(5 * 60 * 1000, nextAvg));
        }
        lastUpgradePurchaseAtRef.current = now;
        const nextPaceMultiplier = getUpgradePaceSpawnDelayMultiplier(
          avgUpgradePurchaseIntervalMsRef.current,
          0
        );
        setUpgradePaceDelayMultiplier(prev =>
          Math.abs(prev - nextPaceMultiplier) < 0.01 ? prev : nextPaceMultiplier
        );

        setUpgrades(cu => cu.map(u => {
          if (u.id === upgradeId) {
            let nu = { ...u, count: u.count + totalBought };
            const oldCount = u.count;
            const newCount = u.count + totalBought;
            const interval = getCheckpointInterval(u.category);
            const oldCheckpoints = Math.floor(oldCount / interval);
            const newCheckpoints = Math.floor(newCount / interval);
            
            // Play checkpoint sound if we passed a checkpoint
            if (newCheckpoints > oldCheckpoints) {
              playSound('checkpoint');
              // Game feel: big "CHECKPOINT!" banner (JuiceBanners in Game.tsx) instead of only the small toast.
              if (!options?.silent) {
                emitJuiceBanner({
                  kind: 'checkpoint',
                  upgradeName: localizeUpgradeText(u, language).name,
                  level: newCheckpoints * interval,
                  multiplier: getCheckpointMultiplier(newCount, u.category),
                });
              }
              // Unlock checkpoint achievement
              unlockAchievement('checkpoint_hit');
              // Track checkpoint milestones
              setStats(s => {
                const updated = { ...s, checkpointsMilestones: s.checkpointsMilestones + (newCheckpoints - oldCheckpoints) };
                checkAchievements(updated, resources.data.perSecond);
                return updated;
              });
            }
            
            // Calculate final cost based on newCount using baseCost
            const nc: Partial<Record<ResourceType, number>> = {};
            for (const [key, val] of Object.entries(u.baseCost) as Array<[string, unknown]>) {
              const k = key as ResourceType;
              const v = typeof val === 'number' && Number.isFinite(val) ? val : 0;
              nc[k] = Math.floor(v * Math.pow(u.costMultiplier, newCount));
            }
            u.cost = nc;
            nu.cost = u.cost;
            setLastUpgradeInfo({
              name: localizeUpgradeText(u, language).name,
              effect: t('useGame.lastUpgrade.purchased', { count: totalBought }),
            });
            return nu;
          }
          return u;
        }));
        
        // Track upgrades purchased
        setStats(s => {
          const updated = { ...s, totalUpgradesPurchased: s.totalUpgradesPurchased + totalBought };
          checkAchievements(updated, resources.data.perSecond);
          return updated;
        });
        
        // Update contract progress - track actual credits spent and upgrades bought
        if (totalCreditsSpent > 0) {
          updateContractProgress('spend_credits', totalCreditsSpent);
        }
        updateContractProgress('upgrade_single', totalBought);
        if (autoSoldNodes > 0) {
          setStats(s => ({ ...s, totalCreditsEarned: s.totalCreditsEarned + autoSoldNodes }));
          updateContractProgress('sell_data', autoSoldData);
          if (!options?.silent) playSound('sell');
        }
      } else if (autoSoldNodes > 0) {
        // Nothing was bought (should not happen, the plan checks the data first): undo the sale.
        return currentResources;
      }
      return nextRes;
    });
  }, [playSound, unlockAchievement, checkAchievements, resources.data.perSecond, language, t]); 

  const getUpgradePreview = (upgrade: Upgrade): string => {
    // Path unlock upgrades are single-purchase unlocks
    if (upgrade.id === 'unlock_click_upgrades' || upgrade.id === 'unlock_crypto_mining') {
      if (upgrade.count >= 1) return t('useGame.preview.alreadyUnlocked');
      return t('useGame.preview.unlock', {
        category: getUpgradeCategoryLabel(String(upgrade.effect.unlocksCategory || ''), language),
      });
    }

    // Show the value gained from buying the NEXT level
    const nextLevelUpgrade = { ...upgrade, count: upgrade.count + 1 };
    const nextValue = getEffectiveValue(nextLevelUpgrade);
    
    if (upgrade.effect.type === 'production') {
      const previewResource = getResourceLabel(String(upgrade.effect.resource || ''), language);
      // v1.04: include prestige/cosmetic/Paragon multipliers, so the card shows what you really get.
      const multiplier = upgrade.effect.resource === 'crypto' ? productionMultipliers.crypto : productionMultipliers.data;
      return t('useGame.preview.production', { value: formatNumber(nextValue * multiplier), resource: previewResource });
    } else if (upgrade.effect.type === 'click') {
      return t('useGame.preview.click', { value: formatNumber(nextValue) });
    } else if (upgrade.effect.type === 'click_multiplier') {
      return t('useGame.preview.clickMultiplier', { value: (nextValue * 100).toFixed(0) });
    } else if (upgrade.effect.type === 'crit_chance') {
      return t('useGame.preview.critChance', { value: (nextValue * 100).toFixed(1) });
    } else if (upgrade.effect.type === 'crit_multiplier') {
      return t('useGame.preview.critMultiplier', { value: formatNumber(nextValue) });
    } else if (upgrade.effect.type === 'unlock') {
      return t('useGame.preview.unlock', {
        category: getUpgradeCategoryLabel(String(upgrade.effect.unlocksCategory || ''), language),
      });
    }
    return '';
  };

  const getTotalCritChance = useCallback((): number => {
    let critChance = 0.05; // Base 5%
    upgrades.forEach(u => {
      if (u.effect.type === 'crit_chance' && u.count > 0) {
        critChance += getEffectiveValue(u);
      }
    });
    // Add prestige crit chance boosts
    prestigeUpgrades.forEach(p => {
      if (p.count > 0 && p.effect.type === 'crit_chance_boost') {
        critChance += p.effect.value * p.count;
      }
    });
    // Match runtime click calculation: include all active cosmetic crit bonuses.
    critChance += activeCosmeticBoosts.critBoost / 100;
    critChance += activeParagonBonuses.critChanceBonus;
    if (critBoostEndTime > Date.now()) {
      critChance = Math.max(critChance, 1);
    }
    if (cosmetics.blackMarketClickOverflowPurchased) {
      return Math.max(0, critChance);
    }
    return Math.min(Math.max(0, critChance), 1); // Cap at 100% without overflow upgrade.
  }, [upgrades, prestigeUpgrades, critBoostEndTime, activeCosmeticBoosts.critBoost, activeParagonBonuses.critChanceBonus, cosmetics.blackMarketClickOverflowPurchased]);

  const getBulkProductionGain = useCallback((upgrade: Upgrade, quantity: number): number => {
    if (upgrade.effect.type !== 'production' || !upgrade.effect.resource) return 0;
    
    let totalProduction = 0;
    for (let i = 0; i < quantity; i++) {
      const levelAfterBuy = upgrade.count + i + 1;
      const tempUpgrade = { ...upgrade, count: levelAfterBuy };
      totalProduction += getEffectiveValue(tempUpgrade);
    }
    return totalProduction * (upgrade.effect.resource === 'crypto' ? productionMultipliers.crypto : productionMultipliers.data);
  }, [productionMultipliers]);

  const addDebugData = useCallback((amount: number = 5000000) => {
    setResources(prev => ({
      ...prev,
      data: { ...prev.data, amount: prev.data.amount + amount }
    }));
  }, []);

  const addDebugData100k = useCallback(() => {
    setResources(prev => ({
      ...prev,
      data: { ...prev.data, amount: prev.data.amount + 100000 }
    }));
  }, []);

  const addDebugCredits = useCallback((amount: number = 100000) => {
    setResources(prev => ({
      ...prev,
      credits: { ...prev.credits, amount: prev.credits.amount + amount }
    }));
  }, []);

  const addDebugCrypto = useCallback((amount: number = 100000) => {
    setResources(prev => ({
      ...prev,
      crypto: { ...prev.crypto, amount: prev.crypto.amount + amount }
    }));
  }, []);

  const addDebugPrestige = useCallback((amount: number = 1000) => {
    setResources(prev => ({
      ...prev,
      prestige: { ...prev.prestige, amount: prev.prestige.amount + amount }
    }));
  }, []);

  const addDebugAscensionCount = useCallback((amount: number = 1) => {
    setStats(prev => ({
      ...incrementDailyAscensionStats(prev, amount),
      totalAscensions: prev.totalAscensions + amount
    }));
  }, []);

  const setDebugTime = useCallback((seconds: number) => {
    setElapsedTime(seconds);
  }, []);

  const spawnDebugPickup = useCallback((type: 'data' | 'credits' | 'crit' | 'autoclick' | 'combo' = 'crit') => {
    const id = `debug-${Date.now()}-${Math.random()}`;
    const x = window.innerWidth / 2;
    const y = window.innerHeight / 2;
    // Scale value based on current production (10% of per-second rate, minimum 1)
    let value = 0;
    if (type === 'data') {
      value = Math.max(1, Math.floor(resources.data.perSecond * 0.1));
    } else if (type === 'credits') {
      value = getScaledNodeFloaterValue(Math.floor(resources.credits.perSecond * 0.1), 'debug');
    } else if (type === 'autoclick') {
      value = Math.max(1, Math.floor(AUTOCLICK_PICKUP_BASE_DURATION_MS / 1000));
    } else if (type === 'combo') {
      value = 0;
    }
    const speedMultiplier = getFloatingPickupSpeedMultiplier(stats.totalAscensions);
    setFloatingPickups(prev => {
      const updated = [...prev, { id, x, y, type, value, speedMultiplier }];
      const overflow = updated.length - MAX_FLOATING_PICKUPS;
      if (overflow > 0) {
        updated.slice(0, overflow).forEach(pickup => clearFloatingPickupRemovalTimeout(pickup.id));
      }
      return updated.slice(-MAX_FLOATING_PICKUPS);
    });
    scheduleFloatingPickupRemoval(id, FLOATING_PICKUP_LIFETIME_MS);
  }, [resources.data.perSecond, resources.credits.perSecond, stats.totalAscensions, getScaledNodeFloaterValue, scheduleFloatingPickupRemoval, clearFloatingPickupRemovalTimeout]);

  const spawnAllDebugPickups = useCallback(() => {
    spawnDebugPickup('data');
    spawnDebugPickup('credits');
    spawnDebugPickup('crit');
    spawnDebugPickup('autoclick');
    spawnDebugPickup('combo');
  }, [spawnDebugPickup]);

  const forceDebugTimeWarp = useCallback((seconds?: number) => {
    const fallbackSeconds = 10 * 60;
    const bonusSeconds = Math.max(
      30,
      Math.floor(
        seconds ??
          (activePickupBoosts.timeWarpSeconds > 0
            ? activePickupBoosts.timeWarpSeconds
            : fallbackSeconds)
      )
    );
    startTimeWarpMiniGame(bonusSeconds, { replaceActive: true });
    setLastUpgradeInfo({
      name: l('TIME WARP (DEBUG)', 'ZAMAN YARIĞI (DEBUG)', 'DISTORÇÃO TEMPORAL (DEBUG)'),
      effect: t('useGame.lastUpgrade.timeWarpDebug', { minutes: (bonusSeconds / 60).toFixed(1) }),
    });
    playSound('checkpoint');
  }, [
    activePickupBoosts.timeWarpSeconds,
    startTimeWarpMiniGame,
    playSound,
    language,
    t,
  ]);

  const getPrestigeGain = useCallback(() => {
    const cryptoAmount = resources.crypto.amount;
    const requiredCrypto = getAscensionCost(stats.totalAscensions);
    if (cryptoAmount < requiredCrypto) return 0;
    
    let prestigeGain = getPrestigeGainBreakdown(cryptoAmount, stats.totalAscensions, prestigeUpgrades).total;
    
    return prestigeGain;
  }, [resources.crypto.amount, prestigeUpgrades, stats.totalAscensions]);

  const ascend = useCallback(() => {
    const cryptoAmount = resources.crypto.amount;
    const requiredCrypto = getAscensionCost(stats.totalAscensions);
    if (cryptoAmount < requiredCrypto) return;
    
    let prestigeGain = getPrestigeGainBreakdown(cryptoAmount, stats.totalAscensions, prestigeUpgrades).total;
    
    if (prestigeGain === 0) return;

    let startingData = 0;
    prestigeUpgrades.forEach(p => {
      if (p.count > 0 && p.effect.type === 'starting_bonus') {
        // Head Start: seconds of the finished run's data production per level
        startingData += p.effect.value * p.count * Math.max(0, resources.data.perSecond);
      }
    });

    challengeAscendRef.current();
    setStats(s => {
      const updated = incrementDailyAscensionStats({
        ...s,
        totalAscensions: s.totalAscensions + 1,
        totalPrestigeEarned: s.totalPrestigeEarned + prestigeGain,
        fastestAscension: Math.min(s.fastestAscension, elapsedTime),
      });
      checkAchievements(updated, resources.data.perSecond);
      return updated;
    });

    setResources({
      credits: { amount: 0, perSecond: 0, unlocked: true },
      data: { amount: startingData, perSecond: 0, unlocked: true },
      silicon: { amount: 0, perSecond: 0, unlocked: false },
      interest: { amount: 0, perSecond: 0, unlocked: true },
      crypto: { amount: 0, perSecond: 0, unlocked: true },
      prestige: { ...resources.prestige, amount: resources.prestige.amount + prestigeGain },
    });

    setUpgrades(buildAscendedUpgrades());
    setElapsedTime(0);
    timeWarpCooldownUntilRef.current = 0;
    clearComboSpawnTimeouts();
    activeComboChainSessionRef.current = null;
    comboAutoclickSpawnLockedRef.current = false;
    comboCritSpawnLockedRef.current = false;
    activeTimeWarpMiniGameRef.current = null;
    setActiveTimeWarpMiniGame(null);
    setTimeWarpFeedback(null);
    autoClickBoostEndTimeRef.current = 0;
    critBoostEndTimeRef.current = 0;
    autoClickPickupStackRef.current = 0;
    critPickupStackRef.current = 0;
    setAutoClickBoostEndTime(0);
    setCritBoostEndTime(0);
    lastUpgradePurchaseAtRef.current = Date.now();
    avgUpgradePurchaseIntervalMsRef.current = UPGRADE_PACE_BASE_INTERVAL_MS;
    timeWarpEligiblePickupStreakRef.current = 0;
    timeWarpPityThresholdRef.current = rollTimeWarpPityThreshold();
    setUpgradePaceDelayMultiplier(1);
    setLastUpgradeInfo({
      name: l('ASCENDED', 'YÜKSELİŞ', 'ASCENSÃO'),
      effect: t('useGame.lastUpgrade.ascended', { gain: prestigeGain }),
    });
    
    // Reset contracts on ascension - generate fresh contracts with full refreshes
    setContracts(prev => ({
      ...prev,
      activeContracts: [],
      completedToday: 0,
      lastRefreshTime: 0, // This will trigger the useEffect to regenerate contracts
      refreshesRemaining: 3,
    }));
  }, [resources.crypto.amount, resources.prestige, elapsedTime, checkAchievements, resources.data.perSecond, prestigeUpgrades, stats.totalAscensions, clearComboSpawnTimeouts, language, t]);

  const ascendVictory = useCallback((prestigeMultiplier = 1): LootBoxReward | null => {
    const cryptoAmount = resources.crypto.amount;
    const requiredCrypto = getAscensionCost(stats.totalAscensions);
    if (cryptoAmount < requiredCrypto) return null;
    
    let prestigeGain = Math.floor(getPrestigeGainBreakdown(cryptoAmount, stats.totalAscensions, prestigeUpgrades).total * Math.max(1, prestigeMultiplier));
    
    if (prestigeGain === 0) return null;

    let startingData = 0;
    prestigeUpgrades.forEach(p => {
      if (p.count > 0 && p.effect.type === 'starting_bonus') {
        // Head Start: seconds of the finished run's data production per level
        startingData += p.effect.value * p.count * Math.max(0, resources.data.perSecond);
      }
    });

    // The box is opened right after this ascension, so the new ascension count applies.
    const lootCandidates = buildLootboxCandidates(cosmetics, stats.totalAscensions + 1);
    const lootLuckBonus = getActiveLootLuckBonus(cosmetics) + activeAdjacencyLuckBoostPercent;
    const pickedLoot = pickLootboxCandidate(lootCandidates, lootLuckBonus);
    // A duplicate converts to credits (50% of its rarity's shop price) instead of a new item.
    const duplicateCredits = pickedLoot?.owned ? getDuplicateCreditValue(pickedLoot.rarity) : 0;
    const selectedLoot = pickedLoot && !pickedLoot.owned ? pickedLoot : null;
    const fallbackBonus = selectedLoot
      ? { ...LOOTBOX_FALLBACK_BONUS, data: 0, credits: 0, crypto: 0 }
      : duplicateCredits > 0
        ? { data: 0, credits: duplicateCredits, crypto: 0 }
        : LOOTBOX_FALLBACK_BONUS;
    const lootReward: LootBoxReward = selectedLoot
      ? {
          kind: 'cosmetic',
          cosmeticType: selectedLoot.cosmeticType,
          itemId: selectedLoot.id,
          itemName: selectedLoot.name,
          rarity: selectedLoot.rarity,
          isAscensionItem: selectedLoot.isAscensionCatalogItem,
        }
      : {
          kind: 'fallback',
          data: fallbackBonus.data,
          credits: fallbackBonus.credits,
          crypto: fallbackBonus.crypto,
        };
    const localizedLootName = selectedLoot ? getLocalizedLootCandidateName(selectedLoot) : null;

    challengeAscendRef.current();
    setStats(s => {
      const updated = incrementDailyAscensionStats({
        ...s,
        totalAscensions: s.totalAscensions + 1,
        totalPrestigeEarned: s.totalPrestigeEarned + prestigeGain,
        totalCosmeticsOwned: s.totalCosmeticsOwned + (selectedLoot ? 1 : 0),
        fastestAscension: Math.min(s.fastestAscension, elapsedTime),
      });
      checkAchievements(updated, resources.data.perSecond);
      return updated;
    });

    setResources({
      credits: { amount: fallbackBonus.credits, perSecond: 0, unlocked: true },
      data: { amount: startingData + fallbackBonus.data, perSecond: 0, unlocked: true },
      silicon: { amount: 0, perSecond: 0, unlocked: false },
      interest: { amount: 0, perSecond: 0, unlocked: true },
      crypto: { amount: fallbackBonus.crypto, perSecond: 0, unlocked: true },
      prestige: { ...resources.prestige, amount: resources.prestige.amount + prestigeGain },
    });

    if (selectedLoot) {
      setCosmetics(prev => applyLootboxRewardToCosmetics(prev, selectedLoot));
    }

    setUpgrades(buildAscendedUpgrades());
    setElapsedTime(0);
    timeWarpCooldownUntilRef.current = 0;
    clearComboSpawnTimeouts();
    activeComboChainSessionRef.current = null;
    comboAutoclickSpawnLockedRef.current = false;
    comboCritSpawnLockedRef.current = false;
    activeTimeWarpMiniGameRef.current = null;
    setActiveTimeWarpMiniGame(null);
    setTimeWarpFeedback(null);
    autoClickBoostEndTimeRef.current = 0;
    critBoostEndTimeRef.current = 0;
    autoClickPickupStackRef.current = 0;
    critPickupStackRef.current = 0;
    setAutoClickBoostEndTime(0);
    setCritBoostEndTime(0);
    lastUpgradePurchaseAtRef.current = Date.now();
    avgUpgradePurchaseIntervalMsRef.current = UPGRADE_PACE_BASE_INTERVAL_MS;
    timeWarpEligiblePickupStreakRef.current = 0;
    timeWarpPityThresholdRef.current = rollTimeWarpPityThreshold();
    setUpgradePaceDelayMultiplier(1);
    setLastUpgradeInfo({
      name: l('BOSS DEFEATED!', 'BOSS ALT EDİLDİ!', 'CHEFE DERROTADO!'),
      effect: selectedLoot
        ? l(
          `+${prestigeGain} prestige | Loot: ${localizedLootName ?? selectedLoot.name}`,
          `+${prestigeGain} prestij | Ganimet: ${localizedLootName ?? selectedLoot.name}`,
          `+${prestigeGain} prestígio | Saque: ${localizedLootName ?? selectedLoot.name}`,
        )
        : l(
          `+${prestigeGain} prestige | Loot pool empty: +1K all`,
          `+${prestigeGain} prestij | Ganimet havuzu boş: +1K hepsi`,
          `+${prestigeGain} prestígio | Pool de saque vazio: +1K em tudo`,
        ),
    });
    playSound('buy_fab');
    
    // Reset contracts on ascension - generate fresh contracts with full refreshes
    setContracts(prev => ({
      ...prev,
      activeContracts: [],
      completedToday: 0,
      lastRefreshTime: 0, // This will trigger the useEffect to regenerate contracts
      refreshesRemaining: 3,
    }));
    return lootReward;
  }, [resources.crypto.amount, resources.prestige, elapsedTime, checkAchievements, resources.data.perSecond, prestigeUpgrades, playSound, stats.totalAscensions, cosmetics, activeAdjacencyLuckBoostPercent, clearComboSpawnTimeouts, getLocalizedLootCandidateName, language]);

  const ascendDefeat = useCallback(() => {
    const cryptoAmount = resources.crypto.amount;
    const requiredCrypto = getAscensionCost(stats.totalAscensions);
    if (cryptoAmount < requiredCrypto) return;
    
    let prestigeGain = getPrestigeGainBreakdown(cryptoAmount, stats.totalAscensions, prestigeUpgrades).total;
    
    // v1.04: keep half the prestige (was 25%, while the UI wrongly called it a "25% penalty").
    const penaltyPrestige = Math.floor(prestigeGain * BOSS_DEFEAT_PRESTIGE_SHARE);

    let startingData = 0;
    prestigeUpgrades.forEach(p => {
      if (p.count > 0 && p.effect.type === 'starting_bonus') {
        // Head Start: seconds of the finished run's data production per level
        startingData += p.effect.value * p.count * Math.max(0, resources.data.perSecond);
      }
    });

    challengeAscendRef.current();
    setStats(s => {
      const updated = incrementDailyAscensionStats({
        ...s,
        totalAscensions: s.totalAscensions + 1,
        totalPrestigeEarned: s.totalPrestigeEarned + penaltyPrestige,
        fastestAscension: Math.min(s.fastestAscension, elapsedTime),
      });
      checkAchievements(updated, resources.data.perSecond);
      return updated;
    });

    setResources({
      credits: { amount: 0, perSecond: 0, unlocked: true },
      data: { amount: startingData, perSecond: 0, unlocked: true },
      silicon: { amount: 0, perSecond: 0, unlocked: false },
      interest: { amount: 0, perSecond: 0, unlocked: true },
      crypto: { amount: 0, perSecond: 0, unlocked: true },
      prestige: { ...resources.prestige, amount: resources.prestige.amount + penaltyPrestige },
    });

    setUpgrades(buildAscendedUpgrades());
    setElapsedTime(0);
    timeWarpCooldownUntilRef.current = 0;
    clearComboSpawnTimeouts();
    activeComboChainSessionRef.current = null;
    comboAutoclickSpawnLockedRef.current = false;
    comboCritSpawnLockedRef.current = false;
    activeTimeWarpMiniGameRef.current = null;
    setActiveTimeWarpMiniGame(null);
    setTimeWarpFeedback(null);
    autoClickBoostEndTimeRef.current = 0;
    critBoostEndTimeRef.current = 0;
    autoClickPickupStackRef.current = 0;
    critPickupStackRef.current = 0;
    setAutoClickBoostEndTime(0);
    setCritBoostEndTime(0);
    lastUpgradePurchaseAtRef.current = Date.now();
    avgUpgradePurchaseIntervalMsRef.current = UPGRADE_PACE_BASE_INTERVAL_MS;
    timeWarpEligiblePickupStreakRef.current = 0;
    timeWarpPityThresholdRef.current = rollTimeWarpPityThreshold();
    setUpgradePaceDelayMultiplier(1);
    setLastUpgradeInfo({
      name: l('HACK FAILED', 'HACK BAŞARISIZ', 'HACK FALHOU'),
      effect: pick6(language, [
        `+${penaltyPrestige} prestige (kept ${Math.round(BOSS_DEFEAT_PRESTIGE_SHARE * 100)}%, no loot box)`,
        `+${penaltyPrestige} prestij (%${Math.round(BOSS_DEFEAT_PRESTIGE_SHARE * 100)} korundu, ganimet kutusu yok)`,
        `+${penaltyPrestige} prestígio (${Math.round(BOSS_DEFEAT_PRESTIGE_SHARE * 100)}% mantido, sem caixa de recompensa)`,
        `+${penaltyPrestige} prestigio (${Math.round(BOSS_DEFEAT_PRESTIGE_SHARE * 100)}% conservado, sin caja de botín)`,
        `+${penaltyPrestige} престижа (сохранено ${Math.round(BOSS_DEFEAT_PRESTIGE_SHARE * 100)}%, без лутбокса)`,
        `+${penaltyPrestige} 声望（保留 ${Math.round(BOSS_DEFEAT_PRESTIGE_SHARE * 100)}%，无战利品箱）`,
      ]),
    });
    
    // Reset contracts on ascension - generate fresh contracts with full refreshes
    setContracts(prev => ({
      ...prev,
      activeContracts: [],
      completedToday: 0,
      lastRefreshTime: 0, // This will trigger the useEffect to regenerate contracts
      refreshesRemaining: 3,
    }));
  }, [resources.crypto.amount, resources.prestige, prestigeUpgrades, stats.totalAscensions, clearComboSpawnTimeouts, language]);

  const buyPrestigeUpgrade = useCallback((id: string) => {
    setPrestigeUpgrades(prev => prev.map(p => {
      // Calculate current cost with scaling
      const currentCost = Math.floor(p.cost * Math.pow(p.costMultiplier, p.count));
      
      // Check if at max level
      if (p.count >= p.maxLevel) return p;
      
      if (p.id === id && resources.prestige.amount >= currentCost) {
        setResources(r => ({
          ...r,
          prestige: { ...r.prestige, amount: r.prestige.amount - currentCost }
        }));
        playSound('buy_fab');
        // Track prestige spent and upgrades purchased
        setStats(s => {
          const updated = { ...s, totalPrestigeSpent: s.totalPrestigeSpent + currentCost, totalPrestigeUpgradesPurchased: s.totalPrestigeUpgradesPurchased + 1 };
          unlockAchievement('prestige_upgrade');
          checkAchievements(updated, resources.data.perSecond);
          return updated;
        });
        return { ...p, count: p.count + 1 };
      }
      return p;
    }));
  }, [resources.prestige.amount, playSound, unlockAchievement, checkAchievements, resources.data.perSecond]);

  // Buys as many levels of one prestige upgrade as the current prestige allows (up to its max level).
  const buyPrestigeUpgradeMax = useCallback((id: string) => {
    const upgrade = prestigeUpgrades.find(p => p.id === id);
    if (!upgrade) return;
    let budget = resources.prestige.amount;
    let levels = 0;
    let spent = 0;
    while (upgrade.count + levels < upgrade.maxLevel) {
      const cost = Math.floor(upgrade.cost * Math.pow(upgrade.costMultiplier, upgrade.count + levels));
      if (cost > budget) break;
      budget -= cost;
      spent += cost;
      levels++;
    }
    if (levels === 0) return;
    setPrestigeUpgrades(prev => prev.map(p => (p.id === id ? { ...p, count: p.count + levels } : p)));
    setResources(r => ({ ...r, prestige: { ...r.prestige, amount: r.prestige.amount - spent } }));
    playSound('buy_fab');
    setStats(s => {
      const updated = { ...s, totalPrestigeSpent: s.totalPrestigeSpent + spent, totalPrestigeUpgradesPurchased: s.totalPrestigeUpgradesPurchased + levels };
      unlockAchievement('prestige_upgrade');
      checkAchievements(updated, resources.data.perSecond);
      return updated;
    });
  }, [prestigeUpgrades, resources.prestige.amount, playSound, unlockAchievement, checkAchievements, resources.data.perSecond]);

  const onPickupClick = useCallback((pickup: FloatingPickupItem) => {
    // Calculate pickup value boost from prestige upgrades
    let pickupMultiplier = 1;
    prestigeUpgrades.forEach(p => {
      if (p.count > 0 && p.effect.type === 'pickup_value') {
        pickupMultiplier += p.effect.value * p.count;
      }
    });

    const comboSessionWasActive = !!activeComboChainSessionRef.current;
    setFloatingPickups(prev => prev.filter(p => p.id !== pickup.id));
    const boostedValue = Math.floor(pickup.value * pickupMultiplier);
    const dataCollectedGain = pickup.type === 'data' ? boostedValue : 0;
    const creditsCollectedGain = pickup.type === 'credits' ? boostedValue : 0;

    if (pickup.type === 'data') {
      setResources(prev => ({
        ...prev,
        data: { ...prev.data, amount: prev.data.amount + boostedValue }
      }));
      playSound('pickup');
    } else if (pickup.type === 'credits') {
      setResources(prev => ({
        ...prev,
        credits: { ...prev.credits, amount: prev.credits.amount + boostedValue }
      }));
      playSound('pickup');
    } else if (pickup.type === 'autoclick') {
      const baseDurationMs = Math.max(500, Math.floor((pickup.value || 0) * 1000));
      const addedDurationMs = extendAutoClickBoost(baseDurationMs);
      if (pickup.comboChain) {
        comboAutoclickSpawnLockedRef.current = true;
      }
      setLastUpgradeInfo({
        name: l('AUTO-CLICK BOOST', 'OTO TIKLAMA TAKVİYESİ', 'IMPULSO DE AUTO-CLIQUE'),
        effect: l(
          `+${(addedDurationMs / 1000).toFixed(2)}s (${autoClickPickupStackRef.current} stack)`,
          `+${(addedDurationMs / 1000).toFixed(2)}sn (${autoClickPickupStackRef.current} yığın)`,
          `+${(addedDurationMs / 1000).toFixed(2)}s (${autoClickPickupStackRef.current} acumulo)`,
        ),
      });
      playSound('pickup');
    } else if (pickup.type === 'combo') {
      spawnComboChainPickups();
      setLastUpgradeInfo({
        name: l('COMBO CHAIN', 'KOMBO ZİNCİRİ', 'CADEIA DE COMBO'),
        effect: l(
          `${COMBO_CHAIN_MIN_SPAWNS}-${COMBO_CHAIN_MAX_SPAWNS} rapid pickups deployed`,
          `${COMBO_CHAIN_MIN_SPAWNS}-${COMBO_CHAIN_MAX_SPAWNS} hızlı ödül bırakıldı`,
          `${COMBO_CHAIN_MIN_SPAWNS}-${COMBO_CHAIN_MAX_SPAWNS} coletas rapidas ativadas`,
        ),
      });
      playSound('checkpoint');
    }

    if (comboSessionWasActive) {
      settleActiveComboChainPickupCollect(pickup, dataCollectedGain);
    }

    const now = Date.now();
    const canTriggerTimeWarp =
      (pickup.type === 'data' || pickup.type === 'credits') &&
      activePickupBoosts.timeWarpSeconds > 0 &&
      !activeTimeWarpMiniGameRef.current &&
      now >= timeWarpCooldownUntilRef.current;

    if (canTriggerTimeWarp) {
      timeWarpEligiblePickupStreakRef.current += 1;
    }

    const timeWarpPityThreshold = timeWarpPityThresholdRef.current;
    const timeWarpEscalationChance = Math.max(0, timeWarpEligiblePickupStreakRef.current - 1) * 0.03;
    const timeWarpPityProgress = timeWarpEligiblePickupStreakRef.current / Math.max(1, timeWarpPityThreshold);
    const timeWarpPityChance = Math.max(0, timeWarpPityProgress - 0.45) * 0.18;

    const shouldTriggerTimeWarp =
      canTriggerTimeWarp && (
        timeWarpEligiblePickupStreakRef.current >= timeWarpPityThreshold ||
        Math.random() < Math.min(0.78, activePickupBoosts.timeWarpChance + timeWarpEscalationChance + timeWarpPityChance)
      );

    if (shouldTriggerTimeWarp) {
      const started = startTimeWarpMiniGame(activePickupBoosts.timeWarpSeconds);
      if (started) {
        timeWarpEligiblePickupStreakRef.current = 0;
        setLastUpgradeInfo({
          name: l('TIME WARP SIGNAL', 'ZAMAN YARIĞI SİNYALİ', 'SINAL DE TIME WARP'),
          effect: l(
            `Anomaly opened: click the blackhole for up to ${(activePickupBoosts.timeWarpSeconds / 60).toFixed(1)}m.`,
            `Anomali açıldı: karadeliğe tıklayarak ${(activePickupBoosts.timeWarpSeconds / 60).toFixed(1)}d topla.`,
            `Anomalia aberta: clique no buraco negro por até ${(activePickupBoosts.timeWarpSeconds / 60).toFixed(1)}m.`,
          ),
        });
        playSound('checkpoint');
      }
    } else if (activePickupBoosts.timeWarpSeconds <= 0) {
      timeWarpEligiblePickupStreakRef.current = 0;
      timeWarpPityThresholdRef.current = rollTimeWarpPityThreshold();
    }

    // Track pickups collected
    setStats(s => {
      const updated = {
        ...s,
        pickupsCollected: s.pickupsCollected + 1,
        totalDataCollected: s.totalDataCollected + dataCollectedGain,
        totalCreditsEarned: s.totalCreditsEarned + creditsCollectedGain,
      };
      checkAchievements(updated, resources.data.perSecond);
      return updated;
    });
    // Update contract progress for collecting pickups
    updateContractProgress('collect_pickups', 1);
  }, [checkAchievements, resources.data.perSecond, prestigeUpgrades, playSound, activePickupBoosts, startTimeWarpMiniGame, spawnComboChainPickups, extendAutoClickBoost, settleActiveComboChainPickupCollect, language]);

  const onCritPickupClick = useCallback((pickup?: FloatingPickupItem) => {
    const comboSessionWasActive = !!activeComboChainSessionRef.current;
    playSound('crit');
    const addedDurationMs = extendCritBoost(CRIT_PICKUP_BASE_DURATION_MS);
    if (pickup?.comboChain) {
      comboCritSpawnLockedRef.current = true;
    }
    setLastUpgradeInfo({
      name: l('CRIT BOOST', 'KRİTİK TAKVİYE', 'IMPULSO CRÍTICO'),
      effect: l(
        `+${(addedDurationMs / 1000).toFixed(2)}s (${critPickupStackRef.current} stack)`,
        `+${(addedDurationMs / 1000).toFixed(2)}sn (${critPickupStackRef.current} yığın)`,
        `+${(addedDurationMs / 1000).toFixed(2)}s (${critPickupStackRef.current} acumulo)`,
      ),
    });
    // Track crit pickups collected
    setStats(s => {
      const updated = { ...s, critPickupsCollected: s.critPickupsCollected + 1 };
      checkAchievements(updated, resources.data.perSecond);
      return updated;
    });
    // Update contract progress for collecting pickups
    updateContractProgress('collect_pickups', 1);
    if (comboSessionWasActive && pickup) {
      settleActiveComboChainPickupCollect(pickup);
    }
  }, [playSound, checkAchievements, resources.data.perSecond, extendCritBoost, settleActiveComboChainPickupCollect, language]);

  // Initialize audio element with track rotation
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const audioUnlockOnceRef = useRef(false);

  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio(MUSIC_TRACKS[0]);
      audio.volume = masterVolume ? musicVolume : 0;
      audio.loop = false;
      audioRef.current = audio;
    }

    const audio = audioRef.current;

    // Handle track ending - play next track
    const handleEnded = () => {
      setCurrentTrackIndex(prev => (prev + 1) % MUSIC_TRACKS.length);
    };

    audio.addEventListener('ended', handleEnded);

    // Cleanup: remove event listener to prevent memory leak
    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Unlock audio on first real user gesture (required by Chromium autoplay rules)
  useEffect(() => {
    const unlock = () => {
      if (audioUnlockOnceRef.current) return;
      audioUnlockOnceRef.current = true;

      try {
        setAudioUnlocked(true);
        console.log('[DF] [Audio] unlocked by user gesture');
      } catch (e) {
        console.log('[DF] [Audio] unlock failed', e);
      }
    };

    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlock as any);
      window.removeEventListener('keydown', unlock as any);
    };
  }, []);

  // Update track when index changes
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    // Changing src resets playback, so only do it when the track actually changes.
    a.src = MUSIC_TRACKS[currentTrackIndex];

    // If user wants music and autoplay is unlocked, start the new track.
    if (loadReady && isMusicPlaying && audioUnlocked && masterVolume && musicVolume > 0) {
      // Avoid spamming play() while already playing.
      if (a.paused) {
        a.play().catch(err => console.log('Audio play failed:', err));
      }
    }
  }, [currentTrackIndex]);// Update volume (respects master volume)
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    a.volume = masterVolume ? musicVolume : 0;

    // If the user has music enabled and we're unlocked, moving the slider from 0->>0
    // should NOT restart the track, but it should resume if it was paused.
    if (loadReady && isMusicPlaying && audioUnlocked && masterVolume && musicVolume > 0) {
      if (a.paused) {
        a.play().catch(err => console.log('Audio play failed:', err));
      }
    }
  }, [musicVolume, masterVolume, isMusicPlaying, audioUnlocked, loadReady]);

  // Toggle music playback
  const toggleMusic = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;

    if (isMusicPlaying) {
      a.pause();
      setIsMusicPlaying(false);
      console.log('[DF] [Music] paused');
      return;
    }

    // player wants music on
    setIsMusicPlaying(true);

    // If not unlocked yet, wait for first gesture (unlock handler will start playback)
    if (!audioUnlocked) {
      console.log('[DF] [Music] waiting for user gesture to start');
      return;
    }

    a.play()
      .then(() => console.log('[DF] [Music] playing'))
      .catch((err) => {
        console.log('[DF] [Music] play failed', err);
        setIsMusicPlaying(false);
      });
  }, [isMusicPlaying, audioUnlocked]);
// Game timer - use ref to track latest values without recreating interval
  const checkAchievementsRef = useRef(checkAchievements);
  const dataPerSecondRef = useRef(resources.data.perSecond);

  useEffect(() => {
    checkAchievementsRef.current = checkAchievements;
  }, [checkAchievements]);

  useEffect(() => {
    dataPerSecondRef.current = resources.data.perSecond;
  }, [resources.data.perSecond]);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
      // Track playtime in stats
      setStats(prev => {
        const updated = { ...prev, playTime: prev.playTime + 1 };
        checkAchievementsRef.current(updated, dataPerSecondRef.current);
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  
// Treat right-click as a normal left-click (QoL). Prevents context menu and keeps click FX consistent.
useEffect(() => {
  // Treat right-click as a normal left-click (QoL). Prevent context menu and keep click FX consistent.
  const simulateLeftClick = (clientX: number, clientY: number) => {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    if (!el) return false;
    // Fire only a synthetic "click" event so right-click does not interfere with
    // held left-click state (auto-click hold) or other mouse button transitions.
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX, clientY, button: 0, buttons: 0 }));
    return true;
  };

  // We only "click" on right-button RELEASE to match left-click behavior and avoid double firing.
  const onMouseUpCapture = (e: MouseEvent) => {
    if (e.button !== 2) return; // right click only
    e.preventDefault();
    e.stopPropagation();
    simulateLeftClick(e.clientX, e.clientY);
  };

  const onContextMenuCapture = (e: MouseEvent) => {
    // Always suppress the browser context menu.
    e.preventDefault();
    e.stopPropagation();
  };

  window.addEventListener('mouseup', onMouseUpCapture, true);
  window.addEventListener('contextmenu', onContextMenuCapture, true);

  return () => {
    window.removeEventListener('mouseup', onMouseUpCapture, true);
    window.removeEventListener('contextmenu', onContextMenuCapture, true);
  };
}, []);
// Auto-save every 5 seconds.
  // NOTE: the previous version re-created this interval whenever any game state changed.
  // Resources change every 100ms, so the 5s timer was reset before it ever fired and
  // autosave effectively never ran (players lost progress on crash). We now keep the
  // latest state in a ref and run ONE stable interval.
  const buildSaveSnapshot = (): SaveData => ({
    resources,
    upgrades,
    prestigeUpgrades,
    achievements,
    stats,
    elapsedTime,
    masterVolume,
    musicVolume,
    sfxVolume,
    isMusicPlaying,
    cosmetics,
    contracts,
    roomLayout,
    tutorial,
    automation,
    challenges,
    finale,
    whatsNew,
    version: 3,
    lastSaveTimestamp: Date.now(),
  });
  const latestSnapshotRef = useRef<() => SaveData>(buildSaveSnapshot);
  latestSnapshotRef.current = buildSaveSnapshot;

  useEffect(() => {
    let saving = false;
    const saveInterval = setInterval(async () => {
      if (!loadReadyRef.current || saving) return;
      saving = true;
      try {
        await saveGameState(latestSnapshotRef.current());
      } finally {
        saving = false;
      }
    }, 5000);
    return () => clearInterval(saveInterval);
  }, [saveGameState]);

  // Best-effort flush when the window is being hidden/closed. This mainly ensures the local fallback is written.
  useEffect(() => {
    const flush = () => {
      if (!loadReadyRef.current) return;
      void saveGameState(latestSnapshotRef.current());
    };

    const onVisibilityChange = () => {
      if (document.hidden) flush();
    };
    const onWindowError = () => flush();

    window.addEventListener('beforeunload', flush);
    window.addEventListener('pagehide', flush);
    window.addEventListener('error', onWindowError);
    window.addEventListener('unhandledrejection', onWindowError);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', flush);
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('error', onWindowError);
      window.removeEventListener('unhandledrejection', onWindowError);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [saveGameState]);

  // Desktop: the main process asks for one last save before the window closes and waits for it.
  useEffect(() => {
    const unsubscribe = getElectronSaveApi()?.onFlushSaveRequest?.(async () => {
      if (!loadReadyRef.current) return;
      await saveGameState(latestSnapshotRef.current());
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [saveGameState]);


  const toggleMasterVolume = useCallback(() => {
    setMasterVolume(prev => !prev);
  }, []);

  // Cosmetics functions
  const buyCosmetic = useCallback((type: 'skin' | 'theme' | 'accessory' | 'cape' | 'wing' | 'headstyle' | 'pet' | 'machineboxskin', id: string) => {
    // Search in both regular and ascension arrays
    const item = type === 'skin' 
      ? (CHARACTER_SKINS.find(s => s.id === id) || ASCENSION_SKINS.find(s => s.id === id))
      : type === 'theme'
        ? (ROOM_THEMES.find(t => t.id === id) || ASCENSION_ROOM_THEMES.find(t => t.id === id))
        : type === 'cape'
          ? BLACK_MARKET_CAPES.find(c => c.id === id)
          : type === 'wing'
            ? BLACK_MARKET_WINGS.find(w => w.id === id)
        : type === 'headstyle'
          ? (CHARACTER_HEAD_STYLES.find(h => h.id === id) || ASCENSION_HEAD_STYLES.find(h => h.id === id))
        : type === 'pet'
            ? (CHARACTER_PETS.find(p => p.id === id) || ASCENSION_PETS.find(p => p.id === id))
          : type === 'machineboxskin'
            ? MACHINE_BOX_SKINS.find(s => s.id === id)
            : (CHARACTER_ACCESSORIES.find(a => a.id === id) || ASCENSION_ACCESSORIES.find(a => a.id === id));
    
    if (!item) return false;
    if ((item as { isRelicShopOnly?: boolean }).isRelicShopOnly) return false;
    
    // Check if it's an ascension item
    const isAscensionItem = item.currency === 'ascension';
    
    // Check if already owned (check both regular and ascension owned arrays)
    const owned = type === 'skin' 
      ? [...cosmetics.ownedSkins, ...cosmetics.ownedAscensionSkins]
      : type === 'theme' 
        ? [...cosmetics.ownedThemes, ...cosmetics.ownedAscensionThemes]
        : type === 'cape'
          ? cosmetics.ownedCapes
          : type === 'wing'
            ? cosmetics.ownedWings
        : type === 'headstyle'
          ? [...cosmetics.ownedHeadStyles, ...cosmetics.ownedAscensionHeadStyles]
          : type === 'pet'
            ? [...cosmetics.ownedPets, ...cosmetics.ownedAscensionPets]
            : type === 'machineboxskin'
              ? cosmetics.ownedMachineBoxSkins
            : [...cosmetics.ownedAccessories, ...cosmetics.ownedAscensionAccessories];
    if (owned.includes(id)) return false;
    
    // Check if can afford - ascension currency uses prestige.amount
    const currencyMap: Record<string, number> = {
      credits: resources.credits.amount,
      crypto: resources.crypto.amount,
      data: resources.data.amount,
      prestige: resources.prestige.amount,
      ascension: resources.prestige.amount
    };
    
    if (currencyMap[item.currency] < item.price) return false;
    
    // Deduct cost (ascension uses prestige resource)
    const resourceKey = isAscensionItem ? 'prestige' : item.currency;
    setResources(prev => ({
      ...prev,
      [resourceKey]: { ...prev[resourceKey as ResourceType], amount: prev[resourceKey as ResourceType].amount - item.price }
    }));
    
    // Add to owned and auto-equip
    setCosmetics(prev => ({
      ...prev,
      ownedSkins: type === 'skin' && !isAscensionItem ? [...prev.ownedSkins, id] : prev.ownedSkins,
      ownedThemes: type === 'theme' && !isAscensionItem ? [...prev.ownedThemes, id] : prev.ownedThemes,
      ownedAccessories: type === 'accessory' && !isAscensionItem ? [...prev.ownedAccessories, id] : prev.ownedAccessories,
      ownedCapes: type === 'cape' ? [...prev.ownedCapes, id] : prev.ownedCapes,
      ownedWings: type === 'wing' ? [...prev.ownedWings, id] : prev.ownedWings,
      ownedHeadStyles: type === 'headstyle' && !isAscensionItem ? [...prev.ownedHeadStyles, id] : prev.ownedHeadStyles,
      ownedPets: type === 'pet' && !isAscensionItem ? [...prev.ownedPets, id] : prev.ownedPets,
      ownedMachineBoxSkins: type === 'machineboxskin' ? [...prev.ownedMachineBoxSkins, id] : prev.ownedMachineBoxSkins,
      ownedAscensionSkins: type === 'skin' && isAscensionItem ? [...prev.ownedAscensionSkins, id] : prev.ownedAscensionSkins,
      ownedAscensionThemes: type === 'theme' && isAscensionItem ? [...prev.ownedAscensionThemes, id] : prev.ownedAscensionThemes,
      ownedAscensionAccessories: type === 'accessory' && isAscensionItem ? [...prev.ownedAscensionAccessories, id] : prev.ownedAscensionAccessories,
      ownedAscensionHeadStyles: type === 'headstyle' && isAscensionItem ? [...prev.ownedAscensionHeadStyles, id] : prev.ownedAscensionHeadStyles,
      ownedAscensionPets: type === 'pet' && isAscensionItem ? [...prev.ownedAscensionPets, id] : prev.ownedAscensionPets,
      activeSkinId: type === 'skin' ? id : prev.activeSkinId,
      activeThemeId: type === 'theme' ? id : prev.activeThemeId,
      activeAccessoryId: type === 'accessory' ? id : prev.activeAccessoryId,
      activeCapeId: type === 'cape' ? id : prev.activeCapeId,
      activeWingId: type === 'wing' ? id : prev.activeWingId,
      activeHeadStyleId: type === 'headstyle' ? id : prev.activeHeadStyleId,
      activePetId: type === 'pet' && !isAscensionItem ? id : prev.activePetId,
      activeMachineBoxSkinId: type === 'machineboxskin' ? id : prev.activeMachineBoxSkinId,
      activeAscensionPetId: type === 'pet' && isAscensionItem ? id : prev.activeAscensionPetId,
    }));
    
    // Track cosmetics purchase
    setStats(s => {
      const updated = { ...s, totalCosmeticsOwned: s.totalCosmeticsOwned + 1 };
      checkAchievements(updated, resources.data.perSecond);
      return updated;
    });
    
    playSound('buy_fab');
    return true;
  }, [cosmetics, resources, playSound, checkAchievements, resources.data.perSecond]);

  const buyCryptoRelic = useCallback((relicId: string) => {
    const relic = CRYPTO_RELIC_TREE.find(node => node.id === relicId);
    if (!relic) return false;
    if (stats.totalAscensions < CRYPTO_RELIC_SHOP_UNLOCK_ASCENSION) return false;

    const currentLevel = getRelicNodeLevel(cosmetics, relicId);
    const maxAllowedLevel = Math.max(0, stats.totalAscensions);
    if (currentLevel >= maxAllowedLevel) return false;

    const prerequisitesMet = relic.requires.every(reqId => isRelicNodePurchased(cosmetics, reqId));
    if (!prerequisitesMet) return false;

    const upgradeCost = getCryptoRelicUpgradeCost(relic, currentLevel, stats.totalAscensions);
    if (resources.crypto.amount < upgradeCost) return false;

    setResources(prev => ({
      ...prev,
      crypto: { ...prev.crypto, amount: prev.crypto.amount - upgradeCost },
    }));

    setCosmetics(prev => {
      const prevLevel = getRelicNodeLevel(prev, relicId);
      const nextLevel = prevLevel + 1;
      const cryptoRelicLevels = { ...(prev.cryptoRelicLevels || {}), [relicId]: nextLevel };
      const shouldAutoEquip = prevLevel === 0;

      if (relic.slot === 'skin') {
        const ownedSkins = prev.ownedSkins.includes(relic.cosmeticId) ? prev.ownedSkins : [...prev.ownedSkins, relic.cosmeticId];
        return {
          ...prev,
          cryptoRelicLevels,
          ownedSkins,
          activeSkinId: shouldAutoEquip ? relic.cosmeticId : prev.activeSkinId,
        };
      }
      if (relic.slot === 'headstyle') {
        const ownedHeadStyles = prev.ownedHeadStyles.includes(relic.cosmeticId) ? prev.ownedHeadStyles : [...prev.ownedHeadStyles, relic.cosmeticId];
        return {
          ...prev,
          cryptoRelicLevels,
          ownedHeadStyles,
          activeHeadStyleId: shouldAutoEquip ? relic.cosmeticId : prev.activeHeadStyleId,
        };
      }
      if (relic.slot === 'wing') {
        const ownedWings = prev.ownedWings.includes(relic.cosmeticId) ? prev.ownedWings : [...prev.ownedWings, relic.cosmeticId];
        return {
          ...prev,
          cryptoRelicLevels,
          ownedWings,
          activeWingId: shouldAutoEquip ? relic.cosmeticId : prev.activeWingId,
          // Keep legacy accessory slot clean if this relic was equipped there in older saves.
          activeAccessoryId: prev.activeAccessoryId === relic.cosmeticId ? 'none' : prev.activeAccessoryId,
        };
      }
      const ownedAccessories = prev.ownedAccessories.includes(relic.cosmeticId) ? prev.ownedAccessories : [...prev.ownedAccessories, relic.cosmeticId];
      return {
        ...prev,
        cryptoRelicLevels,
        ownedAccessories,
        activeAccessoryId: shouldAutoEquip ? relic.cosmeticId : prev.activeAccessoryId,
      };
    });

    if (currentLevel === 0) {
      setStats(s => {
        const updated = { ...s, totalCosmeticsOwned: s.totalCosmeticsOwned + 1 };
        checkAchievements(updated, resources.data.perSecond);
        return updated;
      });
    }

    playSound('buy_black');
    return true;
  }, [cosmetics, resources.crypto.amount, resources.data.perSecond, playSound, checkAchievements, stats.totalAscensions]);

  const buyBlackMarketUpgrade = useCallback((upgradeId: BlackMarketUpgradeId) => {
    const upgrade = BLACK_MARKET_UPGRADES.find(item => item.id === upgradeId);
    if (!upgrade) return false;
    if (stats.totalAscensions < BLACK_MARKET_UNLOCK_ASCENSION) return false;

    const alreadyPurchased =
      upgradeId === 'click_overflow'
        ? cosmetics.blackMarketClickOverflowPurchased
        : cosmetics.blackMarketAdjacencyPurchased;
    if (alreadyPurchased) return false;
    if (resources.prestige.amount < upgrade.cost) return false;

    setResources(prev => ({
      ...prev,
      prestige: { ...prev.prestige, amount: prev.prestige.amount - upgrade.cost },
    }));

    setCosmetics(prev => ({
      ...prev,
      blackMarketClickOverflowPurchased:
        upgradeId === 'click_overflow' ? true : prev.blackMarketClickOverflowPurchased,
      blackMarketAdjacencyPurchased:
        upgradeId === 'adjacency_matrix' ? true : prev.blackMarketAdjacencyPurchased,
    }));

    playSound('buy_black');
    return true;
  }, [
    cosmetics.blackMarketAdjacencyPurchased,
    cosmetics.blackMarketClickOverflowPurchased,
    playSound,
    resources.prestige.amount,
    stats.totalAscensions,
  ]);

  const getParagonUpgradeLevel = useCallback((upgradeId: ParagonUpgradeId): number => {
    const rawLevel = cosmetics.paragonLevels?.[upgradeId];
    if (typeof rawLevel !== 'number' || !Number.isFinite(rawLevel) || rawLevel <= 0) return 0;
    return Math.floor(rawLevel);
  }, [cosmetics.paragonLevels]);

  const buyParagonUpgrade = useCallback((upgradeId: ParagonUpgradeId) => {
    const upgrade = PARAGON_UPGRADES.find(item => item.id === upgradeId);
    if (!upgrade) return false;
    if (stats.totalAscensions < PARAGON_LAB_UNLOCK_ASCENSION) return false;
    if (stats.totalAscensions < (upgrade.requiredAscensions ?? 0)) return false;

    const currentLevel = getParagonUpgradeLevel(upgradeId);
    if (currentLevel >= upgrade.maxLevel) return false;

    const currentCost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel));
    if (resources.prestige.amount < currentCost) return false;

    setResources(prev => ({
      ...prev,
      prestige: { ...prev.prestige, amount: prev.prestige.amount - currentCost },
    }));

    setCosmetics(prev => ({
      ...prev,
      paragonLevels: {
        ...(prev.paragonLevels || {}),
        [upgradeId]: currentLevel + 1,
      },
    }));

    setLastUpgradeInfo({
      name: l('PARAGON LAB', 'PARAGON LABORATUVARI', 'LABORATÓRIO PARAGON'),
      effect: `${upgrade.name} Lv.${currentLevel + 1}/${upgrade.maxLevel}`,
    });
    playSound('buy_black');
    return true;
  }, [getParagonUpgradeLevel, language, playSound, resources.prestige.amount, stats.totalAscensions]);

  const equipCosmetic = useCallback((type: 'skin' | 'theme' | 'accessory' | 'cape' | 'wing' | 'headstyle' | 'pet' | 'clickeffect' | 'lootboxskin' | 'machineboxskin' | 'prestigepet', id: string) => {
    // Combine regular and ascension owned arrays for each type
    const owned = type === 'skin' 
      ? [...cosmetics.ownedSkins, ...cosmetics.ownedAscensionSkins]
      : type === 'theme' 
        ? [...cosmetics.ownedThemes, ...cosmetics.ownedAscensionThemes]
      : type === 'cape'
        ? cosmetics.ownedCapes
      : type === 'wing'
        ? cosmetics.ownedWings
      : type === 'headstyle'
          ? [...cosmetics.ownedHeadStyles, ...cosmetics.ownedAscensionHeadStyles]
          : type === 'clickeffect'
            ? cosmetics.ownedClickEffects
          : type === 'lootboxskin'
            ? cosmetics.ownedLootBoxSkins
          : type === 'machineboxskin'
            ? cosmetics.ownedMachineBoxSkins
          : type === 'pet'
            ? [...cosmetics.ownedPets, ...cosmetics.ownedAscensionPets]
            : type === 'prestigepet'
              ? cosmetics.ownedAscensionPets
              : [...cosmetics.ownedAccessories, ...cosmetics.ownedAscensionAccessories];
    
    if (type === 'prestigepet' && id === 'none') {
      setCosmetics(prev => ({ ...prev, activeAscensionPetId: 'none' }));
      playSound('click');
      return true;
    }
    
    if (!owned.includes(id)) return false;
    
    setCosmetics(prev => ({
      ...prev,
      activeSkinId: type === 'skin' ? id : prev.activeSkinId,
      activeThemeId: type === 'theme' ? id : prev.activeThemeId,
      activeAccessoryId: type === 'accessory' ? id : prev.activeAccessoryId,
      activeCapeId: type === 'cape' ? id : prev.activeCapeId,
      activeWingId: type === 'wing' ? id : prev.activeWingId,
      activeHeadStyleId: type === 'headstyle' ? id : prev.activeHeadStyleId,
      activePetId: type === 'pet' ? id : prev.activePetId,
      activeClickEffectId: type === 'clickeffect' ? id : prev.activeClickEffectId,
      activeLootBoxSkinId: type === 'lootboxskin' ? id : prev.activeLootBoxSkinId,
      activeMachineBoxSkinId: type === 'machineboxskin' ? id : prev.activeMachineBoxSkinId,
      activeAscensionPetId: type === 'prestigepet' ? id : prev.activeAscensionPetId,
    }));
    
    playSound('click');
    return true;
  }, [cosmetics, playSound]);

  const newlyUnlockedAscensionPet = useMemo(() => {
    if (!newlyUnlockedAscensionPetId) return null;
    return ASCENSION_PETS.find(p => p.id === newlyUnlockedAscensionPetId) ?? null;
  }, [newlyUnlockedAscensionPetId]);

  const claimAscensionPetUnlock = useCallback(() => {
    setNewlyUnlockedAscensionPetId(null);
  }, [roomLayout.machinePositions]);

  const claimTutorialRewardUnlock = useCallback(() => {
    setNewlyUnlockedTutorialReward(null);
  }, []);

  const equipAscensionPetUnlock = useCallback(() => {
    if (!newlyUnlockedAscensionPetId) return false;
    const equipped = equipCosmetic('prestigepet', newlyUnlockedAscensionPetId);
    setNewlyUnlockedAscensionPetId(null);
    return equipped;
  }, [newlyUnlockedAscensionPetId, equipCosmetic]);

  // Get active skin palette (check both regular and ascension)
  const getActiveSkin = useCallback(() => {
    return CHARACTER_SKINS.find(s => s.id === cosmetics.activeSkinId) 
      || ASCENSION_SKINS.find(s => s.id === cosmetics.activeSkinId) 
      || CHARACTER_SKINS[0];
  }, [cosmetics.activeSkinId]);

  // Get active theme colors (check both regular and ascension)
  const getActiveTheme = useCallback(() => {
    return ROOM_THEMES.find(t => t.id === cosmetics.activeThemeId) 
      || ASCENSION_ROOM_THEMES.find(t => t.id === cosmetics.activeThemeId) 
      || ROOM_THEMES[0];
  }, [cosmetics.activeThemeId]);

  // Get active accessory (check both regular and ascension)
  const getActiveAccessory = useCallback(() => {
    if (cosmetics.activeAccessoryId === 'relic_quantum_wings') {
      return CHARACTER_ACCESSORIES[0];
    }
    return CHARACTER_ACCESSORIES.find(a => a.id === cosmetics.activeAccessoryId) 
      || ASCENSION_ACCESSORIES.find(a => a.id === cosmetics.activeAccessoryId) 
      || CHARACTER_ACCESSORIES[0];
  }, [cosmetics.activeAccessoryId]);

  const getActiveCape = useCallback(() => {
    return BLACK_MARKET_CAPES.find(cape => cape.id === cosmetics.activeCapeId) || BLACK_MARKET_CAPES[0];
  }, [cosmetics.activeCapeId]);

  const getActiveWing = useCallback(() => {
    if (cosmetics.activeWingId === 'relic_quantum_wings') {
      return {
        id: 'relic_quantum_wings',
        name: 'Quantum Wings',
        description: 'Ultra-rare relic wing module from deep space ruins',
        price: 0,
        currency: 'crypto' as const,
        rarity: 'legendary' as const,
        boost: {},
      };
    }
    return BLACK_MARKET_WINGS.find(wing => wing.id === cosmetics.activeWingId) || BLACK_MARKET_WINGS[0];
  }, [cosmetics.activeWingId]);
  
  // Get active head style (check both regular and ascension)
  const getActiveHeadStyle = useCallback(() => {
    return CHARACTER_HEAD_STYLES.find(h => h.id === cosmetics.activeHeadStyleId) 
      || ASCENSION_HEAD_STYLES.find(h => h.id === cosmetics.activeHeadStyleId) 
      || CHARACTER_HEAD_STYLES[0];
  }, [cosmetics.activeHeadStyleId]);
  
  // Get active pet
  const getActivePet = useCallback(() => {
    return CHARACTER_PETS.find(p => p.id === cosmetics.activePetId) 
      || ASCENSION_PETS.find(p => p.id === cosmetics.activePetId)
      || CHARACTER_PETS[0];
  }, [cosmetics.activePetId]);

  // Get active ascension pet
  const getActiveAscensionPet = useCallback(() => {
    if (cosmetics.activeAscensionPetId === 'none') {
      return { id: 'none', name: 'None', description: 'No ascension pet equipped', price: 0, currency: 'ascension' as const, rarity: 'common' as const, ascensionRequirement: 0 };
    }
    return ASCENSION_PETS.find(p => p.id === cosmetics.activeAscensionPetId) || { id: 'none', name: 'None', description: 'No ascension pet equipped', price: 0, currency: 'ascension' as const, rarity: 'common' as const, ascensionRequirement: 0 };
  }, [cosmetics.activeAscensionPetId]);

  const getActiveClickEffect = useCallback(() => {
    if (cosmetics.activeClickEffectId === 'none') return null;
    return CLICK_EFFECTS.find(effect => effect.id === cosmetics.activeClickEffectId) || null;
  }, [cosmetics.activeClickEffectId]);

  const getActiveLootBoxSkin = useCallback(() => {
    return LOOT_BOX_SKINS.find(skin => skin.id === cosmetics.activeLootBoxSkinId) || LOOT_BOX_SKINS[0];
  }, [cosmetics.activeLootBoxSkinId]);

  const getActiveMachineBoxSkin = useCallback(() => {
    return MACHINE_BOX_SKINS.find(skin => skin.id === cosmetics.activeMachineBoxSkinId) || MACHINE_BOX_SKINS[0];
  }, [cosmetics.activeMachineBoxSkinId]);

  // Get total active cosmetic boosts (skin/theme/accessory/headstyle/pets)
  const getPetBoosts = useCallback((): PetBoost => {
    return activeCosmeticBoosts;
  }, [activeCosmeticBoosts]);

  const getAdjacencyFormationBonus = useCallback(() => {
    const active = cosmetics.blackMarketAdjacencyPurchased;
    return {
      machineCount: adjacencyFormation.machineCount,
      adjacentPairs: adjacencyFormation.adjacentPairs,
      clickChains: adjacencyFormation.clickChains,
      productionChains: adjacencyFormation.productionChains,
      cryptoClusters: adjacencyFormation.cryptoClusters,
      // Potential values are shown even before purchase so players can plan layout.
      potentialClickBoostPercent: adjacencyFormation.clickBoostPercent,
      potentialProductionBoostPercent: adjacencyFormation.productionBoostPercent,
      potentialCryptoBoostPercent: adjacencyFormation.cryptoBoostPercent,
      potentialLuckBoostPercent: adjacencyFormation.luckBoostPercent,
      potentialLuckFromClickPercent: adjacencyFormation.luckFromClickPercent,
      potentialLuckFromProductionPercent: adjacencyFormation.luckFromProductionPercent,
      potentialLuckFromCryptoPercent: adjacencyFormation.luckFromCryptoPercent,
      // Active values are applied only after purchasing Adjacency Matrix.
      clickBoostPercent: active ? adjacencyFormation.clickBoostPercent : 0,
      productionBoostPercent: active ? adjacencyFormation.productionBoostPercent : 0,
      cryptoBoostPercent: active ? adjacencyFormation.cryptoBoostPercent : 0,
      luckBoostPercent: active ? adjacencyFormation.luckBoostPercent : 0,
      bonusPercent: active ? adjacencyFormation.productionBoostPercent : 0,
      active,
    };
  }, [
    adjacencyFormation.adjacentPairs,
    adjacencyFormation.clickBoostPercent,
    adjacencyFormation.clickChains,
    adjacencyFormation.cryptoBoostPercent,
    adjacencyFormation.cryptoClusters,
    adjacencyFormation.luckBoostPercent,
    adjacencyFormation.luckFromClickPercent,
    adjacencyFormation.luckFromCryptoPercent,
    adjacencyFormation.luckFromProductionPercent,
    adjacencyFormation.machineCount,
    adjacencyFormation.productionBoostPercent,
    adjacencyFormation.productionChains,
    cosmetics.blackMarketAdjacencyPurchased
  ]);

  const setFullscreen = useCallback(() => {
    if (isElectronEnvironment()) {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.setFullscreen) {
        electronAPI.setFullscreen(true);
      }
    } else {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    }
    playSound('click');
  }, [playSound, queueAchievementToastClear]);

  const setWindowed = useCallback(() => {
    if (isElectronEnvironment()) {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.setFullscreen) {
        electronAPI.setFullscreen(false);
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => {
          console.error(`Error attempting to exit full-screen mode: ${err.message}`);
        });
      }
    }
    playSound('click');
  }, [playSound]);

  // Check and unlock prestige pets based on total prestige count
  useEffect(() => {
    const totalPrestige = stats.totalAscensions;
    const newUnlocks: string[] = [];
    
    ASCENSION_PETS.forEach(pet => {
      if (pet.ascensionRequirement && 
          totalPrestige >= pet.ascensionRequirement && 
          !cosmetics.ownedAscensionPets.includes(pet.id)) {
        newUnlocks.push(pet.id);
      }
    });
    
    if (newUnlocks.length > 0) {
      setPendingAscensionPetUnlocks(prev => {
        const merged = [...prev];
        newUnlocks.forEach(id => {
          if (!merged.includes(id) && id !== newlyUnlockedAscensionPetId) {
            merged.push(id);
          }
        });
        return merged;
      });

      setCosmetics(prev => ({
        ...prev,
        ownedAscensionPets: [...prev.ownedAscensionPets, ...newUnlocks],
      }));
    }
  }, [stats.totalAscensions, cosmetics.ownedAscensionPets, newlyUnlockedAscensionPetId]);

  useEffect(() => {
    if (newlyUnlockedAscensionPetId || pendingAscensionPetUnlocks.length === 0) return;
    const [nextPetId, ...rest] = pendingAscensionPetUnlocks;
    setNewlyUnlockedAscensionPetId(nextPetId);
    setPendingAscensionPetUnlocks(rest);
  }, [newlyUnlockedAscensionPetId, pendingAscensionPetUnlocks]);

  // Calculate unclaimed achievement count (memoized for performance)
  const unclaimedAchievements = useMemo(() => 
    achievements.filter(a => a.unlocked && !a.claimed && a.prestigeReward > 0).length,
    [achievements]
  );

  const getDataPerClick = useCallback((): number => {
    return getCurrentDataPerClick();
  }, [getCurrentDataPerClick]);

  // Contract Generation - Unique objectives different from achievements
  const generateContract = useCallback((difficulty: 'easy' | 'medium' | 'hard'): Contract => {
    const npc = CONTRACT_NPCS[Math.floor(Math.random() * CONTRACT_NPCS.length)];
    const objectiveTypes: ContractObjectiveType[] = [
      'sell_data', 'collect_pickups', 'spend_credits', 'reach_production',
      'rapid_clicks', 'crit_streak', 'upgrade_single', 'maintain_resources'
    ];
    const objectiveType = objectiveTypes[Math.floor(Math.random() * objectiveTypes.length)];
    
    // Scale targets based on difficulty
    const difficultyMultipliers = { easy: 1, medium: 2, hard: 4 };
    const mult = difficultyMultipliers[difficulty];
    
    let targetAmount = 0;
    let title = '';
    let description = '';
    let rewards: Contract['rewards'] = {};
    
    const currentProduction = resources.data.perSecond;
    const baseCredits = Math.max(50, resources.credits.amount * 0.05);
    const contractValueScale = Math.max(
      1,
      Math.log10(
        Math.max(10, resources.data.amount + currentProduction * 120 + resources.credits.amount * 15)
      )
    );
    const cryptoScale = Math.max(
      1,
      Math.log10(
        Math.max(10, resources.crypto.amount * 25 + resources.data.amount / 100 + currentProduction * 10)
      )
    );
    const prestigeScale = Math.max(
      1,
      Math.log10(
        Math.max(
          10,
          resources.prestige.amount * 40 + resources.crypto.amount * 15 + resources.data.amount / 1000
        )
      )
    );
    const getScaledDataReward = (rewardMultiplier: number) =>
      Math.floor(
        Math.max(
          200 * rewardMultiplier,
          currentProduction * (6 + rewardMultiplier * 2),
          resources.data.amount * (0.0015 * rewardMultiplier)
        )
      );
    const getScaledCreditsReward = (rewardRatio: number, minReward: number = 1) =>
      Math.max(
        minReward,
        Math.floor(Math.max(baseCredits * rewardRatio, currentProduction * rewardRatio * 2, contractValueScale * 3))
      );
    const getScaledCryptoReward = (baseBonus: number) =>
      Math.max(1, Math.floor(baseBonus + cryptoScale * (1.2 + mult * 0.15)));
    const getScaledPrestigeReward = (baseBonus: number) =>
      Math.max(1, Math.floor(baseBonus + prestigeScale * (0.85 + mult * 0.1)));
    
    switch (objectiveType) {
      case 'sell_data':
        // Sell a small portion of current data - achievable quickly
        targetAmount = Math.floor(Math.max(100, resources.data.amount * 0.1) * mult);
        title = `Data Liquidation`;
        description = `Sell ${formatNumber(targetAmount)} Data for nodes`;
        rewards = {
          crypto: getScaledCryptoReward(mult),
          prestige: getScaledPrestigeReward(Math.max(0, mult - 1)),
        };
        break;
      case 'collect_pickups':
        // Easy: 3, Medium: 6, Hard: 12 pickups
        targetAmount = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 6 : 12;
        title = `Pickup Collector`;
        description = `Collect ${targetAmount} floating pickups`;
        rewards = {
          credits: getScaledCreditsReward(0.08 * mult, 2),
          data: getScaledDataReward(0.55 * mult),
        };
        break;
      case 'spend_credits':
        // Spend a modest amount based on current holdings
        targetAmount = Math.floor(Math.max(10, resources.credits.amount * 0.15) * mult);
        title = `Investment Run`;
        description = `Spend ${formatNumber(targetAmount)} Nodes on upgrades`;
        rewards = {
          data: Math.max(Math.floor(targetAmount * 5), getScaledDataReward(0.85 * mult)),
          crypto: getScaledCryptoReward(mult),
        };
        break;
      case 'reach_production':
        // Target: slightly above current or reasonable starting goal
        targetAmount = Math.floor(Math.max(5, currentProduction + 5) * mult);
        title = `Production Milestone`;
        description = `Reach ${formatNumber(targetAmount)} Data/sec`;
        rewards = {
          credits: Math.max(Math.floor(targetAmount * 5 / 15), getScaledCreditsReward(0.07 * mult, 2)),
          crypto: getScaledCryptoReward(mult),
        };
        break;
      case 'rapid_clicks':
        // Easy: 20, Medium: 50, Hard: 100 clicks
        targetAmount = difficulty === 'easy' ? 20 : difficulty === 'medium' ? 50 : 100;
        title = `Speed Challenge`;
        description = `Click ${targetAmount} times`;
        rewards = {
          credits: getScaledCreditsReward(0.06 * mult, 2),
          data: getScaledDataReward(0.4 * mult),
        };
        break;
      case 'crit_streak':
        // Easy: 3, Medium: 7, Hard: 15 crits
        targetAmount = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 7 : 15;
        title = `Critical Focus`;
        description = `Land ${targetAmount} critical hits`;
        rewards = {
          crypto: getScaledCryptoReward(mult + 1),
          prestige: getScaledPrestigeReward(mult),
        };
        break;
      case 'upgrade_single':
        // Easy: 3, Medium: 5, Hard: 10 upgrades
        targetAmount = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 5 : 10;
        title = `Specialization`;
        description = `Purchase ${targetAmount} upgrades`;
        rewards = {
          data: getScaledDataReward(0.5 * mult),
          credits: getScaledCreditsReward(0.07 * mult, 2),
        };
        break;
      case 'maintain_resources':
        // Keep a reasonable amount - based on current amount or low starting goal
        targetAmount = Math.floor(Math.max(500, resources.data.amount * 0.3) * mult);
        title = `Resource Reserve`;
        description = `Have ${formatNumber(targetAmount)}+ Data`;
        rewards = {
          crypto: getScaledCryptoReward(mult),
          credits: Math.max(Math.floor(targetAmount * 0.05 / 15), getScaledCreditsReward(0.08 * mult, 2)),
        };
        break;
    }

    // Keep objective types with explicit tuning as-is; increase challenge and reward for the rest.
    if (objectiveType !== 'collect_pickups' && objectiveType !== 'crit_streak') {
      targetAmount = Math.max(1, Math.floor(targetAmount * 1.6));
      Object.keys(rewards).forEach((key) => {
        const rewardKey = key as keyof typeof rewards;
        const current = rewards[rewardKey] || 0;
        rewards[rewardKey] = Math.floor(current * 1.8);
      });
    }
    
    // Ensure minimum rewards (credits reduced by 15x)
    if (rewards.credits) rewards.credits = Math.max(1, Math.floor(rewards.credits));
    if (rewards.data) rewards.data = Math.max(100, Math.floor(rewards.data));
    if (rewards.crypto) rewards.crypto = Math.max(1, Math.floor(rewards.crypto));
    if (rewards.prestige) rewards.prestige = Math.max(1, Math.floor(rewards.prestige));
    
    // Harder contracts give better rewards
    if (difficulty === 'medium') {
      Object.keys(rewards).forEach(key => {
        rewards[key as keyof typeof rewards] = Math.floor(rewards[key as keyof typeof rewards]! * 1.5);
      });
    } else if (difficulty === 'hard') {
      Object.keys(rewards).forEach(key => {
        rewards[key as keyof typeof rewards] = Math.floor(rewards[key as keyof typeof rewards]! * 3);
      });
    }

    // v1.04: crypto and prestige rewards were log-scaled, so after the first few ascensions a contract
    // paid a handful of crypto while the next ascension cost millions. They now pay at least a share of
    // the next ascension (crypto) and of its minimum prestige reward. A run has at most 4 contract sets
    // (1 + 3 refreshes), so contracts help noticeably without replacing mining.
    const rewardShare = CONTRACT_REWARD_SHARE[difficulty];
    const nextAscensionCost = getAscensionCost(stats.totalAscensions);
    if (rewards.crypto) rewards.crypto = Math.max(rewards.crypto, Math.floor(nextAscensionCost * rewardShare));
    if (rewards.prestige) {
      const minimumAscensionReward = getPrestigeGainBreakdown(nextAscensionCost, stats.totalAscensions).total;
      rewards.prestige = Math.max(rewards.prestige, Math.floor(minimumAscensionReward * rewardShare));
    }
    
    return {
      id: `contract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      npcId: npc.id,
      title,
      description,
      objectiveType,
      targetAmount,
      currentProgress: 0,
      rewards,
      status: 'active',
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      difficulty,
    };
  }, [
    resources.credits.amount,
    resources.crypto.amount,
    resources.data.amount,
    resources.data.perSecond,
    resources.prestige.amount,
    stats.totalAscensions,
  ]);

  // Refresh contracts (generates new set of 5 contracts)
  // freeRefresh: true for daily/initial refresh (doesn't consume charges, keeps current refreshesRemaining)
  // resetRefreshes: true for ascension (sets refreshesRemaining back to 3)
  const refreshContracts = useCallback((freeRefresh: boolean = false, resetRefreshes: boolean = false) => {
    setContracts(prev => {
      // Check if we have refreshes remaining (unless it's a free refresh like daily)
      if (!freeRefresh && !resetRefreshes && prev.refreshesRemaining <= 0) {
        return prev;
      }
      
      // Generate unique contracts - no duplicate objective types
      const usedTypes = new Set<ContractObjectiveType>();
      const newContracts: Contract[] = [];
      const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'easy', 'medium', 'medium', 'hard'];
      
      for (const difficulty of difficulties) {
        let contract: Contract;
        let attempts = 0;
        do {
          contract = generateContract(difficulty);
          attempts++;
        } while (usedTypes.has(contract.objectiveType) && attempts < 20);
        
        usedTypes.add(contract.objectiveType);
        newContracts.push(contract);
      }
      
      // Determine new refresh count
      let newRefreshesRemaining = prev.refreshesRemaining;
      if (resetRefreshes) {
        newRefreshesRemaining = 3; // Ascension resets to 3
      } else if (!freeRefresh) {
        newRefreshesRemaining = prev.refreshesRemaining - 1; // Manual refresh consumes 1
      }
      // freeRefresh alone keeps current count
      
      return {
        ...prev,
        activeContracts: newContracts,
        lastRefreshTime: Date.now(),
        refreshesRemaining: newRefreshesRemaining,
      };
    });
  }, [generateContract]);

  // Initialize contracts and auto-refresh every 4 hours (free refresh; no charge consumed).
  useEffect(() => {
    if (!loadReady) return;

    const refreshIntervalMs = 4 * 60 * 60 * 1000;
    const checkAndRefreshContracts = () => {
      const now = Date.now();
      const shouldRefresh =
        contracts.activeContracts.length === 0 ||
        contracts.lastRefreshTime === 0 ||
        now - contracts.lastRefreshTime >= refreshIntervalMs;

      if (shouldRefresh) {
        refreshContracts(true);
      }
    };

    // Run immediately (covers "Ready" state on load), then keep checking.
    checkAndRefreshContracts();
    const intervalId = setInterval(checkAndRefreshContracts, 30 * 1000);

    return () => clearInterval(intervalId);
  }, [loadReady, contracts.activeContracts.length, contracts.lastRefreshTime, refreshContracts]);

  // Claim contract rewards
  const claimContractReward = useCallback((contractId: string) => {
    const contract = contracts.activeContracts.find(c => c.id === contractId);
    if (!contract || contract.status !== 'completed') return;
    
    // Apply rewards
    setResources(prev => ({
      ...prev,
      credits: { ...prev.credits, amount: prev.credits.amount + (contract.rewards.credits || 0) },
      data: { ...prev.data, amount: prev.data.amount + (contract.rewards.data || 0) },
      crypto: { ...prev.crypto, amount: prev.crypto.amount + (contract.rewards.crypto || 0) },
      prestige: { ...prev.prestige, amount: prev.prestige.amount + (contract.rewards.prestige || 0) },
    }));
    
    // Update stats for contract rewards
    setStats(prev => ({
      ...prev,
      totalDataCollected: prev.totalDataCollected + (contract.rewards.data || 0),
      totalCreditsEarned: prev.totalCreditsEarned + (contract.rewards.credits || 0),
      totalCryptoMined: prev.totalCryptoMined + (contract.rewards.crypto || 0),
    }));
    
    // Mark as claimed
    setContracts(prev => ({
      ...prev,
      activeContracts: prev.activeContracts.map(c => 
        c.id === contractId ? { ...c, status: 'claimed' as const } : c
      ),
      completedToday: prev.completedToday + 1,
      totalContractsCompleted: prev.totalContractsCompleted + 1,
    }));
    
    playSound('job_claim');
  }, [contracts.activeContracts, playSound]);

  // Room layout management - grid is 8x8 (indices 0-7)
  const GRID_SIZE = ROOM_LAYOUT_GRID_SIZE;
  const updateMachinePosition = useCallback((upgradeId: string, gridX: number, gridY: number) => {
    // Clamp coordinates to valid grid bounds [0, GRID_SIZE-1]
    const clampedX = Math.max(0, Math.min(GRID_SIZE - 1, gridX));
    const clampedY = Math.max(0, Math.min(GRID_SIZE - 1, gridY));
    
    setRoomLayout(prev => {
      const occupiedByOther = prev.machinePositions.find(
        m => m.upgradeId !== upgradeId && m.gridX === clampedX && m.gridY === clampedY
      );
      if (occupiedByOther) {
        return prev;
      }

      const filtered = prev.machinePositions.filter(m => m.upgradeId !== upgradeId);
      return {
        version: ROOM_LAYOUT_VERSION,
        machinePositions: [...filtered, { upgradeId, gridX: clampedX, gridY: clampedY }],
      };
    });
  }, []);

  // Clean up any corrupted positions on load
  useEffect(() => {
    const seenUpgrades = new Set<string>();
    const seenTiles = new Set<string>();
    const cleanedPositions = roomLayout.machinePositions.filter(pos => {
      if (pos.gridX < 0 || pos.gridX >= GRID_SIZE || pos.gridY < 0 || pos.gridY >= GRID_SIZE) return false;
      if (seenUpgrades.has(pos.upgradeId)) return false;
      const tileKey = `${pos.gridX}:${pos.gridY}`;
      if (seenTiles.has(tileKey)) return false;
      seenUpgrades.add(pos.upgradeId);
      seenTiles.add(tileKey);
      return true;
    });

    if (cleanedPositions.length !== roomLayout.machinePositions.length) {
      setRoomLayout({
        version: ROOM_LAYOUT_VERSION,
        machinePositions: cleanedPositions,
      });
    }
  }, []);

  // Forced Achievement Cleanup - Removes deleted legacy achievements from existing saves
  useEffect(() => {
    const deletedAchievementIds = [
      'speed_90', 'speed_60', 'speed_30', 'speed_120',
      'ascend_100',
      'prestige_upgrades_1000', 'prestige_upgrades_2500',
      'pickups_1000'
    ];
    
    setAchievements(prev => {
      const filtered = prev.filter(a => !deletedAchievementIds.includes(a.id));
      if (filtered.length !== prev.length) {
        return filtered;
      }
      return prev;
    });
  }, []);

  const removeMachinePosition = useCallback((upgradeId: string) => {
    setRoomLayout(prev => ({
      version: ROOM_LAYOUT_VERSION,
      machinePositions: prev.machinePositions.filter(m => m.upgradeId !== upgradeId),
    }));
  }, []);

  const getMachinePosition = useCallback((upgradeId: string): MachinePosition | undefined => {
    return roomLayout.machinePositions.find(m => m.upgradeId === upgradeId);
  }, [roomLayout.machinePositions]);

  // Tutorial system functions
  const startTutorial = useCallback(() => {
    setTutorial(prev => ({ ...prev, started: true, skipped: false }));
  }, []);

  const skipTutorial = useCallback(() => {
    setTutorial(prev => ({ ...prev, skipped: true }));
  }, []);

  // Replaying the tutorial must not pay its rewards again (free cosmetic + step rewards each reset).
  const resetTutorial = useCallback(() => {
    setTutorial(prev => ({
      ...INITIAL_TUTORIAL,
      rewardGranted: !!prev.rewardGranted,
      phaseRewardsGranted: Math.max(0, prev.phaseRewardsGranted ?? 0),
    }));
  }, []);

  const completeTutorialObjective = useCallback((objectiveId: string) => {
    setTutorial(prev => {
      if (prev.skipped) return prev;

      const alreadyCompleted = prev.completedObjectives.includes(objectiveId);
      const newCompleted = alreadyCompleted
        ? prev.completedObjectives
        : [...prev.completedObjectives, objectiveId];
      const nextPhase = resolveTutorialPhase(prev.currentPhase, newCompleted);

      if (alreadyCompleted && nextPhase === prev.currentPhase) {
        return prev;
      }

      return {
        ...prev,
        completedObjectives: newCompleted,
        currentPhase: nextPhase,
      };
    });
  }, []);

  // Self-heal for saves where future-step objectives were completed early:
  // keeps currentPhase aligned with already-completed objectives.
  useEffect(() => {
    setTutorial(prev => {
      if (prev.skipped) return prev;
      const nextPhase = resolveTutorialPhase(prev.currentPhase, prev.completedObjectives);
      if (nextPhase === prev.currentPhase) return prev;
      return { ...prev, currentPhase: nextPhase };
    });
  }, [tutorial.currentPhase, tutorial.completedObjectives, tutorial.skipped]);

  const getCurrentTutorialPhase = useCallback((): TutorialPhaseWithObjectives | null => {
    if (tutorial.skipped) return null;
    const phaseInfo = TUTORIAL_PHASES[tutorial.currentPhase];
    if (!phaseInfo) return null;
    const localizedPhaseInfo = getLocalizedTutorialPhaseText(tutorial.currentPhase, phaseInfo, language);
    
    const objectives = TUTORIAL_OBJECTIVES[tutorial.currentPhase]?.objectives.map(obj => ({
      ...obj,
      text: getLocalizedTutorialObjectiveText(obj.id, obj.text, language),
      completed: tutorial.completedObjectives.includes(obj.id),
    })) || [];
    
    return {
      ...phaseInfo,
      ...localizedPhaseInfo,
      objectives,
      reward: TUTORIAL_PHASE_REWARDS[tutorial.currentPhase] ?? null,
      phaseIndex: tutorial.currentPhase,
      phaseCount: TUTORIAL_PHASES.length,
    };
  }, [tutorial, language]);

  const isTutorialComplete = tutorial.skipped || (
    tutorial.currentPhase === TUTORIAL_PHASES.length - 1 && 
    TUTORIAL_OBJECTIVES[tutorial.currentPhase]?.objectives.every(obj => 
      tutorial.completedObjectives.includes(obj.id)
    )
  );

  // One-time tutorial completion reward: grant the cheapest unowned cosmetic shop item.
  useEffect(() => {
    if (tutorial.skipped) return;
    if (!isTutorialComplete) return;
    if (tutorial.rewardGranted) return;

    const reward = getTutorialRewardCandidate();
    if (reward) {
      setCosmetics(prev => applyTutorialRewardToCosmetics(prev, reward));
      setStats(s => {
        const updated = { ...s, totalCosmeticsOwned: s.totalCosmeticsOwned + 1 };
        checkAchievements(updated, resources.data.perSecond);
        return updated;
      });
      setNewlyUnlockedTutorialReward(reward);
      playSound('achievement');
    }

    setTutorial(prev => (prev.rewardGranted ? prev : { ...prev, rewardGranted: true }));
  }, [
    tutorial.skipped,
    tutorial.rewardGranted,
    isTutorialComplete,
    cosmetics,
    checkAchievements,
    resources.data.perSecond,
    playSound,
  ]);

  // Small per-phase step rewards (v1.04). Paid once per finished phase, never for skipped tutorials.
  useEffect(() => {
    if (tutorial.skipped) return;
    const granted = tutorial.phaseRewardsGranted ?? tutorial.currentPhase;
    if (tutorial.currentPhase <= granted) return;

    let data = 0;
    let credits = 0;
    for (let i = granted; i < tutorial.currentPhase; i += 1) {
      const reward = TUTORIAL_PHASE_REWARDS[i];
      if (!reward) continue;
      if (reward.resource === 'data') data += reward.amount;
      else credits += reward.amount;
    }
    if (data > 0 || credits > 0) {
      setResources(prev => ({
        ...prev,
        data: { ...prev.data, amount: prev.data.amount + data },
        credits: { ...prev.credits, amount: prev.credits.amount + credits },
      }));
      playSound('checkpoint');
    }
    setTutorial(prev => (
      (prev.phaseRewardsGranted ?? 0) >= tutorial.currentPhase
        ? prev
        : { ...prev, phaseRewardsGranted: tutorial.currentPhase }
    ));
  }, [tutorial.skipped, tutorial.currentPhase, tutorial.phaseRewardsGranted, playSound]);

  const skipTrack = useCallback(() => {
    setCurrentTrackIndex(prev => (prev + 1) % MUSIC_TRACKS.length);
  }, []);

  // ---- Finale ----
  const completeFinale = useCallback(() => {
    if (finale.completed || stats.totalAscensions < FINALE_UNLOCK_ASCENSION) return;
    setFinale(prev => ({ ...prev, completed: true, completedAt: Date.now() }));
    // The Infinity Entity stays with the player for Endless mode.
    setCosmetics(prev => prev.ownedAscensionPets.includes('ascension_infinity')
      ? prev
      : { ...prev, ownedAscensionPets: [...prev.ownedAscensionPets, 'ascension_infinity'] });
    playSound('achievement');
  }, [finale.completed, stats.totalAscensions, playSound]);

  const recordFinaleDefeat = useCallback(() => {
    setFinale(prev => (prev.completed ? prev : { ...prev, failedAttempts: prev.failedAttempts + 1 }));
  }, []);
  const markWhatsNewSeen = useCallback(() => {
    setWhatsNew(prev => ({ ...prev, seenVersion: WHATS_NEW_VERSION }));
  }, []);
  // Welcome-back gift: one loot box rolled like an ascension box (a duplicate turns into credits).
  const claimWelcomeGift = useCallback((): LootBoxReward | null => {
    if (whatsNew.giftClaimed) return null;
    setWhatsNew(prev => ({ ...prev, giftClaimed: true }));
    const picked = pickLootboxCandidate(buildLootboxCandidates(cosmetics, stats.totalAscensions), getActiveLootLuckBonus(cosmetics));
    if (picked && !picked.owned) {
      setCosmetics(prev => applyLootboxRewardToCosmetics(prev, picked));
      return { kind: 'cosmetic', cosmeticType: picked.cosmeticType, itemId: picked.id, itemName: picked.name, rarity: picked.rarity, isAscensionItem: picked.isAscensionCatalogItem, source: 'welcome' };
    }
    const credits = picked ? getDuplicateCreditValue(picked.rarity) : LOOTBOX_FALLBACK_BONUS.credits;
    setResources(prev => ({ ...prev, credits: { ...prev.credits, amount: prev.credits.amount + credits } }));
    return { kind: 'fallback', data: 0, credits, crypto: 0, source: 'welcome' };
  }, [whatsNew.giftClaimed, cosmetics, stats.totalAscensions]);
  const clearCoreSignal = useCallback(() => {
    setFinale(prev => (prev.signalCleared ? prev : { ...prev, signalCleared: true }));
  }, []);
  const setAbyssVariant = useCallback((variant: number) => {
    setFinale(prev => ({ ...prev, abyssVariant: Math.max(0, Math.min(getUnlockedAbyssVariants(getEndlessDepth(stats.totalAscensions)), Math.floor(variant))) }));
  }, [stats.totalAscensions]);
  // Each new abyss palette is equipped automatically when it unlocks (every 5 Endless depths).
  const lastAbyssUnlockRef = useRef<number | null>(null);
  useEffect(() => {
    if (!finale.completed || !loadReadyRef.current) return;
    const unlocked = getUnlockedAbyssVariants(getEndlessDepth(stats.totalAscensions));
    if (lastAbyssUnlockRef.current === null) { lastAbyssUnlockRef.current = unlocked; return; }
    if (unlocked > lastAbyssUnlockRef.current) setFinale(prev => ({ ...prev, abyssVariant: unlocked }));
    lastAbyssUnlockRef.current = unlocked;
  }, [finale.completed, stats.totalAscensions]);

  // ---- v1.03 achievements + Steam resync ----
  useEffect(() => {
    if (automation.autoBuy || automation.autoAscend) unlockAchievement('automation_first');
  }, [automation.autoBuy, automation.autoAscend, unlockAchievement]);
  useEffect(() => {
    challenges.completed.forEach(id => unlockAchievement(`challenge_${id}`));
    if (CHALLENGES.every(c => challenges.completed.includes(c.id))) unlockAchievement('challenge_all');
  }, [challenges.completed, unlockAchievement]);
  useEffect(() => {
    if (!finale.completed) return;
    unlockAchievement('finale_breach');
    const depth = getEndlessDepth(stats.totalAscensions);
    [5, 10, 25].forEach(tier => { if (depth >= tier) unlockAchievement(`endless_${tier}`); });
  }, [finale.completed, stats.totalAscensions, unlockAchievement]);

  // Steam is only told when an achievement is first unlocked. Saves that earned achievements while Steam was
  // not ready (or before the achievement existed on Steam) never re-sent them; that is why 18 Steam achievements
  // sat at 1.1%. Once per session, after loading and once Steam is ready: re-check all thresholds and re-send
  // every earned achievement (Steam ignores ones it already has).
  const steamAchievementSyncDoneRef = useRef(false);
  const steamAchievementSyncRef = useRef<() => void>(() => {});
  steamAchievementSyncRef.current = () => {
    if (steamAchievementSyncDoneRef.current || !loadReadyRef.current || !isSteamAvailable()) return;
    steamAchievementSyncDoneRef.current = true;
    checkAchievements(stats, resources.data.perSecond);
    achievements.forEach(a => { if (a.unlocked) unlockSteamAchievement(a.id); });
  };
  useEffect(() => {
    const intervalId = setInterval(() => {
      steamAchievementSyncRef.current();
      if (steamAchievementSyncDoneRef.current) clearInterval(intervalId);
    }, 3000);
    return () => clearInterval(intervalId);
  }, []);

  // ---- Challenge runs ----
  // Ascending while a challenge is active completes it (the Sprint only within its time limit).
  const challengeAscendRef = useRef<() => void>(() => {});
  challengeAscendRef.current = () => {
    const active = challenges.active;
    if (!active) return;
    const completed = active !== 'sprint' || elapsedTime <= CHALLENGE_SPRINT_LIMIT_SECONDS;
    setChallenges(prev => ({
      active: null,
      completed: completed && !prev.completed.includes(active) ? [...prev.completed, active] : prev.completed,
    }));
    if (completed) {
      playSound('achievement');
      setLastUpgradeInfo({
        name: l('CHALLENGE COMPLETE', 'MEYDAN OKUMA TAMAM', 'DESAFIO CONCLUÍDO', 'DESAFÍO COMPLETADO', 'ИСПЫТАНИЕ ПРОЙДЕНО'),
        effect: l('Permanent bonus unlocked', 'Kalıcı bonus açıldı', 'Bônus permanente desbloqueado', 'Bono permanente desbloqueado', 'Открыт постоянный бонус'),
      });
    }
  };

  // Restart the current run (prestige, cosmetics and stats are kept) to enter or leave a challenge.
  const restartRunForChallenge = useCallback(() => {
    setResources(prev => ({
      credits: { amount: 0, perSecond: 0, unlocked: true },
      data: { amount: 0, perSecond: 0, unlocked: true },
      silicon: { amount: 0, perSecond: 0, unlocked: false },
      interest: { amount: 0, perSecond: 0, unlocked: true },
      crypto: { amount: 0, perSecond: 0, unlocked: true },
      prestige: { ...prev.prestige },
    }));
    setUpgrades(buildAscendedUpgrades());
    setElapsedTime(0);
  }, []);

  const startChallenge = useCallback((id: ChallengeId) => {
    if (stats.totalAscensions < CHALLENGE_UNLOCK_ASCENSION || challenges.active) return;
    restartRunForChallenge();
    setChallenges(prev => ({ ...prev, active: id }));
  }, [stats.totalAscensions, challenges.active, restartRunForChallenge]);

  const abandonChallenge = useCallback(() => {
    if (!challenges.active) return;
    restartRunForChallenge();
    setChallenges(prev => ({ ...prev, active: null }));
  }, [challenges.active, restartRunForChallenge]);

  // The Sprint fails once its 30 minutes are up (the run itself continues normally).
  useEffect(() => {
    if (challenges.active !== 'sprint' || elapsedTime <= CHALLENGE_SPRINT_LIMIT_SECONDS) return;
    setChallenges(prev => ({ ...prev, active: null }));
    setLastUpgradeInfo({
      name: l('CHALLENGE FAILED', 'MEYDAN OKUMA BAŞARISIZ', 'DESAFIO FALHOU', 'DESAFÍO FALLIDO', 'ИСПЫТАНИЕ ПРОВАЛЕНО'),
      effect: l('Time limit reached', 'Süre doldu', 'Tempo esgotado', 'Tiempo agotado', 'Время вышло'),
    });
  }, [challenges.active, elapsedTime]);

  // Automation tick (every 0.5 s). Uses a ref so it always sees the latest state without restarting.
  const automationTickRef = useRef<() => void>(() => {});
  automationTickRef.current = () => {
    if (!loadReadyRef.current || stats.totalAscensions < AUTOMATION_UNLOCK_ASCENSION) return;
    if (automation.autoAscend && !pickupSpawningPaused) {
      const required = getAscensionCost(stats.totalAscensions);
      if (resources.crypto.amount >= required * automation.autoAscendMultiple && !isSpecialBoss(stats.totalAscensions)) {
        // Auto-ascend counts as a won boss fight (the loot box is still granted). Special bosses must be fought.
        ascendVictory();
        return;
      }
    }
    if (automation.autoBuy) {
      const cryptoUnlocked = (upgrades.find(u => u.id === 'unlock_crypto_mining')?.count ?? 0) > 0;
      type Option = { id: string; dataValue: number; affordable: boolean; payback: number; isCrypto: boolean };
      const options: Option[] = [];
      // Crypto is worth roughly the data/crypto production ratio (falls back to a fixed weight early on).
      const cryptoWeight = resources.crypto.perSecond > 0 ? Math.max(50, resources.data.perSecond / resources.crypto.perSecond) : 400;
      for (const u of upgrades) {
        if (u.effect.type !== 'production') continue;
        if (u.category === 'crypto_mining' && !cryptoUnlocked) continue;
        if ((u.requiredAscensions ?? 0) > stats.totalAscensions) continue;
        let affordable = true;
        let dataValue = 0;
        for (const [key, base] of Object.entries(u.baseCost) as Array<[ResourceType, number]>) {
          const cost = Math.floor((base || 0) * Math.pow(u.costMultiplier, u.count));
          if (resources[key].amount < cost) affordable = false;
          dataValue += key === 'credits' ? cost * 100 : cost;
        }
        const isCrypto = u.effect.resource === 'crypto';
        // Each level adds its own contribution (same model as getBulkProductionGain).
        const gain = getEffectiveValue({ ...u, count: u.count + 1 }) * (isCrypto ? cryptoWeight : 1);
        options.push({ id: u.id, dataValue, affordable, payback: gain > 0 ? dataValue / gain : Infinity, isCrypto });
      }
      const cheapest = (list: Option[]) => list.reduce<Option | null>((b, o) => (!b || o.dataValue < b.dataValue ? o : b), null);
      let pickId: string | null = null;
      if (automation.autoBuyMode === 'payback') {
        // Save up for the best payback item; buy it as soon as it is affordable.
        const best = options.reduce<Option | null>((b, o) => (!b || o.payback < b.payback ? o : b), null);
        if (best?.affordable) pickId = best.id;
      } else if (automation.autoBuyMode === 'crypto') {
        const cryptoTarget = cheapest(options.filter(o => o.isCrypto));
        if (cryptoTarget?.affordable) pickId = cryptoTarget.id;
        else {
          // Data miners only while they cost under 10% of the next crypto miner.
          const filler = cheapest(options.filter(o => o.affordable && !o.isCrypto && (!cryptoTarget || o.dataValue < cryptoTarget.dataValue * 0.1)));
          if (filler) pickId = filler.id;
        }
      } else {
        pickId = cheapest(options.filter(o => o.affordable))?.id ?? null;
      }
      if (pickId) buyUpgrade(pickId, 1, { silent: true });
    }
  };
  useEffect(() => {
    const intervalId = setInterval(() => automationTickRef.current(), 500);
    return () => clearInterval(intervalId);
  }, []);

  const saveGame = useCallback(async () => {
		if (!loadReadyRef.current) return;
    await saveGameState(latestSnapshotRef.current());
  }, [saveGameState]);

  const resetGame = useCallback(() => {
    loadReadyRef.current = false;
    setResources(INITIAL_STATE.resources);
    setUpgrades(INITIAL_STATE.upgrades);
    setPrestigeUpgrades(PRESTIGE_UPGRADES);
    setAchievements(ACHIEVEMENTS);
    setStats(INITIAL_STATS);
    setCosmetics(INITIAL_COSMETICS);
    setElapsedTime(0);
    timeWarpCooldownUntilRef.current = 0;
    clearComboSpawnTimeouts();
    clearAllFloatingPickupRemovalTimeouts();
    if (achievementToastTimeoutRef.current !== null) {
      clearTimeout(achievementToastTimeoutRef.current);
      achievementToastTimeoutRef.current = null;
    }
    setFloatingPickups([]);
    setNewlyUnlockedAchievement(null);
    activeComboChainSessionRef.current = null;
    comboAutoclickSpawnLockedRef.current = false;
    comboCritSpawnLockedRef.current = false;
    activeTimeWarpMiniGameRef.current = null;
    setActiveTimeWarpMiniGame(null);
    setTimeWarpFeedback(null);
    autoClickBoostEndTimeRef.current = 0;
    critBoostEndTimeRef.current = 0;
    autoClickPickupStackRef.current = 0;
    critPickupStackRef.current = 0;
    setAutoClickBoostEndTime(0);
    setCritBoostEndTime(0);
    lastUpgradePurchaseAtRef.current = Date.now();
    avgUpgradePurchaseIntervalMsRef.current = UPGRADE_PACE_BASE_INTERVAL_MS;
    timeWarpEligiblePickupStreakRef.current = 0;
    timeWarpPityThresholdRef.current = rollTimeWarpPityThreshold();
    setUpgradePaceDelayMultiplier(1);
    // v1.04: also empty the save file and the local backup copy, otherwise the reload loads the old save
    // again. Saving is blocked first so the unload flush can't write the pre-reset state back.
    // Intentionally keep BACKUP_SAVE_NAMESPACE (v3) untouched as backup.
    void storageAdapter.clear().then((ok) => {
      if (!ok) {
        // The save file could not be emptied, so the reload will bring the old save back. Say so.
        let lang = 'en';
        try { lang = localStorage.getItem('datafall-language') || 'en'; } catch { /* ignore */ }
        const msg: Record<string, string> = {
          en: 'The save file could not be reset (it may be locked by another program). Your old save will load again.',
          tr: 'Kayıt dosyası sıfırlanamadı (başka bir program kilitliyor olabilir). Eski kaydın tekrar yüklenecek.',
          'pt-BR': 'Não foi possível redefinir o arquivo de save (pode estar bloqueado por outro programa). Seu save antigo será carregado de novo.',
          es: 'No se pudo reiniciar el archivo de guardado (puede estar bloqueado por otro programa). Se cargará tu partida anterior.',
          ru: 'Не удалось сбросить файл сохранения (возможно, он занят другой программой). Старое сохранение загрузится снова.',
          'zh-CN': '无法重置存档文件（可能被其他程序占用）。将重新加载你的旧存档。',
        };
        try { window.alert(msg[lang] || msg.en); } catch { /* ignore */ }
      }
    }).finally(() => {
      // Force a reload to ensure clean state
      window.location.reload();
    });
  }, [clearComboSpawnTimeouts, clearAllFloatingPickupRemovalTimeouts]);

  const localizedUpgrades = useMemo(
    () => upgrades.map(upgrade => localizeUpgradeText(upgrade, language)),
    [upgrades, language],
  );

  const localizedPrestigeUpgrades = useMemo(
    () => prestigeUpgrades.map(upgrade => localizePrestigeUpgradeText(upgrade, language)),
    [prestigeUpgrades, language],
  );

  const localizedAchievements = useMemo(
    () => achievements.map(achievement => localizeAchievementText(achievement, language)),
    [achievements, language],
  );

  const localizedNewlyUnlockedAchievement = useMemo(
    () => (newlyUnlockedAchievement ? localizeAchievementText(newlyUnlockedAchievement, language) : null),
    [newlyUnlockedAchievement, language],
  );

  const localizedNewlyUnlockedAscensionPet = useMemo(
    () => localizeOptionalCatalogEntry(newlyUnlockedAscensionPet, language),
    [newlyUnlockedAscensionPet, language],
  );

  const localizedContracts = useMemo(
    () => ({
      ...contracts,
      activeContracts: contracts.activeContracts.map(contract => localizeContractText(contract, language)),
    }),
    [contracts, language],
  );

  const getLocalizedActiveSkin = useCallback(() => localizeCatalogEntry(getActiveSkin(), language), [getActiveSkin, language]);
  const getLocalizedActiveTheme = useCallback(() => localizeCatalogEntry(getActiveTheme(), language), [getActiveTheme, language]);
  const getLocalizedActiveAccessory = useCallback(() => localizeCatalogEntry(getActiveAccessory(), language), [getActiveAccessory, language]);
  const getLocalizedActiveCape = useCallback(() => localizeCatalogEntry(getActiveCape(), language), [getActiveCape, language]);
  const getLocalizedActiveWing = useCallback(() => localizeCatalogEntry(getActiveWing(), language), [getActiveWing, language]);
  const getLocalizedActiveHeadStyle = useCallback(() => localizeCatalogEntry(getActiveHeadStyle(), language), [getActiveHeadStyle, language]);
  const getLocalizedActivePet = useCallback(() => localizeCatalogEntry(getActivePet(), language), [getActivePet, language]);
  const getLocalizedActiveAscensionPet = useCallback(() => localizeCatalogEntry(getActiveAscensionPet(), language), [getActiveAscensionPet, language]);
  const getLocalizedActiveClickEffect = useCallback(() => localizeOptionalCatalogEntry(getActiveClickEffect(), language), [getActiveClickEffect, language]);
  const getLocalizedActiveLootBoxSkin = useCallback(() => localizeCatalogEntry(getActiveLootBoxSkin(), language), [getActiveLootBoxSkin, language]);
  const getLocalizedActiveMachineBoxSkin = useCallback(() => localizeCatalogEntry(getActiveMachineBoxSkin(), language), [getActiveMachineBoxSkin, language]);

  return { resources, upgrades: localizedUpgrades, clickResource, clickResourceBurst, buyUpgrade, sellResource, sellAllResource, playSound, lastUpgradeInfo, setLastUpgradeInfo, getUpgradePreview, addDebugData, addDebugData100k, addDebugCredits, addDebugCrypto, addDebugPrestige, addDebugAscensionCount, setDebugTime, spawnDebugPickup, spawnAllDebugPickups, forceDebugTimeWarp, getTotalCritChance, getBulkProductionGain, productionMultipliers, autoSellRate: stats.totalAscensions >= AUTO_SELL_UNLOCK_ASCENSION ? nodeSaleRate : null, masterVolume, toggleMasterVolume, musicVolume, setMusicVolume, sfxVolume, setSfxVolume, isMusicPlaying, toggleMusic, skipTrack, elapsedTime, floatingPickups, removeFloatingPickup, setPickupSpawningPaused, ascend, ascendVictory, ascendDefeat, getPrestigeGain, buyPrestigeUpgrade, buyPrestigeUpgradeMax, upgradePaceDelayMultiplier, automation, setAutomation, challenges, startChallenge, abandonChallenge, finale, completeFinale, recordFinaleDefeat, clearCoreSignal, whatsNew, markWhatsNewSeen, claimWelcomeGift, setAbyssVariant, onPickupClick, prestigeUpgrades: localizedPrestigeUpgrades, onCritPickupClick, achievements: localizedAchievements, stats, newlyUnlockedAchievement: localizedNewlyUnlockedAchievement, newlyUnlockedAscensionPet: localizedNewlyUnlockedAscensionPet, newlyUnlockedTutorialReward, claimAscensionPetUnlock, claimTutorialRewardUnlock, equipAscensionPetUnlock, claimAchievementReward, claimAllAchievements, unclaimedAchievements, autoClickBoostEndTime, critBoostEndTime, activeTimeWarpMiniGame, timeWarpFeedback, clearTimeWarpFeedback, onTimeWarpMiniGameClick, cosmetics, buyCosmetic, buyCryptoRelic, buyBlackMarketUpgrade, buyParagonUpgrade, getParagonUpgradeLevel, equipCosmetic, getActiveSkin: getLocalizedActiveSkin, getActiveTheme: getLocalizedActiveTheme, getActiveAccessory: getLocalizedActiveAccessory, getActiveCape: getLocalizedActiveCape, getActiveWing: getLocalizedActiveWing, getActiveHeadStyle: getLocalizedActiveHeadStyle, getActivePet: getLocalizedActivePet, getActiveAscensionPet: getLocalizedActiveAscensionPet, getActiveClickEffect: getLocalizedActiveClickEffect, getActiveLootBoxSkin: getLocalizedActiveLootBoxSkin, getActiveMachineBoxSkin: getLocalizedActiveMachineBoxSkin, getPetBoosts, getAdjacencyFormationBonus, getDataPerClick, offlineProgress, clearOfflineProgress, contracts: localizedContracts, refreshContracts, updateContractProgress, claimContractReward, roomLayout, updateMachinePosition, removeMachinePosition, getMachinePosition, tutorial, startTutorial, skipTutorial, resetTutorial, completeTutorialObjective, getCurrentTutorialPhase, isTutorialComplete, saveGame, resetGame, setFullscreen, setWindowed, saveLoadError, retrySaveLoad, continueWithoutUnreadableSave, openSaveFolder };
};

