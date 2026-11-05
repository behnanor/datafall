import { getClickEffectsEnabled } from '@/lib/displayPrefs';
import { shiftColorHue } from '@/lib/colorEra';
import { memo, useRef, useState, useEffect, useMemo, useCallback, type RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, X } from 'lucide-react';
import { formatNumber } from '@/lib/useGame';
import type { ResourceType, TimeWarpMiniGameState, TimeWarpResolutionFeedback } from '@/lib/useGame';
import { CyberpunkRoom, type CharacterReaction, type ThemeColors, type SkinPalette } from './CyberpunkRoom';
import { localizeInlineText, useI18n } from '@/lib/i18n';

const DEBUG_PANEL_ENABLED = import.meta.env.DEV;

interface MachinePosition {
  upgradeId: string;
  gridX: number;
  gridY: number;
}

interface MainViewProps {
  onClick: (type: ResourceType, meta?: { timestamp?: number; source?: 'manual' | 'autoclick' }) => { value: number; isCrit: boolean };
  onAutoClickBurst?: (
    type: ResourceType,
    count: number,
    meta?: { timestamp?: number; source?: 'manual' | 'autoclick'; intervalMs?: number }
  ) => { processedClicks: number; totalValue: number; hadCrit: boolean; critCount: number };
  onRightClick?: () => void;
  onAddDebugData?: (amount: number) => void;
  onAddDebugCredits?: (amount: number) => void;
  onAddDebugCrypto?: (amount: number) => void;
  onAddDebugPrestige?: (amount: number) => void;
  onAddDebugAscensionCount?: (amount: number) => void;
  onSpawnDebugPickup?: (type: 'data' | 'credits' | 'crit' | 'autoclick' | 'combo') => void;
  onSpawnAllDebugPickups?: () => void;
  onForceDebugTimeWarp?: () => void;
  onTutorialCameraZoom?: () => void;
  onTutorialCameraPan?: () => void;
  lastUpgradeInfo: { name: string; effect: string } | null;
  onClearUpgrade: () => void;
  dataPerSecond?: number;
  upgrades?: any[];
  totalData?: number;
  totalCredits?: number;
  onAchievementUnlocked?: boolean;
  onPickupCollected?: boolean;
  onClearAchievement?: () => void;
  onClearPickup?: () => void;
  autoClickBoostEndTime?: number;
  critBoostEndTime?: number;
  activeTimeWarpMiniGame?: TimeWarpMiniGameState | null;
  timeWarpFeedback?: TimeWarpResolutionFeedback | null;
  onClearTimeWarpFeedback?: () => void;
  onTimeWarpMiniGameClick?: () => void;
  themeColors?: ThemeColors;
  skinPalette?: SkinPalette;
  activeAccessoryId?: string;
  activeCapeId?: string;
  activeWingId?: string;
  activeHeadStyleId?: string;
  activePetId?: string;
  activeAscensionPetId?: string;
  activeClickEffectId?: string;
  // v1.03 Endless abyss palette: hue for click bursts (null = off).
  abyssHue?: number | null;
  activeMachineBoxSkin?: {
    id: string;
    colors: {
      primary: string;
      secondary: string;
      glow: string;
      mix: number;
    };
  };
  ascensionLevel?: number;
  machinePositions?: MachinePosition[];
  onUpdatePosition?: (upgradeId: string, gridX: number, gridY: number) => void;
  onRemovePosition?: (upgradeId: string) => void;
  tutorialHighlight?: string | null;
  showBlackMarketShip?: boolean;
  onOpenBlackMarket?: () => void;
  showCryptoRelicShip?: boolean;
  onOpenCryptoRelicShop?: () => void;
  showParagonShip?: boolean;
  onOpenParagonShop?: () => void;
  reduceSceneGlow?: boolean;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  value: number;
  isCrit: boolean;
  count?: number;
  isUpgrade?: boolean;
  expiresAt?: number;
}

type ClickBurstShape = 'dot' | 'line' | 'diamond';

interface ClickBurstParticle {
  id: number;
  dx: number;
  dy: number;
  size: number;
  color: string;
  glow: string;
  shape: ClickBurstShape;
}

interface ClickBurst {
  id: number;
  x: number;
  y: number;
  ringColor: string;
  particles: ClickBurstParticle[];
  expiresAt: number;
}

interface ClickEffectVisualConfig {
  particleCount: number;
  spread: number;
  shape: ClickBurstShape;
  ringColor: string;
  colors: string[];
  glows: string[];
}

const CLICK_EFFECT_VISUALS: Record<string, ClickEffectVisualConfig> = {
  ember_surge: {
    particleCount: 10,
    spread: 65,
    shape: 'dot',
    ringColor: 'rgba(251, 146, 60, 0.85)',
    colors: ['#f97316', '#fb923c', '#facc15'],
    glows: ['rgba(249, 115, 22, 0.8)', 'rgba(251, 146, 60, 0.75)', 'rgba(250, 204, 21, 0.7)'],
  },
  ion_arc: {
    particleCount: 9,
    spread: 70,
    shape: 'line',
    ringColor: 'rgba(34, 211, 238, 0.85)',
    colors: ['#22d3ee', '#67e8f9', '#93c5fd'],
    glows: ['rgba(34, 211, 238, 0.8)', 'rgba(103, 232, 249, 0.75)', 'rgba(147, 197, 253, 0.7)'],
  },
  phase_shatter: {
    particleCount: 10,
    spread: 72,
    shape: 'diamond',
    ringColor: 'rgba(168, 85, 247, 0.85)',
    colors: ['#8b5cf6', '#a855f7', '#c084fc'],
    glows: ['rgba(139, 92, 246, 0.8)', 'rgba(168, 85, 247, 0.75)', 'rgba(192, 132, 252, 0.7)'],
  },
  plasma_wave: {
    particleCount: 12,
    spread: 76,
    shape: 'dot',
    ringColor: 'rgba(232, 121, 249, 0.85)',
    colors: ['#e879f9', '#22d3ee', '#f472b6'],
    glows: ['rgba(232, 121, 249, 0.8)', 'rgba(34, 211, 238, 0.75)', 'rgba(244, 114, 182, 0.7)'],
  },
  solar_flare: {
    particleCount: 14,
    spread: 84,
    shape: 'diamond',
    ringColor: 'rgba(251, 191, 36, 0.9)',
    colors: ['#fbbf24', '#facc15', '#fb7185'],
    glows: ['rgba(251, 191, 36, 0.85)', 'rgba(250, 204, 21, 0.8)', 'rgba(251, 113, 133, 0.75)'],
  },
};

interface BoostStatusOverlaysProps {
  autoClickBoostEndTime: number;
  critBoostEndTime: number;
  autoClickActiveLabel: string;
  autoFiringLabel: string;
  critBoostActiveLabel: string;
  critWindowLabel: string;
}

