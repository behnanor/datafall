import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { unlockSteamAchievement, saveToSteamCloud, loadFromSteamCloud, isSteamAvailable } from './steamIntegration';
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
    type: 'production' | 'click' | 'click_multiplier' | 'crit_chance' | 'crit_multiplier' | 'unlock' | 'interest_boost';
    resource?: ResourceType;
    value: number;
    unlocksCategory?: 'fabrication' | 'crypto_mining' | 'click_upgrades';
  };
  count: number;
  costMultiplier: number;
  category: 'fabrication' | 'crypto_mining' | 'click_upgrades';
  unlockedCategory?: 'click_upgrades' | 'crypto_mining';
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
const MAX_FLOATING_PICKUPS = 20;
const FLOATING_PICKUP_LIFETIME_MS = 15000;

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
};


export interface TutorialState {
  started?: boolean;
  skipped: boolean;
  currentPhase: number;
  completedObjectives: string[];
}

const TUTORIAL_PHASES: TutorialPhase[] = [
  { title: 'Boot Sequence', description: 'Learn click controls, camera zoom, and camera pan.' },
  { title: 'Expansion', description: 'Buy your first upgrade and convert data into nodes.' },
  { title: 'Prestige', description: 'Open the Prestige Shop to review long-run progression.' },
  { title: 'Cosmetics', description: 'Open the Cosmetics Market to explore customization.' },
  { title: 'Ascension', description: 'Open the Ascend window and review what will reset.\nTip: You can collapse or expand this panel with the arrow button.' },
];

const TUTORIAL_OBJECTIVES: Array<{ objectives: TutorialObjective[] }> = [
  {
    objectives: [
      { id: 'click_core', text: 'Click to generate your first resources.' },
      { id: 'right_click_core', text: 'Right-click also works. Try a right-click on the core.' },
      { id: 'camera_zoom', text: 'Use the mouse wheel (middle scroll) to zoom the camera.' },
      { id: 'camera_pan', text: 'Hold middle mouse button and drag to move the camera.' },
    ],
  },
  {
    objectives: [
      { id: 'buy_first_upgrade', text: 'Buy your first upgrade.' },
      { id: 'convert_data', text: 'Convert data into nodes using the Convert controls.' },
    ],
  },
  {
    objectives: [
      { id: 'view_prestige', text: 'Open the Prestige Shop.' },
    ],
  },
  {
    objectives: [
      { id: 'open_cosmetics', text: 'Open the Cosmetics Market.' },
    ],
  },
  {
    objectives: [
      { id: 'open_ascend', text: 'Open the Ascend window (check reset rewards and requirements).\nTip: This tutorial panel can be collapsed or expanded with the arrow.' },
    ],
  },
];

const INITIAL_TUTORIAL: TutorialState = {
  started: false,
  skipped: false,
  currentPhase: 0,
  completedObjectives: [],
};

const CLICK_UPGRADE_DISCOUNT_RATE = 0.15;
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

const INITIAL_STATE = {
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
      name: 'Botnet Node',
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
    // Click Upgrades - Unlock Crypto Mining
    {
      id: 'unlock_crypto_mining',
      name: 'Mining Protocol Access',
      description: 'Establish connection to decentralized mining networks.',
      cost: { data: 5000, credits: 200 },
      baseCost: { data: 5000, credits: 200 },
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
    }
  ] as Upgrade[],
};

// Calculate checkpoint multiplier
const getCheckpointMultiplier = (count: number, category?: string): number => {
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
  const nextCheckpoint = Math.ceil(count / interval) * interval;
  const currentInCycle = ((count - 1) % interval) + 1;
  return { current: currentInCycle, max: interval, nextCheckpoint };
};

// Get effective upgrade value with new mechanics:
// - Production/interest: First level is base value, then each level adds 10% of base value
// - Click / crit chance / crit multiplier: Linear progression by level count
// - Every checkpoint applies the global checkpoint multiplier
const getEffectiveValue = (upgrade: Upgrade): number => {
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
  
  const finalValue = valuePerLevel * Math.pow(3, checkpointsPassed);
  
  return finalValue;
};

// Ascension reset rules:
// - Keep click upgrades category unlocked after first ascension.
// - Reset Zero-Day Payload to level 1 so crit chance bonus is recalculated from low baseline.
const buildAscendedUpgrades = (): Upgrade[] => {
  return (INITIAL_STATE.upgrades as Upgrade[]).map(upgrade => {
    const count =
      upgrade.id === 'unlock_click_upgrades' ? 1 :
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
  type: 'data' | 'credits' | 'crit' | 'autoclick';
  value: number;
}

export interface PrestigeUpgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  costMultiplier: number;
  maxLevel: number;
  effect: { type: 'click_boost' | 'production_boost' | 'crit_chance_boost' | 'interest_boost' | 'luck_boost' | 'crit_mult_boost' | 'prestige_mult' | 'cost_reduction' | 'crypto_boost' | 'starting_bonus' | 'offline_boost' | 'offline_time' | 'checkpoint_speed' | 'sell_boost' | 'pickup_value'; value: number };
  count: number;
}

// Calculate ascension cost based on number of ascensions completed
// First ascension costs 1000 crypto, scales up with each ascension
export const getAscensionCost = (ascensionCount: number): number => {
  const baseCost = 1000;
  // Each ascension increases cost by 50%
  return Math.floor(baseCost * Math.pow(1.5, ascensionCount));
};

// More crypto = exponentially more prestige rewards
// Formula: floor(10 * log2(1 + crypto)) + floor(crypto^0.12)
export const calculatePrestigeGain = (crypto: number, ascensionCount: number = 0): number => {
  const requiredCrypto = getAscensionCost(ascensionCount);
  if (crypto < requiredCrypto) return 0;
  
  // Base gain formula
  const baseGain = Math.floor(10 * Math.log2(1 + crypto)) + Math.floor(Math.pow(crypto, 0.12));
  
  // Apply 10x multiplier ONLY for ascension
  return baseGain * 10;
};

const PRESTIGE_UPGRADES: PrestigeUpgrade[] = [
  // Tier 1 - Cheap, high caps (40-50) - Foundation upgrades
  { id: 'p_click', name: 'Eternal Strike', description: '+5% click power per level.', cost: 25, costMultiplier: 1.15, maxLevel: 50, effect: { type: 'click_boost', value: 0.05 }, count: 0 },
  { id: 'p_prod', name: 'Legacy Production', description: '+5% production rate per level.', cost: 30, costMultiplier: 1.18, maxLevel: 40, effect: { type: 'production_boost', value: 0.05 }, count: 0 },
  { id: 'p_starting', name: 'Head Start', description: '+100 starting data per level.', cost: 20, costMultiplier: 1.12, maxLevel: 50, effect: { type: 'starting_bonus', value: 100 }, count: 0 },
  
  // Tier 2 - Medium cost, medium caps (25-35) - Specialization
  { id: 'p_crit', name: 'Cursed Fate', description: '+0.5% crit chance per level.', cost: 50, costMultiplier: 1.2, maxLevel: 30, effect: { type: 'crit_chance_boost', value: 0.005 }, count: 0 },
  { id: 'p_crit_mult', name: 'Lethal Precision', description: '+8% crit damage per level.', cost: 60, costMultiplier: 1.22, maxLevel: 25, effect: { type: 'crit_mult_boost', value: 0.08 }, count: 0 },
  { id: 'p_luck', name: 'Fortune Protocol', description: '+3% pickup drop chance.', cost: 45, costMultiplier: 1.18, maxLevel: 35, effect: { type: 'luck_boost', value: 0.03 }, count: 0 },
  { id: 'p_pickup', name: 'Scavenger Network', description: '+10% pickup value per level.', cost: 48, costMultiplier: 1.19, maxLevel: 30, effect: { type: 'pickup_value', value: 0.1 }, count: 0 },
  
  // Tier 3 - Expensive, low caps (15-20) - Mastery
  { id: 'p_sell', name: 'Market Arbitrage', description: '+4% data conversion efficiency per level.', cost: 110, costMultiplier: 1.28, maxLevel: 20, effect: { type: 'sell_boost', value: 0.04 }, count: 0 },
  { id: 'p_prestige', name: 'Ascension Catalyst', description: '+4% prestige gain per level.', cost: 150, costMultiplier: 1.35, maxLevel: 15, effect: { type: 'prestige_mult', value: 0.04 }, count: 0 },
  { id: 'p_offline', name: 'Passive Matrix', description: '+5% offline earnings per level.', cost: 90, costMultiplier: 1.28, maxLevel: 20, effect: { type: 'offline_boost', value: 0.05 }, count: 0 },
  
  // Tier 4 - Very Expensive, very low caps (5-10) - Endgame
  { id: 'p_crypto', name: 'Chain Singularity', description: '+12% crypto production per level.', cost: 210, costMultiplier: 1.52, maxLevel: 10, effect: { type: 'crypto_boost', value: 0.12 }, count: 0 },
  { id: 'p_mega_prod', name: 'Quantum Forge', description: '+15% all production per level.', cost: 250, costMultiplier: 1.6, maxLevel: 8, effect: { type: 'production_boost', value: 0.15 }, count: 0 },
  { id: 'p_mega_crit', name: 'Fatal Algorithm', description: '+25% crit damage per level.', cost: 300, costMultiplier: 1.7, maxLevel: 6, effect: { type: 'crit_mult_boost', value: 0.25 }, count: 0 },
  { id: 'p_mega_prestige', name: 'Transcendence Core', description: '+10% prestige gain per level.', cost: 500, costMultiplier: 2.0, maxLevel: 5, effect: { type: 'prestige_mult', value: 0.1 }, count: 0 },
  // Premium offline upgrade: level 5 reaches 8h total cap (base 2h + 6h).
  { id: 'p_offline_window', name: 'Chrono Vault', description: '+1.2h max offline progression per level.', cost: 1200, costMultiplier: 2.25, maxLevel: 5, effect: { type: 'offline_time', value: 4320 }, count: 0 },
];

const BASE_MAX_OFFLINE_TIME_SECONDS = 2 * 60 * 60;
const getMaxOfflineTimeSeconds = (savedPrestigeUpgrades: Array<any>): number => {
  let extraSeconds = 0;
  savedPrestigeUpgrades.forEach((upgrade: any) => {
    if (upgrade?.count > 0 && upgrade?.effect?.type === 'offline_time') {
      extraSeconds += upgrade.effect.value * upgrade.count;
    }
  });
  return Math.max(BASE_MAX_OFFLINE_TIME_SECONDS, Math.floor(BASE_MAX_OFFLINE_TIME_SECONDS + extraSeconds));
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
}

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
};

