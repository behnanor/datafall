import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

export type CelebrationKind = 'ascend' | 'shop' | 'legendary' | 'finale';

interface CelebrationProps {
  kind: CelebrationKind;
  title?: string;
  subtitle?: string;
  // Reduce Scene Glow: fewer particles, no glow shadows.
  reduced?: boolean;
  onDone: () => void;
}

// Lightweight burst animation for big moments. framer-motion runs on the capped
// requestAnimationFrame (fpsLimiter), so it respects the FPS limit.
const SETTINGS: Record<CelebrationKind, { particles: number; durationMs: number; colors: string[]; spread: number }> = {
  ascend: { particles: 28, durationMs: 1800, colors: ['#22d3ee', '#a855f7', '#f0abfc'], spread: 320 },
  shop: { particles: 32, durationMs: 2400, colors: ['#34d399', '#22d3ee', '#fde047'], spread: 360 },
  legendary: { particles: 44, durationMs: 2600, colors: ['#fbbf24', '#fde047', '#f97316'], spread: 420 },
  finale: { particles: 110, durationMs: 5200, colors: ['#f97316', '#fde047', '#f0abfc', '#22d3ee', '#ffffff'], spread: 720 },
};

export function Celebration({ kind, title, subtitle, reduced = false, onDone }: CelebrationProps) {
  const config = SETTINGS[kind];
  const count = reduced ? Math.ceil(config.particles / 3) : config.particles;

  useEffect(() => {
    const timeout = setTimeout(onDone, config.durationMs);
    return () => clearTimeout(timeout);
  }, [config.durationMs, onDone]);

  const particles = useMemo(() => Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const distance = config.spread * (0.45 + Math.random() * 0.55);
    return {
      id: i,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance * 0.75,
      size: 4 + Math.random() * (kind === 'finale' ? 10 : 6),
      color: config.colors[i % config.colors.length],
      delay: Math.random() * (kind === 'finale' ? 1.6 : 0.25),
    };
  }), [count, config, kind]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[190] flex items-center justify-center overflow-hidden" data-testid={`celebration-${kind}`}>
      {kind === 'finale' && (
        <motion.div
          className="absolute inset-0 bg-orange-200"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, reduced ? 0.25 : 0.6, 0] }}
          transition={{ duration: 1.2 }}
        />
      )}
      {particles.map(p => (
        <motion.span
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: reduced ? undefined : `0 0 ${p.size * 2}px ${p.color}`,
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 1 }}
          transition={{ duration: config.durationMs / 1000 - p.delay, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
      {title && (
        <motion.div
          className="relative text-center"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.6, 1.05, 1, 1] }}
          transition={{ duration: config.durationMs / 1000, times: [0, 0.15, 0.8, 1] }}
        >
          <p
            className={`font-display font-bold tracking-widest ${kind === 'finale' ? 'text-5xl text-orange-200' : 'text-3xl text-cyan-100'}`}
            style={{ textShadow: reduced ? undefined : '0 0 24px rgba(251,146,60,0.8)' }}
          >
            {title}
          </p>
          {subtitle && <p className="mt-2 text-sm text-slate-200">{subtitle}</p>}
        </motion.div>
      )}
    </div>
  );
}
