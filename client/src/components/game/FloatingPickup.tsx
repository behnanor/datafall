import { motion } from 'framer-motion';
import { useEffect, useState, useMemo } from 'react';

export interface FloatingPickupItem {
  id: string;
  x: number;
  y: number;
  type: 'data' | 'credits' | 'crit' | 'autoclick';
  value: number;
}

interface FloatingPickupProps {
  pickup: FloatingPickupItem;
  onRemove: (id: string) => void;
  onCritClick: () => void;
  playSound?: (type: 'click' | 'buy_fab' | 'buy_black' | 'crit' | 'pickup') => void;
}

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

type Direction = 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top';

export function FloatingPickup({ pickup, onRemove, onCritClick, playSound }: FloatingPickupProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(true);
  
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
    
    // Buffed drift speed for faster-moving floaters.
    const speed = 3.2 + Math.random() * 1.5;
    
    let startX: number, startY: number;
    let velocityX: number, velocityY: number;
    
    switch (direction) {
      case 'left-to-right':
        // Start from left edge of main view
        startX = mainViewLeft;
        startY = 100 + Math.random() * (screenHeight - 250);
        velocityX = speed;
        velocityY = 0;
        break;
      case 'right-to-left':
        // Start from right edge of main view
        startX = mainViewRight;
        startY = 100 + Math.random() * (screenHeight - 250);
        velocityX = -speed;
        velocityY = 0;
        break;
      case 'top-to-bottom':
        // Start within main view horizontal bounds
        startX = mainViewLeft + Math.random() * mainViewWidth;
        startY = 50;
        velocityX = 0;
        velocityY = speed;
        break;
      case 'bottom-to-top':
        // Start within main view horizontal bounds
        startX = mainViewLeft + Math.random() * mainViewWidth;
        startY = screenHeight - 100;
        velocityX = 0;
        velocityY = -speed;
        break;
    }
    
    return { startX, startY, velocityX, velocityY, direction };
  }, [pickup.id]);

  useEffect(() => {
    setPosition({ x: trajectory.startX, y: trajectory.startY });
  }, [trajectory.startX, trajectory.startY]);

  useEffect(() => {
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    
    const interval = setInterval(() => {
      setPosition(prev => {
        const newX = prev.x + trajectory.velocityX;
        const newY = prev.y + trajectory.velocityY;
        
        // Remove pickup when it exits the full screen bounds.
        // (Previously we removed at "main view" bounds, which made pickups disappear early.)
        const exitedLeft = newX < -120;
        const exitedRight = newX > screenWidth + 120;
        const exitedTop = newY < -140;
        const exitedBottom = newY > screenHeight + 140;
        
        if (exitedLeft || exitedRight || exitedTop || exitedBottom) {
          setIsVisible(false);
          onRemove(pickup.id);
          return prev;
        }
        
        return { x: newX, y: newY };
      });
    }, 16);
    
    return () => clearInterval(interval);
  }, [trajectory, pickup.id, onRemove]);

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
    }
  };

  const handleClick = () => {
    if (pickup.type === 'crit') {
      onCritClick();
      playSound?.('crit');
    } else {
      playSound?.('pickup');
    }
    setIsVisible(false);
    onRemove(pickup.id);
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
      whileHover={{ scale: 1.2 }}
      whileTap={{ scale: 0.9 }}
      className={`absolute pointer-events-auto cursor-pointer ${getGlowColor()}`}
      style={{ 
        left: position.x,
        top: position.y,
      }}
      data-testid={`pickup-${pickup.type}-${pickup.id}`}
    >
      <div
        aria-hidden="true"
        className="absolute -inset-6 bg-transparent"
      />
      <motion.div
        className="relative"
        animate={{
          y: [0, -3, 0, 3, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {getGraphic()}
        {getLabel()}
      </motion.div>
    </motion.div>
  );
}