const BoostStatusOverlays = memo(function BoostStatusOverlays({
  autoClickBoostEndTime,
  critBoostEndTime,
  autoClickActiveLabel,
  autoFiringLabel,
  critBoostActiveLabel,
  critWindowLabel,
}: BoostStatusOverlaysProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const hasActiveBoost = autoClickBoostEndTime > now || critBoostEndTime > now;
    if (!hasActiveBoost) return;

    const interval = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(interval);
  }, [autoClickBoostEndTime, critBoostEndTime, now]);

  const autoClickRemainingTime = Math.max(0, autoClickBoostEndTime - now);
  const critRemainingTime = Math.max(0, critBoostEndTime - now);

  return (
    <>
      <AnimatePresence>
        {autoClickRemainingTime > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            className="absolute top-[162px] left-1/2 transform -translate-x-1/2 z-20"
          >
            <div className="bg-fuchsia-500/20 border border-fuchsia-400/60 rounded-lg px-4 py-2 backdrop-blur-sm shadow-[0_0_20px_rgba(232,121,249,0.3)]">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="text-fuchsia-400"
                >
                  ⚡
                </motion.div>
                <div className="text-center">
                  <div className="text-fuchsia-300 text-xs uppercase tracking-wider">{autoClickActiveLabel}</div>
                  <div className="text-fuchsia-400 font-mono font-bold text-xl">
                    {(autoClickRemainingTime / 1000).toFixed(1)}s
                  </div>
                </div>
                <div className="text-fuchsia-300 text-xs">{autoFiringLabel}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {critRemainingTime > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            className="absolute top-[230px] left-1/2 transform -translate-x-1/2 z-20"
          >
            <div className="bg-yellow-500/20 border border-yellow-400/60 rounded-lg px-4 py-2 backdrop-blur-sm shadow-[0_0_20px_rgba(250,204,21,0.3)]">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ scale: [1, 1.18, 1] }}
                  transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut" }}
                  className="text-yellow-300"
                >
                  ✦
                </motion.div>
                <div className="text-center">
                  <div className="text-yellow-200 text-xs uppercase tracking-wider">{critBoostActiveLabel}</div>
                  <div className="text-yellow-300 font-mono font-bold text-xl">
                    {(critRemainingTime / 1000).toFixed(1)}s
                  </div>
                </div>
                <div className="text-yellow-200 text-xs">{critWindowLabel}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

export const MainView = memo(function MainView({ onClick, onAutoClickBurst, onRightClick, onAddDebugData, onAddDebugCredits, onAddDebugCrypto, onAddDebugPrestige, onAddDebugAscensionCount, onSpawnDebugPickup, onSpawnAllDebugPickups, onForceDebugTimeWarp, onTutorialCameraZoom, onTutorialCameraPan, lastUpgradeInfo, onClearUpgrade, dataPerSecond = 0, upgrades = [], totalData = 0, totalCredits = 0, onAchievementUnlocked = false, onPickupCollected = false, onClearAchievement, onClearPickup, autoClickBoostEndTime = 0, critBoostEndTime = 0, activeTimeWarpMiniGame = null, timeWarpFeedback = null, onClearTimeWarpFeedback, onTimeWarpMiniGameClick, themeColors, skinPalette, activeAccessoryId = 'none', activeCapeId = 'none', activeWingId = 'none', activeHeadStyleId = 'default', activePetId = 'none', activeAscensionPetId = 'none', activeClickEffectId = 'none', abyssHue = null, activeMachineBoxSkin, ascensionLevel = 0, machinePositions = [], onUpdatePosition, tutorialHighlight, showBlackMarketShip = false, onOpenBlackMarket, showCryptoRelicShip = false, onOpenCryptoRelicShop, showParagonShip = false, onOpenParagonShop, reduceSceneGlow = false }: MainViewProps) {
  const { language } = useI18n();
  const l = useCallback((en: string, tr: string, pt: string, es?: string, ru?: string) => (
    localizeInlineText(language, en, tr, pt, es, ru)
  ), [language]);
  const [clicks, setClicks] = useState<FloatingText[]>([]);
  const [clickBursts, setClickBursts] = useState<ClickBurst[]>([]);
  const [upgrade, setUpgrade] = useState<FloatingText | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const FLOATING_TEXT_LIFETIME_MS = 1200;
  const CLICK_BURST_LIFETIME_MS = 700;

  useEffect(() => {
    if (!DEBUG_PANEL_ENABLED) {
      setDebugOpen(false);
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') {
        e.preventDefault();
        setDebugOpen(v => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  const [characterReaction, setCharacterReaction] = useState<CharacterReaction>('idle');
  const [lastCheckpoint, setLastCheckpoint] = useState(0);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [timeWarpNow, setTimeWarpNow] = useState(() => Date.now());
  const [timeWarpAnchor, setTimeWarpAnchor] = useState<{ x: number; y: number }>({ x: 360, y: 240 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPosition, setLastPanPosition] = useState({ x: 0, y: 0 });
  const [editMode, setEditMode] = useState(false);
  const dataLabel = l('Data', 'Veri', 'Dados', 'Datos');
  const nodesLabel = l('Nodes', 'Dizin', 'Nodes', 'Nodos');
  const clickPowerLabel = l('Click Power', 'Tıklama Gücü', 'Poder de Clique', 'Poder de Clic');
  const productionRateLabel = l('Production Rate', 'Üretim Hızı', 'Taxa de Producao', 'Tasa de Produccion');
  const autoClickActiveLabel = l('Auto-Click Active', 'Oto-Tıklama Aktif', 'Auto-Clique Ativo', 'Auto-Clic Activo');
  const autoFiringLabel = l('Auto firing', 'Otomatik ates', 'Disparo automático', 'Disparo automático');
  const critBoostActiveLabel = l('Crit Boost Active', 'Kritik Takviye Aktif', 'Impulso Critico Ativo', 'Impulso Critico Activo');
  const critWindowLabel = l('Guaranteed crit window', 'Garantili kritik penceresi', 'Janela critica garantida', 'Ventana critica garantizada');
  const timeWarpAnomalyLabel = l('Time Warp Anomaly', 'Time Warp Anomalisi', 'Anomalia do Time Warp', 'Anomalia de Time Warp');
  const collapseLabel = l('Collapse in', 'Cokmesine kalan', 'Colapso em', 'Colapso en');
  const warpReleasedLabel = l('Time Warp Released', 'Time Warp Serbest', 'Time Warp Liberado', 'Time Warp Liberado');
  const liveEditLabel = l('Arrange Room', 'Odayi Duzenle', 'Organizar Sala', 'Organizar Sala');
  const exitEditLabel = l('Exit Edit', 'Duzenlemeyi Kapat', 'Sair da Edicao', 'Salir de Edicion');
  const containerRef = useRef<HTMLDivElement>(null);
  const blackMarketShipRef = useRef<HTMLButtonElement>(null);
  const cryptoRelicShipRef = useRef<HTMLButtonElement>(null);
  const paragonShipRef = useRef<HTMLButtonElement>(null);
  const autoClickRafRef = useRef<number | null>(null);
  const autoClickLastTickRef = useRef<number>(0);
  const autoClickAccumulatorRef = useRef<number>(0);
  const reactionTimeoutRef = useRef<number | null>(null);

  const queueReactionReset = useCallback((delayMs: number, afterReset?: () => void) => {
    if (reactionTimeoutRef.current !== null) {
      window.clearTimeout(reactionTimeoutRef.current);
    }

    reactionTimeoutRef.current = window.setTimeout(() => {
      reactionTimeoutRef.current = null;
      setCharacterReaction('idle');
      afterReset?.();
    }, delayMs);
  }, []);

  useEffect(() => {
    return () => {
      if (reactionTimeoutRef.current !== null) {
        window.clearTimeout(reactionTimeoutRef.current);
      }
    };
  }, []);

  const isPointInsideElement = (el: HTMLElement | null, clientX: number, clientY: number): boolean => {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  };

  const getShipHitTarget = useCallback((clientX: number, clientY: number): 'black_market' | 'crypto_relic' | 'paragon' | null => {
    if (showBlackMarketShip && isPointInsideElement(blackMarketShipRef.current, clientX, clientY)) return 'black_market';
    if (showCryptoRelicShip && isPointInsideElement(cryptoRelicShipRef.current, clientX, clientY)) return 'crypto_relic';
    if (showParagonShip && isPointInsideElement(paragonShipRef.current, clientX, clientY)) return 'paragon';
    return null;
  }, [showBlackMarketShip, showCryptoRelicShip, showParagonShip]);

  const getMaxPan = useCallback((currentZoom: number) => {
    if (currentZoom <= 1) return { x: 0, y: 0 };
    const maxPanX = (currentZoom - 1) * 250;
    const maxPanY = (currentZoom - 1) * 180;
    return { x: maxPanX, y: maxPanY };
  }, []);

  const pickRandomTimeWarpAnchor = useCallback(() => {
    const container = containerRef.current;
    if (!container) return { x: 340, y: 220 };

    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const portalRadius = 92;
    const minX = portalRadius + 20;
    const maxX = Math.max(minX + 1, width - portalRadius - 20);
    const minY = portalRadius + 14;
    const maxY = Math.max(minY + 1, height - portalRadius - 16);

    const blockedRects = [
      // Top HUD (Total Data + Nodes)
      { x: width * 0.21, y: 0, w: width * 0.58, h: 178 },
      // Checkerboard floor region in room center/bottom
      { x: width * 0.24, y: height * 0.45, w: width * 0.52, h: height * 0.46 },
      // Bottom stats overlays
      { x: 0, y: Math.max(0, height - 210), w: 280, h: 210 },
      { x: Math.max(0, width - 280), y: Math.max(0, height - 220), w: 280, h: 220 },
    ];

    const shipRefs = [
      { show: showBlackMarketShip, ref: blackMarketShipRef },
      { show: showCryptoRelicShip, ref: cryptoRelicShipRef },
      { show: showParagonShip, ref: paragonShipRef },
    ];

    shipRefs.forEach(({ show, ref }) => {
      if (!show || !ref.current) return;
      const shipRect = ref.current.getBoundingClientRect();
      blockedRects.push({
        x: shipRect.left - rect.left - 48,
        y: shipRect.top - rect.top - 48,
        w: shipRect.width + 96,
        h: shipRect.height + 96,
      });
    });

    const intersectsBlocked = (x: number, y: number) => {
      return blockedRects.some(block => {
        const nearestX = Math.max(block.x, Math.min(x, block.x + block.w));
        const nearestY = Math.max(block.y, Math.min(y, block.y + block.h));
        const dx = x - nearestX;
        const dy = y - nearestY;
        return (dx * dx + dy * dy) < Math.pow(portalRadius * 0.9, 2);
      });
    };

    for (let attempt = 0; attempt < 90; attempt++) {
      const candidateX = minX + Math.random() * (maxX - minX);
      const candidateY = minY + Math.random() * (maxY - minY);
      if (!intersectsBlocked(candidateX, candidateY)) {
        return { x: candidateX, y: candidateY };
      }
    }

    return { x: width * 0.82, y: height * 0.24 };
  }, [showBlackMarketShip, showCryptoRelicShip, showParagonShip]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomSpeed = 0.1;
    const newZoom = e.deltaY < 0 
      ? Math.min(zoom + zoomSpeed, 3) 
      : Math.max(zoom - zoomSpeed, 1);
    if (newZoom !== zoom) {
      onTutorialCameraZoom?.();
    }
    setZoom(newZoom);
    
    const maxPan = getMaxPan(newZoom);
    setPan(prev => ({
      x: Math.max(-maxPan.x, Math.min(maxPan.x, prev.x)),
      y: Math.max(-maxPan.y, Math.min(maxPan.y, prev.y))
    }));
  }, [zoom, getMaxPan, onTutorialCameraZoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setLastPanPosition({ x: e.clientX, y: e.clientY });
    } else if (e.button === 2) {
      e.preventDefault();
      onRightClick?.();
    } else if (e.button === 0) {
      if (getShipHitTarget(e.clientX, e.clientY)) {
        return;
      }
      if (!editMode) {
        setIsMouseDown(true);
      }
    }
  }, [editMode, onRightClick, getShipHitTarget]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - lastPanPosition.x;
      const deltaY = e.clientY - lastPanPosition.y;
      if (deltaX !== 0 || deltaY !== 0) {
        onTutorialCameraPan?.();
      }
      const maxPan = getMaxPan(zoom);
      setPan(prev => ({
        x: Math.max(-maxPan.x, Math.min(maxPan.x, prev.x + deltaX)),
        y: Math.max(-maxPan.y, Math.min(maxPan.y, prev.y + deltaY))
      }));
      setLastPanPosition({ x: e.clientX, y: e.clientY });
    }
  }, [isPanning, lastPanPosition, zoom, getMaxPan, onTutorialCameraPan]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) {
      setIsPanning(false);
    } else if (e.button === 0) {
      setIsMouseDown(false);
    }
  }, []);

  const totalUpgrades = useMemo(() => {
    return upgrades.reduce((sum: number, u: any) => sum + (u.count || 0), 0);
  }, [upgrades]);

  useEffect(() => {
    const currentCheckpoint = Math.floor(totalUpgrades / 25);
    if (currentCheckpoint > lastCheckpoint && totalUpgrades > 0) {
      setLastCheckpoint(currentCheckpoint);
      setCharacterReaction('checkpoint');
      queueReactionReset(1500);
    }
  }, [totalUpgrades, lastCheckpoint, queueReactionReset]);

  const triggerCritReaction = useCallback(() => {
    setCharacterReaction('crit');
    queueReactionReset(800);
  }, [queueReactionReset]);

  useEffect(() => {
    if (onAchievementUnlocked && characterReaction === 'idle') {
      setCharacterReaction('achievement');
      queueReactionReset(1200, () => {
        onClearAchievement?.();
      });
    }
  }, [onAchievementUnlocked, characterReaction, onClearAchievement, queueReactionReset]);

  useEffect(() => {
    if (onPickupCollected && characterReaction === 'idle') {
      setCharacterReaction('pickup');
      queueReactionReset(800, () => {
        onClearPickup?.();
      });
    }
  }, [onPickupCollected, characterReaction, onClearPickup, queueReactionReset]);

  useEffect(() => {
    if (!activeTimeWarpMiniGame) return;
    setTimeWarpNow(Date.now());
    const interval = setInterval(() => setTimeWarpNow(Date.now()), 50);
    return () => clearInterval(interval);
  }, [activeTimeWarpMiniGame]);

  useEffect(() => {
    if (!activeTimeWarpMiniGame) return;
    setTimeWarpAnchor(pickRandomTimeWarpAnchor());
  }, [activeTimeWarpMiniGame?.id, pickRandomTimeWarpAnchor]);

  useEffect(() => {
    if (!timeWarpFeedback) return;
    const timeout = window.setTimeout(() => {
      onClearTimeWarpFeedback?.();
    }, 2200);
    return () => window.clearTimeout(timeout);
  }, [timeWarpFeedback, onClearTimeWarpFeedback]);

  useEffect(() => {
    if (clicks.length === 0 && clickBursts.length === 0) return;

    const interval = window.setInterval(() => {
      const now = Date.now();
      setClicks(prev => {
        const hasExpired = prev.some(click => (click.expiresAt ?? 0) <= now);
        return hasExpired ? prev.filter(click => (click.expiresAt ?? 0) > now) : prev;
      });
      setClickBursts(prev => {
        const hasExpired = prev.some(burst => burst.expiresAt <= now);
        return hasExpired ? prev.filter(burst => burst.expiresAt > now) : prev;
      });
    }, 100);

    return () => window.clearInterval(interval);
  }, [clicks.length, clickBursts.length]);

  const createClickLabel = useCallback((value: number, isCrit: boolean) => {
    return language === 'tr'
      ? `+${value.toFixed(1)} VERI${isCrit ? ' KRIT!' : ''}`
      : language === 'pt-BR'
        ? `+${value.toFixed(1)} DADOS${isCrit ? ' CRIT!' : ''}`
        : language === 'es'
          ? `+${value.toFixed(1)} DATOS${isCrit ? ' CRIT!' : ''}`
          : language === 'ru'
            ? `+${value.toFixed(1)} ДАННЫХ${isCrit ? ' КРИТ!' : ''}`
            : `+${value.toFixed(1)} DATA${isCrit ? ' CRIT!' : ''}`;
  }, [language]);

  const pushFloatingText = useCallback((x: number, y: number, value: number, isCrit: boolean, count = 1) => {
    const newClick: FloatingText = {
      id: Date.now() + Math.random(),
      x,
      y,
      text: createClickLabel(value, isCrit),
      value,
      isCrit,
      count,
      expiresAt: Date.now() + FLOATING_TEXT_LIFETIME_MS,
    };

    setClicks(prev => {
      const next = [...prev, newClick];
      if (next.length > 20) return next.slice(next.length - 20);
      return next;
    });
  }, [FLOATING_TEXT_LIFETIME_MS, createClickLabel]);

  const spawnClickBurst = useCallback((x: number, y: number, isCrit: boolean) => {
    if (!getClickEffectsEnabled()) return; // v1.04 Settings: click effects off
    const baseVisual = CLICK_EFFECT_VISUALS[activeClickEffectId] ?? (abyssHue !== null ? CLICK_EFFECT_VISUALS.ion_arc : undefined);
    if (!baseVisual) return;
    // Abyss palette: rotate the effect's colours (shiftColorHue works on hex and rgba) and add two particles.
    const visual = abyssHue === null ? baseVisual : {
      ...baseVisual,
      particleCount: baseVisual.particleCount + 2,
      ringColor: shiftColorHue(baseVisual.ringColor, abyssHue),
      colors: baseVisual.colors.map(c => shiftColorHue(c, abyssHue)),
      glows: baseVisual.glows.map(c => shiftColorHue(c, abyssHue)),
    };

    const particleCount = visual.particleCount + (isCrit ? 3 : 0);
    const spread = visual.spread + (isCrit ? 18 : 0);
    const burstId = Date.now() + Math.random();
    const particles: ClickBurstParticle[] = Array.from({ length: particleCount }, (_, index) => {
      const angle = (Math.PI * 2 * index) / particleCount + (Math.random() - 0.5) * 0.45;
      const distance = spread * (0.45 + Math.random() * 0.65);
      const colorIndex = Math.floor(Math.random() * visual.colors.length);
      return {
        id: burstId + index / 1000,
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance,
        size: visual.shape === 'line' ? 3 + Math.random() * 4 : 4 + Math.random() * 5,
        color: visual.colors[colorIndex],
        glow: visual.glows[colorIndex] || visual.glows[0],
        shape: visual.shape,
      };
    });

    const burst: ClickBurst = {
      id: burstId,
      x: x + 20,
      y: y - 30,
      ringColor: visual.ringColor,
      particles,
      expiresAt: Date.now() + CLICK_BURST_LIFETIME_MS,
    };

    setClickBursts(prev => {
      const next = [...prev, burst];
      if (next.length > 30) return next.slice(next.length - 30);
      return next;
    });

  }, [CLICK_BURST_LIFETIME_MS, activeClickEffectId, abyssHue]);

  // Auto-click boost runs automatically while active.
  // Uses time-based catch-up so low FPS/frame drops do not reduce effective auto-click rate.
  useEffect(() => {
    const AUTO_CLICK_INTERVAL_MS = 50; // Slightly faster auto-click target.
    const MAX_CATCH_UP_CLICKS = 6; // Better recovery during frame drops without huge bursts.
    const isBoostActive = autoClickBoostEndTime > Date.now();
    
    if (isBoostActive && containerRef.current) {
      const tick = (frameNow: number) => {
        if (Date.now() >= autoClickBoostEndTime) {
          autoClickLastTickRef.current = 0;
          autoClickAccumulatorRef.current = 0;
          autoClickRafRef.current = null;
          return;
        }

        if (!containerRef.current) {
          autoClickRafRef.current = requestAnimationFrame(tick);
          return;
        }

        if (autoClickLastTickRef.current === 0) {
          autoClickLastTickRef.current = frameNow;
        }

        const deltaMs = frameNow - autoClickLastTickRef.current;
        autoClickLastTickRef.current = frameNow;
        autoClickAccumulatorRef.current += Math.max(0, deltaMs);

        let clicksToProcess = Math.floor(autoClickAccumulatorRef.current / AUTO_CLICK_INTERVAL_MS);
        if (clicksToProcess > 0) {
          clicksToProcess = Math.min(clicksToProcess, MAX_CATCH_UP_CLICKS);
          autoClickAccumulatorRef.current -= clicksToProcess * AUTO_CLICK_INTERVAL_MS;

          const rect = containerRef.current.getBoundingClientRect();
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const randomOffsetX = (Math.random() - 0.5) * 100;
          const randomOffsetY = (Math.random() - 0.5) * 60;
          const clickX = centerX + randomOffsetX;
          const clickY = centerY + randomOffsetY;

          if (onAutoClickBurst) {
            const burstResult = onAutoClickBurst('data', clicksToProcess, {
              timestamp: Date.now(),
              source: 'autoclick',
              intervalMs: AUTO_CLICK_INTERVAL_MS,
            });

            if (burstResult.processedClicks > 0) {
              if (burstResult.hadCrit && characterReaction === 'idle') {
                triggerCritReaction();
              }

              pushFloatingText(clickX, clickY, burstResult.totalValue, burstResult.hadCrit, burstResult.processedClicks);
              spawnClickBurst(clickX, clickY, burstResult.hadCrit);
            }
          } else {
            let burstHadCrit = false;

            for (let i = 0; i < clicksToProcess; i++) {
              const simulatedTimestamp = Date.now() - ((clicksToProcess - 1 - i) * AUTO_CLICK_INTERVAL_MS);
              const { value, isCrit } = onClick('data', { timestamp: simulatedTimestamp, source: 'autoclick' });
              if (value <= 0) continue;

              if (isCrit && characterReaction === 'idle') {
                triggerCritReaction();
              }

              burstHadCrit = burstHadCrit || isCrit;
              pushFloatingText(clickX, clickY, value, isCrit);
            }

            spawnClickBurst(clickX, clickY, burstHadCrit);
          }
        }

        autoClickRafRef.current = requestAnimationFrame(tick);
      };

      autoClickRafRef.current = requestAnimationFrame(tick);
    } else {
      autoClickLastTickRef.current = 0;
      autoClickAccumulatorRef.current = 0;
      if (autoClickRafRef.current !== null) {
        cancelAnimationFrame(autoClickRafRef.current);
        autoClickRafRef.current = null;
      }
    }
    
    return () => {
      autoClickLastTickRef.current = 0;
      autoClickAccumulatorRef.current = 0;
      if (autoClickRafRef.current !== null) {
        cancelAnimationFrame(autoClickRafRef.current);
        autoClickRafRef.current = null;
      }
    };
  }, [autoClickBoostEndTime, characterReaction, onAutoClickBurst, onClick, pushFloatingText, spawnClickBurst, triggerCritReaction]);

  const getClickPowerMultiplier = () => {
    let multiplier = 1;
    upgrades.forEach((u: any) => {
      if (u.count > 0 && u.effect.type === 'click_multiplier') {
        multiplier += u.effect.value * u.count;
      }
    });
    return multiplier;
  };

  const clickPower = clicks.reduce((sum, c) => sum + c.value, 0) * getClickPowerMultiplier();

  useEffect(() => {
    if (lastUpgradeInfo) {
      const upgradeFloat: FloatingText = {
        id: Date.now() + Math.random(),
        x: 0,
        y: 0,
        text: `${lastUpgradeInfo.name} ${lastUpgradeInfo.effect}`,
        value: 0,
        isCrit: false,
        isUpgrade: true,
      };
      
      setUpgrade(upgradeFloat);
      
      // Clear after 2 seconds
      const timeoutId = setTimeout(() => {
        setUpgrade(null);
        onClearUpgrade();
      }, 2000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [lastUpgradeInfo]);

  const spawnClickAt = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const { value, isCrit } = onClick('data');
    if (value <= 0) return;

    if (isCrit && characterReaction === 'idle') {
      triggerCritReaction();
    }

    pushFloatingText(x + 20, y - 30, value, isCrit);
    spawnClickBurst(x, y, isCrit);
  };

  const handleClick = (e: React.MouseEvent) => {
    const shipHit = getShipHitTarget(e.clientX, e.clientY);
    if (shipHit) {
      e.preventDefault();
      if (shipHit === 'black_market') onOpenBlackMarket?.();
      if (shipHit === 'crypto_relic') onOpenCryptoRelicShop?.();
      if (shipHit === 'paragon') onOpenParagonShop?.();
      return;
    }
    spawnClickAt(e.clientX, e.clientY);
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const shipHit = getShipHitTarget(e.clientX, e.clientY);
    if (shipHit) {
      if (shipHit === 'black_market') onOpenBlackMarket?.();
      if (shipHit === 'crypto_relic') onOpenCryptoRelicShop?.();
      if (shipHit === 'paragon') onOpenParagonShop?.();
      return;
    }
    spawnClickAt(e.clientX, e.clientY);
    onRightClick?.();
  };

  const timeWarpRemainingMs = activeTimeWarpMiniGame
    ? Math.max(0, activeTimeWarpMiniGame.endsAt - timeWarpNow)
    : 0;
  const timeWarpRemainingRatio = activeTimeWarpMiniGame
    ? Math.max(0, Math.min(1, timeWarpRemainingMs / Math.max(1, activeTimeWarpMiniGame.durationMs)))
    : 0;

  const formatWarpDuration = (seconds: number) => {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const remSeconds = safeSeconds % 60;
    if (minutes > 0) {
      if (language === 'tr') return `${minutes}dk ${remSeconds}sn`;
      if (language === 'pt-BR') return `${minutes}min ${remSeconds}s`;
      if (language === 'es') return `${minutes}min ${remSeconds}s`;
      if (language === 'ru') return `${minutes}мин ${remSeconds}с`;
      return `${minutes}m ${remSeconds}s`;
    }
    if (language === 'tr') return `${remSeconds}sn`;
    if (language === 'ru') return `${remSeconds}с`;
    return `${remSeconds}s`;
  };

  const renderShopShip = (options: {
    buttonRef: RefObject<HTMLButtonElement | null>;
    onOpen?: () => void;
    left: string;
    top: string;
    label: string;
    ariaLabel: string;
    idPrefix: string;
    cyanFrom: string;
    cyanTo: string;
    magentaFrom: string;
    magentaTo: string;
    variant?: 'classic' | 'relic' | 'paragon';
    motionProfile?: 'soft' | 'wide' | 'tight';
  }) => (
    <motion.button
      ref={options.buttonRef}
      type="button"
      onClick={options.onOpen}
      className="absolute z-30 bg-transparent p-0 text-left shadow-none"
      style={{ left: options.left, top: options.top }}
      animate={
        options.motionProfile === 'wide'
          ? { x: [0, 18, -10, 0], y: [0, -10, 7, 0], rotateZ: [-1.8, 1.8, -1.8] }
          : options.motionProfile === 'tight'
            ? { x: [0, 10, -6, 0], y: [0, -6, 4, 0], rotateZ: [-1.2, 1.2, -1.2] }
            : { x: [0, 14, -8, 0], y: [0, -8, 6, 0], rotateZ: [-1.5, 1.5, -1.5] }
      }
      transition={{
        duration: options.motionProfile === 'wide' ? 8.8 : options.motionProfile === 'tight' ? 7.1 : 8,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      aria-label={options.ariaLabel}
      data-testid={`${options.idPrefix}-spaceship`}
    >
      <div className="relative pointer-events-none" style={{ perspective: 960 }}>
        <motion.div
          animate={
            options.motionProfile === 'wide'
              ? { rotateY: [-12, 12, -12] }
              : options.motionProfile === 'tight'
                ? { rotateY: [-8, 8, -8] }
                : { rotateY: [-10, 10, -10] }
          }
          transition={{
            duration: options.motionProfile === 'wide' ? 5.9 : options.motionProfile === 'tight' ? 4.6 : 5.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <svg width="216" height="188" viewBox="0 0 216 188" style={{ filter: 'drop-shadow(0 0 20px rgba(232,121,249,0.38))' }}>
            <defs>
              <linearGradient id={`${options.idPrefix}-neon-cyan`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={options.cyanFrom} />
                <stop offset="100%" stopColor={options.cyanTo} />
              </linearGradient>
              <linearGradient id={`${options.idPrefix}-neon-magenta`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={options.magentaFrom} />
                <stop offset="100%" stopColor={options.magentaTo} />
              </linearGradient>
            </defs>
            <rect x="150" y="146" width="10" height="5" fill={options.cyanFrom} />
            <rect x="162" y="146" width="5" height="5" fill={options.cyanFrom} />
            <rect x="28" y="150" width="10" height="5" fill={options.magentaFrom} />
            <rect x="40" y="150" width="5" height="5" fill={options.magentaFrom} />
            {options.variant === 'relic' ? (
              <g transform="translate(8,20)">
                <path
                  d="M8 116 L34 98 L64 92 L98 90 L132 92 L162 98 L188 116 L180 126 L168 130 L146 132 L50 132 L28 130 L16 126 Z"
                  fill="rgba(6,10,30,0.94)"
                  stroke={`url(#${options.idPrefix}-neon-magenta)`}
                  strokeWidth="3.2"
                />
                <path d="M30 112 L56 102 L160 102 L186 112 L176 120 L40 120 Z" fill={`url(#${options.idPrefix}-neon-cyan)`} opacity="0.35" />
                <rect x="48" y="108" width="118" height="8" rx="2" fill={`url(#${options.idPrefix}-neon-cyan)`} opacity="0.86" />
                <path d="M96 90 L120 90 L132 74 L84 74 Z" fill="rgba(10,18,42,0.95)" stroke={`url(#${options.idPrefix}-neon-magenta)`} strokeWidth="2.6" />
                <path d="M90 74 L126 74 L118 56 L98 56 Z" fill="rgba(8,20,44,0.96)" stroke={`url(#${options.idPrefix}-neon-cyan)`} strokeWidth="2" />
                <path d="M108 36 L124 56 L108 76 L92 56 Z" fill={`url(#${options.idPrefix}-neon-cyan)`} opacity="0.8" stroke="#9ff7ff" strokeWidth="1.6" />
                <path d="M108 42 L118 56 L108 68 L98 56 Z" fill="rgba(10,230,255,0.25)" />
                <path d="M42 98 L52 82 L70 80 L60 98 Z" fill="rgba(7,21,45,0.95)" stroke={`url(#${options.idPrefix}-neon-magenta)`} strokeWidth="2.2" />
                <path d="M174 98 L164 82 L146 80 L156 98 Z" fill="rgba(7,21,45,0.95)" stroke={`url(#${options.idPrefix}-neon-magenta)`} strokeWidth="2.2" />
                <path d="M108 132 L98 156 L118 156 Z" fill={`url(#${options.idPrefix}-neon-cyan)`} opacity="0.85" />
              </g>
            ) : options.variant === 'paragon' ? (
              <g transform="translate(8,16)">
                <ellipse cx="100" cy="88" rx="86" ry="44" fill="rgba(5,10,32,0.86)" stroke={`url(#${options.idPrefix}-neon-magenta)`} strokeWidth="3" />
                <ellipse cx="100" cy="88" rx="68" ry="30" fill="rgba(8,14,40,0.95)" stroke={`url(#${options.idPrefix}-neon-cyan)`} strokeWidth="2.4" />
                <ellipse cx="100" cy="88" rx="52" ry="20" fill="none" stroke={`url(#${options.idPrefix}-neon-cyan)`} strokeWidth="2" opacity="0.92" />
                <ellipse cx="100" cy="72" rx="24" ry="14" fill="rgba(8,16,48,0.95)" stroke={`url(#${options.idPrefix}-neon-magenta)`} strokeWidth="2.2" />
                <circle cx="100" cy="72" r="10" fill={`url(#${options.idPrefix}-neon-cyan)`} opacity="0.92" />
                <circle cx="100" cy="72" r="5" fill="#e0fbff" opacity="0.9" />
                <path d="M100 22 L100 60" stroke={`url(#${options.idPrefix}-neon-cyan)`} strokeWidth="3" opacity="0.9" />
                <path d="M100 104 L100 160" stroke={`url(#${options.idPrefix}-neon-cyan)`} strokeWidth="3" opacity="0.78" />
                <rect x="24" y="84" width="152" height="8" rx="2" fill={`url(#${options.idPrefix}-neon-cyan)`} opacity="0.86" />
                <path d="M34 116 L50 100 L64 100 L48 116 Z" fill="rgba(10,20,50,0.95)" stroke={`url(#${options.idPrefix}-neon-magenta)`} strokeWidth="2.2" />
                <path d="M166 116 L150 100 L136 100 L152 116 Z" fill="rgba(10,20,50,0.95)" stroke={`url(#${options.idPrefix}-neon-magenta)`} strokeWidth="2.2" />
                <rect x="48" y="50" width="10" height="22" fill={`url(#${options.idPrefix}-neon-cyan)`} opacity="0.75" />
                <rect x="142" y="50" width="10" height="22" fill={`url(#${options.idPrefix}-neon-cyan)`} opacity="0.75" />
              </g>
            ) : (
              <g transform="translate(16,22)">
                <path
                  d="M26 128 L58 90 L112 90 L142 58 L151 63 L144 74 L166 69 L181 84 L162 92 L167 118 L142 134 L125 170 L96 140 L67 153 L57 138 L31 149 L19 136 L28 121 Z"
                  fill="rgba(8, 6, 24, 0.9)"
                  stroke={`url(#${options.idPrefix}-neon-magenta)`}
                  strokeWidth="3.4"
                  strokeLinejoin="round"
                />
                <path d="M40 122 L64 96 L101 96 L78 114 Z" fill={`url(#${options.idPrefix}-neon-cyan)`} opacity="0.92" />
                <path d="M111 92 L126 77 L139 81 L122 96 Z" fill={`url(#${options.idPrefix}-neon-cyan)`} opacity="0.88" />
                <path d="M146 84 L159 70 L169 72 L156 86 Z" fill={`url(#${options.idPrefix}-neon-cyan)`} opacity="0.86" />
                <path d="M86 144 L105 131 L114 136 L94 149 Z" fill={`url(#${options.idPrefix}-neon-cyan)`} opacity="0.84" />
                <path d="M136 152 L149 119 L154 119 L141 154 Z" fill={`url(#${options.idPrefix}-neon-cyan)`} opacity="0.82" />
                <path d="M32 126 L44 138 L44 154 L27 139 Z" fill="rgba(52,214,243,0.24)" stroke={`url(#${options.idPrefix}-neon-magenta)`} strokeWidth="2.5" />
                <path d="M64 90 L114 90 L124 99 L72 99 Z" fill="rgba(8, 6, 24, 0.95)" stroke={`url(#${options.idPrefix}-neon-magenta)`} strokeWidth="2.4" />
                <path d="M114 90 L142 58" stroke={`url(#${options.idPrefix}-neon-magenta)`} strokeWidth="2.5" />
                <path d="M79 114 L121 75" stroke={`url(#${options.idPrefix}-neon-magenta)`} strokeWidth="2.4" />
                <path d="M57 136 L40 146" stroke={`url(#${options.idPrefix}-neon-magenta)`} strokeWidth="2.2" />
                <path d="M121 96 L144 116" stroke={`url(#${options.idPrefix}-neon-magenta)`} strokeWidth="2.2" />
                <path d="M28 121 L64 90" stroke={`url(#${options.idPrefix}-neon-magenta)`} strokeWidth="2.2" opacity="0.88" />
                <path d="M67 153 L31 149" stroke={`url(#${options.idPrefix}-neon-magenta)`} strokeWidth="2.1" opacity="0.82" />
                <path d="M125 170 L142 134" stroke={`url(#${options.idPrefix}-neon-magenta)`} strokeWidth="2.1" opacity="0.82" />
              </g>
            )}
          </svg>
        </motion.div>
        <motion.div
          className="absolute left-1/2 top-[146px] -translate-x-1/2 rounded-md border border-cyan-400/70 bg-slate-950/70 px-3 py-1"
          animate={{ opacity: [0.78, 1, 0.78] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            boxShadow: '0 0 16px rgba(34,211,238,0.45), inset 0 0 12px rgba(34,211,238,0.15)',
          }}
        >
          <div className="text-[10px] font-mono font-bold tracking-[0.22em] text-cyan-300 whitespace-nowrap">
            {options.label}
          </div>
        </motion.div>
      </div>
    </motion.button>
  );

  return (
    <div 
      className="flex-1 relative overflow-hidden bg-black isolate" 
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { setIsPanning(false); setIsMouseDown(false); }}
    >
      {/* Pixel Art Isometric Room Background */}
      <div 
        style={{ 
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isPanning ? 'none' : 'transform 0.1s ease-out'
        }}
        className="w-full h-full relative"
      >
        <CyberpunkRoom 
          key={reduceSceneGlow ? 'cyberpunk-room-reduced-glow' : 'cyberpunk-room-full-glow'}
          upgrades={upgrades} 
          characterReaction={characterReaction} 
          themeColors={themeColors} 
          skinPalette={skinPalette} 
          activeAccessoryId={activeAccessoryId} 
          activeCapeId={activeCapeId}
          activeWingId={activeWingId}
          activeHeadStyleId={activeHeadStyleId} 
          activePetId={activePetId} 
          activeAscensionPetId={activeAscensionPetId}
          machineColorSkin={activeMachineBoxSkin?.colors}
          ascensionLevel={ascensionLevel}
          machinePositions={machinePositions}
          debugTileCenters={editMode}
          editMode={editMode}
          onUpdateMachinePosition={onUpdatePosition}
          reduceSceneGlow={reduceSceneGlow}
        />

        {/* Keep scanlines on room layer only (not HUD/panels) */}
        <div className="scanlines absolute inset-0 pointer-events-none" />

        {showCryptoRelicShip && renderShopShip({
          buttonRef: cryptoRelicShipRef,
          onOpen: onOpenCryptoRelicShop,
          left: '58%',
          top: 'calc(39% + 375px)',
          label: l('RELIC FORGE', 'YADIGAR DÜKKÂNI', 'LOJA DE RELÍQUIAS', 'TIENDA DE RELIQUIAS'),
          ariaLabel: l('Open Crypto Relic Shop', 'Yadigar Dükkânını Aç', 'Abrir Loja de Relíquias', 'Abrir Tienda de Reliquias'),
          idPrefix: 'crypto-relic',
          cyanFrom: '#3df1ff',
          cyanTo: '#34d6f3',
          magentaFrom: '#f87171',
          magentaTo: '#ef4444',
          variant: 'relic',
          motionProfile: 'wide',
        })}

        {showBlackMarketShip && renderShopShip({
          buttonRef: blackMarketShipRef,
          onOpen: onOpenBlackMarket,
          left: '70%',
          top: '30%',
          label: l('BLACK MARKET', 'KARABORSA PAZAR', 'MERCADO NEGRO', 'MERCADO NEGRO'),
          ariaLabel: l('Open Black Market', 'Karaborsa Pazarı Aç', 'Abrir Mercado Negro', 'Abrir Mercado Negro'),
          idPrefix: 'black-market',
          cyanFrom: '#7cf6ff',
          cyanTo: '#34d6f3',
          magentaFrom: '#ff69ff',
          magentaTo: '#d946ef',
          motionProfile: 'tight',
        })}

        {showParagonShip && renderShopShip({
          buttonRef: paragonShipRef,
          onOpen: onOpenParagonShop,
          left: '58%',
          top: '14%',
          label: l('PARAGON LAB', 'PARAGON LABORATUVARI', 'LABORATORIO PARAGON', 'LABORATORIO PARAGON'),
          ariaLabel: l('Open Paragon Lab', 'Paragon Laboratuvarını Aç', 'Abrir Laboratório Paragon', 'Abrir Laboratorio Paragon'),
          idPrefix: 'paragon-lab',
          cyanFrom: '#fde68a',
          cyanTo: '#f59e0b',
          magentaFrom: '#c084fc',
          magentaTo: '#9333ea',
          variant: 'paragon',
          motionProfile: 'soft',
        })}
      </div>

      {/* Tutorial Core Highlight - Center pulse ring */}
      {(tutorialHighlight === 'core' || tutorialHighlight === 'core_right' || tutorialHighlight === 'camera_zoom' || tutorialHighlight === 'camera_pan') && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
          <div className="w-48 h-48 rounded-full border-4 border-cyan-400/50 tutorial-highlight" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-400 text-xs font-mono uppercase tracking-wider animate-pulse">
            {tutorialHighlight === 'core_right'
              ? l('Right-click here!', 'Burada sag tikla!', 'Clique com o botão direito aqui!', 'Haz clic derecho aqui!')
              : tutorialHighlight === 'camera_zoom'
                ? l('Use mouse wheel to zoom', 'Fare tekerlegiyle yakinlastir', 'Use a roda do mouse para aproximar', 'Usa la rueda del raton para acercar')
                : tutorialHighlight === 'camera_pan'
                  ? l('Hold middle mouse and drag', 'Orta tusa basili tutup surukle', 'Segure o botão do meio e arraste', 'Mantén pulsado el boton central y arrastra')
                  : l('Click here!', 'Buraya tikla!', 'Clique aqui!', 'Haz clic aqui!')}
          </div>
        </div>
      )}

      {/* Total Data - Top Center */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-20 text-center flex gap-12">
        <div className="text-center">
          <div 
            className="font-mono font-bold text-cyan-400 glow-text tracking-tight"
            style={{ fontSize: `clamp(1.5rem, 2.5rem, 3rem)` }}
          >
            {formatNumber(Math.floor(totalData))}
          </div>
          <div className="text-xs font-mono text-cyan-400/60 uppercase tracking-widest mt-2">
            {l('Total Data', 'Toplam Veri', 'Dados Totais', 'Datos Totales')}
          </div>
        </div>

        <div className="text-center">
          <div 
            className="font-mono font-bold text-amber-400 glow-text tracking-tight"
            style={{ fontSize: `clamp(1.5rem, 2.5rem, 3rem)` }}
          >
            {formatNumber(Math.floor(totalCredits))}
          </div>
          <div className="text-xs font-mono text-amber-400/60 uppercase tracking-widest mt-2">
            {nodesLabel}
          </div>
        </div>
      </div>

      <BoostStatusOverlays
        autoClickBoostEndTime={autoClickBoostEndTime}
        critBoostEndTime={critBoostEndTime}
        autoClickActiveLabel={autoClickActiveLabel}
        autoFiringLabel={autoFiringLabel}
        critBoostActiveLabel={critBoostActiveLabel}
        critWindowLabel={critWindowLabel}
      />

      <AnimatePresence>
        {activeTimeWarpMiniGame && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 pointer-events-none"
          >
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: -12 }}
              onClick={(e) => {
                e.stopPropagation();
                onTimeWarpMiniGameClick?.();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.preventDefault()}
              className="pointer-events-auto absolute"
              style={{
                left: `${timeWarpAnchor.x}px`,
                top: `${timeWarpAnchor.y}px`,
                transform: 'translate(-50%, -50%)',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              data-testid="timewarp-minigame"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="relative h-44 w-44">
                  <motion.div
                    className="absolute inset-0"
                    animate={{
                      rotate: 360,
                      scale: [1, 1.04, 1],
                      borderRadius: [
                        '56% 44% 48% 52% / 45% 55% 47% 53%',
                        '46% 54% 57% 43% / 60% 40% 58% 42%',
                        '56% 44% 48% 52% / 45% 55% 47% 53%',
                      ],
                    }}
                    transition={{
                      rotate: { duration: 7, repeat: Infinity, ease: 'linear' },
                      scale: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' },
                      borderRadius: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' },
                    }}
                    style={{
                      background:
                        'radial-gradient(circle at 50% 50%, rgba(139,92,246,0.3) 0%, rgba(244,114,182,0.22) 34%, rgba(34,211,238,0.16) 58%, rgba(0,0,0,0) 80%)',
                      boxShadow: '0 0 32px rgba(168,85,247,0.58), 0 0 64px rgba(34,211,238,0.22)',
                      filter: 'blur(1.2px)',
                    }}
                  />
                  <motion.div
                    className="absolute inset-[14px]"
                    style={{
                      background:
                        'conic-gradient(from 30deg, rgba(34,211,238,0.88), rgba(168,85,247,0.88), rgba(236,72,153,0.9), rgba(34,211,238,0.88))',
                      borderRadius: '62% 38% 42% 58% / 48% 52% 44% 56%',
                      filter: 'blur(0.9px)',
                    }}
                    animate={{ rotate: -360 }}
                    transition={{ duration: 3.3, repeat: Infinity, ease: 'linear' }}
                  />
                  <div
                    className="absolute inset-[28px]"
                    style={{
                      borderRadius: '58% 42% 44% 56% / 40% 60% 46% 54%',
                      background:
                        'radial-gradient(circle at 45% 32%, rgba(236,72,153,0.52) 0%, rgba(109,40,217,0.82) 28%, rgba(37,0,75,0.95) 62%, rgba(6,2,18,1) 100%)',
                      boxShadow: 'inset 0 0 26px rgba(34,211,238,0.24), 0 0 18px rgba(236,72,153,0.35)',
                    }}
                  />
                  <motion.div
                    className="absolute inset-[58px] rounded-full bg-black"
                    animate={{ scale: [1, 0.94, 1] }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ boxShadow: '0 0 22px rgba(0,0,0,0.98), inset 0 0 10px rgba(8,8,8,0.95)' }}
                  />
                </div>

                <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-violet-200 drop-shadow-[0_0_8px_rgba(168,85,247,0.7)]">
                  {timeWarpAnomalyLabel}
                </div>
                <div className="text-xs font-mono text-cyan-200 drop-shadow-[0_0_8px_rgba(34,211,238,0.55)]">
                  {language === 'tr'
                    ? `Tıklama: ${activeTimeWarpMiniGame.clicks} | Sarmal: ${formatWarpDuration(activeTimeWarpMiniGame.projectedSeconds)}`
                    : language === 'es'
                      ? `Clics: ${activeTimeWarpMiniGame.clicks} | Warp: ${formatWarpDuration(activeTimeWarpMiniGame.projectedSeconds)}`
                      : language === 'ru'
                        ? `Клики: ${activeTimeWarpMiniGame.clicks} | Варп: ${formatWarpDuration(activeTimeWarpMiniGame.projectedSeconds)}`
                    : `Clicks: ${activeTimeWarpMiniGame.clicks} | Warp: ${formatWarpDuration(activeTimeWarpMiniGame.projectedSeconds)}`}
                </div>
                <div className="w-48">
                  <div className="mb-1 text-[10px] font-mono text-violet-200/85">
                    {language === 'tr'
                      ? `${collapseLabel} ${(timeWarpRemainingMs / 1000).toFixed(1)}sn`
                      : language === 'ru'
                        ? `${collapseLabel} ${(timeWarpRemainingMs / 1000).toFixed(1)}с`
                      : `${collapseLabel} ${(timeWarpRemainingMs / 1000).toFixed(1)}s`}
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-violet-950/55">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-violet-500 transition-all duration-75"
                      style={{ width: `${timeWarpRemainingRatio * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {timeWarpFeedback && (
          <motion.div
            key={timeWarpFeedback.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[45] pointer-events-none"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.72 }}
              animate={{ opacity: [0, 0.95, 0], scale: [0.72, 1.05, 1.18] }}
              transition={{ duration: 1.15, ease: 'easeOut' }}
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at center, rgba(34,211,238,0.22) 0%, rgba(168,85,247,0.18) 24%, rgba(14,165,233,0.1) 42%, rgba(0,0,0,0) 72%)',
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="absolute left-1/2 top-1/2 w-[min(88vw,34rem)] -translate-x-1/2 -translate-y-1/2"
            >
              <div className="rounded-2xl border border-cyan-400/40 bg-slate-950/72 px-5 py-4 text-center shadow-[0_0_40px_rgba(34,211,238,0.22)] backdrop-blur-md">
                <div className="mb-2 text-[11px] font-mono uppercase tracking-[0.28em] text-cyan-200/85">
                  {warpReleasedLabel}
                </div>
                <div className="text-2xl font-mono font-bold text-white drop-shadow-[0_0_10px_rgba(34,211,238,0.42)]">
                  +{Math.floor(timeWarpFeedback.bonusSeconds / 60)}m
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs font-mono">
                  {timeWarpFeedback.dataBonus > 0 && (
                    <span className="rounded-full border border-cyan-400/35 bg-cyan-500/12 px-2.5 py-1 text-cyan-200">
                      +{formatNumber(timeWarpFeedback.dataBonus)} {dataLabel}
                    </span>
                  )}
                  {timeWarpFeedback.creditsBonus > 0 && (
                    <span className="rounded-full border border-amber-400/35 bg-amber-500/12 px-2.5 py-1 text-amber-200">
                      +{formatNumber(timeWarpFeedback.creditsBonus)} {nodesLabel}
                    </span>
                  )}
                  {timeWarpFeedback.cryptoBonus > 0 && (
                    <span className="rounded-full border border-emerald-400/35 bg-emerald-500/12 px-2.5 py-1 text-emerald-200">
                      +{formatNumber(timeWarpFeedback.cryptoBonus)} CRYPTO
                    </span>
                  )}
                </div>
                <div className="mt-2 text-[11px] font-mono text-violet-200/80">
                  {language === 'tr'
                    ? `${timeWarpFeedback.clicks} tiklama ile depolandi`
                    : language === 'es'
                      ? `Almacenado con ${timeWarpFeedback.clicks} clics`
                      : language === 'ru'
                        ? `Сохранено за ${timeWarpFeedback.clicks} кликов`
                        : `Stored from ${timeWarpFeedback.clicks} clicks`}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click Power - Bottom Left */}
      <div className="absolute bottom-12 left-12 z-20 text-center">
        <motion.div 
          className="font-mono font-bold text-cyan-400 glow-text tracking-tight"
          key={`clicks-${Math.floor(clickPower / 10)}`}
          animate={{ 
            scale: 1 + Math.min(clickPower / 200, 0.3),
          }}
          transition={{ type: "tween", duration: 0.2 }}
          style={{ fontSize: `clamp(1.5rem, ${1 + clickPower * 0.006}rem, 3rem)` }}
        >
          {formatNumber(Math.floor(clickPower))}
        </motion.div>
        <div className="text-xs font-mono text-cyan-400/60 uppercase tracking-widest mt-2">
          {clickPowerLabel}
        </div>
      </div>

      {/* Production Rate - Bottom Right */}
      <div className="absolute bottom-12 right-12 z-20 text-center">
        <div className="text-sm font-mono text-cyan-400/80 uppercase tracking-widest mb-1">
          {productionRateLabel}
        </div>
        <div className="text-4xl font-mono font-bold text-cyan-400 glow-text tracking-tight">
          +{formatNumber(dataPerSecond)}/s
        </div>
      </div>

      {/* Interactive Overlay - The Click Zone (disabled in edit mode) */}
      {!editMode && (
        <div 
          className="absolute inset-0"
          onClick={handleClick}
          onContextMenu={handleRightClick}
        />
      )}

      <AnimatePresence>
        {clickBursts.map((burst) => (
          <div
            key={burst.id}
            className="absolute pointer-events-none z-40"
            style={{
              left: `${burst.x}px`,
              top: `${burst.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <motion.div
              initial={{ opacity: 0.8, scale: 0.35 }}
              animate={{ opacity: 0, scale: 1.45 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="absolute left-0 top-0 h-10 w-10 rounded-full border"
              style={{
                borderColor: burst.ringColor,
                boxShadow: `0 0 20px ${burst.ringColor}`,
                transform: 'translate(-50%, -50%)',
              }}
            />
            {burst.particles.map((particle) => (
              <motion.span
                key={particle.id}
                initial={{ opacity: 1, x: 0, y: 0, scale: 0.9 }}
                animate={{ opacity: 0, x: particle.dx, y: particle.dy, scale: 0.4 }}
                transition={{ duration: 0.65, ease: 'easeOut' }}
                className="absolute left-0 top-0"
                style={{
                  width: particle.shape === 'line' ? `${particle.size * 2}px` : `${particle.size}px`,
                  height: particle.shape === 'line' ? `${Math.max(2, particle.size * 0.4)}px` : `${particle.size}px`,
                  borderRadius: particle.shape === 'line' ? '999px' : particle.shape === 'dot' ? '999px' : '2px',
                  background: particle.color,
                  boxShadow: `0 0 12px ${particle.glow}`,
                  transform: particle.shape === 'diamond' ? 'translate(-50%, -50%) rotate(45deg)' : 'translate(-50%, -50%)',
                }}
              />
            ))}
          </div>
        ))}
      </AnimatePresence>

      {/* Data Stream Floating Text - Smooth Float Up */}
      <AnimatePresence>
        {clicks.map(click => (
          <motion.div
            key={click.id}
            initial={{ opacity: 1, scale: click.isCrit ? 1.3 : 1 }}
            animate={{ 
              opacity: 0, 
              y: -120,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "linear" }}
            className={`absolute pointer-events-none font-mono font-bold z-50 whitespace-nowrap ${
              click.isCrit 
                ? 'text-red-400 text-2xl drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]' 
                : 'text-yellow-300 text-lg drop-shadow-[0_0_8px_rgba(253,224,71,0.6)]'
            }`}
            style={{ 
              left: `${click.x}px`,
              top: `${click.y}px`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            +{formatNumber(click.value)}
            {click.count && click.count > 1 && (
              <span className="ml-1 text-[11px] align-middle text-white/80">x{click.count}</span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Upgrade Notifications - Adjacent to market panel on right */}
      <AnimatePresence>
        {upgrade && (
          <motion.div
            key={upgrade.id}
            initial={{ opacity: 0, scale: 0.8, x: 50 }}
            animate={{ 
              opacity: 1,
              scale: 1,
              x: 0,
            }}
            exit={{ opacity: 0, scale: 0.8, x: 50 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="fixed right-96 top-20 pointer-events-none z-[9999]"
          >
            <div className="relative px-6 py-3 bg-gradient-to-r from-violet-500/30 to-cyan-500/30 border border-violet-400/70 rounded-lg backdrop-blur-md shadow-xl shadow-violet-500/30">
              {/* Glow background */}
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-violet-500/10 to-cyan-500/10 blur-md -z-10" />
              
              <div className="text-sm font-mono font-bold uppercase tracking-wider whitespace-nowrap">
                <span className="bg-gradient-to-r from-violet-300 via-cyan-300 to-violet-300 bg-clip-text text-transparent drop-shadow-lg">
                  ✓ {upgrade.text}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Edit Mode Toggle Button */}
      {onUpdatePosition && (
        <motion.button
          className={`absolute top-4 right-4 z-30 p-3 rounded-xl border-2 transition-all ${
            editMode
              ? 'bg-purple-500/30 border-purple-400 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.4)]'
              : 'bg-slate-800/60 border-slate-600/50 text-slate-400 hover:border-purple-400/50 hover:text-purple-300'
          }`}
          onClick={() => setEditMode(!editMode)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          data-testid="toggle-edit-mode"
        >
          <div className="flex items-center gap-2">
            {editMode ? (
              <>
                <X className="w-5 h-5" />
                <span className="text-sm font-medium">{exitEditLabel}</span>
              </>
            ) : (
              <>
                <Settings2 className="w-5 h-5" />
                <span className="text-sm font-medium">{liveEditLabel}</span>
              </>
            )}
          </div>
        </motion.button>
      )}

      {/* Edit Mode Instructions */}
      <AnimatePresence>
        {editMode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-purple-900/80 border border-purple-500/50 rounded-lg px-4 py-2 backdrop-blur-sm"
          >
            <p className="text-purple-300 text-sm text-center">
              <span className="font-semibold">{l('Edit Mode:', 'Duzenleme Modu:', 'Modo de Edicao:', 'Modo de Edicion:')}</span>{' '}
              {l('Drag miners directly on the floor tiles', 'Madencileri dogrudan zemin karelerine surukle', 'Arraste os mineradores diretamente para os pisos', 'Arrastra los mineros directamente sobre las baldosas del suelo')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      {DEBUG_PANEL_ENABLED && debugOpen && (
        <div className="fixed right-4 top-4 z-[9999] w-[340px] rounded-xl border border-purple-500/40 bg-black/70 p-3 text-sm text-white shadow-xl backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-purple-200">{l('Debug Panel', 'Hata Ayiklama Paneli', 'Painel de Debug', 'Panel de Debug')}</div>
            <button
              onClick={() => setDebugOpen(false)}
              className="rounded-md px-2 py-1 text-xs text-purple-200 hover:bg-white/10"
            >
              {l('Close', 'Kapat', 'Fechar', 'Cerrar')}
            </button>
          </div>

          <div className="mt-2 space-y-1 text-white/80">
            <div><span className="text-white/60">{l('Total Data:', 'Toplam Veri:', 'Dados Totais:', 'Datos Totales:')}</span> {formatNumber(totalData)}</div>
            <div><span className="text-white/60">{nodesLabel}:</span> {formatNumber(totalCredits)}</div>
            <div><span className="text-white/60">DPS:</span> {formatNumber(dataPerSecond)}</div>
            <div><span className="text-white/60">{l('Tutorial Highlight:', 'Egitim Vurgusu:', 'Destaque do Tutorial:', 'Resaltado del Tutorial:')}</span> {tutorialHighlight || '-'}</div>
          </div>

          <div className="mt-3 space-y-2">
            <div className="text-[11px] text-emerald-200/90">{l('Floater Tests', 'Floater Testleri', 'Testes de Itens Flutuantes', 'Pruebas de Flotantes')}</div>
            <div className="grid grid-cols-5 gap-2">
              <button
                onClick={() => onSpawnDebugPickup?.('data')}
                className="rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-200 hover:bg-cyan-500/20"
              >
                {l('DATA', 'VERI', 'DADOS', 'DATOS')}
              </button>
              <button
                onClick={() => onSpawnDebugPickup?.('credits')}
                className="rounded-lg border border-yellow-400/40 bg-yellow-500/10 px-2 py-1 text-[11px] text-yellow-200 hover:bg-yellow-500/20"
              >
                {l('NODES', 'DUGUM', 'NOS', 'NODOS')}
              </button>
              <button
                onClick={() => onSpawnDebugPickup?.('crit')}
                className="rounded-lg border border-pink-400/40 bg-pink-500/10 px-2 py-1 text-[11px] text-pink-200 hover:bg-pink-500/20"
              >
                {l('CRIT', 'KRIT', 'CRIT')}
              </button>
              <button
                onClick={() => onSpawnDebugPickup?.('autoclick')}
                className="rounded-lg border border-fuchsia-400/40 bg-fuchsia-500/10 px-2 py-1 text-[11px] text-fuchsia-200 hover:bg-fuchsia-500/20"
              >
                {l('AUTO', 'OTO', 'AUTO')}
              </button>
              <button
                onClick={() => onSpawnDebugPickup?.('combo')}
                className="rounded-lg border border-violet-400/40 bg-violet-500/10 px-2 py-1 text-[11px] text-violet-200 hover:bg-violet-500/20"
              >
                {l('COMBO', 'KOMBO', 'COMBO')}
              </button>
              <button
                onClick={() => onSpawnAllDebugPickups?.()}
                className="col-span-3 rounded-lg border border-indigo-400/40 bg-indigo-500/10 px-2 py-1 text-[11px] text-indigo-200 hover:bg-indigo-500/20"
              >
                {l('ALL FLOATERS', 'TUM FLOATERLAR', 'TODOS OS ITENS', 'TODOS LOS FLOTANTES')}
              </button>
              <button
                onClick={() => onForceDebugTimeWarp?.()}
                className="col-span-2 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-200 hover:bg-emerald-500/20"
              >
                {language === 'tr' ? 'TIME WARP' : 'TIME WARP'}
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => onAddDebugData?.(100000000)}
              className="rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-200 hover:bg-cyan-500/20"
            >
              {l('+100M Data', '+100M Veri', '+100M Dados', '+100M Datos')}
            </button>
            <button
              onClick={() => onAddDebugCredits?.(100000000)}
              className="rounded-lg border border-yellow-400/40 bg-yellow-500/10 px-2 py-1 text-xs text-yellow-200 hover:bg-yellow-500/20"
            >
              {l('+100M Nodes', '+100M Dizin', '+100M Nodes', '+100M Nodos')}
            </button>
            <button
              onClick={() => onAddDebugCrypto?.(100000000)}
              className="rounded-lg border border-orange-400/40 bg-orange-500/10 px-2 py-1 text-xs text-orange-200 hover:bg-orange-500/20"
            >
              {l('+100M Crypto', '+100M Kripto', '+100M Cripto', '+100M Cripto', '+100M Крипты')}
            </button>
            <button
              onClick={() => onAddDebugPrestige?.(1000)}
              className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-200 hover:bg-amber-500/20"
            >
              {l('+1K Prestige', '+1K Prestij', '+1K Prestigio', '+1K Prestigio')}
            </button>
            <button
              onClick={() => onAddDebugAscensionCount?.(1)}
              className="rounded-lg border border-fuchsia-400/40 bg-fuchsia-500/10 px-2 py-1 text-xs text-fuchsia-200 hover:bg-fuchsia-500/20"
            >
              {l('+1 Ascension', '+1 Yükseliş', '+1 Ascensão', '+1 Prestigio')}
            </button>
          </div>

          <div className="mt-2 text-[11px] text-white/50">
            {l('Hotkey:', 'Kisayol:', 'Atalho:')} Ctrl+Shift+D
          </div>
        </div>
      )}

    </div>
  );
});