// Contract NPCs - Cyberpunk characters that give missions
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
  const ascendTiers = [1, 2, 5, 10, 25, 50];
  const ascendNames = ['Transcendence', 'Reborn', 'Cycle Begun', 'Eternal Cycle', 'Ascension Adept', 'Ascension Master'];
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
  
  achievements.push(...secretAchievements);
  
  // Add claimed: false to all achievements
  return achievements.map(a => ({ ...a, claimed: false }));
};

const ACHIEVEMENTS: Achievement[] = generateTieredAchievements();

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
    boost: { productionBoost: 3, cryptoBoost: 2, interestBoost: 1 }
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

export const CRYPTO_RELIC_SHOP_UNLOCK_ASCENSION = 10;

export const CRYPTO_RELIC_TREE: CryptoRelicNode[] = [
  {
    id: 'relic_node_body',
    name: 'Luminous Core',
    description: 'Unlocks the relic body and scales linearly with every upgrade.',
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
    description: 'Head relic branch with balanced linear scaling.',
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
    description: 'Final relic branch with premium but controlled scaling.',
    slot: 'wing',
    cosmeticId: 'relic_quantum_wings',
    cost: 18000000,
    costLinearScale: 0.45,
    requires: ['relic_node_head'],
    perLevelBoost: { productionBoost: 2.6, clickBoost: 2.1, critBoost: 0.45, cryptoBoost: 1.8, interestBoost: 0.25 },
  },
];

export const getCryptoRelicUpgradeCost = (node: CryptoRelicNode, currentLevel: number): number => {
  const safeLevel = Math.max(0, Math.floor(currentLevel));
  return Math.max(1, Math.floor(node.cost * (1 + node.costLinearScale * safeLevel)));
};

export interface PetBoost {
  productionBoost?: number;
  clickBoost?: number;
  critBoost?: number;
  cryptoBoost?: number;
  interestBoost?: number;
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
    description: '+3% Production Rate',
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
    description: '+3% Crit Chance',
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
    boost: { productionBoost: 2, clickBoost: 2, critBoost: 2 },
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
    description: '+3% Production, +2% Crit - Purple cosmic gradient',
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
    description: '+6% All Stats - Dark void gradient',
    price: 400,
    currency: 'ascension',
    rarity: 'legendary',
    palette: { primary: '#1e293b', secondary: '#0f172a', glow: 'rgba(30, 41, 59, 0.8)', accent: '#475569' },
    boost: { productionBoost: 12, clickBoost: 12, critBoost: 12, cryptoBoost: 12 },
    paletteMode: 'gradient',
    gradientColors: ['#1e293b', '#312e81', '#1e1b4b', '#1e293b'],
    ascensionRequirement: 5
  },
  {
    id: 'asc_prismatic',
    name: 'Prismatic Entity',
    description: '+8% Production, +8% Crypto - Rainbow shimmer',
    price: 600,
    currency: 'ascension',
    rarity: 'legendary',
    palette: { primary: '#f472b6', secondary: '#06b6d4', glow: 'rgba(244, 114, 182, 0.6)', accent: '#a78bfa' },
    boost: { productionBoost: 8, cryptoBoost: 8 },
    paletteMode: 'animated',
    gradientColors: ['#ef4444', '#f97316', '#fbbf24', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899', '#ef4444'],
    animationSpeed: 4,
    ascensionRequirement: 5
  },
  {
    id: 'asc_transcendent',
    name: 'Transcendent Being',
    description: '+10% All Stats - Pure light radiance',
    price: 1000,
    currency: 'ascension',
    rarity: 'legendary',
    palette: { primary: '#f0f9ff', secondary: '#bae6fd', glow: 'rgba(240, 249, 255, 0.9)', accent: '#7dd3fc' },
    boost: { productionBoost: 10, clickBoost: 10, critBoost: 10, cryptoBoost: 10 },
    paletteMode: 'animated',
    gradientColors: ['#f0f9ff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#bae6fd', '#e0f2fe', '#f0f9ff'],
    animationSpeed: 3,
    ascensionRequirement: 5
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
    description: '+8% All Stats',
    price: 425,
    currency: 'ascension',
    rarity: 'legendary',
    boost: { productionBoost: 8, clickBoost: 8, critBoost: 8, cryptoBoost: 8 },
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
    description: '+10% All Stats',
    price: 550,
    currency: 'ascension',
    rarity: 'legendary',
    type: 'headphones',
    boost: { productionBoost: 10, clickBoost: 10, critBoost: 10, cryptoBoost: 10 },
    ascensionRequirement: 10
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

export const BLACK_MARKET_UNLOCK_ASCENSION = 25;

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
    price: 680,
    currency: 'ascension',
    rarity: 'legendary',
    boost: { productionBoost: 8, clickBoost: 6, critBoost: 4, cryptoBoost: 4 },
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
    price: 720,
    currency: 'ascension',
    rarity: 'legendary',
    boost: { productionBoost: 6, clickBoost: 6, critBoost: 5, cryptoBoost: 4 },
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
    price: 875,
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
    description: '+10% All Stats - Ultimate weapon in orbit',
    price: 1000,
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
    boost: { productionBoost: 10, clickBoost: 10, critBoost: 10, cryptoBoost: 10 },
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
}

export type LootBoxReward =
  | {
      kind: 'cosmetic';
      cosmeticType: LootCosmeticType;
      itemId: string;
      itemName: string;
      rarity: LootRarity;
      isAscensionItem: boolean;
    }
  | {
      kind: 'fallback';
      data: number;
      credits: number;
      crypto: number;
    };

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
  // Luck from equipped loot crate + miner skin shifts probability upward.
  // Base: 3% legendary, 12% epic, 85% rare.
  const luck = Math.max(0, luckBonusPercent);
  const legendaryChance = Math.min(0.25, 0.03 + luck * 0.006);
  const epicOnlyChance = Math.min(0.65 - legendaryChance, 0.12 + luck * 0.018);
  const roll = Math.random();
  if (roll < legendaryChance) return 'legendary';
  if (roll < legendaryChance + epicOnlyChance) return 'epic';
  return 'rare';
};

