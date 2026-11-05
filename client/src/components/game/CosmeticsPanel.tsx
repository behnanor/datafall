import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Lock, Sparkles, Palette, Home, Crown, User, Cat, Star, Zap } from 'lucide-react';
import type { CharacterSkin, RoomTheme, CharacterAccessory, CharacterHeadStyle, CharacterPet, ClickEffect, LootBoxSkin } from '@/lib/useGame';
import { localizeInlineText, useI18n } from '@/lib/i18n';
import { getBoostLines, getRarityLabel } from '@/lib/gameLocale';
import { CurrencyIcon } from '@/components/game/CurrencyIcon';

const CryptoIcon = () => <CurrencyIcon kind="crypto" className="w-4 h-4" />;

interface CosmeticsPanelProps {
  data: number;
  credits: number;
  crypto: number;
  ascension: number;
  totalAscensions: number;
  skins: CharacterSkin[];
  themes: RoomTheme[];
  accessories: CharacterAccessory[];
  headStyles: CharacterHeadStyle[];
  pets: CharacterPet[];
  clickEffects: ClickEffect[];
  boxSkins: LootBoxSkin[];
  ascensionPets: CharacterPet[];
  ascensionSkins: CharacterSkin[];
  ascensionHeadStyles: CharacterHeadStyle[];
  ascensionAccessories: CharacterAccessory[];
  ascensionThemes: RoomTheme[];
  ownedSkins: Set<string>;
  ownedThemes: Set<string>;
  ownedAccessories: Set<string>;
  ownedHeadStyles: Set<string>;
  ownedPets: Set<string>;
  ownedClickEffects: Set<string>;
  ownedBoxSkins: Set<string>;
  ownedAscensionPets: Set<string>;
  activeSkin: string;
  activeTheme: string;
  activeAccessory: string;
  activeHeadStyle: string;
  activePet: string;
  activeClickEffect: string;
  activeBoxSkin: string;
  activeAscensionPet: string;
  onBuySkin: (skinId: string) => void;
  onBuyTheme: (themeId: string) => void;
  onBuyAccessory: (accessoryId: string) => void;
  onBuyHeadStyle: (headStyleId: string) => void;
  onBuyPet: (petId: string) => void;
  onEquipSkin: (skinId: string) => void;
  onEquipTheme: (themeId: string) => void;
  onEquipAccessory: (accessoryId: string) => void;
  onEquipHeadStyle: (headStyleId: string) => void;
  onEquipPet: (petId: string) => void;
  onEquipClickEffect: (effectId: string) => void;
  onEquipBoxSkin: (boxSkinId: string) => void;
  onEquipAscensionPet: (petId: string) => void;
  activeBoosts?: BoostStats;
}

function formatNumber(num: number): string {
  if (num >= 1e15) return (num / 1e15).toFixed(2) + 'Q';
  if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return Math.floor(num).toString();
}

function SkinPreview({ id, palette }: { id?: string; palette: { primary: string; secondary: string; glow: string; accent: string } }) {
  if (id === 'paragon_apex_core') {
    return (
      <div className="relative w-10 h-14 mx-auto">
        <div className="absolute left-1/2 top-1 -translate-x-1/2 h-3.5 w-5 rounded-t-[10px] border border-cyan-300/80 bg-slate-950 shadow-[0_0_12px_rgba(34,211,238,0.45)]" />
        <div className="absolute left-1/2 top-4 -translate-x-1/2 h-8 w-7 rounded-md border border-cyan-300 bg-[linear-gradient(180deg,#10263d_0%,#1d4ed8_48%,#0f172a_100%)] shadow-[0_0_16px_rgba(34,211,238,0.35)]">
          <div className="absolute inset-x-1.5 top-1.5 h-4.5 rounded-sm border border-fuchsia-300/70 bg-[radial-gradient(circle_at_50%_35%,rgba(244,114,182,0.9),rgba(34,211,238,0.18)_72%)]" />
          <div className="absolute left-1.5 top-6 h-1 w-4 rounded-full bg-cyan-300/85" />
          <div className="absolute right-1.5 top-6 h-1 w-2 rounded-full bg-fuchsia-300/85" />
        </div>
        <div className="absolute left-0.5 top-[30px] h-6 w-1.5 rounded-full border border-cyan-400/80 bg-cyan-300/10" />
        <div className="absolute right-0.5 top-[30px] h-6 w-1.5 rounded-full border border-cyan-400/80 bg-cyan-300/10" />
      </div>
    );
  }

  if (id === 'gold_elite') {
    return (
      <div className="relative w-10 h-14 mx-auto">
        <div 
          className="absolute w-6 h-7 left-1/2 -translate-x-1/2 rounded-t-lg"
          style={{ 
            background: 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%)',
            boxShadow: '0 0 12px rgba(251, 191, 36, 0.8)'
          }}
        >
          <div className="absolute top-1 left-1 w-1 h-1 rounded-full bg-white opacity-50" />
        </div>
        <div 
          className="absolute w-6 h-7 top-6 left-1/2 -translate-x-1/2 rounded-b"
          style={{ 
            background: 'linear-gradient(180deg, #f59e0b 0%, #fbbf24 100%)',
            border: '1px solid #d97706'
          }}
        />
      </div>
    );
  }

  if (id === 'plasma_pink') {
    return (
      <div className="relative w-10 h-14 mx-auto">
        <div 
          className="absolute w-6 h-7 left-1/2 -translate-x-1/2 rounded-t-lg"
          style={{ 
            background: 'linear-gradient(180deg, #ec4899 0%, #db2777 100%)',
            boxShadow: '0 0 12px rgba(236, 72, 153, 0.8)'
          }}
        >
          <div className="absolute top-1 right-1 w-4 h-0.5 bg-white opacity-30 rotate-45" />
        </div>
        <div 
          className="absolute w-6 h-7 top-6 left-1/2 -translate-x-1/2 rounded-b"
          style={{ 
            background: 'linear-gradient(180deg, #db2777 0%, #ec4899 100%)',
            border: '1px solid #be185d'
          }}
        />
      </div>
    );
  }

  if (id === 'void_walker') {
    return (
      <div className="relative w-10 h-14 mx-auto">
        <div 
          className="absolute w-6 h-7 left-1/2 -translate-x-1/2 rounded-t-lg overflow-hidden"
          style={{ 
            background: 'linear-gradient(180deg, #1e1b4b 0%, #4338ca 100%)',
            boxShadow: '0 0 15px rgba(99, 102, 241, 0.6)'
          }}
        >
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[size:4px_4px]" />
        </div>
        <div 
          className="absolute w-6 h-7 top-6 left-1/2 -translate-x-1/2 rounded-b"
          style={{ 
            background: 'linear-gradient(180deg, #4338ca 0%, #1e1b4b 100%)',
            border: '1px solid #312e81'
          }}
        />
      </div>
    );
  }

  return (
    <div className="relative w-10 h-14 mx-auto">
      <div 
        className="absolute w-6 h-7 left-1/2 -translate-x-1/2 rounded-t-lg"
        style={{ 
          background: `linear-gradient(180deg, ${palette.primary} 0%, ${palette.secondary} 100%)`,
          boxShadow: `0 0 8px ${palette.glow}`
        }}
      >
        <div 
          className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-1.5 rounded-sm"
          style={{ background: palette.accent }}
        />
      </div>
      <div 
        className="absolute w-6 h-7 top-6 left-1/2 -translate-x-1/2 rounded-b"
        style={{ 
          background: `linear-gradient(180deg, ${palette.secondary} 0%, ${palette.primary} 100%)`,
          border: `1px solid ${palette.primary}`
        }}
      />
    </div>
  );
}

function ThemePreview({ colors, themeId }: { colors: { background: string; nebula1: string; nebula2: string; floorLight: string; floorDark: string; gridBorder: string }; themeId?: string }) {
  const { language } = useI18n();
  if (themeId === 'paragon_singularity_vault') {
    return (
      <div className="relative w-16 h-12 rounded overflow-hidden mx-auto border border-cyan-400/30 bg-[#040617]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_28%,rgba(34,211,238,0.28),transparent_40%),radial-gradient(circle_at_74%_26%,rgba(167,139,250,0.22),transparent_42%),linear-gradient(180deg,#050816_0%,#111827_100%)]" />
        <div className="absolute right-1.5 top-1.5 h-3.5 w-3.5 rounded-full border border-cyan-100/70 bg-slate-950 shadow-[0_0_10px_rgba(167,139,250,0.45)]" />
        <div className="absolute inset-x-1 bottom-1 h-5 [transform:perspective(120px)_rotateX(62deg)] rounded-sm border border-cyan-400/25 bg-[linear-gradient(180deg,rgba(34,211,238,0.12),rgba(76,29,149,0.28))]" />
        <div className="absolute inset-x-2 bottom-2 h-[1px] bg-cyan-200/70" />
        <div className="absolute left-2 bottom-1.5 text-[6px] font-mono uppercase tracking-[0.18em] text-cyan-100/90">{language === 'tr' ? 'KASA' : language === 'pt-BR' ? 'COFRE' : language === 'es' ? 'BÓVEDA' : language === 'ru' ? 'ХРАНИЛИЩЕ' : language === 'zh-CN' ? '金库' : 'VAULT'}</div>
      </div>
    );
  }

  return (
    <div 
      className="relative w-16 h-12 rounded overflow-hidden mx-auto"
      style={{ background: colors.background }}
    >
      <div 
        className="absolute top-0 left-0 w-6 h-6 rounded-full blur-md opacity-60"
        style={{ background: colors.nebula1 }}
      />
      <div 
        className="absolute bottom-0 right-0 w-4 h-4 rounded-full blur-sm opacity-50"
        style={{ background: colors.nebula2 }}
      />
      <div className="absolute bottom-0 left-0 right-0 h-4 flex">
        <div className="flex-1" style={{ background: colors.floorLight }} />
        <div className="flex-1" style={{ background: colors.floorDark }} />
        <div className="flex-1" style={{ background: colors.floorLight }} />
        <div className="flex-1" style={{ background: colors.floorDark }} />
      </div>
      <div 
        className="absolute bottom-0 left-0 right-0 h-4 border-t"
        style={{ borderColor: colors.gridBorder }}
      />
    </div>
  );
}

