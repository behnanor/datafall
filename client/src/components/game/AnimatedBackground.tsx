import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface AnimatedBackgroundProps {
  upgradeLevel?: number;
}

export function AnimatedBackground({ upgradeLevel = 0 }: AnimatedBackgroundProps) {
  const particles = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 0.5 + 0.1,
      delay: Math.random() * 5,
    }));
  }, []);

  const intensityClass = upgradeLevel > 50 ? 'high' : upgradeLevel > 20 ? 'medium' : 'low';
  const glowIntensity = Math.min(upgradeLevel * 0.02, 1);

  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated Grid */}
      <div className="absolute inset-0 opacity-20">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-cyan-500/30" />
            </pattern>
            <linearGradient id="gridFade" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(6, 182, 212, 0.3)" />
              <stop offset="50%" stopColor="rgba(217, 70, 239, 0.2)" />
              <stop offset="100%" stopColor="rgba(6, 182, 212, 0.3)" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Floating Particles */}
      {particles.map(particle => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            width: particle.size,
            height: particle.size,
            background: particle.id % 3 === 0 
              ? 'rgba(6, 182, 212, 0.8)' 
              : particle.id % 3 === 1 
              ? 'rgba(217, 70, 239, 0.8)' 
              : 'rgba(251, 191, 36, 0.6)',
            boxShadow: `0 0 ${particle.size * 2}px ${particle.id % 3 === 0 ? 'rgba(6, 182, 212, 0.5)' : particle.id % 3 === 1 ? 'rgba(217, 70, 239, 0.5)' : 'rgba(251, 191, 36, 0.4)'}`,
          }}
          initial={{ y: '100vh', opacity: 0 }}
          animate={{ 
            y: '-10vh', 
            opacity: [0, 0.8, 0.8, 0],
          }}
          transition={{
            duration: 8 / particle.speed,
            delay: particle.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}

      {/* Scanning Lines */}
      <motion.div
        className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"
        initial={{ y: 0, opacity: 0 }}
        animate={{ y: '100vh', opacity: [0, 1, 1, 0] }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'linear',
          delay: 0,
        }}
      />
      <motion.div
        className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-fuchsia-400/30 to-transparent"
        initial={{ y: '100vh', opacity: 0 }}
        animate={{ y: 0, opacity: [0, 1, 1, 0] }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'linear',
          delay: 2,
        }}
      />

      {/* Corner Glow Effects */}
      <div 
        className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-3xl transition-all duration-1000"
        style={{
          background: `radial-gradient(circle, rgba(6, 182, 212, ${0.15 + glowIntensity * 0.15}) 0%, transparent 70%)`,
        }}
      />
      <div 
        className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full blur-3xl transition-all duration-1000"
        style={{
          background: `radial-gradient(circle, rgba(217, 70, 239, ${0.15 + glowIntensity * 0.15}) 0%, transparent 70%)`,
        }}
      />
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl transition-all duration-1000"
        style={{
          background: `radial-gradient(circle, rgba(251, 191, 36, ${0.05 + glowIntensity * 0.1}) 0%, transparent 70%)`,
        }}
      />

      {/* Hexagon Pattern Overlay */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hexagons" width="50" height="43.4" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
              <polygon 
                points="25,0 50,12.5 50,37.5 25,50 0,37.5 0,12.5" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="0.5" 
                className="text-cyan-400/20"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hexagons)" />
        </svg>
      </div>

      {/* Data Stream Lines */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={`stream-${i}`}
          className="absolute w-px h-20"
          style={{
            left: `${20 + i * 15}%`,
            background: 'linear-gradient(to bottom, transparent, rgba(6, 182, 212, 0.5), transparent)',
          }}
          initial={{ y: '-80px', opacity: 0 }}
          animate={{ y: '100vh', opacity: [0, 1, 1, 0] }}
          transition={{
            duration: 3 + i * 0.5,
            delay: i * 0.8,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}

      {/* Pulse Ring Effect (intensifies with upgrades) */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-500/20"
        initial={{ width: 100, height: 100, opacity: 0.5 }}
        animate={{ 
          width: [100, 400], 
          height: [100, 400], 
          opacity: [0.5, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeOut',
        }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-fuchsia-500/20"
        initial={{ width: 100, height: 100, opacity: 0.3 }}
        animate={{ 
          width: [100, 500], 
          height: [100, 500], 
          opacity: [0.3, 0],
        }}
        transition={{
          duration: 4,
          delay: 1.5,
          repeat: Infinity,
          ease: 'easeOut',
        }}
      />

      {/* Noise/Static Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
