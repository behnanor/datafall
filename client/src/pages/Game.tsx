import React, { startTransition, useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { FinaleCredits } from '@/components/game/FinaleCredits';
import { Celebration, type CelebrationKind } from '@/components/game/Celebration';
import { JuiceBanners } from '@/components/game/JuiceBanners';
import { shiftThemeColorsForEra } from '@/lib/colorEra';
import { useGame, formatNumber, getPrestigeGainBreakdown, getEndlessDepth, getFinaleWeaken, IS_TEST_BUILD, type ResourceType, type LootBoxReward, type TutorialReward, type FloatingPickupItem, CHARACTER_SKINS, ROOM_THEMES, CHARACTER_ACCESSORIES, CHARACTER_HEAD_STYLES, CHARACTER_PETS, ASCENSION_PETS, ASCENSION_SKINS, ASCENSION_HEAD_STYLES, ASCENSION_ACCESSORIES, ASCENSION_ROOM_THEMES, CLICK_EFFECTS, LOOT_BOX_SKINS, MACHINE_BOX_SKINS, CRYPTO_RELIC_TREE, CRYPTO_RELIC_SHOP_UNLOCK_ASCENSION, getCryptoRelicUpgradeCost, BLACK_MARKET_CAPES, BLACK_MARKET_WINGS, BLACK_MARKET_UPGRADES, BLACK_MARKET_UNLOCK_ASCENSION, PARAGON_LAB_UNLOCK_ASCENSION, PARAGON_UPGRADES, computeParagonBonuses } from '@/lib/useGame';
import { ABYSS_VARIANT_HUES } from '@/lib/endless';
import { DemoEndScreen } from '@/components/game/DemoEndScreen';
import { SaveLoadErrorScreen } from '@/components/game/SaveLoadErrorScreen';
import { DemoPrompts } from '@/components/game/DemoPrompts';
import { WhatsNewDialog } from '@/components/game/WhatsNewDialog';
import { WHATS_NEW_VERSION } from '@/lib/useGame';
import { IS_DEMO_BUILD, DEMO_ASCENSION_LIMIT } from '@/lib/useGame';
import { getBossVariant, shouldSkipBossFight, ECHO_PRESTIGE_MULTIPLIER, pick6, type BossVariant } from '@/lib/bossVariants';
import { getSteamLeaderboardEntries, isSteamAvailable, setSteamLeaderboardScore, type SteamLeaderboardEntry } from '@/lib/steamIntegration';
import { ResourcePanel } from '@/components/game/ResourcePanel';
import { UpgradePanel } from '@/components/game/UpgradePanel';
import { MainView } from '@/components/game/MainView';
import { usePublishLiveResources } from '@/lib/liveResources';
import { useStableCallback } from '@/lib/useStableCallback';
import { FloatingPickup } from '@/components/game/FloatingPickup';
import { TutorialPanel } from '@/components/game/TutorialPanel';
import { CSSCharacter } from '@/components/game/CyberpunkRoom';
import { CurrencyIcon } from '@/components/game/CurrencyIcon';
import { toast } from '@/hooks/use-toast';

const BossEncounter = lazy(() => import('@/components/game/BossEncounter').then(m => ({ default: m.BossEncounter })));
const OfflineProgressModal = lazy(() => import('@/components/game/OfflineProgressModal').then(m => ({ default: m.OfflineProgressModal })));
const SettingsModal = lazy(() => import('@/components/game/SettingsModal').then(m => ({ default: m.SettingsModal })));
const PrestigeShopDialog = lazy(() => import('@/components/game/GameShopDialogs').then(m => ({ default: m.PrestigeShopDialog })));
const CryptoRelicShopDialog = lazy(() => import('@/components/game/GameShopDialogs').then(m => ({ default: m.CryptoRelicShopDialog })));
const BlackMarketDialog = lazy(() => import('@/components/game/GameShopDialogs').then(m => ({ default: m.BlackMarketDialog })));
const ParagonLabDialog = lazy(() => import('@/components/game/GameShopDialogs').then(m => ({ default: m.ParagonLabDialog })));
const AchievementsDialog = lazy(() => import('@/components/game/GameOverlayDialogs').then(m => ({ default: m.AchievementsDialog })));
const StatsDialog = lazy(() => import('@/components/game/GameOverlayDialogs').then(m => ({ default: m.StatsDialog })));
const LeaderboardsDialog = lazy(() => import('@/components/game/GameOverlayDialogs').then(m => ({ default: m.LeaderboardsDialog })));
const LootBoxDialog = lazy(() => import('@/components/game/GameOverlayDialogs').then(m => ({ default: m.LootBoxDialog })));
const CosmeticsMarketDialog = lazy(() => import('@/components/game/GameOverlayDialogs').then(m => ({ default: m.CosmeticsMarketDialog })));
const AscensionPetUnlockDialog = lazy(() => import('@/components/game/GameOverlayDialogs').then(m => ({ default: m.AscensionPetUnlockDialog })));
const TutorialRewardDialog = lazy(() => import('@/components/game/GameOverlayDialogs').then(m => ({ default: m.TutorialRewardDialog })));
import { Button } from '@/components/ui/button';
import { Crown, Trophy, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { ToastAction } from '@/components/ui/toast';
import { motion, AnimatePresence } from 'framer-motion';
import { localizeInlineText, useI18n } from '@/lib/i18n';
import {
  getBoostLines,
  getCurrencyLabel,
  getLootTypeLabel,
  getParagonEffectLabel,
  getRarityLabel,
  getRelicSlotLabel,
  getTutorialRewardTypeLabel,
  localizeCatalogEntry,
} from '@/lib/gameLocale';


import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const REDUCE_SCENE_GLOW_STORAGE_KEY = 'datafall-reduce-scene-glow';
const CLICK_TAB_MINING_HINT_STORAGE_KEY = 'datafall-hint-click-tab-mining';
const FIRST_ASCENSION_PRESTIGE_HINT_STORAGE_KEY = 'datafall-hint-first-ascension-prestige';
const DEV_LEADERBOARD_CLEAR_STORAGE_KEY = 'datafall-dev-leaderboard-cleared-v1';
const MAX_ASCENSION_LEADERBOARD = 'max_ascension';
const MAX_ASCENSION_DAILY_LEADERBOARD = 'max_ascension_daily';
// Endless mode (after the finale): depth = ascensions beyond 50.
const ENDLESS_LEADERBOARD = 'endless_depth';
const LEADERBOARD_PANEL_LIMIT = 10;
const LEADERBOARD_MODAL_LIMIT = 500;
const DISABLE_STEAM_LEADERBOARD_UPLOADS = import.meta.env.VITE_DISABLE_STEAM_LEADERBOARD_UPLOADS === 'true';
const CLEAR_STEAM_LEADERBOARD_ONCE = import.meta.env.VITE_CLEAR_STEAM_LEADERBOARD_ONCE === 'true';

const getCurrentUtcDateStamp = (): string => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

// Steam leaderboards never reset and have no time filter. The old single 'max_ascension_daily'
// board therefore kept every player's last upload forever (including 0s sent on launch), so
// "Today" listed everyone who ever ascended. One board per UTC day fixes that.
const getDailyLeaderboardName = (utcDateStamp: string = getCurrentUtcDateStamp()): string =>
  `${MAX_ASCENSION_DAILY_LEADERBOARD}_${utcDateStamp}`;

export default function GamePage() {
  const { t, language } = useI18n();
  const l = useCallback((en: string, tr: string, pt: string, es?: string, ru?: string) => (
    localizeInlineText(language, en, tr, pt, es, ru)
  ), [language]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPrestigeOpen, setIsPrestigeOpen] = useState(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isCosmeticsOpen, setIsCosmeticsOpen] = useState(false);
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
  const [isParagonLabOpen, setIsParagonLabOpen] = useState(false);
  const [leaderboardEntries, setLeaderboardEntries] = useState<SteamLeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [friendsLeaderboardEntries, setFriendsLeaderboardEntries] = useState<SteamLeaderboardEntry[]>([]);
  const [friendsLeaderboardLoading, setFriendsLeaderboardLoading] = useState(false);
  const [friendsLeaderboardError, setFriendsLeaderboardError] = useState<string | null>(null);
  const [dailyLeaderboardEntries, setDailyLeaderboardEntries] = useState<SteamLeaderboardEntry[]>([]);
  const [dailyLeaderboardLoading, setDailyLeaderboardLoading] = useState(false);
  const [dailyLeaderboardError, setDailyLeaderboardError] = useState<string | null>(null);
  const [endlessLeaderboardEntries, setEndlessLeaderboardEntries] = useState<SteamLeaderboardEntry[]>([]);
  const [endlessLeaderboardLoading, setEndlessLeaderboardLoading] = useState(false);
  const [endlessLeaderboardError, setEndlessLeaderboardError] = useState<string | null>(null);
  const [isFinaleEncounter, setIsFinaleEncounter] = useState(false);
  const [showFinaleCredits, setShowFinaleCredits] = useState(false);
  const lastSubmittedEndlessRef = React.useRef(-1);
  const [celebration, setCelebration] = useState<{ kind: CelebrationKind; title?: string; subtitle?: string; key: number } | null>(null);
  const [dailyFriendsLeaderboardEntries, setDailyFriendsLeaderboardEntries] = useState<SteamLeaderboardEntry[]>([]);
  const [dailyFriendsLeaderboardLoading, setDailyFriendsLeaderboardLoading] = useState(false);
  const [dailyFriendsLeaderboardError, setDailyFriendsLeaderboardError] = useState<string | null>(null);
  const [leaderboardMyRank, setLeaderboardMyRank] = useState<number | null>(null);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState<'global' | 'friends'>('global');
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'today' | 'all_time' | 'endless'>('all_time');
  const [reduceSceneGlow, setReduceSceneGlow] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(REDUCE_SCENE_GLOW_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const lastSubmittedAscensionRef = React.useRef<number>(-1);
  const lastSubmittedDailyAscensionRef = React.useRef<number>(-1);
  const lastSubmittedDailyDateRef = React.useRef<string>('');
  const leaderboardDevClearAttemptedRef = React.useRef(false);
  const lootBoxOpeningTimeoutsRef = React.useRef<Array<ReturnType<typeof setTimeout>>>([]);
    const { 
      resources, upgrades, clickResource, clickResourceBurst, buyUpgrade, sellResource, sellAllResource, playSound, 
      lastUpgradeInfo, setLastUpgradeInfo, getUpgradePreview, addDebugData, addDebugData100k, 
      addDebugCredits, addDebugCrypto, addDebugPrestige, addDebugAscensionCount, setDebugTime, 
      spawnDebugPickup, spawnAllDebugPickups, forceDebugTimeWarp, getTotalCritChance, getBulkProductionGain, masterVolume, 
      toggleMasterVolume, musicVolume, setMusicVolume, sfxVolume, setSfxVolume, isMusicPlaying, 
      toggleMusic, skipTrack, elapsedTime, floatingPickups, setPickupSpawningPaused, ascend, ascendVictory, ascendDefeat, 
      getPrestigeGain, buyPrestigeUpgrade, buyPrestigeUpgradeMax, upgradePaceDelayMultiplier, automation, setAutomation, challenges, startChallenge, abandonChallenge, finale, completeFinale, recordFinaleDefeat, clearCoreSignal, setAbyssVariant, whatsNew, markWhatsNewSeen, claimWelcomeGift, onPickupClick, prestigeUpgrades, onCritPickupClick, removeFloatingPickup,
      achievements, stats, newlyUnlockedAchievement, newlyUnlockedAscensionPet, newlyUnlockedTutorialReward, claimAscensionPetUnlock, claimTutorialRewardUnlock, equipAscensionPetUnlock, claimAchievementReward, claimAllAchievements, 
      unclaimedAchievements, autoClickBoostEndTime, critBoostEndTime, activeTimeWarpMiniGame, timeWarpFeedback, clearTimeWarpFeedback, onTimeWarpMiniGameClick, cosmetics, buyCosmetic, 
      buyCryptoRelic, buyBlackMarketUpgrade, buyParagonUpgrade, getParagonUpgradeLevel, equipCosmetic, getActiveSkin, getActiveTheme, getActiveAccessory, getActiveCape, getActiveWing, getActiveHeadStyle, 
      getActivePet, getActiveAscensionPet, getActiveClickEffect, getActiveLootBoxSkin, getActiveMachineBoxSkin, getPetBoosts, getAdjacencyFormationBonus, getDataPerClick, offlineProgress, 
      clearOfflineProgress, contracts, refreshContracts, updateContractProgress, 
      claimContractReward, roomLayout, updateMachinePosition, removeMachinePosition, 
      getMachinePosition, tutorial, startTutorial, skipTutorial, resetTutorial, 
      completeTutorialObjective, getCurrentTutorialPhase, isTutorialComplete, saveGame, 
      resetGame, setFullscreen, setWindowed, 
      saveLoadError, retrySaveLoad, continueWithoutUnreadableSave, openSaveFolder 
    } = useGame();
  usePublishLiveResources(resources.data.amount, resources.credits.amount, resources.data.perSecond);

  const currentTutorialPhase = useMemo(() => getCurrentTutorialPhase(), [getCurrentTutorialPhase]);
  const currentUtcCycleKey = useMemo(() => getCurrentUtcDateStamp(), []);
  const currentDailyAscensionScore = useMemo(() => (
    stats.dailyAscensionDate === currentUtcCycleKey ? stats.dailyAscensions : 0
  ), [currentUtcCycleKey, stats.dailyAscensionDate, stats.dailyAscensions]);
  const conversionDataCost = useMemo(() => {
    const nodeConversionPercent = Object.entries(cosmetics.paragonLevels || {}).reduce((total, [upgradeId, rawLevel]) => {
      const upgrade = PARAGON_UPGRADES.find(item => item.id === upgradeId);
      if (!upgrade || upgrade.effect.type !== 'node_conversion_pct') return total;
      const level = Math.max(0, Math.floor(rawLevel || 0));
      return total + upgrade.effect.value * level;
    }, 0);

    return Math.max(40, Math.floor(100 * Math.max(0.4, 1 - nodeConversionPercent / 100)));
  }, [cosmetics.paragonLevels]);
  const conversionNodeGain = useMemo(() => {
    const sellBoost = prestigeUpgrades.reduce((total, upgrade) => {
      if (upgrade.count <= 0 || upgrade.effect.type !== 'sell_boost') return total;
      return total + upgrade.effect.value * upgrade.count;
    }, 0);

    return 1 + sellBoost;
  }, [prestigeUpgrades]);
  const activeTutorialObjectiveId = useMemo(() => {
    if (!currentTutorialPhase) return null;
    const activeObjective = currentTutorialPhase.objectives.find(obj => !obj.completed);
    return activeObjective?.id ?? null;
  }, [currentTutorialPhase]);

  const handleQuit = async () => {
    await saveGame();
    window.close();
    // Fallback if window.close() is blocked (common in browsers)
    setTimeout(() => {
      window.location.href = 'about:blank';
    }, 100);
  };

  const tutorialRewardTypeLabel = useCallback((reward: TutorialReward | null): string => {
    if (!reward) return l('Cosmetic', 'Kozmetik', 'Cosmético');
    return getTutorialRewardTypeLabel(reward.cosmeticType, language);
  }, [l, language]);

  // Auto-open right panel when player has enough data to buy/convert (10+)
  // or when tutorial reaches "buy your first upgrade".
  useEffect(() => {
    const shouldOpenForTutorial = activeTutorialObjectiveId === 'buy_first_upgrade';
    if ((resources.data.amount >= 10 || shouldOpenForTutorial) && !userClosedRightPanel) {
      setRightPanelOpen(true);
    }
  }, [activeTutorialObjectiveId, resources.data.amount, userClosedRightPanel]);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(REDUCE_SCENE_GLOW_STORAGE_KEY, String(reduceSceneGlow));
    } catch {
      // Preference persistence is optional.
    }
  }, [reduceSceneGlow]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!rightPanelOpen || activeUpgradeTab !== 'click_upgrades') return;

    try {
      if (window.localStorage.getItem(CLICK_TAB_MINING_HINT_STORAGE_KEY) === 'true') return;
      window.localStorage.setItem(CLICK_TAB_MINING_HINT_STORAGE_KEY, 'true');
    } catch {
      // Notification persistence is optional.
    }

    toast({
      duration: 9000,
      title: l(
        'Mining unlock inside',
        'Madencilik kilidi burada',
        'Desbloqueio de mineração aqui',
        'Desbloqueo de minería aquí'
      ),
      description: l(
        'This Click segment contains an upgrade that unlocks the Mining segment. Watch for the mining unlock card here.',
        'Bu Tıklama segmentinde Madencilik segmentini açan bir yükseltme var. Burada madencilik kilidi kartına dikkat et.',
        'Este segmento de Clique contem uma melhoria que desbloqueia o segmento de Mineração. Fique de olho na carta de desbloqueio de mineração aqui.',
        'Este segmento de Clic contiene una mejora que desbloquea el segmento de Minería. Busca aquí la carta que desbloquea minería.'
      ),
    });
  }, [activeUpgradeTab, l, rightPanelOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isBossEncounterActive) return;
    if (stats.totalAscensions < 1 || resources.prestige.amount <= 0) return;

    try {
      if (window.localStorage.getItem(FIRST_ASCENSION_PRESTIGE_HINT_STORAGE_KEY) === 'true') return;
      window.localStorage.setItem(FIRST_ASCENSION_PRESTIGE_HINT_STORAGE_KEY, 'true');
    } catch {
      // Notification persistence is optional.
    }

    toast({
      duration: 10000,
      title: l(
        'Spend your Prestige Points',
        'Prestij Puanlarını harca',
        'Gaste seus Pontos de Prestígio',
        'Gasta tus Puntos de Prestigio'
      ),
      description: l(
        'Your first ascension granted Prestige Points. Open the Prestige shop and spend them for permanent power.',
        'İlk yükselişin Prestij Puanı verdi. Kalıcı güç için Prestij dükkânını açıp harca.',
        'Sua primeira ascensão concedeu Pontos de Prestígio. Abra a loja de Prestígio e gaste-os para ganhar poder permanente.',
        'Tu primera ascensión te dio Puntos de Prestigio. Abre la tienda de Prestigio y gastalos para obtener poder permanente.'
      ),
      action: (
        <ToastAction
          altText={l('Open Prestige', 'Prestiji Aç', 'Abrir Prestígio', 'Abrir Prestigio')}
          onClick={() => {
            setIsPrestigeOpen(true);
            playSound('prestige_realm');
          }}
        >
          {l('Open', 'Aç', 'Abrir', 'Abrir')}
        </ToastAction>
      ),
    });
  }, [isBossEncounterActive, l, playSound, resources.prestige.amount, stats.totalAscensions]);

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

  const handleSetReduceSceneGlow = useCallback((reduced: boolean) => {
    setReduceSceneGlow(reduced);
  }, []);

  const handleOpenSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const handleOpenAchievements = useCallback(() => {
    startTransition(() => setIsAchievementsOpen(true));
  }, []);

  const handleOpenStats = useCallback(() => {
    startTransition(() => setIsStatsOpen(true));
  }, []);

  const handleOpenLeaderboard = useCallback(() => {
    startTransition(() => setIsLeaderboardOpen(true));
  }, []);

  const handleOpenCosmetics = useCallback(() => {
    playSound('open_cosmetics');
    startTransition(() => setIsCosmeticsOpen(true));
  }, [playSound]);

  const handleOpenPrestige = useCallback(() => {
    playSound('prestige_realm');
    startTransition(() => setIsPrestigeOpen(true));
  }, [playSound]);

  const handleOpenCryptoRelicShop = useCallback(() => {
    playSound('buy_black');
    startTransition(() => setIsCryptoRelicShopOpen(true));
  }, [playSound]);

  const handleOpenBlackMarket = useCallback(() => {
    playSound('buy_black');
    startTransition(() => setIsBlackMarketOpen(true));
  }, [playSound]);

  const handleOpenParagonLab = useCallback(() => {
    playSound('buy_black');
    startTransition(() => setIsParagonLabOpen(true));
  }, [playSound]);

  const handleClearAchievementToast = useCallback(() => {
    setAchievementUnlocked(false);
  }, []);

  const handleClearPickupToast = useCallback(() => {
    setPickupCollected(false);
  }, []);

  const handleClearLastUpgradeInfo = useCallback(() => {
    setLastUpgradeInfo(null);
  }, [setLastUpgradeInfo]);

  const skipBossFightRef = React.useRef<() => boolean>(() => false);
  const [showDemoEnd, setShowDemoEnd] = useState(false);
  // Demo: once the ascension cap is reached (win or loss), the end screen stays, also after a relaunch.
  useEffect(() => {
    if (!IS_DEMO_BUILD || stats.totalAscensions < DEMO_ASCENSION_LIMIT) return;
    // Right after the ascension, let the ASCENDED celebration finish first; on load show it at once.
    const delay = performance.now() < 15000 ? 0 : 3500;
    const id = setTimeout(() => setShowDemoEnd(true), delay);
    return () => clearTimeout(id);
  }, [stats.totalAscensions]);
  const handleStartBossEncounter = useCallback(() => {
    if (skipBossFightRef.current()) return;
    setIsBossEncounterActive(true);
  }, []);

  const celebrate = useCallback((kind: CelebrationKind, title?: string, subtitle?: string) => {
    setCelebration({ kind, title, subtitle, key: Date.now() });
    playSound(kind === 'finale' ? 'finale' : kind === 'legendary' ? 'legendary' : kind === 'shop' ? 'shop_unlock' : 'celebrate');
  }, [playSound]);

  const currentBossVariant: BossVariant = useMemo(() => getBossVariant(stats.totalAscensions), [stats.totalAscensions]);
  // v1.04: permanent click power (Eternal Strike + Paragon click modules), part of which becomes boss damage.
  const permanentClickPercent = useMemo(() => {
    const prestigeClick = prestigeUpgrades.reduce((sum, upgrade) => (upgrade.effect.type === 'click_boost' ? sum + upgrade.effect.value * upgrade.count * 100 : sum), 0);
    return prestigeClick + computeParagonBonuses(cosmetics.paragonLevels).clickBoostPercent;
  }, [prestigeUpgrades, cosmetics.paragonLevels]);
  const handleAscendVictory = (variant: BossVariant) => {
    const reward = ascendVictory(variant.kind === 'echo' ? ECHO_PRESTIGE_MULTIPLIER : 1);
    if (variant.kind === 'signal') {
      clearCoreSignal();
      celebrate('legendary', pick6(language, ['CORE SIGNAL SILENCED', 'ÇEKİRDEK SİNYALİ SUSTURULDU', 'SINAL DO NÚCLEO SILENCIADO', 'SEÑAL DEL NÚCLEO SILENCIADA', 'СИГНАЛ ЯДРА ЗАГЛУШЕН', '核心信号已压制']), pick6(language, ['The final Core loses 15% HP', 'Son Çekirdek %15 can kaybeder', 'O Núcleo final perde 15% de vida', 'El Núcleo final pierde un 15% de vida', 'Финальное Ядро теряет 15% HP', '最终核心生命 -15%']));
    } else if (variant.kind === 'echo') {
      celebrate('legendary', pick6(language, ['CORE ECHO SHATTERED', 'ÇEKİRDEK YANKISI KIRILDI', 'ECO DO NÚCLEO DESTRUÍDO', 'ECO DEL NÚCLEO DESTRUIDO', 'ЭХО ЯДРА РАЗБИТО', '核心回响已粉碎']), pick6(language, ['x1.5 prestige', 'x1.5 prestij', 'x1,5 prestígio', 'x1,5 prestigio', 'x1,5 престижа', 'x1.5 声望']));
    } else {
      celebrate('ascend', l('ASCENDED', 'YÜKSELDİN', 'ASCENDEU', 'ASCENDISTE'));
    }
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
  };
  skipBossFightRef.current = () => {
    // Demo: no ascension past the limit; show the end screen instead.
    if (IS_DEMO_BUILD && stats.totalAscensions >= DEMO_ASCENSION_LIMIT) { setShowDemoEnd(true); return true; }
    if (!shouldSkipBossFight(stats.totalAscensions, automation.autoBuy || automation.autoAscend)) return false;
    handleAscendVictory(currentBossVariant);
    return true;
  };

  // Celebrate each new system the moment its ascension requirement is reached (not on load).
  const celebratedAscensionRef = React.useRef<number | null>(null);
  useEffect(() => {
    const previous = celebratedAscensionRef.current;
    celebratedAscensionRef.current = stats.totalAscensions;
    // Only a real ascension (+1) celebrates; loading a save jumps from 0 to the saved count.
    if (previous === null || stats.totalAscensions - previous !== 1) return;
    const unlocks: Array<[number, string]> = [
      [5, l('Relic Shop unlocked', 'Relik Dükkanı açıldı', 'Loja de Relíquias liberada', 'Tienda de Reliquias desbloqueada')],
      [10, l('Black Market unlocked', 'Karaborsa açıldı', 'Mercado Negro liberado', 'Mercado Negro desbloqueado')],
      [15, l('Automation unlocked', 'Otomasyon açıldı', 'Automação liberada', 'Automatización desbloqueada')],
      [20, l('Paragon Lab unlocked', 'Paragon Lab açıldı', 'Paragon Lab liberado', 'Paragon Lab desbloqueado')],
      [30, l('Challenges unlocked', 'Meydan okumalar açıldı', 'Desafios liberados', 'Desafíos desbloqueados')],
      [40, l('Overclock tier unlocked', 'Overclock seviyesi açıldı', 'Nível Overclock liberado', 'Nivel Overclock desbloqueado')],
      [50, l('The Core awaits', 'Çekirdek seni bekliyor', 'O Núcleo te espera', 'El Núcleo te espera')],
    ];
    const reached = unlocks.filter(([level]) => previous < level && stats.totalAscensions >= level).pop();
    if (reached) celebrate('shop', reached[1]);
  }, [stats.totalAscensions, celebrate, l]);

  // Test builds only: Ctrl+Shift+F9 toggles a popup-free room view for screenshots.
  useEffect(() => {
    if (!IS_TEST_BUILD) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'F9') {
        document.body.dataset.devRoomView = document.body.dataset.devRoomView === '1' ? '0' : '1';
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!isSteamAvailable() || DISABLE_STEAM_LEADERBOARD_UPLOADS || !finale.completed) return;
    const depth = getEndlessDepth(stats.totalAscensions);
    if (depth === lastSubmittedEndlessRef.current) return;
    lastSubmittedEndlessRef.current = depth;
    void setSteamLeaderboardScore(ENDLESS_LEADERBOARD, depth, { keepBest: true });
  }, [finale.completed, stats.totalAscensions]);

  const refreshLeaderboard = useCallback(async (
    mode: 'global' | 'friends' = 'global',
    period: 'today' | 'all_time' | 'endless' = 'all_time',
    limit: number = LEADERBOARD_PANEL_LIMIT
  ) => {
    const isToday = period === 'today';
    const isEndless = period === 'endless';
    const boardName = isToday ? getDailyLeaderboardName() : isEndless ? ENDLESS_LEADERBOARD : MAX_ASCENSION_LEADERBOARD;

    const setEntries =
      isEndless ? setEndlessLeaderboardEntries :
      mode === 'global'
        ? (isToday ? setDailyLeaderboardEntries : setLeaderboardEntries)
        : (isToday ? setDailyFriendsLeaderboardEntries : setFriendsLeaderboardEntries);
    const setLoading =
      isEndless ? setEndlessLeaderboardLoading :
      mode === 'global'
        ? (isToday ? setDailyLeaderboardLoading : setLeaderboardLoading)
        : (isToday ? setDailyFriendsLeaderboardLoading : setFriendsLeaderboardLoading);
    const setError =
      isEndless ? setEndlessLeaderboardError :
      mode === 'global'
        ? (isToday ? setDailyLeaderboardError : setLeaderboardError)
        : (isToday ? setDailyFriendsLeaderboardError : setFriendsLeaderboardError);

    if (!isSteamAvailable()) {
      setEntries([]);
      setError(l('Steam not connected', 'Steam bağlı değil', 'Steam não conectado', 'Steam no conectado'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await getSteamLeaderboardEntries(boardName, { limit, mode });
      if (!result.ok) {
        setEntries([]);
        setError(
          result.reason
            || l(
              `Failed to load ${mode} ${period} leaderboard`,
              `${mode === 'friends' ? 'Arkadaş' : 'Genel'} ${period === 'today' ? 'günlük' : 'tüm zamanlar'} liderlik tablosu yüklenemedi`,
              `Falha ao carregar o placar ${mode} ${period}`,
            )
        );
      } else {
        setEntries(result.entries);
      }
    } finally {
      setLoading(false);
    }
  }, [l]);

  const handleRefreshLeaderboardPanel = useCallback(() => {
    void refreshLeaderboard('global', 'all_time', LEADERBOARD_PANEL_LIMIT);
  }, [refreshLeaderboard]);

  const handleRefreshContracts = useCallback(() => {
    refreshContracts();
  }, [refreshContracts]);

  useEffect(() => {
    void refreshLeaderboard('global', 'all_time', LEADERBOARD_PANEL_LIMIT);
    const intervalId = setInterval(() => {
      void refreshLeaderboard('global', 'all_time', LEADERBOARD_PANEL_LIMIT);
    }, 45000);
    return () => clearInterval(intervalId);
  }, [refreshLeaderboard]);

  useEffect(() => {
    if (!isLeaderboardOpen) return;
    void refreshLeaderboard(leaderboardTab, leaderboardPeriod, LEADERBOARD_MODAL_LIMIT);
  }, [isLeaderboardOpen, leaderboardTab, leaderboardPeriod, refreshLeaderboard]);

  useEffect(() => {
    if (!isSteamAvailable()) return;
    if (!DISABLE_STEAM_LEADERBOARD_UPLOADS || !CLEAR_STEAM_LEADERBOARD_ONCE) return;
    if (leaderboardDevClearAttemptedRef.current) return;

    leaderboardDevClearAttemptedRef.current = true;

    try {
      if (typeof window !== 'undefined' && window.localStorage.getItem(DEV_LEADERBOARD_CLEAR_STORAGE_KEY) === 'true') {
        return;
      }
    } catch {
      // Local-only marker is optional.
    }

    void (async () => {
      const [allTimeResult, dailyResult] = await Promise.all([
        setSteamLeaderboardScore(MAX_ASCENSION_LEADERBOARD, 0, { keepBest: false }),
        setSteamLeaderboardScore(getDailyLeaderboardName(), 0, { keepBest: false }),
      ]);

      if (allTimeResult.ok && dailyResult.ok) {
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(DEV_LEADERBOARD_CLEAR_STORAGE_KEY, 'true');
          }
        } catch {
          // Local-only marker is optional.
        }

        setLeaderboardMyRank(null);
        await Promise.all([
          refreshLeaderboard('global', 'all_time', LEADERBOARD_PANEL_LIMIT),
          refreshLeaderboard('global', 'today', LEADERBOARD_PANEL_LIMIT),
        ]);
      } else {
        leaderboardDevClearAttemptedRef.current = false;
      }
    })();
  }, [refreshLeaderboard]);

  useEffect(() => {
    if (!isSteamAvailable()) return;
    if (DISABLE_STEAM_LEADERBOARD_UPLOADS) return;

    const now = new Date();
    const currentDailyDate = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`;
    const allTimeScore = stats.totalAscensions;
    const dailyScore = stats.dailyAscensionDate === currentDailyDate ? stats.dailyAscensions : 0;

    const shouldSubmitAllTime = allTimeScore !== lastSubmittedAscensionRef.current;
    // Only players who actually ascended today belong on today's board (no 0 entries).
    const shouldSubmitDaily =
      dailyScore > 0 &&
      (
        dailyScore !== lastSubmittedDailyAscensionRef.current ||
        currentDailyDate !== lastSubmittedDailyDateRef.current
      );

    if (!shouldSubmitAllTime && !shouldSubmitDaily) return;

    if (shouldSubmitAllTime) {
      lastSubmittedAscensionRef.current = allTimeScore;
    }
    if (shouldSubmitDaily) {
      lastSubmittedDailyAscensionRef.current = dailyScore;
      lastSubmittedDailyDateRef.current = currentDailyDate;
    }

    void (async () => {
      const submissions: Array<Promise<any>> = [
        shouldSubmitAllTime
          ? setSteamLeaderboardScore(MAX_ASCENSION_LEADERBOARD, allTimeScore, { keepBest: true }) // best ever; Reset Data must not erase it
          : Promise.resolve({ ok: true, skipped: true }),
        shouldSubmitDaily
          ? setSteamLeaderboardScore(getDailyLeaderboardName(currentDailyDate), dailyScore, { keepBest: false })
          : Promise.resolve({ ok: true, skipped: true }),
      ];
      const [allTimeResult, dailyResult] = await Promise.all(submissions);

      if (!allTimeResult.ok && !dailyResult.ok) {
        if (shouldSubmitAllTime) {
          lastSubmittedAscensionRef.current = allTimeScore - 1;
        }
        if (shouldSubmitDaily) {
          lastSubmittedDailyAscensionRef.current = -1;
          lastSubmittedDailyDateRef.current = '';
        }
        return;
      }
      if (shouldSubmitAllTime && !allTimeResult.ok) {
        lastSubmittedAscensionRef.current = allTimeScore - 1;
      }
      if (shouldSubmitDaily && !dailyResult.ok) {
        lastSubmittedDailyAscensionRef.current = -1;
        lastSubmittedDailyDateRef.current = '';
      }
      if (typeof allTimeResult.globalRankNew === 'number' && allTimeResult.globalRankNew > 0) {
        setLeaderboardMyRank(allTimeResult.globalRankNew);
      }
      await Promise.all([
        refreshLeaderboard('global', 'all_time', LEADERBOARD_PANEL_LIMIT),
        refreshLeaderboard('global', 'today', LEADERBOARD_PANEL_LIMIT),
      ]);
    })();
  }, [refreshLeaderboard, stats.totalAscensions]);

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
  // v1.04 CPU: the getters return a fresh localized object on every call. Memoize so the room view's
  // memo checks hold (they were failing on every tick and re-rendering the whole room).
  const equippedSkin = useMemo(() => getActiveSkin(), [getActiveSkin]);
  const equippedTheme = useMemo(() => getActiveTheme(), [getActiveTheme]);
  const equippedAccessory = useMemo(() => getActiveAccessory(), [getActiveAccessory]);
  const equippedCape = useMemo(() => getActiveCape(), [getActiveCape]);
  const equippedWing = useMemo(() => getActiveWing(), [getActiveWing]);
  const equippedHeadStyle = useMemo(() => getActiveHeadStyle(), [getActiveHeadStyle]);
  const equippedPet = useMemo(() => getActivePet(), [getActivePet]);
  const equippedAscensionPet = useMemo(() => getActiveAscensionPet(), [getActiveAscensionPet]);
  const equippedClickEffect = useMemo(() => getActiveClickEffect(), [getActiveClickEffect]);
  const equippedLootBoxSkin = useMemo(() => getActiveLootBoxSkin(), [getActiveLootBoxSkin]);
  const equippedMachineBoxSkin = useMemo(() => getActiveMachineBoxSkin(), [getActiveMachineBoxSkin]);
  const activeLootBoxColors = equippedLootBoxSkin.colors;
  const isBlackMarketUnlockedByUpgrade = useMemo(
    () => (upgrades.find(u => u.id === 'unlock_black_market')?.count ?? 0) > 0,
    [upgrades]
  );
  const resourceAchievementCount = useMemo(() => ({
    unlocked: achievements.filter(a => a.unlocked).length,
    total: achievements.filter(a => !a.hidden || a.unlocked).length,
  }), [achievements]);
  const mainViewThemeColors = useMemo(
    // Room era: the theme is re-tinted every 10 ascensions.
    () => ({ ...shiftThemeColorsForEra(equippedTheme.colors, stats.totalAscensions), orbitalPlanet: equippedTheme.orbitalPlanet }),
    [equippedTheme, stats.totalAscensions]
  );
  const mainViewSkinPalette = useMemo(
    () => ({
      ...equippedSkin.palette,
      paletteMode: equippedSkin.paletteMode,
      gradientColors: equippedSkin.gradientColors,
      animationSpeed: equippedSkin.animationSpeed,
    }),
    [equippedSkin]
  );
  const mainViewMachineBoxSkin = useMemo(
    () => ({
      id: equippedMachineBoxSkin.id,
      colors: equippedMachineBoxSkin.colors,
    }),
    [equippedMachineBoxSkin]
  );
  const isCryptoRelicShopUnlocked = stats.totalAscensions >= CRYPTO_RELIC_SHOP_UNLOCK_ASCENSION;
  const isBlackMarketUnlocked = stats.totalAscensions >= BLACK_MARKET_UNLOCK_ASCENSION;
  const isParagonLabUnlocked = stats.totalAscensions >= PARAGON_LAB_UNLOCK_ASCENSION;
  const adjacencyFormationBonus = getAdjacencyFormationBonus();
  const localizedCharacterSkins = useMemo(() => CHARACTER_SKINS.map(item => localizeCatalogEntry(item, language)), [language]);
  const localizedRoomThemes = useMemo(() => ROOM_THEMES.map(item => localizeCatalogEntry(item, language)), [language]);
  const localizedCharacterAccessories = useMemo(() => CHARACTER_ACCESSORIES.map(item => localizeCatalogEntry(item, language)), [language]);
  const localizedCharacterHeadStyles = useMemo(() => CHARACTER_HEAD_STYLES.map(item => localizeCatalogEntry(item, language)), [language]);
  const localizedCharacterPets = useMemo(() => CHARACTER_PETS.map(item => localizeCatalogEntry(item, language)), [language]);
  const localizedAscensionPets = useMemo(() => ASCENSION_PETS.map(item => localizeCatalogEntry(item, language)), [language]);
  const localizedAscensionSkins = useMemo(() => ASCENSION_SKINS.map(item => localizeCatalogEntry(item, language)), [language]);
  const localizedAscensionHeadStyles = useMemo(() => ASCENSION_HEAD_STYLES.map(item => localizeCatalogEntry(item, language)), [language]);
  const localizedAscensionAccessories = useMemo(() => ASCENSION_ACCESSORIES.map(item => localizeCatalogEntry(item, language)), [language]);
  const localizedAscensionRoomThemes = useMemo(() => ASCENSION_ROOM_THEMES.map(item => localizeCatalogEntry(item, language)), [language]);
  const localizedClickEffects = useMemo(() => CLICK_EFFECTS.map(item => localizeCatalogEntry(item, language)), [language]);
  const localizedLootBoxSkins = useMemo(() => LOOT_BOX_SKINS.map(item => localizeCatalogEntry(item, language)), [language]);
  const localizedMachineBoxSkins = useMemo(() => MACHINE_BOX_SKINS.map(item => localizeCatalogEntry(item, language)), [language]);
  const localizedCryptoRelicTree = useMemo(() => CRYPTO_RELIC_TREE.map(item => localizeCatalogEntry(item, language)), [language]);
  const localizedBlackMarketCapes = useMemo(() => BLACK_MARKET_CAPES.map(item => localizeCatalogEntry(item, language)), [language]);
  const localizedBlackMarketWings = useMemo(() => BLACK_MARKET_WINGS.map(item => localizeCatalogEntry(item, language)), [language]);
  const localizedBlackMarketUpgrades = useMemo(() => BLACK_MARKET_UPGRADES.map(item => localizeCatalogEntry(item, language)), [language]);
  const localizedParagonUpgrades = useMemo(() => PARAGON_UPGRADES.map(item => localizeCatalogEntry(item, language)), [language]);

  const tutorialRewardSkinPreview = useMemo(() => {
    if (!newlyUnlockedTutorialReward) return null;
    if (newlyUnlockedTutorialReward.cosmeticType !== 'skin') return null;
    return localizedCharacterSkins.find(item => item.id === newlyUnlockedTutorialReward.itemId) || null;
  }, [localizedCharacterSkins, newlyUnlockedTutorialReward]);

  const localizedTutorialRewardInfo = useMemo(() => {
    if (!newlyUnlockedTutorialReward) return null;
    const id = newlyUnlockedTutorialReward.itemId;
    if (newlyUnlockedTutorialReward.cosmeticType === 'skin') return localizedCharacterSkins.find(item => item.id === id) || localizedAscensionSkins.find(item => item.id === id) || null;
    if (newlyUnlockedTutorialReward.cosmeticType === 'theme') return localizedRoomThemes.find(item => item.id === id) || localizedAscensionRoomThemes.find(item => item.id === id) || null;
    if (newlyUnlockedTutorialReward.cosmeticType === 'accessory') return localizedCharacterAccessories.find(item => item.id === id) || localizedAscensionAccessories.find(item => item.id === id) || null;
    if (newlyUnlockedTutorialReward.cosmeticType === 'headstyle') return localizedCharacterHeadStyles.find(item => item.id === id) || localizedAscensionHeadStyles.find(item => item.id === id) || null;
    return localizedCharacterPets.find(item => item.id === id) || localizedAscensionPets.find(item => item.id === id) || null;
  }, [
    localizedAscensionAccessories,
    localizedAscensionHeadStyles,
    localizedAscensionPets,
    localizedAscensionRoomThemes,
    localizedAscensionSkins,
    localizedCharacterAccessories,
    localizedCharacterHeadStyles,
    localizedCharacterPets,
    localizedCharacterSkins,
    localizedRoomThemes,
    newlyUnlockedTutorialReward,
  ]);

  const ascensionPetBoostLines = useMemo(() => (
    newlyUnlockedAscensionPet ? getBoostLines(newlyUnlockedAscensionPet.boost, language) : []
  ), [language, newlyUnlockedAscensionPet]);

  const tutorialRewardPreview = useMemo(() => {
    if (!tutorialRewardSkinPreview) return null;

    return (
      <div className="h-[120px] flex items-center justify-center overflow-hidden rounded bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.14),rgba(2,6,23,0.9)_70%)]">
        <div style={{ transform: 'scale(3.4)' }}>
          <CSSCharacter
            reaction="idle"
            facingRight={true}
            skinPalette={{
              ...tutorialRewardSkinPreview.palette,
              paletteMode: tutorialRewardSkinPreview.paletteMode,
              gradientColors: tutorialRewardSkinPreview.gradientColors,
              animationSpeed: tutorialRewardSkinPreview.animationSpeed,
            }}
            accessoryId="none"
            headStyleId="default"
          />
        </div>
      </div>
    );
  }, [tutorialRewardSkinPreview]);

  const marketSkins = useMemo(() => localizedCharacterSkins.filter(item => !item.isRelicShopOnly), [localizedCharacterSkins]);
  const marketAccessories = useMemo(() => localizedCharacterAccessories.filter(item => !item.isRelicShopOnly), [localizedCharacterAccessories]);
  const marketHeadStyles = useMemo(() => localizedCharacterHeadStyles.filter(item => !item.isRelicShopOnly), [localizedCharacterHeadStyles]);
  const paragonEliteSkins = useMemo(
    () => localizedAscensionSkins.filter(item => item.id.startsWith('paragon_')),
    [localizedAscensionSkins]
  );
  const paragonEliteHeadStyles = useMemo(
    () => localizedAscensionHeadStyles.filter(item => item.id.startsWith('paragon_')),
    [localizedAscensionHeadStyles]
  );
  const paragonEliteAccessories = useMemo(
    () => localizedAscensionAccessories.filter(item => item.id.startsWith('paragon_')),
    [localizedAscensionAccessories]
  );
  const paragonEliteThemes = useMemo(
    () => localizedAscensionRoomThemes.filter(item => item.id.startsWith('paragon_')),
    [localizedAscensionRoomThemes]
  );
  const paragonPreviewPalette = useMemo(
    () => localizedCharacterSkins.find(item => item.id === 'cyan_pulse')?.palette ?? localizedCharacterSkins[0].palette,
    [localizedCharacterSkins]
  );
  const paragonEliteOffers = useMemo(() => {
    const skinOffers = paragonEliteSkins.map(item => ({
      id: item.id,
      slot: 'skin' as const,
      name: item.name,
      description: item.description,
      price: item.price,
      rarity: item.rarity,
      boost: item.boost,
      skinPalette: item.palette,
    }));
    const headOffers = paragonEliteHeadStyles.map(item => ({
      id: item.id,
      slot: 'headstyle' as const,
      name: item.name,
      description: item.description,
      price: item.price,
      rarity: item.rarity,
      boost: item.boost,
    }));
    const accessoryOffers = paragonEliteAccessories.map(item => ({
      id: item.id,
      slot: 'accessory' as const,
      name: item.name,
      description: item.description,
      price: item.price,
      rarity: item.rarity,
      boost: item.boost,
    }));
    const themeOffers = paragonEliteThemes.map(item => ({
      id: item.id,
      slot: 'theme' as const,
      name: item.name,
      description: item.description,
      price: item.price,
      rarity: item.rarity,
      boost: item.boost,
      themeColors: item.colors,
    }));
    return [...skinOffers, ...headOffers, ...accessoryOffers, ...themeOffers].sort((a, b) => a.price - b.price);
  }, [paragonEliteAccessories, paragonEliteHeadStyles, paragonEliteSkins, paragonEliteThemes]);

  const renderParagonOfferPreview = useCallback((offer: (typeof paragonEliteOffers)[number]) => {
    if (offer.id === 'paragon_apex_core') {
      return (
        <div className="relative mx-auto h-16 w-14">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-4 w-6 rounded-t-[10px] border border-cyan-300/80 bg-slate-950 shadow-[0_0_14px_rgba(34,211,238,0.45)]" />
          <div className="absolute left-1/2 top-4 -translate-x-1/2 h-9 w-8 rounded-md border border-cyan-300 bg-[linear-gradient(180deg,#10263d_0%,#1d4ed8_50%,#0f172a_100%)] shadow-[0_0_18px_rgba(34,211,238,0.3)]">
            <div className="absolute inset-x-1.5 top-1.5 h-5 rounded-sm border border-fuchsia-300/70 bg-[radial-gradient(circle_at_50%_32%,rgba(244,114,182,0.92),rgba(34,211,238,0.18)_72%)]" />
            <div className="absolute inset-x-2 bottom-1.5 h-1 rounded-full bg-cyan-300/80" />
          </div>
          <div className="absolute left-1 top-7 h-7 w-2 rounded-full border border-cyan-400/80 bg-cyan-300/10" />
          <div className="absolute right-1 top-7 h-7 w-2 rounded-full border border-cyan-400/80 bg-cyan-300/10" />
        </div>
      );
    }

    if (offer.id === 'paragon_quantum_crown') {
      return (
        <svg viewBox="0 0 40 34" className="mx-auto h-16 w-14">
          <path d="M7 28 V11 L14 16 L20 4 L26 16 L33 11 V28 Z" fill="#0b1220" stroke="#22d3ee" strokeWidth="1.8" />
          <path d="M10 25 H30" stroke="#7dd3fc" strokeWidth="1.8" />
          <path d="M13 10 V5 M27 10 V5 M20 4 V1.8" stroke="#a78bfa" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="13" cy="4.6" r="1.8" fill="#22d3ee" />
          <circle cx="20" cy="1.8" r="1.8" fill="#f472b6" />
          <circle cx="27" cy="4.6" r="1.8" fill="#22d3ee" />
          <rect x="14" y="15" width="12" height="6" rx="1.8" fill="#1d4ed8" opacity="0.88" />
        </svg>
      );
    }

    if (offer.id === 'paragon_void_diadem') {
      return (
        <svg viewBox="0 0 40 26" className="mx-auto h-14 w-14">
          <path d="M7 20 Q20 5 33 20" fill="none" stroke="#22d3ee" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M11 20 Q20 12 29 20" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" opacity="0.92" />
          <rect x="16.2" y="9" width="7.6" height="7.6" rx="2.4" fill="#0f172a" stroke="#7dd3fc" strokeWidth="1.4" />
          <circle cx="12.4" cy="18.3" r="1.9" fill="#22d3ee" />
          <circle cx="27.6" cy="18.3" r="1.9" fill="#22d3ee" />
          <circle cx="20" cy="12.8" r="1.9" fill="#f472b6" />
        </svg>
      );
    }

    if (offer.id === 'paragon_singularity_vault' && offer.slot === 'theme' && offer.themeColors) {
      return (
        <>
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle at 22% 28%, rgba(34,211,238,0.28), transparent 40%), radial-gradient(circle at 74% 26%, rgba(167,139,250,0.22), transparent 42%), linear-gradient(180deg, #050816 0%, #111827 100%)',
            }}
          />
          <div className="absolute right-2 top-2 h-4 w-4 rounded-full border border-cyan-100/70 bg-slate-950 shadow-[0_0_10px_rgba(167,139,250,0.45)]" />
          <div className="absolute inset-x-2 bottom-2 h-7 [transform:perspective(180px)_rotateX(62deg)] rounded-sm border border-cyan-400/25 bg-[linear-gradient(180deg,rgba(34,211,238,0.12),rgba(76,29,149,0.28))]" />
          <div className="absolute inset-x-4 bottom-4 h-[1px] bg-cyan-200/70" />
          <div className="absolute left-2 bottom-1 text-[8px] font-mono uppercase tracking-[0.16em] text-cyan-100/90">{language === 'tr' ? 'KASA' : language === 'pt-BR' ? 'COFRE' : language === 'es' ? 'BÓVEDA' : language === 'ru' ? 'ХРАНИЛИЩЕ' : language === 'zh-CN' ? '金库' : 'VAULT'}</div>
        </>
      );
    }

    if (offer.slot === 'theme' && offer.themeColors) {
      return (
        <>
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 25% 26%, ${offer.themeColors.nebula1}, transparent 52%), radial-gradient(circle at 72% 63%, ${offer.themeColors.nebula2}, transparent 56%), ${offer.themeColors.background}`,
            }}
          />
          <div
            className="absolute inset-0 opacity-55"
            style={{
              backgroundImage:
                `linear-gradient(to right, ${offer.themeColors.gridBorder} 1px, transparent 1px), linear-gradient(to bottom, ${offer.themeColors.gridBorder} 1px, transparent 1px)`,
              backgroundSize: '14px 14px',
              transform: 'perspective(260px) rotateX(58deg) translateY(18px)',
              transformOrigin: 'center bottom',
            }}
          />
        </>
      );
    }

    return (
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 scale-[1.58]">
        <CSSCharacter
          skinPalette={offer.slot === 'skin' && offer.skinPalette ? offer.skinPalette : paragonPreviewPalette}
          accessoryId={offer.slot === 'accessory' ? offer.id : 'none'}
          headStyleId={offer.slot === 'headstyle' ? offer.id : 'default'}
          capeId="none"
          wingId="none"
        />
      </div>
    );
  }, [paragonEliteOffers, paragonPreviewPalette, language]);

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

  const isParagonOfferOwned = useCallback((slot: 'skin' | 'headstyle' | 'accessory' | 'theme', cosmeticId: string) => {
    if (slot === 'skin') return ownedSkinsSet.has(cosmeticId);
    if (slot === 'headstyle') return ownedHeadStylesSet.has(cosmeticId);
    if (slot === 'theme') return ownedThemesSet.has(cosmeticId);
    return ownedAccessoriesSet.has(cosmeticId);
  }, [ownedAccessoriesSet, ownedHeadStylesSet, ownedSkinsSet, ownedThemesSet]);

  const isParagonOfferEquipped = useCallback((slot: 'skin' | 'headstyle' | 'accessory' | 'theme', cosmeticId: string) => {
    if (slot === 'skin') return cosmetics.activeSkinId === cosmeticId;
    if (slot === 'headstyle') return cosmetics.activeHeadStyleId === cosmeticId;
    if (slot === 'theme') return cosmetics.activeThemeId === cosmeticId;
    return cosmetics.activeAccessoryId === cosmeticId;
  }, [cosmetics.activeAccessoryId, cosmetics.activeHeadStyleId, cosmetics.activeSkinId, cosmetics.activeThemeId]);

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
  }, multiplier: number) => {
    const scaled = {
      productionBoost: (boost.productionBoost || 0) * multiplier,
      clickBoost: (boost.clickBoost || 0) * multiplier,
      critBoost: (boost.critBoost || 0) * multiplier,
      cryptoBoost: (boost.cryptoBoost || 0) * multiplier,
    };
    return getBoostLines({
      productionBoost: Number(formatRelicBoostValue(scaled.productionBoost)),
      clickBoost: Number(formatRelicBoostValue(scaled.clickBoost)),
      critBoost: Number(formatRelicBoostValue(scaled.critBoost)),
      cryptoBoost: Number(formatRelicBoostValue(scaled.cryptoBoost)),
    }, language);
  }, [formatRelicBoostValue, language]);

  const canBuyRelicNode = useCallback((node: (typeof CRYPTO_RELIC_TREE)[number]) => {
    if (!isCryptoRelicShopUnlocked) return false;
    const currentLevel = getRelicNodeLevel(node);
    if (currentLevel >= stats.totalAscensions) return false;
    const nextCost = getCryptoRelicUpgradeCost(node, currentLevel, stats.totalAscensions);
    if (resources.crypto.amount < nextCost) return false;
    if (node.requires.length === 0) return true;
    return node.requires.every(reqId => {
      const reqNode = CRYPTO_RELIC_TREE.find(relic => relic.id === reqId);
      if (!reqNode) return false;
      return getRelicNodeLevel(reqNode) > 0;
    });
  }, [getRelicNodeLevel, isCryptoRelicShopUnlocked, resources.crypto.amount, stats.totalAscensions]);

  const machineBoxSkinsForShop = useMemo(() => localizedMachineBoxSkins, [localizedMachineBoxSkins]);

  const totalClickUpgradeLevels = useMemo(() => (
    upgrades
      .filter(u => u.category === 'click_upgrades')
      .reduce((sum, u) => sum + (u.count || 0), 0)
  ), [upgrades]);
  const totalParagonLevels = useMemo(
    () => PARAGON_UPGRADES.reduce((sum, upgrade) => sum + getParagonUpgradeLevel(upgrade.id), 0),
    [getParagonUpgradeLevel, cosmetics.paragonLevels]
  );
  const totalParagonLevelCap = useMemo(
    () => PARAGON_UPGRADES.reduce((sum, upgrade) => sum + upgrade.maxLevel, 0),
    []
  );
  const paragonCompletionPercent = useMemo(
    () => (totalParagonLevelCap > 0 ? (totalParagonLevels / totalParagonLevelCap) * 100 : 0),
    [totalParagonLevelCap, totalParagonLevels]
  );
  const nextParagonUpgradeCost = useMemo(() => {
    const pendingCosts = PARAGON_UPGRADES
      .map(upgrade => {
        const currentLevel = getParagonUpgradeLevel(upgrade.id);
        if (currentLevel >= upgrade.maxLevel || stats.totalAscensions < (upgrade.requiredAscensions ?? 0)) return null;
        return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel));
      })
      .filter((cost): cost is number => cost !== null);
    if (pendingCosts.length === 0) return null;
    return Math.min(...pendingCosts);
  }, [getParagonUpgradeLevel, cosmetics.paragonLevels, stats.totalAscensions]);

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
    if (level <= 0) return t('prestigePanel.noBonus');

    const unitH = language === 'ru' ? 'ч' : language === 'zh-CN' ? '小时' : 'h';
    const unitM = language === 'ru' ? ' мин' : language === 'zh-CN' ? '分钟' : 'm';
    const unitS = language === 'ru' ? ' с' : language === 'zh-CN' ? '秒' : 's';
    const unitMin = language === 'ru' ? 'мин' : language === 'zh-CN' ? '分钟' : 'min';
    const totalValue = upgrade.effect.value * level;
    switch (upgrade.effect.type) {
      case 'click_boost':
        return `+${(totalValue * 100).toFixed(0)}% ${t('prestigePanel.clickPower')}`;
      case 'production_boost':
        return `+${(totalValue * 100).toFixed(0)}% ${t('prestigePanel.production')}`;
      case 'crit_chance_boost':
        return `+${(totalValue * 100).toFixed(1)}% ${t('prestigePanel.critChance')}`;
      case 'crit_mult_boost':
        return `+${(totalValue * 100).toFixed(0)}% ${t('prestigePanel.critDamage')}`;
      case 'luck_boost':
        return `+${(totalValue * 100).toFixed(1)}% ${t('prestigePanel.pickupChance')}`;
      case 'pickup_value':
        return `+${(totalValue * 100).toFixed(0)}% ${t('prestigePanel.pickupValue')}`;
      case 'pickup_spawn_rate':
        return `+${(totalValue * 100).toFixed(0)}% ${t('prestigePanel.pickupSpawnRate')}`;
      case 'time_warp_chance':
        return `+${(totalValue * 100).toFixed(1)}% ${t('prestigePanel.timeWarpChance')}`;
      case 'time_warp_seconds': {
        const totalMinutes = Math.floor(totalValue / 60);
        if (totalMinutes >= 60) {
          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          return minutes === 0
            ? `${hours}${unitH} ${t('prestigePanel.timeWarpOutput')}`
            : `${hours}${unitH} ${minutes}${unitM} ${t('prestigePanel.timeWarpOutput')}`;
        }
        return `${totalMinutes}${unitM} ${t('prestigePanel.timeWarpOutput')}`;
      }
      case 'time_warp_cooldown':
        return `-${Math.floor(totalValue)}${unitS} ${t('prestigePanel.timeWarpCooldown')}`;
      case 'prestige_mult':
        return `+${(totalValue * 100).toFixed(0)}% ${t('prestigePanel.prestigeGain')}`;
      case 'offline_boost':
        return `+${(totalValue * 100).toFixed(0)}% ${t('prestigePanel.offlineEarnings')}`;
      case 'offline_time': {
        const totalMinutes = Math.round(totalValue / 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return minutes === 0
          ? `+${hours}${unitH} ${t('prestigePanel.maxOfflineTime')}`
          : `+${hours}${unitH} ${minutes}${unitM} ${t('prestigePanel.maxOfflineTime')}`;
      }
      case 'crypto_boost':
        return `+${(totalValue * 100).toFixed(0)}% ${t('prestigePanel.cryptoProduction')}`;
      case 'sell_boost':
        return `+${(totalValue * 100).toFixed(0)}% ${t('prestigePanel.dataConversion')}`;
      case 'starting_bonus':
        return `+${formatNumber(Math.floor(totalValue / 60))} ${unitMin} ${t('prestigePanel.startingData')}`;
      case 'cost_reduction':
        return `-${(totalValue * 100).toFixed(0)}% ${t('prestigePanel.upgradeCost')}`;
      case 'checkpoint_speed':
        return `+${(totalValue * 100).toFixed(0)}% ${t('prestigePanel.checkpointSpeed')}`;
      default:
        return upgrade.description;
    }
  }, [t, language]);

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
    luckBoost?: number;
  };

  const getLootBoostLines = useCallback((boost?: LootBoostInfo) => {
    return getBoostLines(boost, language);
  }, [language]);

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
      if (lootBoxReward.kind === 'cosmetic' && lootBoxReward.rarity === 'legendary') {
        celebrate('legendary', l('LEGENDARY!', 'EFSANEVİ!', 'LENDÁRIO!', '¡LEGENDARIO!'), lootBoxReward.itemName);
      }
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

  const handleLootBoxDialogOpenChange = useCallback((open: boolean) => {
    if (open) {
      setIsLootBoxDialogOpen(true);
      setIsLootBoxMinimized(false);
      return;
    }

    clearLootBoxOpeningSequence();
    setLootBoxOpeningPhase('idle');
    setIsLootBoxDialogOpen(false);
    if (lootBoxReward) setIsLootBoxMinimized(true);
  }, [clearLootBoxOpeningSequence, lootBoxReward]);

  const handleCloseLootBoxReward = useCallback(() => {
    clearLootBoxOpeningSequence();
    setLootBoxReward(null);
    setLootBoxOpened(false);
    setLootBoxOpeningPhase('idle');
    setIsLootBoxDialogOpen(false);
    setIsLootBoxMinimized(false);
  }, [clearLootBoxOpeningSequence]);

  const handleEquipLootReward = useCallback(() => {
    if (!lootBoxReward || lootBoxReward.kind !== 'cosmetic') return false;
    const equipType = lootEquipTypeMap[lootBoxReward.cosmeticType];
    return equipCosmetic(equipType, lootBoxReward.itemId);
  }, [equipCosmetic, lootBoxReward, lootEquipTypeMap]);

  const handleOpenTutorialRewardCosmetics = useCallback(() => {
    claimTutorialRewardUnlock();
    playSound('open_cosmetics');
    setIsCosmeticsOpen(true);
  }, [claimTutorialRewardUnlock, playSound]);

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

    const defaultSkinPalette = localizedCharacterSkins[0]?.palette;
    const characterPreviewWrap = (child: React.ReactNode) => (
      <div className="relative flex h-[132px] items-center justify-center overflow-hidden rounded-md border border-cyan-500/35 bg-slate-950/70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(56,189,248,0.18),rgba(15,23,42,0.04)_70%)]" />
        {child}
      </div>
    );

    if (lootBoxReward.cosmeticType === 'skin') {
      const skin = localizedCharacterSkins.find(s => s.id === lootBoxReward.itemId) || localizedAscensionSkins.find(s => s.id === lootBoxReward.itemId);
      if (!skin || !defaultSkinPalette) return null;
      return {
        name: skin.name,
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
      const accessory = localizedCharacterAccessories.find(a => a.id === lootBoxReward.itemId) || localizedAscensionAccessories.find(a => a.id === lootBoxReward.itemId);
      if (!accessory || !defaultSkinPalette) return null;
      return {
        name: accessory.name,
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
      const head = localizedCharacterHeadStyles.find(h => h.id === lootBoxReward.itemId) || localizedAscensionHeadStyles.find(h => h.id === lootBoxReward.itemId);
      if (!head || !defaultSkinPalette) return null;
      return {
        name: head.name,
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
      const theme = localizedRoomThemes.find(t => t.id === lootBoxReward.itemId) || localizedAscensionRoomThemes.find(t => t.id === lootBoxReward.itemId);
      if (!theme) return null;
      return {
        name: theme.name,
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
      const pet = localizedCharacterPets.find(p => p.id === lootBoxReward.itemId) || localizedAscensionPets.find(p => p.id === lootBoxReward.itemId);
      if (!pet) return null;
      return {
        name: pet.name,
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
      const boxSkin = localizedLootBoxSkins.find(skin => skin.id === lootBoxReward.itemId);
      if (!boxSkin) return null;
      return {
        name: boxSkin.name,
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
      const machineSkin = localizedMachineBoxSkins.find(skin => skin.id === lootBoxReward.itemId);
      if (!machineSkin) return null;
      return {
        name: machineSkin.name,
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

    const effect = localizedClickEffects.find(e => e.id === lootBoxReward.itemId);
    if (!effect) return null;
    return {
      name: effect.name,
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
  }, [
    getLootBoostLines,
    localizedAscensionAccessories,
    localizedAscensionHeadStyles,
    localizedAscensionPets,
    localizedAscensionRoomThemes,
    localizedAscensionSkins,
    localizedCharacterAccessories,
    localizedCharacterHeadStyles,
    localizedCharacterPets,
    localizedCharacterSkins,
    localizedClickEffects,
    localizedLootBoxSkins,
    localizedMachineBoxSkins,
    localizedRoomThemes,
    lootBoxReward,
  ]);

  const cosmeticsPanelProps = useMemo(() => ({
    data: resources.data.amount,
    credits: resources.credits.amount,
    crypto: resources.crypto.amount,
    ascension: resources.prestige.amount,
    totalAscensions: stats.totalAscensions,
    skins: marketSkins,
    themes: localizedRoomThemes,
    accessories: marketAccessories,
    headStyles: marketHeadStyles,
    pets: localizedCharacterPets,
    clickEffects: localizedClickEffects,
    boxSkins: localizedLootBoxSkins,
    ascensionPets: localizedAscensionPets,
    ascensionSkins: localizedAscensionSkins,
    ascensionHeadStyles: localizedAscensionHeadStyles,
    ascensionAccessories: localizedAscensionAccessories,
    ascensionThemes: localizedAscensionRoomThemes,
    ownedSkins: ownedSkinsSet,
    ownedThemes: ownedThemesSet,
    ownedAccessories: ownedAccessoriesSet,
    ownedHeadStyles: ownedHeadStylesSet,
    ownedPets: ownedPetsSet,
    ownedClickEffects: ownedClickEffectsSet,
    ownedBoxSkins: ownedLootBoxSkinsSet,
    ownedAscensionPets: ownedAscensionPetsSet,
    activeSkin: cosmetics.activeSkinId,
    activeTheme: cosmetics.activeThemeId,
    activeAccessory: cosmetics.activeAccessoryId,
    activeHeadStyle: cosmetics.activeHeadStyleId,
    activePet: cosmetics.activePetId,
    activeClickEffect: cosmetics.activeClickEffectId,
    activeBoxSkin: cosmetics.activeLootBoxSkinId,
    activeAscensionPet: cosmetics.activeAscensionPetId,
    onBuySkin: (skinId: string) => buyCosmetic('skin', skinId),
    onBuyTheme: (themeId: string) => buyCosmetic('theme', themeId),
    onBuyAccessory: (accessoryId: string) => buyCosmetic('accessory', accessoryId),
    onBuyHeadStyle: (headStyleId: string) => buyCosmetic('headstyle', headStyleId),
    onBuyPet: (petId: string) => buyCosmetic('pet', petId),
    onEquipSkin: (skinId: string) => equipCosmetic('skin', skinId),
    onEquipTheme: (themeId: string) => equipCosmetic('theme', themeId),
    onEquipAccessory: (accessoryId: string) => equipCosmetic('accessory', accessoryId),
    onEquipHeadStyle: (headStyleId: string) => equipCosmetic('headstyle', headStyleId),
    onEquipPet: (petId: string) => equipCosmetic('pet', petId),
    onEquipClickEffect: (effectId: string) => equipCosmetic('clickeffect', effectId),
    onEquipBoxSkin: (skinId: string) => equipCosmetic('lootboxskin', skinId),
    onEquipAscensionPet: (petId: string) => equipCosmetic('prestigepet', petId),
    activeBoosts: getPetBoosts(),
  }), [
    getPetBoosts,
    resources.data.amount,
    resources.credits.amount,
    resources.crypto.amount,
    resources.prestige.amount,
    stats.totalAscensions,
    marketSkins,
    localizedRoomThemes,
    marketAccessories,
    marketHeadStyles,
    localizedCharacterPets,
    localizedClickEffects,
    localizedLootBoxSkins,
    localizedAscensionPets,
    localizedAscensionSkins,
    localizedAscensionHeadStyles,
    localizedAscensionAccessories,
    localizedAscensionRoomThemes,
    ownedSkinsSet,
    ownedThemesSet,
    ownedAccessoriesSet,
    ownedHeadStylesSet,
    ownedPetsSet,
    ownedClickEffectsSet,
    ownedLootBoxSkinsSet,
    ownedAscensionPetsSet,
    cosmetics.activeSkinId,
    cosmetics.activeThemeId,
    cosmetics.activeAccessoryId,
    cosmetics.activeHeadStyleId,
    cosmetics.activePetId,
    cosmetics.activeClickEffectId,
    cosmetics.activeLootBoxSkinId,
    cosmetics.activeAscensionPetId,
    buyCosmetic,
    equipCosmetic,
  ]);

  // Compute current tutorial highlight hint based on active objectives
  const tutorialHighlight = useMemo(() => {
    if (tutorial.skipped || isTutorialComplete) return null;
    if (!currentTutorialPhase) return null;
    
    // Find first incomplete objective
    const activeObjective = currentTutorialPhase.objectives.find(obj => !obj.completed);
    if (!activeObjective) return null;
    
    // Map objectives to UI element hints
    const highlightMap: Record<string, string> = {
      'click_core': 'core',
      'buy_first_upgrade': 'upgrades',
      'convert_data': 'sell_button',
      'unlock_click_tab': 'upgrades',
      'buy_click_upgrade': 'upgrades',
      'unlock_mining': 'upgrades',
      'open_mining_tab': 'crypto_tab',
      'earn_crypto': 'crypto_tab',
      'open_ascend': 'ascend_button',
    };
    
    const hint = highlightMap[activeObjective.id];
    if (hint) return hint;

    // Fallbacks: our tutorial objectives/ids can evolve; keep highlights working by matching phase/objective text.
    const phaseLabel = String((currentTutorialPhase as any).title || (currentTutorialPhase as any).name || (currentTutorialPhase as any).id || '').toLowerCase();
    const objLabel = String((activeObjective as any).title || (activeObjective as any).text || (activeObjective as any).description || '').toLowerCase();

    if (phaseLabel.includes('conversion') || objLabel.includes('convert') || objLabel.includes('credit') || objLabel.includes('node')) return 'sell_button';
    if (objLabel.includes('right-click') || objLabel.includes('right click')) return 'core_right';
    if (objLabel.includes('zoom')) return 'camera_zoom';
    if (objLabel.includes('middle mouse') || objLabel.includes('drag') || objLabel.includes('camera')) return 'camera_pan';
    if (phaseLabel.includes('cosmetic') || objLabel.includes('cosmetic')) return 'cosmetics_button';
    if (phaseLabel.includes('mining') || objLabel.includes('mining')) return 'crypto_tab';
    if (objLabel.includes('crypto')) return 'crypto_display';
    if (phaseLabel.includes('ascension') || objLabel.includes('ascend')) return 'ascend_button';

    return null;
  }, [tutorial, isTutorialComplete, currentTutorialPhase]);

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

  const handlePickupClick = useCallback((pickup: FloatingPickupItem) => {
    onPickupClick(pickup);
    setPickupCollected(true);
  }, [onPickupClick]);

  const handleCritPickupClick = useCallback(() => {
    setPickupCollected(true);
  }, []);

  const handleFloatingCritPickupCollect = useCallback((pickup: FloatingPickupItem) => {
    handleCritPickupClick();
    onCritPickupClick(pickup);
    removeFloatingPickup(pickup.id);
  }, [handleCritPickupClick, onCritPickupClick, removeFloatingPickup]);

  const handleFloatingPickupMiss = useCallback((pickupId: string) => {
    removeFloatingPickup(pickupId);
  }, [removeFloatingPickup]);

  // Wrapped clickResource to track tutorial
  const handleCoreClick = useCallback((resource: ResourceType, meta?: { timestamp?: number; source?: 'manual' | 'autoclick' }) => {
    if (!tutorial.started && !tutorial.skipped && !isTutorialComplete) {
      startTutorial();
    }
    const result = clickResource(resource, undefined, undefined, meta);
    if (!tutorial.skipped && !isTutorialComplete) {
      completeTutorialObjective('click_core');
    }
    return result;
  }, [clickResource, tutorial.started, tutorial.skipped, isTutorialComplete, startTutorial, completeTutorialObjective]);

  const handleCoreAutoClickBurst = useCallback((
    resource: ResourceType,
    count: number,
    meta?: { timestamp?: number; source?: 'manual' | 'autoclick'; intervalMs?: number }
  ) => {
    return clickResourceBurst(resource, count, meta);
  }, [clickResourceBurst]);

  // v1.04 CPU: MainView is memoized, but several of these handlers change identity on every game tick
  // (they depend on resources), which re-rendered the whole room view each tick. Pass stable wrappers.
  const mvHandleCoreClick = useStableCallback(handleCoreClick);
  const mvHandleCoreAutoClickBurst = useStableCallback(handleCoreAutoClickBurst);
  const mvAddDebugData = useStableCallback(addDebugData);
  const mvAddDebugCredits = useStableCallback(addDebugCredits);
  const mvAddDebugCrypto = useStableCallback(addDebugCrypto);
  const mvAddDebugPrestige = useStableCallback(addDebugPrestige);
  const mvAddDebugAscensionCount = useStableCallback(addDebugAscensionCount);
  const mvSpawnDebugPickup = useStableCallback(spawnDebugPickup);
  const mvSpawnAllDebugPickups = useStableCallback(spawnAllDebugPickups);
  const mvForceDebugTimeWarp = useStableCallback(forceDebugTimeWarp);
  const mvHandleClearLastUpgradeInfo = useStableCallback(handleClearLastUpgradeInfo);
  const mvHandleClearAchievementToast = useStableCallback(handleClearAchievementToast);
  const mvHandleClearPickupToast = useStableCallback(handleClearPickupToast);
  const mvClearTimeWarpFeedback = useStableCallback(clearTimeWarpFeedback);
  const mvOnTimeWarpMiniGameClick = useStableCallback(onTimeWarpMiniGameClick);
  const mvUpdateMachinePosition = useStableCallback(updateMachinePosition);
  const mvRemoveMachinePosition = useStableCallback(removeMachinePosition);
  const mvHandleOpenBlackMarket = useStableCallback(handleOpenBlackMarket);
  const mvHandleOpenCryptoRelicShop = useStableCallback(handleOpenCryptoRelicShop);
  const mvHandleOpenParagonLab = useStableCallback(handleOpenParagonLab);

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

  // The tutorial ends by opening the Ascend window; show its reward after that window closes,
  // not stacked on top of it.
  const [isAscendDialogOpen, setIsAscendDialogOpen] = useState(false);
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

    // Core-loop purchases (v1.04 tutorial order): miner -> Click tab -> click upgrade -> Mining.
    const owned = (id: string) => (upgrades.find(u => u.id === id)?.count ?? 0) > 0;
    const totalUpgrades = upgrades.reduce((sum, u) => sum + u.count, 0);
    if (totalUpgrades > 0) completeTutorialObjective('buy_first_upgrade');
    if (owned('unlock_click_upgrades')) completeTutorialObjective('unlock_click_tab');
    if (upgrades.some(u => u.category === 'click_upgrades' && !u.unlockedCategory && u.count > 0)) {
      completeTutorialObjective('buy_click_upgrade');
    }
    if (owned('unlock_crypto_mining')) completeTutorialObjective('unlock_mining');
  }, [upgrades, tutorial.skipped, isTutorialComplete, completeTutorialObjective]);

  // Track mining segment and crypto gain for tutorial
  useEffect(() => {
    if (activeUpgradeTab === 'crypto_mining' && !tutorial.skipped && !isTutorialComplete) {
      completeTutorialObjective('open_mining_tab');
    }
  }, [activeUpgradeTab, tutorial.skipped, isTutorialComplete, completeTutorialObjective]);

  useEffect(() => {
    if (stats.totalCryptoMined > 0 && !tutorial.skipped && !isTutorialComplete) {
      completeTutorialObjective('earn_crypto');
    }
  }, [stats.totalCryptoMined, tutorial.skipped, isTutorialComplete, completeTutorialObjective]);

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
      if (!isSettingsOpen && (isPrestigeOpen || isAchievementsOpen || isStatsOpen || isCosmeticsOpen || isCryptoRelicShopOpen || isBlackMarketOpen || isParagonLabOpen || isBossEncounterActive)) {
        return;
      }

      e.preventDefault();
      setIsSettingsOpen(prev => !prev);
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isSettingsOpen, isPrestigeOpen, isAchievementsOpen, isStatsOpen, isCosmeticsOpen, isCryptoRelicShopOpen, isBlackMarketOpen, isParagonLabOpen, isBossEncounterActive]);

  return (
    <div className={`h-screen w-screen bg-background flex overflow-hidden text-foreground selection:bg-primary/30 relative cyberpunk-cursor cyberpunk-cursor--glow-${cursorGlowTier}`}>


      {/* Settings Modal */}
      <Suspense fallback={null}>
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
          reduceSceneGlow={reduceSceneGlow}
          onSetReduceSceneGlow={handleSetReduceSceneGlow}
          onResetGame={resetGame}
        />
      </Suspense>

      {/* Prestige Shop Modal - Controlled by ResourcePanel */}
      {isPrestigeOpen && (
        <Suspense fallback={<div className="fixed inset-0 z-[60]" />}>
          <PrestigeShopDialog
            open={isPrestigeOpen}
            onOpenChange={setIsPrestigeOpen}
            t={t}
            prestigeAmount={resources.prestige.amount}
            prestigeUpgrades={prestigeUpgrades}
            prestigeShopSummary={prestigeShopSummary}
            formatPrestigeEffect={formatPrestigeEffect}
            buyPrestigeUpgrade={buyPrestigeUpgrade}
            buyPrestigeUpgradeMax={buyPrestigeUpgradeMax}
          />
        </Suspense>
      )}

      {/* Crypto Relic Shop Modal */}
      {isCryptoRelicShopOpen && (
        <Suspense fallback={<div className="fixed inset-0 z-[60]" />}>
          <CryptoRelicShopDialog
            open={isCryptoRelicShopOpen}
            onOpenChange={setIsCryptoRelicShopOpen}
            l={l}
            language={language}
            totalAscensions={stats.totalAscensions}
            activeMachineBoxSkinId={cosmetics.activeMachineBoxSkinId}
            localizedCryptoRelicTree={localizedCryptoRelicTree}
            machineBoxSkinsForShop={machineBoxSkinsForShop}
            ownedMachineBoxSkinsSet={ownedMachineBoxSkinsSet}
            isCryptoRelicShopUnlocked={isCryptoRelicShopUnlocked}
            getRelicNodeLevel={getRelicNodeLevel}
            isRelicEquipped={isRelicEquipped}
            canBuyRelicNode={canBuyRelicNode}
            relicBoostLines={relicBoostLines}
            renderRelicGlyph={renderRelicGlyph}
            canBuyMachineBoxSkin={canBuyMachineBoxSkin}
            buyCryptoRelic={buyCryptoRelic}
            buyCosmetic={buyCosmetic}
            equipCosmetic={equipCosmetic}
          />
        </Suspense>
      )}

      {isBlackMarketOpen && (
        <Suspense fallback={<div className="fixed inset-0 z-[60]" />}>
          <BlackMarketDialog
            open={isBlackMarketOpen}
            onOpenChange={setIsBlackMarketOpen}
            l={l}
            language={language}
            totalAscensions={stats.totalAscensions}
            resources={{
              prestige: resources.prestige.amount,
              credits: resources.credits.amount,
              crypto: resources.crypto.amount,
            }}
            cosmetics={{
              activeCapeId: cosmetics.activeCapeId,
              activeWingId: cosmetics.activeWingId,
              blackMarketClickOverflowPurchased: cosmetics.blackMarketClickOverflowPurchased,
              blackMarketAdjacencyPurchased: cosmetics.blackMarketAdjacencyPurchased,
            }}
            equippedCapeName={equippedCape.name}
            equippedWingName={equippedWing.name}
            equippedSkinPalette={equippedSkin.palette}
            localizedBlackMarketCapes={localizedBlackMarketCapes}
            localizedBlackMarketWings={localizedBlackMarketWings}
            localizedBlackMarketUpgrades={localizedBlackMarketUpgrades}
            ownedCapesSet={ownedCapesSet}
            ownedWingsSet={ownedWingsSet}
            adjacencyFormationBonus={adjacencyFormationBonus}
            getTotalCritChance={getTotalCritChance}
            buyBlackMarketUpgrade={buyBlackMarketUpgrade}
            buyCosmetic={buyCosmetic}
            equipCosmetic={equipCosmetic}
          />
        </Suspense>
      )}

      {isParagonLabOpen && (
        <Suspense fallback={<div className="fixed inset-0 z-[60]" />}>
          <ParagonLabDialog
            open={isParagonLabOpen}
            onOpenChange={setIsParagonLabOpen}
            l={l}
            language={language}
            totalAscensions={stats.totalAscensions}
            prestigeAmount={resources.prestige.amount}
            localizedParagonUpgrades={localizedParagonUpgrades}
            totalParagonLevels={totalParagonLevels}
            totalParagonLevelCap={totalParagonLevelCap}
            paragonCompletionPercent={paragonCompletionPercent}
            nextParagonUpgradeCost={nextParagonUpgradeCost}
            getParagonUpgradeLevel={getParagonUpgradeLevel}
            buyParagonUpgrade={buyParagonUpgrade}
            paragonEliteOffers={paragonEliteOffers}
            isParagonOfferOwned={isParagonOfferOwned}
            isParagonOfferEquipped={isParagonOfferEquipped}
            renderParagonOfferPreview={renderParagonOfferPreview}
            buyCosmetic={buyCosmetic}
            equipCosmetic={equipCosmetic}
          />
        </Suspense>
      )}
      {/* Achievements Modal */}
      {isAchievementsOpen && (
        <Suspense fallback={<div className="fixed inset-0 z-[60]" />}>
          <AchievementsDialog
            open={isAchievementsOpen}
            onOpenChange={setIsAchievementsOpen}
            l={l}
            achievements={achievements}
            stats={stats}
            claimAchievementReward={claimAchievementReward}
            claimAllAchievements={claimAllAchievements}
          />
        </Suspense>
      )}

      {/* Stats Modal */}
      {isStatsOpen && (
        <Suspense fallback={<div className="fixed inset-0 z-[60]" />}>
          <StatsDialog
            open={isStatsOpen}
            onOpenChange={setIsStatsOpen}
            l={l}
            stats={stats}
            formatNumber={formatNumber}
          />
        </Suspense>
      )}
      <JuiceBanners language={language} reduced={reduceSceneGlow} playSound={playSound} />
      {celebration && (
        <Celebration
          key={celebration.key}
          kind={celebration.kind}
          title={celebration.title}
          subtitle={celebration.subtitle}
          reduced={reduceSceneGlow}
          onDone={() => setCelebration(null)}
        />
      )}
      {IS_DEMO_BUILD && !showDemoEnd && <DemoPrompts language={language} cryptoMiningUnlocked={(upgrades.find(u => u.id === 'unlock_crypto_mining')?.count ?? 0) > 0} />}
      {!IS_DEMO_BUILD && whatsNew.seenVersion !== WHATS_NEW_VERSION && !isBossEncounterActive && (
        <WhatsNewDialog language={language} ascensions={stats.totalAscensions} giftClaimed={whatsNew.giftClaimed}
          onClaimGift={() => {
            const reward = claimWelcomeGift();
            markWhatsNewSeen();
            if (reward) {
              clearLootBoxOpeningSequence();
              setLootBoxReward(reward);
              setLootBoxOpened(false);
              setLootBoxOpeningPhase('idle');
              setIsLootBoxDialogOpen(true);
              setIsLootBoxMinimized(false);
            }
          }}
          onClose={markWhatsNewSeen} />
      )}
      {saveLoadError !== null && <SaveLoadErrorScreen language={language} reason={saveLoadError} onRetry={retrySaveLoad} onOpenFolder={openSaveFolder} onContinueWithout={continueWithoutUnreadableSave} />}
      {showDemoEnd && !isBossEncounterActive && <DemoEndScreen language={language} ascensions={stats.totalAscensions} onQuit={() => { void saveGame(); setTimeout(() => window.close(), 300); }} />}
      {showFinaleCredits && (
        <FinaleCredits totalAscensions={stats.totalAscensions} onContinue={() => setShowFinaleCredits(false)} />
      )}
      {/* Leaderboards Modal */}
      {isLeaderboardOpen && (
        <Suspense fallback={<div className="fixed inset-0 z-[60]" />}>
          <LeaderboardsDialog
            open={isLeaderboardOpen}
            onOpenChange={setIsLeaderboardOpen}
            l={l}
            leaderboardTab={leaderboardTab}
            leaderboardPeriod={leaderboardPeriod}
            onLeaderboardTabChange={setLeaderboardTab}
            onLeaderboardPeriodChange={setLeaderboardPeriod}
            onRefresh={() => { void refreshLeaderboard(leaderboardTab, leaderboardPeriod, LEADERBOARD_MODAL_LIMIT); }}
            currentUtcCycleKey={currentUtcCycleKey}
            currentDailyAscensionScore={currentDailyAscensionScore}
            leaderboardEntries={leaderboardEntries}
            leaderboardLoading={leaderboardLoading}
            leaderboardError={leaderboardError}
            friendsLeaderboardEntries={friendsLeaderboardEntries}
            friendsLeaderboardLoading={friendsLeaderboardLoading}
            friendsLeaderboardError={friendsLeaderboardError}
            dailyLeaderboardEntries={dailyLeaderboardEntries}
            endlessLeaderboardEntries={endlessLeaderboardEntries}
            endlessLeaderboardLoading={endlessLeaderboardLoading}
            endlessLeaderboardError={endlessLeaderboardError}
            endlessUnlocked={finale.completed}
            dailyLeaderboardLoading={dailyLeaderboardLoading}
            dailyLeaderboardError={dailyLeaderboardError}
            dailyFriendsLeaderboardEntries={dailyFriendsLeaderboardEntries}
            dailyFriendsLeaderboardLoading={dailyFriendsLeaderboardLoading}
            dailyFriendsLeaderboardError={dailyFriendsLeaderboardError}
            limit={LEADERBOARD_MODAL_LIMIT}
          />
        </Suspense>
      )}
      {/* Loot Box Modal */}
      <Suspense fallback={null}>
        <LootBoxDialog
          open={lootBoxReward !== null && isLootBoxDialogOpen}
          onOpenChange={handleLootBoxDialogOpenChange}
          l={l}
          language={language}
          lootBoxReward={lootBoxReward}
          lootBoxOpened={lootBoxOpened}
          isLootBoxOpening={isLootBoxOpening}
          isLootBoxCharging={isLootBoxCharging}
          isLootBoxBursting={isLootBoxBursting}
          activeLootBoxColors={activeLootBoxColors}
          lootRewardDetails={lootRewardDetails}
          lootRarityClass={lootRarityClass}
          onOpenLootBox={handleOpenLootBox}
          onEquipLootReward={handleEquipLootReward}
          isLootRewardEquipped={isLootRewardEquipped}
          onContinueRun={handleCloseLootBoxReward}
          showMinimizedBubble={Boolean(lootBoxReward && !isLootBoxDialogOpen && isLootBoxMinimized)}
          onReopen={reopenLootBoxDialog}
          leftPanelOpen={leftPanelOpen}
          rightPanelOpen={rightPanelOpen}
        />
      </Suspense>
      {/* Cosmetics Market Modal */}
      {isCosmeticsOpen && (
        <Suspense fallback={<div className="fixed inset-0 z-[60]" />}>
          <CosmeticsMarketDialog
            open={isCosmeticsOpen}
            onOpenChange={setIsCosmeticsOpen}
            l={l}
            loadingLabel={l('Loading...', 'Yükleniyor...', 'Carregando...', 'Cargando...')}
            panelProps={cosmeticsPanelProps}
            equippedTheme={equippedTheme}
            equippedSkin={equippedSkin}
            equippedAccessory={equippedAccessory}
            equippedHeadStyle={equippedHeadStyle}
            equippedClickEffect={equippedClickEffect}
          />
        </Suspense>
      )}
      {/* Floating Pickups */}
      {!isBossEncounterActive && (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
          {floatingPickups.map(pickup => (
            <FloatingPickup
              key={pickup.id}
              pickup={pickup}
              onCollect={handlePickupClick}
              onCritCollect={handleFloatingCritPickupCollect}
              onMiss={handleFloatingPickupMiss}
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
            prestigeBreakdown={getPrestigeGainBreakdown(resources.crypto.amount, stats.totalAscensions, prestigeUpgrades)}
            floaterPaceMultiplier={upgradePaceDelayMultiplier}
            automation={automation}
            onSetAutomation={setAutomation}
            challenges={challenges}
            onStartChallenge={startChallenge}
            finaleCompleted={finale.completed}
            finaleWeaken={getFinaleWeaken(finale)}
            abyssVariant={finale.abyssVariant}
            onSetAbyssVariant={setAbyssVariant}
            onStartFinale={() => { setIsFinaleEncounter(true); setIsBossEncounterActive(true); }}
            onAbandonChallenge={abandonChallenge}
            upgrades={upgrades}
            onSell={handleSellResource} 
            onSellAll={handleSellAllResource} 
            conversionDataCost={conversionDataCost}
            conversionNodeGain={conversionNodeGain}
            totalCritChance={getTotalCritChance()}  
            blackMarketUnlocked={isBlackMarketUnlockedByUpgrade} 
            onSettingsClick={handleOpenSettings} 
            onAchievementsClick={handleOpenAchievements}
            onStatsClick={handleOpenStats}
            onCosmeticsClick={handleOpenCosmetics}
            achievementCount={resourceAchievementCount}
            unclaimedAchievements={unclaimedAchievements}
            elapsedTime={elapsedTime} 
            prestigeAmount={resources.prestige.amount}
            onStartBossEncounter={handleStartBossEncounter}
            getPrestigeGain={getPrestigeGain}
            ascensionLevel={stats.totalAscensions}
            onOpenPrestige={handleOpenPrestige}
            onAscendTutorialStep={handleAscendTutorialStep}
            onAscendDialogOpenChange={setIsAscendDialogOpen}
            onCryptoRelicsClick={handleOpenCryptoRelicShop}
            cryptoRelicShopUnlocked={isCryptoRelicShopUnlocked}
            cryptoRelicUnlockRequirement={CRYPTO_RELIC_SHOP_UNLOCK_ASCENSION}
            onOpenBlackMarket={handleOpenBlackMarket}
            blackMarketUnlockRequirement={BLACK_MARKET_UNLOCK_ASCENSION}
            onOpenParagonLab={handleOpenParagonLab}
            paragonLabUnlocked={isParagonLabUnlocked}
            paragonLabUnlockRequirement={PARAGON_LAB_UNLOCK_ASCENSION}
            tutorialHighlight={tutorialHighlight}
            playSound={playSound}
            leaderboardEntries={leaderboardEntries}
            leaderboardLoading={leaderboardLoading}
            leaderboardError={leaderboardError}
            leaderboardMyRank={leaderboardMyRank}
            onRefreshLeaderboard={handleRefreshLeaderboardPanel}
            onOpenLeaderboard={handleOpenLeaderboard}
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
          <Suspense fallback={<div className="flex items-center justify-center h-full text-cyan-400 font-mono">{l('Loading Boss...', 'Boss Yükleniyor...', 'Carregando Chefe...', 'Cargando Jefe...')}</div>}>
          <BossEncounter
            isOpen={true}
            onClose={() => { setIsBossEncounterActive(false); setIsFinaleEncounter(false); }}
            isFinale={isFinaleEncounter}
            critChance={getTotalCritChance()}
            finaleWeaken={getFinaleWeaken(finale)}
            variant={isFinaleEncounter ? undefined : currentBossVariant}
            onVictory={() => {
              if (isFinaleEncounter) {
                completeFinale();
                setIsFinaleEncounter(false);
                setIsBossEncounterActive(false);
                celebrate('finale', l('THE CORE IS BREACHED', 'ÇEKİRDEK KIRILDI', 'O NÚCLEO FOI INVADIDO', 'EL NÚCLEO HA CAÍDO'));
                setTimeout(() => setShowFinaleCredits(true), 4800);
                return;
              }
              handleAscendVictory(currentBossVariant);
            }}
            onDefeat={() => {
              if (isFinaleEncounter) {
                // Losing the finale costs nothing; each loss weakens the Core by 10% for the next try (max -50%).
                recordFinaleDefeat();
                setIsFinaleEncounter(false);
                setIsBossEncounterActive(false);
                return;
              }
              ascendDefeat();
              setIsBossEncounterActive(false);
              setActiveUpgradeTab('fabrication');
            }}
            prestigeGain={getPrestigeGain()}
            ascensionLevel={stats.totalAscensions}
            dataPerClick={getDataPerClick()}
            permanentClickPercent={permanentClickPercent}
            isMainScreen={true}
            playSound={playSound}
          />
          </Suspense>
        </div>
      ) : (
        <MainView
          onClick={mvHandleCoreClick}
          onAutoClickBurst={mvHandleCoreAutoClickBurst}
          onAddDebugData={mvAddDebugData}
          onAddDebugCredits={mvAddDebugCredits}
          onAddDebugCrypto={mvAddDebugCrypto}
          onAddDebugPrestige={mvAddDebugPrestige}
          onAddDebugAscensionCount={mvAddDebugAscensionCount}
          onSpawnDebugPickup={mvSpawnDebugPickup}
          onSpawnAllDebugPickups={mvSpawnAllDebugPickups}
          onForceDebugTimeWarp={mvForceDebugTimeWarp}
          lastUpgradeInfo={lastUpgradeInfo}
          onClearUpgrade={mvHandleClearLastUpgradeInfo}
          upgrades={upgrades}
          onAchievementUnlocked={achievementUnlocked}
          onPickupCollected={pickupCollected}
          onClearAchievement={mvHandleClearAchievementToast}
          onClearPickup={mvHandleClearPickupToast}
          autoClickBoostEndTime={autoClickBoostEndTime}
          critBoostEndTime={critBoostEndTime}
          activeTimeWarpMiniGame={activeTimeWarpMiniGame}
          timeWarpFeedback={timeWarpFeedback}
          onClearTimeWarpFeedback={mvClearTimeWarpFeedback}
          onTimeWarpMiniGameClick={mvOnTimeWarpMiniGameClick}
          themeColors={mainViewThemeColors}
          skinPalette={mainViewSkinPalette}
          activeAccessoryId={equippedAccessory.id}
          activeCapeId={equippedCape.id}
          activeWingId={equippedWing.id}
          activeHeadStyleId={equippedHeadStyle.id}
          activePetId={equippedPet.id}
          activeAscensionPetId={equippedAscensionPet.id}
          activeClickEffectId={equippedClickEffect?.id || 'none'}
          abyssHue={finale.completed && finale.abyssVariant > 0 ? ABYSS_VARIANT_HUES[finale.abyssVariant - 1] : null}
          activeMachineBoxSkin={mainViewMachineBoxSkin}
          ascensionLevel={stats.totalAscensions}
          machinePositions={roomLayout.machinePositions}
          onUpdatePosition={mvUpdateMachinePosition}
          onRemovePosition={mvRemoveMachinePosition}
          tutorialHighlight={tutorialHighlight}
          showBlackMarketShip={isBlackMarketUnlocked}
          reduceSceneGlow={reduceSceneGlow}
          onOpenBlackMarket={mvHandleOpenBlackMarket}
          showCryptoRelicShip={isCryptoRelicShopUnlocked}
          onOpenCryptoRelicShop={mvHandleOpenCryptoRelicShop}
          showParagonShip={isParagonLabUnlocked}
          onOpenParagonShop={mvHandleOpenParagonLab}
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
            onRefreshContracts={handleRefreshContracts}
            totalCritChance={getTotalCritChance()}
            ascensionLevel={stats.totalAscensions}
            tutorialHighlight={tutorialHighlight}
            activeUpgradeTab={activeUpgradeTab}
            onSetActiveUpgradeTab={setActiveUpgradeTab}
          />
        </div>
      </motion.div>

      {/* Tutorial Panel */}
      <TutorialPanel
        currentPhase={currentTutorialPhase}
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
      <Suspense fallback={null}>
        <AscensionPetUnlockDialog
          open={!!newlyUnlockedAscensionPet}
          onOpenChange={(open: boolean) => {
            if (!open) claimAscensionPetUnlock();
          }}
          l={l}
          pet={newlyUnlockedAscensionPet}
          boostLines={ascensionPetBoostLines}
          onClaim={claimAscensionPetUnlock}
          onEquip={equipAscensionPetUnlock}
        />
      </Suspense>

      {/* Tutorial Completion Reward Modal */}
      <Suspense fallback={null}>
        <TutorialRewardDialog
          open={!!newlyUnlockedTutorialReward && !isAscendDialogOpen && !isBossEncounterActive}
          onOpenChange={(open: boolean) => {
            if (!open) claimTutorialRewardUnlock();
          }}
          l={l}
          language={language}
          reward={newlyUnlockedTutorialReward}
          preview={tutorialRewardPreview}
          rewardTypeLabel={newlyUnlockedTutorialReward ? tutorialRewardTypeLabel(newlyUnlockedTutorialReward) : ''}
          localizedInfo={localizedTutorialRewardInfo}
          formatNumber={formatNumber}
          onOpenCosmetics={handleOpenTutorialRewardCosmetics}
          onContinue={claimTutorialRewardUnlock}
        />
      </Suspense>
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
                <p className="text-xs text-amber-300 uppercase tracking-wider">{l('Achievement Unlocked!', 'Başarım Açıldı!', 'Conquista Desbloqueada!', 'Logro Desbloqueado!')}</p>
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