function HeadStylePreview({ headStyleId }: { headStyleId: string }) {
  const renderHeadStyle = () => {
    switch (headStyleId) {
      case 'default':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <rect x="8" y="4" width="16" height="16" rx="3" fill="#1e1b4b" stroke="#06b6d4" strokeWidth="1.5"/>
            <rect x="12" y="8" width="8" height="3" rx="1" fill="#06b6d4"/>
          </svg>
        );
      case 'android':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <rect x="8" y="4" width="16" height="16" rx="2" fill="#374151" stroke="#6b7280" strokeWidth="1"/>
            <circle cx="12" cy="10" r="2" fill="#22c55e"/>
            <circle cx="20" cy="10" r="2" fill="#22c55e"/>
            <rect x="12" y="15" width="8" height="2" rx="1" fill="#4b5563"/>
            <path d="M10 2 L10 4 M22 2 L22 4" stroke="#6b7280" strokeWidth="2"/>
          </svg>
        );
      case 'skull':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <ellipse cx="16" cy="12" rx="10" ry="10" fill="#d4d4d8" stroke="#a1a1aa" strokeWidth="1"/>
            <ellipse cx="12" cy="10" rx="3" ry="4" fill="#18181b"/>
            <ellipse cx="20" cy="10" rx="3" ry="4" fill="#18181b"/>
            <path d="M13 18 L13 22 M16 18 L16 22 M19 18 L19 22" stroke="#18181b" strokeWidth="2"/>
          </svg>
        );
      case 'tv_head':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <rect x="6" y="4" width="20" height="18" rx="2" fill="#1f2937" stroke="#4b5563" strokeWidth="1"/>
            <rect x="8" y="6" width="16" height="12" rx="1" fill="#0f172a"/>
            <rect x="10" y="8" width="4" height="3" fill="#06b6d4"/>
            <rect x="10" y="12" width="12" height="1" fill="#06b6d4" opacity="0.5"/>
            <rect x="10" y="14" width="8" height="1" fill="#06b6d4" opacity="0.3"/>
            <circle cx="22" cy="20" r="1.5" fill="#ef4444"/>
          </svg>
        );
      case 'helmet':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <path d="M6 14 Q6 2 16 2 Q26 2 26 14 L26 20 L6 20 Z" fill="#374151" stroke="#4b5563" strokeWidth="1"/>
            <rect x="8" y="10" width="16" height="6" rx="1" fill="#1e293b" stroke="#0ea5e9" strokeWidth="0.5"/>
            <path d="M8 10 L24 16" stroke="#0ea5e9" strokeWidth="0.3" opacity="0.5"/>
            <circle cx="22" cy="6" r="2" fill="#fbbf24"/>
          </svg>
        );
      case 'alien':
        return (
          <svg width="32" height="32" viewBox="0 0 32 32" className="mx-auto">
            <ellipse cx="16" cy="16" rx="12" ry="14" fill="#4ade80" stroke="#22c55e" strokeWidth="1"/>
            <ellipse cx="11" cy="14" rx="4" ry="6" fill="#18181b"/>
            <ellipse cx="21" cy="14" rx="4" ry="6" fill="#18181b"/>
            <ellipse cx="11" cy="14" rx="2" ry="3" fill="#86efac"/>
            <ellipse cx="21" cy="14" rx="2" ry="3" fill="#86efac"/>
          </svg>
        );
      case 'cube':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <polygon points="16,2 28,8 28,20 16,26 4,20 4,8" fill="#8b5cf6" stroke="#a78bfa" strokeWidth="1"/>
            <polygon points="16,2 28,8 16,14 4,8" fill="#a78bfa"/>
            <polygon points="16,14 28,8 28,20 16,26" fill="#7c3aed"/>
            <rect x="10" y="10" width="4" height="4" fill="#c4b5fd"/>
            <rect x="18" y="10" width="4" height="4" fill="#c4b5fd"/>
          </svg>
        );
      case 'orb':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <defs>
              <radialGradient id="orb-grad" cx="30%" cy="30%">
                <stop offset="0%" stopColor="#67e8f9"/>
                <stop offset="100%" stopColor="#0891b2"/>
              </radialGradient>
            </defs>
            <circle cx="16" cy="14" r="12" fill="url(#orb-grad)" stroke="#06b6d4" strokeWidth="1"/>
            <ellipse cx="12" cy="10" rx="4" ry="2" fill="#fff" opacity="0.4"/>
            <circle cx="12" cy="12" r="2" fill="#fff"/>
            <circle cx="20" cy="12" r="2" fill="#fff"/>
          </svg>
        );
      case 'glitch':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <rect x="8" y="4" width="16" height="16" fill="#1e1b4b" stroke="#a855f7" strokeWidth="1"/>
            <rect x="6" y="8" width="4" height="4" fill="#ec4899" opacity="0.7"/>
            <rect x="22" y="12" width="4" height="4" fill="#06b6d4" opacity="0.7"/>
            <rect x="10" y="6" width="12" height="2" fill="#a855f7"/>
            <rect x="12" y="10" width="8" height="3" rx="1" fill="#06b6d4"/>
            <rect x="10" y="14" width="4" height="2" fill="#ec4899"/>
            <rect x="16" y="14" width="6" height="2" fill="#fbbf24"/>
          </svg>
        );
      case 'void':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <ellipse cx="16" cy="12" rx="10" ry="10" fill="#18181b" stroke="#3f3f46" strokeWidth="1"/>
            <circle cx="12" cy="10" r="1.5" fill="#fff"/>
            <circle cx="20" cy="10" r="1.5" fill="#fff"/>
            <circle cx="12" cy="10" r="0.5" fill="#a855f7"/>
            <circle cx="20" cy="10" r="0.5" fill="#a855f7"/>
            <circle cx="10" cy="6" r="0.5" fill="#fff" opacity="0.5"/>
            <circle cx="22" cy="8" r="0.5" fill="#fff" opacity="0.5"/>
            <circle cx="16" cy="5" r="0.5" fill="#fff" opacity="0.5"/>
          </svg>
        );
      case 'triangle':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <polygon points="16,2 30,26 2,26" fill="#1e1b4b" stroke="#ef4444" strokeWidth="1.5"/>
            <polygon points="16,6 26,24 6,24" fill="#0f172a" stroke="#ef4444" strokeWidth="0.5"/>
            <circle cx="12" cy="18" r="2.5" fill="#ef4444"/>
            <circle cx="20" cy="18" r="2.5" fill="#ef4444"/>
            <circle cx="16" cy="10" r="1.5" fill="#fbbf24"/>
          </svg>
        );
      case 'asc_crystal':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <polygon points="16,2 24,10 24,18 16,26 8,18 8,10" fill="#a78bfa" stroke="#c4b5fd" strokeWidth="1.5"/>
            <polygon points="16,4 22,10 22,18 16,24 10,18 10,10" fill="#8b5cf6" stroke="#a78bfa" strokeWidth="0.5"/>
            <polygon points="16,8 18,12 16,16 14,12" fill="#ddd6fe"/>
            <circle cx="12" cy="12" r="1.5" fill="#fff" opacity="0.8"/>
            <circle cx="20" cy="12" r="1.5" fill="#fff" opacity="0.8"/>
          </svg>
        );
      case 'asc_flame':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <ellipse cx="16" cy="18" rx="10" ry="8" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1"/>
            <path d="M16 4 Q22 12 18 18 Q16 22 14 18 Q10 12 16 4" fill="#f97316"/>
            <path d="M16 8 Q19 12 17 16 Q16 18 15 16 Q13 12 16 8" fill="#fbbf24"/>
            <circle cx="13" cy="16" r="1.5" fill="#fff"/>
            <circle cx="19" cy="16" r="1.5" fill="#fff"/>
          </svg>
        );
      case 'asc_storm':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <ellipse cx="16" cy="14" rx="12" ry="10" fill="#374151" stroke="#6b7280" strokeWidth="1"/>
            <path d="M8 10 Q12 8 16 10 Q20 12 24 10" stroke="#60a5fa" strokeWidth="2" fill="none"/>
            <path d="M14 14 L18 14 L14 20 L18 16" stroke="#fbbf24" strokeWidth="2" fill="none"/>
            <circle cx="11" cy="12" r="1.5" fill="#fff"/>
            <circle cx="21" cy="12" r="1.5" fill="#fff"/>
          </svg>
        );
      case 'asc_celestial':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <circle cx="16" cy="16" r="10" fill="#fef3c7" stroke="#fcd34d" strokeWidth="1"/>
            <ellipse cx="16" cy="4" rx="8" ry="3" fill="none" stroke="#fbbf24" strokeWidth="2"/>
            <ellipse cx="16" cy="4" rx="8" ry="3" fill="none" stroke="#fef3c7" strokeWidth="0.5" opacity="0.5"/>
            <circle cx="13" cy="14" r="2" fill="#0891b2"/>
            <circle cx="19" cy="14" r="2" fill="#0891b2"/>
            <path d="M13 19 Q16 21 19 19" stroke="#0891b2" strokeWidth="1" fill="none"/>
          </svg>
        );
      case 'asc_galaxy':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <circle cx="16" cy="14" r="11" fill="#0f172a" stroke="#6366f1" strokeWidth="1"/>
            <ellipse cx="16" cy="14" rx="10" ry="5" fill="none" stroke="#a78bfa" strokeWidth="1.5" opacity="0.6" transform="rotate(-20 16 14)"/>
            <ellipse cx="16" cy="14" rx="8" ry="4" fill="none" stroke="#c4b5fd" strokeWidth="1" opacity="0.4" transform="rotate(30 16 14)"/>
            <circle cx="12" cy="12" r="1" fill="#fff"/>
            <circle cx="20" cy="12" r="1" fill="#fff"/>
            <circle cx="16" cy="14" r="2" fill="#f472b6"/>
            <circle cx="8" cy="10" r="0.5" fill="#fef3c7"/>
            <circle cx="24" cy="16" r="0.5" fill="#fef3c7"/>
            <circle cx="14" cy="20" r="0.5" fill="#fef3c7"/>
          </svg>
        );
      case 'asc_omega':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <circle cx="16" cy="14" r="11" fill="#18181b" stroke="#fbbf24" strokeWidth="2"/>
            <path d="M10 20 Q10 8 16 8 Q22 8 22 20" stroke="#fbbf24" strokeWidth="2" fill="none"/>
            <path d="M8 20 L12 20 M20 20 L24 20" stroke="#fbbf24" strokeWidth="2"/>
            <circle cx="12" cy="14" r="1.5" fill="#f97316"/>
            <circle cx="20" cy="14" r="1.5" fill="#f97316"/>
            <circle cx="16" cy="6" r="1" fill="#fef3c7"/>
          </svg>
        );
      case 'paragon_quantum_crown':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <path d="M6 22 V9 L11 13 L16 4 L21 13 L26 9 V22 Z" fill="#0b1220" stroke="#22d3ee" strokeWidth="1.5" />
            <path d="M8 20 H24" stroke="#7dd3fc" strokeWidth="1.5" />
            <path d="M10 8 V4 M22 8 V4 M16 4 V1.5" stroke="#a78bfa" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="10" cy="4" r="1.4" fill="#22d3ee" />
            <circle cx="16" cy="1.8" r="1.4" fill="#f472b6" />
            <circle cx="22" cy="4" r="1.4" fill="#22d3ee" />
            <rect x="11.5" y="12" width="9" height="4.5" rx="1.4" fill="#1d4ed8" opacity="0.85" />
          </svg>
        );
      default:
        return <div className="w-8 h-8 bg-slate-700 rounded mx-auto" />;
    }
  };
  
  return <div className="h-8 flex items-center justify-center">{renderHeadStyle()}</div>;
}

