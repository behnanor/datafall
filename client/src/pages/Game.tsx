import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { useGame, formatNumber, type ResourceType, type LootBoxReward, CHARACTER_SKINS, ROOM_THEMES, CHARACTER_ACCESSORIES, CHARACTER_HEAD_STYLES, CHARACTER_PETS, ASCENSION_PETS, ASCENSION_SKINS, ASCENSION_HEAD_STYLES, ASCENSION_ACCESSORIES, ASCENSION_ROOM_THEMES, CLICK_EFFECTS, LOOT_BOX_SKINS, MACHINE_BOX_SKINS, CRYPTO_RELIC_TREE, CRYPTO_RELIC_SHOP_UNLOCK_ASCENSION, getCryptoRelicUpgradeCost, BLACK_MARKET_CAPES, BLACK_MARKET_WINGS, BLACK_MARKET_UPGRADES, BLACK_MARKET_UNLOCK_ASCENSION } from '@/lib/useGame';
import { getSteamLeaderboardEntries, isSteamAvailable, setSteamLeaderboardScore, type SteamLeaderboardEntry } from '@/lib/steamIntegration';
import { ResourcePanel } from '@/components/game/ResourcePanel';
import { UpgradePanel } from '@/components/game/UpgradePanel';
import { MainView } from '@/components/game/MainView';
import { SettingsModal } from '@/components/game/SettingsModal';
import { FloatingPickup } from '@/components/game/FloatingPickup';
import { DebugPanel } from '@/components/game/DebugPanel';
import { AchievementsPanel } from '@/components/game/AchievementsPanel';
import { TutorialPanel } from '@/components/game/TutorialPanel';
import { CSSCharacter } from '@/components/game/CyberpunkRoom';

const CosmeticsPanel = lazy(() => import('@/components/game/CosmeticsPanel').then(m => ({ default: m.CosmeticsPanel })));
const BossEncounter = lazy(() => import('@/components/game/BossEncounter').then(m => ({ default: m.BossEncounter })));
const OfflineProgressModal = lazy(() => import('@/components/game/OfflineProgressModal').then(m => ({ default: m.OfflineProgressModal })));
import { Button } from '@/components/ui/button';
import { Crown, Trophy, BarChart3, ChevronLeft, ChevronRight, Sparkles, Cpu } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';


