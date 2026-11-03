import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Shield, Zap, Skull, Trophy, AlertTriangle, Target, Keyboard } from "lucide-react";

interface BossEncounterProps {
  isOpen: boolean;
  onClose: () => void;
  onVictory: () => void;
  onDefeat: () => void;
  prestigeGain: number;
  ascensionLevel: number;
  dataPerClick: number;
  isMainScreen?: boolean;
  playSound?: (type: 'click' | 'buy_fab' | 'buy_black' | 'sell' | 'crit' | 'checkpoint' | 'achievement' | 'pickup' | 'boss_hit' | 'weakspot_hit') => void;
}

// Easier boss levels - more time, lower multipliers
const BOSS_LEVELS = [
  { name: "Firewall v1.0", baseClicks: 15, bossMultiplier: 1.0, timeLimit: 20, color: "#3b82f6" },
  { name: "Firewall v2.0", baseClicks: 18, bossMultiplier: 1.0, timeLimit: 20, color: "#8b5cf6" },
  { name: "Firewall v3.0", baseClicks: 20, bossMultiplier: 1.0, timeLimit: 18, color: "#a855f7" },
  { name: "Quantum Barrier", baseClicks: 22, bossMultiplier: 1.0, timeLimit: 18, color: "#d946ef" },
  { name: "Neural Firewall", baseClicks: 25, bossMultiplier: 1.0, timeLimit: 16, color: "#ec4899" },
  { name: "AI Guardian", baseClicks: 28, bossMultiplier: 1.0, timeLimit: 16, color: "#f43f5e" },
  { name: "Omega Protocol", baseClicks: 30, bossMultiplier: 1.0, timeLimit: 15, color: "#ef4444" },
  { name: "Core Sentinel", baseClicks: 32, bossMultiplier: 1.0, timeLimit: 15, color: "#dc2626" },
  { name: "System Overlord", baseClicks: 35, bossMultiplier: 1.0, timeLimit: 14, color: "#b91c1c" },
  { name: "The Architect", baseClicks: 38, bossMultiplier: 1.0, timeLimit: 14, color: "#991b1b" },
];
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