function AccessoryPreview({ accessoryId, type }: { accessoryId: string; type: 'hat' | 'glasses' | 'headphones' }) {
  const renderAccessory = () => {
    switch (accessoryId) {
      case 'none':
        return <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-600 mx-auto flex items-center justify-center text-slate-500 text-xs">-</div>;
      case 'cowboy_hat':
        return (
          <svg width="32" height="24" viewBox="0 0 32 24" className="mx-auto">
            <path d="M4 18 L8 8 L12 14 L16 6 L20 14 L24 8 L28 18 Z" fill="#8B4513" stroke="#5D3A1A" strokeWidth="1"/>
            <ellipse cx="16" cy="20" rx="14" ry="4" fill="#A0522D" stroke="#5D3A1A" strokeWidth="1"/>
          </svg>
        );
      case 'bowler_hat':
        return (
          <svg width="32" height="24" viewBox="0 0 32 24" className="mx-auto">
            <ellipse cx="16" cy="12" rx="10" ry="8" fill="#1a1a1a" stroke="#333" strokeWidth="1"/>
            <ellipse cx="16" cy="20" rx="14" ry="4" fill="#2a2a2a" stroke="#333" strokeWidth="1"/>
          </svg>
        );
      case 'beanie':
        return (
          <svg width="32" height="24" viewBox="0 0 32 24" className="mx-auto">
            <path d="M6 20 Q6 8 16 6 Q26 8 26 20 Z" fill="#e11d48" stroke="#be123c" strokeWidth="1"/>
            <circle cx="16" cy="4" r="3" fill="#f43f5e"/>
            <path d="M6 16 L26 16" stroke="#be123c" strokeWidth="1" strokeDasharray="2,2"/>
          </svg>
        );
      case 'propeller_hat':
        return (
          <svg width="32" height="24" viewBox="0 0 32 24" className="mx-auto">
            <ellipse cx="16" cy="18" rx="12" ry="6" fill="#3b82f6" stroke="#2563eb" strokeWidth="1"/>
            <circle cx="16" cy="8" r="3" fill="#fbbf24"/>
            <path d="M8 8 L16 8 L24 8" stroke="#22c55e" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        );
      case 'top_hat':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <rect x="8" y="4" width="16" height="16" fill="#1a1a1a" stroke="#333" strokeWidth="1"/>
            <ellipse cx="16" cy="24" rx="14" ry="4" fill="#2a2a2a" stroke="#333" strokeWidth="1"/>
            <rect x="10" y="18" width="12" height="2" fill="#fbbf24"/>
          </svg>
        );
      case 'crown':
        return (
          <svg width="32" height="24" viewBox="0 0 32 24" className="mx-auto">
            <path d="M4 20 L4 12 L10 16 L16 8 L22 16 L28 12 L28 20 Z" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1"/>
            <circle cx="16" cy="10" r="2" fill="#ef4444"/>
            <circle cx="8" cy="14" r="1.5" fill="#3b82f6"/>
            <circle cx="24" cy="14" r="1.5" fill="#22c55e"/>
          </svg>
        );
      case 'halo':
        return (
          <svg width="32" height="24" viewBox="0 0 32 24" className="mx-auto">
            <ellipse cx="16" cy="12" rx="12" ry="4" fill="none" stroke="#fbbf24" strokeWidth="3"/>
            <ellipse cx="16" cy="12" rx="12" ry="4" fill="none" stroke="#fef3c7" strokeWidth="1" opacity="0.5"/>
          </svg>
        );
      case 'horns':
        return (
          <svg width="32" height="24" viewBox="0 0 32 24" className="mx-auto">
            <path d="M6 20 Q2 10 8 4" stroke="#dc2626" strokeWidth="4" fill="none" strokeLinecap="round"/>
            <path d="M26 20 Q30 10 24 4" stroke="#dc2626" strokeWidth="4" fill="none" strokeLinecap="round"/>
          </svg>
        );
      case 'sunglasses':
        return (
          <svg width="32" height="16" viewBox="0 0 32 16" className="mx-auto">
            <rect x="2" y="4" width="10" height="8" rx="2" fill="#1a1a1a" stroke="#333" strokeWidth="1"/>
            <rect x="20" y="4" width="10" height="8" rx="2" fill="#1a1a1a" stroke="#333" strokeWidth="1"/>
            <path d="M12 8 L20 8" stroke="#333" strokeWidth="2"/>
          </svg>
        );
      case 'vr_visor':
        return (
          <svg width="32" height="16" viewBox="0 0 32 16" className="mx-auto">
            <rect x="2" y="2" width="28" height="12" rx="3" fill="#1e293b" stroke="#06b6d4" strokeWidth="1"/>
            <rect x="4" y="4" width="10" height="8" rx="1" fill="#06b6d4" opacity="0.3"/>
            <rect x="18" y="4" width="10" height="8" rx="1" fill="#06b6d4" opacity="0.3"/>
          </svg>
        );
      case 'monocle':
        return (
          <svg width="32" height="20" viewBox="0 0 32 20" className="mx-auto">
            <circle cx="22" cy="10" r="6" fill="none" stroke="#fbbf24" strokeWidth="2"/>
            <circle cx="22" cy="10" r="4" fill="#bfdbfe" opacity="0.3"/>
            <path d="M22 16 L22 24" stroke="#fbbf24" strokeWidth="1"/>
          </svg>
        );
      case 'headphones':
        return (
          <svg width="32" height="24" viewBox="0 0 32 24" className="mx-auto">
            <path d="M4 14 Q4 4 16 4 Q28 4 28 14" stroke="#1a1a1a" strokeWidth="3" fill="none"/>
            <rect x="2" y="12" width="6" height="10" rx="2" fill="#ef4444"/>
            <rect x="24" y="12" width="6" height="10" rx="2" fill="#ef4444"/>
          </svg>
        );
      case 'gaming_headset':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <path d="M4 14 Q4 4 16 4 Q28 4 28 14" stroke="#1a1a1a" strokeWidth="3" fill="none"/>
            <rect x="2" y="12" width="6" height="10" rx="2" fill="#22c55e"/>
            <rect x="24" y="12" width="6" height="10" rx="2" fill="#22c55e"/>
            <path d="M5 22 L5 26 L10 24" stroke="#333" strokeWidth="2" fill="none"/>
          </svg>
        );
      case 'neural_link':
        return (
          <svg width="32" height="24" viewBox="0 0 32 24" className="mx-auto">
            <path d="M4 12 Q4 4 16 4 Q28 4 28 12" stroke="#a855f7" strokeWidth="2" fill="none"/>
            <circle cx="4" cy="12" r="3" fill="#a855f7"/>
            <circle cx="28" cy="12" r="3" fill="#a855f7"/>
            <circle cx="16" cy="4" r="2" fill="#e879f9"/>
          </svg>
        );
      case 'antenna':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <path d="M16 24 L16 8" stroke="#64748b" strokeWidth="2"/>
            <circle cx="16" cy="6" r="4" fill="none" stroke="#ef4444" strokeWidth="2"/>
            <circle cx="16" cy="6" r="2" fill="#ef4444"/>
          </svg>
        );
      case 'asc_wings_small':
        return (
          <svg width="32" height="24" viewBox="0 0 32 24" className="mx-auto">
            <path d="M16 12 L8 6 L4 10 L8 14 L12 10 Z" fill="#a78bfa" stroke="#c4b5fd" strokeWidth="1"/>
            <path d="M16 12 L24 6 L28 10 L24 14 L20 10 Z" fill="#a78bfa" stroke="#c4b5fd" strokeWidth="1"/>
            <circle cx="6" cy="8" r="1" fill="#e879f9"/>
            <circle cx="26" cy="8" r="1" fill="#e879f9"/>
            <circle cx="16" cy="12" r="2" fill="#8b5cf6"/>
          </svg>
        );
      case 'asc_third_eye':
        return (
          <svg width="32" height="16" viewBox="0 0 32 16" className="mx-auto">
            <ellipse cx="16" cy="8" rx="8" ry="5" fill="#1e1b4b" stroke="#8b5cf6" strokeWidth="1.5"/>
            <circle cx="16" cy="8" r="3" fill="#a855f7"/>
            <circle cx="16" cy="8" r="1.5" fill="#e879f9"/>
            <circle cx="15" cy="7" r="0.5" fill="#fff"/>
            <path d="M8 8 Q4 8 2 6" stroke="#8b5cf6" strokeWidth="1" fill="none"/>
            <path d="M24 8 Q28 8 30 6" stroke="#8b5cf6" strokeWidth="1" fill="none"/>
          </svg>
        );
      case 'asc_crown_energy':
        return (
          <svg width="32" height="24" viewBox="0 0 32 24" className="mx-auto">
            <path d="M4 20 L4 10 L10 14 L16 6 L22 14 L28 10 L28 20 Z" fill="#06b6d4" stroke="#22d3ee" strokeWidth="1"/>
            <path d="M16 6 L16 2" stroke="#22d3ee" strokeWidth="2"/>
            <path d="M10 10 L10 6" stroke="#22d3ee" strokeWidth="1.5"/>
            <path d="M22 10 L22 6" stroke="#22d3ee" strokeWidth="1.5"/>
            <circle cx="16" cy="2" r="2" fill="#67e8f9"/>
            <circle cx="10" cy="6" r="1.5" fill="#67e8f9"/>
            <circle cx="22" cy="6" r="1.5" fill="#67e8f9"/>
          </svg>
        );
      case 'asc_void_helm':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <path d="M6 16 Q6 4 16 2 Q26 4 26 16 L26 22 L6 22 Z" fill="#18181b" stroke="#3f3f46" strokeWidth="1.5"/>
            <rect x="8" y="10" width="16" height="6" rx="1" fill="#0f0f0f" stroke="#6366f1" strokeWidth="0.5"/>
            <circle cx="12" cy="13" r="1" fill="#8b5cf6"/>
            <circle cx="20" cy="13" r="1" fill="#8b5cf6"/>
            <path d="M14 13 L18 13" stroke="#6366f1" strokeWidth="0.5"/>
          </svg>
        );
      case 'asc_cosmic_visor':
        return (
          <svg width="32" height="16" viewBox="0 0 32 16" className="mx-auto">
            <rect x="2" y="2" width="28" height="12" rx="3" fill="#0f172a" stroke="#6366f1" strokeWidth="1.5"/>
            <rect x="4" y="4" width="24" height="8" rx="2" fill="#1e1b4b"/>
            <circle cx="10" cy="8" r="2" fill="#a855f7"/>
            <circle cx="22" cy="8" r="2" fill="#a855f7"/>
            <circle cx="16" cy="8" r="1" fill="#e879f9"/>
            <path d="M6 6 L8 8 L6 10" stroke="#c4b5fd" strokeWidth="0.5" fill="none"/>
            <path d="M26 6 L24 8 L26 10" stroke="#c4b5fd" strokeWidth="0.5" fill="none"/>
          </svg>
        );
      case 'asc_divine_aura':
        return (
          <svg width="32" height="24" viewBox="0 0 32 24" className="mx-auto">
            <ellipse cx="16" cy="12" rx="14" ry="10" fill="none" stroke="#fbbf24" strokeWidth="1" opacity="0.3"/>
            <ellipse cx="16" cy="12" rx="12" ry="8" fill="none" stroke="#fcd34d" strokeWidth="1.5" opacity="0.5"/>
            <ellipse cx="16" cy="12" rx="10" ry="6" fill="none" stroke="#fef3c7" strokeWidth="2" opacity="0.7"/>
            <circle cx="4" cy="12" r="2" fill="#fbbf24"/>
            <circle cx="28" cy="12" r="2" fill="#fbbf24"/>
            <circle cx="16" cy="4" r="1.5" fill="#fcd34d"/>
          </svg>
        );
      case 'paragon_void_diadem':
        return (
          <svg width="32" height="24" viewBox="0 0 32 24" className="mx-auto">
            <path d="M6 17 Q16 5 26 17" fill="none" stroke="#22d3ee" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M9 17 Q16 10 23 17" fill="none" stroke="#a78bfa" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
            <rect x="13" y="8" width="6" height="6" rx="2" fill="#0f172a" stroke="#7dd3fc" strokeWidth="1.2" />
            <circle cx="10" cy="15.5" r="1.6" fill="#22d3ee" />
            <circle cx="22" cy="15.5" r="1.6" fill="#22d3ee" />
            <circle cx="16" cy="11" r="1.5" fill="#f472b6" />
          </svg>
        );
      default:
        return <div className="w-8 h-8 bg-slate-700 rounded mx-auto" />;
    }
  };
  
  return <div className="h-8 flex items-center justify-center">{renderAccessory()}</div>;
}

