import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Shield, Zap, Skull, Trophy, AlertTriangle, Target, Keyboard } from "lucide-react";
import { localizeInlineText, localizeText, useI18n, type LocalizedText } from "@/lib/i18n";
import { BOSS_MODIFIERS, pick6, type BossVariant, type BossModifierId, BOSS_DEFEAT_PRESTIGE_SHARE, BOSS_RETRIES_PER_FIGHT, BOSS_ASSIST_TIME_MULTIPLIER, BOSS_ASSIST_HP_MULTIPLIER, readBossAssist, writeBossAssist, getBossPowerMultiplier } from "@/lib/bossVariants";

interface BossEncounterProps {
  isOpen: boolean;
  onClose: () => void;
  onVictory: () => void;
  onDefeat: () => void;
  prestigeGain: number;
  ascensionLevel: number;
  dataPerClick: number;
  isMainScreen?: boolean;
  // Finale (ascension 50): the one-time "Breach the Core" boss.
  isFinale?: boolean;
  // Player crit chance (0..1); crits matter in the finale.
  critChance?: number;
  // Pity: each failed finale attempt weakens the Core (0..0.5 = HP reduction).
  finaleWeaken?: number;
  // v1.03: modifiers / Core Signal (asc 45) / Core Echo (Endless, every 10 depths).
  variant?: BossVariant;
  // v1.04: permanent click power in % (prestige Eternal Strike + Paragon click modules); part of it becomes boss damage.
  permanentClickPercent?: number;
  // v1.04 endgame: extra damage and timer seconds from Paragon III (and Abyss Boons), for every boss kind.
  bossDamageMultiplier?: number;
  bonusTimeSeconds?: number;
  playSound?: (type: 'click' | 'buy_fab' | 'buy_black' | 'sell' | 'crit' | 'checkpoint' | 'achievement' | 'pickup' | 'boss_hit' | 'weakspot_hit') => void;
}

const FINAL_BOSS = { name: { en: "THE CORE", tr: "ÇEKİRDEK", "pt-BR": "O NÚCLEO", es: "EL NÚCLEO", ru: "ЯДРО", "zh-CN": "核心" }, baseClicks: 55, bossMultiplier: 1.5, timeLimit: 50, color: "#f97316" };
const SIGNAL_BOSS = { name: { en: "CORE SIGNAL", tr: "ÇEKİRDEK SİNYALİ", "pt-BR": "SINAL DO NÚCLEO", es: "SEÑAL DEL NÚCLEO", ru: "СИГНАЛ ЯДРА", "zh-CN": "核心信号" }, baseClicks: 42, bossMultiplier: 1.0, timeLimit: 35, color: "#22d3ee" };
const ECHO_BOSS = { name: { en: "CORE ECHO", tr: "ÇEKİRDEK YANKISI", "pt-BR": "ECO DO NÚCLEO", es: "ECO DEL NÚCLEO", ru: "ЭХО ЯДРА", "zh-CN": "核心回响" }, baseClicks: 55, bossMultiplier: 1.5, timeLimit: 50, color: "#a855f7" };
const SIGNAL_PHASE_SHIELDS = [0, 0.2, 0.35] as const;
const ARMORED_SHIELD = 0.3;
const EVASIVE_WEAK_SPOT_LIFETIME_MS = 1800;
const REGEN_PER_SECOND = 0.015;
// Finale: three phases by remaining HP. Shields cut normal hits; weak spots and crits pierce them.
const FINALE_PHASE_SHIELDS = [0, 0.3, 0.5] as const;
const FINALE_CRIT_MULTIPLIER = 2.5;
// Finale weak spots are rarer but hit harder (fewer all-or-nothing outcomes).
const FINALE_WEAK_SPOT_MULTIPLIER = 5;
const FINALE_WEAK_SPOT_INTERVAL_MS = 3500;
const getFinalePhaseIndex = (health: number, max: number): number => {
  const fraction = max > 0 ? health / max : 1;
  return fraction > 2 / 3 ? 0 : fraction > 1 / 3 ? 1 : 2;
};

// Easier boss levels - more time, lower multipliers
const BOSS_LEVELS = [
  { name: { en: "Firewall v1.0", tr: "Güvenlik Duvarı v1.0", "pt-BR": "Firewall v1.0", es: "Firewall v1.0", ru: "Файрвол v1.0", "zh-CN": "防火墙 v1.0" }, baseClicks: 15, bossMultiplier: 1.0, timeLimit: 20, color: "#3b82f6" },
  { name: { en: "Firewall v2.0", tr: "Güvenlik Duvarı v2.0", "pt-BR": "Firewall v2.0", es: "Firewall v2.0", ru: "Файрвол v2.0", "zh-CN": "防火墙 v2.0" }, baseClicks: 18, bossMultiplier: 1.0, timeLimit: 20, color: "#8b5cf6" },
  { name: { en: "Firewall v3.0", tr: "Güvenlik Duvarı v3.0", "pt-BR": "Firewall v3.0", es: "Firewall v3.0", ru: "Файрвол v3.0", "zh-CN": "防火墙 v3.0" }, baseClicks: 20, bossMultiplier: 1.0, timeLimit: 18, color: "#a855f7" },
  { name: { en: "Quantum Barrier", tr: "Kuantum Bariyeri", "pt-BR": "Barreira Quântica", es: "Barrera Cuántica", ru: "Квантовый барьер", "zh-CN": "量子屏障" }, baseClicks: 22, bossMultiplier: 1.0, timeLimit: 18, color: "#d946ef" },
  { name: { en: "Neural Firewall", tr: "Nor Güvenlik Duvarı", "pt-BR": "Firewall Neural", es: "Firewall Neural", ru: "Нейро-файрвол", "zh-CN": "神经防火墙" }, baseClicks: 25, bossMultiplier: 1.0, timeLimit: 16, color: "#ec4899" },
  { name: { en: "AI Guardian", tr: "YZ Muhafızı", "pt-BR": "Guardiao IA", es: "Guardian IA", ru: "Страж ИИ", "zh-CN": "AI 守卫者" }, baseClicks: 28, bossMultiplier: 1.0, timeLimit: 16, color: "#f43f5e" },
  { name: { en: "Omega Protocol", tr: "Omega Protokolü", "pt-BR": "Protocolo Omega", es: "Protocolo Omega", ru: "Протокол Омега", "zh-CN": "欧米伽协议" }, baseClicks: 30, bossMultiplier: 1.0, timeLimit: 15, color: "#ef4444" },
  { name: { en: "Core Sentinel", tr: "Çekirdek Nöbetçisi", "pt-BR": "Sentinela do Núcleo", es: "Centinela del Núcleo", ru: "Страж ядра", "zh-CN": "核心哨兵" }, baseClicks: 32, bossMultiplier: 1.0, timeLimit: 15, color: "#dc2626" },
  { name: { en: "System Overlord", tr: "Sistem Hükümdarı", "pt-BR": "Soberano do Sistema", es: "Soberano del Sistema", ru: "Повелитель системы", "zh-CN": "系统霸主" }, baseClicks: 35, bossMultiplier: 1.0, timeLimit: 14, color: "#b91c1c" },
  { name: { en: "The Architect", tr: "Mimar", "pt-BR": "O Arquiteto", es: "El Arquitecto", ru: "Архитектор", "zh-CN": "造物主" }, baseClicks: 38, bossMultiplier: 1.0, timeLimit: 14, color: "#991b1b" },
];
// v1.04: from ascension 11 on, the boss rotates through six designs instead of "The Architect" every time
// (asc 10 to 49). Same difficulty for all six; modifiers still add the twist. One extra second vs the Architect.
type BossShape = "hexagon" | "diamond" | "octagon" | "triangle" | "star" | "square";
const BOSS_SHAPES: Record<BossShape, string> = {
  hexagon: "50,15 85,32.5 85,67.5 50,85 15,67.5 15,32.5",
  diamond: "50,8 92,50 50,92 8,50",
  octagon: "35,12 65,12 88,35 88,65 65,88 35,88 12,65 12,35",
  triangle: "50,6 94,88 6,88",
  star: "50,6 62,36 94,38 69,58 78,90 50,72 22,90 31,58 6,38 38,36",
  square: "16,16 84,16 84,84 16,84",
};
const LATE_BOSS_FIRST_INDEX = 10;
const LATE_BOSSES: Array<{ name: LocalizedText; baseClicks: number; bossMultiplier: number; timeLimit: number; color: string; shape: BossShape }> = [
  { name: { en: "Black ICE", tr: "Kara ICE", "pt-BR": "ICE Negro", es: "ICE Negro", ru: "Чёрный ЛЁД", "zh-CN": "黑冰" }, baseClicks: 38, bossMultiplier: 1.0, timeLimit: 15, color: "#38bdf8", shape: "diamond" },
  { name: { en: "Null Warden", tr: "Boşluk Gardiyanı", "pt-BR": "Guardião Nulo", es: "Guardián Nulo", ru: "Нулевой страж", "zh-CN": "虚空典狱长" }, baseClicks: 38, bossMultiplier: 1.0, timeLimit: 15, color: "#a3e635", shape: "octagon" },
  { name: { en: "Hydra Daemon", tr: "Hidra Daemonu", "pt-BR": "Daemon Hidra", es: "Daemon Hidra", ru: "Демон-Гидра", "zh-CN": "九头蛇守护进程" }, baseClicks: 38, bossMultiplier: 1.0, timeLimit: 15, color: "#10b981", shape: "triangle" },
  { name: { en: "Zero-Day Leviathan", tr: "Sıfırıncı Gün Leviatanı", "pt-BR": "Leviatã Dia Zero", es: "Leviatán de Día Cero", ru: "Левиафан нулевого дня", "zh-CN": "零日利维坦" }, baseClicks: 38, bossMultiplier: 1.0, timeLimit: 15, color: "#6366f1", shape: "star" },
  { name: { en: "Kernel Phantom", tr: "Kernel Hayaleti", "pt-BR": "Fantasma do Kernel", es: "Fantasma del Kernel", ru: "Призрак ядра ОС", "zh-CN": "内核幽灵" }, baseClicks: 38, bossMultiplier: 1.0, timeLimit: 15, color: "#e879f9", shape: "square" },
  { name: { en: "The Architect", tr: "Mimar", "pt-BR": "O Arquiteto", es: "El Arquitecto", ru: "Архитектор", "zh-CN": "造物主" }, baseClicks: 38, bossMultiplier: 1.0, timeLimit: 15, color: "#991b1b", shape: "hexagon" },
];
const getRegularBoss = (ascensionLevel: number) =>
  ascensionLevel >= LATE_BOSS_FIRST_INDEX
    ? LATE_BOSSES[(ascensionLevel - LATE_BOSS_FIRST_INDEX) % LATE_BOSSES.length]
    : BOSS_LEVELS[Math.min(Math.max(0, ascensionLevel), BOSS_LEVELS.length - 1)];
