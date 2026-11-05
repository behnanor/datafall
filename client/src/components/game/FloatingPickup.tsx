import { motion } from 'framer-motion';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';

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

interface FloatingPickupProps {
  pickup: FloatingPickupItem;
  onCollect: (pickup: FloatingPickupItem) => void;
  onCritCollect: (pickup: FloatingPickupItem) => void;
  onMiss: (id: string) => void;
}

const FLOATER_MIN_TRAVEL_DURATION_SEC = 7.2;
const FLOATER_MAX_TRAVEL_DURATION_SEC = 10.4;
const FLOATER_MIN_VISIBLE_DURATION_SEC = 3.8;

const UFOGraphic = () => (
  <svg viewBox="0 0 80 50" className="w-16 h-10">
    <defs>
      <radialGradient id="ufoGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="rgba(34, 211, 238, 0.8)" />
        <stop offset="100%" stopColor="rgba(34, 211, 238, 0)" />
      </radialGradient>
      <linearGradient id="ufoBody" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#67e8f9" />
        <stop offset="50%" stopColor="#22d3ee" />
        <stop offset="100%" stopColor="#0891b2" />
      </linearGradient>
    </defs>
    <ellipse cx="40" cy="35" rx="30" ry="8" fill="url(#ufoGlow)">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />
    </ellipse>
    <ellipse cx="40" cy="28" rx="35" ry="10" fill="url(#ufoBody)" stroke="#06b6d4" strokeWidth="1" />
    <ellipse cx="40" cy="22" rx="20" ry="12" fill="#155e75" stroke="#22d3ee" strokeWidth="1" />
    <ellipse cx="40" cy="18" rx="12" ry="6" fill="#083344" stroke="#67e8f9" strokeWidth="0.5">
      <animate attributeName="fill" values="#083344;#164e63;#083344" dur="2s" repeatCount="indefinite" />
    </ellipse>
    {[18, 30, 40, 50, 62].map((x, i) => (
      <circle key={i} cx={x} cy="28" r="2.5" fill="#22d3ee">
        <animate attributeName="opacity" values="1;0.3;1" dur="0.5s" begin={`${i * 0.1}s`} repeatCount="indefinite" />
      </circle>
    ))}
    <line x1="32" y1="38" x2="28" y2="48" stroke="#22d3ee" strokeWidth="2" opacity="0.6">
      <animate attributeName="opacity" values="0.3;0.8;0.3" dur="0.8s" repeatCount="indefinite" />
    </line>
    <line x1="48" y1="38" x2="52" y2="48" stroke="#22d3ee" strokeWidth="2" opacity="0.6">
      <animate attributeName="opacity" values="0.3;0.8;0.3" dur="0.8s" begin="0.4s" repeatCount="indefinite" />
    </line>
  </svg>
);

const RocketGraphic = () => (
  <svg viewBox="0 0 40 70" className="w-8 h-14">
    <defs>
      <linearGradient id="rocketBody" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="50%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      <linearGradient id="rocketFlame" x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stopColor="#f97316" />
        <stop offset="50%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#fbbf24" />
      </linearGradient>
    </defs>
    <path d="M20 5 L30 25 L30 50 L25 55 L15 55 L10 50 L10 25 Z" fill="url(#rocketBody)" stroke="#fcd34d" strokeWidth="1" />
    <ellipse cx="20" cy="15" rx="6" ry="8" fill="#1e3a5f" stroke="#38bdf8" strokeWidth="1">
      <animate attributeName="fill" values="#1e3a5f;#0369a1;#1e3a5f" dur="1.5s" repeatCount="indefinite" />
    </ellipse>
    <path d="M10 35 L5 50 L10 45 Z" fill="#d97706" stroke="#fbbf24" strokeWidth="0.5" />
    <path d="M30 35 L35 50 L30 45 Z" fill="#d97706" stroke="#fbbf24" strokeWidth="0.5" />
    <path d="M15 55 Q20 75 25 55" fill="url(#rocketFlame)">
      <animate attributeName="d" values="M15 55 Q20 75 25 55;M15 55 Q20 68 25 55;M15 55 Q20 75 25 55" dur="0.15s" repeatCount="indefinite" />
    </path>
    <circle cx="17" cy="58" r="2" fill="#fcd34d" opacity="0.8">
      <animate attributeName="cy" values="58;65;58" dur="0.2s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.8;0.2;0.8" dur="0.2s" repeatCount="indefinite" />
    </circle>
    <circle cx="23" cy="60" r="1.5" fill="#fb923c" opacity="0.6">
      <animate attributeName="cy" values="60;68;60" dur="0.25s" repeatCount="indefinite" />
    </circle>
  </svg>
);