function PetPreview({ petId }: { petId: string }) {
  const renderPet = () => {
    switch (petId) {
      case 'none':
        return <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-600 mx-auto flex items-center justify-center text-slate-500 text-xs">-</div>;
      case 'cosmic_dog':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <ellipse cx="16" cy="18" rx="10" ry="8" fill="#1e1b4b" stroke="#a855f7" strokeWidth="1.5"/>
            <circle cx="16" cy="10" r="6" fill="#1e1b4b" stroke="#a855f7" strokeWidth="1.5"/>
            <circle cx="14" cy="9" r="1.5" fill="#e879f9"/>
            <circle cx="18" cy="9" r="1.5" fill="#e879f9"/>
            <path d="M10 6 L8 2 M22 6 L24 2" stroke="#a855f7" strokeWidth="1.5"/>
            <ellipse cx="16" cy="12" rx="1" ry="0.5" fill="#c4b5fd"/>
            <circle cx="11" cy="16" r="0.5" fill="#fff" opacity="0.5"/>
            <circle cx="21" cy="20" r="0.5" fill="#fff" opacity="0.5"/>
          </svg>
        );
      case 'geo_cat':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <polygon points="16,4 26,14 22,24 10,24 6,14" fill="#6366f1" stroke="#818cf8" strokeWidth="1"/>
            <polygon points="8,8 12,4 10,10" fill="#4f46e5"/>
            <polygon points="24,8 20,4 22,10" fill="#4f46e5"/>
            <polygon points="13,12 15,10 17,12 15,14" fill="#22d3ee"/>
            <polygon points="17,12 19,10 21,12 19,14" fill="#22d3ee"/>
            <polygon points="15,16 17,14 17,18" fill="#f472b6"/>
          </svg>
        );
      case 'cyber_fox':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <path d="M16 24 Q8 20 8 14 L8 8 L12 4 L16 8 L20 4 L24 8 L24 14 Q24 20 16 24" fill="#f97316" stroke="#fb923c" strokeWidth="1"/>
            <path d="M8 8 L12 4 L12 10 Z" fill="#ea580c"/>
            <path d="M24 8 L20 4 L20 10 Z" fill="#ea580c"/>
            <circle cx="13" cy="12" r="2" fill="#fff"/>
            <circle cx="19" cy="12" r="2" fill="#fff"/>
            <circle cx="13" cy="12" r="1" fill="#06b6d4"/>
            <circle cx="19" cy="12" r="1" fill="#06b6d4"/>
            <path d="M14 16 L16 18 L18 16" stroke="#fff" strokeWidth="1.5" fill="none"/>
          </svg>
        );
      case 'holo_bird':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <ellipse cx="16" cy="16" rx="8" ry="6" fill="#06b6d4" opacity="0.4" stroke="#22d3ee" strokeWidth="1"/>
            <circle cx="16" cy="12" r="5" fill="#06b6d4" opacity="0.5" stroke="#22d3ee" strokeWidth="1"/>
            <path d="M4 14 L11 16" stroke="#22d3ee" strokeWidth="2"/>
            <path d="M28 14 L21 16" stroke="#22d3ee" strokeWidth="2"/>
            <circle cx="14" cy="11" r="1" fill="#fff"/>
            <circle cx="18" cy="11" r="1" fill="#fff"/>
            <polygon points="16,13 15,15 17,15" fill="#fbbf24"/>
          </svg>
        );
      case 'robo_bunny':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <rect x="10" y="12" width="12" height="12" rx="2" fill="#374151" stroke="#4b5563" strokeWidth="1"/>
            <rect x="12" y="2" width="3" height="12" rx="1" fill="#6b7280" stroke="#4b5563" strokeWidth="0.5"/>
            <rect x="17" y="2" width="3" height="12" rx="1" fill="#6b7280" stroke="#4b5563" strokeWidth="0.5"/>
            <circle cx="14" cy="16" r="2" fill="#ef4444"/>
            <circle cx="18" cy="16" r="2" fill="#ef4444"/>
            <rect x="14" y="20" width="4" height="2" rx="1" fill="#22c55e"/>
          </svg>
        );
      case 'data_snake':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <path d="M6 20 Q8 16 12 18 Q16 20 16 14 Q16 8 20 10 Q24 12 26 8" fill="none" stroke="#22c55e" strokeWidth="3"/>
            <circle cx="26" cy="8" r="3" fill="#22c55e" stroke="#16a34a" strokeWidth="1"/>
            <circle cx="25" cy="7" r="0.8" fill="#fff"/>
            <circle cx="27" cy="7" r="0.8" fill="#fff"/>
            <path d="M28 10 L30 12 L28 14" stroke="#22c55e" strokeWidth="1" fill="none"/>
          </svg>
        );
      case 'pixel_dragon':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <rect x="12" y="8" width="8" height="8" fill="#dc2626"/>
            <rect x="14" y="4" width="4" height="4" fill="#dc2626"/>
            <rect x="8" y="12" width="4" height="4" fill="#dc2626"/>
            <rect x="20" y="12" width="4" height="4" fill="#dc2626"/>
            <rect x="12" y="16" width="8" height="6" fill="#dc2626"/>
            <rect x="14" y="6" width="1" height="2" fill="#fff"/>
            <rect x="17" y="6" width="1" height="2" fill="#fff"/>
            <rect x="24" y="8" width="4" height="2" fill="#f97316"/>
            <rect x="10" y="22" width="3" height="4" fill="#dc2626"/>
            <rect x="19" y="22" width="3" height="4" fill="#dc2626"/>
          </svg>
        );
      case 'void_cat':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <ellipse cx="16" cy="18" rx="8" ry="6" fill="#18181b" stroke="#3f3f46" strokeWidth="1"/>
            <circle cx="16" cy="10" r="6" fill="#18181b" stroke="#3f3f46" strokeWidth="1"/>
            <path d="M10 6 L8 2 M22 6 L24 2" stroke="#3f3f46" strokeWidth="2"/>
            <circle cx="14" cy="9" r="1.5" fill="#a855f7"/>
            <circle cx="18" cy="9" r="1.5" fill="#a855f7"/>
            <circle cx="12" cy="14" r="0.5" fill="#fff" opacity="0.3"/>
            <circle cx="20" cy="16" r="0.5" fill="#fff" opacity="0.3"/>
            <circle cx="14" cy="20" r="0.5" fill="#fff" opacity="0.3"/>
          </svg>
        );
      case 'quantum_hamster':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <ellipse cx="16" cy="16" rx="10" ry="8" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1"/>
            <circle cx="12" cy="14" r="2" fill="#18181b"/>
            <circle cx="20" cy="14" r="2" fill="#18181b"/>
            <circle cx="12" cy="14" r="0.8" fill="#fff"/>
            <circle cx="20" cy="14" r="0.8" fill="#fff"/>
            <ellipse cx="16" cy="18" rx="2" ry="1" fill="#f472b6"/>
            <circle cx="10" cy="8" r="3" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1"/>
            <circle cx="22" cy="8" r="3" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1"/>
            <ellipse cx="8" cy="16" rx="3" ry="2" fill="#fcd34d" opacity="0.6"/>
            <ellipse cx="24" cy="16" rx="3" ry="2" fill="#fcd34d" opacity="0.6"/>
          </svg>
        );
      default:
        return <div className="w-8 h-8 bg-slate-700 rounded mx-auto" />;
    }
  };
  
  return <div className="h-8 flex items-center justify-center">{renderPet()}</div>;
}

