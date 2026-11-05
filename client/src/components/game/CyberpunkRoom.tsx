import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
export type CharacterReaction = 'idle' | 'checkpoint' | 'crit' | 'achievement' | 'pickup';

type MachineVariant = 'data' | 'data_gold' | 'crypto' | 'quantum' | 'ai' | 'botnet' | 'defi' | 'neural' | 'singularity' | 'mining1' | 'mining2' | 'mining3' | 'mining4' | 'mining5' | 'overclock' | 'mining6';

const VARIANT_COLORS: Record<MachineVariant, { primary: string; secondary: string; glow: string }> = {
  data: { primary: '#06b6d4', secondary: '#0891b2', glow: 'rgba(6, 182, 212, 0.6)' },
  data_gold: { primary: '#fbbf24', secondary: '#f59e0b', glow: 'rgba(251, 191, 36, 0.6)' },
  crypto: { primary: '#10b981', secondary: '#059669', glow: 'rgba(16, 185, 129, 0.6)' },
  quantum: { primary: '#a855f7', secondary: '#9333ea', glow: 'rgba(168, 85, 247, 0.6)' },
  ai: { primary: '#ec4899', secondary: '#db2777', glow: 'rgba(236, 72, 153, 0.6)' },
  botnet: { primary: '#f97316', secondary: '#ea580c', glow: 'rgba(249, 115, 22, 0.6)' },
  defi: { primary: '#facc15', secondary: '#eab308', glow: 'rgba(250, 204, 21, 0.6)' },
  neural: { primary: '#22c55e', secondary: '#16a34a', glow: 'rgba(34, 197, 94, 0.6)' },
  singularity: { primary: '#e879f9', secondary: '#d946ef', glow: 'rgba(232, 121, 249, 0.7)' },
  mining1: { primary: '#fca5a5', secondary: '#f87171', glow: 'rgba(252, 165, 165, 0.6)' },
  mining2: { primary: '#f87171', secondary: '#ef4444', glow: 'rgba(248, 113, 113, 0.6)' },
  mining3: { primary: '#ef4444', secondary: '#dc2626', glow: 'rgba(239, 68, 68, 0.6)' },
  mining4: { primary: '#dc2626', secondary: '#b91c1c', glow: 'rgba(220, 38, 38, 0.6)' },
  mining5: { primary: '#b91c1c', secondary: '#991b1b', glow: 'rgba(185, 28, 28, 0.7)' },
  // Overclock tier: hot orange/white, distinct from the violet singularity and red rigs.
  overclock: { primary: '#fb923c', secondary: '#f97316', glow: 'rgba(251, 146, 60, 0.8)' },
  // White-hot, clearly apart from the gold Server Rack.
  mining6: { primary: '#f8fafc', secondary: '#fdba74', glow: 'rgba(255, 237, 213, 0.9)' },
};

interface MachineColorSkin {
  primary: string;
  secondary: string;
  glow: string;
  mix: number;
}

const clampColorMix = (value: number): number => Math.max(0, Math.min(1, value));

const parseColor = (input: string): { r: number; g: number; b: number; a: number } => {
  const value = input.trim();

  if (value.startsWith('#')) {
    const hex = value.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return { r, g, b, a: 1 };
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return { r, g, b, a: 1 };
    }
  }

  const rgbaMatch = value.match(/rgba?\(([^)]+)\)/i);
  if (rgbaMatch) {
    const parts = rgbaMatch[1].split(',').map(part => Number(part.trim()));
    const [r = 0, g = 0, b = 0, a = 1] = parts;
    return {
      r: Math.max(0, Math.min(255, r)),
      g: Math.max(0, Math.min(255, g)),
      b: Math.max(0, Math.min(255, b)),
      a: Math.max(0, Math.min(1, a)),
    };
  }

  return { r: 0, g: 0, b: 0, a: 1 };
};

const blendColor = (base: string, target: string, mix: number): string => {
  const t = clampColorMix(mix);
  const b = parseColor(base);
  const c = parseColor(target);

  const r = Math.round(b.r + (c.r - b.r) * t);
  const g = Math.round(b.g + (c.g - b.g) * t);
  const bCh = Math.round(b.b + (c.b - b.b) * t);
  const a = b.a + (c.a - b.a) * t;

  return `rgba(${r}, ${g}, ${bCh}, ${a.toFixed(3)})`;
};

const getSkinnedMachineColors = (
  variant: MachineVariant,
  machineColorSkin?: MachineColorSkin
): { primary: string; secondary: string; glow: string } => {
  const base = VARIANT_COLORS[variant];
  if (!machineColorSkin || machineColorSkin.mix <= 0) return base;

  const mix = clampColorMix(machineColorSkin.mix);
  return {
    primary: blendColor(base.primary, machineColorSkin.primary, mix),
    secondary: blendColor(base.secondary, machineColorSkin.secondary, mix),
    glow: blendColor(base.glow, machineColorSkin.glow, Math.min(1, mix + 0.12)),
  };
};

const GRID_SIZE = 8;
const FLOOR_GRID_SIZE = 8;
const TILE_WIDTH = 56;
const TILE_HEIGHT = 28;
const SKY_TOP_MIN_Y_PERCENT = 4;
const SKY_TOP_MAX_Y_PERCENT = 34;
const SKY_BOTTOM_MIN_Y_PERCENT = 62;
const SKY_BOTTOM_MAX_Y_PERCENT = 92;
const MACHINE_GLOBAL_X_OFFSET = 0;

const MACHINE_VISUAL_ANCHOR: Record<MachineVariant, { x: number; y: number; scale: number }> = {
  data: { x: 0, y: 0, scale: 0.9 },
  data_gold: { x: 0, y: 0, scale: 0.9 },
  crypto: { x: 0, y: 0, scale: 0.9 },
  quantum: { x: 0, y: 0, scale: 0.88 },
  ai: { x: 0, y: 0, scale: 0.88 },
  botnet: { x: 0, y: 0, scale: 0.9 },
  defi: { x: 0, y: 0, scale: 0.9 },
  neural: { x: 0, y: 0, scale: 0.9 },
  singularity: { x: 0, y: 0, scale: 0.86 },
  mining1: { x: 0, y: 0, scale: 0.86 },
  mining2: { x: 0, y: 0, scale: 0.84 },
  mining3: { x: 0, y: 0, scale: 0.84 },
  mining4: { x: 0, y: 0, scale: 0.82 },
  mining5: { x: 0, y: 0, scale: 0.8 },
  overclock: { x: 0, y: 0, scale: 0.9 },
  mining6: { x: 0, y: 0, scale: 0.8 },
};

function gridToScreen(row: number, col: number): { x: number; y: number } {
  const x = (col - row) * (TILE_WIDTH / 2);
  const y = (col + row) * (TILE_HEIGHT / 2);
  return { x, y };
}

interface MachineConfig {
  upgradeId: string;
  variant: MachineVariant;
  gridRow: number;
  gridCol: number;
  size: number;
  name: string;
}

const MACHINE_CONFIGS: MachineConfig[] = [
  { upgradeId: 'data_miner_v1', variant: 'data', gridRow: 0, gridCol: 0, size: 22, name: 'Basic Computer' },
  { upgradeId: 'data_miner_v2', variant: 'data_gold', gridRow: 0, gridCol: 0, size: 24, name: 'Server Rack' },
  { upgradeId: 'botnet_node', variant: 'botnet', gridRow: 0, gridCol: 0, size: 24, name: 'Botnet Cluster' },
  { upgradeId: 'neural_network', variant: 'neural', gridRow: 0, gridCol: 0, size: 22, name: 'Neural Network' },
  { upgradeId: 'crypto_rig_basic', variant: 'mining1', gridRow: 0, gridCol: 0, size: 24, name: 'Mining Rig Basic' },
  { upgradeId: 'crypto_rig_advanced', variant: 'mining2', gridRow: 0, gridCol: 0, size: 26, name: 'Mining Rig Pro' },
  { upgradeId: 'blockchain_optimizer', variant: 'crypto', gridRow: 0, gridCol: 0, size: 22, name: 'Blockchain Hub' },
  { upgradeId: 'defi_protocol', variant: 'defi', gridRow: 0, gridCol: 0, size: 22, name: 'DeFi Protocol' },
  { upgradeId: 'quantum_server', variant: 'quantum', gridRow: 0, gridCol: 0, size: 26, name: 'Quantum Computer' },
  { upgradeId: 'ai_core', variant: 'ai', gridRow: 0, gridCol: 0, size: 26, name: 'AI Core' },
  { upgradeId: 'singularity_nexus', variant: 'singularity', gridRow: 0, gridCol: 0, size: 28, name: 'Singularity Nexus' },
  { upgradeId: 'crypto_farm', variant: 'mining3', gridRow: 0, gridCol: 0, size: 26, name: 'Crypto Farm' },
  { upgradeId: 'quantum_miner', variant: 'mining4', gridRow: 0, gridCol: 0, size: 24, name: 'Quantum Miner' },
  { upgradeId: 'mining_datacenter', variant: 'mining5', gridRow: 0, gridCol: 0, size: 30, name: 'Mining Datacenter' },
  { upgradeId: 'overclock_core', variant: 'overclock', gridRow: 0, gridCol: 0, size: 30, name: 'Overclocked Core' },
  { upgradeId: 'overclock_rig', variant: 'mining6', gridRow: 0, gridCol: 0, size: 32, name: 'Overclocked Rig' },
];

function getEvolutionTier(count: number): number {
  if (count >= 150) return 4;
  if (count >= 75) return 3;
  if (count >= 25) return 2;
  return 1;
}

const TIER_COLORS = {
  1: { badge: '#6b7280', glow: 'rgba(107, 114, 128, 0.3)' },
  2: { badge: '#3b82f6', glow: 'rgba(59, 130, 246, 0.5)' },
  3: { badge: '#a855f7', glow: 'rgba(168, 85, 247, 0.6)' },
  4: { badge: '#f59e0b', glow: 'rgba(245, 158, 11, 0.7)' },
};