import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function GamePage() {
  const MAX_ASCENSION_LEADERBOARD = 'max_ascension';
  const LEADERBOARD_PANEL_LIMIT = 10;
  const LEADERBOARD_MODAL_LIMIT = 500;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPrestigeOpen, setIsPrestigeOpen] = useState(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isCosmeticsOpen, setIsCosmeticsOpen] = useState(false);
  const [isDebugPanelVisible, setIsDebugPanelVisible] = useState(false);
  const [selectedBulkOption, setSelectedBulkOption] = useState<1 | 10 | 100 | 'max'>(1);
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [userClosedLeftPanel, setUserClosedLeftPanel] = useState(false);
  const [userClosedRightPanel, setUserClosedRightPanel] = useState(false);
  const [pickupCollected, setPickupCollected] = useState(false);
  const [achievementUnlocked, setAchievementUnlocked] = useState(false);
  const [isBossEncounterActive, setIsBossEncounterActive] = useState(false);
  const [activeUpgradeTab, setActiveUpgradeTab] = useState<string>('fabrication');
  const [lootBoxReward, setLootBoxReward] = useState<LootBoxReward | null>(null);
  const [lootBoxOpened, setLootBoxOpened] = useState(false);
  const [lootBoxOpeningPhase, setLootBoxOpeningPhase] = useState<'idle' | 'charging' | 'burst'>('idle');
  const [isLootBoxDialogOpen, setIsLootBoxDialogOpen] = useState(false);
  const [isLootBoxMinimized, setIsLootBoxMinimized] = useState(false);
  const [isCryptoRelicShopOpen, setIsCryptoRelicShopOpen] = useState(false);
  const [isBlackMarketOpen, setIsBlackMarketOpen] = useState(false);
  const [leaderboardEntries, setLeaderboardEntries] = useState<SteamLeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [friendsLeaderboardEntries, setFriendsLeaderboardEntries] = useState<SteamLeaderboardEntry[]>([]);
  const [friendsLeaderboardLoading, setFriendsLeaderboardLoading] = useState(false);
  const [friendsLeaderboardError, setFriendsLeaderboardError] = useState<string | null>(null);
  const [leaderboardMyRank, setLeaderboardMyRank] = useState<number | null>(null);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState<'global' | 'friends'>('global');
  const lastSubmittedAscensionRef = React.useRef<number>(-1);
  const lootBoxOpeningTimeoutsRef = React.useRef<Array<ReturnType<typeof setTimeout>>>([]);
  
    const { 
      resources, upgrades, clickResource, buyUpgrade, sellResource, sellAllResource, playSound, 
      lastUpgradeInfo, setLastUpgradeInfo, getUpgradePreview, addDebugData, addDebugData100k, 
      addDebugCredits, addDebugCrypto, addDebugPrestige, addDebugAscensionCount, setDebugTime, 
      spawnDebugPickup, getTotalCritChance, getInterestRate, getBulkProductionGain, masterVolume, 
      toggleMasterVolume, musicVolume, setMusicVolume, sfxVolume, setSfxVolume, isMusicPlaying, 
      toggleMusic, skipTrack, elapsedTime, floatingPickups, setPickupSpawningPaused, ascend, ascendVictory, ascendDefeat, 
      getPrestigeGain, buyPrestigeUpgrade, onPickupClick, prestigeUpgrades, onCritPickupClick, 
      achievements, stats, newlyUnlockedAchievement, newlyUnlockedAscensionPet, claimAscensionPetUnlock, equipAscensionPetUnlock, claimAchievementReward, claimAllAchievements, 
      unclaimedAchievements, autoClickBoostEndTime, critBoostEndTime, cosmetics, buyCosmetic, 
      buyCryptoRelic, buyBlackMarketUpgrade, equipCosmetic, getActiveSkin, getActiveTheme, getActiveAccessory, getActiveCape, getActiveWing, getActiveHeadStyle, 
      getActivePet, getActiveAscensionPet, getActiveClickEffect, getActiveLootBoxSkin, getActiveMachineBoxSkin, getPetBoosts, getAdjacencyFormationBonus, getDataPerClick, offlineProgress, 
      clearOfflineProgress, contracts, refreshContracts, updateContractProgress, 
      claimContractReward, roomLayout, updateMachinePosition, removeMachinePosition, 
      getMachinePosition, tutorial, startTutorial, skipTutorial, resetTutorial, 
      completeTutorialObjective, getCurrentTutorialPhase, isTutorialComplete, saveGame, 
      resetGame, setFullscreen, setWindowed 
    } = useGame();

  const handleQuit = async () => {
    await saveGame();
    window.close();
    // Fallback if window.close() is blocked (common in browsers)
    setTimeout(() => {
      window.location.href = 'about:blank';
    }, 100);
  };

  // Auto-open right panel on 10th click (only if user hasn't closed it)
  useEffect(() => {
    if (stats.totalClicks >= 10 && !userClosedRightPanel) {
      setRightPanelOpen(true);
    }
  }, [stats.totalClicks, userClosedRightPanel]);

  // Auto-open left panel when player reaches 100 total data
  // or buys the first upgrade from the right panel (if not manually closed).
  useEffect(() => {
    if ((stats.totalDataCollected >= 100 || stats.totalUpgradesPurchased >= 1) && !userClosedLeftPanel) {
      setLeftPanelOpen(true);
    }
  }, [stats.totalDataCollected, stats.totalUpgradesPurchased, userClosedLeftPanel]);

  useEffect(() => {
    setPickupSpawningPaused(isBossEncounterActive);
  }, [isBossEncounterActive, setPickupSpawningPaused]);

  // Handle user closing left panel
  const handleLeftPanelClose = () => {
    setLeftPanelOpen(false);
    setUserClosedLeftPanel(true);
  };

  // Handle user closing right panel
  const handleRightPanelClose = () => {
    setRightPanelOpen(false);
    setUserClosedRightPanel(true);
  };

  const refreshLeaderboard = useCallback(async (
    mode: 'global' | 'friends' = 'global',
    limit: number = LEADERBOARD_PANEL_LIMIT
  ) => {
    const setEntries = mode === 'global' ? setLeaderboardEntries : setFriendsLeaderboardEntries;
    const setLoading = mode === 'global' ? setLeaderboardLoading : setFriendsLeaderboardLoading;
    const setError = mode === 'global' ? setLeaderboardError : setFriendsLeaderboardError;

    if (!isSteamAvailable()) {
      setEntries([]);
      setError('Steam not connected');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await getSteamLeaderboardEntries(MAX_ASCENSION_LEADERBOARD, { limit, mode });
      if (!result.ok) {
        setEntries([]);
        setError(result.reason || `Failed to load ${mode} leaderboard`);
      } else {
        setEntries(result.entries);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshLeaderboard('global', LEADERBOARD_PANEL_LIMIT);
    const intervalId = setInterval(() => {
      void refreshLeaderboard('global', LEADERBOARD_PANEL_LIMIT);
    }, 45000);
    return () => clearInterval(intervalId);
  }, [refreshLeaderboard]);

  useEffect(() => {
    if (!isLeaderboardOpen) return;
    void refreshLeaderboard(leaderboardTab, LEADERBOARD_MODAL_LIMIT);
  }, [isLeaderboardOpen, leaderboardTab, refreshLeaderboard]);

  useEffect(() => {
    if (stats.totalAscensions <= 0) return;
    if (!isSteamAvailable()) return;
    if (stats.totalAscensions <= lastSubmittedAscensionRef.current) return;

    const scoreToSubmit = stats.totalAscensions;
    lastSubmittedAscensionRef.current = scoreToSubmit;

    void (async () => {
      const result = await setSteamLeaderboardScore(MAX_ASCENSION_LEADERBOARD, scoreToSubmit, { keepBest: true });
      if (!result.ok) {
        lastSubmittedAscensionRef.current = scoreToSubmit - 1;
        return;
      }
      if (typeof result.globalRankNew === 'number' && result.globalRankNew > 0) {
        setLeaderboardMyRank(result.globalRankNew);
      }
      await refreshLeaderboard('global', LEADERBOARD_PANEL_LIMIT);
    })();
  }, [refreshLeaderboard, stats.totalAscensions]);

  /* Keyboard shortcut to toggle debug panel (Ctrl+Shift+D) - DISABLED FOR PRODUCTION
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsDebugPanelVisible(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  */

  const ownedSkinsSet = useMemo(() => new Set([...cosmetics.ownedSkins, ...cosmetics.ownedAscensionSkins]), [cosmetics.ownedSkins, cosmetics.ownedAscensionSkins]);
  const ownedThemesSet = useMemo(() => new Set([...cosmetics.ownedThemes, ...cosmetics.ownedAscensionThemes]), [cosmetics.ownedThemes, cosmetics.ownedAscensionThemes]);
  const ownedAccessoriesSet = useMemo(() => new Set([...cosmetics.ownedAccessories, ...cosmetics.ownedAscensionAccessories]), [cosmetics.ownedAccessories, cosmetics.ownedAscensionAccessories]);
  const ownedCapesSet = useMemo(() => new Set(cosmetics.ownedCapes), [cosmetics.ownedCapes]);
  const ownedWingsSet = useMemo(() => new Set(cosmetics.ownedWings), [cosmetics.ownedWings]);
  const ownedHeadStylesSet = useMemo(() => new Set([...cosmetics.ownedHeadStyles, ...cosmetics.ownedAscensionHeadStyles]), [cosmetics.ownedHeadStyles, cosmetics.ownedAscensionHeadStyles]);
  const ownedPetsSet = useMemo(() => new Set(cosmetics.ownedPets), [cosmetics.ownedPets]);
  const ownedClickEffectsSet = useMemo(() => new Set(cosmetics.ownedClickEffects), [cosmetics.ownedClickEffects]);
  const ownedLootBoxSkinsSet = useMemo(() => new Set(cosmetics.ownedLootBoxSkins), [cosmetics.ownedLootBoxSkins]);
  const ownedMachineBoxSkinsSet = useMemo(() => new Set(cosmetics.ownedMachineBoxSkins), [cosmetics.ownedMachineBoxSkins]);
  const ownedAscensionPetsSet = useMemo(() => new Set(cosmetics.ownedAscensionPets), [cosmetics.ownedAscensionPets]);
  const equippedSkin = getActiveSkin();
  const equippedTheme = getActiveTheme();
  const equippedAccessory = getActiveAccessory();
  const equippedCape = getActiveCape();
  const equippedWing = getActiveWing();
  const equippedHeadStyle = getActiveHeadStyle();
  const equippedPet = getActivePet();
  const equippedAscensionPet = getActiveAscensionPet();
  const equippedClickEffect = getActiveClickEffect();
  const equippedLootBoxSkin = getActiveLootBoxSkin();
  const equippedMachineBoxSkin = getActiveMachineBoxSkin();
  const activeLootBoxColors = equippedLootBoxSkin.colors;
  const isCryptoRelicShopUnlocked = stats.totalAscensions >= CRYPTO_RELIC_SHOP_UNLOCK_ASCENSION;
  const isBlackMarketUnlocked = stats.totalAscensions >= BLACK_MARKET_UNLOCK_ASCENSION;
  const adjacencyFormationBonus = getAdjacencyFormationBonus();

  const marketSkins = useMemo(() => CHARACTER_SKINS.filter(item => !item.isRelicShopOnly), []);
  const marketAccessories = useMemo(() => CHARACTER_ACCESSORIES.filter(item => !item.isRelicShopOnly), []);
  const marketHeadStyles = useMemo(() => CHARACTER_HEAD_STYLES.filter(item => !item.isRelicShopOnly), []);

  const relicSlotLabel: Record<'skin' | 'headstyle' | 'accessory' | 'wing', string> = {
    skin: 'Body Relic',
    headstyle: 'Head Relic',
    accessory: 'Accessory Relic',
    wing: 'Wing Relic',
  };

  const isRelicOwned = useCallback((slot: 'skin' | 'headstyle' | 'accessory' | 'wing', cosmeticId: string) => {
    if (slot === 'skin') return ownedSkinsSet.has(cosmeticId);
    if (slot === 'headstyle') return ownedHeadStylesSet.has(cosmeticId);
    if (slot === 'wing') return ownedWingsSet.has(cosmeticId);
    return ownedAccessoriesSet.has(cosmeticId);
  }, [ownedAccessoriesSet, ownedHeadStylesSet, ownedSkinsSet, ownedWingsSet]);

  const isRelicEquipped = useCallback((slot: 'skin' | 'headstyle' | 'accessory' | 'wing', cosmeticId: string) => {
    if (slot === 'skin') return cosmetics.activeSkinId === cosmeticId;
    if (slot === 'headstyle') return cosmetics.activeHeadStyleId === cosmeticId;
    if (slot === 'wing') return cosmetics.activeWingId === cosmeticId;
    return cosmetics.activeAccessoryId === cosmeticId;
  }, [cosmetics.activeAccessoryId, cosmetics.activeHeadStyleId, cosmetics.activeSkinId, cosmetics.activeWingId]);

  const getRelicNodeLevel = useCallback((node: (typeof CRYPTO_RELIC_TREE)[number]) => {
    const savedLevel = cosmetics.cryptoRelicLevels?.[node.id];
    if (typeof savedLevel === 'number' && Number.isFinite(savedLevel) && savedLevel > 0) {
      return Math.floor(savedLevel);
    }
    return isRelicOwned(node.slot, node.cosmeticId) ? 1 : 0;
  }, [cosmetics.cryptoRelicLevels, isRelicOwned]);

  const formatRelicBoostValue = useCallback((value: number) => {
    return Number.isInteger(value) ? `${value}` : value.toFixed(2);
  }, []);

  const relicBoostLines = useCallback((boost: {
    productionBoost?: number;
    clickBoost?: number;
    critBoost?: number;
    cryptoBoost?: number;
    interestBoost?: number;
  }, multiplier: number) => {
    const scaled = {
      productionBoost: (boost.productionBoost || 0) * multiplier,
      clickBoost: (boost.clickBoost || 0) * multiplier,
      critBoost: (boost.critBoost || 0) * multiplier,
      cryptoBoost: (boost.cryptoBoost || 0) * multiplier,
      interestBoost: (boost.interestBoost || 0) * multiplier,
    };

    const lines: string[] = [];
    if (scaled.productionBoost) lines.push(`+${formatRelicBoostValue(scaled.productionBoost)}% Production`);
    if (scaled.clickBoost) lines.push(`+${formatRelicBoostValue(scaled.clickBoost)}% Click`);
    if (scaled.critBoost) lines.push(`+${formatRelicBoostValue(scaled.critBoost)}% Crit`);
    if (scaled.cryptoBoost) lines.push(`+${formatRelicBoostValue(scaled.cryptoBoost)}% Crypto`);
    if (scaled.interestBoost) lines.push(`+${formatRelicBoostValue(scaled.interestBoost)}% Interest`);
    return lines;
  }, [formatRelicBoostValue]);

  const canBuyRelicNode = useCallback((node: (typeof CRYPTO_RELIC_TREE)[number]) => {
    if (!isCryptoRelicShopUnlocked) return false;
    const currentLevel = getRelicNodeLevel(node);
    if (currentLevel >= stats.totalAscensions) return false;
    const nextCost = getCryptoRelicUpgradeCost(node, currentLevel);
    if (resources.crypto.amount < nextCost) return false;
    if (node.requires.length === 0) return true;
    return node.requires.every(reqId => {
      const reqNode = CRYPTO_RELIC_TREE.find(relic => relic.id === reqId);
      if (!reqNode) return false;
      return getRelicNodeLevel(reqNode) > 0;
    });
  }, [getRelicNodeLevel, isCryptoRelicShopUnlocked, resources.crypto.amount, stats.totalAscensions]);

  const machineBoxSkinsForShop = useMemo(() => MACHINE_BOX_SKINS, []);

  const totalClickUpgradeLevels = useMemo(() => (
    upgrades
      .filter(u => u.category === 'click_upgrades')
      .reduce((sum, u) => sum + (u.count || 0), 0)
  ), [upgrades]);

  const cursorGlowTier = useMemo(() => {
    if (totalClickUpgradeLevels >= 120) return 5;
    if (totalClickUpgradeLevels >= 70) return 4;
    if (totalClickUpgradeLevels >= 35) return 3;
    if (totalClickUpgradeLevels >= 12) return 2;
    if (totalClickUpgradeLevels >= 3) return 1;
    return 0;
  }, [totalClickUpgradeLevels]);

  const canBuyMachineBoxSkin = useCallback((skinId: string, price: number) => {
    if (!isCryptoRelicShopUnlocked) return false;
    if (ownedMachineBoxSkinsSet.has(skinId)) return false;
    return resources.crypto.amount >= price;
  }, [isCryptoRelicShopUnlocked, ownedMachineBoxSkinsSet, resources.crypto.amount]);

  const renderRelicGlyph = useCallback((relicId: string) => {
    if (relicId === 'relic_node_body') {
      return (
        <div className="relative mx-auto h-14 w-10">
          <div className="absolute left-1 top-1 h-12 w-8 rounded-[8px] border border-cyan-300/70 bg-gradient-to-b from-cyan-300/35 via-blue-500/35 to-violet-500/35 shadow-[0_0_16px_rgba(34,211,238,0.6)]" />
          <div className="absolute left-3 top-3 h-2 w-4 rounded bg-cyan-100/70" />
        </div>
      );
    }
    if (relicId === 'relic_node_head') {
      return (
        <svg width="54" height="52" viewBox="0 0 54 52" className="mx-auto">
          <defs>
            <linearGradient id="relic-head-glyph-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
          <path d="M8 39 L8 20 L16 26 L27 10 L38 26 L46 20 L46 39 Z" fill="url(#relic-head-glyph-grad)" fillOpacity="0.45" stroke="#facc15" strokeWidth="2" />
          <circle cx="27" cy="17" r="3" fill="#67e8f9" />
          <ellipse cx="27" cy="6.5" rx="13" ry="4" fill="none" stroke="#67e8f9" strokeWidth="1.8" opacity="0.9" />
        </svg>
      );
    }
    return (
      <svg width="64" height="44" viewBox="0 0 64 44" className="mx-auto">
        <defs>
          <linearGradient id="relic-wing-glyph-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="55%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
        </defs>
        <path d="M6 34 Q18 13 30 22 Q23 29 11 38 Z" fill="url(#relic-wing-glyph-grad)" fillOpacity="0.4" stroke="#67e8f9" strokeWidth="1.8" />
        <path d="M58 34 Q46 13 34 22 Q41 29 53 38 Z" fill="url(#relic-wing-glyph-grad)" fillOpacity="0.4" stroke="#67e8f9" strokeWidth="1.8" />
        <path d="M30 22 L20 30 M34 22 L44 30" stroke="#a5f3fc" strokeWidth="1.5" opacity="0.8" />
      </svg>
    );
  }, []);

  const formatPrestigeEffect = useCallback((upgrade: (typeof prestigeUpgrades)[number], level: number): string => {
    if (level <= 0) return 'No bonus yet';

    const totalValue = upgrade.effect.value * level;
    switch (upgrade.effect.type) {
      case 'click_boost':
        return `+${(totalValue * 100).toFixed(0)}% click power`;
      case 'production_boost':
        return `+${(totalValue * 100).toFixed(0)}% production`;
      case 'crit_chance_boost':
        return `+${(totalValue * 100).toFixed(1)}% crit chance`;
      case 'crit_mult_boost':
        return `+${(totalValue * 100).toFixed(0)}% crit damage`;
      case 'luck_boost':
        return `+${(totalValue * 100).toFixed(1)}% pickup chance`;
      case 'pickup_value':
        return `+${(totalValue * 100).toFixed(0)}% pickup value`;
      case 'prestige_mult':
        return `+${(totalValue * 100).toFixed(0)}% prestige gain`;
      case 'offline_boost':
        return `+${(totalValue * 100).toFixed(0)}% offline earnings`;
      case 'offline_time': {
        const totalMinutes = Math.round(totalValue / 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return minutes === 0
          ? `+${hours}h max offline time`
          : `+${hours}h ${minutes}m max offline time`;
      }
      case 'crypto_boost':
        return `+${(totalValue * 100).toFixed(0)}% crypto production`;
      case 'sell_boost':
        return `+${(totalValue * 100).toFixed(0)}% data conversion`;
      case 'starting_bonus':
        return `+${formatNumber(Math.floor(totalValue))} starting data`;
      case 'interest_boost':
        return `+${(totalValue * 100).toFixed(1)}% max interest`;
      case 'cost_reduction':
        return `-${(totalValue * 100).toFixed(0)}% upgrade cost`;
      case 'checkpoint_speed':
        return `+${(totalValue * 100).toFixed(0)}% checkpoint speed`;
      default:
        return upgrade.description;
    }
  }, []);

  const prestigeShopSummary = useMemo(() => {
    const totalLevels = prestigeUpgrades.reduce((sum, upgrade) => sum + upgrade.count, 0);
    const maxedUpgrades = prestigeUpgrades.filter(upgrade => upgrade.count >= upgrade.maxLevel).length;
    const affordableUpgrades = prestigeUpgrades.filter(upgrade => {
      if (upgrade.count >= upgrade.maxLevel) return false;
      const currentCost = Math.floor(upgrade.cost * Math.pow(upgrade.costMultiplier, upgrade.count));
      return resources.prestige.amount >= currentCost;
    }).length;

    return { totalLevels, maxedUpgrades, affordableUpgrades };
  }, [prestigeUpgrades, resources.prestige.amount]);

  const lootTypeLabel: Record<'skin' | 'theme' | 'accessory' | 'headstyle' | 'pet' | 'clickeffect' | 'boxskin' | 'machineboxskin', string> = {
    skin: 'Character Skin',
    theme: 'Room Theme',
    accessory: 'Accessory',
    headstyle: 'Head Style',
    pet: 'Pet',
    clickeffect: 'Click Effect',
    boxskin: 'Loot Box Skin',
    machineboxskin: 'Miner Skin',
  };

  const lootEquipTypeMap: Record<
    'skin' | 'theme' | 'accessory' | 'headstyle' | 'pet' | 'clickeffect' | 'boxskin' | 'machineboxskin',
    'skin' | 'theme' | 'accessory' | 'headstyle' | 'pet' | 'clickeffect' | 'lootboxskin' | 'machineboxskin'
  > = {
    skin: 'skin',
    theme: 'theme',
    accessory: 'accessory',
    headstyle: 'headstyle',
    pet: 'pet',
    clickeffect: 'clickeffect',
    boxskin: 'lootboxskin',
    machineboxskin: 'machineboxskin',
  };

  const lootRarityClass: Record<'common' | 'uncommon' | 'rare' | 'epic' | 'legendary', string> = {
    common: 'text-slate-300 border-slate-500/40 bg-slate-500/10',
    uncommon: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
    rare: 'text-cyan-300 border-cyan-500/50 bg-cyan-500/10',
    epic: 'text-fuchsia-300 border-fuchsia-500/50 bg-fuchsia-500/10',
    legendary: 'text-amber-300 border-amber-500/60 bg-amber-500/10',
  };

  type LootBoostInfo = {
    productionBoost?: number;
    clickBoost?: number;
    critBoost?: number;
    cryptoBoost?: number;
    interestBoost?: number;
    luckBoost?: number;
  };

  const formatLootBoostValue = useCallback((value: number) => {
    return Number.isInteger(value) ? `${value}` : value.toFixed(1);
  }, []);

  const getLootBoostLines = useCallback((boost?: LootBoostInfo) => {
    if (!boost) return [] as string[];
    const lines: string[] = [];
    if (boost.productionBoost) lines.push(`+${formatLootBoostValue(boost.productionBoost)}% Production`);
    if (boost.clickBoost) lines.push(`+${formatLootBoostValue(boost.clickBoost)}% Click Power`);
    if (boost.critBoost) lines.push(`+${formatLootBoostValue(boost.critBoost)}% Crit Chance`);
    if (boost.cryptoBoost) lines.push(`+${formatLootBoostValue(boost.cryptoBoost)}% Crypto Rate`);
    if (boost.interestBoost) lines.push(`+${formatLootBoostValue(boost.interestBoost)}% Max Interest`);
    if (boost.luckBoost) lines.push(`+${formatLootBoostValue(boost.luckBoost)}% Loot Luck`);
    return lines;
  }, [formatLootBoostValue]);

  const getLootRevealSound = useCallback((rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary') => {
    if (rarity === 'legendary') return 'loot_reveal_legendary';
    if (rarity === 'epic') return 'loot_reveal_epic';
    return 'loot_reveal_rare';
  }, []);

  const clearLootBoxOpeningSequence = useCallback(() => {
    lootBoxOpeningTimeoutsRef.current.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    lootBoxOpeningTimeoutsRef.current = [];
  }, []);

  const handleOpenLootBox = useCallback(() => {
    if (!lootBoxReward || lootBoxOpened || lootBoxOpeningPhase !== 'idle') return;
    clearLootBoxOpeningSequence();

    const revealSound = lootBoxReward.kind === 'cosmetic'
      ? getLootRevealSound(lootBoxReward.rarity)
      : 'loot_reveal_fallback';

    setLootBoxOpeningPhase('charging');
    playSound('loot_open');

    const prePulseId = setTimeout(() => {
      playSound('loot_open');
    }, 260);

    const burstId = setTimeout(() => {
      setLootBoxOpeningPhase('burst');
      playSound(revealSound);
    }, 980);

    const revealId = setTimeout(() => {
      setLootBoxOpened(true);
      setLootBoxOpeningPhase('idle');
      clearLootBoxOpeningSequence();
    }, 1460);

    lootBoxOpeningTimeoutsRef.current.push(prePulseId, burstId, revealId);
  }, [clearLootBoxOpeningSequence, getLootRevealSound, lootBoxOpened, lootBoxOpeningPhase, lootBoxReward, playSound]);

  const reopenLootBoxDialog = useCallback(() => {
    if (!lootBoxReward) return;
    setIsLootBoxDialogOpen(true);
    setIsLootBoxMinimized(false);
  }, [lootBoxReward]);

  const handleEquipLootReward = useCallback(() => {
    if (!lootBoxReward || lootBoxReward.kind !== 'cosmetic') return false;
    const equipType = lootEquipTypeMap[lootBoxReward.cosmeticType];
    return equipCosmetic(equipType, lootBoxReward.itemId);
  }, [equipCosmetic, lootBoxReward, lootEquipTypeMap]);

  const isLootRewardEquipped = useMemo(() => {
    if (!lootBoxReward || lootBoxReward.kind !== 'cosmetic') return false;
    const { cosmeticType, itemId } = lootBoxReward;
    if (cosmeticType === 'skin') return cosmetics.activeSkinId === itemId;
    if (cosmeticType === 'theme') return cosmetics.activeThemeId === itemId;
    if (cosmeticType === 'accessory') return cosmetics.activeAccessoryId === itemId;
    if (cosmeticType === 'headstyle') return cosmetics.activeHeadStyleId === itemId;
    if (cosmeticType === 'pet') return cosmetics.activePetId === itemId;
    if (cosmeticType === 'clickeffect') return cosmetics.activeClickEffectId === itemId;
    if (cosmeticType === 'boxskin') return cosmetics.activeLootBoxSkinId === itemId;
    if (cosmeticType === 'machineboxskin') return cosmetics.activeMachineBoxSkinId === itemId;
    return false;
  }, [
    lootBoxReward,
    cosmetics.activeSkinId,
    cosmetics.activeThemeId,
    cosmetics.activeAccessoryId,
    cosmetics.activeHeadStyleId,
    cosmetics.activePetId,
    cosmetics.activeClickEffectId,
    cosmetics.activeLootBoxSkinId,
    cosmetics.activeMachineBoxSkinId,
  ]);

  useEffect(() => {
    return () => {
      clearLootBoxOpeningSequence();
    };
  }, [clearLootBoxOpeningSequence]);

  const isLootBoxOpening = lootBoxOpeningPhase !== 'idle';
  const isLootBoxCharging = lootBoxOpeningPhase === 'charging';
  const isLootBoxBursting = lootBoxOpeningPhase === 'burst';

  const lootRewardDetails = useMemo(() => {
    if (!lootBoxReward || lootBoxReward.kind !== 'cosmetic') return null;

    const defaultSkinPalette = CHARACTER_SKINS[0]?.palette;
    const characterPreviewWrap = (child: React.ReactNode) => (
      <div className="relative flex h-[132px] items-center justify-center overflow-hidden rounded-md border border-cyan-500/35 bg-slate-950/70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(56,189,248,0.18),rgba(15,23,42,0.04)_70%)]" />
        {child}
      </div>
    );

    if (lootBoxReward.cosmeticType === 'skin') {
      const skin = CHARACTER_SKINS.find(s => s.id === lootBoxReward.itemId) || ASCENSION_SKINS.find(s => s.id === lootBoxReward.itemId);
      if (!skin || !defaultSkinPalette) return null;
      return {
        description: skin.description,
        boostLines: getLootBoostLines(skin.boost),
        preview: characterPreviewWrap(
          <div className="relative z-10 scale-[2.1]">
            <CSSCharacter skinPalette={skin.palette} accessoryId="none" headStyleId="default" />
          </div>
        ),
      };
    }

    if (lootBoxReward.cosmeticType === 'accessory') {
      const accessory = CHARACTER_ACCESSORIES.find(a => a.id === lootBoxReward.itemId) || ASCENSION_ACCESSORIES.find(a => a.id === lootBoxReward.itemId);
      if (!accessory || !defaultSkinPalette) return null;
      return {
        description: accessory.description,
        boostLines: getLootBoostLines(accessory.boost),
        preview: characterPreviewWrap(
          <div className="relative z-10 scale-[2.1]">
            <CSSCharacter skinPalette={defaultSkinPalette} accessoryId={accessory.id} headStyleId="default" />
          </div>
        ),
      };
    }

    if (lootBoxReward.cosmeticType === 'headstyle') {
      const head = CHARACTER_HEAD_STYLES.find(h => h.id === lootBoxReward.itemId) || ASCENSION_HEAD_STYLES.find(h => h.id === lootBoxReward.itemId);
      if (!head || !defaultSkinPalette) return null;
      return {
        description: head.description,
        boostLines: getLootBoostLines(head.boost),
        preview: characterPreviewWrap(
          <div className="relative z-10 scale-[2.1]">
            <CSSCharacter skinPalette={defaultSkinPalette} accessoryId="none" headStyleId={head.id} />
          </div>
        ),
      };
    }

    if (lootBoxReward.cosmeticType === 'theme') {
      const theme = ROOM_THEMES.find(t => t.id === lootBoxReward.itemId) || ASCENSION_ROOM_THEMES.find(t => t.id === lootBoxReward.itemId);
      if (!theme) return null;
      return {
        description: theme.description,
        boostLines: getLootBoostLines(theme.boost),
        preview: (
          <div className="relative h-[132px] overflow-hidden rounded-md border border-cyan-500/35">
            <div className="absolute inset-0" style={{ background: theme.colors.background }} />
            <div className="absolute left-2 top-2 h-14 w-14 rounded-full blur-2xl" style={{ background: theme.colors.nebula1 }} />
            <div className="absolute bottom-1 right-2 h-10 w-10 rounded-full blur-xl" style={{ background: theme.colors.nebula2 }} />
            <div className="absolute bottom-0 left-0 right-0 h-11">
              <div className="absolute inset-0 bg-gradient-to-r" style={{ backgroundImage: `linear-gradient(90deg, ${theme.colors.floorLight} 0%, ${theme.colors.floorDark} 50%, ${theme.colors.floorLight} 100%)` }} />
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `linear-gradient(to right, ${theme.colors.gridBorder} 1px, transparent 1px), linear-gradient(to top, ${theme.colors.gridBorder} 1px, transparent 1px)`,
                  backgroundSize: '16px 16px',
                  opacity: 0.75,
                }}
              />
            </div>
          </div>
        ),
      };
    }

    if (lootBoxReward.cosmeticType === 'pet') {
      const pet = CHARACTER_PETS.find(p => p.id === lootBoxReward.itemId) || ASCENSION_PETS.find(p => p.id === lootBoxReward.itemId);
      if (!pet) return null;
      return {
        description: pet.description,
        boostLines: getLootBoostLines(pet.boost),
        preview: (
          <div className="relative flex h-[132px] items-center justify-center overflow-hidden rounded-md border border-cyan-500/35 bg-slate-950/70">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(167,139,250,0.22),rgba(15,23,42,0.04)_68%)]" />
            <motion.div
              className="relative z-10 h-20 w-20 rounded-full border border-fuchsia-300/60 bg-gradient-to-br from-fuchsia-400/50 via-cyan-300/40 to-violet-500/50 shadow-[0_0_20px_rgba(168,85,247,0.45)]"
              animate={{ y: [0, -4, 0], scale: [1, 1.03, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-900/85 shadow-[0_0_12px_rgba(34,211,238,0.6)]" />
            </motion.div>
          </div>
        ),
      };
    }

    if (lootBoxReward.cosmeticType === 'boxskin') {
      const boxSkin = LOOT_BOX_SKINS.find(skin => skin.id === lootBoxReward.itemId);
      if (!boxSkin) return null;
      return {
        description: boxSkin.description,
        boostLines: getLootBoostLines({ luckBoost: boxSkin.luckBonus }),
        preview: (
          <div className="relative flex h-[132px] items-center justify-center overflow-hidden rounded-md border border-cyan-500/35 bg-slate-950/70 [perspective:900px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(34,211,238,0.2),rgba(15,23,42,0.06)_70%)]" />
            <motion.div
              className="relative h-[82px] w-[104px] [transform-style:preserve-3d]"
              animate={{ rotateY: [0, 8, -8, 0], y: [0, -2, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div
                className="absolute inset-0 rounded-lg border shadow-[0_10px_22px_rgba(0,0,0,0.45)] [transform:translateZ(10px)]"
                style={{
                  borderColor: boxSkin.colors.accent,
                  background: `linear-gradient(180deg, ${boxSkin.colors.bodyFrom} 0%, ${boxSkin.colors.bodyVia} 55%, ${boxSkin.colors.bodyTo} 100%)`,
                  boxShadow: `0 0 18px ${boxSkin.colors.glow}`,
                }}
              />
              <div
                className="absolute left-1 top-2 h-[62px] w-4 rounded border [transform:rotateY(-68deg)_translateZ(4px)]"
                style={{ borderColor: boxSkin.colors.accent, background: boxSkin.colors.sideLeft }}
              />
              <div
                className="absolute right-1 top-2 h-[62px] w-4 rounded border [transform:rotateY(68deg)_translateZ(4px)]"
                style={{ borderColor: boxSkin.colors.accent, background: boxSkin.colors.sideRight }}
              />
              <div
                className="absolute left-1/2 top-1 h-8 w-[90px] -translate-x-1/2 rounded-lg border [transform:rotateX(68deg)_translateZ(12px)]"
                style={{
                  borderColor: boxSkin.colors.accent,
                  background: `linear-gradient(180deg, ${boxSkin.colors.topFrom} 0%, ${boxSkin.colors.topTo} 100%)`,
                }}
              />
              <div className="absolute left-1/2 top-9 h-10 w-[3px] -translate-x-1/2 rounded-full [transform:translateZ(12px)]" style={{ background: boxSkin.colors.core }} />
            </motion.div>
          </div>
        ),
      };
    }

    if (lootBoxReward.cosmeticType === 'machineboxskin') {
      const machineSkin = MACHINE_BOX_SKINS.find(skin => skin.id === lootBoxReward.itemId);
      if (!machineSkin) return null;
      return {
        description: machineSkin.description,
        boostLines: getLootBoostLines({ luckBoost: machineSkin.luckBonus }),
        preview: (
          <div className="relative flex h-[132px] items-center justify-center overflow-hidden rounded-md border border-cyan-500/35 bg-slate-950/70 [perspective:900px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(34,211,238,0.18),rgba(15,23,42,0.06)_70%)]" />
            <motion.div
              className="relative h-[86px] w-[110px] [transform-style:preserve-3d]"
              animate={{ rotateY: [0, 8, -8, 0], y: [0, -2, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div
                className="absolute inset-0 rounded-lg border [transform:translateZ(10px)]"
                style={{
                  borderColor: machineSkin.colors.primary,
                  background: `linear-gradient(180deg, ${machineSkin.colors.primary}22 0%, ${machineSkin.colors.secondary}55 65%, rgba(2,6,23,0.95) 100%)`,
                  boxShadow: `0 0 16px ${machineSkin.colors.glow}`,
                }}
              />
              <div className="absolute left-1 top-2 h-[64px] w-4 rounded border [transform:rotateY(-66deg)_translateZ(5px)]" style={{ borderColor: machineSkin.colors.primary, background: `${machineSkin.colors.primary}77` }} />
              <div className="absolute right-1 top-2 h-[64px] w-4 rounded border [transform:rotateY(66deg)_translateZ(5px)]" style={{ borderColor: machineSkin.colors.primary, background: `${machineSkin.colors.secondary}77` }} />
              <div className="absolute left-1/2 top-1 h-8 w-[94px] -translate-x-1/2 rounded border [transform:rotateX(68deg)_translateZ(12px)]" style={{ borderColor: machineSkin.colors.primary, background: `${machineSkin.colors.secondary}66` }} />
            </motion.div>
          </div>
        ),
      };
    }

    const effect = CLICK_EFFECTS.find(e => e.id === lootBoxReward.itemId);
    if (!effect) return null;
    return {
      description: effect.description,
      boostLines: getLootBoostLines(effect.boost),
      preview: (
        <div className="relative flex h-[132px] items-center justify-center overflow-hidden rounded-md border border-cyan-500/35 bg-slate-950/70">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(236,72,153,0.22),rgba(15,23,42,0.04)_70%)]" />
          <motion.div
            className="absolute h-16 w-16 rounded-full border-2 border-fuchsia-300/70"
            animate={{ scale: [0.8, 1.15], opacity: [0.85, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute h-10 w-10 rounded-full border-2 border-cyan-300/70"
            animate={{ scale: [0.7, 1.35], opacity: [0.9, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut', delay: 0.35 }}
          />
          <Sparkles className="relative z-10 h-10 w-10 text-amber-200 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]" />
        </div>
      ),
    };
  }, [getLootBoostLines, lootBoxReward]);

  // Compute current tutorial highlight hint based on active objectives
  const tutorialHighlight = useMemo(() => {
    if (tutorial.skipped || isTutorialComplete) return null;
    const currentPhase = getCurrentTutorialPhase();
    if (!currentPhase) return null;
    
    // Find first incomplete objective
    const activeObjective = currentPhase.objectives.find(obj => !obj.completed);
    if (!activeObjective) return null;
    
    // Map objectives to UI element hints
    const highlightMap: Record<string, string> = {
      'click_core': 'core',
      'right_click_core': 'core_right',
      'camera_zoom': 'camera_zoom',
      'camera_pan': 'camera_pan',
      'buy_first_upgrade': 'upgrades',
      'convert_data': 'sell_button',
      'view_prestige': 'prestige_button',
      'open_cosmetics': 'cosmetics_button',
      'open_ascend': 'ascend_button',
    };
    
    const hint = highlightMap[activeObjective.id];
    if (hint) return hint;

    // Fallbacks: our tutorial objectives/ids can evolve; keep highlights working by matching phase/objective text.
    const phaseLabel = String((currentPhase as any).title || (currentPhase as any).name || (currentPhase as any).id || '').toLowerCase();
    const objLabel = String((activeObjective as any).title || (activeObjective as any).text || (activeObjective as any).description || '').toLowerCase();

    if (phaseLabel.includes('conversion') || objLabel.includes('convert') || objLabel.includes('credit') || objLabel.includes('node')) return 'sell_button';
    if (objLabel.includes('right-click') || objLabel.includes('right click')) return 'core_right';
    if (objLabel.includes('zoom')) return 'camera_zoom';
    if (objLabel.includes('middle mouse') || objLabel.includes('drag') || objLabel.includes('camera')) return 'camera_pan';
    if (phaseLabel.includes('cosmetic') || objLabel.includes('cosmetic')) return 'cosmetics_button';
    if (phaseLabel.includes('ascension') || objLabel.includes('ascend')) return 'ascend_button';

    return null;
  }, [tutorial, isTutorialComplete, getCurrentTutorialPhase]);

  // Find the first affordable upgrade for bulk buying
  const getAffordableUpgrade = (quantity: number) => {
    return upgrades.find(u => {
      let totalCost: Record<string, number> = {};
      for (const [res, amount] of Object.entries(u.baseCost)) {
        let cost = 0;
        for (let i = 0; i < quantity; i++) {
          cost += Math.floor((amount as number) * Math.pow(u.costMultiplier, u.count + i));
        }
        totalCost[res] = cost;
      }
      const canAfford = Object.entries(totalCost).every(([res, cost]) => 
        resources[res as ResourceType]?.amount >= cost
      );
      return canAfford;
    });
  };

  const handleBulkBuy = (multiplier: number) => {
    setSelectedBulkOption(multiplier as 1 | 10 | 100);
    const upgrade = getAffordableUpgrade(multiplier);
    if (upgrade) {
      buyUpgrade(upgrade.id, multiplier);
    }
  };

  const getCostDisplay = (multiplier: number): string => {
    const upgrade = getAffordableUpgrade(multiplier);
    if (!upgrade) return 'Cannot afford';
    
    let totalCost: Record<string, number> = {};
    for (const [res, amount] of Object.entries(upgrade.baseCost)) {
      let cost = 0;
      for (let i = 0; i < multiplier; i++) {
        cost += Math.floor((amount as number) * Math.pow(upgrade.costMultiplier, upgrade.count + i));
      }
      totalCost[res] = cost;
    }
    
    const costs = Object.entries(totalCost).map(([res, cost]) => `${cost.toLocaleString()} ${res}`).join(' + ');
    return costs;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePickupClick = (pickup: any) => {
    onPickupClick(pickup);
    setPickupCollected(true);
  };

  const handleCritPickupClick = () => {
    setPickupCollected(true);
  };

  // Wrapped clickResource to track tutorial
  const handleCoreClick = useCallback((resource: ResourceType, meta?: { timestamp?: number; source?: 'manual' | 'autoclick' }) => {
    const result = clickResource(resource, undefined, undefined, meta);
    if (!tutorial.skipped && !isTutorialComplete) {
      completeTutorialObjective('click_core');
    }
    return result;
  }, [clickResource, tutorial.skipped, isTutorialComplete, completeTutorialObjective]);

  const handleCoreRightClick = useCallback(() => {
    if (!tutorial.skipped && !isTutorialComplete) {
      completeTutorialObjective('right_click_core');
    }
  }, [tutorial.skipped, isTutorialComplete, completeTutorialObjective]);

  const handleTutorialCameraZoom = useCallback(() => {
    if (!tutorial.skipped && !isTutorialComplete) {
      completeTutorialObjective('camera_zoom');
    }
  }, [tutorial.skipped, isTutorialComplete, completeTutorialObjective]);

  const handleTutorialCameraPan = useCallback(() => {
    if (!tutorial.skipped && !isTutorialComplete) {
      completeTutorialObjective('camera_pan');
    }
  }, [tutorial.skipped, isTutorialComplete, completeTutorialObjective]);

  // Wrapped sellResource to track tutorial
  const handleSellResource = useCallback((from: ResourceType, amount: number) => {
    sellResource(from, amount);
    if (!tutorial.skipped && !isTutorialComplete && from === 'data') {
      completeTutorialObjective('convert_data');
    }
  }, [sellResource, tutorial.skipped, isTutorialComplete, completeTutorialObjective]);

  // Wrapped sellAllResource to track tutorial when using ALL convert button
  const handleSellAllResource = useCallback((type: ResourceType) => {
    sellAllResource(type);
    if (!tutorial.skipped && !isTutorialComplete && type === 'data') {
      completeTutorialObjective('convert_data');
    }
  }, [sellAllResource, tutorial.skipped, isTutorialComplete, completeTutorialObjective]);

  const handleAscendTutorialStep = useCallback(() => {
    if (!tutorial.skipped && !isTutorialComplete) {
      completeTutorialObjective('open_ascend');
    }
  }, [tutorial.skipped, isTutorialComplete, completeTutorialObjective]);

  // Wrapped claimContractReward to track tutorial
  const handleClaimContract = useCallback((contractId: string) => {
    claimContractReward(contractId);
  }, [claimContractReward]);

  useEffect(() => {
    if (newlyUnlockedAchievement) {
      setAchievementUnlocked(true);
    }
  }, [newlyUnlockedAchievement]);

  // Tutorial objective tracking
  useEffect(() => {
    if (tutorial.skipped || isTutorialComplete) return;

    // Phase 1: buy_first_upgrade
    const totalUpgrades = upgrades.reduce((sum, u) => sum + u.count, 0);
    if (totalUpgrades > 0) {
      completeTutorialObjective('buy_first_upgrade');
    }
  }, [upgrades, tutorial.skipped, isTutorialComplete, completeTutorialObjective]);

  // Track prestige menu open for tutorial
  useEffect(() => {
    if (isPrestigeOpen && !tutorial.skipped && !isTutorialComplete) {
      completeTutorialObjective('view_prestige');
    }
  }, [isPrestigeOpen, tutorial.skipped, isTutorialComplete, completeTutorialObjective]);

  // Track cosmetics market open for tutorial
  useEffect(() => {
    if (isCosmeticsOpen && !tutorial.skipped && !isTutorialComplete) {
      completeTutorialObjective('open_cosmetics');
    }
  }, [isCosmeticsOpen, tutorial.skipped, isTutorialComplete, completeTutorialObjective]);

  // Esc toggles the settings modal (open/close).
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.repeat) return;

      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
      }

      // If another modal is open, let that modal handle Esc instead.
      if (!isSettingsOpen && (isPrestigeOpen || isAchievementsOpen || isStatsOpen || isCosmeticsOpen || isCryptoRelicShopOpen || isBlackMarketOpen || isBossEncounterActive)) {
        return;
      }

      e.preventDefault();
      setIsSettingsOpen(prev => !prev);
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isSettingsOpen, isPrestigeOpen, isAchievementsOpen, isStatsOpen, isCosmeticsOpen, isCryptoRelicShopOpen, isBlackMarketOpen, isBossEncounterActive]);

  return (
    <div className={`h-screen w-screen bg-background flex overflow-hidden text-foreground selection:bg-primary/30 relative cyberpunk-cursor cyberpunk-cursor--glow-${cursorGlowTier}`}>


      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        masterVolume={masterVolume}
        onMasterVolumeToggle={toggleMasterVolume}
        musicVolume={musicVolume}
        onMusicVolumeChange={setMusicVolume}
        sfxVolume={sfxVolume}
        onSfxVolumeChange={setSfxVolume}
        isMusicPlaying={isMusicPlaying}
        onToggleMusic={toggleMusic}
        onSkipTrack={skipTrack}
        onQuit={handleQuit}
        tutorialComplete={isTutorialComplete}
        tutorialSkipped={tutorial.skipped}
        onSkipTutorial={skipTutorial}
        onResetTutorial={resetTutorial}
        onSetFullscreen={setFullscreen}
        onSetWindowed={setWindowed}
      />

      {/* Prestige Shop Modal - Controlled by ResourcePanel */}
      <Dialog open={isPrestigeOpen} onOpenChange={setIsPrestigeOpen}>
        <DialogContent className="max-w-2xl bg-card/95 border-cyan-500/30 z-[50]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-display text-cyan-400">
              <Crown className="w-5 h-5" /> Prestige Realm
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded p-3 sticky top-0 z-10 backdrop-blur-sm">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-cyan-300/70">Balance</p>
                  <p className="text-sm font-bold text-cyan-100">{Math.floor(resources.prestige.amount)}P</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-cyan-300/70">Affordable</p>
                  <p className="text-sm font-bold text-emerald-300">{prestigeShopSummary.affordableUpgrades}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-cyan-300/70">Maxed</p>
                  <p className="text-sm font-bold text-amber-300">{prestigeShopSummary.maxedUpgrades}/{prestigeUpgrades.length}</p>
                </div>
              </div>
              <p className="text-[11px] text-cyan-200/80 mt-2">
                Total purchased levels: <span className="font-semibold text-cyan-100">{prestigeShopSummary.totalLevels}</span>
              </p>
            </div>
            {prestigeUpgrades.map(upgrade => {
              const currentCost = Math.floor(upgrade.cost * Math.pow(upgrade.costMultiplier, upgrade.count));
              const isMaxed = upgrade.count >= upgrade.maxLevel;
              const canAfford = !isMaxed && resources.prestige.amount >= currentCost;
              return (
                <motion.div
                  key={upgrade.id}
                  whileHover={!isMaxed ? { scale: 1.01 } : undefined}
                  className={`border rounded-lg p-3 transition-all ${
                    isMaxed 
                      ? 'border-emerald-500/40 bg-emerald-500/10 cursor-default' 
                      : canAfford 
                        ? 'border-yellow-500/40 bg-yellow-500/5 hover:bg-yellow-500/10 cursor-pointer' 
                        : 'border-muted/30 bg-muted/5 opacity-60 cursor-not-allowed'
                  }`}
                  onClick={() => canAfford && buyPrestigeUpgrade(upgrade.id)}
                  data-testid={`prestige-upgrade-${upgrade.id}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`font-bold ${isMaxed ? 'text-emerald-400' : 'text-yellow-400'}`}>{upgrade.name}</p>
                        {isMaxed && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono">MAXED</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{upgrade.description}</p>
                      <p className="text-[11px] text-cyan-200/80 mt-1">
                        Current: <span className="font-medium text-cyan-100">{formatPrestigeEffect(upgrade, upgrade.count)}</span>
                      </p>
                      {!isMaxed && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Next: {formatPrestigeEffect(upgrade, upgrade.count + 1)}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 bg-muted/20 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full transition-all ${isMaxed ? 'bg-emerald-500' : 'bg-yellow-500'}`}
                            style={{ width: `${(upgrade.count / upgrade.maxLevel) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {upgrade.count}/{upgrade.maxLevel}
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      {isMaxed ? (
                        <p className="font-mono text-sm text-emerald-400">Complete</p>
                      ) : (
                        <p className={`font-mono font-bold text-sm ${canAfford ? 'text-yellow-300' : 'text-muted-foreground'}`}>
                          {currentCost}p
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Crypto Relic Shop Modal */}
      <Dialog open={isCryptoRelicShopOpen} onOpenChange={setIsCryptoRelicShopOpen}>
        <DialogContent className="max-w-3xl bg-card/95 border-red-500/30 z-[52]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-display text-red-300">
              <Cpu className="w-5 h-5" /> Crypto Relic Forge
            </DialogTitle>
          </DialogHeader>
          {!isCryptoRelicShopUnlocked ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-200">
              Unlocks at <span className="font-semibold">Ascension {CRYPTO_RELIC_SHOP_UNLOCK_ASCENSION}</span>.
              <div className="mt-1 text-xs text-red-200/80">
                Current progress: {stats.totalAscensions}/{CRYPTO_RELIC_SHOP_UNLOCK_ASCENSION}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border border-red-500/25 bg-red-500/5 p-3 text-xs text-red-100/85">
                Spend Crypto to unlock relic nodes in order, then keep upgrading them. Relic level scales linearly and each node can be upgraded up to your current Ascension level.
              </div>
              <div className="grid grid-cols-1 gap-3">
                {CRYPTO_RELIC_TREE.map((node, index) => {
                  const level = getRelicNodeLevel(node);
                  const unlocked = level > 0;
                  const equipped = unlocked && isRelicEquipped(node.slot, node.cosmeticId);
                  const canBuy = canBuyRelicNode(node);
                  const ascensionCap = Math.max(0, stats.totalAscensions);
                  const isCapped = level >= ascensionCap;
                  const nextCost = getCryptoRelicUpgradeCost(node, level);
                  const missingRequirements = node.requires.filter(reqId => {
                    const req = CRYPTO_RELIC_TREE.find(r => r.id === reqId);
                    if (!req) return true;
                    return getRelicNodeLevel(req) <= 0;
                  });
                  const perLevelLines = relicBoostLines(node.perLevelBoost, 1);
                  const totalLines = relicBoostLines(node.perLevelBoost, level);
                  const nextLevelLines = relicBoostLines(node.perLevelBoost, level + 1);

                  return (
                    <div key={node.id} className="relative">
                      {index > 0 && <div className="absolute -top-3 left-1/2 h-3 w-px -translate-x-1/2 bg-red-400/40" />}
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        className={`rounded-lg border p-3 ${
                          unlocked ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-red-500/35 bg-red-500/5'
                        }`}
                      >
                        <div className="grid grid-cols-[96px_minmax(0,1fr)_140px] gap-3 items-center">
                          <div className="rounded-md border border-red-400/25 bg-slate-950/70 py-2">
                            {renderRelicGlyph(node.id)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-red-100">{node.name}</p>
                            <p className="text-xs text-red-100/70">{node.description}</p>
                            <p className="mt-1 text-[11px] text-cyan-200/80">{relicSlotLabel[node.slot]}</p>
                            <div className="mt-1 text-[11px] text-slate-300">
                              Level {level}/{ascensionCap}
                            </div>
                            <div className="mt-1 text-[11px] text-slate-300">
                              Per Level: {perLevelLines.length ? perLevelLines.join(' | ') : 'No stat bonus'}
                            </div>
                            <div className="mt-1 text-[11px] text-emerald-200/90">
                              Total: {totalLines.length ? totalLines.join(' | ') : 'No active bonus'}
                            </div>
                            {missingRequirements.length > 0 && (
                              <p className="mt-1 text-[11px] text-amber-300">Locked by previous relic node.</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            {unlocked ? (
                              <>
                                <div className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-center text-xs text-emerald-200">
                                  Lv. {level} / {ascensionCap}
                                </div>
                                {isCapped ? (
                                  <div className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-center text-xs text-amber-200">
                                    Ascension Cap
                                  </div>
                                ) : (
                                  <Button
                                    onClick={() => buyCryptoRelic(node.id)}
                                    disabled={!canBuy}
                                    className="w-full h-8 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-400 text-xs"
                                  >
                                    Upgrade Lv.{level + 1}
                                  </Button>
                                )}
                                {!isCapped && (
                                  <div className="rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-center text-[10px] text-red-200/90">
                                    {formatNumber(nextCost)} Crypto
                                  </div>
                                )}
                                {equipped ? (
                                  <div className="rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-center text-xs text-cyan-200">
                                    Equipped
                                  </div>
                                ) : (
                                  <Button
                                    onClick={() => equipCosmetic(node.slot, node.cosmeticId)}
                                    className="w-full h-8 bg-cyan-600 hover:bg-cyan-500 text-xs"
                                  >
                                    Equip Visual
                                  </Button>
                                )}
                              </>
                            ) : (
                              <>
                                <div className="rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-center text-xs text-red-200">
                                  {formatNumber(nextCost)} Crypto
                                </div>
                                <Button
                                  onClick={() => buyCryptoRelic(node.id)}
                                  disabled={!canBuy}
                                  className="w-full h-8 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-400 text-xs"
                                >
                                  Unlock Lv.1
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        {unlocked && !isCapped && (
                          <div className="mt-2 rounded border border-cyan-500/25 bg-cyan-500/5 px-2 py-1 text-[10px] text-cyan-200/85">
                            Next total at Lv.{level + 1}: {nextLevelLines.length ? nextLevelLines.join(' | ') : 'No stat change'}
                          </div>
                        )}
                      </motion.div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2">
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-cyan-300" />
                  <p className="text-sm font-semibold text-cyan-200">Mine Skins</p>
                  <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-200/80">Crypto Shop + Loot Box</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {machineBoxSkinsForShop.map((skin) => {
                    const owned = ownedMachineBoxSkinsSet.has(skin.id);
                    const equipped = cosmetics.activeMachineBoxSkinId === skin.id;
                    const canBuy = canBuyMachineBoxSkin(skin.id, skin.price);
                    return (
                      <motion.div
                        key={skin.id}
                        whileHover={{ scale: 1.01 }}
                        className={`rounded-lg border p-3 ${
                          equipped
                            ? 'border-cyan-400/60 bg-cyan-500/10'
                            : owned
                              ? 'border-emerald-500/40 bg-emerald-500/10'
                              : 'border-slate-500/35 bg-slate-900/50'
                        }`}
                      >
                        <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-3">
                          <div className="relative h-20 rounded-md border border-cyan-500/30 bg-slate-950/70 [perspective:700px]">
                            <div className="absolute left-1/2 top-1/2 h-12 w-16 -translate-x-1/2 -translate-y-1/2 [transform-style:preserve-3d]">
                              <div
                                className="absolute inset-0 rounded border [transform:translateZ(8px)]"
                                style={{
                                  borderColor: skin.colors.primary,
                                  background: `linear-gradient(180deg, ${skin.colors.primary}22 0%, ${skin.colors.secondary}66 65%, rgba(2,6,23,0.95) 100%)`,
                                  boxShadow: `0 0 10px ${skin.colors.glow}`,
                                }}
                              />
                              <div className="absolute left-0.5 top-1 h-9 w-2.5 rounded border [transform:rotateY(-62deg)_translateZ(2px)]" style={{ borderColor: skin.colors.primary, background: `${skin.colors.primary}77` }} />
                              <div className="absolute right-0.5 top-1 h-9 w-2.5 rounded border [transform:rotateY(62deg)_translateZ(2px)]" style={{ borderColor: skin.colors.primary, background: `${skin.colors.secondary}77` }} />
                              <div className="absolute left-1/2 top-0.5 h-3.5 w-12 -translate-x-1/2 rounded border [transform:rotateX(65deg)_translateZ(9px)]" style={{ borderColor: skin.colors.primary, background: `${skin.colors.secondary}66` }} />
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-cyan-100 truncate">{skin.name}</p>
                            <p className="text-[11px] text-slate-300/85">{skin.description}</p>
                            <p className="mt-1 text-[10px] text-slate-400 uppercase tracking-wide">{skin.rarity}</p>
                            <p className="text-[10px] text-emerald-300/90 uppercase tracking-wide">+{skin.luckBonus}% luck</p>
                            <div className="mt-2">
                              {owned ? (
                                equipped ? (
                                  <div className="rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-center text-xs text-cyan-200">
                                    Equipped
                                  </div>
                                ) : (
                                  <Button
                                    onClick={() => equipCosmetic('machineboxskin', skin.id)}
                                    className="h-8 w-full bg-cyan-600 hover:bg-cyan-500 text-xs"
                                  >
                                    Equip
                                  </Button>
                                )
                              ) : (
                                <Button
                                  onClick={() => buyCosmetic('machineboxskin', skin.id)}
                                  disabled={!canBuy}
                                  className="h-8 w-full bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-400 text-xs"
                                >
                                  Buy {formatNumber(skin.price)} Crypto
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isBlackMarketOpen} onOpenChange={setIsBlackMarketOpen}>
        <DialogContent className="max-w-5xl h-[84vh] bg-card/95 border-rose-500/35 z-[53]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-display text-rose-300">
              <Sparkles className="w-5 h-5" /> Black Market Spaceship
            </DialogTitle>
          </DialogHeader>
          {!isBlackMarketUnlocked ? (
            <div className="rounded-lg border border-rose-500/35 bg-rose-500/10 p-4 text-sm text-rose-200">
              Unlocks at Ascension {BLACK_MARKET_UNLOCK_ASCENSION}. Current progress: {stats.totalAscensions}/{BLACK_MARKET_UNLOCK_ASCENSION}
            </div>
          ) : (
            <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-2">
              <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-100/90">
                Exclusive modules: equip Capes and Wings from separate slots. One-time upgrades here permanently unlock advanced mechanics.
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-cyan-200">Capes Slot</p>
                  <span className="text-[11px] text-cyan-200/80">Equipped: {equippedCape.name}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {BLACK_MARKET_CAPES.map(cape => {
                    const owned = ownedCapesSet.has(cape.id);
                    const equipped = cosmetics.activeCapeId === cape.id;
                    const canAfford = cape.currency === 'ascension'
                      ? resources.prestige.amount >= cape.price
                      : cape.currency === 'crypto'
                        ? resources.crypto.amount >= cape.price
                        : resources.credits.amount >= cape.price;
                    const boostLines = getLootBoostLines(cape.boost);
                    return (
                      <div key={cape.id} className={`rounded-lg border p-3 ${
                        equipped ? 'border-cyan-400/60 bg-cyan-500/10' : owned ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-slate-600/40 bg-slate-900/55'
                      }`}>
                        <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-3">
                          <div className="relative h-20 rounded border border-cyan-500/30 bg-slate-950/70">
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 scale-[1.65]">
                              <CSSCharacter skinPalette={equippedSkin.palette} accessoryId="none" headStyleId="default" capeId={cape.id} wingId="none" />
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-cyan-100">{cape.name}</p>
                            <p className="text-[11px] text-slate-300/85">{cape.description}</p>
                            <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">{cape.rarity}</p>
                            {boostLines.length > 0 && (
                              <p className="text-[10px] text-emerald-300/90">{boostLines.join(' | ')}</p>
                            )}
                            <div className="mt-2">
                              {owned ? (
                                equipped ? (
                                  <div className="rounded border border-cyan-500/45 bg-cyan-500/10 px-2 py-1 text-center text-xs text-cyan-200">Equipped</div>
                                ) : (
                                  <Button onClick={() => equipCosmetic('cape', cape.id)} className="h-8 w-full bg-cyan-600 hover:bg-cyan-500 text-xs">Equip</Button>
                                )
                              ) : (
                                <Button
                                  onClick={() => buyCosmetic('cape', cape.id)}
                                  disabled={!canAfford}
                                  className="h-8 w-full bg-rose-600 hover:bg-rose-500 disabled:bg-slate-700 disabled:text-slate-400 text-xs"
                                >
                                  Buy {formatNumber(cape.price)}{cape.currency === 'ascension' ? 'P' : ` ${cape.currency}`}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-fuchsia-200">Wings Slot</p>
                  <span className="text-[11px] text-fuchsia-200/80">Equipped: {equippedWing.name}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {BLACK_MARKET_WINGS.map(wing => {
                    const owned = ownedWingsSet.has(wing.id);
                    const equipped = cosmetics.activeWingId === wing.id;
                    const canAfford = wing.currency === 'ascension'
                      ? resources.prestige.amount >= wing.price
                      : wing.currency === 'crypto'
                        ? resources.crypto.amount >= wing.price
                        : resources.credits.amount >= wing.price;
                    const boostLines = getLootBoostLines(wing.boost);
                    return (
                      <div key={wing.id} className={`rounded-lg border p-3 ${
                        equipped ? 'border-fuchsia-400/60 bg-fuchsia-500/10' : owned ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-slate-600/40 bg-slate-900/55'
                      }`}>
                        <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-3">
                          <div className="relative h-20 rounded border border-fuchsia-500/30 bg-slate-950/70">
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 scale-[1.65]">
                              <CSSCharacter skinPalette={equippedSkin.palette} accessoryId="none" headStyleId="default" capeId="none" wingId={wing.id} />
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-fuchsia-100">{wing.name}</p>
                            <p className="text-[11px] text-slate-300/85">{wing.description}</p>
                            <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">{wing.rarity}</p>
                            {boostLines.length > 0 && (
                              <p className="text-[10px] text-emerald-300/90">{boostLines.join(' | ')}</p>
                            )}
                            <div className="mt-2">
                              {owned ? (
                                equipped ? (
                                  <div className="rounded border border-fuchsia-500/45 bg-fuchsia-500/10 px-2 py-1 text-center text-xs text-fuchsia-200">Equipped</div>
                                ) : (
                                  <Button onClick={() => equipCosmetic('wing', wing.id)} className="h-8 w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-xs">Equip</Button>
                                )
                              ) : (
                                <Button
                                  onClick={() => buyCosmetic('wing', wing.id)}
                                  disabled={!canAfford}
                                  className="h-8 w-full bg-rose-600 hover:bg-rose-500 disabled:bg-slate-700 disabled:text-slate-400 text-xs"
                                >
                                  Buy {formatNumber(wing.price)}{wing.currency === 'ascension' ? 'P' : ` ${wing.currency}`}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-amber-200">One-Time Black Market Upgrades</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {BLACK_MARKET_UPGRADES.map(upgrade => {
                    const purchased = upgrade.id === 'click_overflow'
                      ? cosmetics.blackMarketClickOverflowPurchased
                      : cosmetics.blackMarketAdjacencyPurchased;
                    const canAfford = resources.prestige.amount >= upgrade.cost;
                    return (
                      <div key={upgrade.id} className={`rounded-lg border p-3 ${
                        purchased ? 'border-emerald-500/45 bg-emerald-500/10' : 'border-amber-500/35 bg-amber-500/10'
                      }`}>
                        <p className="text-sm font-semibold text-amber-100">{upgrade.name}</p>
                        <p className="mt-1 text-[11px] text-slate-300/85">{upgrade.description}</p>
                        {upgrade.id === 'adjacency_matrix' && (
                          <div className="mt-1 space-y-1 text-[10px] text-cyan-200/85">
                            <p>
                              Miners detected: {adjacencyFormationBonus.machineCount} | Adjacent pairs: {adjacencyFormationBonus.adjacentPairs}
                            </p>
                            <p className="text-cyan-100/90">
                              Layout guide:
                              Horizontal 3 miners = Click, Vertical 3 miners = Production, 2x2 block = Crypto.
                            </p>
                            <p>
                              Horizontal sets: {adjacencyFormationBonus.clickChains} | {adjacencyFormationBonus.active ? '+' : 'Potential +'}
                              {(
                                adjacencyFormationBonus.active
                                  ? adjacencyFormationBonus.clickBoostPercent
                                  : adjacencyFormationBonus.potentialClickBoostPercent
                              ).toFixed(1)}
                              % click
                            </p>
                            <p>
                              Vertical sets: {adjacencyFormationBonus.productionChains} | {adjacencyFormationBonus.active ? '+' : 'Potential +'}
                              {(
                                adjacencyFormationBonus.active
                                  ? adjacencyFormationBonus.productionBoostPercent
                                  : adjacencyFormationBonus.potentialProductionBoostPercent
                              ).toFixed(1)}
                              % production
                            </p>
                            <p>
                              2x2 clusters: {adjacencyFormationBonus.cryptoClusters} | {adjacencyFormationBonus.active ? '+' : 'Potential +'}
                              {(
                                adjacencyFormationBonus.active
                                  ? adjacencyFormationBonus.cryptoBoostPercent
                                  : adjacencyFormationBonus.potentialCryptoBoostPercent
                              ).toFixed(1)}
                              % crypto
                            </p>
                            <p>
                              Luck bonus: {adjacencyFormationBonus.active ? '+' : 'Potential +'}
                              {(
                                adjacencyFormationBonus.active
                                  ? adjacencyFormationBonus.luckBoostPercent
                                  : adjacencyFormationBonus.potentialLuckBoostPercent
                              ).toFixed(1)}
                              %
                            </p>
                          </div>
                        )}
                        {upgrade.id === 'click_overflow' && (
                          <p className="mt-1 text-[10px] text-cyan-200/85">
                            Current crit chance: {(getTotalCritChance() * 100).toFixed(1)}%
                          </p>
                        )}
                        <div className="mt-2">
                          {purchased ? (
                            <div className="rounded border border-emerald-500/45 bg-emerald-500/10 px-2 py-1 text-center text-xs text-emerald-200">Purchased</div>
                          ) : (
                            <Button
                              onClick={() => buyBlackMarketUpgrade(upgrade.id)}
                              disabled={!canAfford}
                              className="h-8 w-full bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-400 text-xs"
                            >
                              Buy {formatNumber(upgrade.cost)}P
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Achievements Modal */}
      <Dialog open={isAchievementsOpen} onOpenChange={setIsAchievementsOpen}>
        <DialogContent className="max-w-2xl h-[80vh] bg-card/95 border-amber-500/30 z-[50]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-display text-amber-400">
              <Trophy className="w-5 h-5" /> Achievements
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden -mx-6 -mb-6 px-6 pb-6">
            <AchievementsPanel 
              achievements={achievements} 
              stats={stats} 
              newlyUnlockedAchievement={null}
              claimAchievementReward={claimAchievementReward}
              claimAllAchievements={claimAllAchievements}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats Modal */}
      <Dialog open={isStatsOpen} onOpenChange={setIsStatsOpen}>
        <DialogContent className="max-w-md bg-card/95 border-fuchsia-500/30 z-[50]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-display text-fuchsia-400">
              <BarChart3 className="w-5 h-5" /> Player Stats
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded p-3">
                <div className="text-[10px] text-muted-foreground uppercase">Total Clicks</div>
                <div className="text-lg font-mono text-cyan-400">{formatNumber(stats.totalClicks)}</div>
              </div>
              <div className="bg-fuchsia-500/10 border border-fuchsia-500/30 rounded p-3">
                <div className="text-[10px] text-muted-foreground uppercase">Critical Hits</div>
                <div className="text-lg font-mono text-fuchsia-400">{formatNumber(stats.totalCrits)}</div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3">
                <div className="text-[10px] text-muted-foreground uppercase">Data</div>
                <div className="text-lg font-mono text-amber-400">{formatNumber(Math.floor(stats.totalDataCollected))}</div>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3">
                <div className="text-[10px] text-muted-foreground uppercase">Nodes</div>
                <div className="text-lg font-mono text-yellow-400">{formatNumber(Math.floor(stats.totalCreditsEarned))}</div>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/30 rounded p-3">
                <div className="text-[10px] text-muted-foreground uppercase">Ascensions</div>
                <div className="text-lg font-mono text-purple-400">{stats.totalAscensions}</div>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-3">
                <div className="text-[10px] text-muted-foreground uppercase">Upgrades Bought</div>
                <div className="text-lg font-mono text-emerald-400">{stats.totalUpgradesPurchased}</div>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3">
                <div className="text-[10px] text-muted-foreground uppercase">Pickups Collected</div>
                <div className="text-lg font-mono text-orange-400">{stats.pickupsCollected}</div>
              </div>
              <div className="bg-indigo-500/10 border border-indigo-500/30 rounded p-3">
                <div className="text-[10px] text-muted-foreground uppercase">Prestige Spent</div>
                <div className="text-lg font-mono text-indigo-400">{formatNumber(Math.floor(stats.totalPrestigeSpent))}</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leaderboards Modal */}
      <Dialog open={isLeaderboardOpen} onOpenChange={setIsLeaderboardOpen}>
        <DialogContent className="max-w-2xl h-[80vh] bg-card/95 border-amber-500/30 z-[55] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-display text-amber-300">
              <Crown className="w-5 h-5" /> Leaderboards
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLeaderboardTab('global')}
              className={`h-8 px-3 text-xs ${
                leaderboardTab === 'global'
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                  : 'bg-slate-900/70 border-slate-700 text-slate-300'
              }`}
              data-testid="button-leaderboard-tab-global"
            >
              Global
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLeaderboardTab('friends')}
              className={`h-8 px-3 text-xs ${
                leaderboardTab === 'friends'
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200'
                  : 'bg-slate-900/70 border-slate-700 text-slate-300'
              }`}
              data-testid="button-leaderboard-tab-friends"
            >
              Friends
            </Button>
            <div className="ml-auto">
              <Button
                type="button"
                onClick={() => { void refreshLeaderboard(leaderboardTab, LEADERBOARD_MODAL_LIMIT); }}
                className="h-8 px-3 text-xs bg-amber-600 hover:bg-amber-500"
                data-testid="button-leaderboard-refresh-modal"
              >
                Refresh
              </Button>
            </div>
          </div>

          <div className="text-[11px] text-slate-400">
            {leaderboardTab === 'global'
              ? `Global rankings (top ${LEADERBOARD_MODAL_LIMIT})`
              : `Friends rankings (top ${LEADERBOARD_MODAL_LIMIT})`}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto space-y-2 pr-1">
            {(leaderboardTab === 'global' ? leaderboardLoading : friendsLeaderboardLoading) ? (
              <div className="rounded border border-slate-700/50 bg-slate-900/70 p-3 text-sm text-slate-300">
                Loading leaderboard...
              </div>
            ) : (leaderboardTab === 'global' ? leaderboardError : friendsLeaderboardError) ? (
              <div className="rounded border border-red-500/35 bg-red-500/10 p-3 text-sm text-red-300">
                {leaderboardTab === 'global' ? leaderboardError : friendsLeaderboardError}
              </div>
            ) : (leaderboardTab === 'global' ? leaderboardEntries : friendsLeaderboardEntries).length === 0 ? (
              <div className="rounded border border-slate-700/50 bg-slate-900/70 p-3 text-sm text-slate-400">
                No entries yet.
              </div>
            ) : (
              (leaderboardTab === 'global' ? leaderboardEntries : friendsLeaderboardEntries).map((entry) => (
                <div
                  key={`${leaderboardTab}-${entry.rank}-${entry.steamId}`}
                  className="flex items-center justify-between rounded border border-amber-500/20 bg-slate-950/70 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-mono text-amber-200">#{entry.rank}</p>
                    <p className="truncate text-xs text-slate-300">{entry.personaName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Ascension</p>
                    <p className="text-sm font-mono text-cyan-300">{entry.score}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Loot Box Modal */}
      <Dialog
        open={lootBoxReward !== null && isLootBoxDialogOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsLootBoxDialogOpen(true);
            setIsLootBoxMinimized(false);
            return;
          }
          clearLootBoxOpeningSequence();
          setLootBoxOpeningPhase('idle');
          setIsLootBoxDialogOpen(false);
          if (lootBoxReward) setIsLootBoxMinimized(true);
        }}
      >
        <DialogContent className="max-w-md bg-card/95 border-amber-500/30 z-[55]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-display text-amber-400">
              <Sparkles className="w-5 h-5" /> Ascension Loot Box
            </DialogTitle>
          </DialogHeader>

          {lootBoxReward && (
            <div className="space-y-4">
              {!lootBoxOpened ? (
                <div className="space-y-4 text-center">
                  <motion.div
                    className="relative mx-auto h-44 w-52 [perspective:1200px]"
                    animate={
                      isLootBoxCharging
                        ? { y: [0, -10, 0], scale: [1, 1.03, 1] }
                        : isLootBoxBursting
                          ? { y: [0, -16, 2, 0], scale: [1, 1.12, 0.95, 1] }
                          : { y: [0, -6, 0] }
                    }
                    transition={
                      isLootBoxCharging
                        ? { duration: 0.52, repeat: Infinity, ease: 'easeInOut' }
                        : isLootBoxBursting
                          ? { duration: 0.5, ease: 'easeOut' }
                          : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
                    }
                  >
                    <motion.div
                      className="absolute left-1/2 top-20 h-32 w-40 -translate-x-1/2 -translate-y-1/2 [transform-style:preserve-3d]"
                      animate={
                        isLootBoxCharging
                          ? { rotateY: [0, 14, -14, 0], rotateX: [0, -5, 2, 0], scale: [1, 1.04, 1] }
                          : isLootBoxBursting
                            ? { rotateY: [0, 30, -24, 0], rotateX: [0, -9, 4, 0], scale: [1, 1.15, 0.94, 1] }
                            : { rotateY: [0, 6, -6, 0], rotateX: [0, -2, 0] }
                      }
                      transition={
                        isLootBoxCharging
                          ? { duration: 0.42, repeat: Infinity, ease: 'easeInOut' }
                          : isLootBoxBursting
                            ? { duration: 0.46, ease: 'easeOut' }
                            : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
                      }
                    >
                      <div
                        className="absolute inset-0 rounded-xl border [transform:translateZ(16px)]"
                        style={{
                          borderColor: activeLootBoxColors.accent,
                          background: `linear-gradient(180deg, ${activeLootBoxColors.bodyFrom} 0%, ${activeLootBoxColors.bodyVia} 55%, ${activeLootBoxColors.bodyTo} 100%)`,
                          boxShadow: isLootBoxOpening
                            ? `0 16px 36px rgba(15,23,42,0.75), 0 0 52px ${activeLootBoxColors.glow}`
                            : `0 14px 30px rgba(15,23,42,0.7), 0 0 35px ${activeLootBoxColors.glow}`,
                        }}
                      />
                      <div
                        className="absolute left-1 top-2 h-24 w-8 rounded-lg border [transform:rotateY(-68deg)_translateZ(6px)]"
                        style={{
                          borderColor: activeLootBoxColors.accent,
                          background: activeLootBoxColors.sideLeft,
                        }}
                      />
                      <div
                        className="absolute right-1 top-2 h-24 w-8 rounded-lg border [transform:rotateY(68deg)_translateZ(6px)]"
                        style={{
                          borderColor: activeLootBoxColors.accent,
                          background: activeLootBoxColors.sideRight,
                        }}
                      />
                      <div
                        className="absolute left-1/2 top-1 h-12 w-36 -translate-x-1/2 rounded-xl border [transform:rotateX(68deg)_translateZ(18px)]"
                        style={{
                          borderColor: activeLootBoxColors.accent,
                          background: `linear-gradient(180deg, ${activeLootBoxColors.topFrom} 0%, ${activeLootBoxColors.topTo} 100%)`,
                        }}
                      />
                      <div className="absolute left-1/2 top-16 h-16 w-[4px] -translate-x-1/2 rounded-full [transform:translateZ(18px)]" style={{ background: activeLootBoxColors.core, boxShadow: `0 0 10px ${activeLootBoxColors.glow}` }} />
                      <div className="absolute left-[24%] top-[56%] h-14 w-[3px] rounded-full [transform:translateZ(18px)]" style={{ background: activeLootBoxColors.core, boxShadow: `0 0 8px ${activeLootBoxColors.glow}` }} />
                      <div className="absolute right-[24%] top-[56%] h-14 w-[3px] rounded-full [transform:translateZ(18px)]" style={{ background: activeLootBoxColors.accent, boxShadow: `0 0 8px ${activeLootBoxColors.glow}` }} />
                    </motion.div>
                    <motion.div
                      className="absolute left-1/2 top-32 h-5 w-40 -translate-x-1/2 rounded-full blur-xl"
                      style={{ background: activeLootBoxColors.glow }}
                      animate={
                        isLootBoxCharging
                          ? { opacity: [0.45, 0.95, 0.45], scaleX: [0.95, 1.22, 0.95] }
                          : isLootBoxBursting
                            ? { opacity: [0.55, 1, 0], scaleX: [1, 1.6, 2], scaleY: [1, 1.4, 2] }
                            : { opacity: [0.35, 0.75, 0.35], scaleX: [0.9, 1.06, 0.9] }
                      }
                      transition={
                        isLootBoxCharging
                          ? { duration: 0.6, repeat: Infinity, ease: 'easeInOut' }
                          : isLootBoxBursting
                            ? { duration: 0.45, ease: 'easeOut' }
                            : { duration: 1.9, repeat: Infinity, ease: 'easeInOut' }
                      }
                    />
                    <motion.div
                      className="absolute left-1/2 top-[56px] -translate-x-1/2"
                      animate={
                        isLootBoxCharging
                          ? { y: [0, -5, 0], opacity: [0.85, 1, 0.85], scale: [1, 1.08, 1] }
                          : isLootBoxBursting
                            ? { y: [0, -10, -2], opacity: [1, 1, 0], scale: [1, 1.35, 0.8] }
                            : { y: [0, -3, 0], opacity: [0.7, 1, 0.7] }
                      }
                      transition={
                        isLootBoxCharging
                          ? { duration: 0.52, repeat: Infinity, ease: 'easeInOut' }
                          : isLootBoxBursting
                            ? { duration: 0.42, ease: 'easeOut' }
                            : { duration: 1.8, repeat: Infinity }
                      }
                    >
                      <Sparkles className="h-8 w-8 drop-shadow-[0_0_10px_rgba(251,191,36,0.85)]" style={{ color: activeLootBoxColors.core }} />
                    </motion.div>
                    <AnimatePresence>
                      {isLootBoxOpening && (
                        <motion.div
                          className="absolute inset-0 pointer-events-none"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <motion.div
                            className="absolute left-1/2 top-[52%] h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border"
                            style={{ borderColor: activeLootBoxColors.accent }}
                            initial={{ opacity: 0.35, scale: 0.65 }}
                            animate={{ opacity: [0.35, 0], scale: [0.65, 1.65] }}
                            transition={{ duration: 0.55, repeat: isLootBoxCharging ? Infinity : 0, ease: 'easeOut' }}
                          />
                          <motion.div
                            className="absolute left-1/2 top-[52%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full"
                            style={{ background: `radial-gradient(circle, ${activeLootBoxColors.glow} 0%, transparent 70%)` }}
                            initial={{ opacity: 0.15, scale: 0.7 }}
                            animate={{ opacity: isLootBoxBursting ? [0.2, 0.95, 0] : [0.2, 0.55, 0.2], scale: isLootBoxBursting ? [0.8, 1.6, 2.1] : [0.8, 1.15, 0.8] }}
                            transition={{ duration: isLootBoxBursting ? 0.45 : 0.65, repeat: isLootBoxCharging ? Infinity : 0, ease: 'easeOut' }}
                          />
                          {isLootBoxBursting && (
                            <motion.div
                              className="absolute inset-0 rounded-xl bg-white"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: [0, 0.55, 0] }}
                              transition={{ duration: 0.28, ease: 'easeOut' }}
                            />
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                  <p className="text-sm text-slate-300">
                    {isLootBoxCharging
                      ? 'Decrypting lock sequence...'
                      : isLootBoxBursting
                        ? 'Jackpot breach confirmed!'
                        : 'Boss dropped a loot box. Open it to claim your reward.'}
                  </p>
                  <p className="text-xs text-slate-400">
                    Click Effects and Loot-Box crate skins are exclusive. Mine Skins can drop here too, and can also be bought in Crypto Shop.
                  </p>
                  <Button
                    onClick={handleOpenLootBox}
                    disabled={isLootBoxOpening}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-80 disabled:cursor-wait"
                  >
                    {isLootBoxCharging ? 'Charging Loot Box...' : isLootBoxBursting ? 'Revealing Reward...' : 'Open Loot Box'}
                  </Button>
                </div>
              ) : lootBoxReward.kind === 'cosmetic' ? (
                <div className="space-y-3">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4"
                  >
                    <p className="text-center text-xs uppercase tracking-wider text-cyan-300/80">Unlocked Cosmetic</p>
                    <div className="mt-3 grid grid-cols-[140px_minmax(0,1fr)] gap-3 items-start">
                      <div>{lootRewardDetails?.preview}</div>
                      <div className="text-left">
                        <p className="text-lg font-bold text-cyan-200">{lootBoxReward.itemName}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${lootRarityClass[lootBoxReward.rarity]}`}>
                            {lootBoxReward.rarity.toUpperCase()}
                          </span>
                          <span className="text-[11px] text-slate-300">{lootTypeLabel[lootBoxReward.cosmeticType]}</span>
                          {lootBoxReward.isAscensionItem && (
                            <span className="rounded border border-fuchsia-400/45 bg-fuchsia-500/10 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-300">
                              Ascension Catalog
                            </span>
                          )}
                        </div>
                        {lootRewardDetails?.description && (
                          <p className="mt-2 text-xs text-slate-300">{lootRewardDetails.description}</p>
                        )}
                        <div className="mt-3 space-y-1 rounded border border-cyan-500/20 bg-slate-950/55 p-2">
                          <p className="text-[10px] uppercase tracking-wide text-cyan-300/75">Stats</p>
                          {lootRewardDetails?.boostLines.length ? (
                            lootRewardDetails.boostLines.map((line, idx) => (
                              <p key={`${line}-${idx}`} className="text-xs text-emerald-300">{line}</p>
                            ))
                          ) : (
                            <p className="text-xs text-slate-400">No direct stat boost.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  <p className="text-xs text-slate-400 text-center">
                    Added to your Cosmetics Market inventory. Duplicate drops are blocked.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={handleEquipLootReward}
                      disabled={isLootRewardEquipped}
                      className="border-cyan-500/50 text-cyan-200 hover:bg-cyan-500/15 disabled:opacity-80"
                    >
                      {isLootRewardEquipped ? 'Equipped' : 'Equip Now'}
                    </Button>
                    <Button
                      onClick={() => {
                        clearLootBoxOpeningSequence();
                        setLootBoxReward(null);
                        setLootBoxOpened(false);
                        setLootBoxOpeningPhase('idle');
                        setIsLootBoxDialogOpen(false);
                        setIsLootBoxMinimized(false);
                      }}
                      className="w-full"
                    >
                      Continue Run
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-center">
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <p className="text-xs uppercase tracking-wider text-emerald-300/90">Loot Pool Exhausted</p>
                    <p className="mt-1 text-sm text-emerald-200">
                      No cosmetic items left to drop.
                    </p>
                    <p className="mt-2 text-base font-bold text-emerald-300">
                      +{lootBoxReward.data} Data | +{lootBoxReward.credits} Nodes | +{lootBoxReward.crypto} Crypto
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      clearLootBoxOpeningSequence();
                      setLootBoxReward(null);
                      setLootBoxOpened(false);
                      setLootBoxOpeningPhase('idle');
                      setIsLootBoxDialogOpen(false);
                      setIsLootBoxMinimized(false);
                    }}
                    className="w-full"
                  >
                    Continue Run
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {lootBoxReward && !isLootBoxDialogOpen && isLootBoxMinimized && (
        <motion.button
          type="button"
          onClick={reopenLootBoxDialog}
          initial={{ opacity: 0, scale: 0.8, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 12 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
          className={`fixed bottom-4 z-[70] h-12 w-12 rounded-full border backdrop-blur-sm shadow-[0_0_20px_rgba(251,191,36,0.35)] ${
            rightPanelOpen
              ? (leftPanelOpen ? 'left-[336px]' : 'left-4')
              : 'right-4'
          } bg-amber-500/20 border-amber-400/60 text-amber-200`}
          title="Loot box ready - click to reopen"
          data-testid="lootbox-reopen-bubble"
        >
          <Sparkles className="mx-auto h-5 w-5" />
          <span className="absolute -right-1 -top-1 rounded-full border border-amber-300/70 bg-amber-500 px-1 text-[10px] font-bold leading-4 text-slate-950">
            1
          </span>
        </motion.button>
      )}

      {/* Cosmetics Market Modal */}
      <Dialog open={isCosmeticsOpen} onOpenChange={setIsCosmeticsOpen}>
        <DialogContent className="w-[95vw] max-w-6xl h-[84vh] grid-rows-[auto_minmax(0,1fr)] content-start bg-card/95 border-purple-500/30 z-[50]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-display text-purple-400">
              <Sparkles className="w-5 h-5" /> Cosmetics Market
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden -mx-6 -mb-6 px-6 pb-6">
            <div className="h-full min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-4">
              <div className="min-h-0 overflow-hidden">
                <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>}>
                  <CosmeticsPanel
                    data={resources.data.amount}
                    credits={resources.credits.amount}
                    crypto={resources.crypto.amount}
                    ascension={resources.prestige.amount}
                    totalAscensions={stats.totalAscensions}
                    skins={marketSkins}
                    themes={ROOM_THEMES}
                    accessories={marketAccessories}
                    headStyles={marketHeadStyles}
                    pets={CHARACTER_PETS}
                    clickEffects={CLICK_EFFECTS}
                    boxSkins={LOOT_BOX_SKINS}
                    ascensionPets={ASCENSION_PETS}
                    ascensionSkins={ASCENSION_SKINS}
                    ascensionHeadStyles={ASCENSION_HEAD_STYLES}
                    ascensionAccessories={ASCENSION_ACCESSORIES}
                    ascensionThemes={ASCENSION_ROOM_THEMES}
                    ownedSkins={ownedSkinsSet}
                    ownedThemes={ownedThemesSet}
                    ownedAccessories={ownedAccessoriesSet}
                    ownedHeadStyles={ownedHeadStylesSet}
                    ownedPets={ownedPetsSet}
                    ownedClickEffects={ownedClickEffectsSet}
                    ownedBoxSkins={ownedLootBoxSkinsSet}
                    ownedAscensionPets={ownedAscensionPetsSet}
                    activeSkin={cosmetics.activeSkinId}
                    activeTheme={cosmetics.activeThemeId}
                    activeAccessory={cosmetics.activeAccessoryId}
                    activeHeadStyle={cosmetics.activeHeadStyleId}
                    activePet={cosmetics.activePetId}
                    activeClickEffect={cosmetics.activeClickEffectId}
                    activeBoxSkin={cosmetics.activeLootBoxSkinId}
                    activeAscensionPet={cosmetics.activeAscensionPetId}
                    onBuySkin={(skinId) => buyCosmetic('skin', skinId)}
                    onBuyTheme={(themeId) => buyCosmetic('theme', themeId)}
                    onBuyAccessory={(accessoryId) => buyCosmetic('accessory', accessoryId)}
                    onBuyHeadStyle={(headStyleId) => buyCosmetic('headstyle', headStyleId)}
                    onBuyPet={(petId) => buyCosmetic('pet', petId)}
                    onEquipSkin={(skinId) => equipCosmetic('skin', skinId)}
                    onEquipTheme={(themeId) => equipCosmetic('theme', themeId)}
                    onEquipAccessory={(accessoryId) => equipCosmetic('accessory', accessoryId)}
                    onEquipHeadStyle={(headStyleId) => equipCosmetic('headstyle', headStyleId)}
                    onEquipPet={(petId) => equipCosmetic('pet', petId)}
                    onEquipClickEffect={(effectId) => equipCosmetic('clickeffect', effectId)}
                    onEquipBoxSkin={(skinId) => equipCosmetic('lootboxskin', skinId)}
                    onEquipAscensionPet={(petId) => equipCosmetic('prestigepet', petId)}
                  />
                </Suspense>
              </div>

              <div className="hidden lg:flex min-h-0 flex-col rounded-xl border border-cyan-500/30 bg-slate-950/60 p-3 shadow-[0_0_24px_rgba(6,182,212,0.12)]">
                <div className="mb-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-300/80">Live Character Preview</p>
                  <p className="text-[11px] text-slate-400 mt-1">Updates instantly as you equip cosmetics.</p>
                </div>

                <div className="relative flex-1 min-h-[420px] overflow-hidden rounded-lg border border-cyan-500/25 bg-slate-950/80">
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'radial-gradient(ellipse at center, rgba(34,211,238,0.14) 0%, rgba(2,6,23,0.85) 58%, rgba(2,6,23,0.98) 100%)',
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                    <div style={{ transform: 'scale(6.2)', transformOrigin: 'center center' }}>
                      <motion.div
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <CSSCharacter
                          reaction="idle"
                          facingRight={true}
                          skinPalette={{
                            ...equippedSkin.palette,
                            paletteMode: equippedSkin.paletteMode,
                            gradientColors: equippedSkin.gradientColors,
                            animationSpeed: equippedSkin.animationSpeed,
                          }}
                          accessoryId={equippedAccessory.id}
                          headStyleId={equippedHeadStyle.id}
                        />
                      </motion.div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded border border-slate-700/60 bg-slate-900/70 px-2 py-1">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Theme</p>
                    <p className="text-xs text-cyan-200 truncate">{equippedTheme.name}</p>
                  </div>
                  <div className="rounded border border-slate-700/60 bg-slate-900/70 px-2 py-1">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Skin</p>
                    <p className="text-xs text-cyan-200 truncate">{equippedSkin.name}</p>
                  </div>
                  <div className="rounded border border-slate-700/60 bg-slate-900/70 px-2 py-1">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Head</p>
                    <p className="text-xs text-cyan-200 truncate">{equippedHeadStyle.name}</p>
                  </div>
                  <div className="rounded border border-slate-700/60 bg-slate-900/70 px-2 py-1">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Accessory</p>
                    <p className="text-xs text-cyan-200 truncate">{equippedAccessory.name}</p>
                  </div>
                  <div className="rounded border border-slate-700/60 bg-slate-900/70 px-2 py-1 col-span-2">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Click Effect</p>
                    <p className="text-xs text-cyan-200 truncate">
                      {equippedClickEffect ? equippedClickEffect.name : 'None'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Pickups */}
      {!isBossEncounterActive && (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
          {floatingPickups.map(pickup => (
            <FloatingPickup
              key={pickup.id}
              pickup={pickup}
              onRemove={(id) => { handlePickupClick(pickup); }}
              onCritClick={() => { handleCritPickupClick(); onCritPickupClick(); }}
              playSound={playSound}
            />
          ))}
        </div>
      )}

      {/* Left Panel - Resources */}
      <motion.div
        initial={false}
        animate={{ width: leftPanelOpen ? 320 : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="relative overflow-hidden shrink-0"
      >
        <div className="w-80 h-full">
          <ResourcePanel 
            resources={resources}
            upgrades={upgrades}
            onSell={handleSellResource} 
            onSellAll={handleSellAllResource} 
            totalCritChance={getTotalCritChance()} 
            interestRate={getInterestRate()} 
            blackMarketUnlocked={(upgrades.find(u => u.id === 'unlock_black_market')?.count ?? 0) > 0} 
            onSettingsClick={() => setIsSettingsOpen(true)} 
            onAchievementsClick={() => setIsAchievementsOpen(true)}
            onStatsClick={() => setIsStatsOpen(true)}
            onCosmeticsClick={() => setIsCosmeticsOpen(true)}
            achievementCount={{ 
              unlocked: achievements.filter(a => a.unlocked).length, 
              total: achievements.filter(a => !a.hidden || a.unlocked).length 
            }}
            unclaimedAchievements={unclaimedAchievements}
            elapsedTime={elapsedTime} 
            prestigeAmount={resources.prestige.amount}
            onStartBossEncounter={() => setIsBossEncounterActive(true)}
            getPrestigeGain={getPrestigeGain}
            ascensionLevel={stats.totalAscensions}
            onOpenPrestige={() => {
              completeTutorialObjective?.('view_prestige');
              setIsPrestigeOpen(true);
              playSound('prestige_realm');
            }}
            onAscendTutorialStep={handleAscendTutorialStep}
            onCryptoRelicsClick={() => setIsCryptoRelicShopOpen(true)}
            cryptoRelicShopUnlocked={isCryptoRelicShopUnlocked}
            cryptoRelicUnlockRequirement={CRYPTO_RELIC_SHOP_UNLOCK_ASCENSION}
            tutorialHighlight={tutorialHighlight}
            playSound={playSound}
            leaderboardEntries={leaderboardEntries}
            leaderboardLoading={leaderboardLoading}
            leaderboardError={leaderboardError}
            leaderboardMyRank={leaderboardMyRank}
            onRefreshLeaderboard={() => { void refreshLeaderboard('global', LEADERBOARD_PANEL_LIMIT); }}
            onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
          />
        </div>
      </motion.div>
      
      {/* Left Panel Toggle Button - Fixed to left edge */}
      <motion.button
        onClick={() => {
          if (leftPanelOpen) {
            handleLeftPanelClose();
          } else {
            setLeftPanelOpen(true);
            setUserClosedLeftPanel(false);
          }
        }}
        className="fixed top-1/2 -translate-y-1/2 z-50 w-6 h-16 bg-card/90 hover:bg-card border border-border/50 rounded-r-lg flex items-center justify-center transition-all duration-200 hover:w-8 group backdrop-blur-sm shadow-lg"
        animate={{ left: leftPanelOpen ? 320 : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        data-testid="button-toggle-left-panel"
      >
        <motion.div
          animate={{ rotate: leftPanelOpen ? 0 : 180 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronLeft className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </motion.div>
      </motion.button>

      {isBossEncounterActive ? (
        <div className="flex-1 relative">
          <Suspense fallback={<div className="flex items-center justify-center h-full text-cyan-400 font-mono">Loading Boss...</div>}>
          <BossEncounter
            isOpen={true}
            onClose={() => setIsBossEncounterActive(false)}
            onVictory={() => {
              const reward = ascendVictory();
              setIsBossEncounterActive(false);
              setActiveUpgradeTab('fabrication');
              if (reward) {
                clearLootBoxOpeningSequence();
                setLootBoxReward(reward);
                setLootBoxOpened(false);
                setLootBoxOpeningPhase('idle');
                setIsLootBoxDialogOpen(true);
                setIsLootBoxMinimized(false);
              }
            }}
            onDefeat={() => {
              ascendDefeat();
              setIsBossEncounterActive(false);
              setActiveUpgradeTab('fabrication');
            }}
            prestigeGain={getPrestigeGain()}
            ascensionLevel={stats.totalAscensions}
            dataPerClick={getDataPerClick()}
            isMainScreen={true}
            playSound={playSound}
          />
          </Suspense>
        </div>
      ) : (
        <MainView 
          onClick={handleCoreClick}
          onRightClick={handleCoreRightClick}
          onTutorialCameraZoom={handleTutorialCameraZoom}
          onTutorialCameraPan={handleTutorialCameraPan}
          onAddDebugData={addDebugData}
          onAddDebugCredits={addDebugCredits}
          onAddDebugCrypto={addDebugCrypto}
          onAddDebugAscensionCount={addDebugAscensionCount}
          lastUpgradeInfo={lastUpgradeInfo}
          onClearUpgrade={() => setLastUpgradeInfo(null)}
          dataPerSecond={resources.data.perSecond}
          upgrades={upgrades}
          totalData={resources.data.amount}
          totalCredits={resources.credits.amount}
          onAchievementUnlocked={achievementUnlocked}
          onPickupCollected={pickupCollected}
          onClearAchievement={() => setAchievementUnlocked(false)}
          onClearPickup={() => setPickupCollected(false)}
          autoClickBoostEndTime={autoClickBoostEndTime}
          themeColors={{ ...equippedTheme.colors, orbitalPlanet: equippedTheme.orbitalPlanet }}
          skinPalette={{ 
            ...equippedSkin.palette, 
            paletteMode: equippedSkin.paletteMode, 
            gradientColors: equippedSkin.gradientColors,
            animationSpeed: equippedSkin.animationSpeed
          }}
          activeAccessoryId={equippedAccessory.id}
          activeCapeId={equippedCape.id}
          activeWingId={equippedWing.id}
          activeHeadStyleId={equippedHeadStyle.id}
          activePetId={equippedPet.id}
          activeAscensionPetId={equippedAscensionPet.id}
          activeClickEffectId={equippedClickEffect?.id || 'none'}
          activeMachineBoxSkin={{
            id: equippedMachineBoxSkin.id,
            colors: equippedMachineBoxSkin.colors,
          }}
          ascensionLevel={stats.totalAscensions}
          machinePositions={roomLayout.machinePositions}
          onUpdatePosition={updateMachinePosition}
          onRemovePosition={removeMachinePosition}
          tutorialHighlight={tutorialHighlight}
          showBlackMarketShip={isBlackMarketUnlocked}
          onOpenBlackMarket={() => {
            playSound('buy_black');
            setIsBlackMarketOpen(true);
          }}
        />
      )}

      {/* Right Panel Toggle Button - Fixed to right edge */}
      <motion.button
        onClick={() => {
          if (rightPanelOpen) {
            handleRightPanelClose();
          } else {
            setRightPanelOpen(true);
            setUserClosedRightPanel(false);
          }
        }}
        className="fixed top-1/2 -translate-y-1/2 z-50 w-6 h-16 bg-card/90 hover:bg-card border border-border/50 rounded-l-lg flex items-center justify-center transition-all duration-200 hover:w-8 group backdrop-blur-sm shadow-lg"
        animate={{ right: rightPanelOpen ? 384 : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        data-testid="button-toggle-right-panel"
      >
        <motion.div
          animate={{ rotate: rightPanelOpen ? 0 : 180 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </motion.div>
      </motion.button>

      {/* Right Panel - Upgrades */}
      <motion.div
        initial={false}
        animate={{ width: rightPanelOpen ? 384 : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="relative overflow-hidden shrink-0"
      >
        <div className="w-96 h-full">
          <UpgradePanel 
            upgrades={upgrades} 
            resources={resources} 
            onBuy={buyUpgrade} 
            playSound={playSound}
            getUpgradePreview={getUpgradePreview}
            getBulkProductionGain={getBulkProductionGain}
            selectedBulkOption={selectedBulkOption}
            onBulkOptionChange={setSelectedBulkOption}
            contracts={contracts}
            onClaimContractReward={handleClaimContract}
            onRefreshContracts={() => refreshContracts()}
            totalCritChance={getTotalCritChance()}
            ascensionLevel={stats.totalAscensions}
            tutorialHighlight={tutorialHighlight}
            activeUpgradeTab={activeUpgradeTab}
            onSetActiveUpgradeTab={setActiveUpgradeTab}
          />
        </div>
      </motion.div>

      {/* Debug Panel - For Development */}
      {isDebugPanelVisible && (
        <DebugPanel
          onAddData={addDebugData}
          onAddCredits={addDebugCredits}
          onAddCrypto={addDebugCrypto}
          onAddPrestige={addDebugPrestige}
          onAddAscensionCount={addDebugAscensionCount}
          onSetTime={setDebugTime}
          onReset={resetGame}
          onSpawnPickup={spawnDebugPickup}
          onHide={() => setIsDebugPanelVisible(false)}
        />
      )}

      {/* Tutorial Panel */}
      <TutorialPanel
        currentPhase={getCurrentTutorialPhase()}
        tutorial={tutorial}
        onSkip={skipTutorial}
        onStart={startTutorial}
        isTutorialComplete={isTutorialComplete}
      />

      {/* Offline Progress Modal */}
      <Suspense fallback={null}>
        <OfflineProgressModal 
          progress={offlineProgress} 
          onClose={clearOfflineProgress} 
        />
      </Suspense>

      {/* Ascension Pet Unlock Modal */}
      <Dialog
        open={!!newlyUnlockedAscensionPet}
        onOpenChange={(open) => {
          if (!open) claimAscensionPetUnlock();
        }}
      >
        <DialogContent className="max-w-md bg-card/95 border-purple-500/40 z-[120]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-display text-purple-300">
              <Sparkles className="w-5 h-5" /> Ascension Pet Unlocked
            </DialogTitle>
          </DialogHeader>
          {newlyUnlockedAscensionPet && (
            <div className="space-y-4">
              <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
                    <Cpu className="w-5 h-5 text-purple-300" />
                  </div>
                  <div>
                    <p className="font-bold text-purple-100">{newlyUnlockedAscensionPet.name}</p>
                    <p className="text-xs text-muted-foreground">{newlyUnlockedAscensionPet.description}</p>
                    <p className="text-[11px] text-purple-200/80 mt-1">
                      Unlock Requirement: {newlyUnlockedAscensionPet.ascensionRequirement ?? 0} ascensions
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 space-y-1.5">
                <p className="text-[10px] uppercase tracking-widest text-cyan-300/80">Boosts</p>
                {newlyUnlockedAscensionPet.boost.productionBoost ? (
                  <p className="text-xs text-cyan-100">+{newlyUnlockedAscensionPet.boost.productionBoost}% Production</p>
                ) : null}
                {newlyUnlockedAscensionPet.boost.clickBoost ? (
                  <p className="text-xs text-cyan-100">+{newlyUnlockedAscensionPet.boost.clickBoost}% Click</p>
                ) : null}
                {newlyUnlockedAscensionPet.boost.critBoost ? (
                  <p className="text-xs text-cyan-100">+{newlyUnlockedAscensionPet.boost.critBoost}% Crit</p>
                ) : null}
                {newlyUnlockedAscensionPet.boost.cryptoBoost ? (
                  <p className="text-xs text-cyan-100">+{newlyUnlockedAscensionPet.boost.cryptoBoost}% Crypto</p>
                ) : null}
                {newlyUnlockedAscensionPet.boost.interestBoost ? (
                  <p className="text-xs text-cyan-100">+{newlyUnlockedAscensionPet.boost.interestBoost}% Interest</p>
                ) : null}
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={claimAscensionPetUnlock}
                  className="border-border/70"
                  data-testid="button-claim-ascension-pet"
                >
                  Claim
                </Button>
                <Button
                  onClick={equipAscensionPetUnlock}
                  className="bg-purple-600/80 hover:bg-purple-600 text-white"
                  data-testid="button-equip-ascension-pet"
                >
                  Equip
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Achievement Unlock Toast */}
      <AnimatePresence>
        {newlyUnlockedAchievement && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[200] bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/50 rounded-lg px-6 py-4 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                <Trophy className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-amber-300 uppercase tracking-wider">Achievement Unlocked!</p>
                <p className="font-bold text-amber-100">{newlyUnlockedAchievement.name}</p>
                <p className="text-xs text-muted-foreground">{newlyUnlockedAchievement.description}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