function ClickEffectPreview({ effectId }: { effectId: string }) {
  if (effectId === 'ember_surge') {
    return (
      <div className="relative mx-auto h-8 w-10">
        <div className="absolute left-2 top-3 h-3 w-3 rounded-full bg-orange-400/80 blur-[1px]" />
        <div className="absolute left-4 top-1 h-5 w-2 rounded-full bg-amber-300/80" />
        <div className="absolute left-5 top-2 h-4 w-2 rounded-full bg-red-400/80" />
      </div>
    );
  }

  if (effectId === 'ion_arc') {
    return (
      <svg width="40" height="28" viewBox="0 0 40 28" className="mx-auto">
        <path d="M4 18 L13 10 L17 15 L26 6 L22 14 L34 8" stroke="#22d3ee" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M6 22 L15 14 L19 19 L28 10" stroke="#67e8f9" strokeWidth="1.5" fill="none" opacity="0.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (effectId === 'phase_shatter') {
    return (
      <svg width="40" height="28" viewBox="0 0 40 28" className="mx-auto">
        <polygon points="7,18 12,9 16,17" fill="#a855f7" />
        <polygon points="17,20 22,8 27,17" fill="#c084fc" />
        <polygon points="25,21 30,11 35,20" fill="#7c3aed" />
      </svg>
    );
  }

  if (effectId === 'plasma_wave') {
    return (
      <div className="relative mx-auto h-8 w-10">
        <div className="absolute left-1 top-2 h-6 w-6 rounded-full border border-fuchsia-400/90" />
        <div className="absolute left-4 top-1 h-6 w-6 rounded-full border border-cyan-300/90" />
        <div className="absolute left-5 top-4 h-2 w-2 rounded-full bg-fuchsia-300" />
      </div>
    );
  }

  if (effectId === 'solar_flare') {
    return (
      <svg width="40" height="28" viewBox="0 0 40 28" className="mx-auto">
        <circle cx="20" cy="14" r="6" fill="#fbbf24" />
        <path d="M20 2 L20 7 M20 21 L20 26 M8 14 L13 14 M27 14 L32 14 M12 6 L15 9 M28 6 L25 9 M12 22 L15 19 M28 22 L25 19" stroke="#facc15" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  return <div className="mx-auto h-8 w-8 rounded-full bg-slate-700" />;
}

function BoxSkinPreview({ skin }: { skin: LootBoxSkin }) {
  return (
    <div className="relative mx-auto h-12 w-16 [perspective:700px]">
      <div
        className="absolute inset-0 rounded border [transform:translateZ(8px)]"
        style={{
          borderColor: skin.colors.accent,
          background: `linear-gradient(180deg, ${skin.colors.bodyFrom} 0%, ${skin.colors.bodyVia} 55%, ${skin.colors.bodyTo} 100%)`,
          boxShadow: `0 0 10px ${skin.colors.glow}`,
        }}
      />
      <div
        className="absolute left-0.5 top-1 h-9 w-2.5 rounded border [transform:rotateY(-62deg)_translateZ(2px)]"
        style={{ borderColor: skin.colors.accent, background: skin.colors.sideLeft }}
      />
      <div
        className="absolute right-0.5 top-1 h-9 w-2.5 rounded border [transform:rotateY(62deg)_translateZ(2px)]"
        style={{ borderColor: skin.colors.accent, background: skin.colors.sideRight }}
      />
      <div
        className="absolute left-1/2 top-0.5 h-3.5 w-12 -translate-x-1/2 rounded border [transform:rotateX(65deg)_translateZ(9px)]"
        style={{
          borderColor: skin.colors.accent,
          background: `linear-gradient(180deg, ${skin.colors.topFrom} 0%, ${skin.colors.topTo} 100%)`,
        }}
      />
      <div className="absolute left-1/2 top-4 h-6 w-[2px] -translate-x-1/2 rounded-full [transform:translateZ(9px)]" style={{ background: skin.colors.core }} />
    </div>
  );
}

interface BoostStats {
  productionBoost?: number;
  clickBoost?: number;
  critBoost?: number;
  cryptoBoost?: number;
}

const sumHasValues = (b?: BoostStats) => Object.values(b || {}).some(v => typeof v === 'number' && v !== 0);

function CosmeticCard({ 
  name, 
  price, 
  currency,
  owned, 
  equipped, 
  canAfford,
  onBuy,
  onEquip,
  rarity,
  children,
  boost,
  ascensionRequirement,
  totalAscensions,
  equippedBoost
}: { 
  name: string;
  price: number;
  currency: 'credits' | 'crypto' | 'ascension' | 'data';
  owned: boolean;
  equipped: boolean;
  canAfford: boolean;
  onBuy: () => void;
  onEquip: () => void;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  children: React.ReactNode;
  boost?: BoostStats;
  ascensionRequirement?: number;
  totalAscensions?: number;
  // Boost of the item currently equipped in this slot, for the comparison line.
  equippedBoost?: BoostStats;
}) {
  const { language } = useI18n();
  const l = (en: string, tr: string, pt: string, es?: string, ru?: string) => localizeInlineText(language, en, tr, pt, es, ru);
  const rarityColors = {
    common: { border: 'border-slate-500', glow: '', text: 'text-slate-400' },
    uncommon: { border: 'border-green-500', glow: 'shadow-green-500/20 shadow-lg', text: 'text-green-400' },
    rare: { border: 'border-blue-500', glow: 'shadow-blue-500/20 shadow-lg', text: 'text-blue-400' },
    epic: { border: 'border-purple-500', glow: 'shadow-purple-500/30 shadow-lg', text: 'text-purple-400' },
    legendary: { border: 'border-amber-500', glow: 'shadow-amber-500/40 shadow-xl', text: 'text-amber-400' },
  };

  const colors = rarityColors[rarity];
  const currencyColor = currency === 'credits' ? 'text-amber-400' : currency === 'crypto' ? 'text-red-400' : 'text-amber-400';
  const boostLines = getBoostLines(boost, language, 'compact');
  const defaultLabel = l('Default', 'Varsayılan', 'Padrao', 'Por Defecto');
  const equippedLabel = l('Equipped', 'Takılı', 'Equipado', 'Equipado');
  const equipLabel = l('Equip', 'Tak', 'Equipar', 'Equipar');
  const ascendLabel = l(`Ascend ${ascensionRequirement}x`, `Yükseliş ${ascensionRequirement}x`, `Ascensão ${ascensionRequirement}x`, `Ascensión ${ascensionRequirement}x`);
  
  const CurrencyDisplay = () => {
    if (currency === 'credits') return <span>â‚¡</span>;
    if (currency === 'crypto') return <CryptoIcon />;
    return <Crown className="w-4 h-4" />;
  };

  const CurrencyDisplayFixed = () => {
    if (currency === 'credits') return <CurrencyIcon kind="credits" className="w-4 h-4" />;
    if (currency === 'crypto') return <CurrencyIcon kind="crypto" className="w-4 h-4" />;
    if (currency === 'data') return <CurrencyIcon kind="data" className="w-4 h-4" />;
    return <CurrencyIcon kind="ascension" className="w-4 h-4" />;
  };

  return (
    <motion.div
      className={`relative p-3 rounded-lg border-2 ${colors.border} ${colors.glow} bg-slate-900/80 backdrop-blur-sm`}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      data-testid={`cosmetic-card-${name.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {equipped && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center z-10">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}
      
      <div className="mb-2">
        {children}
      </div>
      
      <h4 className={`text-sm font-semibold text-center ${colors.text} mb-1`}>{name}</h4>
      <p className={`-mt-1 mb-1 text-[9px] uppercase tracking-widest text-center ${colors.text} opacity-80`}>{getRarityLabel(rarity, language)}</p>
      
      {boostLines.length > 0 && (
        <div className="text-xs font-bold text-center text-cyan-100 mb-1 space-y-0.5">
          {boostLines.map((line) => <div key={line}>{line}</div>)}
        </div>
      )}
      {!equipped && boost && (() => {
        const sum = (b?: BoostStats) => Object.values(b || {}).reduce((total: number, v) => total + (typeof v === 'number' ? v : 0), 0);
        const delta = sum(boost) - sum(equippedBoost);
        if (!sumHasValues(boost)) return null;
        return (
          <p className={`mb-1 text-center text-[10px] font-mono ${delta > 0 ? 'text-emerald-300' : delta < 0 ? 'text-red-300' : 'text-slate-400'}`} data-testid="cosmetic-compare">
            {delta > 0 ? `▲ +${delta}%` : delta < 0 ? `▼ ${delta}%` : '='} {l('vs equipped', 'takılıya göre', 'vs equipado', 'vs equipado', 'к надетому')}
          </p>
        );
      })()}
      
      {owned ? (
        equipped ? (
          <p className="text-xs text-center text-green-400">{price === 0 ? defaultLabel : equippedLabel}</p>
        ) : (
          <button
            onClick={onEquip}
            className="w-full py-1 px-2 text-xs bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors"
            data-testid={`button-equip-${name.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {equipLabel}
          </button>
        )
      ) : (
        <>
          {ascensionRequirement !== undefined && totalAscensions !== undefined && totalAscensions < ascensionRequirement ? (
            <button
              disabled
              className="w-full py-1 px-2 text-xs bg-slate-700 text-slate-500 cursor-not-allowed rounded transition-colors flex items-center justify-center gap-1"
              data-testid={`button-locked-${name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Lock className="w-3 h-3" />
              <span className="text-xs">{ascendLabel}</span>
            </button>
          ) : (
            <button
              onClick={onBuy}
              disabled={!canAfford}
              className={`w-full py-1 px-2 text-xs rounded transition-colors flex items-center justify-center gap-1 ${
                canAfford 
                  ? 'bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white' 
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
              data-testid={`button-buy-${name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {canAfford ? (
                <>
                  <span className={currencyColor}><CurrencyDisplayFixed /></span>
                  {formatNumber(price)}
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3" />
                  <span className={currencyColor}><CurrencyDisplayFixed /></span>
                  {formatNumber(price)}
                </>
              )}
            </button>
          )}
        </>
      )}
    </motion.div>
  );
}

export const CosmeticsPanel = React.memo(function CosmeticsPanel({
  data,
  credits,
  crypto,
  ascension,
  totalAscensions,
  skins,
  themes,
  accessories,
  headStyles,
  pets,
  clickEffects,
  boxSkins,
  ascensionPets,
  ascensionSkins,
  ascensionHeadStyles,
  ascensionAccessories,
  ascensionThemes,
  ownedSkins,
  ownedThemes,
  ownedAccessories,
  ownedHeadStyles,
  ownedPets,
  ownedClickEffects,
  ownedBoxSkins,
  ownedAscensionPets,
  activeSkin,
  activeTheme,
  activeAccessory,
  activeHeadStyle,
  activePet,
  activeClickEffect,
  activeBoxSkin,
  activeAscensionPet,
  onBuySkin,
  onBuyTheme,
  onBuyAccessory,
  onBuyHeadStyle,
  onBuyPet,
  onEquipSkin,
  onEquipTheme,
  onEquipAccessory,
  onEquipHeadStyle,
  onEquipPet,
  onEquipClickEffect,
  onEquipBoxSkin,
  onEquipAscensionPet,
  activeBoosts,
}: CosmeticsPanelProps) {
  const { language } = useI18n();
  const l = (en: string, tr: string, pt: string, es?: string, ru?: string) => localizeInlineText(language, en, tr, pt, es, ru);
  const findEquippedBoost = (id: string, ...lists: Array<Array<{ id: string; boost?: BoostStats }>>) =>
    lists.flat().find(item => item.id === id)?.boost;
  const equippedSkinBoost = findEquippedBoost(activeSkin, skins, ascensionSkins);
  const equippedHeadBoost = findEquippedBoost(activeHeadStyle, headStyles, ascensionHeadStyles);
  const equippedAccessoryBoost = findEquippedBoost(activeAccessory, accessories, ascensionAccessories);
  const equippedThemeBoost = findEquippedBoost(activeTheme, themes, ascensionThemes);
  const equippedPetBoost = findEquippedBoost(activePet, pets);
  const [activeTab, setActiveTab] = useState<'character' | 'rooms' | 'pets' | 'ascension'>('character');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollTo({ top: 0, behavior: 'auto' });
  }, [activeTab]);

  const canAfford = (price: number, currency: 'credits' | 'crypto' | 'ascension' | 'data') => {
    if (currency === 'credits') return credits >= price;
    if (currency === 'crypto') return crypto >= price;
    return ascension >= price;
  };

  const tabs = [
    { id: 'character' as const, label: language === 'zh-CN' ? '角色' : l('Character', 'Karakter', 'Personagem', 'Personaje'), icon: User },
    { id: 'rooms' as const, label: language === 'zh-CN' ? '房间' : l('Rooms', 'Odalar', 'Salas', 'Salas'), icon: Home },
    { id: 'pets' as const, label: language === 'zh-CN' ? '宠物' : l('Pets', 'Evciller', 'Pets', 'Mascotas'), icon: Cat },
    { id: 'ascension' as const, label: language === 'zh-CN' ? '飞升' : l('Ascension', 'Yükseliş', 'Ascensão', 'Ascensión'), icon: Star },
  ];

  const creditsLabel = l('Nodes', 'Dizin', 'Nodes', 'Nodos');
  const ascensionLabel = l('Ascension', 'Yükseliş', 'Ascensão', 'Ascensión');
  const lootBoxExclusiveLabel = l('(Loot Box Exclusive)', '(Kutuya Özel)', '(Exclusivo de Loot Box)', '(Exclusivo de Loot Box)');
  const ascensionCurrencyLabel = l('(Ascension)', '(Yükseliş)', '(Ascensão)', '(Ascensión)');
  const ascensionIntro = l(
    'Exclusive cosmetics purchasable with Ascension Points. These items are only available after ascending!',
    'Yükseliş Puanları ile alınabilen özel kozmetikler. Bu eşyalar sadece yükseldikten sonra açılır!',
    'Cosméticos exclusivos comprados com Pontos de Ascensão. Esses itens so ficam disponíveis depois de ascender!',
    'Cosméticos exclusivos que se compran con Puntos de Ascensión. Estos objetos solo están disponibles después de ascender.',
  );
  const ascensionPetsSubtitle = l(
    'Unlocked by reaching ascension milestones. Can be equipped alongside a companion pet!',
    'Yükseliş kilometre taşlarına ulaşınca açılır. Bir yoldaş evcille birlikte kuşanılabilir!',
    'Desbloqueados ao atingir marcos de ascensão. Podem ser equipados junto com um pet companheiro!',
    'Se desbloquean al alcanzar hitos de ascensión. Pueden equiparse junto a una mascota compañera.',
  );
  const openLootBoxesLabel = l('Open Loot Boxes', 'Kutuları Aç', 'Abrir Loot Boxes', 'Abrir Loot Boxes');
  const unequipAscensionPetLabel = l('Unequip Ascension Pet', 'Yükseliş Evcilini Çıkar', 'Desequipar Pet de Ascensão', 'Desequipar Mascota de Ascensión');
  const characterSkinsLabel = l('Character Skins', 'Karakter Kaplamaları', 'Skins de Personagem', 'Skins de Personaje');
  const headStylesLabel = l('Head Styles', 'Baş Stilleri', 'Estilos de Cabeça', 'Estilos de Cabeza');
  const accessoriesLabel = l('Accessories', 'Aksesuarlar', 'Acessórios', 'Accesorios');
  const roomThemesLabel = l('Room Themes', 'Oda Temaları', 'Temas de Sala', 'Temas de Sala');
  const companionPetsLabel = l('Companion Pets', 'Yoldaş Evciller', 'Pets Companheiros', 'Mascotas Compañeras');
  const clickEffectsLabel = l('Click Effects', 'Tıklama Efektleri', 'Efeitos de Clique', 'Efectos de Clic');
  const clickEffectsSubtitle = l(
    'These effects can only be claimed by opening Ascension Loot Boxes after boss fights.',
    'Bu efektler sadece boss savaşlarından sonra açılan Yükseliş Kutularından kazanılır.',
    'Esses efeitos só podem ser obtidos ao abrir Loot Boxes de Ascensão depois das lutas contra chefes.',
    'Estos efectos solo pueden obtenerse al abrir Loot Boxes de Ascensión después de las peleas contra jefes.',
  );
  const lootBoxSkinsLabel = l('Loot Box Skins', 'Kutu Kaplamaları', 'Skins de Loot Box', 'Skins de Loot Box');
  const lootBoxSkinsSubtitle = l(
    'Box skins can only drop from Ascension Loot Boxes and cannot be purchased.',
    'Kutu kaplamaları sadece Yükseliş Kutularından düşer ve satın alınamaz.',
    'As skins de caixa só podem vir de Loot Boxes de Ascensão e não podem ser compradas.',
    'Las skins de caja solo pueden salir de Loot Boxes de Ascensión y no se pueden comprar.',
  );
  const ascensionSkinsLabel = l('Ascension Skins', 'Yükseliş Kaplamaları', 'Skins de Ascensão', 'Skins de Ascensión');
  const ascensionHeadStylesLabel = l('Ascension Head Styles', 'Yükseliş Baş Stilleri', 'Estilos de Cabeça de Ascensão', 'Estilos de Cabeza de Ascensión');
  const ascensionAccessoriesLabel = l('Ascension Accessories', 'Yükseliş Aksesuarları', 'Acessórios de Ascensão', 'Accesorios de Ascensión');
  const ascensionRoomThemesLabel = l('Ascension Room Themes', 'Yükseliş Oda Temaları', 'Temas de Sala de Ascensão', 'Temas de Sala de Ascensión');
  const ascensionPetsLabel = l('Ascension Pets', 'Yükseliş Evcilleri', 'Pets de Ascensão', 'Mascotas de Ascensión');
  const milestoneUnlocksLabel = l('(Milestone Unlocks - Stackable)', '(Kilometre Taşı Kilitleri - Birikir)', '(Desbloqueios por Marco - Acumuláveis)', '(Desbloqueos por Hito - Acumulables)');
  const luckLabel = l('Loot Luck', 'Ganimet Şansı', 'Sorte de Saque', 'Suerte de Loot');
  const equippedLabel = l('Equipped', 'Takılı', 'Equipado', 'Equipado');
  const defaultStateLabel = l('Default', 'Varsayılan', 'Padrao', 'Por Defecto');
  const equipStateLabel = l('Equip', 'Tak', 'Equipar', 'Equipar');

  return (
    <div className="h-full min-h-0 flex flex-col" data-testid="cosmetics-panel">
      <div className="flex gap-4 mb-4 text-sm flex-wrap">
        <div className="flex items-center gap-1">
          <span className="text-amber-400 text-[11px] uppercase tracking-wider">{creditsLabel}</span>
          <span className="text-white" data-testid="cosmetics-credits">{formatNumber(credits)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-fuchsia-300 text-[11px] uppercase tracking-wider">{ascensionLabel}</span>
          <span className="text-white" data-testid="cosmetics-ascension">{formatNumber(ascension)}</span>
        </div>
      </div>

      {(() => {
        const activeLines = getBoostLines(activeBoosts, language);
        return (
          <div className="mb-4 rounded-lg border border-cyan-500/30 bg-slate-900/60 p-2 text-[11px]" data-testid="cosmetics-active-bonuses">
            <p className="mb-1 font-mono uppercase tracking-wider text-cyan-400">{l('Your active bonuses', 'Aktif bonusların', 'Seus bônus ativos', 'Tus bonos activos', 'Ваши активные бонусы')}</p>
            {activeLines.length > 0 ? (
              <div className="grid grid-cols-1 gap-0.5 text-slate-200 sm:grid-cols-2">
                {activeLines.map((line) => <div key={line}>{line}</div>)}
              </div>
            ) : (
              <p className="text-slate-400">{l('None yet. Equip items with bonuses to get them.', 'Henüz yok. Bonus almak için bonuslu eşyaları kuşan.', 'Nenhum ainda. Equipe itens com bônus para obtê-los.', 'Ninguno aún. Equipa objetos con bonos para obtenerlos.', 'Пока нет. Экипируйте предметы с бонусами.')}</p>
            )}
            <p className="mt-1 text-[10px] text-slate-500">{l('Only equipped items count, one per slot. Owning an item without equipping it gives no bonus.', 'Sadece kuşanılan eşyalar sayılır, her slotta bir tane. Kuşanılmayan eşya bonus vermez.', 'Só itens equipados contam, um por espaço. Ter um item sem equipá-lo não dá bônus.', 'Solo cuentan los objetos equipados, uno por ranura. Tener un objeto sin equiparlo no da bono.', 'Считаются только экипированные предметы, по одному на слот.')}</p>
          </div>
        );
      })()}

      <div className="flex gap-1 mb-4 p-1 bg-slate-800/50 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
            data-testid={`tab-${tab.id}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-slate-800 space-y-6 pr-2">
        {activeTab === 'character' && (
          <>
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Palette className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">{characterSkinsLabel}</h3>
                <span className="text-xs text-slate-500">({creditsLabel})</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <AnimatePresence>
                  {skins.map((skin) => (
                    <CosmeticCard
                      equippedBoost={equippedSkinBoost}
                      key={skin.id}
                      name={skin.name}
                      price={skin.price}
                      currency={skin.currency}
                      owned={ownedSkins.has(skin.id)}
                      equipped={activeSkin === skin.id}
                      canAfford={canAfford(skin.price, skin.currency)}
                      onBuy={() => onBuySkin(skin.id)}
                      onEquip={() => onEquipSkin(skin.id)}
                      rarity={skin.rarity}
                      boost={skin.boost}
                    >
                      <SkinPreview id={skin.id} palette={skin.palette} />
                    </CosmeticCard>
                  ))}
                </AnimatePresence>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-semibold text-rose-400 uppercase tracking-wider">{headStylesLabel}</h3>
                <span className="text-xs text-slate-500">({creditsLabel})</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <AnimatePresence>
                  {headStyles.map((head) => (
                    <CosmeticCard
                      equippedBoost={equippedHeadBoost}
                      key={head.id}
                      name={head.name}
                      price={head.price}
                      currency={head.currency}
                      owned={ownedHeadStyles.has(head.id)}
                      equipped={activeHeadStyle === head.id}
                      canAfford={canAfford(head.price, head.currency)}
                      onBuy={() => onBuyHeadStyle(head.id)}
                      onEquip={() => onEquipHeadStyle(head.id)}
                      rarity={head.rarity}
                      boost={head.boost}
                    >
                      <HeadStylePreview headStyleId={head.id} />
                    </CosmeticCard>
                  ))}
                </AnimatePresence>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-4 h-4 text-fuchsia-400" />
                <h3 className="text-sm font-semibold text-fuchsia-400 uppercase tracking-wider">{accessoriesLabel}</h3>
                <span className="text-xs text-slate-500">({creditsLabel})</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <AnimatePresence>
                  {accessories.map((acc) => (
                    <CosmeticCard
                      equippedBoost={equippedAccessoryBoost}
                      key={acc.id}
                      name={acc.name}
                      price={acc.price}
                      currency={acc.currency}
                      owned={ownedAccessories.has(acc.id)}
                      equipped={activeAccessory === acc.id}
                      canAfford={canAfford(acc.price, acc.currency)}
                      onBuy={() => onBuyAccessory(acc.id)}
                      onEquip={() => onEquipAccessory(acc.id)}
                      rarity={acc.rarity}
                      boost={acc.boost}
                    >
                      <AccessoryPreview accessoryId={acc.id} type={acc.type} />
                    </CosmeticCard>
                  ))}
                </AnimatePresence>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">{clickEffectsLabel}</h3>
                <span className="text-xs text-slate-500">{lootBoxExclusiveLabel}</span>
              </div>
              <p className="mb-3 text-xs text-slate-400">
                {clickEffectsSubtitle}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <AnimatePresence>
                  {clickEffects.map((effect) => {
                    const owned = ownedClickEffects.has(effect.id);
                    const equipped = activeClickEffect === effect.id;
                    const rarityClasses: Record<'rare' | 'epic' | 'legendary', string> = {
                      rare: 'border-blue-500 shadow-blue-500/20 shadow-lg',
                      epic: 'border-purple-500 shadow-purple-500/30 shadow-lg',
                      legendary: 'border-amber-500 shadow-amber-500/35 shadow-xl',
                    };
                    return (
                      <motion.div
                        key={effect.id}
                        className={`relative rounded-lg border-2 bg-slate-900/80 p-3 backdrop-blur-sm ${rarityClasses[effect.rarity]}`}
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                      >
                        {equipped && (
                          <div className="absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        )}
                        <div className="mb-2">
                          <ClickEffectPreview effectId={effect.id} />
                        </div>
                        <h4 className="mb-1 text-center text-sm font-semibold text-cyan-300">{effect.name}</h4>
                        <p className="mb-2 text-center text-[10px] text-slate-400">{effect.description}</p>
                        <div className="mb-2 space-y-0.5 text-center text-[10px] text-slate-300">
                          {getBoostLines(effect.boost, language).map((line) => <div key={`${effect.id}-${line}`}>{line}</div>)}
                        </div>
                        {!owned ? (
                          <div className="flex items-center justify-center gap-1 text-xs text-amber-300">
                            <Lock className="h-3 w-3" />
                            <span>{openLootBoxesLabel}</span>
                          </div>
                        ) : equipped ? (
                          <p className="text-center text-xs text-green-400">{equippedLabel}</p>
                        ) : (
                          <button
                            onClick={() => onEquipClickEffect(effect.id)}
                            className="w-full rounded bg-cyan-600 py-1 px-2 text-xs text-white transition-colors hover:bg-cyan-500"
                          >
                            {equipStateLabel}
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-cyan-300" />
                <h3 className="text-sm font-semibold text-cyan-300 uppercase tracking-wider">{lootBoxSkinsLabel}</h3>
                <span className="text-xs text-slate-500">{lootBoxExclusiveLabel}</span>
              </div>
              <p className="mb-3 text-xs text-slate-400">
                {lootBoxSkinsSubtitle}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <AnimatePresence>
                  {boxSkins.map((skin) => {
                    const owned = ownedBoxSkins.has(skin.id);
                    const equipped = activeBoxSkin === skin.id;
                    const rarityClasses: Record<'common' | 'uncommon' | 'rare' | 'epic' | 'legendary', string> = {
                      common: 'border-slate-500',
                      uncommon: 'border-green-500',
                      rare: 'border-blue-500 shadow-blue-500/20 shadow-lg',
                      epic: 'border-purple-500 shadow-purple-500/30 shadow-lg',
                      legendary: 'border-amber-500 shadow-amber-500/35 shadow-xl',
                    };

                    return (
                      <motion.div
                        key={skin.id}
                        className={`relative rounded-lg border-2 bg-slate-900/80 p-3 backdrop-blur-sm ${rarityClasses[skin.rarity]}`}
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                      >
                        {equipped && (
                          <div className="absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        )}
                        <div className="mb-2">
                          <BoxSkinPreview skin={skin} />
                        </div>
                        <h4 className="mb-1 text-center text-sm font-semibold text-cyan-300">{skin.name}</h4>
                        <p className="mb-2 text-center text-[10px] text-slate-400">{skin.description}</p>
                        <p className="mb-2 text-center text-[10px] text-emerald-300">+{skin.luckBonus}% {luckLabel}</p>
                        {!owned ? (
                          <div className="flex items-center justify-center gap-1 text-xs text-amber-300">
                            <Lock className="h-3 w-3" />
                            <span>{openLootBoxesLabel}</span>
                          </div>
                        ) : equipped ? (
                          <p className="text-center text-xs text-green-400">{skin.id === 'default' ? defaultStateLabel : equippedLabel}</p>
                        ) : (
                          <button
                            onClick={() => onEquipBoxSkin(skin.id)}
                            className="w-full rounded bg-cyan-600 py-1 px-2 text-xs text-white transition-colors hover:bg-cyan-500"
                          >
                            {equipStateLabel}
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </section>
          </>
        )}

        {activeTab === 'rooms' && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Home className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">{roomThemesLabel}</h3>
              <span className="text-xs text-slate-500">({creditsLabel})</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <AnimatePresence>
                {themes.map((theme) => (
                  <CosmeticCard
                    equippedBoost={equippedThemeBoost}
                    key={theme.id}
                    name={theme.name}
                    price={theme.price}
                    currency={theme.currency}
                    owned={ownedThemes.has(theme.id)}
                    equipped={activeTheme === theme.id}
                    canAfford={canAfford(theme.price, theme.currency)}
                    onBuy={() => onBuyTheme(theme.id)}
                    onEquip={() => onEquipTheme(theme.id)}
                    rarity={theme.rarity}
                    boost={theme.boost}
                  >
                    <ThemePreview colors={theme.colors} themeId={theme.id} />
                  </CosmeticCard>
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}

        {activeTab === 'pets' && (
          <>
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Cat className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">{companionPetsLabel}</h3>
                <span className="text-xs text-slate-500">({creditsLabel})</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <AnimatePresence>
                  {pets.map((pet) => (
                    <CosmeticCard
                      equippedBoost={equippedPetBoost}
                      key={pet.id}
                      name={pet.name}
                      price={pet.price}
                      currency={pet.currency}
                      owned={ownedPets.has(pet.id)}
                      equipped={activePet === pet.id}
                      canAfford={canAfford(pet.price, pet.currency)}
                      onBuy={() => onBuyPet(pet.id)}
                      onEquip={() => onEquipPet(pet.id)}
                      rarity={pet.rarity}
                      boost={pet.boost}
                    >
                      <PetPreview petId={pet.id} />
                    </CosmeticCard>
                  ))}
                </AnimatePresence>
              </div>
            </section>

          </>
        )}

        {activeTab === 'ascension' && (
          <>
            <div className="mb-4 p-3 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-lg">
              <p className="text-xs text-fuchsia-300">{ascensionIntro}</p>
            </div>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <Palette className="w-4 h-4 text-fuchsia-400" />
                <h3 className="text-sm font-semibold text-fuchsia-400 uppercase tracking-wider">{ascensionSkinsLabel}</h3>
                <span className="text-xs text-slate-500">{ascensionCurrencyLabel}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <AnimatePresence>
                  {ascensionSkins.map((skin) => (
                    <CosmeticCard
                      equippedBoost={equippedSkinBoost}
                      key={skin.id}
                      name={skin.name}
                      price={skin.price}
                      currency={skin.currency}
                      owned={ownedSkins.has(skin.id)}
                      equipped={activeSkin === skin.id}
                      canAfford={canAfford(skin.price, skin.currency)}
                      onBuy={() => onBuySkin(skin.id)}
                      onEquip={() => onEquipSkin(skin.id)}
                      rarity={skin.rarity}
                      boost={skin.boost}
                      totalAscensions={totalAscensions}
                      ascensionRequirement={skin.ascensionRequirement || 0}
                    >
                      <SkinPreview id={skin.id} palette={skin.palette} />
                    </CosmeticCard>
                  ))}
                </AnimatePresence>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-fuchsia-400" />
                <h3 className="text-sm font-semibold text-fuchsia-400 uppercase tracking-wider">{ascensionHeadStylesLabel}</h3>
                <span className="text-xs text-slate-500">{ascensionCurrencyLabel}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <AnimatePresence>
                  {ascensionHeadStyles.map((head) => (
                    <CosmeticCard
                      equippedBoost={equippedHeadBoost}
                      key={head.id}
                      name={head.name}
                      price={head.price}
                      currency={head.currency}
                      owned={ownedHeadStyles.has(head.id)}
                      equipped={activeHeadStyle === head.id}
                      canAfford={canAfford(head.price, head.currency)}
                      onBuy={() => onBuyHeadStyle(head.id)}
                      onEquip={() => onEquipHeadStyle(head.id)}
                      rarity={head.rarity}
                      boost={head.boost}
                      totalAscensions={totalAscensions}
                      ascensionRequirement={head.ascensionRequirement || 0}
                    >
                      <HeadStylePreview headStyleId={head.id} />
                    </CosmeticCard>
                  ))}
                </AnimatePresence>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-4 h-4 text-fuchsia-400" />
                <h3 className="text-sm font-semibold text-fuchsia-400 uppercase tracking-wider">{ascensionAccessoriesLabel}</h3>
                <span className="text-xs text-slate-500">{ascensionCurrencyLabel}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <AnimatePresence>
                  {ascensionAccessories.map((acc) => (
                    <CosmeticCard
                      equippedBoost={equippedAccessoryBoost}
                      key={acc.id}
                      name={acc.name}
                      price={acc.price}
                      currency={acc.currency}
                      owned={ownedAccessories.has(acc.id)}
                      equipped={activeAccessory === acc.id}
                      canAfford={canAfford(acc.price, acc.currency)}
                      onBuy={() => onBuyAccessory(acc.id)}
                      onEquip={() => onEquipAccessory(acc.id)}
                      rarity={acc.rarity}
                      boost={acc.boost}
                      totalAscensions={totalAscensions}
                      ascensionRequirement={acc.ascensionRequirement || 0}
                    >
                      <AccessoryPreview accessoryId={acc.id} type={acc.type} />
                    </CosmeticCard>
                  ))}
                </AnimatePresence>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <Home className="w-4 h-4 text-fuchsia-400" />
                <h3 className="text-sm font-semibold text-fuchsia-400 uppercase tracking-wider">{ascensionRoomThemesLabel}</h3>
                <span className="text-xs text-slate-500">{ascensionCurrencyLabel}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <AnimatePresence>
                  {ascensionThemes.map((theme) => (
                    <CosmeticCard
                      equippedBoost={equippedThemeBoost}
                      key={theme.id}
                      name={theme.name}
                      price={theme.price}
                      currency={theme.currency}
                      owned={ownedThemes.has(theme.id)}
                      equipped={activeTheme === theme.id}
                      canAfford={canAfford(theme.price, theme.currency)}
                      onBuy={() => onBuyTheme(theme.id)}
                      onEquip={() => onEquipTheme(theme.id)}
                      rarity={theme.rarity}
                      boost={theme.boost}
                      totalAscensions={totalAscensions}
                      ascensionRequirement={theme.ascensionRequirement || 0}
                    >
                      <ThemePreview colors={theme.colors} themeId={theme.id} />
                    </CosmeticCard>
                  ))}
                </AnimatePresence>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-fuchsia-400" />
                <h3 className="text-sm font-semibold text-fuchsia-400 uppercase tracking-wider">{ascensionPetsLabel}</h3>
                <span className="text-xs text-slate-500">{milestoneUnlocksLabel}</span>
              </div>
              <p className="text-xs text-slate-400 mb-3">{ascensionPetsSubtitle}</p>
              <div className="grid grid-cols-3 gap-2">
                <AnimatePresence>
                  {ascensionPets.map((pet) => {
                    const isUnlocked = ownedAscensionPets.has(pet.id);
                    const requirement = pet.ascensionRequirement || 0;
                    return (
                      <motion.div
                        key={pet.id}
                        className={`relative p-3 rounded-lg border-2 ${
                          isUnlocked 
                            ? 'border-fuchsia-500 shadow-fuchsia-500/30 shadow-lg' 
                            : 'border-slate-600 opacity-60'
                        } bg-slate-900/80 backdrop-blur-sm`}
                        whileHover={{ scale: isUnlocked ? 1.02 : 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        {activeAscensionPet === pet.id && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-fuchsia-500 rounded-full flex items-center justify-center z-10">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div className="mb-2">
                          <AscensionPetPreview petId={pet.id} />
                        </div>
                        <h4 className={`text-sm font-semibold text-center mb-1 ${isUnlocked ? 'text-fuchsia-400' : 'text-slate-500'}`}>
                          {pet.name}
                        </h4>
                        <p className="text-[10px] text-center text-slate-400 mb-2">{pet.description}</p>
                        {isUnlocked && pet.boost && (pet.boost.productionBoost || pet.boost.clickBoost || pet.boost.critBoost || pet.boost.cryptoBoost || pet.boost.critDamageBoost) && (
                          <div className="text-[9px] text-center text-slate-300 mb-2 space-y-0.5">
                            {getBoostLines(pet.boost, language, 'compact').map((line) => <div key={`${pet.id}-${line}`}>{line}</div>)}
                          </div>
                        )}
                        {isUnlocked ? (
                          activeAscensionPet === pet.id ? (
                            <p className="text-xs text-center text-fuchsia-400">{equippedLabel}</p>
                          ) : (
                            <button
                              onClick={() => onEquipAscensionPet(pet.id)}
                              className="w-full py-1 px-2 text-xs bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded transition-colors"
                            >
                              {equipStateLabel}
                            </button>
                          )
                        ) : (
                          <div className="flex items-center justify-center gap-1 text-xs text-slate-500">
                            <Lock className="w-3 h-3" />
                            <span>{l(`Ascension ${requirement}x`, `Yükseliş ${requirement}x`, `Ascensão ${requirement}x`, `Ascensión ${requirement}x`)}</span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
              {activeAscensionPet !== 'none' && (
                <button
                  onClick={() => onEquipAscensionPet('none')}
                  className="mt-3 w-full py-1.5 px-3 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                >
                  {unequipAscensionPetLabel}
                </button>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
});

function AscensionPetPreview({ petId }: { petId: string }) {
  const renderPet = () => {
    switch (petId) {
      case 'ascension_spark':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <circle cx="16" cy="14" r="8" fill="#fbbf24" opacity="0.3"/>
            <circle cx="16" cy="14" r="5" fill="#fcd34d"/>
            <circle cx="14" cy="13" r="1" fill="#fff"/>
            <circle cx="18" cy="13" r="1" fill="#fff"/>
            <path d="M16 8 L17 10 L16 11 L15 10 Z" fill="#fef3c7"/>
            <path d="M10 14 L12 13 L12 15 Z" fill="#fef3c7"/>
            <path d="M22 14 L20 13 L20 15 Z" fill="#fef3c7"/>
          </svg>
        );
      case 'ascension_ember':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <ellipse cx="16" cy="18" rx="8" ry="6" fill="#ef4444" opacity="0.4"/>
            <path d="M16 6 Q20 12 18 18 Q16 22 14 18 Q12 12 16 6" fill="#f97316"/>
            <path d="M16 8 Q18 12 17 16 Q16 18 15 16 Q14 12 16 8" fill="#fbbf24"/>
            <circle cx="15" cy="12" r="1" fill="#fff" opacity="0.8"/>
          </svg>
        );
      case 'ascension_phantom':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <ellipse cx="16" cy="16" rx="10" ry="8" fill="#06b6d4" opacity="0.2"/>
            <path d="M10 20 Q10 10 16 8 Q22 10 22 20 Q16 24 10 20" fill="#06b6d4" opacity="0.4"/>
            <circle cx="13" cy="14" r="2" fill="#fff"/>
            <circle cx="19" cy="14" r="2" fill="#fff"/>
            <circle cx="13" cy="14" r="1" fill="#0891b2"/>
            <circle cx="19" cy="14" r="1" fill="#0891b2"/>
          </svg>
        );
      case 'ascension_nexus':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <polygon points="16,4 26,14 22,24 10,24 6,14" fill="#8b5cf6" stroke="#a78bfa" strokeWidth="1"/>
            <circle cx="16" cy="14" r="4" fill="#c4b5fd"/>
            <circle cx="16" cy="14" r="2" fill="#8b5cf6"/>
            <circle cx="16" cy="14" r="1" fill="#fff"/>
          </svg>
        );
      case 'ascension_oracle':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <ellipse cx="16" cy="14" rx="10" ry="10" fill="#a855f7" opacity="0.3"/>
            <circle cx="16" cy="14" r="7" fill="#1e1b4b" stroke="#a855f7" strokeWidth="1"/>
            <circle cx="16" cy="14" r="4" fill="#a855f7"/>
            <circle cx="16" cy="14" r="2" fill="#e879f9"/>
            <circle cx="15" cy="13" r="1" fill="#fff"/>
            <path d="M8 8 L10 10 M24 8 L22 10" stroke="#a855f7" strokeWidth="1"/>
          </svg>
        );
      case 'ascension_infinity':
        return (
          <svg width="32" height="28" viewBox="0 0 32 28" className="mx-auto">
            <defs>
              <linearGradient id="infinity-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24"/>
                <stop offset="50%" stopColor="#a855f7"/>
                <stop offset="100%" stopColor="#06b6d4"/>
              </linearGradient>
            </defs>
            <path d="M8 14 Q8 8 12 8 Q16 8 16 14 Q16 8 20 8 Q24 8 24 14 Q24 20 20 20 Q16 20 16 14 Q16 20 12 20 Q8 20 8 14" 
                  fill="none" stroke="url(#infinity-grad)" strokeWidth="3"/>
            <circle cx="12" cy="14" r="2" fill="#fbbf24"/>
            <circle cx="20" cy="14" r="2" fill="#06b6d4"/>
          </svg>
        );
      default:
        return <div className="w-8 h-8 bg-slate-700 rounded mx-auto" />;
    }
  };
  
  return <div className="h-8 flex items-center justify-center">{renderPet()}</div>;
}