const AlienGraphic = () => (
  <svg viewBox="0 0 60 70" className="w-12 h-14">
    <defs>
      <radialGradient id="alienHead" cx="50%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#a3e635" />
        <stop offset="70%" stopColor="#65a30d" />
        <stop offset="100%" stopColor="#3f6212" />
      </radialGradient>
      <radialGradient id="alienEye" cx="30%" cy="30%" r="60%">
        <stop offset="0%" stopColor="#1a1a2e" />
        <stop offset="100%" stopColor="#000" />
      </radialGradient>
    </defs>
    <ellipse cx="30" cy="32" rx="25" ry="28" fill="url(#alienHead)" stroke="#84cc16" strokeWidth="1" />
    <ellipse cx="18" cy="28" rx="10" ry="14" fill="url(#alienEye)" stroke="#22c55e" strokeWidth="1" transform="rotate(-15 18 28)">
      <animate attributeName="ry" values="14;12;14" dur="3s" repeatCount="indefinite" />
    </ellipse>
    <ellipse cx="42" cy="28" rx="10" ry="14" fill="url(#alienEye)" stroke="#22c55e" strokeWidth="1" transform="rotate(15 42 28)">
      <animate attributeName="ry" values="14;12;14" dur="3s" repeatCount="indefinite" />
    </ellipse>
    <ellipse cx="18" cy="26" rx="3" ry="4" fill="#a3e635" opacity="0.6">
      <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite" />
    </ellipse>
    <ellipse cx="42" cy="26" rx="3" ry="4" fill="#a3e635" opacity="0.6">
      <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" begin="0.75s" repeatCount="indefinite" />
    </ellipse>
    <ellipse cx="30" cy="48" rx="4" ry="2" fill="#3f6212" />
    <path d="M10 60 Q5 55 8 45" stroke="#65a30d" strokeWidth="3" fill="none" strokeLinecap="round">
      <animate attributeName="d" values="M10 60 Q5 55 8 45;M12 62 Q4 56 6 46;M10 60 Q5 55 8 45" dur="2s" repeatCount="indefinite" />
    </path>
    <path d="M50 60 Q55 55 52 45" stroke="#65a30d" strokeWidth="3" fill="none" strokeLinecap="round">
      <animate attributeName="d" values="M50 60 Q55 55 52 45;M48 62 Q56 56 54 46;M50 60 Q55 55 52 45" dur="2s" begin="1s" repeatCount="indefinite" />
    </path>
    <circle cx="8" cy="60" r="4" fill="#65a30d" />
    <circle cx="52" cy="60" r="4" fill="#65a30d" />
  </svg>
);

