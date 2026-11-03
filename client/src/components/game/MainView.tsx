import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, X } from 'lucide-react';
import { formatNumber } from '@/lib/useGame';
import type { ResourceType } from '@/lib/useGame';
import { CyberpunkRoom, type CharacterReaction, type ThemeColors, type SkinPalette } from './CyberpunkRoom';

interface MachinePosition {
  upgradeId: string;
  gridX: number;
  gridY: number;
}

interface MainViewProps {
  onClick: (type: ResourceType, meta?: { timestamp?: number; source?: 'manual' | 'autoclick' }) => { value: number; isCrit: boolean };
  onRightClick?: () => void;
  onAddDebugData?: (amount: number) => void;
  onAddDebugCredits?: (amount: number) => void;
  onAddDebugCrypto?: (amount: number) => void;
  onAddDebugAscensionCount?: (amount: number) => void;
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
  themeColors?: ThemeColors;
  skinPalette?: SkinPalette;
  activeAccessoryId?: string;
  activeCapeId?: string;
  activeWingId?: string;
  activeHeadStyleId?: string;
  activePetId?: string;
  activeAscensionPetId?: string;
  activeClickEffectId?: string;
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
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  value: number;
  isCrit: boolean;
  isUpgrade?: boolean;
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

export function MainView({ onClick, onRightClick, onAddDebugData, onAddDebugCredits, onAddDebugCrypto, onAddDebugAscensionCount, onTutorialCameraZoom, onTutorialCameraPan, lastUpgradeInfo, onClearUpgrade, dataPerSecond = 0, upgrades = [], totalData = 0, totalCredits = 0, onAchievementUnlocked = false, onPickupCollected = false, onClearAchievement, onClearPickup, autoClickBoostEndTime = 0, themeColors, skinPalette, activeAccessoryId = 'none', activeCapeId = 'none', activeWingId = 'none', activeHeadStyleId = 'default', activePetId = 'none', activeAscensionPetId = 'none', activeClickEffectId = 'none', activeMachineBoxSkin, ascensionLevel = 0, machinePositions = [], onUpdatePosition, tutorialHighlight, showBlackMarketShip = false, onOpenBlackMarket }: MainViewProps) {
  const [clicks, setClicks] = useState<FloatingText[]>([]);
  const [clickBursts, setClickBursts] = useState<ClickBurst[]>([]);
  const [upgrade, setUpgrade] = useState<FloatingText | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);