export function BossEncounter({ isOpen, onClose, onVictory, onDefeat, prestigeGain, ascensionLevel, dataPerClick, isMainScreen = false, playSound }: BossEncounterProps) {
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
  
  const bossIndex = Math.min(ascensionLevel, BOSS_LEVELS.length - 1);
  const currentBoss = BOSS_LEVELS[bossIndex];
  
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
      Math.round(dataPerClick * currentBoss.baseClicks * currentBoss.bossMultiplier * ascensionFactor)
    );
    return calculatedHealth;
  }, [dataPerClick, currentBoss, ascensionLevel]);

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
        const filtered = prev.filter(spot => now - spot.createdAt < WEAK_SPOT_LIFETIME_MS);
        return filtered;
      });
      // Spawn new weak spot
      generateWeakSpot();
    }, 2500);
    
    return () => clearInterval(interval);
  }, [phase, generateWeakSpot]);
  
  useEffect(() => {
    if (isOpen) {
      setPhase('intro');
      const health = calculateBossHealth();
      setBossHealth(health);
      setMaxHealth(health);
      setTimeLeft(currentBoss.timeLimit);
      setClicks(0);
      setHitEffects([]);
      setWeakSpots([]);
      setBreachSequence(null);
      setBreachFeedback(null);
      setOverclockUntil(0);
      setBattleNow(Date.now());
      setDamagePerClick(dataPerClick);
    }
  }, [isOpen, currentBoss, calculateBossHealth, dataPerClick]);
  
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
    };
  }, []);

  useEffect(() => {
    if (phase !== 'battle') {
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
            setTimeLeft(current => Math.min(currentBoss.timeLimit + MAX_BATTLE_TIME_BUFFER, current + TIME_BONUS_ON_BREACH));
            for (let i = 0; i < WEAK_SPOT_BONUS_ON_BREACH; i++) {
              setTimeout(() => generateWeakSpot(), i * 180);
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
  }, [phase, breachSequence, currentBoss.timeLimit, generateWeakSpot, playSound, showBreachFeedback]);

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
      (hitWeakSpot ? WEAK_SPOT_MULTIPLIER : 1) *
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
    const damage = baseDamage * damageMultiplier;

    setClicks((prev) => prev + 1);
    setBossHealth((prev) => {
      const newHealth = prev - damage;
      if (newHealth <= 0) {
        setPhase('victory');
        return 0;
      }
      return newHealth;
    });

    setDamageFlash(true);
    setTimeout(() => setDamageFlash(false), 50);
  }, [phase, damagePerClick, checkWeakSpotHit, overclockUntil, playSound]);

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
  
  const startBattle = () => {
    setPhase('battle');
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
  const timePercent = Math.max(0, (timeLeft / currentBoss.timeLimit) * 100);
  const overclockRemaining = Math.max(0, overclockUntil - battleNow);
  const overclockActive = overclockRemaining > 0;
  const lowHealthDanger = healthPercent <= 30;
  const penaltyPrestige = Math.floor(prestigeGain * 0.25);
  
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
                  {currentBoss.name}
                </h2>
                <p className="text-muted-foreground">
                  Ascension Level {ascensionLevel + 1} Boss
                </p>
              </div>
              
              <div className="bg-slate-900/50 rounded-lg p-4 space-y-2 border border-slate-700">
                <p className="text-sm text-cyan-400">
                  <Zap className="w-4 h-4 inline mr-1" />
                  Click anywhere to attack - hit the glowing weak spots for {WEAK_SPOT_MULTIPLIER.toFixed(1)}x damage!
                </p>
                <p className="text-sm text-fuchsia-300">
                  <Keyboard className="w-4 h-4 inline mr-1" />
                  Breach Sequence (Optional): Press shown keys in order anytime for Overclock, +{TIME_BONUS_ON_BREACH}s battle time, and +{WEAK_SPOT_BONUS_ON_BREACH} weak spot spawns.
                </p>
                <p className="text-xs text-muted-foreground">
                  Battle Timer: {currentBoss.timeLimit}s | Click Power: {Math.round(damagePerClick)} | Weak Spot: {Math.round(damagePerClick * WEAK_SPOT_MULTIPLIER)}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                  <Trophy className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                  <p className="text-emerald-400 font-bold">Victory</p>
                  <p className="text-xs text-muted-foreground">+{prestigeGain} Prestige</p>
                  <p className="text-xs text-emerald-300">Full Ascension</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <Skull className="w-5 h-5 mx-auto mb-1 text-red-400" />
                  <p className="text-red-400 font-bold">Defeat</p>
                  <p className="text-xs text-muted-foreground">+{penaltyPrestige} Prestige (25%)</p>
                  <p className="text-xs text-red-300">No Ascension Level</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 border-muted-foreground/30"
                >
                  Retreat
                </Button>
                <Button
                  onClick={startBattle}
                  className="flex-1 text-white font-bold"
                  style={{ backgroundColor: currentBoss.color }}
                  data-testid="button-start-boss"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  INITIATE HACK
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
                    <span className="font-bold" style={{ color: currentBoss.color }}>{currentBoss.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm">Clicks: {clicks}</span>
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
                      {Math.ceil(bossHealth)} / {maxHealth} HP
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
                  <span className="text-yellow-300">Weak Spots: {weakSpots.length}</span>
                  <span className={overclockActive ? 'text-emerald-300' : 'text-slate-400'}>
                    {overclockActive ? `Overclock x${OVERCLOCK_MULTIPLIER.toFixed(2)} (${(overclockRemaining / 1000).toFixed(1)}s)` : 'Overclock: idle'}
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
                        points="50,15 85,32.5 85,67.5 50,85 15,67.5 15,32.5"
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
                    const lifeRatio = Math.max(0, 1 - (battleNow - spot.createdAt) / WEAK_SPOT_LIFETIME_MS);
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
                          aria-label="Weak spot"
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
                          {WEAK_SPOT_MULTIPLIER.toFixed(1)}x DAMAGE!
                        </motion.span>
                      )}
                      {!hit.isWeakSpot && hit.isOverclocked && (
                        <motion.span 
                          className="absolute -top-4 left-1/2 -translate-x-1/2 text-cyan-300 font-bold text-sm whitespace-nowrap"
                          initial={{ y: 0, opacity: 1 }}
                          animate={{ y: -22, opacity: 0 }}
                          transition={{ duration: 0.45 }}
                        >
                          OVERCLOCK
                        </motion.span>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                <div className="absolute top-3 left-3 w-64 rounded-lg border border-fuchsia-400/35 bg-slate-900/70 backdrop-blur-sm p-2 pointer-events-none">
                  <div className="flex items-center justify-between mb-1">
                    <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-fuchsia-300 font-semibold">
                      <Keyboard className="w-3 h-3" /> Breach Sequence
                    </span>
                    <span className="text-[10px] text-slate-300">
                      {breachSequence ? 'optional' : 'idle'}
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
                        No time limit. Reward: +{TIME_BONUS_ON_BREACH}s and +{WEAK_SPOT_BONUS_ON_BREACH} weak spots.
                      </p>
                    </>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      Optional prompt appears periodically. Complete it for Overclock, +{TIME_BONUS_ON_BREACH}s, and +{WEAK_SPOT_BONUS_ON_BREACH} weak spots.
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
                        ? `SEQUENCE BREACHED! OVERCLOCK x${OVERCLOCK_MULTIPLIER.toFixed(2)} +${TIME_BONUS_ON_BREACH}s +${WEAK_SPOT_BONUS_ON_BREACH} WEAK SPOTS`
                        : 'SEQUENCE FAILED'}
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
                    Click anywhere - Hit yellow targets for {WEAK_SPOT_MULTIPLIER.toFixed(1)}x! | Optional breach (no timer): OVERCLOCK +{TIME_BONUS_ON_BREACH}s +{WEAK_SPOT_BONUS_ON_BREACH} weak spots
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
                <h2 className="text-3xl font-bold text-emerald-400">FIREWALL BREACHED!</h2>
                <p className="text-muted-foreground">
                  {currentBoss.name} defeated in {clicks} clicks
                </p>
              </div>
              
              <motion.div
                className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-sm text-muted-foreground mb-2">Prestige Reward</p>
                <p className="text-4xl font-bold text-emerald-400">+{prestigeGain}</p>
                <p className="text-sm text-cyan-400 mt-2">Ascending to Level {ascensionLevel + 2}!</p>
              </motion.div>
              
              <Button
                onClick={handleVictory}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-6"
                data-testid="button-claim-victory"
              >
                <Trophy className="w-5 h-5 mr-2" />
                CLAIM REWARDS & ASCEND
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
                <h2 className="text-3xl font-bold text-red-400">HACK FAILED!</h2>
                <p className="text-muted-foreground">
                  {currentBoss.name} resisted your attack
                </p>
              </div>
              
              <motion.div
                className="bg-red-500/10 border border-red-500/30 rounded-lg p-6"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <p className="text-sm text-amber-400">Penalty Applied</p>
                </div>
                <p className="text-sm text-muted-foreground mb-2">Consolation Prestige (25%)</p>
                <p className="text-3xl font-bold text-amber-400">+{penaltyPrestige}</p>
                <p className="text-xs text-muted-foreground mt-3">
                  Ascension level remains at {ascensionLevel + 1}
                </p>
                <p className="text-xs text-cyan-400 mt-1">
                  Run resets - try again to break through!
                </p>
              </motion.div>
              
              <Button
                onClick={handleDefeat}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-6"
                data-testid="button-accept-defeat"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                ACCEPT & RESTART RUN
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