const GloveRocketGraphic = () => (
  <svg viewBox="0 0 50 80" className="w-10 h-16">
    <defs>
      <linearGradient id="gloveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#e879f9" />
        <stop offset="50%" stopColor="#d946ef" />
        <stop offset="100%" stopColor="#a21caf" />
      </linearGradient>
      <linearGradient id="gloveFlame" x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stopColor="#f0abfc" />
        <stop offset="50%" stopColor="#e879f9" />
        <stop offset="100%" stopColor="#c026d3" />
      </linearGradient>
    </defs>
    <rect x="15" y="25" width="20" height="35" rx="5" fill="url(#gloveGrad)" stroke="#f0abfc" strokeWidth="1" />
    <path d="M35 35 Q45 30 42 20 Q38 15 35 25" fill="url(#gloveGrad)" stroke="#f0abfc" strokeWidth="0.5" />
    <path d="M35 42 Q48 42 45 32" fill="url(#gloveGrad)" stroke="#f0abfc" strokeWidth="0.5" />
    <path d="M35 48 Q46 50 44 42" fill="url(#gloveGrad)" stroke="#f0abfc" strokeWidth="0.5" />
    <path d="M32 55 Q38 58 38 52" fill="url(#gloveGrad)" stroke="#f0abfc" strokeWidth="0.5" />
    <circle cx="25" cy="38" r="6" fill="#a21caf" stroke="#f0abfc" strokeWidth="1">
      <animate attributeName="r" values="6;7;6" dur="0.8s" repeatCount="indefinite" />
    </circle>
    <text x="25" y="41" textAnchor="middle" fontSize="8" fill="#f0abfc" fontWeight="bold">A</text>
    <path d="M18 60 Q25 85 32 60" fill="url(#gloveFlame)">
      <animate attributeName="d" values="M18 60 Q25 85 32 60;M18 60 Q25 72 32 60;M18 60 Q25 85 32 60" dur="0.12s" repeatCount="indefinite" />
    </path>
    <circle cx="22" cy="65" r="2" fill="#f5d0fe" opacity="0.7">
      <animate attributeName="cy" values="65;75;65" dur="0.18s" repeatCount="indefinite" />
    </circle>
    <circle cx="28" cy="68" r="1.5" fill="#e879f9" opacity="0.5">
      <animate attributeName="cy" values="68;78;68" dur="0.22s" repeatCount="indefinite" />
    </circle>
    <line x1="15" y1="62" x2="10" y2="72" stroke="#e879f9" strokeWidth="1.5" opacity="0.6">
      <animate attributeName="opacity" values="0.3;0.7;0.3" dur="0.15s" repeatCount="indefinite" />
    </line>
    <line x1="35" y1="62" x2="40" y2="72" stroke="#e879f9" strokeWidth="1.5" opacity="0.6">
      <animate attributeName="opacity" values="0.3;0.7;0.3" dur="0.15s" begin="0.075s" repeatCount="indefinite" />
    </line>
  </svg>
);

const ComboOrbGraphic = () => (
  <svg viewBox="0 0 80 80" className="w-14 h-14">
    <defs>
      <radialGradient id="comboCore" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#22d3ee" />
        <stop offset="55%" stopColor="#a855f7" />
        <stop offset="100%" stopColor="#3b0764" />
      </radialGradient>
      <linearGradient id="comboRing" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#67e8f9" />
        <stop offset="100%" stopColor="#f0abfc" />
      </linearGradient>
    </defs>

    <circle cx="40" cy="40" r="16" fill="url(#comboCore)" stroke="#c084fc" strokeWidth="1.4">
      <animate attributeName="r" values="15;16.8;15" dur="1.2s" repeatCount="indefinite" />
    </circle>
    <circle cx="40" cy="40" r="25" fill="none" stroke="url(#comboRing)" strokeWidth="2" strokeDasharray="4 6" opacity="0.92">
      <animateTransform attributeName="transform" type="rotate" from="0 40 40" to="360 40 40" dur="3s" repeatCount="indefinite" />
    </circle>
    <circle cx="40" cy="40" r="31" fill="none" stroke="#22d3ee" strokeWidth="1.3" strokeDasharray="2 5" opacity="0.62">
      <animateTransform attributeName="transform" type="rotate" from="360 40 40" to="0 40 40" dur="2.3s" repeatCount="indefinite" />
    </circle>
    <circle cx="24" cy="34" r="2.4" fill="#67e8f9" opacity="0.9" />
    <circle cx="58" cy="30" r="2" fill="#f0abfc" opacity="0.9" />
    <circle cx="52" cy="54" r="2.2" fill="#22d3ee" opacity="0.88" />
  </svg>
);

type Direction = 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top';