  useEffect(() => {
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
  const [autoClickRemainingTime, setAutoClickRemainingTime] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPosition, setLastPanPosition] = useState({ x: 0, y: 0 });
  const [editMode, setEditMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const blackMarketShipRef = useRef<HTMLButtonElement>(null);
  const autoClickRafRef = useRef<number | null>(null);
  const autoClickLastTickRef = useRef<number>(0);
  const autoClickAccumulatorRef = useRef<number>(0);

  const isPointOnBlackMarketShip = useCallback((clientX: number, clientY: number) => {
    if (!showBlackMarketShip) return false;
    const shipEl = blackMarketShipRef.current;
    if (!shipEl) return false;
    const rect = shipEl.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  }, [showBlackMarketShip]);

  const getMaxPan = useCallback((currentZoom: number) => {
    if (currentZoom <= 1) return { x: 0, y: 0 };
    const maxPanX = (currentZoom - 1) * 250;
    const maxPanY = (currentZoom - 1) * 180;
    return { x: maxPanX, y: maxPanY };
  }, []);

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
      if (isPointOnBlackMarketShip(e.clientX, e.clientY)) {
        return;
      }
      if (!editMode) {
        setIsMouseDown(true);
      }
    }
  }, [editMode, onRightClick, isPointOnBlackMarketShip]);

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
      setTimeout(() => setCharacterReaction('idle'), 1500);
    }
  }, [totalUpgrades, lastCheckpoint]);

  const triggerCritReaction = useCallback(() => {
    setCharacterReaction('crit');
    setTimeout(() => setCharacterReaction('idle'), 800);
  }, []);

  useEffect(() => {
    if (onAchievementUnlocked && characterReaction === 'idle') {
      setCharacterReaction('achievement');
      setTimeout(() => {
        setCharacterReaction('idle');
        onClearAchievement?.();
      }, 1200);
    }
  }, [onAchievementUnlocked, characterReaction, onClearAchievement]);

  useEffect(() => {
    if (onPickupCollected && characterReaction === 'idle') {
      setCharacterReaction('pickup');
      setTimeout(() => {
        setCharacterReaction('idle');
        onClearPickup?.();
      }, 800);
    }
  }, [onPickupCollected, characterReaction, onClearPickup]);

  // Auto-click boost timer countdown
  useEffect(() => {
    const updateTimer = () => {
      const remaining = Math.max(0, autoClickBoostEndTime - Date.now());
      setAutoClickRemainingTime(remaining);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 100);
    return () => clearInterval(interval);
  }, [autoClickBoostEndTime]);

  const spawnClickBurst = useCallback((x: number, y: number, isCrit: boolean) => {
    const visual = CLICK_EFFECT_VISUALS[activeClickEffectId];
    if (!visual) return;

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
    };

    setClickBursts(prev => {
      const next = [...prev, burst];
      if (next.length > 30) return next.slice(next.length - 30);
      return next;
    });

    setTimeout(() => {
      setClickBursts(prev => prev.filter(item => item.id !== burstId));
    }, 700);
  }, [activeClickEffectId]);

  // Auto-click when holding mouse during boost.
  // Uses time-based catch-up so low FPS/frame drops do not reduce effective auto-click rate.
  useEffect(() => {
    const AUTO_CLICK_INTERVAL_MS = 50; // Slightly faster auto-click target.
    const MAX_CATCH_UP_CLICKS = 6; // Better recovery during frame drops without huge bursts.
    const isBoostActive = autoClickRemainingTime > 0;
    
    if (isMouseDown && isBoostActive && containerRef.current) {
      const tick = (frameNow: number) => {
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

          for (let i = 0; i < clicksToProcess; i++) {
            const simulatedTimestamp = Date.now() - ((clicksToProcess - 1 - i) * AUTO_CLICK_INTERVAL_MS);
            const { value, isCrit } = onClick('data', { timestamp: simulatedTimestamp, source: 'autoclick' });
            if (value <= 0) continue;

            if (isCrit && characterReaction === 'idle') {
              triggerCritReaction();
            }

            const rect = containerRef.current.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const randomOffsetX = (Math.random() - 0.5) * 100;
            const randomOffsetY = (Math.random() - 0.5) * 60;

            const newClick = {
              id: Date.now() + Math.random(),
              x: centerX + randomOffsetX,
              y: centerY + randomOffsetY,
              text: `+${value.toFixed(1)} DATA${isCrit ? ' CRIT!' : ''}`,
              value: value,
              isCrit
            };
            
            setClicks(prev => {
              const next = [...prev, newClick];
              if (next.length > 20) return next.slice(next.length - 20);
              return next;
            });

            spawnClickBurst(centerX + randomOffsetX, centerY + randomOffsetY, isCrit);
            
            setTimeout(() => {
              setClicks(prev => prev.filter(c => c.id !== newClick.id));
            }, 1000);
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
  }, [isMouseDown, autoClickRemainingTime, onClick, characterReaction, triggerCritReaction, spawnClickBurst]);

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

    const newClick = { 
      id: Date.now() + Math.random(),
      x: x + 20,
      y: y - 30,
      text: `+${value.toFixed(1)} DATA${isCrit ? ' CRIT!' : ''}`,
      value: value,
      isCrit 
    };
    
    setClicks(prev => {
      const next = [...prev, newClick];
      if (next.length > 20) return next.slice(next.length - 20);
      return next;
    });

    spawnClickBurst(x, y, isCrit);

    setTimeout(() => {
      setClicks(prev => prev.filter(c => c.id !== newClick.id));
    }, 1000);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isPointOnBlackMarketShip(e.clientX, e.clientY)) {
      e.preventDefault();
      onOpenBlackMarket?.();
      return;
    }
    spawnClickAt(e.clientX, e.clientY);
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isPointOnBlackMarketShip(e.clientX, e.clientY)) {
      onOpenBlackMarket?.();
      return;
    }
    spawnClickAt(e.clientX, e.clientY);
    onRightClick?.();
  };

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
        />

        {/* Keep scanlines on room layer only (not HUD/panels) */}
        <div className="scanlines absolute inset-0 pointer-events-none" />

        {showBlackMarketShip && (
          <motion.button
            ref={blackMarketShipRef}
            type="button"
            onClick={onOpenBlackMarket}
            className="absolute left-[70%] top-[30%] z-30 bg-transparent p-0 text-left shadow-none"
            animate={{
              x: [0, 14, -8, 0],
              y: [0, -8, 6, 0],
              rotateZ: [-1.5, 1.5, -1.5],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            data-testid="black-market-spaceship"
            aria-label="Open Black Market"
          >
            <div className="relative pointer-events-none" style={{ perspective: 960 }}>
              <motion.div
                animate={{ rotateY: [-10, 10, -10] }}
                transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                <svg width="216" height="188" viewBox="0 0 216 188" style={{ filter: 'drop-shadow(0 0 20px rgba(232,121,249,0.38))' }}>
                  <defs>
                    <linearGradient id="black-market-neon-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#7cf6ff" />
                      <stop offset="100%" stopColor="#34d6f3" />
                    </linearGradient>
                    <linearGradient id="black-market-neon-magenta" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ff69ff" />
                      <stop offset="100%" stopColor="#d946ef" />
                    </linearGradient>
                  </defs>
                  <rect x="150" y="146" width="10" height="5" fill="#3df1ff" />
                  <rect x="162" y="146" width="5" height="5" fill="#3df1ff" />
                  <rect x="28" y="150" width="10" height="5" fill="#f044ff" />
                  <rect x="40" y="150" width="5" height="5" fill="#f044ff" />

                  <g transform="translate(16,22)">
                    <path
                      d="M26 128 L58 90 L112 90 L142 58 L151 63 L144 74 L166 69 L181 84 L162 92 L167 118 L142 134 L125 170 L96 140 L67 153 L57 138 L31 149 L19 136 L28 121 Z"
                      fill="rgba(8, 6, 24, 0.9)"
                      stroke="url(#black-market-neon-magenta)"
                      strokeWidth="3.4"
                      strokeLinejoin="round"
                    />
                    <path d="M40 122 L64 96 L101 96 L78 114 Z" fill="url(#black-market-neon-cyan)" opacity="0.92" />
                    <path d="M111 92 L126 77 L139 81 L122 96 Z" fill="url(#black-market-neon-cyan)" opacity="0.88" />
                    <path d="M146 84 L159 70 L169 72 L156 86 Z" fill="url(#black-market-neon-cyan)" opacity="0.86" />
                    <path d="M86 144 L105 131 L114 136 L94 149 Z" fill="url(#black-market-neon-cyan)" opacity="0.84" />
                    <path d="M136 152 L149 119 L154 119 L141 154 Z" fill="url(#black-market-neon-cyan)" opacity="0.82" />
                    <path d="M32 126 L44 138 L44 154 L27 139 Z" fill="rgba(52,214,243,0.24)" stroke="url(#black-market-neon-magenta)" strokeWidth="2.5" />
                    <path d="M64 90 L114 90 L124 99 L72 99 Z" fill="rgba(8, 6, 24, 0.95)" stroke="url(#black-market-neon-magenta)" strokeWidth="2.4" />
                    <path d="M114 90 L142 58" stroke="url(#black-market-neon-magenta)" strokeWidth="2.5" />
                    <path d="M79 114 L121 75" stroke="url(#black-market-neon-magenta)" strokeWidth="2.4" />
                    <path d="M57 136 L40 146" stroke="url(#black-market-neon-magenta)" strokeWidth="2.2" />
                    <path d="M121 96 L144 116" stroke="url(#black-market-neon-magenta)" strokeWidth="2.2" />
                    <path d="M28 121 L64 90" stroke="url(#black-market-neon-magenta)" strokeWidth="2.2" opacity="0.88" />
                    <path d="M67 153 L31 149" stroke="url(#black-market-neon-magenta)" strokeWidth="2.1" opacity="0.82" />
                    <path d="M125 170 L142 134" stroke="url(#black-market-neon-magenta)" strokeWidth="2.1" opacity="0.82" />
                  </g>
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
                  BLACK MARKET
                </div>
              </motion.div>
            </div>
          </motion.button>
        )}
      </div>

      {/* Tutorial Core Highlight - Center pulse ring */}
      {(tutorialHighlight === 'core' || tutorialHighlight === 'core_right' || tutorialHighlight === 'camera_zoom' || tutorialHighlight === 'camera_pan') && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
          <div className="w-48 h-48 rounded-full border-4 border-cyan-400/50 tutorial-highlight" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-400 text-xs font-mono uppercase tracking-wider animate-pulse">
            {tutorialHighlight === 'core_right'
              ? 'Right-click here!'
              : tutorialHighlight === 'camera_zoom'
                ? 'Use mouse wheel to zoom'
                : tutorialHighlight === 'camera_pan'
                  ? 'Hold middle mouse and drag'
                  : 'Click here!'}
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
            Total Data
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
            Nodes
          </div>
        </div>
      </div>

      {/* Auto-Click Boost Timer */}
      <AnimatePresence>
        {autoClickRemainingTime > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            className="absolute top-28 left-1/2 transform -translate-x-1/2 z-20"
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
                  <div className="text-fuchsia-300 text-xs uppercase tracking-wider">Auto-Click Active</div>
                  <div className="text-fuchsia-400 font-mono font-bold text-xl">
                    {(autoClickRemainingTime / 1000).toFixed(1)}s
                  </div>
                </div>
                <div className="text-fuchsia-300 text-xs">Hold to click!</div>
              </div>
            </div>
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
          Click Power
        </div>
      </div>

      {/* Production Rate - Bottom Right */}
      <div className="absolute bottom-12 right-12 z-20 text-center">
        <div className="text-sm font-mono text-cyan-400/80 uppercase tracking-widest mb-1">
          Production Rate
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
                <span className="text-sm font-medium">Exit Edit</span>
              </>
            ) : (
              <>
                <Settings2 className="w-5 h-5" />
                <span className="text-sm font-medium">Arrange Room</span>
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
              <span className="font-semibold">Edit Mode:</span> Drag miners directly on the floor tiles
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      {debugOpen && (
        <div className="fixed left-4 top-4 z-[9999] w-[320px] rounded-xl border border-purple-500/40 bg-black/70 p-3 text-sm text-white shadow-xl backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-purple-200">Debug Panel</div>
            <button
              onClick={() => setDebugOpen(false)}
              className="rounded-md px-2 py-1 text-xs text-purple-200 hover:bg-white/10"
            >
              Close
            </button>
          </div>

          <div className="mt-2 space-y-1 text-white/80">
            <div><span className="text-white/60">Total Data:</span> {formatNumber(totalData)}</div>
            <div><span className="text-white/60">Nodes:</span> {formatNumber(totalCredits)}</div>
            <div><span className="text-white/60">DPS:</span> {formatNumber(dataPerSecond)}</div>
            <div><span className="text-white/60">Tutorial Highlight:</span> {tutorialHighlight || '-'}</div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => onAddDebugData?.(100000000)}
              className="rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-200 hover:bg-cyan-500/20"
            >
              +100M Data
            </button>
            <button
              onClick={() => onAddDebugCredits?.(100000000)}
              className="rounded-lg border border-yellow-400/40 bg-yellow-500/10 px-2 py-1 text-xs text-yellow-200 hover:bg-yellow-500/20"
            >
              +100M Nodes
            </button>
            <button
              onClick={() => onAddDebugCrypto?.(100000000)}
              className="rounded-lg border border-orange-400/40 bg-orange-500/10 px-2 py-1 text-xs text-orange-200 hover:bg-orange-500/20"
            >
              +100M Crypto
            </button>
            <button
              onClick={() => onAddDebugAscensionCount?.(1)}
              className="rounded-lg border border-fuchsia-400/40 bg-fuchsia-500/10 px-2 py-1 text-xs text-fuchsia-200 hover:bg-fuchsia-500/20"
            >
              +1 Ascension
            </button>
          </div>

          <div className="mt-2 text-[11px] text-white/50">
            Hotkey: Ctrl+Shift+D
          </div>
        </div>
      )}

    </div>
  );
}