const buildLootboxCandidates = (cosmetics: CosmeticsState): LootDropCandidate[] => {
  const candidates: LootDropCandidate[] = [];

  const ownedSkins = new Set<string>([...cosmetics.ownedSkins, ...cosmetics.ownedAscensionSkins]);
  const ownedThemes = new Set<string>([...cosmetics.ownedThemes, ...cosmetics.ownedAscensionThemes]);
  const ownedAccessories = new Set<string>([...cosmetics.ownedAccessories, ...cosmetics.ownedAscensionAccessories]);
  const ownedHeadStyles = new Set<string>([...cosmetics.ownedHeadStyles, ...cosmetics.ownedAscensionHeadStyles]);
  const ownedPets = new Set<string>([...cosmetics.ownedPets, ...cosmetics.ownedAscensionPets]);
  const ownedClickEffects = new Set<string>(cosmetics.ownedClickEffects);
  const ownedLootBoxSkins = new Set<string>(cosmetics.ownedLootBoxSkins);
  const ownedMachineBoxSkins = new Set<string>(cosmetics.ownedMachineBoxSkins);

  const addItems = <T extends { id: string; name: string; rarity: LootRarity; price: number; isRelicShopOnly?: boolean }>(
    items: T[],
    cosmeticType: LootCosmeticType,
    ownedSet: Set<string>,
    isAscensionCatalogItem: boolean = false
  ) => {
    items.forEach(item => {
      if (item.price <= 0) return;
      if (item.isRelicShopOnly) return;
      if (ownedSet.has(item.id)) return;
      candidates.push({
        cosmeticType,
        id: item.id,
        name: item.name,
        rarity: item.rarity,
        isAscensionCatalogItem,
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
    if (ownedClickEffects.has(effect.id)) return;
    candidates.push({
      cosmeticType: 'clickeffect',
      id: effect.id,
      name: effect.name,
      rarity: effect.rarity,
      isAscensionCatalogItem: false,
    });
  });

  LOOT_BOX_SKINS.forEach(boxSkin => {
    if (!boxSkin.isLootBoxExclusive) return;
    if (ownedLootBoxSkins.has(boxSkin.id)) return;
    candidates.push({
      cosmeticType: 'boxskin',
      id: boxSkin.id,
      name: boxSkin.name,
      rarity: boxSkin.rarity,
      isAscensionCatalogItem: false,
    });
  });

  MACHINE_BOX_SKINS.forEach(machineSkin => {
    if (!machineSkin.canDropFromLootBox) return;
    if (machineSkin.price <= 0) return;
    if (ownedMachineBoxSkins.has(machineSkin.id)) return;
    candidates.push({
      cosmeticType: 'machineboxskin',
      id: machineSkin.id,
      name: machineSkin.name,
      rarity: machineSkin.rarity,
      isAscensionCatalogItem: false,
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
    interestBoost: (boost.interestBoost || 0) * multiplier,
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


const GAME_EDITION = import.meta.env.VITE_GAME_EDITION === 'demo' ? 'demo' : 'full';
const IS_DEMO_MODE = GAME_EDITION === 'demo';

const SAVE_NAMESPACE = IS_DEMO_MODE ? 'cyberpunk_clicker_demo_save_v1' : 'cyberpunk_clicker_save_v8';
const SAVE_KEY = SAVE_NAMESPACE;
const PREVIOUS_SAVE_NAMESPACE = IS_DEMO_MODE ? 'cyberpunk_clicker_demo_save_v0' : 'cyberpunk_clicker_save_v7';
const BACKUP_SAVE_NAMESPACE = IS_DEMO_MODE ? 'cyberpunk_clicker_demo_save_v1_backup' : 'cyberpunk_clicker_save_v3';

// Steam Cloud Configuration
// When running as Steam game via Electron, saves go to:
// - Full: %USERPROFILE%/AppData/Local/DataFall/save.json
// - Demo: %USERPROFILE%/AppData/Local/DataFall Demo/save.json
// The Electron main process handles file I/O and syncs with Steam Cloud
const STEAM_SAVE_PATH = IS_DEMO_MODE ? 'DataFall Demo' : 'DataFall'; // Folder name in AppData/Local
const STEAM_SAVE_FILE = 'save.json';

// Check if running in Electron/Steam environment
const isElectronEnvironment = (): boolean => {
  return typeof window !== 'undefined' && 
    (window as unknown as { electronAPI?: unknown }).electronAPI !== undefined;
};

// Storage abstraction for browser (localStorage) vs Steam (Steam Cloud via Electron main process)
// - Browser: localStorage under SAVE_KEY
// - Steam/Electron: IPC to main process which writes under %LOCALAPPDATA%/<Game Name>/save.json and syncs Steam Cloud

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
}

const storageAdapter = {
  save: async (data: SaveData): Promise<boolean> => {
    try {
      const payload: SaveData = { ...data, saveNamespace: SAVE_NAMESPACE };

      // Always keep a quick local fallback. This helps with crashes / Alt+F4 where async Steam IPC may not finish.
      try {
        const saveString = JSON.stringify(payload);
        localStorage.setItem(SAVE_KEY, saveString);
      } catch {
        // ignore localStorage errors (quota / disabled)
      }

      if (isSteamAvailable()) {
        // Steam path: main process handles disk + Steam Cloud
        const ok = await saveToSteamCloud(payload);
        console.log('[Save] Steam save:', ok ? 'OK' : 'FAIL');
        return !!ok;
      }

      // Browser-only path (localStorage already written above)
      return true;
    } catch (e: any) {
      console.log('[Save] save error:', e?.message || e);
      return false;
    }
  },


  load: async (): Promise<SaveData | null> => {
    try {
      // One-way cleanup: drop previous namespace while keeping v3 backup untouched.
      try {
        localStorage.removeItem(PREVIOUS_SAVE_NAMESPACE);
      } catch {
        // ignore localStorage errors
      }

      const normalizeLoaded = (value: any): SaveData | null => {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        if (!parsed || typeof parsed !== 'object') return null;
        const data = parsed as SaveData;
        // Hard-cut old save slots (local + cloud) after namespace bump.
        if (data.saveNamespace !== SAVE_NAMESPACE) return null;
        return data;
      };

      if (isSteamAvailable()) {
        const loaded = await loadFromSteamCloud();
        if (!loaded) return null;
        // Main process may return object or JSON string
        return normalizeLoaded(loaded);
      }

      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return normalizeLoaded(raw);
    } catch (e: any) {
      console.log('[Save] load error:', e?.message || e);
      return null;
    }
  },

  clear: async (): Promise<boolean> => {
    try {
      localStorage.removeItem(SAVE_KEY);
      // Current namespace can be cleared safely; keep original v3 as backup.
      localStorage.removeItem(PREVIOUS_SAVE_NAMESPACE);
      if (isSteamAvailable()) {
        // Best-effort: overwrite with null so cloud doesn't resurrect old data
        await saveToSteamCloud(null);
      }
      return true;
    } catch {
      return false;
    }
  }
};

export interface OfflineProgress {
  timeAway: number;
  dataEarned: number;
  creditsEarned: number;
  cryptoEarned: number;
  maxTime?: number;
}


export const useGame = () => {
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
  const [autoClickBoostEndTime, setAutoClickBoostEndTime] = useState<number>(0);
  const [critBoostEndTime, setCritBoostEndTime] = useState<number>(0);
  const lastTick = useRef(Date.now());
  const lastClickTime = useRef<number>(0);
  const CLICK_COOLDOWN_MS = 59; // ~17 clicks/sec max
  const upgradesRef = useRef(upgrades);

  // Keep upgradesRef in sync with upgrades state
  useEffect(() => {
    upgradesRef.current = upgrades;
  }, [upgrades]);

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
  const [pendingAscensionPetUnlocks, setPendingAscensionPetUnlocks] = useState<string[]>([]);
  const [cosmetics, setCosmetics] = useState<CosmeticsState>(INITIAL_COSMETICS);
  const [contracts, setContracts] = useState<ContractsState>(INITIAL_CONTRACTS);
  const [roomLayout, setRoomLayout] = useState<RoomLayout>(INITIAL_ROOM_LAYOUT);
  const [tutorial, setTutorial] = useState<TutorialState>(INITIAL_TUTORIAL);
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

  const activeCosmeticBoosts = useMemo<Required<PetBoost>>(() => {
    const total: Required<PetBoost> = {
      productionBoost: 0,
      clickBoost: 0,
      critBoost: 0,
      cryptoBoost: 0,
      interestBoost: 0,
    };

    const addBoost = (boost?: PetBoost) => {
      if (!boost) return;
      total.productionBoost += boost.productionBoost || 0;
      total.clickBoost += boost.clickBoost || 0;
      total.critBoost += boost.critBoost || 0;
      total.cryptoBoost += boost.cryptoBoost || 0;
      total.interestBoost += boost.interestBoost || 0;
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
  }, [
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

  // Save helper used by autosave + manual save
  const saveGameState = useCallback(async (data: SaveData): Promise<boolean> => {
    if (!loadReadyRef.current) return false;
    return await storageAdapter.save(data);
  }, []);
const applyLoadedState = useCallback((base: SaveData) => {
    // Apply every slice we actually use.
    const baseResources = base.resources || INITIAL_STATE.resources;
    const baseStats = base.stats || INITIAL_STATS;

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
          const savedUpgrades = (base.upgrades || []) as any[];

          let dataPerSecond = 0;
          let creditsPerSecond = 0;
          let cryptoPerSecond = 0;

          savedUpgrades.forEach((u: any) => {
            if (u?.count > 0 && u?.effect?.type === 'production' && u?.effect?.resource) {
              const baseValue = u.effect.value;
              const interval = getCheckpointInterval(u.category);
              const checkpointsPassed = Math.floor(u.count / interval);
              const valuePerLevel = baseValue * (1 + 0.1 * (u.count - 1));
              const finalValue = valuePerLevel * Math.pow(3, checkpointsPassed);

              if (u.effect.resource === 'data') dataPerSecond += finalValue;
              else if (u.effect.resource === 'credits') creditsPerSecond += finalValue;
              else if (u.effect.resource === 'crypto') cryptoPerSecond += finalValue;
            }
          });

          let productionBoost = 1;
          savedPrestigeUpgrades.forEach((p: any) => {
            if (p?.count > 0 && p?.effect?.type === 'production_boost') {
              productionBoost += p.effect.value * p.count;
            }
            if (p?.count > 0 && p?.effect?.type === 'offline_boost') {
              productionBoost += p.effect.value * p.count;
            }
          });

          const offlineEfficiency = 0.5;
          const dataEarned = Math.floor(dataPerSecond * effectiveTime * productionBoost * offlineEfficiency);
          const creditsEarned = Math.floor(creditsPerSecond * effectiveTime * productionBoost * offlineEfficiency);
          const cryptoEarned = Math.floor(cryptoPerSecond * effectiveTime * productionBoost * offlineEfficiency);

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
    setAchievements(base.achievements || ACHIEVEMENTS);
    setStats(statsToApply);
    setCosmetics(migrateCosmetics(base.cosmetics));
    setContracts(base.contracts || INITIAL_CONTRACTS);
    setRoomLayout(migrateRoomLayout(base.roomLayout));
    setTutorial(base.tutorial || INITIAL_TUTORIAL);
    setElapsedTime(base.elapsedTime || 0);
    setMasterVolume(base.masterVolume ?? true);
    setMusicVolume(base.musicVolume ?? 0.2);
    setSfxVolume(base.sfxVolume ?? 0.5);
    setIsMusicPlaying(base.isMusicPlaying ?? true);
  }, []);

  // Async load: run once on mount, apply loaded data, then unblock saving.
// IMPORTANT: Steam IPC can become "available" a moment AFTER the first render.
// If we load too early, we miss Steam Cloud and the game starts fresh, then autosave overwrites.
// So in Electron, if first load returns null, we retry briefly once Steam becomes available.
useEffect(() => {
  let cancelled = false;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  (async () => {
    try {
      // 1) First attempt (works for browser + already-ready Steam)
      let loaded = await storageAdapter.load();
      console.log('[Save] Loaded:', !!loaded, loaded ? 'OK' : 'null');

      // 2) Electron/Steam: if not loaded yet, wait a bit for Steam to finish connecting,
      // then retry Steam Cloud once more BEFORE enabling autosave.
      if (!loaded && isElectronEnvironment()) {
        const t0 = Date.now();
        while (!cancelled && !isSteamAvailable() && Date.now() - t0 < 5000) {
          await sleep(200);
        }

        if (!cancelled && isSteamAvailable()) {
          loaded = await storageAdapter.load();
          console.log('[Save] Loaded (retry after Steam ready):', !!loaded, loaded ? 'OK' : 'null');
        }
      }

      if (!cancelled && loaded) {
        applyLoadedState(loaded as SaveData);
      }
    } catch (e: any) {
      console.log('[Save] load failed:', e?.message || e);
    } finally {
      if (!cancelled) setLoadReady(true);
    }
  })();

  return () => {
    cancelled = true;
  };
}, [applyLoadedState]);

  
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

  // Cyberpunk-themed sounds
  const playSound = useCallback((type: 'click' | 'buy_fab' | 'buy_black' | 'sell' | 'crit' | 'checkpoint' | 'achievement' | 'pickup' | 'job_claim' | 'boss_hit' | 'weakspot_hit' | 'ascend_available' | 'prestige_realm' | 'loot_open' | 'loot_reveal_rare' | 'loot_reveal_epic' | 'loot_reveal_legendary' | 'loot_reveal_fallback') => {
    const ctx = getAudioContext();
    if (!ctx || sfxVolume === 0 || !masterVolume) return;

    const vol = sfxVolume;

    if (type === 'click') {
      // Sharp digital click - two quick beeps
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(1200, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.06);
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
      osc2.frequency.setValueAtTime(900, ctx.currentTime + 0.08);
      osc2.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.13);
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
          setTimeout(() => setNewlyUnlockedAchievement(null), 4000);
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
          setTimeout(() => setNewlyUnlockedAchievement(null), 4000);
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

  // Game Loop
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const delta = (now - lastTick.current) / 1000;
      lastTick.current = now;

      let dataProducedThisTick = 0;
      let creditsProducedThisTick = 0;
      let cryptoProducedThisTick = 0;

      setResources(prev => {
        const next = { ...prev };
        
        (Object.keys(next) as ResourceType[]).forEach(key => {
            next[key].perSecond = 0;
        });
        
        // Calculate prestige production multiplier
        let productionMultiplier = 1;
        let cryptoMultiplier = 1;
        prestigeUpgrades.forEach(p => {
          if (p.count > 0 && p.effect.type === 'production_boost') {
            productionMultiplier += p.effect.value * p.count;
          }
          if (p.count > 0 && p.effect.type === 'crypto_boost') {
            cryptoMultiplier += p.effect.value * p.count;
          }
        });
        
        // Apply active cosmetic boosts (skin/theme/accessory/headstyle/pets).
        productionMultiplier *= (1 + activeCosmeticBoosts.productionBoost / 100);
        cryptoMultiplier *= (1 + activeCosmeticBoosts.cryptoBoost / 100);
        if (activeAdjacencyProductionBoost > 0) {
          productionMultiplier *= (1 + activeAdjacencyProductionBoost);
        }
        if (activeAdjacencyCryptoBoost > 0) {
          cryptoMultiplier *= (1 + activeAdjacencyCryptoBoost);
        }
        
        upgrades.forEach(u => {
          if (u.effect.type === 'production' && u.effect.resource) {
            // Sum each individual upgrade instance at its respective level
            let totalProduction = 0;
            for (let i = 1; i <= u.count; i++) {
              const individualUpgrade = { ...u, count: i };
              totalProduction += getEffectiveValue(individualUpgrade);
            }
            // Apply crypto multiplier for crypto production, general multiplier for others
            const resourceMultiplier = u.effect.resource === 'crypto' 
              ? productionMultiplier * cryptoMultiplier 
              : productionMultiplier;
            const productionRate = totalProduction * resourceMultiplier;
            const production = productionRate * delta;
            next[u.effect.resource].amount += production;
            next[u.effect.resource].perSecond += productionRate;
            // Track production for stats
            if (u.effect.resource === 'data') {
              dataProducedThisTick += production;
            } else if (u.effect.resource === 'credits') {
              creditsProducedThisTick += production;
            } else if (u.effect.resource === 'crypto') {
              cryptoProducedThisTick += production;
            }
          }
        });

        // Interest is now passive - no automatic crypto generation from credits
        // Crypto is only earned through selling data and specific upgrades
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
    }, 100); 

    return () => clearInterval(interval);
  }, [upgrades, prestigeUpgrades, activeCosmeticBoosts.productionBoost, activeCosmeticBoosts.cryptoBoost, activeAdjacencyProductionBoost, activeAdjacencyCryptoBoost]);

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
    if (activeAdjacencyClickBoost > 0) {
      baseClick *= (1 + activeAdjacencyClickBoost);
    }
    return baseClick * multiplier;
  }, [upgrades, prestigeUpgrades, activeCosmeticBoosts.clickBoost, activeAdjacencyClickBoost]);

  // Auto-spawn floating pickups every 10-35 seconds.
  useEffect(() => {
    if (pickupSpawningPaused) return;

    const scheduleNextPickup = () => {
      const delay = 10000 + Math.random() * 25000; // 10-35 seconds in ms
      return setTimeout(() => {
        // Random position in the visible area (avoiding edges)
        const x = 100 + Math.random() * (window.innerWidth - 200);
        const y = 100 + Math.random() * (window.innerHeight - 200);
        
        // Random type with weighted distribution:
        // autoclick 20%, data 30%, credits 35%, crit 15%.
        const rand = Math.random();
        const pickupType: 'data' | 'credits' | 'crit' | 'autoclick' = 
          rand < 0.20 ? 'autoclick' :
          rand < 0.50 ? 'data' :
          (rand < 0.85 ? 'credits' : 'crit');
        
        // Data pickup scales from both passive production and active click power.
        // This keeps data pickups useful for click-focused builds.
        let value = 0;
        if (pickupType === 'data') {
          const productionComponent = resources.data.perSecond * 0.5;
          const clickComponent = getCurrentDataPerClick() * 6;
          value = Math.max(10, Math.floor(productionComponent + clickComponent));
        } else if (pickupType === 'credits') {
          // Keep early value at 5, then scale slowly with run progression.
          const baseCredits = 5;
          const dataProgressBonus = Math.floor(Math.sqrt(Math.max(0, stats.totalDataCollected)) / 500);
          const upgradeProgressBonus = Math.floor(stats.totalUpgradesPurchased / 20);
          const productionComponent = Math.floor(resources.credits.perSecond * 0.35);
          value = Math.max(baseCredits, baseCredits + dataProgressBonus + upgradeProgressBonus + productionComponent);
        } else if (pickupType === 'autoclick') {
          value = 8; // 8 seconds of auto-click
        }
        
        const id = `auto-${Date.now()}-${Math.random()}`;
        setFloatingPickups(prev => {
          const updated = [...prev, { id, x, y, type: pickupType, value }];
          // Keep only the most recent pickups to prevent memory leak
          return updated.slice(-MAX_FLOATING_PICKUPS);
        });
        
        // Auto-remove after lifetime if not clicked
        setTimeout(() => {
          setFloatingPickups(prev => prev.filter(p => p.id !== id));
        }, FLOATING_PICKUP_LIFETIME_MS);
        
        // Schedule next pickup
        timeoutRef.current = scheduleNextPickup();
      }, delay);
    };
    
    const timeoutRef = { current: scheduleNextPickup() };
    
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [resources.data.perSecond, resources.credits.perSecond, getCurrentDataPerClick, pickupSpawningPaused, stats.totalDataCollected, stats.totalUpgradesPurchased]);

  useEffect(() => {
    if (!pickupSpawningPaused) return;
    setFloatingPickups([]);
  }, [pickupSpawningPaused]);

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

  // Check threshold-based contracts whenever resources change (not on interval)
  useEffect(() => {
    // Update immediately when production changes
    updateContractProgress('reach_production', resources.data.perSecond);
  }, [resources.data.perSecond, updateContractProgress]);

  useEffect(() => {
    // Update immediately when data amount changes
    updateContractProgress('maintain_resources', resources.data.amount);
  }, [resources.data.amount, updateContractProgress]);

  const clickResource = useCallback((type: ResourceType, x?: number, y?: number, options?: { timestamp?: number; source?: 'manual' | 'autoclick' }) => {
    // Rate limit clicks using real elapsed time.
    const now = options?.timestamp ?? Date.now();
    const source = options?.source ?? 'manual';
    const effectiveCooldownMs = source === 'autoclick' ? 50 : CLICK_COOLDOWN_MS;
    if (now - lastClickTime.current < effectiveCooldownMs) {
      return { value: 0, isCrit: false };
    }
    lastClickTime.current = now;

    let baseClick = 1;
    let multiplier = 1;
    let critChance = 0.05;
    // After first ascension, crit system stays active without rebuying click upgrades.
    let critMult = stats.totalAscensions > 0 ? 1.5 : 0;

    upgrades.forEach(u => {
      if (u.count > 0) {
        if (u.effect.type === 'click') baseClick += getEffectiveValue(u);
        if (u.effect.type === 'click_multiplier') multiplier += getEffectiveValue(u);
        if (u.effect.type === 'crit_chance') critChance += getEffectiveValue(u);
        if (u.effect.type === 'crit_multiplier') critMult += getEffectiveValue(u);
      }
    });

    prestigeUpgrades.forEach(p => {
      if (p.count > 0 && p.effect.type === 'click_boost') {
        baseClick *= (1 + p.effect.value * p.count);
      }
      if (p.count > 0 && p.effect.type === 'crit_chance_boost') {
        critChance += p.effect.value * p.count;
      }
      if (p.count > 0 && p.effect.type === 'crit_mult_boost') {
        critMult *= (1 + p.effect.value * p.count);
      }
    });

    // Apply active cosmetic boosts (skin/theme/accessory/headstyle/pets).
    baseClick *= (1 + activeCosmeticBoosts.clickBoost / 100);
    if (activeAdjacencyClickBoost > 0) {
      baseClick *= (1 + activeAdjacencyClickBoost);
    }
    critChance += activeCosmeticBoosts.critBoost / 100;

    let effectiveCritChance = Math.max(0, critChance);
    // Critical pickup: force guaranteed crits and ensure a baseline crit multiplier
    // even before crit upgrades are unlocked.
    if (critBoostEndTime > now) {
      effectiveCritChance = Math.max(effectiveCritChance, 1);
      critMult = Math.max(critMult, 1.5);
    }

    const critOverflow = cosmetics.blackMarketClickOverflowPurchased
      ? Math.max(0, effectiveCritChance - 1)
      : 0;
    const finalCritChance = Math.min(1, effectiveCritChance);
    const adjustedCritMult = critMult * (1 + critOverflow);

    const isCrit = (adjustedCritMult > 0) && (Math.random() < finalCritChance);
    const finalValue = baseClick * multiplier * (isCrit ? adjustedCritMult : 1);

    if (isCrit) {
      playSound('crit');
    } else {
      playSound('click');
    }

    // Optimization: Batch resource and stats updates
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
      // Only check achievements every 10 clicks to save performance, or if it's a significant amount
      if (updated.totalClicks % 10 === 0) {
        checkAchievements(updated, resources.data.perSecond);
      }
      return updated;
    });

    // Update contract progress for rapid clicks and crit streaks
    updateContractProgress('rapid_clicks', 1);
    if (isCrit) {
      updateContractProgress('crit_streak', 1);
    }

    // Calculate drop chance with prestige bonus
    let dropChance = 0.3;
    prestigeUpgrades.forEach(p => {
      if (p.count > 0 && p.effect.type === 'luck_boost') {
        dropChance += p.effect.value * p.count;
      }
    });
    if (activeAdjacencyLuckBoostPercent > 0) {
      dropChance += activeAdjacencyLuckBoostPercent / 100;
    }

    // Spawn floating pickup
    if (Math.random() < dropChance && x !== undefined && y !== undefined) {
      const pickupType: 'data' | 'credits' | 'crit' = Math.random() < 0.7 ? 'data' : (Math.random() < 0.5 ? 'credits' : 'crit');
      const pickupValue = pickupType === 'crit' ? 0 : Math.floor(finalValue * 0.1);
      const id = `${Date.now()}-${Math.random()}`;
      setFloatingPickups(prev => {
        const updated = [...prev, { id, x: x + 30, y: y - 30, type: pickupType, value: pickupValue }];
        // Keep only the most recent pickups to prevent memory leak
        return updated.slice(-MAX_FLOATING_PICKUPS);
      });
      setTimeout(() => setFloatingPickups(prev => prev.filter(p => p.id !== id)), FLOATING_PICKUP_LIFETIME_MS);
    }

    return { value: finalValue, isCrit };
  }, [upgrades, prestigeUpgrades, playSound, checkAchievements, resources.data.perSecond, activeCosmeticBoosts.clickBoost, activeCosmeticBoosts.critBoost, activeAdjacencyClickBoost, activeAdjacencyLuckBoostPercent, critBoostEndTime, stats.totalAscensions, cosmetics.blackMarketClickOverflowPurchased]);

  const sellResource = useCallback((type: ResourceType, amount: number) => {
     // Calculate sell boost from prestige upgrades
     let sellMultiplier = 1;
     prestigeUpgrades.forEach(p => {
       if (p.count > 0 && p.effect.type === 'sell_boost') {
         sellMultiplier += p.effect.value * p.count;
       }
     });
     
     setResources(prev => {
         const needed = 100 * amount;
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
  }, [playSound, checkAchievements, resources.data.perSecond, prestigeUpgrades]);

  const sellAllResource = useCallback((type: ResourceType) => {
    // Calculate sell boost from prestige upgrades
    let sellMultiplier = 1;
    prestigeUpgrades.forEach(p => {
      if (p.count > 0 && p.effect.type === 'sell_boost') {
        sellMultiplier += p.effect.value * p.count;
      }
    });
    
    setResources(prev => {
        const sellable = Math.floor(prev[type].amount / 100);
        if (sellable === 0) return prev;
        playSound('sell');
        const next = { ...prev };
        next[type].amount -= sellable * 100;
        const creditsGained = Math.floor(sellable * sellMultiplier);
        next.credits.amount += creditsGained;
        // Track credits earned
        setStats(s => {
          const updated = { ...s, totalCreditsEarned: s.totalCreditsEarned + creditsGained };
          checkAchievements(updated, resources.data.perSecond);
          return updated;
        });
        // Update contract progress for selling data
        updateContractProgress('sell_data', sellable * 100);
        return next;
    });
  }, [playSound, checkAchievements, resources.data.perSecond, prestigeUpgrades]);

  const buyUpgrade = useCallback((upgradeId: string, quantity: number = 1) => {
    let totalBought = 0;
    let totalCreditsSpent = 0;
    setResources(currentResources => {
      let nextRes = { ...currentResources };
      // Use ref to get the latest upgrade state (avoids stale closure issues)
      const upgrade = upgradesRef.current.find(u => u.id === upgradeId);
      if (!upgrade) return nextRes;      // One-time unlock upgrades: can only be bought once and ignore bulk-buy quantity
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
      
      for (let i = 0; i < effectiveQuantity; i++) {
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
        
        if (i === 0) playSound(upgrade.category === 'crypto_mining' ? 'buy_black' : 'buy_fab');
        
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
            setLastUpgradeInfo({ name: u.name, effect: `Upgrade purchased x${totalBought}` });
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
      }
      return nextRes;
    });
  }, [playSound, unlockAchievement, checkAchievements, resources.data.perSecond]); 

  const getUpgradePreview = (upgrade: Upgrade): string => {
    // Path unlock upgrades are single-purchase unlocks
    if (upgrade.id === 'unlock_click_upgrades' || upgrade.id === 'unlock_crypto_mining') {
      if (upgrade.count >= 1) return '[ALREADY UNLOCKED]';
      return `[UNLOCK ${upgrade.effect.unlocksCategory}]`;
    }

    // Show the value gained from buying the NEXT level
    const nextLevelUpgrade = { ...upgrade, count: upgrade.count + 1 };
    const nextValue = getEffectiveValue(nextLevelUpgrade);
    
    if (upgrade.effect.type === 'production') {
      const previewResource = upgrade.effect.resource === 'credits' ? 'nodes' : upgrade.effect.resource;
      return `[+${formatNumber(nextValue)} ${previewResource}/s]`;
    } else if (upgrade.effect.type === 'click') {
      return `[+${formatNumber(nextValue)} click]`;
    } else if (upgrade.effect.type === 'click_multiplier') {
      return `[+${(nextValue * 100).toFixed(0)}% multiplier]`;
    } else if (upgrade.effect.type === 'crit_chance') {
      return `[+${(nextValue * 100).toFixed(1)}% crit]`;
    } else if (upgrade.effect.type === 'crit_multiplier') {
      return `[+${formatNumber(nextValue)}x crit]`;
    } else if (upgrade.effect.type === 'unlock') {
      return `[UNLOCK ${upgrade.effect.unlocksCategory}]`;
    } else if (upgrade.effect.type === 'interest_boost') {
      return `[+${(nextValue * 100).toFixed(1)}% interest]`;
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
    if (critBoostEndTime > Date.now()) {
      critChance = Math.max(critChance, 1);
    }
    if (cosmetics.blackMarketClickOverflowPurchased) {
      return Math.max(0, critChance);
    }
    return Math.min(Math.max(0, critChance), 1); // Cap at 100% without overflow upgrade.
  }, [upgrades, prestigeUpgrades, critBoostEndTime, activeCosmeticBoosts.critBoost, cosmetics.blackMarketClickOverflowPurchased]);

  const getInterestRate = useCallback((): number => {
    let interestBoost = 0;
    upgrades.forEach(u => {
      if (u.effect.type === 'interest_boost' && u.count > 0) {
        interestBoost += getEffectiveValue(u);
      }
    });
    
    let maxInterest = 0.03;
    prestigeUpgrades.forEach(p => {
      if (p.count > 0 && p.effect.type === 'interest_boost') {
        maxInterest += p.effect.value * p.count;
      }
    });

    maxInterest += activeCosmeticBoosts.interestBoost / 100;

    // Base 0.1% + boosts, capped at maxInterest (default 3% + prestige)
    return Math.min(0.001 + interestBoost, maxInterest);
  }, [upgrades, prestigeUpgrades, activeCosmeticBoosts.interestBoost]);

  const getBulkProductionGain = useCallback((upgrade: Upgrade, quantity: number): number => {
    if (upgrade.effect.type !== 'production' || !upgrade.effect.resource) return 0;
    
    let totalProduction = 0;
    for (let i = 0; i < quantity; i++) {
      const levelAfterBuy = upgrade.count + i + 1;
      const tempUpgrade = { ...upgrade, count: levelAfterBuy };
      totalProduction += getEffectiveValue(tempUpgrade);
    }
    return totalProduction;
  }, []);

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
      ...prev,
      totalAscensions: prev.totalAscensions + amount
    }));
  }, []);

  const setDebugTime = useCallback((seconds: number) => {
    setElapsedTime(seconds);
  }, []);

  const spawnDebugPickup = useCallback((type: 'data' | 'credits' | 'crit' | 'autoclick' = 'crit') => {
    const id = `debug-${Date.now()}-${Math.random()}`;
    const x = window.innerWidth / 2;
    const y = window.innerHeight / 2;
    // Scale value based on current production (10% of per-second rate, minimum 1)
    let value = 0;
    if (type === 'data') {
      value = Math.max(1, Math.floor(resources.data.perSecond * 0.1));
    } else if (type === 'credits') {
      value = Math.max(1, Math.floor(resources.credits.perSecond * 0.1));
    } else if (type === 'autoclick') {
      value = 8; // 8 seconds of auto-clicking
    }
    setFloatingPickups(prev => [...prev, { id, x, y, type, value }]);
    setTimeout(() => {
      setFloatingPickups(prev => prev.filter(p => p.id !== id));
    }, FLOATING_PICKUP_LIFETIME_MS);
  }, [resources.data.perSecond, resources.credits.perSecond]);

  const getPrestigeGain = useCallback(() => {
    if (IS_DEMO_MODE) return 0;

    const cryptoAmount = resources.crypto.amount;
    const requiredCrypto = getAscensionCost(stats.totalAscensions);
    if (cryptoAmount < requiredCrypto) return 0;
    
    let prestigeGain = calculatePrestigeGain(cryptoAmount, stats.totalAscensions);
    
    prestigeUpgrades.forEach(p => {
      if (p.count > 0 && p.effect.type === 'prestige_mult') {
        prestigeGain = Math.floor(prestigeGain * (1 + p.effect.value * p.count));
      }
    });
    
    return prestigeGain;
  }, [resources.crypto.amount, prestigeUpgrades, stats.totalAscensions]);

  const ascend = useCallback(() => {
    if (IS_DEMO_MODE) {
      setLastUpgradeInfo({ name: 'DEMO LIMIT', effect: 'Ascension is available in the full version' });
      return;
    }

    const cryptoAmount = resources.crypto.amount;
    const requiredCrypto = getAscensionCost(stats.totalAscensions);
    if (cryptoAmount < requiredCrypto) return;
    
    let prestigeGain = calculatePrestigeGain(cryptoAmount, stats.totalAscensions);
    
    prestigeUpgrades.forEach(p => {
      if (p.count > 0 && p.effect.type === 'prestige_mult') {
        prestigeGain = Math.floor(prestigeGain * (1 + p.effect.value * p.count));
      }
    });
    
    if (prestigeGain === 0) return;

    let startingData = 0;
    prestigeUpgrades.forEach(p => {
      if (p.count > 0 && p.effect.type === 'starting_bonus') {
        startingData += p.effect.value * p.count;
      }
    });

    setStats(s => {
      const updated = {
        ...s,
        totalAscensions: s.totalAscensions + 1,
        totalPrestigeEarned: s.totalPrestigeEarned + prestigeGain,
        fastestAscension: Math.min(s.fastestAscension, elapsedTime),
      };
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
    setLastUpgradeInfo({ name: 'ASCENDED', effect: `+${prestigeGain} prestige points` });
    
    // Reset contracts on ascension - generate fresh contracts with full refreshes
    setContracts(prev => ({
      ...prev,
      activeContracts: [],
      completedToday: 0,
      lastRefreshTime: 0, // This will trigger the useEffect to regenerate contracts
      refreshesRemaining: 3,
    }));
  }, [resources.crypto.amount, resources.prestige, elapsedTime, checkAchievements, resources.data.perSecond, prestigeUpgrades, stats.totalAscensions]);

  const ascendVictory = useCallback((): LootBoxReward | null => {
    if (IS_DEMO_MODE) {
      setLastUpgradeInfo({ name: 'DEMO LIMIT', effect: 'Ascension is available in the full version' });
      return null;
    }

    const cryptoAmount = resources.crypto.amount;
    const requiredCrypto = getAscensionCost(stats.totalAscensions);
    if (cryptoAmount < requiredCrypto) return null;
    
    let prestigeGain = calculatePrestigeGain(cryptoAmount, stats.totalAscensions);
    
    prestigeUpgrades.forEach(p => {
      if (p.count > 0 && p.effect.type === 'prestige_mult') {
        prestigeGain = Math.floor(prestigeGain * (1 + p.effect.value * p.count));
      }
    });
    
    if (prestigeGain === 0) return null;

    let startingData = 0;
    prestigeUpgrades.forEach(p => {
      if (p.count > 0 && p.effect.type === 'starting_bonus') {
        startingData += p.effect.value * p.count;
      }
    });

    const lootCandidates = buildLootboxCandidates(cosmetics);
    const lootLuckBonus = getActiveLootLuckBonus(cosmetics) + activeAdjacencyLuckBoostPercent;
    const selectedLoot = pickLootboxCandidate(lootCandidates, lootLuckBonus);
    const fallbackBonus = selectedLoot ? { ...LOOTBOX_FALLBACK_BONUS, data: 0, credits: 0, crypto: 0 } : LOOTBOX_FALLBACK_BONUS;
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
          data: LOOTBOX_FALLBACK_BONUS.data,
          credits: LOOTBOX_FALLBACK_BONUS.credits,
          crypto: LOOTBOX_FALLBACK_BONUS.crypto,
        };

    setStats(s => {
      const updated = {
        ...s,
        totalAscensions: s.totalAscensions + 1,
        totalPrestigeEarned: s.totalPrestigeEarned + prestigeGain,
        totalCosmeticsOwned: s.totalCosmeticsOwned + (selectedLoot ? 1 : 0),
        fastestAscension: Math.min(s.fastestAscension, elapsedTime),
      };
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
    setLastUpgradeInfo({
      name: 'BOSS DEFEATED!',
      effect: selectedLoot
        ? `+${prestigeGain} prestige | Loot: ${selectedLoot.name}`
        : `+${prestigeGain} prestige | Loot pool empty: +1K all`,
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
  }, [resources.crypto.amount, resources.prestige, elapsedTime, checkAchievements, resources.data.perSecond, prestigeUpgrades, playSound, stats.totalAscensions, cosmetics, activeAdjacencyLuckBoostPercent]);

  const ascendDefeat = useCallback(() => {
    if (IS_DEMO_MODE) {
      setLastUpgradeInfo({ name: 'DEMO LIMIT', effect: 'Ascension is available in the full version' });
      return;
    }

    const cryptoAmount = resources.crypto.amount;
    const requiredCrypto = getAscensionCost(stats.totalAscensions);
    if (cryptoAmount < requiredCrypto) return;
    
    let prestigeGain = calculatePrestigeGain(cryptoAmount, stats.totalAscensions);
    
    prestigeUpgrades.forEach(p => {
      if (p.count > 0 && p.effect.type === 'prestige_mult') {
        prestigeGain = Math.floor(prestigeGain * (1 + p.effect.value * p.count));
      }
    });
    
    const penaltyPrestige = Math.floor(prestigeGain * 0.25);

    let startingData = 0;
    prestigeUpgrades.forEach(p => {
      if (p.count > 0 && p.effect.type === 'starting_bonus') {
        startingData += p.effect.value * p.count;
      }
    });

    setStats(s => {
      const updated = {
        ...s,
        totalAscensions: s.totalAscensions + 1,
        totalPrestigeEarned: s.totalPrestigeEarned + penaltyPrestige,
        fastestAscension: Math.min(s.fastestAscension, elapsedTime),
      };
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
    setLastUpgradeInfo({ name: 'HACK FAILED', effect: `+${penaltyPrestige} prestige (25% penalty)` });
    
    // Reset contracts on ascension - generate fresh contracts with full refreshes
    setContracts(prev => ({
      ...prev,
      activeContracts: [],
      completedToday: 0,
      lastRefreshTime: 0, // This will trigger the useEffect to regenerate contracts
      refreshesRemaining: 3,
    }));
  }, [resources.crypto.amount, resources.prestige, prestigeUpgrades, stats.totalAscensions]);

  const buyPrestigeUpgrade = useCallback((id: string) => {
    if (IS_DEMO_MODE) {
      setLastUpgradeInfo({ name: 'DEMO LIMIT', effect: 'Prestige upgrades are available in the full version' });
      return;
    }

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

  const onPickupClick = useCallback((pickup: FloatingPickupItem) => {
    // Calculate pickup value boost from prestige upgrades
    let pickupMultiplier = 1;
    prestigeUpgrades.forEach(p => {
      if (p.count > 0 && p.effect.type === 'pickup_value') {
        pickupMultiplier += p.effect.value * p.count;
      }
    });
    
    setFloatingPickups(prev => prev.filter(p => p.id !== pickup.id));
    const boostedValue = Math.floor(pickup.value * pickupMultiplier);
    
    if (pickup.type === 'data') {
      setResources(prev => ({
        ...prev,
        data: { ...prev.data, amount: prev.data.amount + boostedValue }
      }));
    } else if (pickup.type === 'credits') {
      setResources(prev => ({
        ...prev,
        credits: { ...prev.credits, amount: prev.credits.amount + boostedValue }
      }));
    } else if (pickup.type === 'autoclick') {
      // Activate auto-click boost for 8 seconds
      setAutoClickBoostEndTime(Date.now() + pickup.value * 1000);
      playSound('pickup');
    }
    // Track pickups collected
    setStats(s => {
      const updated = { ...s, pickupsCollected: s.pickupsCollected + 1 };
      checkAchievements(updated, resources.data.perSecond);
      return updated;
    });
    // Update contract progress for collecting pickups
    updateContractProgress('collect_pickups', 1);
  }, [checkAchievements, resources.data.perSecond, prestigeUpgrades, playSound]);

  const onCritPickupClick = useCallback(() => {
    playSound('crit');
    // Activate 100% critical chance boost for 8 seconds
    setCritBoostEndTime(Date.now() + 8000);
    // Track crit pickups collected
    setStats(s => {
      const updated = { ...s, critPickupsCollected: s.critPickupsCollected + 1 };
      checkAchievements(updated, resources.data.perSecond);
      return updated;
    });
    // Update contract progress for collecting pickups
    updateContractProgress('collect_pickups', 1);
  }, [playSound, checkAchievements, resources.data.perSecond]);

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
// Auto-save every 5 seconds
  useEffect(() => {
    const saveInterval = setInterval(() => {
      if (!loadReadyRef.current) return;
      saveGameState({
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
        version: 3,
        lastSaveTimestamp: Date.now()
      });
    }, 5000);
    return () => clearInterval(saveInterval);
  }, [resources, upgrades, prestigeUpgrades, achievements, stats, elapsedTime, masterVolume, musicVolume, sfxVolume, isMusicPlaying, cosmetics, contracts, roomLayout, tutorial]);
  // Best-effort flush when the window is being hidden/closed. This mainly ensures the local fallback is written.
  useEffect(() => {
    const flush = () => {
      if (!loadReadyRef.current) return;
      void saveGameState({
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
        version: 3,
        lastSaveTimestamp: Date.now(),
      });
    };

    const onVisibilityChange = () => {
      if (document.hidden) flush();
    };

    window.addEventListener('beforeunload', flush);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', flush);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [resources, upgrades, prestigeUpgrades, achievements, stats, elapsedTime, masterVolume, musicVolume, sfxVolume, isMusicPlaying, cosmetics, contracts, roomLayout, tutorial, saveGameState]);


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

    const upgradeCost = getCryptoRelicUpgradeCost(relic, currentLevel);
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
  }, [playSound]);

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
    
    switch (objectiveType) {
      case 'sell_data':
        // Sell a small portion of current data - achievable quickly
        targetAmount = Math.floor(Math.max(100, resources.data.amount * 0.1) * mult);
        title = `Data Liquidation`;
        description = `Sell ${formatNumber(targetAmount)} Data for nodes`;
        rewards = { crypto: Math.max(1, Math.floor(mult)), prestige: Math.floor(mult) };
        break;
      case 'collect_pickups':
        // Easy: 3, Medium: 6, Hard: 12 pickups
        targetAmount = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 6 : 12;
        title = `Pickup Collector`;
        description = `Collect ${targetAmount} floating pickups`;
        rewards = { credits: Math.floor(50 * mult / 15), data: Math.floor(200 * mult) };
        break;
      case 'spend_credits':
        // Spend a modest amount based on current holdings
        targetAmount = Math.floor(Math.max(10, resources.credits.amount * 0.15) * mult);
        title = `Investment Run`;
        description = `Spend ${formatNumber(targetAmount)} Nodes on upgrades`;
        rewards = { data: Math.floor(targetAmount * 5), crypto: Math.max(1, Math.floor(mult)) };
        break;
      case 'reach_production':
        // Target: slightly above current or reasonable starting goal
        targetAmount = Math.floor(Math.max(5, currentProduction + 5) * mult);
        title = `Production Milestone`;
        description = `Reach ${formatNumber(targetAmount)} Data/sec`;
        rewards = { credits: Math.floor(targetAmount * 5 / 15), crypto: Math.max(1, Math.floor(mult)) };
        break;
      case 'rapid_clicks':
        // Easy: 20, Medium: 50, Hard: 100 clicks
        targetAmount = difficulty === 'easy' ? 20 : difficulty === 'medium' ? 50 : 100;
        title = `Speed Challenge`;
        description = `Click ${targetAmount} times`;
        rewards = { credits: Math.floor(targetAmount / 15), data: Math.floor(targetAmount * 5) };
        break;
      case 'crit_streak':
        // Easy: 3, Medium: 7, Hard: 15 crits
        targetAmount = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 7 : 15;
        title = `Critical Focus`;
        description = `Land ${targetAmount} critical hits`;
        rewards = { crypto: Math.max(1, Math.floor(mult)), prestige: Math.max(1, Math.floor(mult * 0.5)) };
        break;
      case 'upgrade_single':
        // Easy: 3, Medium: 5, Hard: 10 upgrades
        targetAmount = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 5 : 10;
        title = `Specialization`;
        description = `Purchase ${targetAmount} upgrades`;
        rewards = { data: Math.floor(targetAmount * 100), credits: Math.floor(targetAmount * 30 / 15) };
        break;
      case 'maintain_resources':
        // Keep a reasonable amount - based on current amount or low starting goal
        targetAmount = Math.floor(Math.max(500, resources.data.amount * 0.3) * mult);
        title = `Resource Reserve`;
        description = `Have ${formatNumber(targetAmount)}+ Data`;
        rewards = { crypto: Math.max(1, Math.floor(mult)), credits: Math.floor(targetAmount * 0.05 / 15) };
        break;
    }

    // Keep pickup-collection objective as-is; increase challenge and reward for the rest.
    if (objectiveType !== 'collect_pickups') {
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
  }, [resources.data.amount, resources.data.perSecond, resources.credits.amount]);

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

  const resetTutorial = useCallback(() => {
    setTutorial(INITIAL_TUTORIAL);
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
    
    const objectives = TUTORIAL_OBJECTIVES[tutorial.currentPhase]?.objectives.map(obj => ({
      ...obj,
      completed: tutorial.completedObjectives.includes(obj.id),
    })) || [];
    
    return { ...phaseInfo, objectives };
  }, [tutorial]);

  const isTutorialComplete = tutorial.skipped || (
    tutorial.currentPhase === TUTORIAL_PHASES.length - 1 && 
    TUTORIAL_OBJECTIVES[tutorial.currentPhase]?.objectives.every(obj => 
      tutorial.completedObjectives.includes(obj.id)
    )
  );

  const skipTrack = useCallback(() => {
    setCurrentTrackIndex(prev => (prev + 1) % MUSIC_TRACKS.length);
  }, []);

  const saveGame = useCallback(async () => {
		if (!loadReadyRef.current) return;
    await saveGameState({
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
      version: 3,
      lastSaveTimestamp: Date.now()
    });
  }, [resources, upgrades, prestigeUpgrades, achievements, stats, elapsedTime, masterVolume, musicVolume, sfxVolume, isMusicPlaying, cosmetics, contracts, roomLayout, tutorial]);

  const resetGame = useCallback(() => {
    setResources(INITIAL_STATE.resources);
    setUpgrades(INITIAL_STATE.upgrades);
    setPrestigeUpgrades(PRESTIGE_UPGRADES);
    setAchievements(ACHIEVEMENTS);
    setStats(INITIAL_STATS);
    setCosmetics(INITIAL_COSMETICS);
    setElapsedTime(0);
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(PREVIOUS_SAVE_NAMESPACE);
    // Intentionally keep BACKUP_SAVE_NAMESPACE (v3) untouched as backup.
    // Force a reload to ensure clean state
    window.location.reload();
  }, []);

  return { resources, upgrades, clickResource, buyUpgrade, sellResource, sellAllResource, playSound, lastUpgradeInfo, setLastUpgradeInfo, getUpgradePreview, addDebugData, addDebugData100k, addDebugCredits, addDebugCrypto, addDebugPrestige, addDebugAscensionCount, setDebugTime, spawnDebugPickup, getTotalCritChance, getInterestRate, getBulkProductionGain, masterVolume, toggleMasterVolume, musicVolume, setMusicVolume, sfxVolume, setSfxVolume, isMusicPlaying, toggleMusic, skipTrack, elapsedTime, floatingPickups, setPickupSpawningPaused, ascend, ascendVictory, ascendDefeat, getPrestigeGain, buyPrestigeUpgrade, onPickupClick, prestigeUpgrades, onCritPickupClick, achievements, stats, newlyUnlockedAchievement, newlyUnlockedAscensionPet, claimAscensionPetUnlock, equipAscensionPetUnlock, claimAchievementReward, claimAllAchievements, unclaimedAchievements, autoClickBoostEndTime, critBoostEndTime, cosmetics, buyCosmetic, buyCryptoRelic, buyBlackMarketUpgrade, equipCosmetic, getActiveSkin, getActiveTheme, getActiveAccessory, getActiveCape, getActiveWing, getActiveHeadStyle, getActivePet, getActiveAscensionPet, getActiveClickEffect, getActiveLootBoxSkin, getActiveMachineBoxSkin, getPetBoosts, getAdjacencyFormationBonus, getDataPerClick, offlineProgress, clearOfflineProgress, contracts, refreshContracts, updateContractProgress, claimContractReward, roomLayout, updateMachinePosition, removeMachinePosition, getMachinePosition, tutorial, startTutorial, skipTutorial, resetTutorial, completeTutorialObjective, getCurrentTutorialPhase, isTutorialComplete, saveGame, resetGame, setFullscreen, setWindowed };
};