const WEAK_SPOT_MULTIPLIER = 10 / 3; // One-third of previous 10x weak-spot bonus
const WEAK_SPOT_LIFETIME_MS = 3000;
const OVERCLOCK_MULTIPLIER = 1.35;
const BREACH_KEYS = ['A', 'S', 'D', 'F'] as const;
const BREACH_FEEDBACK_DURATION_MS = 900;
const OVERCLOCK_DURATION_MS = 6000;
const TIME_BONUS_ON_BREACH = 2;
const WEAK_SPOT_BONUS_ON_BREACH = 2;
const MAX_BATTLE_TIME_BUFFER = 8;

interface WeakSpot {
  id: number;
  xPercent: number; // Position as percentage (0-100)
  yPercent: number;
  size: number;
  createdAt: number; // Timestamp for expiration
}

interface BreachSequence {
  id: number;
  sequence: ReadonlyArray<(typeof BREACH_KEYS)[number]>;
  progress: number;
}

export function BossEncounter({ isOpen, onClose, onVictory, onDefeat, prestigeGain, ascensionLevel, dataPerClick, isMainScreen = false, playSound, isFinale = false, critChance = 0.05, finaleWeaken = 0, variant, permanentClickPercent = 0, bossDamageMultiplier = 1, bonusTimeSeconds = 0 }: BossEncounterProps) {
  const kind = isFinale ? "finale" : variant?.kind ?? "normal";
  const modList: BossModifierId[] = isFinale ? [] : variant?.modifiers ?? [];
  const mods = new Set<BossModifierId>(modList);
  const phaseShields: readonly number[] | null = kind === "finale" || kind === "echo" ? FINALE_PHASE_SHIELDS : kind === "signal" ? SIGNAL_PHASE_SHIELDS : null;
  const flatShield = mods.has("armored") ? ARMORED_SHIELD : 0;
  const usesShields = !!phaseShields || flatShield > 0;
  const weakSpotLifetimeMs = mods.has("evasive") ? EVASIVE_WEAK_SPOT_LIFETIME_MS : WEAK_SPOT_LIFETIME_MS;
  const weakSpotMultiplier = kind === "finale" || kind === "echo" ? FINALE_WEAK_SPOT_MULTIPLIER : WEAK_SPOT_MULTIPLIER;
  const { language } = useI18n();
  const l = (en: string, tr: string, pt: string, es?: string, ru?: string) => localizeInlineText(language, en, tr, pt, es, ru);
  const [phase, setPhase] = useState<'intro' | 'battle' | 'victory' | 'defeat'>('intro');
  const [bossHealth, setBossHealth] = useState(100);
  const [maxHealth, setMaxHealth] = useState(100);
  const [timeLeft, setTimeLeft] = useState(20);
  const [clicks, setClicks] = useState(0);
  const [damageFlash, setDamageFlash] = useState(false);
  const [hitEffects, setHitEffects] = useState<{ id: number; x: number; y: number; isWeakSpot: boolean; isOverclocked: boolean }[]>([]);
  const [damagePerClick, setDamagePerClick] = useState(1);
  const [weakSpots, setWeakSpots] = useState<WeakSpot[]>([]);
  const [battleNow, setBattleNow] = useState(Date.now());
  const [breachSequence, setBreachSequence] = useState<BreachSequence | null>(null);
  const [breachFeedback, setBreachFeedback] = useState<'success' | 'fail' | null>(null);
  const [overclockUntil, setOverclockUntil] = useState(0);
  const hitIdRef = useRef(0);
  const weakSpotIdRef = useRef(0);
  const breachSequenceIdRef = useRef(0);
  const battleAreaRef = useRef<HTMLDivElement>(null);
  const weakSpotsRef = useRef<WeakSpot[]>([]);
  const breachFeedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const damageFlashTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queuedWeakSpotTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  
  const currentBoss = kind === "finale" ? FINAL_BOSS : kind === "signal" ? SIGNAL_BOSS : kind === "echo" ? ECHO_BOSS : getRegularBoss(ascensionLevel);
  const bossShape = BOSS_SHAPES[("shape" in currentBoss ? currentBoss.shape : "hexagon") as BossShape];
  // v1.04 fairness: Assist mode and the permanent-power damage share apply to regular bosses (and power also to the
  // asc-45 Signal). The finale keeps its own pity system and Endless echoes stay as they are.
  const assistAllowed = kind === "normal";
  const [assistOn, setAssistOn] = useState<boolean>(() => readBossAssist());
  const assistActive = assistAllowed && assistOn;
  const powerMultiplier = (kind === "normal" || kind === "signal" ? getBossPowerMultiplier(permanentClickPercent) : 1) * Math.max(1, bossDamageMultiplier);
  const [retriesLeft, setRetriesLeft] = useState(BOSS_RETRIES_PER_FIGHT);
  const toggleAssist = () => setAssistOn(prev => { writeBossAssist(!prev); return !prev; });
  const timeLimit = Math.round(currentBoss.timeLimit * (mods.has("swift") ? 0.8 : 1) * (assistActive ? BOSS_ASSIST_TIME_MULTIPLIER : 1)) + Math.max(0, Math.floor(bonusTimeSeconds));
  const echoTier = kind === "echo" ? Math.max(1, Math.floor((variant?.depth ?? 10) / 10)) : 0;
  const currentBossName = localizeText(currentBoss.name, language);
  
  // Balanced difficulty scaling:
  // - logarithmic growth keeps late-game from exploding
  // - small linear term ensures every ascension still feels harder
  // - hard cap prevents impossible HP walls
  const calculateBossHealth = useCallback(() => {
    // Formula: min(4.0, 1 + 0.25*log2(asc+1) + 0.015*asc)
    // Samples: L0=1.00x, L5~1.72x, L10~2.02x, L25~2.54x, L50~3.16x
    const ascensionFactor = Math.min(
      4.0,
      1 + 0.25 * Math.log2(ascensionLevel + 1) + 0.015 * ascensionLevel
    );
    const calculatedHealth = Math.max(
      75, // Prevent trivial early HP
      Math.round(dataPerClick * currentBoss.baseClicks * currentBoss.bossMultiplier * ascensionFactor * (isFinale ? 1 - Math.min(0.5, Math.max(0, finaleWeaken)) : 1) * (mods.has("bulky") ? 1.25 : 1) * (kind === "echo" ? 1 + 0.15 * (echoTier - 1) : 1))
    );
    return calculatedHealth;
  }, [dataPerClick, currentBoss, ascensionLevel, isFinale, finaleWeaken, variant]);
  const getBattleHealth = useCallback(
    () => Math.max(75, Math.round(calculateBossHealth() * (assistActive ? BOSS_ASSIST_HP_MULTIPLIER : 1))),
    [calculateBossHealth, assistActive],
  );

  const showBreachFeedback = useCallback((result: 'success' | 'fail') => {
    if (breachFeedbackTimeoutRef.current) {
      clearTimeout(breachFeedbackTimeoutRef.current);
    }
    setBreachFeedback(result);
    breachFeedbackTimeoutRef.current = setTimeout(() => {
      setBreachFeedback(null);
      breachFeedbackTimeoutRef.current = null;
    }, BREACH_FEEDBACK_DURATION_MS);
  }, []);

  const clearQueuedWeakSpotTimeouts = useCallback(() => {
    if (queuedWeakSpotTimeoutsRef.current.length === 0) return;
    queuedWeakSpotTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    queuedWeakSpotTimeoutsRef.current = [];
  }, []);

  const createBreachSequence = useCallback((): BreachSequence => {
    breachSequenceIdRef.current += 1;
    const length = ascensionLevel >= 12 ? 4 : 3;
    const sequence = Array.from({ length }, () => BREACH_KEYS[Math.floor(Math.random() * BREACH_KEYS.length)]);
    return {
      id: breachSequenceIdRef.current,
      sequence,
      progress: 0,
    };
  }, [ascensionLevel]);

  // Generate weak spots using percentage positions
  const generateWeakSpot = useCallback(() => {
    weakSpotIdRef.current += 1;
    
    const newSpot: WeakSpot = {
      id: weakSpotIdRef.current,
      xPercent: 15 + Math.random() * 70, // 15% to 85% of container
      yPercent: 15 + Math.random() * 70,
      size: 94,
      createdAt: Date.now(),
    };
    
    setWeakSpots(prev => [...prev.slice(-2), newSpot]); // Keep max 3 weak spots
  }, []);

  // Spawn weak spots periodically and clean up expired ones
  useEffect(() => {
    if (phase !== 'battle') return;
    
    // Spawn first weak spot immediately
    generateWeakSpot();
    
    // Single interval handles both spawning and cleanup
    const interval = setInterval(() => {
      const now = Date.now();
      // Remove expired weak spots (older than 3 seconds) - ensure filter works properly
      setWeakSpots(prev => {
        const filtered = prev.filter(spot => now - spot.createdAt < weakSpotLifetimeMs);
        return filtered;
      });
      // Spawn new weak spot
      generateWeakSpot();
    }, isFinale ? FINALE_WEAK_SPOT_INTERVAL_MS : 2500);
    
    return () => clearInterval(interval);
  }, [phase, generateWeakSpot, isFinale, weakSpotLifetimeMs]);

  // Regenerating modifier: heals a share of max HP every second.
  useEffect(() => {
    if (phase !== 'battle' || !mods.has("regen")) return;
    const interval = setInterval(() => setBossHealth(h => (h <= 0 ? h : Math.min(maxHealth, h + maxHealth * REGEN_PER_SECOND))), 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, maxHealth, variant]);
  
  // Reset the encounter only when it opens (or another boss is shown). Upgrades bought while the
  // boss screen is open (manual buys, auto-buy) used to re-run this mid-fight: full HP again, back to
  // the intro and a refilled free retry. Damage and HP are taken fresh when a fight starts instead.
  const openedForRef = useRef<unknown>(null);
  useEffect(() => {
    if (!isOpen) {
      openedForRef.current = null;
      return;
    }
    if (openedForRef.current === currentBoss) return;
    openedForRef.current = currentBoss;
    {
      setPhase('intro');
      const health = calculateBossHealth();
      setBossHealth(health);
      setMaxHealth(health);
      setTimeLeft(timeLimit);
      setClicks(0);
      setHitEffects([]);
      setWeakSpots([]);
      setBreachSequence(null);
      setBreachFeedback(null);
      setOverclockUntil(0);
      setBattleNow(Date.now());
      setDamagePerClick(dataPerClick * powerMultiplier);
      setRetriesLeft(BOSS_RETRIES_PER_FIGHT);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentBoss]);
  // On the intro screen, keep the shown numbers in step with upgrades bought before the fight starts.
  useEffect(() => {
    if (!isOpen || phase !== 'intro') return;
    const health = calculateBossHealth();
    setBossHealth(health);
    setMaxHealth(health);
    setDamagePerClick(dataPerClick * powerMultiplier);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, phase, calculateBossHealth, dataPerClick, powerMultiplier]);
  
  useEffect(() => {
    if (phase !== 'battle') return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setPhase('defeat');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'battle') return;
    const interval = setInterval(() => setBattleNow(Date.now()), 60);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    return () => {
      if (breachFeedbackTimeoutRef.current) {
        clearTimeout(breachFeedbackTimeoutRef.current);
      }
      if (damageFlashTimeoutRef.current) {
        clearTimeout(damageFlashTimeoutRef.current);
      }
      clearQueuedWeakSpotTimeouts();
    };
  }, [clearQueuedWeakSpotTimeouts]);

  useEffect(() => {
    if (phase !== 'battle' || mods.has("jammed")) {
      setBreachSequence(null);
      return;
    }

    let timeout: NodeJS.Timeout | null = null;
    const scheduleNext = () => {
      const delay = 7000 + Math.random() * 5000;
      timeout = setTimeout(() => {
        setBreachSequence(prev => prev ?? createBreachSequence());
        scheduleNext();
      }, delay);
    };

    scheduleNext();
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [phase, createBreachSequence]);

  useEffect(() => {
    if (phase !== 'battle' || !breachSequence) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const pressed = event.key.toUpperCase() as (typeof BREACH_KEYS)[number];
      if (!BREACH_KEYS.includes(pressed)) return;
      event.preventDefault();

      setBreachSequence(prev => {
        if (!prev) return prev;
        const expected = prev.sequence[prev.progress];

        if (pressed === expected) {
          const nextProgress = prev.progress + 1;
          if (nextProgress >= prev.sequence.length) {
            setOverclockUntil(Date.now() + OVERCLOCK_DURATION_MS);
            setTimeLeft(current => Math.min(timeLimit + MAX_BATTLE_TIME_BUFFER, current + TIME_BONUS_ON_BREACH));
            clearQueuedWeakSpotTimeouts();
            for (let i = 0; i < WEAK_SPOT_BONUS_ON_BREACH; i++) {
              const timeout = setTimeout(() => {
                generateWeakSpot();
                queuedWeakSpotTimeoutsRef.current = queuedWeakSpotTimeoutsRef.current.filter(item => item !== timeout);
              }, i * 180);
              queuedWeakSpotTimeoutsRef.current.push(timeout);
            }
            showBreachFeedback('success');
            playSound?.('weakspot_hit');
            return null;
          }
          return { ...prev, progress: nextProgress };
        }

        showBreachFeedback('fail');
        return null;
      });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, breachSequence, timeLimit, generateWeakSpot, playSound, showBreachFeedback, clearQueuedWeakSpotTimeouts]);

  // Keep ref in sync with state for click detection (avoids stale closure)
  useEffect(() => {
    weakSpotsRef.current = weakSpots;
  }, [weakSpots]);

  // Check if click hit a weak spot - uses ref for latest data
  const checkWeakSpotHit = useCallback((clickX: number, clickY: number, containerWidth: number, containerHeight: number): WeakSpot | null => {
    const currentSpots = weakSpotsRef.current;
    let nearest: { spot: WeakSpot; distance: number } | null = null;

    for (const spot of currentSpots) {
      // Convert weak spot percentage position to pixels
      const spotX = (spot.xPercent / 100) * containerWidth;
      const spotY = (spot.yPercent / 100) * containerHeight;
      
      // Calculate distance from click to spot center
      const dx = clickX - spotX;
      const dy = clickY - spotY;
      const distance = Math.hypot(dx, dy);
      
      // Larger effective radius greatly reduces "I clicked it but it missed" cases.
      const hitRadius = Math.max((spot.size / 2) * 1.75, 74);
      if (distance <= hitRadius) {
        if (!nearest || distance < nearest.distance) {
          nearest = { spot, distance };
        }
      }
    }

    return nearest?.spot ?? null;
  }, []);

  const applyAttackAt = useCallback((x: number, y: number, forcedWeakSpot: WeakSpot | null = null) => {
    if (phase !== 'battle') return;

    const rect = battleAreaRef.current?.getBoundingClientRect();
    if (!rect) return;

    const hitWeakSpot = forcedWeakSpot ?? checkWeakSpotHit(x, y, rect.width, rect.height);
    const overclockActive = overclockUntil > Date.now();
    const damageMultiplier =
      (hitWeakSpot ? weakSpotMultiplier : 1) *
      (overclockActive ? OVERCLOCK_MULTIPLIER : 1);

    // Remove the weak spot if hit - update both ref and state
    if (hitWeakSpot) {
      weakSpotsRef.current = weakSpotsRef.current.filter(s => s.id !== hitWeakSpot.id);
      setWeakSpots(prev => prev.filter(s => s.id !== hitWeakSpot.id));
    }

    // Play appropriate sound
    if (playSound) {
      if (hitWeakSpot) {
        playSound('weakspot_hit');
      } else {
        playSound('boss_hit');
      }
    }

    hitIdRef.current += 1;
    setHitEffects((prev) => [
      ...prev.slice(-10),
      { id: hitIdRef.current, x, y, isWeakSpot: !!hitWeakSpot, isOverclocked: overclockActive }
    ]);

    // Damage with small variance
    const variance = damagePerClick * 0.1;
    const baseDamage = damagePerClick + (Math.random() * variance * 2 - variance);
    const isFinaleCrit = usesShields && Math.random() < Math.min(1, Math.max(0, critChance));

    setClicks((prev) => prev + 1);
    setBossHealth((prev) => {
      let damage = baseDamage * damageMultiplier;
      if (usesShields) {
        const shield = Math.max(flatShield, phaseShields ? phaseShields[getFinalePhaseIndex(prev, maxHealth)] : 0);
        const pierces = !!hitWeakSpot || isFinaleCrit;
        damage *= (isFinaleCrit ? FINALE_CRIT_MULTIPLIER : 1) * (pierces ? 1 : 1 - shield);
      }
      const newHealth = prev - damage;
      if (newHealth <= 0) {
        setPhase('victory');
        return 0;
      }
      return newHealth;
    });

    setDamageFlash(true);
    if (damageFlashTimeoutRef.current) {
      clearTimeout(damageFlashTimeoutRef.current);
    }
    damageFlashTimeoutRef.current = setTimeout(() => {
      damageFlashTimeoutRef.current = null;
      setDamageFlash(false);
    }, 50);
  }, [phase, damagePerClick, checkWeakSpotHit, overclockUntil, playSound, usesShields, flatShield, phaseShields, critChance, maxHealth]);

  const handleBattlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== 'battle') return;
    const rect = battleAreaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    applyAttackAt(x, y);
  }, [phase, applyAttackAt]);

  const handleWeakSpotPointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>, spot: WeakSpot) => {
    event.preventDefault();
    event.stopPropagation();
    if (phase !== 'battle') return;
    const rect = battleAreaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    applyAttackAt(x, y, spot);
  }, [phase, applyAttackAt]);
  
  // Every fight (first try or retry) starts from full HP with the current Assist choice.
  const startBattle = () => {
    const health = getBattleHealth();
    setDamagePerClick(dataPerClick * powerMultiplier);
    setBossHealth(health);
    setMaxHealth(health);
    setTimeLeft(timeLimit);
    setClicks(0);
    setHitEffects([]);
    setWeakSpots([]);
    weakSpotsRef.current = [];
    clearQueuedWeakSpotTimeouts();
    setBreachSequence(null);
    setBreachFeedback(null);
    setOverclockUntil(0);
    setBattleNow(Date.now());
    setPhase('battle');
  };

  const handleRetry = () => {
    if (retriesLeft <= 0) return;
    setRetriesLeft(r => r - 1);
    startBattle();
  };
  
  const handleVictory = () => {
    onVictory();
    onClose();
  };
  
  const handleDefeat = () => {
    onDefeat();
    onClose();
  };
  
  const healthPercent = (bossHealth / maxHealth) * 100;
  const timePercent = Math.max(0, (timeLeft / timeLimit) * 100);
  const overclockRemaining = Math.max(0, overclockUntil - battleNow);
  const overclockActive = overclockRemaining > 0;
  const lowHealthDanger = healthPercent <= 30;
  const penaltyPrestige = Math.floor(prestigeGain * BOSS_DEFEAT_PRESTIGE_SHARE);
  const keptPercent = Math.round(BOSS_DEFEAT_PRESTIGE_SHARE * 100);
  const assistToggle = assistAllowed ? (
    <button
      type="button"
      onClick={toggleAssist}
      aria-pressed={assistOn}
      data-testid="boss-assist-toggle"
      className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition-colors ${assistOn ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200' : 'border-slate-600 bg-slate-900/50 text-slate-300 hover:border-slate-400'}`}
    >
      <span className="font-bold">{pick6(language, ['Assist mode', 'Yardım modu', 'Modo assistido', 'Modo asistido', 'Режим помощи', '辅助模式'])}: {assistOn ? pick6(language, ['ON', 'AÇIK', 'LIGADO', 'ACTIVADO', 'ВКЛ', '开']) : pick6(language, ['OFF', 'KAPALI', 'DESLIGADO', 'DESACTIVADO', 'ВЫКЛ', '关'])}</span>
      <span className="ml-2 opacity-80">{pick6(language, [
        `+${Math.round((BOSS_ASSIST_TIME_MULTIPLIER - 1) * 100)}% time, -${Math.round((1 - BOSS_ASSIST_HP_MULTIPLIER) * 100)}% boss HP. Same rewards.`,
        `+%${Math.round((BOSS_ASSIST_TIME_MULTIPLIER - 1) * 100)} süre, boss canı -%${Math.round((1 - BOSS_ASSIST_HP_MULTIPLIER) * 100)}. Ödüller aynı.`,
        `+${Math.round((BOSS_ASSIST_TIME_MULTIPLIER - 1) * 100)}% de tempo, -${Math.round((1 - BOSS_ASSIST_HP_MULTIPLIER) * 100)}% de vida do chefe. Mesmas recompensas.`,
        `+${Math.round((BOSS_ASSIST_TIME_MULTIPLIER - 1) * 100)}% de tiempo, -${Math.round((1 - BOSS_ASSIST_HP_MULTIPLIER) * 100)}% de vida del jefe. Mismas recompensas.`,
        `+${Math.round((BOSS_ASSIST_TIME_MULTIPLIER - 1) * 100)}% времени, -${Math.round((1 - BOSS_ASSIST_HP_MULTIPLIER) * 100)}% HP босса. Награды те же.`,
        `时间 +${Math.round((BOSS_ASSIST_TIME_MULTIPLIER - 1) * 100)}%，Boss 生命 -${Math.round((1 - BOSS_ASSIST_HP_MULTIPLIER) * 100)}%。奖励不变。`,
      ])}</span>
    </button>
  ) : null;
  
  if (!isOpen) return null;
  
  const containerClass = isMainScreen 
    ? "absolute inset-0 flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950"
    : "fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md";
  
  const contentClass = isMainScreen
    ? "relative w-full max-w-3xl mx-4 bg-slate-950/80 border-2 rounded-xl overflow-hidden backdrop-blur-sm"
    : "relative w-full max-w-2xl mx-4 bg-slate-950 border-2 rounded-xl overflow-hidden";
  
  return (
    <AnimatePresence>
      <motion.div
        className={containerClass}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {isMainScreen && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-cyan-500/30 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  opacity: [0.2, 0.8, 0.2],
                  scale: [1, 1.5, 1],
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
            <div 
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle at 50% 50%, ${currentBoss.color}15 0%, transparent 50%)`,
              }}
            />
          </div>
        )}
        
        <motion.div
          className={contentClass}
          style={{ borderColor: currentBoss.color }}
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 50 }}
        >
          {phase === 'intro' && (
            <div className="p-8 text-center space-y-6">
              <motion.div
                animate={{ scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Shield className="w-24 h-24 mx-auto" style={{ color: currentBoss.color }} />
              </motion.div>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-bold" style={{ color: currentBoss.color }}>
                  {currentBossName}
                </h2>
                <p className="text-muted-foreground">
                  {isFinale ? l('FINAL BREACH: break the Core', 'SON SIZMA: Çekirdeği kır', 'INVASÃO FINAL: quebre o Núcleo', 'BRECHA FINAL: rompe el Núcleo', 'ФИНАЛЬНЫЙ ВЗЛОМ: сломай Ядро') : kind === 'signal' ? pick6(language, ['The Core is calling. Silence its signal: the final Core loses 15% HP.', 'Çekirdek çağırıyor. Sinyalini sustur: son Çekirdek %15 can kaybeder.', 'O Núcleo está chamando. Cale o sinal: o Núcleo final perde 15% de vida.', 'El Núcleo llama. Silencia su señal: el Núcleo final pierde un 15% de vida.', 'Ядро зовёт. Заглуши сигнал: финальное Ядро теряет 15% HP.', '核心在呼唤。压制它的信号：最终核心生命 -15%。']) : kind === 'echo' ? pick6(language, [`Endless depth ${variant?.depth}: an echo of the Core. Win for x1.5 prestige.`, `Sonsuz derinlik ${variant?.depth}: Çekirdeğin yankısı. Kazanırsan x1.5 prestij.`, `Profundidade infinita ${variant?.depth}: um eco do Núcleo. Vença para x1,5 de prestígio.`, `Profundidad infinita ${variant?.depth}: un eco del Núcleo. Gana para x1,5 de prestigio.`, `Бесконечная глубина ${variant?.depth}: эхо Ядра. Победа даёт x1,5 престижа.`, `无尽深度 ${variant?.depth}：核心的回响。获胜可得 x1.5 声望。`]) : l(
                    `Ascension Level ${ascensionLevel + 1} Boss`,
                    `Yükseliş ${ascensionLevel + 1} Bossu`,
                    `Chefe da Ascensão ${ascensionLevel + 1}`,
                    `Jefe de Ascensión ${ascensionLevel + 1}`,
                    `Босс возвышения ${ascensionLevel + 1}`,
                  )}
                </p>
              </div>
              {modList.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2" data-testid="boss-modifiers">
                  {modList.map(id => (
                    <span key={id} className="rounded border border-amber-500/40 bg-amber-950/30 px-2 py-1 text-xs font-mono text-amber-200" title={pick6(language, BOSS_MODIFIERS[id].desc)}>
                      {pick6(language, BOSS_MODIFIERS[id].name)}: <span className="text-amber-100/70">{pick6(language, BOSS_MODIFIERS[id].desc)}</span>
                    </span>
                  ))}
                </div>
              )}
              
              <div className="bg-slate-900/50 rounded-lg p-4 space-y-2 border border-slate-700">
                <p className="text-sm text-cyan-400">
                  <Zap className="w-4 h-4 inline mr-1" />
                  {l(
                    `Click anywhere to attack - hit the glowing weak spots for ${weakSpotMultiplier.toFixed(1)}x damage!`,
                    `Saldırmak için herhangi bir yere tıkla - parlayan zayıf noktalara vurarak ${weakSpotMultiplier.toFixed(1)}x hasar ver!`,
                    `Clique em qualquer lugar para atacar. Acerte os pontos fracos brilhantes para causar ${weakSpotMultiplier.toFixed(1)}x de dano!`,
                    `Haz clic en cualquier lugar para atacar. Golpea los puntos debiles brillantes para causar ${weakSpotMultiplier.toFixed(1)}x de daño!`,
                    `Нажимайте где угодно для атаки — бейте по светящимся слабым точкам и наносите ${weakSpotMultiplier.toFixed(1)}x урона!`,
                  )}
                </p>
                <p className="text-sm text-fuchsia-300">
                  <Keyboard className="w-4 h-4 inline mr-1" />
                  {l(
                    `Breach Sequence (Optional): Press shown keys in order anytime for Overclock, +${TIME_BONUS_ON_BREACH}s battle time, and +${WEAK_SPOT_BONUS_ON_BREACH} weak spot spawns.`,
                    `İhlal Dizisi (İsteğe Bağlı): Gösterilen tuşlara istediğin zaman sırayla bas; Overclock, +${TIME_BONUS_ON_BREACH}sn savaş süresi ve +${WEAK_SPOT_BONUS_ON_BREACH} zayıf nokta kazan.`,
                    `Sequência de Invasão (Opcional): pressione as teclas exibidas na ordem, a qualquer momento, para ativar Overclock, ganhar +${TIME_BONUS_ON_BREACH}s de batalha e +${WEAK_SPOT_BONUS_ON_BREACH} pontos fracos.`,
                    `Secuencia de Brecha (Opcional): pulsa las teclas mostradas en orden en cualquier momento para activar Overclock, ganar +${TIME_BONUS_ON_BREACH}s de combate y +${WEAK_SPOT_BONUS_ON_BREACH} apariciones de puntos debiles.`,
                    `Последовательность взлома (необязательно): нажимайте показанные клавиши по порядку в любой момент, чтобы активировать Оверклок, получить +${TIME_BONUS_ON_BREACH}с ко времени боя и +${WEAK_SPOT_BONUS_ON_BREACH} слабые точки.`,
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {l(
                    `Battle Timer: ${timeLimit}s | Click Power: ${Math.round(damagePerClick)} | Weak Spot: ${Math.round(damagePerClick * weakSpotMultiplier)}`,
                    `Savaş Sayacı: ${timeLimit}sn | Tıklama Gücü: ${Math.round(damagePerClick)} | Zayıf Nokta: ${Math.round(damagePerClick * weakSpotMultiplier)}`,
                    `Tempo de Batalha: ${timeLimit}s | Poder de Clique: ${Math.round(damagePerClick)} | Ponto Fraco: ${Math.round(damagePerClick * weakSpotMultiplier)}`,
                    `Temporizador de Combate: ${timeLimit}s | Poder de Clic: ${Math.round(damagePerClick)} | Punto Debil: ${Math.round(damagePerClick * weakSpotMultiplier)}`,
                    `Таймер боя: ${timeLimit}с | Сила клика: ${Math.round(damagePerClick)} | Слабая точка: ${Math.round(damagePerClick * weakSpotMultiplier)}`,
                  )}
                </p>
                {powerMultiplier > 1 && (
                  <p className="text-xs text-emerald-300" data-testid="boss-power-bonus">
                    {pick6(language, [
                      `Permanent power: +${Math.round((powerMultiplier - 1) * 100)}% boss damage (from your permanent upgrades)`,
                      `Kalıcı güç: +%${Math.round((powerMultiplier - 1) * 100)} boss hasarı (kalıcı yükseltmelerinden)`,
                      `Poder permanente: +${Math.round((powerMultiplier - 1) * 100)}% de dano ao chefe (das suas melhorias permanentes)`,
                      `Poder permanente: +${Math.round((powerMultiplier - 1) * 100)}% de daño al jefe (de tus mejoras permanentes)`,
                      `Постоянная сила: +${Math.round((powerMultiplier - 1) * 100)}% урона боссу (от постоянных улучшений)`,
                      `永久力量：Boss 伤害 +${Math.round((powerMultiplier - 1) * 100)}%（来自永久升级）`,
                    ])}
                  </p>
                )}
              </div>
              
              {assistToggle}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                  <Trophy className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                  <p className="text-emerald-400 font-bold">{l('Victory', 'Zafer', 'Vitória', 'Victoria', 'Победа')}</p>
                  <p className="text-xs text-muted-foreground">+{prestigeGain} {l('Prestige', 'Prestij', 'Prestígio', 'Prestigio', 'Престиж')}</p>
                  <p className="text-xs text-emerald-300">{l('Full Ascension', 'Tam Yükseliş', 'Ascensão Completa', 'Ascensión Completa', 'Полное вознесение')}</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <Skull className="w-5 h-5 mx-auto mb-1 text-red-400" />
                  <p className="text-red-400 font-bold">{l('Defeat', 'Yenilgi', 'Derrota', 'Derrota', 'Поражение')}</p>
                  <p className="text-xs text-muted-foreground">+{penaltyPrestige} {l('Prestige', 'Prestij', 'Prestígio', 'Prestigio', 'Престиж')} ({pick6(language, [`keep ${keptPercent}%`, `%${keptPercent} korunur`, `mantém ${keptPercent}%`, `conservas ${keptPercent}%`, `сохраняется ${keptPercent}%`, `保留 ${keptPercent}%`])})</p>
                  <p className="text-xs text-red-300">{pick6(language, ['Ascension still counts, no loot box', 'Yükseliş yine sayılır, ganimet kutusu yok', 'A ascensão conta, sem caixa de recompensa', 'La ascensión cuenta, sin caja de botín', 'Вознесение засчитывается, без лутбокса', '飞升仍计入，无战利品箱'])}</p>
                  {!isFinale && retriesLeft > 0 && (
                    <p className="text-xs text-cyan-300">{pick6(language, [`${retriesLeft} free retry if you lose`, `Kaybedersen ${retriesLeft} ücretsiz tekrar`, `${retriesLeft} nova tentativa grátis se perder`, `${retriesLeft} reintento gratis si pierdes`, `${retriesLeft} бесплатная попытка при поражении`, `失败可免费重试 ${retriesLeft} 次`])}</p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 border-muted-foreground/30"
                >
                  {l('Retreat', 'Geri Çekil', 'Recuar', 'Retirarse', 'Отступить')}
                </Button>
                <Button
                  onClick={startBattle}
                  className="flex-1 text-white font-bold"
                  style={{ backgroundColor: currentBoss.color }}
                  data-testid="button-start-boss"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {l('INITIATE HACK', 'SALDIRIYI BAŞLAT', 'INICIAR HACK', 'INICIAR HACK', 'НАЧАТЬ ВЗЛОМ')}
                </Button>
              </div>
            </div>
          )}
          
          {phase === 'battle' && (
            <div className="relative">
              <div className="bg-slate-900 p-4 border-b border-slate-700">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5" style={{ color: currentBoss.color }} />
                    <span className="font-bold" style={{ color: currentBoss.color }}>{currentBossName}</span>
                    {modList.map(id => <span key={id} className="rounded border border-amber-500/40 px-1.5 py-0.5 text-[10px] font-mono text-amber-200">{pick6(language, BOSS_MODIFIERS[id].name)}</span>)}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm">{l(`Clicks: ${clicks}`, `Tıklama: ${clicks}`, `Cliques: ${clicks}`, `Clics: ${clicks}`, `Клики: ${clicks}`)}</span>
                    <span className={`font-mono text-lg font-bold ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`}>
                      {timeLeft}s
                    </span>
                  </div>
                </div>
                
                <div className="relative h-6 bg-slate-800 rounded-full overflow-hidden border border-slate-600">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ backgroundColor: currentBoss.color }}
                    animate={{ width: `${healthPercent}%` }}
                    transition={{ duration: 0.1 }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-mono text-xs font-bold text-white drop-shadow-lg">
                      {Math.ceil(bossHealth)} / {maxHealth} {l('HP', 'Can', 'HP', 'HP', 'HP')}
                      {usesShields && (
                        <span className="ml-2 font-bold text-orange-300" data-testid="finale-phase">
                          {phaseShields ? <>{l('PHASE', 'AŞAMA', 'FASE', 'FASE', 'ФАЗА')} {getFinalePhaseIndex(bossHealth, maxHealth) + 1}/3 · </> : null}{l('SHIELD', 'KALKAN', 'ESCUDO', 'ESCUDO', 'ЩИТ')} {Math.round(Math.max(flatShield, phaseShields ? phaseShields[getFinalePhaseIndex(bossHealth, maxHealth)] : 0) * 100)}% · {l('crits & weak spots pierce', 'kritik ve zayıf noktalar deler', 'críticos e pontos fracos perfuram', 'críticos y puntos débiles perforan', 'криты и слабые точки пробивают')}
                          {finaleWeaken > 0 && <> · {l('Core weakened', 'Çekirdek zayıfladı', 'Núcleo enfraquecido', 'Núcleo debilitado', 'Ядро ослаблено')}: -{Math.round(Math.min(0.5, finaleWeaken) * 100)}%</>}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
                <div className="relative mt-2 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-600/80">
                  <motion.div
                    className={`absolute inset-y-0 left-0 rounded-full ${timeLeft <= 5 ? 'bg-red-500' : 'bg-cyan-500'}`}
                    animate={{ width: `${timePercent}%` }}
                    transition={{ duration: 0.15 }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-yellow-300">{l(`Weak Spots: ${weakSpots.length}`, `Zayıf Nokta: ${weakSpots.length}`, `Pontos Fracos: ${weakSpots.length}`, `Puntos Debiles: ${weakSpots.length}`, `Слабые точки: ${weakSpots.length}`)}</span>
                  <span className={overclockActive ? 'text-emerald-300' : 'text-slate-400'}>
                    {overclockActive
                      ? l(
                        `Overclock x${OVERCLOCK_MULTIPLIER.toFixed(2)} (${(overclockRemaining / 1000).toFixed(1)}s)`,
                        `Overclock x${OVERCLOCK_MULTIPLIER.toFixed(2)} (${(overclockRemaining / 1000).toFixed(1)}sn)`,
                        `Overclock x${OVERCLOCK_MULTIPLIER.toFixed(2)} (${(overclockRemaining / 1000).toFixed(1)}s)`,
                      )
                      : l('Overclock: idle', 'Overclock: bekliyor', 'Overclock: ocioso', 'Overclock: inactivo', 'Оверклок: ожидание')}
                  </span>
                </div>
              </div>
              
              <div
                ref={battleAreaRef}
                className="relative h-80 cursor-crosshair select-none overflow-hidden"
                onPointerDown={handleBattlePointerDown}
                style={{
                  background: `radial-gradient(circle at center, ${currentBoss.color}20 0%, transparent 70%), 
                               linear-gradient(180deg, #0f172a 0%, #1e293b 100%)`,
                  touchAction: 'none',
                }}
                data-testid="boss-battle-area"
              >
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(180deg, rgba(148,163,184,0.06) 0px, rgba(148,163,184,0.06) 1px, transparent 1px, transparent 4px)',
                    mixBlendMode: 'screen',
                  }}
                />
                {lowHealthDanger && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    animate={{ opacity: [0.06, 0.22, 0.06] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    style={{ background: 'radial-gradient(circle, rgba(239, 68, 68, 0.45) 0%, transparent 72%)' }}
                  />
                )}
                {/* Boss visual in center */}
                <motion.div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  animate={{
                    scale: damageFlash ? 0.95 : 1,
                    filter: damageFlash ? 'brightness(2)' : 'brightness(1)',
                  }}
                  transition={{ duration: 0.05 }}
                >
                  <motion.div
                    className="relative flex items-center justify-center"
                    animate={{ 
                      y: [0, -10, 0],
                      rotate: [0, 3, -3, 0],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <svg width="120" height="120" viewBox="0 0 100 100">
                      <defs>
                        <filter id="glow">
                          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      
                      <motion.polygon
                        points={bossShape}
                        fill={`${currentBoss.color}30`}
                        stroke={currentBoss.color}
                        strokeWidth="2"
                        filter="url(#glow)"
                      />
                      
                      <rect x="35" y="40" width="30" height="20" fill={currentBoss.color} rx="2" />
                      <rect x="40" y="45" width="8" height="3" fill="#0f172a" rx="1" />
                      <rect x="52" y="45" width="8" height="3" fill="#0f172a" rx="1" />
                      <rect x="40" y="51" width="20" height="3" fill="#0f172a" rx="1" />
                    </svg>
                  </motion.div>
                </motion.div>

                {/* Weak spots - clickable targets for bonus damage */}
                <AnimatePresence>
                  {weakSpots.map((spot) => {
                    const lifeRatio = Math.max(0, 1 - (battleNow - spot.createdAt) / weakSpotLifetimeMs);
                    return (
                      <motion.div
                        key={spot.id}
                        className="absolute"
                        style={{ 
                          left: `${spot.xPercent}%`, 
                          top: `${spot.yPercent}%`,
                          width: spot.size,
                          height: spot.size,
                          transform: 'translate(-50%, -50%)',
                        }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <button
                          type="button"
                          aria-label={l('Weak spot', 'Zayıf nokta', 'Ponto fraco', 'Punto debil', 'Слабая точка')}
                          className="absolute rounded-full bg-transparent border-0 outline-none"
                          style={{
                            left: '50%',
                            top: '50%',
                            width: spot.size * 1.9,
                            height: spot.size * 1.9,
                            transform: 'translate(-50%, -50%)',
                          }}
                          onPointerDown={(event) => handleWeakSpotPointerDown(event, spot)}
                        />
                        <motion.div
                          className="relative w-full h-full rounded-full border-4 border-yellow-400 flex items-center justify-center pointer-events-none"
                          style={{
                            background: 'radial-gradient(circle, rgba(250, 204, 21, 0.42) 0%, rgba(250, 204, 21, 0.1) 70%)',
                            boxShadow: '0 0 24px rgba(250, 204, 21, 0.68), inset 0 0 20px rgba(250, 204, 21, 0.34)',
                          }}
                          animate={{ 
                            scale: [1, 1.1, 1],
                            borderColor: ['#facc15', '#fef08a', '#facc15'],
                          }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                        >
                          <Target className="w-6 h-6 text-yellow-300" />
                          <svg className="absolute inset-0 -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="4" />
                            <circle
                              cx="50"
                              cy="50"
                              r="45"
                              fill="none"
                              stroke="#fde047"
                              strokeWidth="4"
                              strokeDasharray={`${Math.PI * 2 * 45}`}
                              strokeDashoffset={`${(1 - lifeRatio) * Math.PI * 2 * 45}`}
                              strokeLinecap="round"
                            />
                          </svg>
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                
                {/* Hit effects */}
                <AnimatePresence>
                  {hitEffects.map((hit) => (
                    <motion.div
                      key={hit.id}
                      className="absolute pointer-events-none"
                      style={{ left: hit.x, top: hit.y }}
                      initial={{ scale: 0, opacity: 1 }}
                      animate={{ scale: hit.isWeakSpot ? 3 : hit.isOverclocked ? 2.4 : 2, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div 
                        className="w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full"
                        style={{ 
                          background: hit.isWeakSpot 
                            ? 'radial-gradient(circle, #facc15 0%, transparent 70%)' 
                            : hit.isOverclocked
                              ? 'radial-gradient(circle, #22d3ee 0%, transparent 70%)'
                              : `radial-gradient(circle, ${currentBoss.color} 0%, transparent 70%)`
                        }}
                      />
                      {hit.isWeakSpot && (
                        <motion.span 
                          className="absolute -top-4 left-1/2 -translate-x-1/2 text-yellow-400 font-bold text-lg whitespace-nowrap"
                          initial={{ y: 0, opacity: 1 }}
                          animate={{ y: -30, opacity: 0 }}
                          transition={{ duration: 0.5 }}
                        >
                          {l(
                            `${weakSpotMultiplier.toFixed(1)}x DAMAGE!`,
                            `${weakSpotMultiplier.toFixed(1)}x HASAR!`,
                            `${weakSpotMultiplier.toFixed(1)}x DANO!`,
                            `¡${weakSpotMultiplier.toFixed(1)}x DAÑO!`,
                            `${weakSpotMultiplier.toFixed(1)}x УРОН!`,
                          )}
                        </motion.span>
                      )}
                      {!hit.isWeakSpot && hit.isOverclocked && (
                        <motion.span 
                          className="absolute -top-4 left-1/2 -translate-x-1/2 text-cyan-300 font-bold text-sm whitespace-nowrap"
                          initial={{ y: 0, opacity: 1 }}
                          animate={{ y: -22, opacity: 0 }}
                          transition={{ duration: 0.45 }}
                        >
                          {l('OVERCLOCK', 'AŞIRI YÜK', 'OVERCLOCK', 'OVERCLOCK', 'ОВЕРКЛОК')}
                        </motion.span>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                <div className="absolute top-3 left-3 w-64 rounded-lg border border-fuchsia-400/35 bg-slate-900/70 backdrop-blur-sm p-2 pointer-events-none">
                  <div className="flex items-center justify-between mb-1">
                    <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-fuchsia-300 font-semibold">
                      <Keyboard className="w-3 h-3" /> {l('Breach Sequence', 'İhlal Dizisi', 'Sequência de Invasão', 'Secuencia de Brecha', 'Последовательность взлома')}
                    </span>
                    <span className="text-[10px] text-slate-300">
                      {breachSequence ? l('optional', 'isteğe bağlı', 'opcional', 'opcional', 'необязательно') : l('idle', 'bekliyor', 'ocioso', 'inactivo', 'ожидание')}
                    </span>
                  </div>

                  {breachSequence ? (
                    <>
                      <div className="flex items-center gap-1.5 mb-1">
                        {breachSequence.sequence.map((key, index) => {
                          const done = index < breachSequence.progress;
                          const active = index === breachSequence.progress;
                          return (
                            <span
                              key={`${breachSequence.id}-${key}-${index}`}
                              className={`w-8 h-8 rounded-md border text-center leading-8 font-mono text-sm ${
                                done
                                  ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
                                  : active
                                    ? 'bg-fuchsia-500/25 border-fuchsia-300 text-fuchsia-100'
                                    : 'bg-slate-800/90 border-slate-600 text-slate-300'
                              }`}
                            >
                              {key}
                            </span>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-cyan-300/85">
                        {l(
                          `No time limit. Reward: +${TIME_BONUS_ON_BREACH}s and +${WEAK_SPOT_BONUS_ON_BREACH} weak spots.`,
                          `Süre sınırı yok. Ödül: +${TIME_BONUS_ON_BREACH}sn ve +${WEAK_SPOT_BONUS_ON_BREACH} zayıf nokta.`,
                          `Sem limite de tempo. Recompensa: +${TIME_BONUS_ON_BREACH}s e +${WEAK_SPOT_BONUS_ON_BREACH} pontos fracos.`,
                          `Sin limite de tiempo. Recompensa: +${TIME_BONUS_ON_BREACH}s y +${WEAK_SPOT_BONUS_ON_BREACH} puntos debiles.`,
                          `Без лимита времени. Награда: +${TIME_BONUS_ON_BREACH}с и +${WEAK_SPOT_BONUS_ON_BREACH} слабых точки.`,
                        )}
                      </p>
                    </>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      {l(
                        `Optional prompt appears periodically. Complete it for Overclock, +${TIME_BONUS_ON_BREACH}s, and +${WEAK_SPOT_BONUS_ON_BREACH} weak spots.`,
                        `İsteğe bağlı komut belli aralıklarla gelir. Tamamlarsan Overclock, +${TIME_BONUS_ON_BREACH}sn ve +${WEAK_SPOT_BONUS_ON_BREACH} zayıf nokta kazanırsın.`,
                        `O comando opcional aparece periodicamente. Complete-o para ganhar Overclock, +${TIME_BONUS_ON_BREACH}s e +${WEAK_SPOT_BONUS_ON_BREACH} pontos fracos.`,
                        `La secuencia opcional aparece periodicamente. Completala para ganar Overclock, +${TIME_BONUS_ON_BREACH}s y +${WEAK_SPOT_BONUS_ON_BREACH} puntos debiles.`,
                        `Дополнительная последовательность появляется периодически. Завершите её, чтобы получить Overclock, +${TIME_BONUS_ON_BREACH}с и +${WEAK_SPOT_BONUS_ON_BREACH} слабых точки.`,
                      )}
                    </p>
                  )}
                </div>

                <AnimatePresence>
                  {breachFeedback && (
                    <motion.div
                      className={`absolute top-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-md border font-bold text-sm ${
                        breachFeedback === 'success'
                          ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                          : 'bg-rose-500/20 border-rose-400/60 text-rose-200'
                      }`}
                      initial={{ opacity: 0, y: -12, scale: 0.92 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    >
                      {breachFeedback === 'success'
                        ? l(
                          `SEQUENCE BREACHED! OVERCLOCK x${OVERCLOCK_MULTIPLIER.toFixed(2)} +${TIME_BONUS_ON_BREACH}s +${WEAK_SPOT_BONUS_ON_BREACH} WEAK SPOTS`,
                          `DİZİ AŞILDI! OVERCLOCK x${OVERCLOCK_MULTIPLIER.toFixed(2)} +${TIME_BONUS_ON_BREACH}sn +${WEAK_SPOT_BONUS_ON_BREACH} ZAYIF NOKTA`,
                          `SEQUÊNCIA CONCLUIDA! OVERCLOCK x${OVERCLOCK_MULTIPLIER.toFixed(2)} +${TIME_BONUS_ON_BREACH}s +${WEAK_SPOT_BONUS_ON_BREACH} PONTOS FRACOS`,
                          `SECUENCIA COMPLETADA! OVERCLOCK x${OVERCLOCK_MULTIPLIER.toFixed(2)} +${TIME_BONUS_ON_BREACH}s +${WEAK_SPOT_BONUS_ON_BREACH} PUNTOS DEBILES`,
                          `ВЗЛОМ УСПЕШЕН! ОВЕРКЛОК x${OVERCLOCK_MULTIPLIER.toFixed(2)} +${TIME_BONUS_ON_BREACH}с +${WEAK_SPOT_BONUS_ON_BREACH} СЛАБЫЕ ТОЧКИ`,
                        )
                        : l('SEQUENCE FAILED', 'DİZİ BAŞARISIZ', 'SEQUÊNCIA FALHOU', 'SECUENCIA FALLIDA', 'ПОСЛЕДОВАТЕЛЬНОСТЬ ПРОВАЛЕНА')}
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <motion.p 
                    className="text-sm font-bold uppercase tracking-widest"
                    style={{ color: currentBoss.color }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    {l(
                      `Click anywhere - Hit yellow targets for ${weakSpotMultiplier.toFixed(1)}x! | Optional breach (no timer): OVERCLOCK +${TIME_BONUS_ON_BREACH}s +${WEAK_SPOT_BONUS_ON_BREACH} weak spots`,
                      `Herhangi bir yere tıkla - sarı hedeflerde ${weakSpotMultiplier.toFixed(1)}x! | İsteğe bağlı ihlal (süresiz): OVERCLOCK +${TIME_BONUS_ON_BREACH}sn +${WEAK_SPOT_BONUS_ON_BREACH} zayıf nokta`,
                      `Clique em qualquer lugar. Acerte os alvos amarelos para ${weakSpotMultiplier.toFixed(1)}x! | Invasão opcional (sem timer): OVERCLOCK +${TIME_BONUS_ON_BREACH}s +${WEAK_SPOT_BONUS_ON_BREACH} pontos fracos`,
                      `Haz clic en cualquier lugar. Golpea los objetivos amarillos para ${weakSpotMultiplier.toFixed(1)}x! | Brecha opcional (sin temporizador): OVERCLOCK +${TIME_BONUS_ON_BREACH}s +${WEAK_SPOT_BONUS_ON_BREACH} puntos debiles`,
                      `Нажимайте где угодно. Попадайте по жёлтым целям для ${weakSpotMultiplier.toFixed(1)}x! | Доп. взлом (без таймера): ОВЕРКЛОК +${TIME_BONUS_ON_BREACH}с +${WEAK_SPOT_BONUS_ON_BREACH} слабые точки`,
                    )}
                  </motion.p>
                </div>
              </div>
            </div>
          )}
          
          {phase === 'victory' && (
            <div className="p-8 text-center space-y-6">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", duration: 0.8 }}
              >
                <Trophy className="w-24 h-24 mx-auto text-yellow-400" />
              </motion.div>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-emerald-400">{l('FIREWALL BREACHED!', 'GÜVENLİK AŞILDI!', 'FIREWALL ROMPIDO!', '¡FIREWALL ROTO!', 'ФАЙРВОЛ ВЗЛОМАН!')}</h2>
                <p className="text-muted-foreground">
                  {l(
                    `${currentBossName} defeated in ${clicks} clicks`,
                    `${currentBossName}, ${clicks} tıklamada yenildi`,
                    `${currentBossName} foi derrotado em ${clicks} cliques`,
                    `${currentBossName} fue derrotado en ${clicks} clics`,
                    `${currentBossName} побежден за ${clicks} кликов`,
                  )}
                </p>
              </div>
              
              <motion.div
                className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-sm text-muted-foreground mb-2">{l('Prestige Reward', 'Prestij Ödülü', 'Recompensa de Prestígio', 'Recompensa de Prestigio', 'Награда престижа')}</p>
                <p className="text-4xl font-bold text-emerald-400">+{prestigeGain}</p>
                <p className="text-sm text-cyan-400 mt-2">
                  {l(
                    `Ascending to Level ${ascensionLevel + 2}!`,
                    `${ascensionLevel + 2}. seviyeye yükseliyorsun!`,
                    `Ascendendo para o Nível ${ascensionLevel + 2}!`,
                    `Ascendiendo al Nivel ${ascensionLevel + 2}!`,
                    `Возвышение до уровня ${ascensionLevel + 2}!`,
                  )}
                </p>
              </motion.div>
              
              <Button
                onClick={handleVictory}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-6"
                data-testid="button-claim-victory"
              >
                <Trophy className="w-5 h-5 mr-2" />
                {l('CLAIM REWARDS & ASCEND', 'ÖDÜLLERİ AL VE YÜKSEL', 'RESGATAR RECOMPENSAS E ASCENDER', 'RECLAMAR RECOMPENSAS Y ASCENDER', 'ЗАБРАТЬ НАГРАДЫ И ВОЗНЕСТИСЬ')}
              </Button>
            </div>
          )}
          
          {phase === 'defeat' && (
            <div className="p-8 text-center space-y-6">
              <motion.div
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Skull className="w-24 h-24 mx-auto text-red-500" />
              </motion.div>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-red-400">{l('HACK FAILED!', 'SALDIRI BAŞARISIZ!', 'HACK FALHOU!', '¡HACK FALLÓ!', 'ВЗЛОМ ПРОВАЛЕН!')}</h2>
                <p className="text-muted-foreground">
                  {l(
                    `${currentBossName} resisted your attack`,
                    `${currentBossName} saldırına direndi`,
                    `${currentBossName} resistiu ao seu ataque`,
                    `${currentBossName} resistio tu ataque`,
                    `${currentBossName} отразил вашу атаку`,
                  )}
                </p>
              </div>
              
              {isFinale ? (
                <p className="text-sm text-cyan-300" data-testid="finale-defeat-note">
                  {pick6(language, [
                    'No penalty. Each failed attempt weakens the Core for the next try.',
                    'Ceza yok. Her başarısız deneme bir sonraki deneme için Çekirdeği zayıflatır.',
                    'Sem penalidade. Cada tentativa falha enfraquece o Núcleo para a próxima.',
                    'Sin penalización. Cada intento fallido debilita el Núcleo para el siguiente.',
                    'Без штрафа. Каждая неудачная попытка ослабляет Ядро для следующей.',
                    '没有惩罚。每次失败都会削弱核心，下次更容易。',
                  ])}
                </p>
              ) : (
              <motion.div
                className="bg-red-500/10 border border-red-500/30 rounded-lg p-6"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                   <p className="text-sm text-amber-400">{pick6(language, ['If you accept', 'Kabul edersen', 'Se aceitar', 'Si aceptas', 'Если принять', '如果接受'])}</p>
                  </div>
                 <p className="text-sm text-muted-foreground mb-2">{pick6(language, [
                   `You keep ${keptPercent}% of the prestige (${100 - keptPercent}% lost)`,
                   `Prestijin %${keptPercent}'ini korursun (%${100 - keptPercent} kaybolur)`,
                   `Você mantém ${keptPercent}% do prestígio (${100 - keptPercent}% perdido)`,
                   `Conservas el ${keptPercent}% del prestigio (se pierde el ${100 - keptPercent}%)`,
                   `Вы сохраняете ${keptPercent}% престижа (${100 - keptPercent}% теряется)`,
                   `保留 ${keptPercent}% 声望（损失 ${100 - keptPercent}%）`,
                 ])}</p>
                 <p className="text-3xl font-bold text-amber-400">+{penaltyPrestige}</p>
                 <p className="text-xs text-muted-foreground mt-3">
                   {pick6(language, [
                     `You still reach ascension ${ascensionLevel + 1}, but get no loot box.`,
                     `Yine de ${ascensionLevel + 1}. yükselişe ulaşırsın, ama ganimet kutusu yok.`,
                     `Você ainda chega à ascensão ${ascensionLevel + 1}, mas sem caixa de recompensa.`,
                     `Aun así llegas a la ascensión ${ascensionLevel + 1}, pero sin caja de botín.`,
                     `Вы всё равно достигаете вознесения ${ascensionLevel + 1}, но без лутбокса.`,
                     `你仍会达到第 ${ascensionLevel + 1} 次飞升，但没有战利品箱。`,
                   ])}
                 </p>
                 <p className="text-xs text-cyan-400 mt-1">
                   {l('Run resets - try again to break through!', 'Koşu sıfırlanır - yeniden dene ve aş!', 'A run reinicia. Tente de novo para romper a defesa!', 'La partida se reinicia. Vuelve a intentarlo para romper la defensa!', 'Забег будет сброшен — попробуйте снова, чтобы прорваться!')}
                  </p>
              </motion.div>
              )}

              {!isFinale && retriesLeft > 0 && (
                <div className="space-y-3">
                  {assistToggle}
                  <Button
                    onClick={handleRetry}
                    className="w-full text-white font-bold py-6"
                    style={{ backgroundColor: currentBoss.color }}
                    data-testid="button-retry-boss"
                  >
                    <Zap className="w-5 h-5 mr-2" />
                    {pick6(language, [
                      `RETRY THE SAME BOSS (${retriesLeft} left)`,
                      `AYNI BOSSU TEKRAR DENE (${retriesLeft} hak)`,
                      `TENTAR DE NOVO (${retriesLeft} restante)`,
                      `REINTENTAR (${retriesLeft} restante)`,
                      `ПОВТОРИТЬ БОЙ (осталось ${retriesLeft})`,
                      `重试同一 Boss（剩余 ${retriesLeft} 次）`,
                    ])}
                  </Button>
                </div>
              )}
              
              <Button
                onClick={handleDefeat}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-6"
                data-testid="button-accept-defeat"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                 {l('ACCEPT & RESTART RUN', 'KABUL ET VE YENİDEN BAŞLA', 'ACEITAR E REINICIAR RUN', 'ACEPTAR Y REINICIAR PARTIDA', 'ПРИНЯТЬ И ПЕРЕЗАПУСТИТЬ ЗАБЕГ')}
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function RotateCcw(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
    </svg>
  );
}