const IsoMachine = React.memo(function IsoMachine({ variant, size, count = 1, colorOverride, disableGlow = false }: { variant: MachineVariant; size: number; count?: number; colorOverride?: { primary: string; secondary: string; glow: string }; disableGlow?: boolean }) {
  const colors = colorOverride || VARIANT_COLORS[variant];
  const tier = getEvolutionTier(count);
  const tierGlow = TIER_COLORS[tier as keyof typeof TIER_COLORS].glow;
  
  const sizeBonus = (tier - 1) * 0.08;
  const adjustedSize = size * (1 + sizeBonus);
  const w = adjustedSize * 2;
  const h = adjustedSize * 1.5;
  
  const glowIntensity = size/3 + (tier - 1) * 4;
  const glowMax = size/1.5 + (tier - 1) * 6;
  const strokeWidth = 1.4 + tier * 0.25;
  const topGradientId = `iso-top-${variant}`;
  const leftGradientId = `iso-left-${variant}`;
  const rightGradientId = `iso-right-${variant}`;
  const coreGradientId = `iso-core-${variant}`;
  
  return (
    <motion.div 
      className="relative"
      style={{ width: w, height: h, filter: disableGlow ? 'none' : undefined }}
      animate={disableGlow ? undefined : {
        filter: [
          `drop-shadow(0 0 ${glowIntensity}px ${colors.glow})`,
          `drop-shadow(0 0 ${glowMax}px ${colors.glow})`,
          `drop-shadow(0 0 ${glowIntensity}px ${colors.glow})`,
        ],
      }}
      transition={disableGlow ? undefined : { duration: 2 - tier * 0.2, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg width={w} height={h} viewBox="0 0 100 75">
        <defs>
          <linearGradient id={topGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(15, 23, 42, 0.98)" />
            <stop offset="50%" stopColor={colors.secondary} stopOpacity="0.2" />
            <stop offset="100%" stopColor="rgba(2, 6, 23, 0.96)" />
          </linearGradient>
          <linearGradient id={leftGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(2, 6, 23, 0.98)" />
            <stop offset="100%" stopColor={colors.secondary} stopOpacity="0.14" />
          </linearGradient>
          <linearGradient id={rightGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.primary} stopOpacity="0.2" />
            <stop offset="100%" stopColor="rgba(15, 23, 42, 0.95)" />
          </linearGradient>
          <linearGradient id={coreGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.primary} stopOpacity="0.34" />
            <stop offset="100%" stopColor={colors.secondary} stopOpacity="0.16" />
          </linearGradient>
        </defs>
        
        <ellipse
          cx="50"
          cy="64"
          rx="27"
          ry="6"
          fill="rgba(15, 23, 42, 0.7)"
        />

        <polygon
          points="50,8 88,26 50,44 12,26"
          fill={`url(#${topGradientId})`}
          stroke={colors.primary}
          strokeWidth={strokeWidth}
        />
        <polygon
          points="12,26 50,44 50,68 12,50"
          fill={`url(#${leftGradientId})`}
          stroke={colors.primary}
          strokeWidth={strokeWidth}
        />
        <polygon
          points="50,44 88,26 88,50 50,68"
          fill={`url(#${rightGradientId})`}
          stroke={colors.primary}
          strokeWidth={strokeWidth}
        />

        <polygon
          points="50,14 74,26 50,38 26,26"
          fill="rgba(15, 23, 42, 0.85)"
          stroke={colors.secondary}
          strokeWidth="0.9"
        />
        <line x1="50" y1="14" x2="50" y2="38" stroke={colors.primary} strokeWidth="0.7" opacity="0.75" />
        <line x1="26" y1="26" x2="50" y2="14" stroke={colors.primary} strokeWidth="0.55" opacity="0.65" />
        <line x1="50" y1="14" x2="74" y2="26" stroke={colors.primary} strokeWidth="0.55" opacity="0.65" />

        <polygon
          points="50,19 62,25 50,31 38,25"
          fill={`url(#${coreGradientId})`}
          stroke={colors.primary}
          strokeWidth="0.7"
        />
        <polygon
          points="38,25 50,31 50,41 38,35"
          fill="rgba(2, 6, 23, 0.78)"
          stroke={colors.secondary}
          strokeWidth="0.6"
        />
        <polygon
          points="50,31 62,25 62,35 50,41"
          fill="rgba(15, 23, 42, 0.84)"
          stroke={colors.secondary}
          strokeWidth="0.6"
        />

        {[...Array(3 + tier)].map((_, i) => (
          <motion.circle
            key={`right-port-${i}`}
            cx={71.5 + (i % 2) * 2.5}
            cy={36 + i * 5}
            r={1.4}
            fill={i % 2 === 0 ? colors.primary : colors.secondary}
            animate={{ opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 0.65, repeat: Infinity, delay: i * 0.12 }}
          />
        ))}

        {[...Array(2 + tier)].map((_, i) => (
          <motion.line
            key={`left-channel-${i}`}
            x1={19}
            y1={34 + i * 5}
            x2={35}
            y2={42 + i * 5}
            stroke={colors.primary}
            strokeWidth="0.7"
            opacity={0.34}
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.14 }}
          />
        ))}

        {tier >= 2 && (
          <motion.polygon
            points="50,22 66,30 50,38 34,30"
            fill={colors.primary}
            opacity={0.2}
            animate={{ opacity: [0.12, 0.3, 0.12] }}
            transition={{ duration: 1.05, repeat: Infinity }}
          />
        )}

        {tier >= 3 && (
          <>
            <line x1="50" y1="8" x2="50" y2="1" stroke={colors.primary} strokeWidth="1" />
            <circle cx="50" cy="0.5" r="2" fill={colors.primary}>
              <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />
            </circle>
          </>
        )}
        
        {tier >= 4 && (
          <>
            <motion.ellipse
              cx="50"
              cy="30"
              rx="14"
              ry="6"
              fill="none"
              stroke={colors.primary}
              strokeWidth="0.65"
              animate={{ opacity: [0.2, 0.65, 0.2], scale: [1, 1.08, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.circle
              cx="50"
              cy="30"
              r="2.1"
              fill={colors.primary}
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
            <motion.path
              d="M40 33 L50 38 L60 33"
              stroke={colors.secondary}
              strokeWidth="0.7"
              fill="none"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          </>
        )}

        <polygon
          points="50,8 88,26 50,44 12,26"
          fill="none"
          stroke={tierGlow}
          strokeWidth="0.65"
          opacity={0.42}
        />
      </svg>
      
    </motion.div>
  );
});

const MiningRig = React.memo(function MiningRig({ size, variant, count = 1, colorOverride, disableGlow = false }: { size: number; variant: MachineVariant; count?: number; colorOverride?: { primary: string; secondary: string; glow: string }; disableGlow?: boolean }) {
  const tier = getEvolutionTier(count);
  const tierGlow = TIER_COLORS[tier as keyof typeof TIER_COLORS].glow;
  
  const sizeBonus = (tier - 1) * 0.08;
  const adjustedSize = size * (1 + sizeBonus);
  const w = adjustedSize * 2;
  const h = adjustedSize * 1.6;
  const colors = colorOverride || VARIANT_COLORS[variant];
  
  const gpuRows = 2 + tier;
  const fanCount = 2 + tier;
  const glowMin = size/2 + (tier - 1) * 5;
  const glowMax = size + (tier - 1) * 8;
  const strokeWidth = 1.45 + tier * 0.25;
  const topGradientId = `mining-top-${variant}`;
  const leftGradientId = `mining-left-${variant}`;
  const rightGradientId = `mining-right-${variant}`;
  const fanCoreGradientId = `mining-fan-${variant}`;
  const fanSlots = [
    { cx: 62, cy: 38 },
    { cx: 74, cy: 43 },
    { cx: 60, cy: 50 },
    { cx: 72, cy: 55 },
    { cx: 84, cy: 50 },
  ].slice(0, Math.min(fanCount, 5));
  
  return (
    <motion.div 
      className="relative"
      style={{ width: w, height: h, filter: disableGlow ? 'none' : undefined }}
      animate={disableGlow ? undefined : {
        filter: [
          `drop-shadow(0 0 ${glowMin}px ${colors.glow})`,
          `drop-shadow(0 0 ${glowMax}px ${colors.glow})`,
          `drop-shadow(0 0 ${glowMin}px ${colors.glow})`,
        ],
      }}
      transition={disableGlow ? undefined : { duration: 1.5 - tier * 0.15, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg width={w} height={h} viewBox="0 0 100 80">
        <defs>
          <linearGradient id={topGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(2, 6, 23, 0.98)" />
            <stop offset="45%" stopColor={colors.primary} stopOpacity="0.2" />
            <stop offset="100%" stopColor="rgba(15, 23, 42, 0.94)" />
          </linearGradient>
          <linearGradient id={leftGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(2, 6, 23, 0.98)" />
            <stop offset="100%" stopColor={colors.secondary} stopOpacity="0.16" />
          </linearGradient>
          <linearGradient id={rightGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.primary} stopOpacity="0.18" />
            <stop offset="100%" stopColor="rgba(15, 23, 42, 0.95)" />
          </linearGradient>
          <radialGradient id={fanCoreGradientId} cx="40%" cy="35%">
            <stop offset="0%" stopColor={colors.primary} stopOpacity="0.85" />
            <stop offset="100%" stopColor={colors.secondary} stopOpacity="0.25" />
          </radialGradient>
        </defs>
        
        <ellipse cx="50" cy="67" rx="30" ry="6.4" fill="rgba(15, 23, 42, 0.7)" />

        <polygon
          points="50,6 90,24 50,42 10,24"
          fill={`url(#${topGradientId})`}
          stroke={colors.primary}
          strokeWidth={strokeWidth}
        />
        <polygon
          points="10,24 50,42 50,72 10,54"
          fill={`url(#${leftGradientId})`}
          stroke={colors.primary}
          strokeWidth={strokeWidth}
        />
        <polygon
          points="50,42 90,24 90,54 50,72"
          fill={`url(#${rightGradientId})`}
          stroke={colors.primary}
          strokeWidth={strokeWidth}
        />

        <polygon
          points="50,12 74,24 50,36 26,24"
          fill="rgba(15, 23, 42, 0.82)"
          stroke={colors.secondary}
          strokeWidth="0.95"
        />
        <line x1="26" y1="24" x2="50" y2="12" stroke={colors.primary} strokeWidth="0.55" opacity="0.7" />
        <line x1="50" y1="12" x2="74" y2="24" stroke={colors.primary} strokeWidth="0.55" opacity="0.7" />
        <line x1="50" y1="12" x2="50" y2="36" stroke={colors.primary} strokeWidth="0.7" opacity="0.8" />

        {[...Array(Math.min(gpuRows, 4))].map((_, idx) => {
          const y = 33 + idx * 8;
          return (
            <g key={`left-gpu-${idx}`}>
              <polygon
                points={`18,${y} 41,${y + 11} 41,${y + 15} 18,${y + 4}`}
                fill="rgba(15, 23, 42, 0.86)"
                stroke={colors.secondary}
                strokeWidth="0.65"
              />
              <line x1="21" y1={y + 4} x2="37" y2={y + 12} stroke={colors.primary} strokeWidth="0.55" opacity="0.72" />
              {[...Array(Math.min(2 + tier, 5))].map((__, j) => (
                <motion.circle
                  key={`left-led-${idx}-${j}`}
                  cx={21 + j * 4}
                  cy={y + 2.7}
                  r="0.9"
                  fill={j % 2 === 0 ? colors.primary : colors.secondary}
                  animate={{ opacity: [0.35, 1, 0.35] }}
                  transition={{ duration: 0.45, repeat: Infinity, delay: idx * 0.08 + j * 0.08 }}
                />
              ))}
            </g>
          );
        })}

        {fanSlots.map((slot, i) => (
          <g key={`right-fan-${i}`}>
            <ellipse
              cx={slot.cx}
              cy={slot.cy}
              rx={4.2 + tier * 0.25}
              ry={3.2 + tier * 0.18}
              fill="rgba(2, 6, 23, 0.86)"
              stroke={colors.secondary}
              strokeWidth="0.6"
            />
            <motion.g
              animate={{ rotate: 360 }}
              transition={{ duration: Math.max(0.32, 0.7 - tier * 0.08), repeat: Infinity, ease: "linear" }}
              style={{ transformOrigin: `${slot.cx}px ${slot.cy}px` }}
            >
              <ellipse cx={slot.cx} cy={slot.cy} rx="2.3" ry="1.7" fill={`url(#${fanCoreGradientId})`} />
              <path d={`M${slot.cx - 2.2} ${slot.cy} L${slot.cx} ${slot.cy - 1.6} L${slot.cx + 2.2} ${slot.cy}`} stroke={colors.primary} strokeWidth="0.6" fill="none" opacity="0.85" />
              <path d={`M${slot.cx - 1.6} ${slot.cy + 1.1} L${slot.cx} ${slot.cy - 1.7} L${slot.cx + 1.6} ${slot.cy + 1.1}`} stroke={colors.secondary} strokeWidth="0.45" fill="none" opacity="0.7" />
            </motion.g>
          </g>
        ))}

        <motion.path
          d="M56 60 L78 50"
          stroke={colors.primary}
          strokeWidth="0.9"
          fill="none"
          animate={{ opacity: [0.3, 0.9, 0.3] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
        {tier >= 2 && (
          <motion.path
            d="M58 64 L82 54"
            stroke={colors.secondary}
            strokeWidth="0.7"
            fill="none"
            animate={{ opacity: [0.25, 0.7, 0.25] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: 0.15 }}
          />
        )}

        {tier >= 3 && (
          <>
            <line x1="50" y1="6" x2="50" y2="-1" stroke={colors.primary} strokeWidth="0.95" />
            <motion.circle
              cx="50"
              cy="-2"
              r="1.9"
              fill={colors.primary}
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{ duration: 0.75, repeat: Infinity }}
            />
          </>
        )}

        {tier >= 4 && (
          <motion.ellipse
            cx="50"
            cy="24"
            rx="15"
            ry="5.7"
            fill="none"
            stroke={colors.primary}
            strokeWidth="0.65"
            animate={{ opacity: [0.2, 0.65, 0.2], scale: [1, 1.08, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
        )}

        <polygon
          points="50,6 90,24 50,42 10,24"
          fill="none"
          stroke={tierGlow}
          strokeWidth="0.65"
          opacity={0.42}
        />
      </svg>
      
    </motion.div>
  );
});

const CSSPet = React.memo(function CSSPet({ petId, facingRight = true }: { petId: string; facingRight?: boolean }) {
  if (petId === 'none') return null;
  
  const renderPet = () => {
    switch (petId) {
      case 'cosmic_dog':
        return (
          <motion.svg 
            width="24" 
            height="20" 
            viewBox="0 0 24 20"
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <ellipse cx="12" cy="14" rx="8" ry="5" fill="#1e1b4b" stroke="#8b5cf6" strokeWidth="1"/>
            <circle cx="12" cy="8" r="6" fill="#1e1b4b" stroke="#8b5cf6" strokeWidth="1"/>
            <motion.circle cx="9" cy="7" r="1.5" fill="#fff"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.circle cx="15" cy="7" r="1.5" fill="#fff"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            />
            <ellipse cx="12" cy="10" rx="1.5" ry="1" fill="#ec4899"/>
            <path d="M6 4 L4 1 M18 4 L20 1" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round"/>
            <motion.path d="M20 14 Q24 12 22 16" stroke="#a78bfa" strokeWidth="1.5" fill="none"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              style={{ transformOrigin: '20px 14px' }}
            />
          </motion.svg>
        );
      case 'geo_cat':
        return (
          <motion.svg 
            width="22" 
            height="18" 
            viewBox="0 0 22 18"
            animate={{ rotate: [-2, 2, -2] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <polygon points="11,2 20,14 2,14" fill="#374151" stroke="#6b7280" strokeWidth="1"/>
            <polygon points="11,5 16,12 6,12" fill="#4b5563"/>
            <polygon points="4,2 7,6 1,6" fill="#374151" stroke="#6b7280" strokeWidth="0.5"/>
            <polygon points="18,2 21,6 15,6" fill="#374151" stroke="#6b7280" strokeWidth="0.5"/>
            <circle cx="8" cy="9" r="1.5" fill="#22c55e"/>
            <circle cx="14" cy="9" r="1.5" fill="#22c55e"/>
            <path d="M10 11 L11 12 L12 11" stroke="#ec4899" strokeWidth="1" fill="none"/>
          </motion.svg>
        );
      case 'cyber_fox':
        return (
          <motion.svg 
            width="24" 
            height="20" 
            viewBox="0 0 24 20"
            animate={{ filter: ['drop-shadow(0 0 3px #f97316)', 'drop-shadow(0 0 6px #f97316)', 'drop-shadow(0 0 3px #f97316)'] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ellipse cx="12" cy="14" rx="7" ry="4" fill="#f97316" stroke="#ea580c" strokeWidth="0.5"/>
            <ellipse cx="12" cy="9" rx="6" ry="5" fill="#f97316" stroke="#ea580c" strokeWidth="0.5"/>
            <polygon points="4,8 6,2 9,7" fill="#fb923c" stroke="#ea580c" strokeWidth="0.5"/>
            <polygon points="20,8 18,2 15,7" fill="#fb923c" stroke="#ea580c" strokeWidth="0.5"/>
            <circle cx="9" cy="8" r="2" fill="#1e1b4b"/>
            <circle cx="15" cy="8" r="2" fill="#1e1b4b"/>
            <circle cx="9" cy="8" r="1" fill="#06b6d4"/>
            <circle cx="15" cy="8" r="1" fill="#06b6d4"/>
            <ellipse cx="12" cy="11" rx="1.5" ry="1" fill="#18181b"/>
            <path d="M18 14 Q22 13 21 16" stroke="#fb923c" strokeWidth="2" fill="none"/>
          </motion.svg>
        );
      case 'holo_bird':
        return (
          <motion.svg 
            width="20" 
            height="18" 
            viewBox="0 0 20 18"
            animate={{ y: [0, -4, 0], x: [0, 2, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ filter: 'drop-shadow(0 0 4px rgba(6, 182, 212, 0.6))' }}
          >
            <ellipse cx="10" cy="10" rx="6" ry="5" fill="rgba(6, 182, 212, 0.5)" stroke="#06b6d4" strokeWidth="0.5"/>
            <circle cx="10" cy="7" r="4" fill="rgba(6, 182, 212, 0.6)" stroke="#06b6d4" strokeWidth="0.5"/>
            <circle cx="8" cy="6" r="1" fill="#fff"/>
            <circle cx="12" cy="6" r="1" fill="#fff"/>
            <polygon points="10,8 12,10 10,9 8,10" fill="#fbbf24"/>
            <motion.path d="M4 10 Q0 8 2 12" stroke="#22d3ee" strokeWidth="1" fill="none"
              animate={{ rotate: [0, -20, 0] }}
              transition={{ duration: 0.3, repeat: Infinity }}
              style={{ transformOrigin: '4px 10px' }}
            />
            <motion.path d="M16 10 Q20 8 18 12" stroke="#22d3ee" strokeWidth="1" fill="none"
              animate={{ rotate: [0, 20, 0] }}
              transition={{ duration: 0.3, repeat: Infinity }}
              style={{ transformOrigin: '16px 10px' }}
            />
          </motion.svg>
        );
      case 'robo_bunny':
        return (
          <motion.svg 
            width="22" 
            height="22" 
            viewBox="0 0 22 22"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            <ellipse cx="11" cy="16" rx="6" ry="4" fill="#374151" stroke="#6b7280" strokeWidth="0.5"/>
            <circle cx="11" cy="10" r="6" fill="#4b5563" stroke="#6b7280" strokeWidth="0.5"/>
            <rect x="5" y="0" width="4" height="10" rx="2" fill="#4b5563" stroke="#6b7280" strokeWidth="0.5"/>
            <rect x="13" y="0" width="4" height="10" rx="2" fill="#4b5563" stroke="#6b7280" strokeWidth="0.5"/>
            <motion.circle cx="7" cy="3" r="1" fill="#ef4444"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
            <motion.circle cx="15" cy="3" r="1" fill="#ef4444"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: 0.2 }}
            />
            <circle cx="8" cy="9" r="2" fill="#22d3ee"/>
            <circle cx="14" cy="9" r="2" fill="#22d3ee"/>
            <ellipse cx="11" cy="12" rx="1.5" ry="1" fill="#ec4899"/>
          </motion.svg>
        );
      case 'data_snake':
        return (
          <motion.svg 
            width="28" 
            height="14" 
            viewBox="0 0 28 14"
            animate={{ x: [0, 2, 0, -2, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <motion.path 
              d="M2 10 Q6 4 10 10 Q14 16 18 10 Q22 4 26 8" 
              stroke="#22c55e" 
              strokeWidth="4" 
              fill="none"
              strokeLinecap="round"
              animate={{ 
                d: [
                  "M2 10 Q6 4 10 10 Q14 16 18 10 Q22 4 26 8",
                  "M2 8 Q6 14 10 8 Q14 2 18 8 Q22 14 26 10",
                  "M2 10 Q6 4 10 10 Q14 16 18 10 Q22 4 26 8"
                ]
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <circle cx="26" cy="8" r="3" fill="#1e1b4b" stroke="#22c55e" strokeWidth="1"/>
            <motion.circle cx="25" cy="7" r="1" fill="#06b6d4"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
            <motion.circle cx="27" cy="7" r="1" fill="#06b6d4"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: 0.2 }}
            />
          </motion.svg>
        );
      case 'pixel_dragon':
        return (
          <motion.svg 
            width="26" 
            height="20" 
            viewBox="0 0 26 20"
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            style={{ filter: 'drop-shadow(0 0 3px #ef4444)' }}
          >
            <rect x="8" y="10" width="10" height="8" fill="#dc2626"/>
            <rect x="10" y="6" width="8" height="6" fill="#ef4444"/>
            <rect x="6" y="4" width="4" height="4" fill="#dc2626"/>
            <rect x="16" y="4" width="4" height="4" fill="#dc2626"/>
            <rect x="12" y="8" width="2" height="2" fill="#fbbf24"/>
            <rect x="16" y="8" width="2" height="2" fill="#fbbf24"/>
            <rect x="20" y="12" width="6" height="2" fill="#b91c1c"/>
            <rect x="0" y="12" width="6" height="2" fill="#b91c1c"/>
            <motion.rect x="6" y="2" width="2" height="2" fill="#fbbf24"
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          </motion.svg>
        );
      case 'void_cat':
        return (
          <motion.svg 
            width="22" 
            height="18" 
            viewBox="0 0 22 18"
            style={{ filter: 'drop-shadow(0 0 4px rgba(0, 0, 0, 0.8))' }}
          >
            <ellipse cx="11" cy="13" rx="7" ry="4" fill="#18181b" stroke="#3f3f46" strokeWidth="0.5"/>
            <ellipse cx="11" cy="8" rx="6" ry="5" fill="#18181b" stroke="#3f3f46" strokeWidth="0.5"/>
            <polygon points="4,7 5,1 8,5" fill="#18181b" stroke="#3f3f46" strokeWidth="0.5"/>
            <polygon points="18,7 17,1 14,5" fill="#18181b" stroke="#3f3f46" strokeWidth="0.5"/>
            <motion.circle cx="8" cy="7" r="1.5" fill="#a855f7"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.circle cx="14" cy="7" r="1.5" fill="#a855f7"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            />
            <motion.circle cx="6" cy="4" r="0.5" fill="#fff" opacity="0.5"
              animate={{ opacity: [0.2, 0.6, 0.2] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <motion.circle cx="16" cy="5" r="0.5" fill="#fff" opacity="0.5"
              animate={{ opacity: [0.2, 0.6, 0.2] }}
              transition={{ duration: 3, repeat: Infinity, delay: 1 }}
            />
          </motion.svg>
        );
      case 'quantum_hamster':
        return (
          <motion.svg 
            width="20" 
            height="18" 
            viewBox="0 0 20 18"
            animate={{ 
              opacity: [1, 0.5, 1, 0.7, 1],
              x: [0, 2, 0, -2, 0]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ filter: 'drop-shadow(0 0 4px rgba(168, 85, 247, 0.5))' }}
          >
            <ellipse cx="10" cy="12" rx="8" ry="5" fill="#a78bfa" stroke="#8b5cf6" strokeWidth="0.5"/>
            <circle cx="10" cy="8" r="5" fill="#c4b5fd" stroke="#8b5cf6" strokeWidth="0.5"/>
            <circle cx="4" cy="10" r="2" fill="#c4b5fd"/>
            <circle cx="16" cy="10" r="2" fill="#c4b5fd"/>
            <circle cx="8" cy="7" r="1.5" fill="#18181b"/>
            <circle cx="12" cy="7" r="1.5" fill="#18181b"/>
            <motion.circle cx="8" cy="7" r="0.5" fill="#06b6d4"
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
            <motion.circle cx="12" cy="7" r="0.5" fill="#ec4899"
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: 0.2 }}
            />
            <ellipse cx="10" cy="10" rx="1" ry="0.5" fill="#ec4899"/>
            <circle cx="6" cy="4" r="2" fill="#c4b5fd" stroke="#8b5cf6" strokeWidth="0.5"/>
            <circle cx="14" cy="4" r="2" fill="#c4b5fd" stroke="#8b5cf6" strokeWidth="0.5"/>
          </motion.svg>
        );
      default:
        return null;
    }
  };
  
  return (
    <motion.div 
      className="absolute" 
      style={{ 
        transform: facingRight ? 'scaleX(1)' : 'scaleX(-1)',
        zIndex: 4
      }}
      animate={{ x: [0, 3, 0, -3, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      {renderPet()}
    </motion.div>
  );
});

const CSSPrestigePet = React.memo(function CSSPrestigePet({ petId }: { petId: string }) {
  if (petId === 'none') return null;
  
  const renderPet = () => {
    switch (petId) {
      case 'prestige_spark':
      case 'ascension_spark':
        return (
          <motion.svg 
            width="18" 
            height="18" 
            viewBox="0 0 18 18"
            style={{ filter: 'drop-shadow(0 0 4px #fbbf24)' }}
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <circle cx="9" cy="9" r="6" fill="#fbbf24" opacity="0.4"/>
            <circle cx="9" cy="9" r="4" fill="#fcd34d"/>
            <circle cx="7" cy="8" r="1" fill="#fff"/>
            <circle cx="11" cy="8" r="1" fill="#fff"/>
            <path d="M9 4 L10 6 L9 7 L8 6 Z" fill="#fef3c7"/>
            <path d="M4 9 L6 8 L6 10 Z" fill="#fef3c7"/>
            <path d="M14 9 L12 8 L12 10 Z" fill="#fef3c7"/>
          </motion.svg>
        );
      case 'prestige_ember':
      case 'ascension_ember':
        return (
          <motion.svg 
            width="16" 
            height="20" 
            viewBox="0 0 16 20"
            style={{ filter: 'drop-shadow(0 0 5px #f97316)' }}
            animate={{ y: [0, -2, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <ellipse cx="8" cy="16" rx="5" ry="3" fill="#ef4444" opacity="0.3"/>
            <path d="M8 4 Q12 9 10 14 Q8 18 6 14 Q4 9 8 4" fill="#f97316"/>
            <path d="M8 6 Q10 9 9 12 Q8 14 7 12 Q6 9 8 6" fill="#fbbf24"/>
            <circle cx="7" cy="9" r="1" fill="#fff" opacity="0.7"/>
          </motion.svg>
        );
      case 'prestige_phantom':
      case 'ascension_phantom':
        return (
          <motion.svg 
            width="18" 
            height="18" 
            viewBox="0 0 18 18"
            style={{ filter: 'drop-shadow(0 0 4px #06b6d4)' }}
            animate={{ opacity: [0.6, 1, 0.6], y: [0, -3, 0] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            <ellipse cx="9" cy="11" rx="6" ry="5" fill="#06b6d4" opacity="0.25"/>
            <path d="M5 14 Q5 6 9 5 Q13 6 13 14 Q9 16 5 14" fill="#06b6d4" opacity="0.5"/>
            <circle cx="7" cy="9" r="1.5" fill="#fff"/>
            <circle cx="11" cy="9" r="1.5" fill="#fff"/>
            <circle cx="7" cy="9" r="0.7" fill="#0891b2"/>
            <circle cx="11" cy="9" r="0.7" fill="#0891b2"/>
          </motion.svg>
        );
      case 'prestige_nexus':
      case 'ascension_nexus':
        return (
          <motion.svg 
            width="20" 
            height="20" 
            viewBox="0 0 20 20"
            style={{ filter: 'drop-shadow(0 0 5px #8b5cf6)' }}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <polygon points="10,2 17,10 14,18 6,18 3,10" fill="#8b5cf6" stroke="#a78bfa" strokeWidth="0.5"/>
            <circle cx="10" cy="10" r="3" fill="#c4b5fd"/>
            <circle cx="10" cy="10" r="1.5" fill="#8b5cf6"/>
            <motion.circle cx="10" cy="10" r="1" fill="#fff"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </motion.svg>
        );
      case 'prestige_oracle':
      case 'ascension_oracle':
        return (
          <motion.svg 
            width="20" 
            height="20" 
            viewBox="0 0 20 20"
            style={{ filter: 'drop-shadow(0 0 6px #a855f7)' }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <ellipse cx="10" cy="10" rx="8" ry="8" fill="#a855f7" opacity="0.2"/>
            <circle cx="10" cy="10" r="6" fill="#1e1b4b" stroke="#a855f7" strokeWidth="0.7"/>
            <circle cx="10" cy="10" r="3.5" fill="#a855f7"/>
            <circle cx="10" cy="10" r="1.5" fill="#e879f9"/>
            <circle cx="9" cy="9" r="0.7" fill="#fff"/>
            <path d="M5 5 L6 6 M15 5 L14 6" stroke="#a855f7" strokeWidth="0.5"/>
          </motion.svg>
        );
      case 'prestige_infinity':
      case 'ascension_infinity':
        return (
          <motion.svg 
            width="22" 
            height="16" 
            viewBox="0 0 22 16"
            style={{ filter: 'drop-shadow(0 0 5px #a855f7)' }}
            animate={{ x: [0, 2, 0, -2, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <defs>
              <linearGradient id="infinity-grad-room" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24"/>
                <stop offset="50%" stopColor="#a855f7"/>
                <stop offset="100%" stopColor="#06b6d4"/>
              </linearGradient>
            </defs>
            <motion.path 
              d="M5 8 Q5 4 8 4 Q11 4 11 8 Q11 4 14 4 Q17 4 17 8 Q17 12 14 12 Q11 12 11 8 Q11 12 8 12 Q5 12 5 8" 
              fill="none" 
              stroke="url(#infinity-grad-room)" 
              strokeWidth="2"
              animate={{ strokeDashoffset: [0, 50] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              strokeDasharray="5,2"
            />
            <motion.circle cx="8" cy="8" r="1.5" fill="#fbbf24"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <motion.circle cx="14" cy="8" r="1.5" fill="#06b6d4"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.5 }}
            />
          </motion.svg>
        );
      default:
        return null;
    }
  };
  
  return (
    <motion.div style={{ zIndex: 5 }}>
      {renderPet()}
    </motion.div>
  );
});

export const CSSCharacter = React.memo(function CSSCharacter({ 
  reaction = 'idle', 
  facingRight = true,
  skinPalette,
  accessoryId = 'none',
  capeId = 'none',
  wingId = 'none',
  headStyleId = 'default',
}: { 
  reaction?: CharacterReaction; 
  facingRight?: boolean;
  skinPalette?: SkinPalette;
  accessoryId?: string;
  capeId?: string;
  wingId?: string;
  headStyleId?: string;
}) {
  const isCheckpoint = reaction === 'checkpoint';
  const isCrit = reaction === 'crit';
  const isAchievement = reaction === 'achievement';
  const isPickup = reaction === 'pickup';
  const isReacting = reaction !== 'idle';
  
  const baseSkin = skinPalette || { primary: '#8b5cf6', secondary: '#6d28d9', glow: 'rgba(139, 92, 246, 0.6)', accent: '#a78bfa' };
  
  const isGradientSkin = baseSkin.paletteMode === 'gradient' || baseSkin.paletteMode === 'animated';
  const gradientStyle = isGradientSkin && baseSkin.gradientColors 
    ? `linear-gradient(135deg, ${baseSkin.gradientColors.join(', ')})` 
    : undefined;
  const animationDuration = baseSkin.animationSpeed || 3;

  const HEAD_CENTER = 20;

  const renderWingSlot = () => {
    switch (wingId) {
      case 'bm_ion_wings':
        return (
          <motion.div
            className="absolute"
            style={{ top: -15, left: HEAD_CENTER - 54, zIndex: 1, filter: 'drop-shadow(0 0 12px rgba(56,189,248,0.72))' }}
            animate={{ y: [0, -1.5, 0], opacity: [0.8, 0.95, 0.8] }}
            transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg width="108" height="58" viewBox="0 0 108 58" style={{ transform: 'scaleY(-1)', transformOrigin: 'center' }}>
              <path d="M6 46 Q16 20 34 14 Q47 10 54 18 Q39 29 20 50 Z" fill="rgba(34, 211, 238, 0.32)" stroke="#38bdf8" strokeWidth="2" />
              <path d="M102 46 Q92 20 74 14 Q61 10 54 18 Q69 29 88 50 Z" fill="rgba(34, 211, 238, 0.32)" stroke="#38bdf8" strokeWidth="2" />
              <path d="M22 40 Q34 30 45 24" stroke="#a5f3fc" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M86 40 Q74 30 63 24" stroke="#a5f3fc" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M34 47 Q43 36 51 29" stroke="#67e8f9" strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />
              <path d="M74 47 Q65 36 57 29" stroke="#67e8f9" strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />
            </svg>
          </motion.div>
        );
      case 'bm_prism_wings':
        return (
          <motion.div
            className="absolute"
            style={{ top: -22, left: HEAD_CENTER - 56, zIndex: 1, filter: 'drop-shadow(0 0 14px rgba(192,132,252,0.78))' }}
            animate={{ y: [0, -2, 0], opacity: [0.82, 1, 0.82] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg width="112" height="64" viewBox="0 0 112 64" style={{ transform: 'scaleY(-1)', transformOrigin: 'center' }}>
              <defs>
                <linearGradient id="bm-prism-wing-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#c084fc" />
                  <stop offset="50%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
              </defs>
              <path d="M6 50 Q17 20 38 13 Q49 9 56 18 Q40 31 20 53 Z" fill="url(#bm-prism-wing-grad)" fillOpacity="0.34" stroke="#c084fc" strokeWidth="2" />
              <path d="M106 50 Q95 20 74 13 Q63 9 56 18 Q72 31 92 53 Z" fill="url(#bm-prism-wing-grad)" fillOpacity="0.34" stroke="#c084fc" strokeWidth="2" />
              <path d="M22 43 Q35 31 48 25" stroke="#e9d5ff" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M90 43 Q77 31 64 25" stroke="#e9d5ff" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M36 52 Q45 40 53 32" stroke="#f5d0fe" strokeWidth="1.2" strokeLinecap="round" opacity="0.82" />
              <path d="M76 52 Q67 40 59 32" stroke="#f5d0fe" strokeWidth="1.2" strokeLinecap="round" opacity="0.82" />
              <circle cx="56" cy="18" r="2.1" fill="#f0abfc" />
            </svg>
          </motion.div>
        );
      case 'relic_quantum_wings':
        return (
          <motion.div
            className="absolute"
            style={{ top: -14, left: HEAD_CENTER - 50, zIndex: 1, filter: 'drop-shadow(0 0 12px rgba(103,232,249,0.78))' }}
            animate={{ y: [0, -1.5, 0], opacity: [0.82, 0.96, 0.82] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg width="100" height="56" viewBox="0 0 100 56" style={{ transform: 'scaleY(-1)', transformOrigin: 'center' }}>
              <defs>
                <linearGradient id="relic-wing-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#67e8f9" />
                  <stop offset="50%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#c084fc" />
                </linearGradient>
                <linearGradient id="relic-wing-inner-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(165,243,252,0.95)" />
                  <stop offset="100%" stopColor="rgba(34,211,238,0.2)" />
                </linearGradient>
              </defs>
              <path d="M7 42 Q14 22 29 14 Q38 10 50 16 Q37 26 17 45 Z" fill="url(#relic-wing-grad)" fillOpacity="0.43" stroke="#67e8f9" strokeWidth="1.8" />
              <path d="M93 42 Q86 22 71 14 Q62 10 50 16 Q63 26 83 45 Z" fill="url(#relic-wing-grad)" fillOpacity="0.43" stroke="#67e8f9" strokeWidth="1.8" />
              <path d="M18 39 Q28 29 41 22" stroke="url(#relic-wing-inner-grad)" strokeWidth="1.45" strokeLinecap="round" />
              <path d="M24 43 Q34 34 46 25" stroke="url(#relic-wing-inner-grad)" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
              <path d="M82 39 Q72 29 59 22" stroke="url(#relic-wing-inner-grad)" strokeWidth="1.45" strokeLinecap="round" />
              <path d="M76 43 Q66 34 54 25" stroke="url(#relic-wing-inner-grad)" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
              <path d="M49 16 L42 12" stroke="#a5f3fc" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M51 16 L58 12" stroke="#a5f3fc" strokeWidth="1.4" strokeLinecap="round" />
              <circle cx="50" cy="16" r="1.6" fill="#a5f3fc" opacity="0.85" />
            </svg>
          </motion.div>
        );
      case 'bm_quantum_wings_mk2':
        return (
          <motion.div
            className="absolute"
            style={{ top: -31, left: HEAD_CENTER - 62, zIndex: 1, filter: 'drop-shadow(0 0 16px rgba(244,63,94,0.82))' }}
            animate={{ y: [0, -2.2, 0], opacity: [0.84, 1, 0.84] }}
            transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg width="124" height="72" viewBox="0 0 124 72" style={{ transform: 'scaleY(-1)', transformOrigin: 'center' }}>
              <defs>
                <linearGradient id="bm-quantum-wing-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="55%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
              <path d="M7 56 Q19 22 42 13 Q55 9 62 18 Q45 32 22 58 Z" fill="url(#bm-quantum-wing-grad)" fillOpacity="0.36" stroke="#fb7185" strokeWidth="2.1" />
              <path d="M117 56 Q105 22 82 13 Q69 9 62 18 Q79 32 102 58 Z" fill="url(#bm-quantum-wing-grad)" fillOpacity="0.36" stroke="#fb7185" strokeWidth="2.1" />
              <path d="M22 47 Q36 33 51 26" stroke="#67e8f9" strokeWidth="1.7" strokeLinecap="round" />
              <path d="M102 47 Q88 33 73 26" stroke="#67e8f9" strokeWidth="1.7" strokeLinecap="round" />
              <path d="M43 59 Q53 42 59 33" stroke="#fda4af" strokeWidth="1.3" strokeLinecap="round" opacity="0.84" />
              <path d="M81 59 Q71 42 65 33" stroke="#fda4af" strokeWidth="1.3" strokeLinecap="round" opacity="0.84" />
              <path d="M61 18 L51 13" stroke="#fda4af" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M63 18 L73 13" stroke="#fda4af" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="62" cy="18" r="2.2" fill="#fda4af" />
            </svg>
          </motion.div>
        );
      default:
        return null;
    }
  };

  const renderCapeSlot = () => {
    switch (capeId) {
      case 'bm_void_cape':
        return (
          <motion.div
            className="absolute"
            style={{ top: 14, left: HEAD_CENTER - 25, zIndex: 2, filter: 'drop-shadow(0 0 10px rgba(30,41,59,0.72))' }}
            animate={{ y: [0, 1, 0], opacity: [0.78, 0.92, 0.78] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg width="50" height="50" viewBox="0 0 50 50">
              <path d="M4 5 Q25 0 46 5 L43 44 Q25 50 7 44 Z" fill="rgba(30,41,59,0.9)" stroke="#64748b" strokeWidth="1.25" />
              <path d="M10 9 L10 40 M25 7 L25 45 M40 9 L40 40" stroke="#334155" strokeWidth="0.95" opacity="0.72" />
            </svg>
          </motion.div>
        );
      case 'bm_plasma_cape':
        return (
          <motion.div
            className="absolute"
            style={{ top: 13, left: HEAD_CENTER - 26, zIndex: 2, filter: 'drop-shadow(0 0 11px rgba(244,114,182,0.68))' }}
            animate={{ y: [0, 1.4, 0], opacity: [0.8, 0.96, 0.8] }}
            transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg width="52" height="52" viewBox="0 0 52 52">
              <defs>
                <linearGradient id="bm-plasma-cape-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fb7185" />
                  <stop offset="50%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
              <path d="M4 5 Q26 0 48 5 L45 46 Q26 52 7 46 Z" fill="url(#bm-plasma-cape-grad)" fillOpacity="0.74" stroke="#fda4af" strokeWidth="1.3" />
              <path d="M10 11 Q26 20 42 11" stroke="#fce7f3" strokeWidth="1.05" opacity="0.86" />
              <path d="M12 22 Q26 31 40 22" stroke="#fbcfe8" strokeWidth="0.95" opacity="0.74" />
            </svg>
          </motion.div>
        );
      case 'bm_singularity_cape':
        return (
          <motion.div
            className="absolute"
            style={{ top: 12, left: HEAD_CENTER - 27, zIndex: 2, filter: 'drop-shadow(0 0 12px rgba(251,191,36,0.66))' }}
            animate={{ y: [0, 1.6, 0], opacity: [0.82, 1, 0.82] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg width="54" height="54" viewBox="0 0 54 54">
              <defs>
                <linearGradient id="bm-singularity-cape-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="40%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#111827" />
                </linearGradient>
              </defs>
              <path d="M4 5 Q27 -1 50 5 L47 48 Q27 54 7 48 Z" fill="url(#bm-singularity-cape-grad)" fillOpacity="0.8" stroke="#fbbf24" strokeWidth="1.35" />
              <path d="M11 11 Q27 17 43 11" stroke="#fde68a" strokeWidth="1.1" opacity="0.86" />
              <path d="M13 23 Q27 33 41 23" stroke="#fda4af" strokeWidth="1" opacity="0.79" />
              <path d="M17 36 Q27 43 37 36" stroke="#facc15" strokeWidth="0.9" opacity="0.72" />
            </svg>
          </motion.div>
        );
      default:
        return null;
    }
  };
  
  const renderAccessory = () => {
    switch (accessoryId) {
      case 'cowboy_hat':
        return (
          <div className="absolute" style={{ top: -10, left: HEAD_CENTER - 15, zIndex: 10, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))' }}>
            <svg width="30" height="20" viewBox="0 0 30 20">
              <path d="M3 16 L7 7 L11 12 L15 4 L19 12 L23 7 L27 16 Z" fill="#b45309" stroke="#78350f" strokeWidth="1.5"/>
              <ellipse cx="15" cy="18" rx="14" ry="3.5" fill="#d97706" stroke="#92400e" strokeWidth="1.5"/>
            </svg>
          </div>
        );
      case 'bowler_hat':
        return (
          <div className="absolute" style={{ top: -8, left: HEAD_CENTER - 14, zIndex: 10, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))' }}>
            <svg width="28" height="18" viewBox="0 0 28 18">
              <ellipse cx="14" cy="9" rx="9" ry="7" fill="#1f2937" stroke="#4b5563" strokeWidth="1.5"/>
              <ellipse cx="14" cy="16" rx="13" ry="3.5" fill="#374151" stroke="#6b7280" strokeWidth="1.5"/>
              <ellipse cx="14" cy="9" rx="6" ry="4" fill="#374151" opacity="0.3"/>
            </svg>
          </div>
        );
      case 'beanie':
        return (
          <div className="absolute" style={{ top: -6, left: HEAD_CENTER - 12, zIndex: 10, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))' }}>
            <svg width="24" height="16" viewBox="0 0 24 16">
              <path d="M3 14 Q3 4 12 2 Q21 4 21 14 Z" fill="#e11d48" stroke="#be123c" strokeWidth="1.5"/>
              <circle cx="12" cy="1" r="2.5" fill="#fb7185"/>
              <path d="M4 10 L20 10" stroke="#9f1239" strokeWidth="1.5" strokeDasharray="3,2"/>
              <path d="M4 7 L20 7" stroke="#9f1239" strokeWidth="1" strokeDasharray="2,2" opacity="0.5"/>
            </svg>
          </div>
        );
      case 'propeller_hat':
        return (
          <motion.div 
            className="absolute" 
            style={{ top: -12, left: HEAD_CENTER - 14, zIndex: 10, filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.5))' }}
          >
            <svg width="28" height="20" viewBox="0 0 28 20">
              <ellipse cx="14" cy="16" rx="11" ry="5" fill="#3b82f6" stroke="#2563eb" strokeWidth="1.5"/>
              <circle cx="14" cy="6" r="3" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1"/>
              <motion.g
                animate={{ rotate: 360 }}
                transition={{ duration: 0.4, repeat: Infinity, ease: "linear" }}
                style={{ transformOrigin: '14px 6px' }}
              >
                <path d="M4 6 L14 6 L24 6" stroke="#22c55e" strokeWidth="4" strokeLinecap="round"/>
              </motion.g>
            </svg>
          </motion.div>
        );
      case 'top_hat':
        return (
          <div className="absolute" style={{ top: -19, left: HEAD_CENTER - 13, zIndex: 10, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}>
            <svg width="26" height="26" viewBox="0 0 26 26">
              <rect x="6" y="2" width="14" height="16" fill="#1f2937" stroke="#4b5563" strokeWidth="1.5"/>
              <ellipse cx="13" cy="22" rx="12" ry="4" fill="#374151" stroke="#6b7280" strokeWidth="1.5"/>
              <rect x="7" y="16" width="12" height="3" fill="#fbbf24" stroke="#f59e0b" strokeWidth="0.5"/>
            </svg>
          </div>
        );
      case 'crown':
        return (
          <motion.div 
            className="absolute" 
            style={{ top: -8, left: HEAD_CENTER - 10, zIndex: 10, filter: 'drop-shadow(0 0 4px #fbbf24)' }}
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <svg width="20" height="14" viewBox="0 0 20 14">
              <path d="M2 12 L2 6 L6 9 L10 3 L14 9 L18 6 L18 12 Z" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1.5"/>
              <circle cx="10" cy="5" r="2" fill="#ef4444"/>
              <circle cx="5" cy="8" r="1.5" fill="#3b82f6"/>
              <circle cx="15" cy="8" r="1.5" fill="#22c55e"/>
            </svg>
          </motion.div>
        );
      case 'halo':
        return (
          <motion.div 
            className="absolute" 
            style={{ top: -6, left: HEAD_CENTER - 14, zIndex: 10, filter: 'drop-shadow(0 0 6px #fbbf24)' }}
            animate={{ opacity: [0.9, 1, 0.9], y: [0, -1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <svg width="28" height="12" viewBox="0 0 28 12">
              <ellipse cx="14" cy="6" rx="13" ry="5" fill="rgba(251, 191, 36, 0.2)" stroke="#fbbf24" strokeWidth="3"/>
              <ellipse cx="14" cy="6" rx="13" ry="5" fill="none" stroke="#fef3c7" strokeWidth="1.5" opacity="0.7"/>
            </svg>
          </motion.div>
        );
      case 'horns':
        return (
          <div className="absolute" style={{ top: -8, left: HEAD_CENTER - 16, zIndex: 10, filter: 'drop-shadow(0 0 4px #dc2626)' }}>
            <svg width="32" height="18" viewBox="0 0 32 18">
              <path d="M6 16 Q2 10 6 3" stroke="#ef4444" strokeWidth="4" fill="none" strokeLinecap="round"/>
              <path d="M26 16 Q30 10 26 3" stroke="#ef4444" strokeWidth="4" fill="none" strokeLinecap="round"/>
              <path d="M6 16 Q2 10 6 3" stroke="#dc2626" strokeWidth="2" fill="none" strokeLinecap="round"/>
              <path d="M26 16 Q30 10 26 3" stroke="#dc2626" strokeWidth="2" fill="none" strokeLinecap="round"/>
            </svg>
          </div>
        );
      case 'sunglasses':
        return (
          <div className="absolute" style={{ top: 2, left: HEAD_CENTER - 12, zIndex: 10, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}>
            <svg width="24" height="12" viewBox="0 0 24 12">
              <rect x="1" y="2" width="8" height="7" rx="2" fill="#0f172a" stroke="#64748b" strokeWidth="1.5"/>
              <rect x="15" y="2" width="8" height="7" rx="2" fill="#0f172a" stroke="#64748b" strokeWidth="1.5"/>
              <path d="M9 5 L15 5" stroke="#64748b" strokeWidth="2"/>
              <rect x="2" y="3" width="6" height="5" rx="1" fill="rgba(6, 182, 212, 0.15)"/>
              <rect x="16" y="3" width="6" height="5" rx="1" fill="rgba(6, 182, 212, 0.15)"/>
            </svg>
          </div>
        );
      case 'vr_visor':
        return (
          <motion.div 
            className="absolute" 
            style={{ top: 3, left: HEAD_CENTER - 13, zIndex: 10, filter: 'drop-shadow(0 0 6px #06b6d4)' }}
            animate={{ opacity: [0.9, 1, 0.9] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <svg width="26" height="12" viewBox="0 0 26 12">
              <rect x="1" y="1" width="24" height="10" rx="3" fill="#0f172a" stroke="#06b6d4" strokeWidth="1.5"/>
              <rect x="3" y="3" width="8" height="6" rx="1" fill="#06b6d4" opacity="0.4"/>
              <rect x="15" y="3" width="8" height="6" rx="1" fill="#06b6d4" opacity="0.4"/>
              <motion.rect x="3" y="3" width="8" height="6" rx="1" fill="#22d3ee" opacity="0.2"
                animate={{ opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </svg>
          </motion.div>
        );
      case 'monocle':
        return (
          <motion.div 
            className="absolute" 
            style={{ top: 2, left: HEAD_CENTER - 1, zIndex: 10, filter: 'drop-shadow(0 0 3px #fbbf24)' }}
            animate={{ rotate: [-2, 2, -2] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <svg width="14" height="16" viewBox="0 0 14 16">
              <circle cx="7" cy="6" r="5" fill="rgba(191, 219, 254, 0.3)" stroke="#fbbf24" strokeWidth="2"/>
              <circle cx="7" cy="6" r="3" fill="rgba(147, 197, 253, 0.4)"/>
              <path d="M7 11 L7 16" stroke="#fbbf24" strokeWidth="1.5"/>
            </svg>
          </motion.div>
        );
      case 'headphones':
        return (
          <div className="absolute" style={{ top: -5, left: HEAD_CENTER - 15, zIndex: 10, filter: 'drop-shadow(0 0 3px #ef4444)' }}>
            <svg width="30" height="22" viewBox="0 0 30 22">
              <path d="M5 14 Q5 4 15 4 Q25 4 25 14" stroke="#374151" strokeWidth="3" fill="none"/>
              <rect x="1" y="12" width="6" height="10" rx="2" fill="#ef4444" stroke="#dc2626" strokeWidth="1"/>
              <rect x="23" y="12" width="6" height="10" rx="2" fill="#ef4444" stroke="#dc2626" strokeWidth="1"/>
            </svg>
          </div>
        );
      case 'gaming_headset':
        return (
          <div className="absolute" style={{ top: -5, left: HEAD_CENTER - 15, zIndex: 10, filter: 'drop-shadow(0 0 3px #22c55e)' }}>
            <svg width="30" height="26" viewBox="0 0 30 26">
              <path d="M5 14 Q5 4 15 4 Q25 4 25 14" stroke="#374151" strokeWidth="3" fill="none"/>
              <rect x="1" y="12" width="6" height="10" rx="2" fill="#22c55e" stroke="#16a34a" strokeWidth="1"/>
              <rect x="23" y="12" width="6" height="10" rx="2" fill="#22c55e" stroke="#16a34a" strokeWidth="1"/>
              <path d="M4 22 L4 25 L10 23" stroke="#4b5563" strokeWidth="2" fill="none"/>
            </svg>
          </div>
        );
      case 'neural_link':
        return (
          <motion.div 
            className="absolute" 
            style={{ top: -4, left: HEAD_CENTER - 14, zIndex: 10, filter: 'drop-shadow(0 0 5px #a855f7)' }}
            animate={{ opacity: [0.9, 1, 0.9] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <svg width="28" height="18" viewBox="0 0 28 18">
              <path d="M4 12 Q4 4 14 4 Q24 4 24 12" stroke="#a855f7" strokeWidth="2" fill="none"/>
              <circle cx="4" cy="12" r="3" fill="#a855f7" stroke="#9333ea" strokeWidth="1"/>
              <circle cx="24" cy="12" r="3" fill="#a855f7" stroke="#9333ea" strokeWidth="1"/>
              <motion.circle cx="14" cy="4" r="2" fill="#e879f9"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            </svg>
          </motion.div>
        );
      case 'antenna':
        return (
          <motion.div 
            className="absolute" 
            style={{ top: -16, left: HEAD_CENTER - 7, zIndex: 10, filter: 'drop-shadow(0 0 4px #ef4444)' }}
            animate={{ rotate: [-5, 5, -5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <svg width="14" height="22" viewBox="0 0 14 22">
              <path d="M7 20 L7 8" stroke="#94a3b8" strokeWidth="2"/>
              <motion.circle 
                cx="7" cy="5" r="4" fill="none" stroke="#ef4444" strokeWidth="2"
                animate={{ opacity: [0.6, 1, 0.6], r: [4, 5, 4] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              />
              <circle cx="7" cy="5" r="2" fill="#ef4444"/>
            </svg>
          </motion.div>
        );
      case 'asc_wings_small':
        return (
          <motion.div 
            className="absolute" 
            style={{ top: -8, left: HEAD_CENTER - 18, zIndex: 10, filter: 'drop-shadow(0 0 6px #a855f7)' }}
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <svg width="36" height="20" viewBox="0 0 36 20">
              <motion.path d="M2 18 Q4 10 10 8 Q14 6 16 10 L18 10 L20 10 Q22 6 26 8 Q32 10 34 18" 
                fill="none" stroke="#a855f7" strokeWidth="2"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <motion.path d="M6 14 Q8 8 14 8" fill="none" stroke="#c4b5fd" strokeWidth="1.5"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
              />
              <motion.path d="M30 14 Q28 8 22 8" fill="none" stroke="#c4b5fd" strokeWidth="1.5"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
              />
            </svg>
          </motion.div>
        );
      case 'asc_third_eye':
        return (
          <motion.div 
            className="absolute" 
            style={{ top: 0, left: HEAD_CENTER - 6, zIndex: 10, filter: 'drop-shadow(0 0 5px #06b6d4)' }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <svg width="12" height="10" viewBox="0 0 12 10">
              <ellipse cx="6" cy="5" rx="5" ry="4" fill="#0f172a" stroke="#06b6d4" strokeWidth="1.5"/>
              <motion.circle cx="6" cy="5" r="2.5" fill="#06b6d4"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <circle cx="5" cy="4" r="1" fill="#fff" opacity="0.7"/>
            </svg>
          </motion.div>
        );
      case 'asc_crown_energy':
        return (
          <motion.div 
            className="absolute" 
            style={{ top: -10, left: HEAD_CENTER - 12, zIndex: 10, filter: 'drop-shadow(0 0 8px #fbbf24)' }}
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <svg width="24" height="18" viewBox="0 0 24 18">
              <motion.path d="M2 16 L2 8 L7 12 L12 4 L17 12 L22 8 L22 16 Z" 
                fill="none" stroke="#fbbf24" strokeWidth="2"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
              <motion.circle cx="12" cy="6" r="2" fill="#f97316"
                animate={{ scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
              <motion.circle cx="6" cy="10" r="1.5" fill="#22c55e"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.1 }}
              />
              <motion.circle cx="18" cy="10" r="1.5" fill="#3b82f6"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
              />
            </svg>
          </motion.div>
        );
      case 'asc_void_helm':
        return (
          <motion.div 
            className="absolute" 
            style={{ top: -8, left: HEAD_CENTER - 14, zIndex: 10, filter: 'drop-shadow(0 0 6px #1e1b4b)' }}
            animate={{ opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <svg width="28" height="22" viewBox="0 0 28 22">
              <path d="M4 20 Q2 12 6 6 Q14 0 22 6 Q26 12 24 20 Z" fill="#1e1b4b" stroke="#4c1d95" strokeWidth="1.5"/>
              <motion.path d="M8 14 Q14 8 20 14" fill="none" stroke="#7c3aed" strokeWidth="2"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <motion.circle cx="10" cy="12" r="1.5" fill="#8b5cf6"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
              <motion.circle cx="18" cy="12" r="1.5" fill="#8b5cf6"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 }}
              />
            </svg>
          </motion.div>
        );
      case 'asc_cosmic_visor':
        return (
          <motion.div 
            className="absolute" 
            style={{ top: 2, left: HEAD_CENTER - 14, zIndex: 10, filter: 'drop-shadow(0 0 6px #ec4899)' }}
            animate={{ opacity: [0.9, 1, 0.9] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <svg width="28" height="14" viewBox="0 0 28 14">
              <defs>
                <linearGradient id="cosmic-visor-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ec4899"/>
                  <stop offset="50%" stopColor="#8b5cf6"/>
                  <stop offset="100%" stopColor="#06b6d4"/>
                </linearGradient>
              </defs>
              <rect x="1" y="2" width="26" height="10" rx="4" fill="#0f172a" stroke="url(#cosmic-visor-grad)" strokeWidth="2"/>
              <motion.rect x="4" y="4" width="20" height="6" rx="2" fill="url(#cosmic-visor-grad)" opacity="0.3"
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </svg>
          </motion.div>
        );
      case 'asc_divine_aura':
        return (
          <motion.div 
            className="absolute" 
            style={{ top: -6, left: HEAD_CENTER - 16, zIndex: 10, filter: 'drop-shadow(0 0 10px #fbbf24)' }}
            animate={{ y: [0, -2, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <svg width="32" height="16" viewBox="0 0 32 16">
              <defs>
                <linearGradient id="divine-aura-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fbbf24"/>
                  <stop offset="50%" stopColor="#f0f9ff"/>
                  <stop offset="100%" stopColor="#fbbf24"/>
                </linearGradient>
              </defs>
              <motion.ellipse cx="16" cy="8" rx="14" ry="6" fill="none" stroke="url(#divine-aura-grad)" strokeWidth="3"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <motion.ellipse cx="16" cy="8" rx="10" ry="4" fill="none" stroke="#fef3c7" strokeWidth="1.5" opacity="0.5"
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
              />
            </svg>
          </motion.div>
        );
      case 'paragon_void_diadem':
        return (
          <motion.div
            className="absolute"
            style={{ top: -11, left: HEAD_CENTER - 14, zIndex: 11, filter: 'drop-shadow(0 0 10px rgba(167, 139, 250, 0.8))' }}
            animate={{ y: [0, -1.5, 0], opacity: [0.9, 1, 0.9] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg width="28" height="20" viewBox="0 0 28 20">
              <defs>
                <linearGradient id="paragon-diadem-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="55%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
              <path d="M2 14 Q6 6 14 4 Q22 6 26 14 L24 18 L4 18 Z" fill="rgba(8,20,45,0.92)" stroke="url(#paragon-diadem-grad)" strokeWidth="1.8" />
              <path d="M6 13 Q14 8 22 13" fill="none" stroke="#67e8f9" strokeWidth="1.4" opacity="0.9" />
              <path d="M14 2 L17 8 L14 14 L11 8 Z" fill="rgba(34,211,238,0.45)" stroke="#a5f3fc" strokeWidth="1.2" />
              <circle cx="9" cy="12" r="1.2" fill="#c4b5fd" />
              <circle cx="19" cy="12" r="1.2" fill="#c4b5fd" />
            </svg>
          </motion.div>
        );
      default:
        return null;
    }
  };

  const isHeadReplacement = headStyleId !== 'default';

  const renderAlternateHead = () => {
    if (headStyleId === 'default') return null;
    
    switch (headStyleId) {
      case 'android':
        return (
          <svg 
            width="18" 
            height="18" 
            viewBox="0 0 18 18"
            style={{
              position: 'absolute',
              top: 0,
              left: 11,
              zIndex: 6,
              overflow: 'visible'
            }}
          >
            <rect x="1" y="1" width="16" height="16" rx="2" fill="#374151" stroke="#6b7280" strokeWidth="1"/>
            <circle cx="6" cy="7" r="2" fill="#22c55e"/>
            <circle cx="12" cy="7" r="2" fill="#22c55e"/>
            <rect x="5" y="12" width="8" height="2" rx="1" fill="#4b5563"/>
            <path d="M3 0 L3 2 M15 0 L15 2" stroke="#6b7280" strokeWidth="1.5"/>
          </svg>
        );
      case 'skull':
        return (
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 20 20"
            style={{
              position: 'absolute',
              top: -1,
              left: 10,
              zIndex: 6,
              filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.3))',
              overflow: 'visible'
            }}
          >
            <ellipse cx="10" cy="10" rx="9" ry="9" fill="#d4d4d8" stroke="#a1a1aa" strokeWidth="0.5"/>
            <ellipse cx="7" cy="8" rx="2.5" ry="3" fill="#18181b"/>
            <ellipse cx="13" cy="8" rx="2.5" ry="3" fill="#18181b"/>
            <path d="M7 15 L7 18 M10 15 L10 18 M13 15 L13 18" stroke="#18181b" strokeWidth="1.5"/>
          </svg>
        );
      case 'tv_head':
        return (
          <motion.svg 
            width="22" 
            height="20" 
            viewBox="0 0 22 20"
            style={{
              position: 'absolute',
              top: -1,
              left: 9,
              zIndex: 6,
              overflow: 'visible'
            }}
            animate={{ filter: ['drop-shadow(0 0 4px rgba(6, 182, 212, 0.5))', 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.8))', 'drop-shadow(0 0 4px rgba(6, 182, 212, 0.5))'] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <rect x="1" y="1" width="20" height="16" rx="2" fill="#1f2937" stroke="#4b5563" strokeWidth="1"/>
            <rect x="3" y="3" width="16" height="10" rx="1" fill="#0f172a"/>
            <motion.rect x="4" y="4" width="4" height="3" fill="#06b6d4"
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <rect x="4" y="8" width="10" height="1" fill="#06b6d4" opacity="0.5"/>
            <rect x="4" y="10" width="6" height="1" fill="#06b6d4" opacity="0.3"/>
            <motion.circle cx="18" cy="15" r="1.5" fill="#ef4444"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </motion.svg>
        );
      case 'helmet':
        return (
          <svg 
            width="22" 
            height="20" 
            viewBox="0 0 22 20"
            style={{
              position: 'absolute',
              top: -2,
              left: 9,
              zIndex: 6,
              overflow: 'visible'
            }}
          >
            <path d="M2 12 Q2 2 11 1 Q20 2 20 12 L20 18 L2 18 Z" fill="#374151" stroke="#4b5563" strokeWidth="0.5"/>
            <rect x="4" y="8" width="14" height="6" rx="1" fill="#1e293b" stroke="#0ea5e9" strokeWidth="0.5"/>
            <path d="M4 8 L18 14" stroke="#0ea5e9" strokeWidth="0.3" opacity="0.5"/>
            <motion.circle cx="17" cy="4" r="2" fill="#fbbf24"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </svg>
        );
      case 'alien':
        return (
          <svg 
            width="20" 
            height="24" 
            viewBox="0 0 20 24"
            style={{
              position: 'absolute',
              top: -4,
              left: 10,
              zIndex: 6,
              filter: 'drop-shadow(0 0 4px rgba(74, 222, 128, 0.4))',
              overflow: 'visible'
            }}
          >
            <ellipse cx="10" cy="14" rx="9" ry="10" fill="#4ade80" stroke="#22c55e" strokeWidth="0.5"/>
            <ellipse cx="6" cy="12" rx="3" ry="5" fill="#18181b"/>
            <ellipse cx="14" cy="12" rx="3" ry="5" fill="#18181b"/>
            <motion.ellipse cx="6" cy="12" rx="1.5" ry="2.5" fill="#86efac"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.ellipse cx="14" cy="12" rx="1.5" ry="2.5" fill="#86efac"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            />
          </svg>
        );
      case 'cube':
        return (
          <motion.svg 
            width="20" 
            height="20" 
            viewBox="0 0 20 20"
            style={{
              position: 'absolute',
              top: -1,
              left: 10,
              zIndex: 6,
              filter: 'drop-shadow(0 0 4px rgba(139, 92, 246, 0.5))',
              overflow: 'visible'
            }}
            animate={{ rotate: [0, 5, 0, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <polygon points="10,1 19,5 19,15 10,19 1,15 1,5" fill="#8b5cf6" stroke="#a78bfa" strokeWidth="0.5"/>
            <polygon points="10,1 19,5 10,9 1,5" fill="#a78bfa"/>
            <polygon points="10,9 19,5 19,15 10,19" fill="#7c3aed"/>
            <rect x="4" y="7" width="4" height="4" fill="#c4b5fd"/>
            <rect x="12" y="7" width="4" height="4" fill="#c4b5fd"/>
          </motion.svg>
        );
      case 'orb':
        return (
          <motion.svg 
            width="20" 
            height="20" 
            viewBox="0 0 20 20"
            style={{
              position: 'absolute',
              top: -1,
              left: 10,
              zIndex: 6,
              filter: 'drop-shadow(0 0 6px rgba(6, 182, 212, 0.6))',
              overflow: 'visible'
            }}
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <defs>
              <radialGradient id="orb-head-grad" cx="30%" cy="30%">
                <stop offset="0%" stopColor="#67e8f9"/>
                <stop offset="100%" stopColor="#0891b2"/>
              </radialGradient>
            </defs>
            <circle cx="10" cy="10" r="9" fill="url(#orb-head-grad)" stroke="#06b6d4" strokeWidth="0.5"/>
            <ellipse cx="7" cy="7" rx="3" ry="1.5" fill="#fff" opacity="0.4"/>
            <motion.circle cx="7" cy="9" r="1.5" fill="#fff"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.circle cx="13" cy="9" r="1.5" fill="#fff"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
            />
          </motion.svg>
        );
      case 'glitch':
        return (
          <motion.svg 
            width="20" 
            height="20" 
            viewBox="0 0 20 20"
            style={{
              position: 'absolute',
              top: -1,
              left: 10,
              zIndex: 6,
              overflow: 'visible'
            }}
            animate={{ x: [0, -1, 1, 0], opacity: [1, 0.9, 1] }}
            transition={{ duration: 0.3, repeat: Infinity, repeatDelay: 2 }}
          >
            <rect x="1" y="1" width="18" height="18" fill="#1e1b4b" stroke="#a855f7" strokeWidth="0.5"/>
            <motion.rect x="-1" y="5" width="5" height="4" fill="#ec4899" opacity="0.7"
              animate={{ x: [-2, 0, -2] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
            />
            <motion.rect x="16" y="11" width="5" height="4" fill="#06b6d4" opacity="0.7"
              animate={{ x: [0, 2, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
            />
            <rect x="3" y="3" width="14" height="2" fill="#a855f7"/>
            <rect x="5" y="7" width="10" height="3" rx="1" fill="#06b6d4"/>
            <rect x="4" y="12" width="5" height="2" fill="#ec4899"/>
            <rect x="11" y="12" width="5" height="2" fill="#fbbf24"/>
          </motion.svg>
        );
      case 'void':
        return (
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 20 20"
            style={{
              position: 'absolute',
              top: -1,
              left: 10,
              zIndex: 6,
              filter: 'drop-shadow(0 0 4px rgba(0, 0, 0, 0.8))',
              overflow: 'visible'
            }}
          >
            <ellipse cx="10" cy="10" rx="9" ry="9" fill="#18181b" stroke="#3f3f46" strokeWidth="0.5"/>
            <motion.circle cx="7" cy="8" r="1.5" fill="#fff"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.circle cx="13" cy="8" r="1.5" fill="#fff"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            />
            <circle cx="7" cy="8" r="0.5" fill="#a855f7"/>
            <circle cx="13" cy="8" r="0.5" fill="#a855f7"/>
            <motion.circle cx="5" cy="4" r="0.5" fill="#fff" opacity="0.5"
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <motion.circle cx="15" cy="5" r="0.5" fill="#fff" opacity="0.5"
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, delay: 1 }}
            />
            <motion.circle cx="10" cy="3" r="0.5" fill="#fff" opacity="0.5"
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, delay: 2 }}
            />
          </svg>
        );
      case 'triangle':
        return (
          <svg 
            width="22" 
            height="20" 
            viewBox="0 0 22 20"
            style={{
              position: 'absolute',
              top: -2,
              left: 9,
              zIndex: 6,
              filter: 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.5))',
              overflow: 'visible'
            }}
          >
            <polygon points="11,1 21,19 1,19" fill="#1e1b4b" stroke="#ef4444" strokeWidth="1"/>
            <polygon points="11,4 18,17 4,17" fill="#0f172a" stroke="#ef4444" strokeWidth="0.5"/>
            <motion.circle cx="8" cy="12" r="2" fill="#ef4444"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.circle cx="14" cy="12" r="2" fill="#ef4444"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
            />
            <motion.circle cx="11" cy="6" r="1" fill="#fbbf24"
              animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </svg>
        );
      case 'asc_crystal':
        return (
          <motion.svg 
            width="22" 
            height="24" 
            viewBox="0 0 22 24"
            style={{
              position: 'absolute',
              top: -8,
              left: '50%',
              marginLeft: -11,
              zIndex: 6,
              filter: 'drop-shadow(0 0 6px rgba(147, 197, 253, 0.8))',
              overflow: 'visible'
            }}
            animate={{ filter: ['drop-shadow(0 0 6px rgba(147, 197, 253, 0.6))', 'drop-shadow(0 0 10px rgba(147, 197, 253, 1))', 'drop-shadow(0 0 6px rgba(147, 197, 253, 0.6))'] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <polygon points="11,0 18,8 14,20 8,20 4,8" fill="rgba(147, 197, 253, 0.3)" stroke="#93c5fd" strokeWidth="1"/>
            <polygon points="11,2 15,8 11,18 7,8" fill="rgba(196, 181, 253, 0.4)"/>
            <motion.polygon points="11,4 13,8 11,14 9,8" fill="#dbeafe"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.circle cx="8" cy="9" r="2" fill="#fff"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <motion.circle cx="14" cy="9" r="2" fill="#fff"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
            />
          </motion.svg>
        );
      case 'asc_flame':
        return (
          <motion.svg 
            width="24" 
            height="28" 
            viewBox="0 0 24 28"
            style={{
              position: 'absolute',
              top: -12,
              left: '50%',
              marginLeft: -12,
              zIndex: 6,
              filter: 'drop-shadow(0 0 8px rgba(249, 115, 22, 0.8))',
              overflow: 'visible'
            }}
          >
            <motion.path 
              d="M12 2 Q18 10 16 18 Q14 24 12 22 Q10 24 8 18 Q6 10 12 2"
              fill="#f97316"
              stroke="#fbbf24"
              strokeWidth="0.5"
              animate={{ 
                d: [
                  "M12 2 Q18 10 16 18 Q14 24 12 22 Q10 24 8 18 Q6 10 12 2",
                  "M12 0 Q20 8 17 17 Q14 24 12 22 Q10 24 7 17 Q4 8 12 0",
                  "M12 2 Q18 10 16 18 Q14 24 12 22 Q10 24 8 18 Q6 10 12 2"
                ]
              }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
            <motion.path 
              d="M12 6 Q15 11 14 17 Q12 20 10 17 Q9 11 12 6"
              fill="#fbbf24"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
            <motion.circle cx="9" cy="14" r="2" fill="#fff" opacity="0.8"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            />
            <motion.circle cx="15" cy="14" r="2" fill="#fff" opacity="0.8"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
            />
          </motion.svg>
        );
      case 'asc_storm':
        return (
          <motion.svg 
            width="26" 
            height="22" 
            viewBox="0 0 26 22"
            style={{
              position: 'absolute',
              top: -8,
              left: '50%',
              marginLeft: -13,
              zIndex: 6,
              filter: 'drop-shadow(0 0 6px rgba(96, 165, 250, 0.7))',
              overflow: 'visible'
            }}
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <ellipse cx="13" cy="10" rx="11" ry="8" fill="rgba(96, 165, 250, 0.3)" stroke="#60a5fa" strokeWidth="0.5"/>
            <motion.ellipse cx="13" cy="10" rx="8" ry="6" fill="rgba(147, 197, 253, 0.5)"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.circle cx="10" cy="9" r="2" fill="#fff"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.circle cx="16" cy="9" r="2" fill="#fff"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
            />
            <motion.path d="M13 14 L11 18 L14 17 L12 22" stroke="#fbbf24" strokeWidth="1.5" fill="none"
              animate={{ opacity: [0, 1, 1, 0], y: [0, 0, 2, 4] }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
            />
          </motion.svg>
        );
      case 'asc_celestial':
        return (
          <motion.svg 
            width="28" 
            height="26" 
            viewBox="0 0 28 26"
            style={{
              position: 'absolute',
              top: -10,
              left: '50%',
              marginLeft: -14,
              zIndex: 6,
              filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.8))',
              overflow: 'visible'
            }}
          >
            <motion.ellipse cx="14" cy="6" rx="10" ry="3" fill="none" stroke="#fbbf24" strokeWidth="2"
              animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <ellipse cx="14" cy="14" rx="8" ry="8" fill="rgba(251, 191, 36, 0.2)" stroke="#fcd34d" strokeWidth="0.5"/>
            <ellipse cx="14" cy="14" rx="6" ry="6" fill="rgba(254, 243, 199, 0.3)"/>
            <motion.circle cx="11" cy="13" r="2" fill="#fef3c7"
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            <motion.circle cx="17" cy="13" r="2" fill="#fef3c7"
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }}
            />
            <motion.circle cx="5" cy="4" r="1" fill="#fbbf24"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.circle cx="23" cy="4" r="1" fill="#fbbf24"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            />
          </motion.svg>
        );
      case 'asc_galaxy':
        return (
          <motion.svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24"
            style={{
              position: 'absolute',
              top: -7,
              left: '50%',
              marginLeft: -12,
              zIndex: 6,
              filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.7))',
              overflow: 'visible'
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          >
            <circle cx="12" cy="12" r="10" fill="#0f0720" stroke="#a855f7" strokeWidth="0.5"/>
            <motion.ellipse cx="12" cy="12" rx="9" ry="3" fill="none" stroke="#c4b5fd" strokeWidth="1" 
              style={{ transform: 'rotate(-30deg)', transformOrigin: '12px 12px' }}
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <motion.ellipse cx="12" cy="12" rx="7" ry="2" fill="none" stroke="#e879f9" strokeWidth="0.8"
              style={{ transform: 'rotate(30deg)', transformOrigin: '12px 12px' }}
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            />
            <motion.circle cx="10" cy="11" r="2" fill="#fff"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.circle cx="14" cy="11" r="2" fill="#fff"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
            />
            <motion.circle cx="6" cy="8" r="0.8" fill="#e879f9"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.circle cx="18" cy="16" r="0.8" fill="#c4b5fd"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.7 }}
            />
            <motion.circle cx="8" cy="17" r="0.6" fill="#06b6d4"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: 1.2 }}
            />
          </motion.svg>
        );
      case 'asc_omega':
        return (
          <motion.svg 
            width="24" 
            height="26" 
            viewBox="0 0 24 26"
            style={{
              position: 'absolute',
              top: -9,
              left: '50%',
              marginLeft: -12,
              zIndex: 6,
              filter: 'drop-shadow(0 0 10px rgba(240, 249, 255, 0.9))',
              overflow: 'visible'
            }}
            animate={{ 
              filter: [
                'drop-shadow(0 0 8px rgba(240, 249, 255, 0.7))',
                'drop-shadow(0 0 14px rgba(240, 249, 255, 1))',
                'drop-shadow(0 0 8px rgba(240, 249, 255, 0.7))'
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <defs>
              <linearGradient id="omega-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f0f9ff"/>
                <stop offset="50%" stopColor="#bae6fd"/>
                <stop offset="100%" stopColor="#7dd3fc"/>
              </linearGradient>
            </defs>
            <ellipse cx="12" cy="14" rx="10" ry="10" fill="url(#omega-grad)" stroke="#f0f9ff" strokeWidth="1"/>
            <ellipse cx="12" cy="14" rx="7" ry="7" fill="rgba(255,255,255,0.5)"/>
            <motion.circle cx="9" cy="13" r="2.5" fill="#fff"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.circle cx="15" cy="13" r="2.5" fill="#fff"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
            />
            <circle cx="9" cy="13" r="1" fill="#0ea5e9"/>
            <circle cx="15" cy="13" r="1" fill="#0ea5e9"/>
            <motion.path d="M8 20 L8 24 M16 20 L16 24" stroke="#bae6fd" strokeWidth="2"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.circle cx="4" cy="8" r="1.5" fill="#f0f9ff"
              animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.3, 1] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            />
            <motion.circle cx="20" cy="8" r="1.5" fill="#f0f9ff"
              animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.3, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 0.8 }}
            />
          </motion.svg>
        );
      case 'paragon_quantum_crown':
        return (
          <motion.svg
            width="28"
            height="24"
            viewBox="0 0 28 24"
            style={{
              position: 'absolute',
              top: -9,
              left: '50%',
              marginLeft: -14,
              zIndex: 7,
              filter: 'drop-shadow(0 0 10px rgba(34, 211, 238, 0.85))',
              overflow: 'visible'
            }}
            animate={{ y: [0, -1.8, 0], opacity: [0.88, 1, 0.88] }}
            transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
          >
            <defs>
              <linearGradient id="paragon-crown-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="50%" stopColor="#7dd3fc" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
            <path d="M3 20 L3 10 L8 14 L14 4 L20 14 L25 10 L25 20 Z" fill="rgba(8,24,46,0.72)" stroke="url(#paragon-crown-grad)" strokeWidth="1.8" />
            <path d="M6 18 L22 18" stroke="#67e8f9" strokeWidth="1.4" />
            <circle cx="14" cy="9" r="2.2" fill="#a5f3fc" />
            <circle cx="9" cy="13" r="1.4" fill="#c4b5fd" />
            <circle cx="19" cy="13" r="1.4" fill="#c4b5fd" />
          </motion.svg>
        );
      case 'relic_celestial_crown':
        return (
          <motion.svg
            width="30"
            height="26"
            viewBox="0 0 30 26"
            style={{
              position: 'absolute',
              top: -9,
              left: 5,
              zIndex: 7,
              overflow: 'visible',
              filter: 'drop-shadow(0 0 10px rgba(250,204,21,0.8))'
            }}
            animate={{ y: [0, -2, 0], opacity: [0.86, 1, 0.86] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <defs>
              <linearGradient id="relic-crown-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fde047" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>
            </defs>
            <path d="M3 20 L3 10 L8 14 L15 5 L22 14 L27 10 L27 20 Z" fill="url(#relic-crown-grad)" fillOpacity="0.45" stroke="#facc15" strokeWidth="1.6" />
            <circle cx="15" cy="9" r="2" fill="#67e8f9" />
            <circle cx="9" cy="13" r="1.3" fill="#f0abfc" />
            <circle cx="21" cy="13" r="1.3" fill="#f0abfc" />
            <ellipse cx="15" cy="3" rx="8.5" ry="2.2" fill="none" stroke="#67e8f9" strokeWidth="1.2" opacity="0.8" />
          </motion.svg>
        );
      default:
        return null;
    }
  };
  
  const getColor = () => {
    if (isCheckpoint) return { primary: '#fbbf24', secondary: '#f59e0b', glow: 'rgba(251, 191, 36, 0.8)', gradient: undefined, isAnimated: false };
    if (isCrit) return { primary: '#ef4444', secondary: '#dc2626', glow: 'rgba(239, 68, 68, 0.8)', gradient: undefined, isAnimated: false };
    if (isAchievement) return { primary: '#a855f7', secondary: '#9333ea', glow: 'rgba(168, 85, 247, 0.8)', gradient: undefined, isAnimated: false };
    if (isPickup) return { primary: '#22c55e', secondary: '#16a34a', glow: 'rgba(34, 197, 94, 0.8)', gradient: undefined, isAnimated: false };
    return { 
      primary: baseSkin.primary, 
      secondary: baseSkin.secondary, 
      glow: baseSkin.glow,
      gradient: gradientStyle,
      isAnimated: baseSkin.paletteMode === 'animated'
    };
  };
  
  const color = getColor();
  
  const gradientKeyframes = color.isAnimated ? `
    @keyframes gradientShift-${Math.random().toString(36).substr(2, 9)} {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
  ` : '';
  
  const animatedGradientStyle = color.gradient ? {
    background: color.gradient,
    backgroundSize: color.isAnimated ? '200% 200%' : '100% 100%',
    animation: color.isAnimated ? `gradientShift ${animationDuration}s ease infinite` : 'none',
  } : undefined;
  
  return (
    <motion.div 
      className="relative" 
      style={{ width: 40, height: 55, zIndex: 0 }}
      animate={
        isCheckpoint ? { y: [0, -15, 0, -10, 0] } :
        isCrit ? { rotate: [0, -10, 10, -5, 5, 0] } :
        isAchievement ? { scale: [1, 1.2, 1, 1.1, 1], y: [0, -8, 0] } :
        isPickup ? { y: [0, -5, 0], scale: [1, 1.1, 1] } :
        {}
      }
      transition={
        isCheckpoint ? { duration: 0.6, ease: "easeOut" } :
        isCrit ? { duration: 0.4, ease: "easeInOut" } :
        isAchievement ? { duration: 0.8, ease: "easeOut" } :
        isPickup ? { duration: 0.4, ease: "easeOut" } :
        {}
      }
    >
      {renderWingSlot()}
      {renderCapeSlot()}
      {isHeadReplacement ? renderAlternateHead() : (
        <motion.div
          className="absolute"
          style={{
            width: 18,
            height: 18,
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 3,
            background: isReacting 
              ? `linear-gradient(180deg, ${color.primary} 0%, ${color.secondary} 100%)`
              : 'linear-gradient(180deg, #1e1b4b 0%, #0f172a 100%)',
            border: `2px solid ${color.primary}`,
            borderRadius: '4px 4px 2px 2px',
            boxShadow: isReacting ? `0 0 20px ${color.glow}` : '0 0 10px rgba(6, 182, 212, 0.5)',
          }}
          animate={
            isReacting ? {} : {
              boxShadow: [
                '0 0 10px rgba(6, 182, 212, 0.5)',
                '0 0 15px rgba(6, 182, 212, 0.7)',
                '0 0 10px rgba(6, 182, 212, 0.5)',
              ],
            }
          }
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div 
            className="absolute"
            style={{
              top: '35%',
              left: '15%',
              right: '15%',
              height: '30%',
              background: `linear-gradient(90deg, ${color.primary} 0%, ${isReacting ? color.primary : '#22d3ee'} 50%, ${color.primary} 100%)`,
              borderRadius: '1px',
              boxShadow: `0 0 6px ${color.primary}`,
            }}
            animate={isCrit ? { opacity: [1, 0.5, 1] } : {}}
            transition={isCrit ? { duration: 0.2, repeat: 3 } : {}}
          />
        </motion.div>
      )}
      {renderAccessory()}
      
      <motion.div
        className="absolute"
        style={{
          width: 6,
          height: 14,
          top: 18,
          left: -2,
          zIndex: 3,
          background: isReacting 
            ? `linear-gradient(180deg, ${color.primary} 0%, ${color.secondary} 100%)`
            : 'linear-gradient(180deg, #312e81 0%, #1e1b4b 100%)',
          border: `1px solid ${color.primary}`,
          borderRadius: '2px',
          transformOrigin: 'top center',
        }}
        animate={
          isCheckpoint || isAchievement ? { rotate: [-20, -70, -20] } :
          isCrit ? { rotate: [0, 15, 0] } :
          isPickup ? { rotate: [-10, -30, -10] } :
          {}
        }
        transition={{ duration: isCheckpoint || isAchievement ? 0.5 : 0.3, repeat: isCheckpoint || isAchievement ? 2 : 1 }}
      />
      
      <motion.div
        className="absolute"
        style={{
          width: 6,
          height: 14,
          top: 18,
          right: -2,
          zIndex: 3,
          background: isReacting 
            ? `linear-gradient(180deg, ${color.primary} 0%, ${color.secondary} 100%)`
            : 'linear-gradient(180deg, #312e81 0%, #1e1b4b 100%)',
          border: `1px solid ${color.primary}`,
          borderRadius: '2px',
          transformOrigin: 'top center',
        }}
        animate={
          isCheckpoint || isAchievement ? { rotate: [20, 70, 20] } :
          isCrit ? { rotate: [0, -15, 0] } :
          isPickup ? { rotate: [10, 30, 10] } :
          {}
        }
        transition={{ duration: isCheckpoint || isAchievement ? 0.5 : 0.3, repeat: isCheckpoint || isAchievement ? 2 : 1 }}
      />
      
      <motion.div
        className="absolute"
        style={{
          width: 24,
          height: 28,
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 3,
          ...(animatedGradientStyle && !isReacting ? animatedGradientStyle : {
            background: isReacting 
              ? `linear-gradient(180deg, ${color.primary} 0%, ${color.secondary} 100%)`
              : (color.gradient || 'linear-gradient(180deg, #312e81 0%, #1e1b4b 100%)'),
          }),
          border: `2px solid ${color.primary}`,
          borderRadius: '3px',
          boxShadow: isReacting ? `0 0 15px ${color.glow}` : (color.gradient ? `0 0 12px ${color.glow}` : '0 0 8px rgba(139, 92, 246, 0.4)'),
        }}
        animate={color.isAnimated && !isReacting ? {
          boxShadow: [
            `0 0 10px ${color.glow}`,
            `0 0 18px ${color.glow}`,
            `0 0 10px ${color.glow}`,
          ],
        } : {}}
        transition={{ duration: animationDuration, repeat: Infinity, ease: "easeInOut" }}
      >
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-3 rounded-b-full"
          style={{ background: color.primary, opacity: 0.8 }}
        />
      </motion.div>
      
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-1" style={{ zIndex: 3 }}>
        <motion.div 
          style={{ 
            width: 8, 
            height: 12, 
            background: isReacting ? color.secondary : '#1e1b4b', 
            border: `1px solid ${color.primary}`, 
            borderRadius: '1px' 
          }}
          animate={isCheckpoint || isAchievement ? { y: [0, -3, 0] } : {}}
          transition={{ duration: 0.3, repeat: isCheckpoint || isAchievement ? 2 : 0, delay: 0 }}
        />
        <motion.div 
          style={{ 
            width: 8, 
            height: 12, 
            background: isReacting ? color.secondary : '#1e1b4b', 
            border: `1px solid ${color.primary}`, 
            borderRadius: '1px' 
          }}
          animate={isCheckpoint || isAchievement ? { y: [0, -3, 0] } : {}}
          transition={{ duration: 0.3, repeat: isCheckpoint || isAchievement ? 2 : 0, delay: 0.15 }}
        />
      </div>
    </motion.div>
  );
});

const CharacterReactionText = React.memo(function CharacterReactionText({ reaction }: { reaction: CharacterReaction }) {
  const { language } = useI18n();
  if (reaction === 'idle') return null;
  
  const getText = () => {
    switch (reaction) {
      case 'checkpoint':
        if (language === 'ru') return 'КОНТРОЛЬНАЯ ТОЧКА!';
        if (language === 'zh-CN') return '检查点！';
        return 'CHECKPOINT!';
      case 'crit': return 'CRIT!';
      case 'achievement':
        if (language === 'tr') return 'BASARI!';
        if (language === 'pt-BR') return 'CONQUISTA!';
        if (language === 'es') return 'LOGRO!';
        if (language === 'ru') return 'ДОСТИЖЕНИЕ!';
        if (language === 'zh-CN') return '成就！';
        return 'ACHIEVEMENT!';
      case 'pickup': return 'BONUS!';
      default: return '';
    }
  };
  
  const getColor = () => {
    switch (reaction) {
      case 'checkpoint': return 'text-amber-400';
      case 'crit': return 'text-red-400';
      case 'achievement': return 'text-purple-400';
      case 'pickup': return 'text-green-400';
      default: return 'text-cyan-400';
    }
  };
  
  return (
    <motion.div
      className={`absolute -top-6 left-1/2 -translate-x-1/2 font-bold text-xs whitespace-nowrap ${getColor()}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: [0, 1, 1, 0], y: [10, 0, 0, -10] }}
      transition={{ duration: 1.2 }}
    >
      {getText()}
    </motion.div>
  );
});

const IsometricFloor = React.memo(function IsometricFloor({ themeColors, offsetX = 0, showCenters = false }: { themeColors: ThemeColors; offsetX?: number; showCenters?: boolean }) {
  const tiles: React.ReactElement[] = [];
  
  for (let row = 0; row < FLOOR_GRID_SIZE; row++) {
    for (let col = 0; col < FLOOR_GRID_SIZE; col++) {
      const { x, y } = gridToScreen(row, col);
      const isDark = (row + col) % 2 === 0;
      tiles.push(
        <div
          key={`tile-${row}-${col}`}
          className="absolute"
          style={{
            width: TILE_WIDTH,
            height: TILE_HEIGHT,
            left: x + offsetX,
            top: y,
            background: isDark 
              ? themeColors.floorLight
              : themeColors.floorDark,
            clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
            border: 'none',
          }}
        />
      );
      tiles.push(
        <svg
          key={`tile-border-${row}-${col}`}
          className="absolute pointer-events-none"
          style={{
            width: TILE_WIDTH,
            height: TILE_HEIGHT,
            left: x + offsetX,
            top: y,
          }}
          viewBox={`0 0 ${TILE_WIDTH} ${TILE_HEIGHT}`}
        >
          <polygon
            points={`${TILE_WIDTH/2},0 ${TILE_WIDTH},${TILE_HEIGHT/2} ${TILE_WIDTH/2},${TILE_HEIGHT} 0,${TILE_HEIGHT/2}`}
            fill="none"
            stroke={themeColors.gridBorder}
            strokeWidth="1"
          />
        </svg>
      );
      if (showCenters) {
        tiles.push(
          <div
            key={`tile-center-${row}-${col}`}
            className="absolute pointer-events-none"
            style={{
              left: x + offsetX + TILE_WIDTH / 2,
              top: y + TILE_HEIGHT / 2,
              transform: 'translate(-50%, -50%)',
              width: 6,
              height: 6,
              borderRadius: '9999px',
              background: 'rgba(34, 211, 238, 0.95)',
              boxShadow: '0 0 8px rgba(34, 211, 238, 0.95)',
              zIndex: 120,
            }}
          />
        );
      }
    }
  }
  
  return <>{tiles}</>;
});

export interface OrbitalPlanetConfig {
  type: 'crystal' | 'lava' | 'gas_giant' | 'nebula' | 'black_hole' | 'binary_star' | 'lightsaber_duel' | 'death_star';
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

export interface ThemeColors {
  background: string;
  nebula1: string;
  nebula2: string;
  floorLight: string;
  floorDark: string;
  gridBorder: string;
  orbitalPlanet?: OrbitalPlanetConfig;
}

export interface SkinPalette {
  primary: string;
  secondary: string;
  glow: string;
  accent: string;
  paletteMode?: 'solid' | 'gradient' | 'animated';
  gradientColors?: string[];
  animationSpeed?: number;
}

type SpaceshipType = 'ufo' | 'rocket' | 'shuttle' | 'frigate' | 'asteroid' | 'voyager1';

interface SpaceshipState {
  id: number;
  type: SpaceshipType;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  duration: number;
  size: number;
}

interface PlanetConfig {
  id: number;
  x: number;
  y: number;
  size: number;
  type: 'gas' | 'rocky' | 'ice' | 'ringed';
  color1: string;
  color2: string;
  ringColor?: string;
  orbitDuration: number;
  glowColor: string;
}

type SpaceSpriteKind = 'asteroid' | 'satellite' | 'crystal' | 'relic' | 'drone' | 'comet' | 'rift' | 'whale';
type SpaceSpriteMotion = 'idle' | 'float' | 'drift' | 'sweep';

interface SpaceSpriteConfig {
  id: string;
  kind: SpaceSpriteKind;
  x: number;
  y: number;
  size: number;
  opacity: number;
  rotate: number;
  driftX: number;
  driftY: number;
  duration: number;
  delay: number;
  motion: SpaceSpriteMotion;
  accent: string;
  secondary: string;
  glow: string;
}

function createSeededRandom(seed: number): () => number {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function pickFromPool<T>(pool: readonly T[], random: () => number): T {
  const index = Math.floor(random() * pool.length);
  return pool[index];
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function randomInRange(random: () => number, min: number, max: number): number {
  return min + random() * (max - min);
}

function pickSkyBandY(random: () => number, topWeight: number = 0.52): number {
  const useTopBand = random() < topWeight;
  return useTopBand
    ? randomInRange(random, SKY_TOP_MIN_Y_PERCENT, SKY_TOP_MAX_Y_PERCENT)
    : randomInRange(random, SKY_BOTTOM_MIN_Y_PERCENT, SKY_BOTTOM_MAX_Y_PERCENT);
}

interface PlanetPalette {
  color1: string;
  color2: string;
  ringColor: string;
  glowColor: string;
}

interface AmbientStar {
  id: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  color: string;
  duration: number;
  delay: number;
}

const PLANET_PALETTES: PlanetPalette[] = [
  { color1: '#7c3aed', color2: '#4c1d95', ringColor: 'rgba(167, 139, 250, 0.4)', glowColor: 'rgba(139, 92, 246, 0.3)' },
  { color1: '#67e8f9', color2: '#0e7490', ringColor: 'rgba(34, 211, 238, 0.4)', glowColor: 'rgba(6, 182, 212, 0.3)' },
  { color1: '#f59e0b', color2: '#78350f', ringColor: 'rgba(251, 191, 36, 0.45)', glowColor: 'rgba(245, 158, 11, 0.28)' },
  { color1: '#f472b6', color2: '#831843', ringColor: 'rgba(244, 114, 182, 0.42)', glowColor: 'rgba(236, 72, 153, 0.28)' },
  { color1: '#4ade80', color2: '#14532d', ringColor: 'rgba(74, 222, 128, 0.4)', glowColor: 'rgba(34, 197, 94, 0.26)' },
];

const SPACE_SPRITE_PALETTES: Array<{ accent: string; secondary: string; glow: string }> = [
  { accent: '#22d3ee', secondary: '#0e7490', glow: 'rgba(34, 211, 238, 0.55)' },
  { accent: '#a78bfa', secondary: '#6d28d9', glow: 'rgba(167, 139, 250, 0.55)' },
  { accent: '#fbbf24', secondary: '#92400e', glow: 'rgba(251, 191, 36, 0.55)' },
  { accent: '#34d399', secondary: '#065f46', glow: 'rgba(52, 211, 153, 0.5)' },
  { accent: '#f472b6', secondary: '#9d174d', glow: 'rgba(244, 114, 182, 0.5)' },
];

function buildAmbientPlanets(ascensionLevel: number): PlanetConfig[] {
  const safeAscension = Math.max(0, Math.floor(ascensionLevel));
  const random = createSeededRandom((safeAscension + 1) * 1301081);
  const types: PlanetConfig['type'][] = ['gas', 'rocky', 'ice', 'ringed'];
  const count = clampNumber(5 + Math.floor(safeAscension / 10), 5, 9);
  const planets: PlanetConfig[] = [];

  for (let i = 0; i < count; i++) {
    const palette = pickFromPool(PLANET_PALETTES, random);
    const type = pickFromPool(types, random);
    const size = 8 + random() * 14 + Math.min(8, safeAscension * 0.18);
    planets.push({
      id: i + 1,
      x: 6 + random() * 88,
      y: pickSkyBandY(random, 0.52),
      size,
      type,
      color1: palette.color1,
      color2: palette.color2,
      ringColor: type === 'ringed' ? palette.ringColor : undefined,
      orbitDuration: 55 + random() * 110,
      glowColor: palette.glowColor,
    });
  }

  return planets;
}

function buildAmbientStars(ascensionLevel: number): AmbientStar[] {
  const safeAscension = Math.max(0, Math.floor(ascensionLevel));
  const random = createSeededRandom((safeAscension + 11) * 196613);
  const colors = [
    'rgba(34, 211, 238, 0.45)',
    'rgba(167, 139, 250, 0.42)',
    'rgba(251, 191, 36, 0.38)',
    'rgba(244, 114, 182, 0.35)',
  ];
  const count = clampNumber(20 + safeAscension, 20, 46);

  return Array.from({ length: count }, (_, index) => ({
    id: `ambient-star-${safeAscension}-${index}`,
    x: 4 + random() * 92,
    y: pickSkyBandY(random, 0.5),
    size: 1 + random() * 2.4,
    opacity: 0.25 + random() * 0.5,
    color: pickFromPool(colors, random),
    duration: 1.8 + random() * 2.6,
    delay: random() * 2.4,
  }));
}

function buildAscensionSpaceField(ascensionLevel: number): { staticSprites: SpaceSpriteConfig[]; animatedSprites: SpaceSpriteConfig[] } {
  const safeAscension = Math.max(0, Math.floor(ascensionLevel));
  const random = createSeededRandom((safeAscension + 17) * 777733);

  const staticPool: SpaceSpriteKind[] = ['asteroid', 'satellite', 'crystal'];
  if (safeAscension >= 2) staticPool.push('relic');
  if (safeAscension >= 7) staticPool.push('drone');
  if (safeAscension >= 14) staticPool.push('rift');
  if (safeAscension >= 24) staticPool.push('whale');

  const animatedPool: SpaceSpriteKind[] = ['comet', 'drone', 'crystal'];
  if (safeAscension >= 5) animatedPool.push('rift');
  if (safeAscension >= 12) animatedPool.push('relic');
  if (safeAscension >= 22) animatedPool.push('whale');

  const sizeRangeByKind: Record<SpaceSpriteKind, { min: number; max: number }> = {
    asteroid: { min: 12, max: 24 },
    satellite: { min: 14, max: 26 },
    crystal: { min: 13, max: 24 },
    relic: { min: 16, max: 30 },
    drone: { min: 12, max: 22 },
    comet: { min: 16, max: 30 },
    rift: { min: 18, max: 34 },
    whale: { min: 28, max: 48 },
  };

  const staticCount = clampNumber(8 + Math.floor(safeAscension * 0.35), 8, 22);
  const animatedCount = clampNumber(4 + Math.floor(safeAscension * 0.16), 4, 10);

  const createSprite = (prefix: string, index: number, kind: SpaceSpriteKind, animated: boolean): SpaceSpriteConfig => {
    const palette = pickFromPool(SPACE_SPRITE_PALETTES, random);
    const range = sizeRangeByKind[kind];
    const isSweep = animated && kind === 'comet';
    const startsFromLeft = random() > 0.5;
    const size = range.min + random() * (range.max - range.min) + Math.min(9, safeAscension * 0.12);
    const motion: SpaceSpriteMotion = isSweep
      ? 'sweep'
      : animated
        ? (random() > 0.5 ? 'drift' : 'float')
        : (random() > 0.72 ? 'float' : 'idle');

    const x = isSweep
      ? (startsFromLeft ? -20 - random() * 20 : 112 + random() * 20)
      : 4 + random() * 92;
    const y = kind === 'whale'
      ? pickSkyBandY(random, 0.46)
      : pickSkyBandY(random, 0.5);
    const driftX = isSweep
      ? (startsFromLeft ? 150 + random() * 26 : -(150 + random() * 26))
      : (random() - 0.5) * (animated ? 18 : 10);
    const driftY = isSweep
      ? (random() - 0.5) * 18
      : (random() - 0.5) * (animated ? 12 : 8);
    const duration = isSweep ? 15 + random() * 12 : 6 + random() * 10;
    const opacity = animated ? (0.46 + random() * 0.38) : (0.28 + random() * 0.42);

    return {
      id: `${prefix}-${safeAscension}-${index}`,
      kind,
      x,
      y,
      size,
      opacity,
      rotate: random() * 360,
      driftX,
      driftY,
      duration,
      delay: random() * 7,
      motion,
      accent: palette.accent,
      secondary: palette.secondary,
      glow: palette.glow,
    };
  };

  const staticSprites = Array.from({ length: staticCount }, (_, index) => {
    const kind = pickFromPool(staticPool, random);
    return createSprite('static', index, kind, false);
  });
  const animatedSprites = Array.from({ length: animatedCount }, (_, index) => {
    const kind = pickFromPool(animatedPool, random);
    return createSprite('animated', index, kind, true);
  });

  return { staticSprites, animatedSprites };
}

function SpaceSpriteGlyph({ sprite }: { sprite: SpaceSpriteConfig }) {
  switch (sprite.kind) {
    case 'satellite':
      return (
        <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
          <rect x="36" y="36" width="28" height="28" rx="6" fill="rgba(15, 23, 42, 0.82)" stroke={sprite.accent} strokeWidth="3" />
          <rect x="8" y="40" width="24" height="20" rx="3" fill="rgba(15, 23, 42, 0.75)" stroke={sprite.accent} strokeWidth="2" />
          <rect x="68" y="40" width="24" height="20" rx="3" fill="rgba(15, 23, 42, 0.75)" stroke={sprite.accent} strokeWidth="2" />
          <line x1="32" y1="50" x2="36" y2="50" stroke={sprite.accent} strokeWidth="2" />
          <line x1="64" y1="50" x2="68" y2="50" stroke={sprite.accent} strokeWidth="2" />
          <circle cx="50" cy="50" r="5" fill={sprite.secondary} opacity="0.65" />
        </svg>
      );
    case 'crystal':
      return (
        <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
          <polygon points="50,8 80,38 50,92 20,38" fill="rgba(15, 23, 42, 0.78)" stroke={sprite.accent} strokeWidth="3" />
          <polygon points="50,22 66,40 50,72 34,40" fill={sprite.secondary} opacity="0.45" />
          <line x1="50" y1="8" x2="50" y2="92" stroke={sprite.accent} strokeWidth="1.8" opacity="0.7" />
        </svg>
      );
    case 'relic':
      return (
        <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="32" stroke={sprite.accent} strokeWidth="3" opacity="0.8" />
          <circle cx="50" cy="50" r="18" stroke={sprite.secondary} strokeWidth="2" opacity="0.72" />
          <circle cx="50" cy="50" r="8" fill={sprite.secondary} opacity="0.5" />
          <path d="M18 50 H82 M50 18 V82" stroke={sprite.accent} strokeWidth="1.6" opacity="0.55" />
        </svg>
      );
    case 'drone':
      return (
        <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
          <polygon points="50,22 68,34 68,56 50,68 32,56 32,34" fill="rgba(15, 23, 42, 0.78)" stroke={sprite.accent} strokeWidth="3" />
          <circle cx="26" cy="30" r="7" fill="rgba(15, 23, 42, 0.82)" stroke={sprite.accent} strokeWidth="2" />
          <circle cx="74" cy="30" r="7" fill="rgba(15, 23, 42, 0.82)" stroke={sprite.accent} strokeWidth="2" />
          <circle cx="26" cy="70" r="7" fill="rgba(15, 23, 42, 0.82)" stroke={sprite.accent} strokeWidth="2" />
          <circle cx="74" cy="70" r="7" fill="rgba(15, 23, 42, 0.82)" stroke={sprite.accent} strokeWidth="2" />
          <circle cx="50" cy="45" r="5" fill={sprite.secondary} opacity="0.7" />
        </svg>
      );
    case 'comet':
      return (
        <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
          <path d="M8 50 C26 38, 38 30, 60 32 C50 39, 46 47, 48 55 C36 58, 22 60, 8 50 Z" fill={sprite.secondary} opacity="0.36" />
          <path d="M12 50 C28 46, 42 44, 58 47" stroke={sprite.accent} strokeWidth="2" opacity="0.5" />
          <circle cx="72" cy="50" r="15" fill="rgba(15, 23, 42, 0.8)" stroke={sprite.accent} strokeWidth="3" />
          <circle cx="72" cy="50" r="6" fill={sprite.secondary} opacity="0.62" />
        </svg>
      );
    case 'rift':
      return (
        <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
          <ellipse cx="50" cy="50" rx="32" ry="17" fill="rgba(15, 23, 42, 0.42)" stroke={sprite.accent} strokeWidth="3" strokeDasharray="6 4" />
          <ellipse cx="50" cy="50" rx="17" ry="8" fill="rgba(2, 6, 23, 0.72)" stroke={sprite.secondary} strokeWidth="2" />
          <path d="M30 50 C40 42, 60 58, 70 50" stroke={sprite.accent} strokeWidth="1.6" opacity="0.65" />
        </svg>
      );
    case 'whale':
      return (
        <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
          <path d="M10 56 C24 31, 62 24, 88 44 C76 43, 74 59, 86 66 C61 84, 24 79, 10 56 Z" fill="rgba(15, 23, 42, 0.78)" stroke={sprite.accent} strokeWidth="3" />
          <path d="M64 48 L78 38 L74 54 Z" fill={sprite.secondary} opacity="0.55" />
          <circle cx="32" cy="50" r="3.5" fill={sprite.secondary} opacity="0.72" />
        </svg>
      );
    case 'asteroid':
    default:
      return (
        <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
          <polygon points="18,48 36,20 66,16 84,42 72,78 30,84" fill="rgba(15, 23, 42, 0.75)" stroke={sprite.accent} strokeWidth="3" />
          <line x1="36" y1="28" x2="58" y2="34" stroke={sprite.secondary} strokeWidth="1.8" opacity="0.65" />
          <circle cx="58" cy="56" r="5" fill={sprite.secondary} opacity="0.42" />
        </svg>
      );
  }
}

function AscensionSpacePhenomena({ ascensionLevel = 0, reducedEffects = false }: { ascensionLevel?: number; reducedEffects?: boolean }) {
  const spaceField = useMemo(() => buildAscensionSpaceField(ascensionLevel), [ascensionLevel]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1 }}>
      <div className="absolute inset-x-0 top-0 h-[46%] bg-gradient-to-b from-cyan-400/5 via-violet-400/5 to-transparent" />

      {spaceField.staticSprites.map((sprite) => {
        const baseStyle: React.CSSProperties = {
          left: `${sprite.x}%`,
          top: `${sprite.y}%`,
          width: sprite.size,
          height: sprite.size,
          opacity: sprite.opacity,
          transform: `rotate(${sprite.rotate}deg)`,
        };

        if (sprite.motion === 'idle') {
          return (
            <div key={sprite.id} className="absolute" style={baseStyle}>
              <SpaceSpriteGlyph sprite={sprite} />
            </div>
          );
        }

        return (
          <motion.div
            key={sprite.id}
            className="absolute"
            style={baseStyle}
            animate={{
              x: [0, sprite.driftX, 0],
              y: [0, -sprite.driftY, 0],
              opacity: [sprite.opacity * 0.72, sprite.opacity, sprite.opacity * 0.72],
            }}
            transition={{
              duration: sprite.duration + 2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: sprite.delay,
            }}
          >
            <SpaceSpriteGlyph sprite={sprite} />
          </motion.div>
        );
      })}

      {spaceField.animatedSprites.map((sprite) => (
        reducedEffects ? (
          <div
            key={sprite.id}
            className="absolute"
            style={{
              left: `${sprite.x}%`,
              top: `${sprite.y}%`,
              width: sprite.size,
              height: sprite.size,
              opacity: sprite.opacity * 0.8,
            }}
          >
            <SpaceSpriteGlyph sprite={sprite} />
          </div>
        ) : (
          <motion.div
            key={sprite.id}
            className="absolute"
            style={{
              left: `${sprite.x}%`,
              top: `${sprite.y}%`,
              width: sprite.size,
              height: sprite.size,
              opacity: sprite.opacity,
            }}
            animate={{
              x: sprite.motion === 'sweep'
                ? [0, sprite.driftX]
                : [0, sprite.driftX, 0, -sprite.driftX * 0.4, 0],
              y: sprite.motion === 'sweep'
                ? [0, sprite.driftY]
                : [0, -sprite.driftY, sprite.driftY * 0.35, 0],
              rotate: [sprite.rotate, sprite.rotate + (sprite.motion === 'sweep' ? 18 : 10), sprite.rotate],
              scale: sprite.kind === 'rift' || sprite.kind === 'relic'
                ? [1, 1.13, 0.98, 1]
                : [1, 1.05, 1],
              opacity: [sprite.opacity * 0.58, sprite.opacity, sprite.opacity * 0.7],
            }}
            transition={{
              duration: sprite.duration,
              repeat: Infinity,
              ease: sprite.motion === 'sweep' ? 'linear' : 'easeInOut',
              delay: sprite.delay,
            }}
          >
            <SpaceSpriteGlyph sprite={sprite} />
          </motion.div>
        )
      ))}
    </div>
  );
}

function AmbientPlanets({ ascensionLevel = 0, reducedEffects = false }: { ascensionLevel?: number; reducedEffects?: boolean }) {
  const planets = useMemo(() => buildAmbientPlanets(ascensionLevel), [ascensionLevel]);
  const stars = useMemo(() => buildAmbientStars(ascensionLevel), [ascensionLevel]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1 }}>
      {planets.map((planet) => {
        const planetVisual = (
          <svg width={planet.size} height={planet.size} viewBox="0 0 24 24">
            <defs>
              <radialGradient id={`planet-grad-${ascensionLevel}-${planet.id}`} cx="35%" cy="35%">
                <stop offset="0%" stopColor={planet.color1} />
                <stop offset="100%" stopColor={planet.color2} />
              </radialGradient>
            </defs>
            <circle cx="12" cy="12" r="10" fill={`url(#planet-grad-${ascensionLevel}-${planet.id})`} />
            {planet.type === 'gas' && (
              <>
                <ellipse cx="12" cy="9" rx="7" ry="1.5" fill="rgba(255,255,255,0.1)" />
                <ellipse cx="12" cy="12" rx="8" ry="1" fill="rgba(255,255,255,0.08)" />
                <ellipse cx="12" cy="15" rx="6" ry="1" fill="rgba(0,0,0,0.15)" />
              </>
            )}
            {planet.type === 'rocky' && (
              <>
                <circle cx="8" cy="10" r="2" fill="rgba(0,0,0,0.2)" />
                <circle cx="14" cy="14" r="1.5" fill="rgba(0,0,0,0.15)" />
                <circle cx="10" cy="15" r="1" fill="rgba(0,0,0,0.1)" />
              </>
            )}
            {planet.type === 'ice' && (
              <>
                <ellipse cx="12" cy="6" rx="4" ry="2" fill="rgba(255,255,255,0.3)" />
                <ellipse cx="12" cy="18" rx="4" ry="2" fill="rgba(255,255,255,0.2)" />
              </>
            )}
            {planet.type === 'ringed' && planet.ringColor && (
              <ellipse
                cx="12"
                cy="12"
                rx="14"
                ry="4"
                fill="none"
                stroke={planet.ringColor}
                strokeWidth="1.5"
                transform="rotate(-20 12 12)"
              />
            )}
            <ellipse cx="8" cy="8" rx="3" ry="2" fill="rgba(255,255,255,0.15)" />
          </svg>
        );

        if (reducedEffects) {
          return (
            <div
              key={`ambient-planet-${planet.id}`}
              className="absolute"
              style={{
                left: `${planet.x}%`,
                top: `${planet.y}%`,
                width: planet.size,
                height: planet.size,
                opacity: 0.74,
              }}
            >
              {planetVisual}
            </div>
          );
        }

        return (
          <motion.div
            key={`ambient-planet-${planet.id}`}
            className="absolute"
            style={{
              left: `${planet.x}%`,
              top: `${planet.y}%`,
              width: planet.size,
              height: planet.size,
            }}
            animate={{
              y: [0, -3, 0, 3, 0],
              opacity: [0.64, 0.84, 0.64],
            }}
            transition={{
              duration: planet.orbitDuration / 10,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {planetVisual}
          </motion.div>
        );
      })}

      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            background: star.color,
          }}
          animate={{
            opacity: [star.opacity * 0.45, star.opacity, star.opacity * 0.45],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            delay: star.delay,
          }}
        />
      ))}
    </div>
  );
}

function OrbitalPlanetView({ planet, reducedEffects = false }: { planet: OrbitalPlanetConfig; reducedEffects?: boolean }) {
  const renderPlanet = () => {
    switch (planet.type) {
      case 'crystal':
        return (
          <motion.svg 
            width="200" 
            height="200" 
            viewBox="0 0 200 200"
            style={{ filter: reducedEffects ? 'none' : `drop-shadow(0 0 30px ${planet.primaryColor})` }}
            animate={reducedEffects ? undefined : { rotate: 360 }}
            transition={reducedEffects ? undefined : { duration: 300, repeat: Infinity, ease: "linear" }}
          >
            <defs>
              <radialGradient id="ice-planet-grad" cx="30%" cy="30%">
                <stop offset="0%" stopColor={planet.accentColor || '#dbeafe'} />
                <stop offset="50%" stopColor={planet.primaryColor} />
                <stop offset="100%" stopColor={planet.secondaryColor} />
              </radialGradient>
            </defs>
            <circle cx="100" cy="100" r="90" fill="url(#ice-planet-grad)" />
            <ellipse cx="100" cy="40" rx="60" ry="15" fill="rgba(255,255,255,0.3)" />
            <ellipse cx="100" cy="160" rx="60" ry="15" fill="rgba(255,255,255,0.2)" />
            {[...Array(8)].map((_, i) => (
              <motion.ellipse
                key={`crystal-band-${i}`}
                cx="100"
                cy={30 + i * 20}
                rx={70 - i * 5}
                ry={3 + Math.random() * 2}
                fill="rgba(255,255,255,0.15)"
                animate={{ opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 3 + i * 0.5, repeat: Infinity }}
              />
            ))}
            {planet.hasMoons && (
              <>
                <motion.circle cx="170" cy="50" r="12" fill={planet.secondaryColor}
                  animate={{ x: [0, 10, 0], y: [0, 5, 0] }}
                  transition={{ duration: 8, repeat: Infinity }}
                />
                <motion.circle cx="40" cy="150" r="8" fill={planet.accentColor}
                  animate={{ x: [0, -8, 0], y: [0, 8, 0] }}
                  transition={{ duration: 6, repeat: Infinity }}
                />
              </>
            )}
          </motion.svg>
        );
      case 'lava':
        return (
          <motion.svg 
            width="220" 
            height="220" 
            viewBox="0 0 220 220"
            style={{ filter: reducedEffects ? 'none' : `drop-shadow(0 0 40px ${planet.primaryColor})` }}
          >
            <defs>
              <radialGradient id="lava-planet-grad" cx="40%" cy="40%">
                <stop offset="0%" stopColor={planet.accentColor || '#fbbf24'} />
                <stop offset="40%" stopColor={planet.primaryColor} />
                <stop offset="100%" stopColor={planet.secondaryColor} />
              </radialGradient>
            </defs>
            <circle cx="110" cy="110" r="100" fill="url(#lava-planet-grad)" />
            {[...Array(12)].map((_, i) => (
              <motion.ellipse
                key={`lava-flow-${i}`}
                cx={50 + (i % 4) * 40}
                cy={40 + Math.floor(i / 4) * 50}
                rx={8 + Math.random() * 12}
                ry={4 + Math.random() * 8}
                fill={planet.accentColor}
                animate={{ 
                  opacity: [0.3, 0.8, 0.3],
                  scale: [1, 1.2, 1]
                }}
                transition={{ duration: 1.5 + i * 0.2, repeat: Infinity }}
              />
            ))}
            {planet.hasAtmosphere && (
              <ellipse cx="110" cy="30" rx="80" ry="20" fill="rgba(251, 191, 36, 0.2)" />
            )}
          </motion.svg>
        );
      case 'gas_giant':
        return (
          <motion.svg 
            width="260" 
            height="200" 
            viewBox="0 0 260 200"
            style={{ filter: reducedEffects ? 'none' : `drop-shadow(0 0 35px ${planet.primaryColor})` }}
            animate={{ rotate: [0, 1, 0, -1, 0] }}
            transition={{ duration: 20, repeat: Infinity }}
          >
            <defs>
              <radialGradient id="gas-giant-grad" cx="35%" cy="35%">
                <stop offset="0%" stopColor={planet.accentColor || '#e879f9'} />
                <stop offset="50%" stopColor={planet.primaryColor} />
                <stop offset="100%" stopColor={planet.secondaryColor} />
              </radialGradient>
            </defs>
            <ellipse cx="130" cy="100" rx="110" ry="85" fill="url(#gas-giant-grad)" />
            {[...Array(10)].map((_, i) => (
              <motion.ellipse
                key={`storm-band-${i}`}
                cx="130"
                cy={25 + i * 17}
                rx={100 - Math.abs(i - 5) * 8}
                ry={4 + Math.random() * 3}
                fill={i % 2 === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)'}
                animate={{ opacity: [0.1, 0.25, 0.1] }}
                transition={{ duration: 4 + i * 0.5, repeat: Infinity }}
              />
            ))}
            <motion.ellipse cx="100" cy="90" rx="25" ry="18" fill={planet.accentColor} opacity="0.6"
              animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
              transition={{ duration: 5, repeat: Infinity }}
            />
            {planet.hasRings && (
              <ellipse cx="130" cy="100" rx="130" ry="25" fill="none" 
                stroke={planet.ringColor} strokeWidth="8" opacity="0.6"
                transform="rotate(-15 130 100)" />
            )}
          </motion.svg>
        );
      case 'black_hole':
        return (
          <motion.div className="relative" style={{ width: 200, height: 200 }}>
            <motion.svg 
              width="200" 
              height="200" 
              viewBox="0 0 200 200"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <defs>
                <radialGradient id="black-hole-grad" cx="50%" cy="50%">
                  <stop offset="0%" stopColor="#000" />
                  <stop offset="40%" stopColor={planet.primaryColor} />
                  <stop offset="80%" stopColor={planet.secondaryColor} />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
              </defs>
              <circle cx="100" cy="100" r="40" fill="#000" />
              <circle cx="100" cy="100" r="50" fill="url(#black-hole-grad)" />
              {planet.hasRings && (
                <motion.ellipse cx="100" cy="100" rx="95" ry="25" fill="none" 
                  stroke={planet.accentColor} strokeWidth="6"
                  style={{ filter: reducedEffects ? 'none' : `drop-shadow(0 0 15px ${planet.accentColor})` }}
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                />
              )}
            </motion.svg>
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ 
                background: `radial-gradient(circle at 50% 50%, transparent 20%, ${planet.accentColor} 40%, transparent 60%)`,
                filter: reducedEffects ? 'none' : `blur(10px)`
              }}
              animate={{ rotate: -360, scale: [1, 1.1, 1] }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
        );
      case 'binary_star':
        return (
          <motion.svg 
            width="240" 
            height="180" 
            viewBox="0 0 240 180"
          >
            <defs>
              <radialGradient id="star1-grad" cx="30%" cy="30%">
                <stop offset="0%" stopColor="#fff" />
                <stop offset="50%" stopColor={planet.primaryColor} />
                <stop offset="100%" stopColor={planet.primaryColor} />
              </radialGradient>
              <radialGradient id="star2-grad" cx="30%" cy="30%">
                <stop offset="0%" stopColor="#fff" />
                <stop offset="50%" stopColor={planet.secondaryColor} />
                <stop offset="100%" stopColor={planet.secondaryColor} />
              </radialGradient>
            </defs>
            <motion.g
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              style={{ transformOrigin: '120px 90px' }}
            >
              <motion.circle cx="70" cy="90" r="45" fill="url(#star1-grad)"
                style={{ filter: reducedEffects ? 'none' : `drop-shadow(0 0 30px ${planet.primaryColor})` }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <motion.circle cx="170" cy="90" r="35" fill="url(#star2-grad)"
                style={{ filter: reducedEffects ? 'none' : `drop-shadow(0 0 25px ${planet.secondaryColor})` }}
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
            </motion.g>
            <motion.path 
              d="M85 90 Q120 70 155 90" 
              stroke={planet.accentColor} 
              strokeWidth="3" 
              fill="none"
              opacity="0.5"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.svg>
        );
      case 'nebula':
        return (
          <motion.div className="relative" style={{ width: 280, height: 200 }}>
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={`nebula-cloud-${i}`}
                className="absolute rounded-full"
                style={{
                  width: 80 + i * 30,
                  height: 60 + i * 20,
                  left: 40 + i * 15,
                  top: 30 + i * 10,
                  background: `radial-gradient(ellipse, ${i % 2 === 0 ? planet.primaryColor : planet.secondaryColor} 0%, transparent 70%)`,
                  filter: reducedEffects ? 'none' : 'blur(15px)',
                }}
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [0.4, 0.7, 0.4],
                  x: [0, 10, 0],
                }}
                transition={{ duration: 5 + i * 2, repeat: Infinity }}
              />
            ))}
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={`nebula-star-${i}`}
                className="absolute rounded-full bg-white"
                style={{
                  width: 2 + (i % 3),
                  height: 2 + (i % 3),
                  left: `${10 + (i * 17) % 80}%`,
                  top: `${15 + (i * 23) % 70}%`,
                }}
                animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.5, 1] }}
                transition={{ duration: 2 + i * 0.3, repeat: Infinity }}
              />
            ))}
          </motion.div>
        );
      case 'death_star':
        return (
          <motion.div className="relative" style={{ width: 180, height: 170 }}>
            {/* Death Star - sized to not interfere with tiles */}
            <motion.div 
              className="absolute"
              style={{ left: 10, top: 5 }}
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 400, repeat: Infinity, ease: "linear" }}
            >
              <svg width="160" height="160" viewBox="0 0 260 260" style={{ filter: reducedEffects ? 'none' : 'drop-shadow(0 0 20px rgba(100, 100, 100, 0.5))' }}>
                <defs>
                  <radialGradient id="deathStarGrad" cx="35%" cy="35%">
                    <stop offset="0%" stopColor="#9ca3af" />
                    <stop offset="40%" stopColor="#6b7280" />
                    <stop offset="70%" stopColor="#4b5563" />
                    <stop offset="100%" stopColor="#1f2937" />
                  </radialGradient>
                  <radialGradient id="superlaserGrad" cx="50%" cy="50%">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="50%" stopColor="#16a34a" />
                    <stop offset="100%" stopColor="#14532d" />
                  </radialGradient>
                  <filter id="deathStarGlow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                
                {/* Main sphere */}
                <circle cx="130" cy="130" r="120" fill="url(#deathStarGrad)" stroke="#374151" strokeWidth="2" />
                
                {/* Superlaser dish - the iconic concave dish */}
                <ellipse cx="80" cy="90" rx="45" ry="45" fill="#1f2937" stroke="#374151" strokeWidth="1.5" />
                <ellipse cx="80" cy="90" rx="35" ry="35" fill="#111827" />
                <ellipse cx="80" cy="90" rx="22" ry="22" fill="url(#superlaserGrad)" filter="url(#deathStarGlow)" />
                <motion.ellipse 
                  cx="80" cy="90" rx="12" ry="12" 
                  fill="#4ade80"
                  animate={{ opacity: [0.6, 1, 0.6], scale: [0.9, 1.1, 0.9] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ filter: reducedEffects ? 'none' : 'drop-shadow(0 0 10px #22c55e)' }}
                />
                
                {/* Equatorial trench */}
                <path d="M10 130 Q130 145 250 130" stroke="#1f2937" strokeWidth="8" fill="none" />
                <path d="M10 130 Q130 145 250 130" stroke="#374151" strokeWidth="1" fill="none" />
                
                {/* Surface detail lines - horizontal */}
                <path d="M25 80 Q130 70 235 80" stroke="#4b5563" strokeWidth="0.8" fill="none" opacity="0.6" />
                <path d="M15 100 Q130 92 245 100" stroke="#4b5563" strokeWidth="0.8" fill="none" opacity="0.6" />
                <path d="M15 160 Q130 168 245 160" stroke="#4b5563" strokeWidth="0.8" fill="none" opacity="0.6" />
                <path d="M20 180 Q130 190 240 180" stroke="#4b5563" strokeWidth="0.8" fill="none" opacity="0.6" />
                <path d="M35 200 Q130 215 225 200" stroke="#4b5563" strokeWidth="0.8" fill="none" opacity="0.6" />
                
                {/* Surface panels and structures */}
                <rect x="150" y="60" width="30" height="20" fill="#374151" stroke="#4b5563" strokeWidth="0.5" rx="1" />
                <rect x="190" y="80" width="25" height="15" fill="#374151" stroke="#4b5563" strokeWidth="0.5" rx="1" />
                <rect x="170" y="100" width="20" height="12" fill="#374151" stroke="#4b5563" strokeWidth="0.5" rx="1" />
                <rect x="140" y="160" width="35" height="25" fill="#374151" stroke="#4b5563" strokeWidth="0.5" rx="1" />
                <rect x="185" y="150" width="28" height="18" fill="#374151" stroke="#4b5563" strokeWidth="0.5" rx="1" />
                <rect x="100" y="180" width="40" height="22" fill="#374151" stroke="#4b5563" strokeWidth="0.5" rx="1" />
                <rect x="150" y="195" width="30" height="16" fill="#374151" stroke="#4b5563" strokeWidth="0.5" rx="1" />
                
                {/* Small window lights */}
                {[...Array(12)].map((_, i) => (
                  <motion.rect
                    key={`window-${i}`}
                    x={100 + (i % 4) * 35 + Math.random() * 10}
                    y={70 + Math.floor(i / 4) * 50 + Math.random() * 10}
                    width="3"
                    height="2"
                    fill="#fbbf24"
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 1 + Math.random(), repeat: Infinity, delay: Math.random() }}
                  />
                ))}
                
                {/* Docking bays */}
                <rect x="200" y="115" width="15" height="8" fill="#111827" stroke="#374151" strokeWidth="0.5" />
                <rect x="175" y="130" width="12" height="6" fill="#111827" stroke="#374151" strokeWidth="0.5" />
              </svg>
            </motion.div>
            
            {/* Superlaser beam charging effect */}
            <motion.div
              className="absolute"
              style={{ left: 55, top: 55 }}
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.4, 0.8, 0.4]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <div 
                className="rounded-full"
                style={{ 
                  width: 14, 
                  height: 14, 
                  background: 'radial-gradient(circle, #4ade80 0%, #22c55e 50%, transparent 70%)',
                  filter: reducedEffects ? 'none' : 'drop-shadow(0 0 15px #22c55e)'
                }}
              />
            </motion.div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  const position = planet.position || { left: '5%', top: '5%' };
  const scale = planet.scale || 1;
  
  return (
    <div 
      className="absolute pointer-events-none" 
      style={{ 
        zIndex: 2,
        left: position.left,
        top: position.top,
        opacity: 0.85,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
      }}
    >
      {renderPlanet()}
    </div>
  );
}

function TravelingSpaceship({ ascensionLevel = 0, reducedEffects = false }: { ascensionLevel?: number; reducedEffects?: boolean }) {
  const safeAscension = Math.max(0, Math.floor(ascensionLevel));
  const [spaceships, setSpaceships] = useState<SpaceshipState[]>([]);
  
  useEffect(() => {
    let isActive = true;
    let nextTimeout: NodeJS.Timeout | null = null;
    
    const spawnSpaceship = () => {
      if (!isActive) return;
      
      const types: SpaceshipType[] = safeAscension >= 12
        ? ['ufo', 'rocket', 'shuttle', 'frigate', 'asteroid', 'voyager1']
        : safeAscension >= 6
          ? ['ufo', 'rocket', 'shuttle', 'asteroid', 'voyager1']
          : ['ufo', 'rocket', 'shuttle', 'asteroid'];
      const type = types[Math.floor(Math.random() * types.length)];
      
      const direction = Math.random();
      let startX: number, startY: number, endX: number, endY: number;
      
      if (direction < 0.4) {
        startX = -50;
        startY = pickSkyBandY(Math.random, 0.56);
        endX = 110;
        endY = clampNumber(startY + (Math.random() - 0.5) * 10, SKY_TOP_MIN_Y_PERCENT, SKY_BOTTOM_MAX_Y_PERCENT);
      } else if (direction < 0.8) {
        startX = 110;
        startY = pickSkyBandY(Math.random, 0.56);
        endX = -50;
        endY = clampNumber(startY + (Math.random() - 0.5) * 10, SKY_TOP_MIN_Y_PERCENT, SKY_BOTTOM_MAX_Y_PERCENT);
      } else {
        startX = Math.random() * 100;
        startY = -10;
        endX = startX + (Math.random() - 0.5) * 40;
        endY = pickSkyBandY(Math.random, 0.5);
      }
      
      const sizeBoost = Math.min(8, safeAscension * 0.15);
      const speedBonus = Math.min(5, safeAscension * 0.12);
      let size = 14 + Math.random() * 10 + sizeBoost;
      let duration = clampNumber(9.2 + Math.random() * 7.4 - speedBonus, 4.8, 14.5);
      if (type === 'asteroid') {
        size *= 1.25;
        duration *= 0.86;
      } else if (type === 'voyager1') {
        size *= 1.05;
        duration *= 1.08;
      }
      
      const spawnedShip: SpaceshipState = {
        id: Date.now(),
        type,
        startX,
        startY,
        endX,
        endY,
        duration,
        size,
      };

      setSpaceships((prev) => {
        const next = [...prev, spawnedShip];
        if (next.length > 4) return next.slice(next.length - 4);
        return next;
      });

      scheduleNext();
    };
    
    const scheduleNext = () => {
      if (!isActive) return;
      const minDelay = Math.max(5500, 22000 - safeAscension * 420);
      const rangeDelay = Math.max(8000, 28000 - safeAscension * 300);
      const delay = minDelay + Math.random() * rangeDelay;
      nextTimeout = setTimeout(spawnSpaceship, delay);
    };
    
    const initialDelay = Math.max(2500, 7000 - safeAscension * 120) + Math.random() * 6000;
    nextTimeout = setTimeout(spawnSpaceship, initialDelay);
    
    return () => {
      isActive = false;
      if (nextTimeout) clearTimeout(nextTimeout);
    };
  }, [safeAscension]);

  const renderSpaceship = (spaceship: SpaceshipState) => {
    const { type, size } = spaceship;
    
    if (type === 'ufo') {
      return (
        <svg width={size * 2} height={size} viewBox="0 0 24 12" fill="none">
          <ellipse cx="12" cy="8" rx="10" ry="3" fill="rgba(100, 116, 139, 0.6)" />
          <ellipse cx="12" cy="8" rx="10" ry="3" stroke="rgba(6, 182, 212, 0.5)" strokeWidth="0.5" />
          <ellipse cx="12" cy="6" rx="5" ry="4" fill="rgba(71, 85, 105, 0.7)" />
          <ellipse cx="12" cy="5" rx="3" ry="2" fill="rgba(6, 182, 212, 0.3)" />
          <circle cx="5" cy="9" r="0.8" fill="rgba(6, 182, 212, 0.8)" className="animate-pulse" />
          <circle cx="12" cy="10" r="0.8" fill="rgba(139, 92, 246, 0.8)" className="animate-pulse" />
          <circle cx="19" cy="9" r="0.8" fill="rgba(6, 182, 212, 0.8)" className="animate-pulse" />
        </svg>
      );
    }
    
    if (type === 'rocket') {
      const isGoingRight = spaceship.endX > spaceship.startX;
      return (
        <svg 
          width={size * 1.5} 
          height={size} 
          viewBox="0 0 20 12" 
          fill="none"
          style={{ transform: isGoingRight ? 'scaleX(1)' : 'scaleX(-1)' }}
        >
          <path d="M2 6 L8 3 L16 3 L18 6 L16 9 L8 9 Z" fill="rgba(100, 116, 139, 0.6)" />
          <path d="M16 3 L20 6 L16 9" fill="rgba(226, 232, 240, 0.5)" />
          <ellipse cx="12" cy="6" rx="2" ry="1.5" fill="rgba(6, 182, 212, 0.4)" />
          <path d="M2 6 L0 4 L1 6 L0 8 Z" fill="rgba(251, 146, 60, 0.7)" className="animate-pulse" />
          <circle cx="6" cy="6" r="0.5" fill="rgba(6, 182, 212, 0.8)" />
        </svg>
      );
    }

    if (type === 'frigate') {
      const isGoingRight = spaceship.endX > spaceship.startX;
      return (
        <svg
          width={size * 2.2}
          height={size * 1.1}
          viewBox="0 0 40 16"
          fill="none"
          style={{ transform: isGoingRight ? 'scaleX(1)' : 'scaleX(-1)' }}
        >
          <path d="M2 8 L10 3 L30 3 L38 8 L30 13 L10 13 Z" fill="rgba(71, 85, 105, 0.6)" />
          <path d="M30 3 L40 8 L30 13" fill="rgba(167, 139, 250, 0.45)" />
          <rect x="13" y="5" width="12" height="6" rx="1.6" fill="rgba(34, 211, 238, 0.36)" />
          <circle cx="18" cy="8" r="1.2" fill="rgba(167, 139, 250, 0.9)" />
          <circle cx="23" cy="8" r="1" fill="rgba(34, 211, 238, 0.9)" />
          <path d="M2 8 L-2 6 L0 8 L-2 10 Z" fill="rgba(251, 191, 36, 0.7)" className="animate-pulse" />
          <path d="M2 8 L-4 7 L-2 8 L-4 9 Z" fill="rgba(244, 114, 182, 0.55)" className="animate-pulse" />
        </svg>
      );
    }

    if (type === 'asteroid') {
      return (
        <svg width={size * 1.4} height={size * 1.1} viewBox="0 0 34 24" fill="none">
          <path d="M2 14 L6 6 L15 3 L25 4 L31 10 L30 18 L22 22 L12 21 L5 19 Z" fill="rgba(71, 85, 105, 0.68)" />
          <path d="M10 8 L16 6 L22 8 L18 12 L11 12 Z" fill="rgba(148, 163, 184, 0.45)" />
          <circle cx="11" cy="16" r="1.4" fill="rgba(15, 23, 42, 0.6)" />
          <circle cx="20" cy="14" r="1.2" fill="rgba(15, 23, 42, 0.6)" />
          <path d="M0 13 L-8 11 L-14 10" stroke="rgba(244, 114, 182, 0.5)" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M0 15 L-10 15 L-17 16" stroke="rgba(34, 211, 238, 0.45)" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
      );
    }

    if (type === 'voyager1') {
      const isGoingRight = spaceship.endX > spaceship.startX;
      return (
        <svg
          width={size * 1.9}
          height={size}
          viewBox="0 0 42 20"
          fill="none"
          style={{ transform: isGoingRight ? 'scaleX(1)' : 'scaleX(-1)' }}
        >
          <path d="M8 10 L16 5 L30 5 L36 10 L30 15 L16 15 Z" fill="rgba(99, 102, 241, 0.24)" stroke="rgba(34, 211, 238, 0.62)" strokeWidth="1.2" />
          <rect x="18" y="7" width="8" height="6" rx="1.4" fill="rgba(34, 211, 238, 0.38)" />
          <circle cx="22" cy="10" r="1.2" fill="rgba(125, 211, 252, 0.9)" />
          <path d="M36 10 L41 10" stroke="rgba(203, 213, 225, 0.72)" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="6.5" cy="10" r="3.2" fill="rgba(59, 130, 246, 0.22)" stroke="rgba(125, 211, 252, 0.65)" strokeWidth="0.9" />
          <path d="M4.5 8.3 L3.8 6.2 M4.5 11.7 L3.8 13.8" stroke="rgba(125, 211, 252, 0.6)" strokeWidth="0.75" strokeLinecap="round" />
          <path d="M8 10 L2.8 10" stroke="rgba(125, 211, 252, 0.55)" strokeWidth="0.75" strokeLinecap="round" />
          <path d="M8 10 L0 8 L-4 7" stroke="rgba(217, 70, 239, 0.45)" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
      );
    }
    
    const isGoingRight = spaceship.endX > spaceship.startX;
    return (
      <svg 
        width={size * 2} 
        height={size} 
        viewBox="0 0 28 12" 
        fill="none"
        style={{ transform: isGoingRight ? 'scaleX(1)' : 'scaleX(-1)' }}
      >
        <path d="M4 6 L10 2 L24 2 L28 6 L24 10 L10 10 Z" fill="rgba(100, 116, 139, 0.5)" />
        <path d="M24 2 L28 6 L24 10" fill="rgba(203, 213, 225, 0.4)" />
        <rect x="12" y="4" width="8" height="4" rx="1" fill="rgba(6, 182, 212, 0.3)" />
        <path d="M8 10 L6 12 L10 10" fill="rgba(71, 85, 105, 0.6)" />
        <path d="M16 10 L14 12 L18 10" fill="rgba(71, 85, 105, 0.6)" />
        <path d="M4 6 L1 4 L2 6 L1 8 Z" fill="rgba(251, 146, 60, 0.6)" className="animate-pulse" />
        <path d="M4 6 L0 5 L1 6 L0 7 Z" fill="rgba(250, 204, 21, 0.5)" className="animate-pulse" />
      </svg>
    );
  };
  

  if (spaceships.length === 0) return null;

  return (
    <>
      {spaceships.map((spaceship) => {
        const shipTilt =
          spaceship.type === 'asteroid'
            ? {
                rotate: [0, 360],
              }
            : spaceship.type === 'voyager1'
              ? {
                  rotate: [-6, 6, -6],
                  y: [0, -1.2, 0],
                }
              : undefined;

        return (
          <motion.div
            key={spaceship.id}
            className="absolute pointer-events-none z-5"
            onAnimationComplete={() => {
              setSpaceships((current) => current.filter((ship) => ship.id !== spaceship.id));
            }}
            initial={{ 
              left: `${spaceship.startX}%`, 
              top: `${spaceship.startY}%`,
              opacity: 0 
            }}
            animate={{ 
              left: `${spaceship.endX}%`, 
              top: `${spaceship.endY}%`,
              opacity: [0, 0.85, 0.85, 0.85, 0]
            }}
            transition={{ 
              duration: spaceship.duration,
              ease: "linear",
              opacity: { 
                times: [0, 0.05, 0.5, 0.95, 1],
                duration: spaceship.duration 
              }
            }}
            style={{
              filter: reducedEffects
                ? 'none'
                : spaceship.type === 'frigate'
                  ? 'drop-shadow(0 0 8px rgba(167, 139, 250, 0.75))'
                  : spaceship.type === 'asteroid'
                    ? 'drop-shadow(0 0 8px rgba(244, 114, 182, 0.55))'
                    : spaceship.type === 'voyager1'
                      ? 'drop-shadow(0 0 10px rgba(125, 211, 252, 0.68))'
                      : 'drop-shadow(0 0 6px rgba(6, 182, 212, 0.6))',
            }}
          >
            <motion.div
              animate={shipTilt}
              transition={
                spaceship.type === 'asteroid'
                  ? { duration: 5.8, repeat: Infinity, ease: 'linear' }
                  : spaceship.type === 'voyager1'
                    ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }
                    : undefined
              }
            >
              {renderSpaceship(spaceship)}
            </motion.div>
          </motion.div>
        );
      })}
    </>
  );
}

interface MachinePosition {
  upgradeId: string;
  gridX: number;
  gridY: number;
}

interface CyberpunkRoomProps {
  upgrades: any[];
  characterReaction?: CharacterReaction;
  themeColors?: ThemeColors;
  skinPalette?: SkinPalette;
  activeAccessoryId?: string;
  activeCapeId?: string;
  activeWingId?: string;
  activeHeadStyleId?: string;
  activePetId?: string;
  activeAscensionPetId?: string;
  machineColorSkin?: MachineColorSkin;
  ascensionLevel?: number;
  machinePositions?: MachinePosition[];
  debugTileCenters?: boolean;
  editMode?: boolean;
  showEmptyHint?: boolean;
  cameraFollowCharacter?: boolean;
  cameraZoom?: number;
  onUpdateMachinePosition?: (upgradeId: string, gridX: number, gridY: number) => void;
  reduceSceneGlow?: boolean;
}

const WALK_STEP_INTERVAL_MS = 1400;
const WALK_BOB_DURATION_MS = 520;
const WALK_MOVE_DURATION_MS = 520;
const WALK_TURN_DURATION_MS = 360;

// Character walks on interior checkerboard line intersections (not tile centers),
// and stays away from the outermost border lines.
const WALK_INTERSECTION_PATH: Array<{ row: number; col: number }> = [
  { row: 3.5, col: 3.5 }, // center-ish anchor
  { row: 3.5, col: 4.5 }, { row: 3.5, col: 5.5 },
  { row: 4.5, col: 5.5 }, { row: 5.5, col: 5.5 },
  { row: 5.5, col: 4.5 }, { row: 5.5, col: 3.5 }, { row: 5.5, col: 2.5 }, { row: 5.5, col: 1.5 },
  { row: 4.5, col: 1.5 }, { row: 3.5, col: 1.5 }, { row: 2.5, col: 1.5 }, { row: 1.5, col: 1.5 },
  { row: 1.5, col: 2.5 }, { row: 1.5, col: 3.5 }, { row: 1.5, col: 4.5 }, { row: 1.5, col: 5.5 },
  { row: 2.5, col: 5.5 }, { row: 3.5, col: 5.5 },
  { row: 4.5, col: 4.5 }, { row: 4.5, col: 3.5 }, { row: 4.5, col: 2.5 },
  { row: 3.5, col: 2.5 }, { row: 2.5, col: 2.5 }, { row: 2.5, col: 3.5 }, { row: 2.5, col: 4.5 },
  { row: 3.5, col: 4.5 }, { row: 3.5, col: 3.5 },
];

const WALK_PATH = WALK_INTERSECTION_PATH;

const DEFAULT_THEME: ThemeColors = {
  background: '#0f172a',
  nebula1: 'rgba(139, 92, 246, 0.4)',
  nebula2: 'rgba(6, 182, 212, 0.3)',
  floorLight: 'rgba(6, 182, 212, 0.15)',
  floorDark: 'rgba(139, 92, 246, 0.1)',
  gridBorder: 'rgba(6, 182, 212, 0.25)'
};

const DEFAULT_SKIN: SkinPalette = {
  primary: '#8b5cf6',
  secondary: '#6d28d9',
  glow: 'rgba(139, 92, 246, 0.6)',
  accent: '#a78bfa'
};

// Helper: Generate consistent random position for a machine based on upgradeId
function generateRandomPosition(upgradeId: string): { row: number; col: number } {
  const hash = upgradeId.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  const seededRandom = Math.abs(Math.sin(hash) * 10000) % 1;
  // Use GRID_SIZE - 1 to avoid the right-bottom boundary (grid edge)
  const row = Math.floor(seededRandom * (GRID_SIZE - 1));
  const col = Math.floor((seededRandom * 100 % 1) * (GRID_SIZE - 1));
  return { row, col };
}

const toTileKey = (row: number, col: number): string => `${row}:${col}`;

const clampGridCoord = (value: number): number =>
  Math.max(0, Math.min(FLOOR_GRID_SIZE - 1, Math.floor(value)));

function resolveTilePlacement(preferredRow: number, preferredCol: number, occupiedTiles: Set<string>): { row: number; col: number } {
  const startRow = clampGridCoord(preferredRow);
  const startCol = clampGridCoord(preferredCol);
  const startKey = toTileKey(startRow, startCol);

  if (!occupiedTiles.has(startKey)) {
    return { row: startRow, col: startCol };
  }

  let best: { row: number; col: number; distance: number } | null = null;
  for (let row = 0; row < FLOOR_GRID_SIZE; row++) {
    for (let col = 0; col < FLOOR_GRID_SIZE; col++) {
      const key = toTileKey(row, col);
      if (occupiedTiles.has(key)) continue;

      const distance = Math.abs(row - startRow) + Math.abs(col - startCol);
      if (
        !best ||
        distance < best.distance ||
        (distance === best.distance && (row < best.row || (row === best.row && col < best.col)))
      ) {
        best = { row, col, distance };
      }
    }
  }

  return best ? { row: best.row, col: best.col } : { row: startRow, col: startCol };
}

export const CyberpunkRoom = React.memo(function CyberpunkRoom({ 
  upgrades, 
  characterReaction = 'idle',
  themeColors = DEFAULT_THEME,
  skinPalette = DEFAULT_SKIN,
  activeAccessoryId = 'none',
  activeCapeId = 'none',
  activeWingId = 'none',
  activeHeadStyleId = 'default',
  activePetId = 'none',
  activeAscensionPetId = 'none',
  machineColorSkin,
  ascensionLevel = 0,
  machinePositions = [],
  debugTileCenters = false,
  editMode = false,
  showEmptyHint = true,
  cameraFollowCharacter = false,
  cameraZoom = 1,
  onUpdateMachinePosition,
  reduceSceneGlow = false,
}: CyberpunkRoomProps) {
  const { language } = useI18n();
  const [pathIndex, setPathIndex] = useState(0);
  const [isWalking, setIsWalking] = useState(false);
  
  useEffect(() => {
    let walkTimeout: ReturnType<typeof setTimeout> | null = null;

    const walkInterval = setInterval(() => {
      setIsWalking(true);
      setPathIndex(prev => (prev + 1) % WALK_PATH.length);
      if (walkTimeout) clearTimeout(walkTimeout);
      walkTimeout = setTimeout(() => setIsWalking(false), WALK_BOB_DURATION_MS);
    }, WALK_STEP_INTERVAL_MS);
    
    return () => {
      clearInterval(walkInterval);
      if (walkTimeout) clearTimeout(walkTimeout);
    };
  }, []);

  const floorWidth = FLOOR_GRID_SIZE * TILE_WIDTH;
  const floorHeight = FLOOR_GRID_SIZE * TILE_HEIGHT;
  const floorOffsetX = (FLOOR_GRID_SIZE - 1) * (TILE_WIDTH / 2);
  
  const currentTile = WALK_PATH[pathIndex];
  const characterPos = gridToScreen(currentTile.row, currentTile.col);
  const nextTile = WALK_PATH[(pathIndex + 1) % WALK_PATH.length];
  const nextCharacterPos = gridToScreen(nextTile.row, nextTile.col);
  const facingRight = nextCharacterPos.x >= characterPos.x;
  const followCharacterCamera = cameraFollowCharacter && !editMode;
  const previewZoom = Math.max(1, Math.min(3, cameraZoom));
  const characterAnchorX = characterPos.x + floorOffsetX + TILE_WIDTH / 2;
  const characterAnchorY = characterPos.y + TILE_HEIGHT / 2;
  const followTargetX = floorWidth * 0.5;
  const followTargetY = floorHeight * 0.62;
  const followOffsetX = followCharacterCamera ? followTargetX - characterAnchorX : 0;
  const followOffsetY = followCharacterCamera ? followTargetY - characterAnchorY : 0;
  const safeAscensionLevel = Math.max(0, Math.floor(ascensionLevel));
  const deepSpaceProgress = clampNumber(safeAscensionLevel / 60, 0, 1);
  const ascensionBandEarly = clampNumber(safeAscensionLevel / 10, 0, 1); // 0-10
  const ascensionBandMid = clampNumber((safeAscensionLevel - 10) / 20, 0, 1); // 10-30
  const ascensionBandLate = clampNumber((safeAscensionLevel - 30) / 30, 0, 1); // 30+
  const starLayerCount = 48 + Math.min(28, Math.floor(safeAscensionLevel * 0.8));
  const nebulaFade = 1 - deepSpaceProgress * 0.38;
  const deepSpaceTintAlpha =
    0.035 +
    ascensionBandEarly * 0.035 +
    ascensionBandMid * 0.085 +
    ascensionBandLate * 0.09;
  const deepSpaceMultiplyAlpha =
    0.025 +
    ascensionBandEarly * 0.025 +
    ascensionBandMid * 0.06 +
    ascensionBandLate * 0.075;
  const deepSpaceEdgeShadeAlpha =
    0.07 +
    ascensionBandEarly * 0.03 +
    ascensionBandMid * 0.08 +
    ascensionBandLate * 0.11;
  const deepSpaceHazeAlpha =
    0.018 +
    ascensionBandEarly * 0.018 +
    ascensionBandMid * 0.03 +
    ascensionBandLate * 0.045;

  const backgroundStars = useMemo(() => {
    return Array.from({ length: starLayerCount }, (_, index) => {
      const n = index + 1;
      const x = (n * 17.31 + n * n * 0.7) % 100;
      const y = (n * 23.71 + n * 0.9 + n * n * 0.13) % 100;
      const bright = n % 11 === 0;
      const medium = n % 5 === 0;
      const size = bright ? 2.2 : medium ? 1.5 : 1;
      const opacityBase = bright ? 0.4 : medium ? 0.28 : 0.18;
      const opacity = opacityBase * (0.78 + deepSpaceProgress * 0.55);
      const color = n % 9 === 0
        ? 'rgba(167, 139, 250, 1)'
        : n % 7 === 0
          ? 'rgba(34, 211, 238, 1)'
          : 'rgba(248, 250, 252, 1)';

      return {
        id: `bg-star-${n}`,
        x,
        y,
        size,
        opacity,
        color,
      };
    });
  }, [starLayerCount, deepSpaceProgress]);

  const unlockedMachines = useMemo(() => {
    const CHECKPOINT_INTERVAL = 25;
    const MAX_STACK = 6;

    const upgradeCountById = new Map<string, number>(
      upgrades.map((upgrade: { id: string; count?: number }) => [upgrade.id, upgrade.count || 0])
    );
    const savedPositionByUpgradeId = new Map<string, { gridX: number; gridY: number }>(
      machinePositions.map(position => [position.upgradeId, position])
    );
    const occupiedTiles = new Set<string>();
    const resolvedMachines = MACHINE_CONFIGS
      .map(config => {
        const count = upgradeCountById.get(config.upgradeId) || 0;
        if (count <= 0) return null;

        // Use saved layout position if available; otherwise fall back to deterministic random position.
        const savedPosition = savedPositionByUpgradeId.get(config.upgradeId);
        const fallback = generateRandomPosition(config.upgradeId);
        const preferredRow = savedPosition?.gridY ?? fallback.row;
        const preferredCol = savedPosition?.gridX ?? fallback.col;
        const resolvedTile = resolveTilePlacement(preferredRow, preferredCol, occupiedTiles);
        occupiedTiles.add(toTileKey(resolvedTile.row, resolvedTile.col));

        const { x, y } = gridToScreen(resolvedTile.row, resolvedTile.col);
        const stackCount = Math.min(MAX_STACK, 1 + Math.floor(count / CHECKPOINT_INTERVAL));
        return {
          ...config,
          count,
          stackCount,
          screenX: x,
          screenY: y,
          gridRow: resolvedTile.row,
          gridCol: resolvedTile.col,
          // Use a larger depth scale to reduce z-index ties with moving character.
          zIndex: (resolvedTile.row + resolvedTile.col + 1) * 10,
        };
      })
      .filter((machine): machine is NonNullable<typeof machine> => machine !== null);

    return resolvedMachines.sort((a, b) => a.zIndex - b.zIndex);
  }, [upgrades, machinePositions]);

  const occupiedTileOwnerMap = useMemo(() => {
    const byTile = new Map<string, string>();
    unlockedMachines.forEach(machine => {
      byTile.set(toTileKey(machine.gridRow, machine.gridCol), machine.upgradeId);
    });
    return byTile;
  }, [unlockedMachines]);

  const floorRef = useRef<HTMLDivElement>(null);
  const [draggingMachineId, setDraggingMachineId] = useState<string | null>(null);
  const [dropPreviewTile, setDropPreviewTile] = useState<{ row: number; col: number; blocked: boolean } | null>(null);

  const getGridTileFromClient = useCallback((clientX: number, clientY: number): { row: number; col: number } | null => {
    const floorEl = floorRef.current;
    if (!floorEl) return null;

    const rect = floorEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const localX = ((clientX - rect.left) / rect.width) * floorWidth;
    const localY = ((clientY - rect.top) / rect.height) * floorHeight;
    if (localX < 0 || localX > floorWidth || localY < 0 || localY > floorHeight) return null;

    const normalizedX = (localX - floorOffsetX - TILE_WIDTH / 2) / (TILE_WIDTH / 2);
    const normalizedY = (localY - TILE_HEIGHT / 2) / (TILE_HEIGHT / 2);

    const col = Math.round((normalizedX + normalizedY) / 2);
    const row = Math.round((normalizedY - normalizedX) / 2);
    if (row < 0 || row >= FLOOR_GRID_SIZE || col < 0 || col >= FLOOR_GRID_SIZE) return null;

    return { row, col };
  }, [floorHeight, floorOffsetX, floorWidth]);

  const isTileBlocked = useCallback((row: number, col: number, upgradeId: string): boolean => {
    const occupant = occupiedTileOwnerMap.get(toTileKey(row, col));
    return occupant !== undefined && occupant !== upgradeId;
  }, [occupiedTileOwnerMap]);

  const beginMachineDrag = useCallback((event: React.PointerEvent<HTMLDivElement>, upgradeId: string) => {
    if (!editMode || !onUpdateMachinePosition) return;
    event.preventDefault();
    event.stopPropagation();
    setDraggingMachineId(upgradeId);

    const tile = getGridTileFromClient(event.clientX, event.clientY);
    if (!tile) {
      setDropPreviewTile(null);
      return;
    }
    setDropPreviewTile({ ...tile, blocked: isTileBlocked(tile.row, tile.col, upgradeId) });
  }, [editMode, getGridTileFromClient, isTileBlocked, onUpdateMachinePosition]);

  useEffect(() => {
    if (!draggingMachineId) return;

    const handlePointerMove = (event: PointerEvent) => {
      const tile = getGridTileFromClient(event.clientX, event.clientY);
      if (!tile) {
        setDropPreviewTile(null);
        return;
      }
      setDropPreviewTile({ ...tile, blocked: isTileBlocked(tile.row, tile.col, draggingMachineId) });
    };

    const handlePointerUp = (event: PointerEvent) => {
      const tile = getGridTileFromClient(event.clientX, event.clientY);
      if (tile && !isTileBlocked(tile.row, tile.col, draggingMachineId) && onUpdateMachinePosition) {
        // gridX is column and gridY is row in room layout.
        onUpdateMachinePosition(draggingMachineId, tile.col, tile.row);
      }
      setDraggingMachineId(null);
      setDropPreviewTile(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingMachineId, getGridTileFromClient, isTileBlocked, onUpdateMachinePosition]);

  useEffect(() => {
    if (!editMode) {
      setDraggingMachineId(null);
      setDropPreviewTile(null);
    }
  }, [editMode]);

  return (
    <div className="absolute inset-0 overflow-hidden select-none">
      <div className="absolute inset-0" style={{ backgroundColor: themeColors.background }}>
        {backgroundStars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
              backgroundColor: star.color,
              boxShadow: reduceSceneGlow ? 'none' : `0 0 ${star.size * 2.2}px ${star.color}`,
            }}
          />
        ))}
        <div
          className="absolute top-10 left-1/4 w-1/3 h-1/3 rounded-full blur-2xl"
          style={{
            background: `radial-gradient(circle, ${themeColors.nebula1} 0%, transparent 70%)`,
            opacity: 0.08 * nebulaFade + 0.015,
          }}
        />
        <div
          className="absolute bottom-20 right-1/4 w-1/4 h-1/4 rounded-full blur-2xl"
          style={{
            background: `radial-gradient(circle, ${themeColors.nebula2} 0%, transparent 70%)`,
            opacity: 0.07 * nebulaFade + 0.015,
          }}
        />
        {themeColors.orbitalPlanet ? (
          <OrbitalPlanetView planet={themeColors.orbitalPlanet} reducedEffects={reduceSceneGlow} />
        ) : (
          <AmbientPlanets ascensionLevel={ascensionLevel} reducedEffects={reduceSceneGlow} />
        )}
        <AscensionSpacePhenomena ascensionLevel={ascensionLevel} reducedEffects={reduceSceneGlow} />
        <TravelingSpaceship ascensionLevel={ascensionLevel} reducedEffects={reduceSceneGlow} />
        {/* Deep-space grading: keep it screen-stable and zoom-independent to avoid delayed dark/light shifts. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundColor: `rgba(2, 6, 23, ${deepSpaceTintAlpha})` }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(180deg, rgba(2, 6, 23, ${deepSpaceMultiplyAlpha * 0.35}) 0%, rgba(0, 0, 0, ${deepSpaceMultiplyAlpha}) 100%)`,
            mixBlendMode: 'multiply',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, rgba(0, 0, 0, 0) 40%, rgba(0, 0, 0, ${deepSpaceEdgeShadeAlpha * 0.45}) 74%, rgba(0, 0, 0, ${deepSpaceEdgeShadeAlpha}) 100%)`,
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 50% 26%, rgba(56, 189, 248, ${deepSpaceHazeAlpha}) 0%, rgba(56, 189, 248, 0) 58%)`,
            mixBlendMode: 'screen',
          }}
        />
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div>
          <div
            className="relative"
            style={{
              width: floorWidth,
              height: floorHeight,
              transform: followCharacterCamera
                ? `translate(${followOffsetX}px, ${followOffsetY}px)`
                : undefined,
              transformOrigin: followCharacterCamera ? '0 0' : undefined,
              transition: followCharacterCamera ? 'transform 220ms linear' : undefined,
            }}
          >
            <div
              className="relative w-full h-full"
              ref={floorRef}
              style={{
                transform: followCharacterCamera ? `scale(${previewZoom})` : undefined,
                transformOrigin: followCharacterCamera ? '0 0' : undefined,
              }}
            >
              <IsometricFloor themeColors={themeColors} offsetX={floorOffsetX} showCenters={debugTileCenters} />
            {editMode && dropPreviewTile && (() => {
              const { x, y } = gridToScreen(dropPreviewTile.row, dropPreviewTile.col);
              const isBlocked = dropPreviewTile.blocked;
              return (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: x + floorOffsetX,
                    top: y,
                    width: TILE_WIDTH,
                    height: TILE_HEIGHT,
                    clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                    background: isBlocked ? 'rgba(239, 68, 68, 0.28)' : 'rgba(34, 211, 238, 0.22)',
                    border: `1px solid ${isBlocked ? 'rgba(248, 113, 113, 0.9)' : 'rgba(34, 211, 238, 0.9)'}`,
                    boxShadow: isBlocked ? '0 0 14px rgba(239, 68, 68, 0.45)' : '0 0 14px rgba(34, 211, 238, 0.45)',
                    zIndex: 250,
                  }}
                />
              );
            })()}

            {unlockedMachines.map((machine) => {
              const isMining = machine.variant.startsWith('mining');
              const anchor = MACHINE_VISUAL_ANCHOR[machine.variant];
              const machineColors = getSkinnedMachineColors(machine.variant, machineColorSkin);
              const renderSize = machine.size * anchor.scale;
              const stackOffset = isMining ? renderSize * 0.76 : renderSize * 0.7;
              const tier = getEvolutionTier(machine.count);
              const sizeBonus = (tier - 1) * 0.08;
              const adjustedSize = renderSize * (1 + sizeBonus);
              const machineWidth = adjustedSize * 2;
              const machineHeight = adjustedSize * (isMining ? 1.6 : 1.5);
              const baseAnchorX = machine.screenX + floorOffsetX + TILE_WIDTH / 2 + MACHINE_GLOBAL_X_OFFSET + anchor.x;
              const baseAnchorY = machine.screenY + TILE_HEIGHT / 2 + anchor.y;
              const stackIndices = Array.from({ length: machine.stackCount }, (_, index) => index);
              // Anchor by visual center instead of the lower corner so machines sit on tile centers.
              const visualAnchorX = 0.5;
              const visualAnchorY = isMining ? 0.69 : 0.68;
              const stackTopAnchorY = baseAnchorY - (machine.stackCount - 1) * stackOffset;
              const dragHandlePadding = 8;
              const dragHandleLeft = baseAnchorX - machineWidth * visualAnchorX - dragHandlePadding;
              const dragHandleTop = stackTopAnchorY - machineHeight * visualAnchorY - dragHandlePadding;
              const dragHandleBottom = baseAnchorY + machineHeight * (1 - visualAnchorY) + dragHandlePadding;
              const dragHandleWidth = machineWidth + dragHandlePadding * 2;
              const dragHandleHeight = Math.max(machineHeight, dragHandleBottom - dragHandleTop);

              return (
                <React.Fragment key={machine.upgradeId}>
                  {editMode && (
                    <div
                      className="absolute"
                      onPointerDown={(event) => beginMachineDrag(event, machine.upgradeId)}
                      style={{
                        left: dragHandleLeft,
                        top: dragHandleTop,
                        width: dragHandleWidth,
                        height: dragHandleHeight,
                        zIndex: machine.zIndex + 120,
                        cursor: draggingMachineId === machine.upgradeId ? 'grabbing' : 'grab',
                        background: 'transparent',
                      }}
                    />
                  )}
                  {stackIndices.map((stackIndex) => {
                    const isTopLayer = stackIndex === machine.stackCount - 1;
                    const anchorX = baseAnchorX;
                    const anchorY = baseAnchorY - (stackIndex * stackOffset);
                    const layerStyle: React.CSSProperties = {
                      left: anchorX - machineWidth * visualAnchorX,
                      top: anchorY - machineHeight * visualAnchorY,
                      width: machineWidth,
                      height: machineHeight,
                      zIndex: machine.zIndex + 10 + stackIndex,
                    };

                    return (
                      <motion.div
                        key={`${machine.upgradeId}-${stackIndex}`}
                        className="absolute"
                        onPointerDown={
                          editMode && isTopLayer ? (event) => beginMachineDrag(event, machine.upgradeId) : undefined
                        }
                        style={{
                          ...layerStyle,
                          cursor: editMode && isTopLayer
                            ? (draggingMachineId === machine.upgradeId ? 'grabbing' : 'grab')
                            : 'default',
                        }}
                        initial={{ opacity: 0, scale: 0, y: 20 }}
                        animate={{ opacity: draggingMachineId === machine.upgradeId ? 0.8 : 1, scale: 1, y: 0 }}
                        transition={{
                          duration: 0.32,
                          type: 'spring',
                          stiffness: 250,
                          damping: 20,
                          delay: stackIndex * 0.06,
                        }}
                      >
                        {isMining ? (
                          <MiningRig size={renderSize} variant={machine.variant} count={machine.count} colorOverride={machineColors} disableGlow={reduceSceneGlow} />
                        ) : (
                          <IsoMachine variant={machine.variant} size={renderSize} count={machine.count} colorOverride={machineColors} disableGlow={reduceSceneGlow} />
                        )}
                      </motion.div>
                    );
                  })}
                  {debugTileCenters && (
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        left: baseAnchorX,
                        top: baseAnchorY,
                        transform: 'translate(-50%, -50%)',
                        zIndex: machine.zIndex + 200,
                        width: 8,
                        height: 8,
                        borderRadius: '9999px',
                        background: 'rgba(239, 68, 68, 0.95)',
                        boxShadow: '0 0 8px rgba(239, 68, 68, 0.95)',
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}

            <motion.div
              className="absolute"
              initial={false}
              animate={{
                left: characterPos.x + floorOffsetX + TILE_WIDTH / 2,
                top: characterPos.y + TILE_HEIGHT / 2,
              }}
              transition={{ duration: WALK_MOVE_DURATION_MS / 1000, ease: "linear" }}
              style={{
                transform: 'translate(-50%, -100%)',
                // Keep character behind machines on same depth line while staying in front of farther ones.
                zIndex: Math.floor((currentTile.row + currentTile.col + 1) * 10) + 4,
              }}
            >
              <CharacterReactionText reaction={characterReaction} />
              <div className="relative">
                <motion.div
                  initial={false}
                  animate={{ 
                    // Walking adds a small crouch and recovery cycle for readability.
                    y: isWalking && characterReaction === 'idle' ? [0, -3, 0, -2, 0] : characterReaction === 'idle' ? [0, -1.5, 0] : 0,
                    scaleY: isWalking && characterReaction === 'idle' ? [1, 0.9, 1.03, 1] : 1,
                    rotate: 0,
                    scaleX: facingRight ? 1 : -1,
                  }}
                  transition={{ 
                    y: { duration: isWalking ? WALK_BOB_DURATION_MS / 1000 : 2.2, repeat: characterReaction === 'idle' ? (isWalking ? 1 : Infinity) : 0, ease: "easeInOut" },
                    scaleY: { duration: isWalking ? WALK_BOB_DURATION_MS / 1000 : 0.5, ease: "easeInOut" },
                    rotate: { duration: isWalking ? WALK_BOB_DURATION_MS / 1000 : 0.5, ease: "easeInOut" },
                    // Slow down facing flips so character doesn't look like it spins too fast.
                    scaleX: { duration: WALK_TURN_DURATION_MS / 1000, ease: "easeInOut" }
                  }}
                >
                  <CSSCharacter
                    reaction={characterReaction}
                    facingRight={facingRight}
                    skinPalette={skinPalette}
                    accessoryId={activeAccessoryId}
                    capeId={activeCapeId}
                    wingId={activeWingId}
                    headStyleId={activeHeadStyleId}
                  />
                </motion.div>
                {activePetId !== 'none' && (
                  <motion.div
                    className="absolute"
                    style={{ 
                      bottom: 0, 
                      left: facingRight ? -25 : 45,
                      transform: `scaleX(${facingRight ? 1 : -1})`
                    }}
                    animate={{ 
                      y: isWalking ? [0, -2, 0, -2, 0] : [0, -1, 0],
                      x: [0, facingRight ? -2 : 2, 0]
                    }}
                    transition={{ 
                      y: { duration: isWalking ? 0.4 : 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.1 },
                      x: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    }}
                  >
                    <CSSPet petId={activePetId} facingRight={facingRight} />
                  </motion.div>
                )}
                {activeAscensionPetId !== 'none' && (
                  <motion.div
                    className="absolute"
                    style={{ 
                      bottom: 5, 
                      left: facingRight ? 35 : -15,
                      transform: `scaleX(${facingRight ? 1 : -1})`
                    }}
                    animate={{ 
                      y: isWalking ? [0, -3, 0, -3, 0] : [0, -2, 0, 2, 0],
                      x: [0, facingRight ? 2 : -2, 0],
                      rotate: [0, 5, 0, -5, 0]
                    }}
                    transition={{ 
                      y: { duration: isWalking ? 0.4 : 2, repeat: Infinity, ease: "easeInOut", delay: 0.2 },
                      x: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
                      rotate: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                    }}
                  >
                    <CSSPrestigePet petId={activeAscensionPetId} />
                  </motion.div>
                )}
              </div>
            </motion.div>
            </div>
          </div>
        </div>
      </div>

      {showEmptyHint && unlockedMachines.length === 0 && (
        <motion.div
          className="absolute top-[30%] left-1/2 -translate-x-1/2 text-center z-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <p className="text-cyan-400/50 text-sm font-mono tracking-wide">
            {language === 'tr' ? '[ LAB BOŞ ]' : language === 'pt-BR' ? '[ LAB VAZIO ]' : language === 'es' ? '[ LAB VACIO ]' : language === 'ru' ? '[ ЛАБ ПУСТА ]' : language === 'zh-CN' ? '[ 实验室为空 ]' : '[ LAB EMPTY ]'}
          </p>
          <p className="text-muted-foreground/50 text-xs mt-1">
            {language === 'tr' ? 'Makinelerin ortaya çıkması için yükseltme satın al' : language === 'pt-BR' ? 'Compre upgrades para fazer as maquinas surgirem' : language === 'es' ? 'Compra mejoras para hacer aparecer las maquinas' : language === 'ru' ? 'Купите улучшения, чтобы появились машины' : language === 'zh-CN' ? '购买升级以生成机器' : 'Purchase upgrades to spawn machines'}
          </p>
        </motion.div>
      )}

      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(15, 23, 42, 0.5) 100%)' }} />
    </div>
  );
});