export const FloatingPickup = memo(function FloatingPickup({ pickup, onCollect, onCritCollect, onMiss }: FloatingPickupProps) {
  const wasHandledRef = useRef(false);

  const trajectory = useMemo(() => {
    const directions: Direction[] = ['left-to-right', 'right-to-left', 'top-to-bottom', 'bottom-to-top'];
    const direction = directions[Math.floor(Math.random() * directions.length)];
    
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
    
    // Define main view bounds (between left panel w-80=320px and right panel w-96=384px)
    const leftPanelWidth = 320;
    const rightPanelWidth = 384;
    const mainViewLeft = leftPanelWidth + 20;
    const mainViewRight = screenWidth - rightPanelWidth - 20;
    const mainViewWidth = mainViewRight - mainViewLeft;
    
    let startX: number, startY: number;
    let endX: number, endY: number;
    
    switch (direction) {
      case 'left-to-right':
        // Start from left edge of main view
        startX = mainViewLeft;
        startY = 100 + Math.random() * (screenHeight - 250);
        endX = screenWidth + 120;
        endY = startY;
        break;
      case 'right-to-left':
        // Start from right edge of main view
        startX = mainViewRight;
        startY = 100 + Math.random() * (screenHeight - 250);
        endX = -120;
        endY = startY;
        break;
      case 'top-to-bottom':
        // Start within main view horizontal bounds
        startX = mainViewLeft + Math.random() * mainViewWidth;
        startY = 50;
        endX = startX;
        endY = screenHeight + 140;
        break;
      case 'bottom-to-top':
        // Start within main view horizontal bounds
        startX = mainViewLeft + Math.random() * mainViewWidth;
        startY = screenHeight - 100;
        endX = startX;
        endY = -140;
        break;
    }

    const baseDurationSec =
      FLOATER_MIN_TRAVEL_DURATION_SEC +
      Math.random() * (FLOATER_MAX_TRAVEL_DURATION_SEC - FLOATER_MIN_TRAVEL_DURATION_SEC);
    const speedMultiplier = Math.max(1, pickup.speedMultiplier ?? 1);
    const durationSec = Math.max(
      FLOATER_MIN_VISIBLE_DURATION_SEC,
      baseDurationSec / speedMultiplier
    );

    return {
      startX,
      startY,
      endX,
      endY,
      durationSec,
      bobDurationSec: 1.35 + Math.random() * 0.45,
      direction,
    };
  }, [pickup.id, pickup.speedMultiplier]);

  const getGraphic = () => {
    switch (pickup.type) {
      case 'data':
        return <UFOGraphic />;
      case 'credits':
        return <RocketGraphic />;
      case 'crit':
        return <AlienGraphic />;
      case 'autoclick':
        return <GloveRocketGraphic />;
      case 'combo':
        return <ComboOrbGraphic />;
    }
  };

  const getLabel = () => {
    switch (pickup.type) {
      case 'data':
        return (
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-bold text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/40 whitespace-nowrap backdrop-blur-sm">
            +{pickup.value} DATA
          </span>
        );
      case 'credits':
        return (
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40 whitespace-nowrap backdrop-blur-sm">
            +{pickup.value} NODES
          </span>
        );
      case 'crit':
        return (
          <motion.span 
            className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-bold text-yellow-400 bg-yellow-500/30 px-2 py-0.5 rounded border border-yellow-500/50 whitespace-nowrap backdrop-blur-sm"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 0.4, repeat: Infinity }}
          >
            CRIT BOOST!
          </motion.span>
        );
      case 'autoclick':
        return (
          <motion.span 
            className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-bold text-fuchsia-400 bg-fuchsia-500/30 px-2 py-0.5 rounded border border-fuchsia-500/50 whitespace-nowrap backdrop-blur-sm"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            AUTO {pickup.value}s
          </motion.span>
        );
      case 'combo':
        return (
          <motion.span
            className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-bold text-violet-300 bg-violet-500/30 px-2 py-0.5 rounded border border-violet-400/50 whitespace-nowrap backdrop-blur-sm"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 0.45, repeat: Infinity }}
          >
            COMBO CHAIN
          </motion.span>
        );
    }
  };

  const getGlowColor = () => {
    switch (pickup.type) {
      case 'data':
        return 'drop-shadow-[0_0_15px_rgba(34,211,238,0.6)] hover:drop-shadow-[0_0_25px_rgba(34,211,238,0.9)]';
      case 'credits':
        return 'drop-shadow-[0_0_15px_rgba(251,191,36,0.6)] hover:drop-shadow-[0_0_25px_rgba(251,191,36,0.9)]';
      case 'crit':
        return 'drop-shadow-[0_0_20px_rgba(250,204,21,0.7)] hover:drop-shadow-[0_0_30px_rgba(250,204,21,1)]';
      case 'autoclick':
        return 'drop-shadow-[0_0_18px_rgba(232,121,249,0.7)] hover:drop-shadow-[0_0_28px_rgba(232,121,249,1)]';
      case 'combo':
        return 'drop-shadow-[0_0_18px_rgba(168,85,247,0.75)] hover:drop-shadow-[0_0_28px_rgba(168,85,247,1)]';
    }
  };

  const collectPickup = useCallback(() => {
    if (wasHandledRef.current) return;
    wasHandledRef.current = true;

    if (pickup.type === 'crit') {
      onCritCollect(pickup);
    } else {
      onCollect(pickup);
    }
  }, [onCollect, onCritCollect, pickup]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    // Prevent modal/dialog outside-click handlers from closing open windows
    // when the player is trying to claim a floating pickup above them.
    event.preventDefault();
    event.stopPropagation();
    collectPickup();
  }, [collectPickup]);

  const handleTravelComplete = useCallback(() => {
    if (wasHandledRef.current) return;
    wasHandledRef.current = true;
    onMiss(pickup.id);
  }, [onMiss, pickup.id]);

  useEffect(() => {
    const travelDurationMs = Math.ceil(trajectory.durationSec * 1000);
    const remainingLifetimeMs =
      typeof pickup.expiresAt === 'number'
        ? Math.max(0, pickup.expiresAt - Date.now())
        : typeof pickup.lifetimeMs === 'number'
          ? Math.max(0, pickup.lifetimeMs)
          : 0;
    const removalDelayMs = Math.max(travelDurationMs, remainingLifetimeMs);
    const timeout = window.setTimeout(() => {
      handleTravelComplete();
    }, removalDelayMs);

    return () => window.clearTimeout(timeout);
  }, [handleTravelComplete, pickup.expiresAt, pickup.lifetimeMs, trajectory.durationSec]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: pickup.comboChain ? 0.15 : 0.8, x: 0, y: 0 }}
      animate={{
        opacity: 1,
        scale: 1,
        x: trajectory.endX - trajectory.startX,
        y: trajectory.endY - trajectory.startY,
      }}
      transition={{
        opacity: { duration: 0.18 },
        scale: { duration: 0.18 },
        x: { duration: trajectory.durationSec, ease: 'linear' },
        y: { duration: trajectory.durationSec, ease: 'linear' },
      }}
      onPointerDown={handlePointerDown}
      whileHover={{ scale: 1.2 }}
      whileTap={{ scale: 0.9 }}
      className={`absolute pointer-events-auto cursor-pointer ${getGlowColor()}`}
      style={{
        left: trajectory.startX,
        top: trajectory.startY,
      }}
      data-floating-pickup="true"
      data-testid={`pickup-${pickup.type}-${pickup.id}`}
    >
      <div
        aria-hidden="true"
        className="absolute -inset-6 bg-transparent"
      />
      <motion.div
        className="relative"
        animate={pickup.comboChain ? {
          y: [0, -3, 0, 3, 0],
          opacity: [1, 1, 0.18],
        } : {
          y: [0, -3, 0, 3, 0],
        }}
        transition={pickup.comboChain ? {
          y: {
            duration: trajectory.bobDurationSec,
            repeat: Infinity,
            ease: 'easeInOut',
          },
          opacity: {
            duration: Math.max(0.35, (pickup.lifetimeMs || 0) / 1000),
            times: [0, 0.72, 1],
            ease: 'linear',
          },
        } : {
          duration: trajectory.bobDurationSec,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {getGraphic()}
        {getLabel()}
      </motion.div>
    </motion.div>
  );
});
