import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatNumber } from '@/lib/useGame';
import { useLiveResource } from '@/lib/liveResources';
import { onJuiceBanner, shakeElement, type JuiceBannerEvent } from '@/lib/juice';
import type { Language } from '@/lib/i18n';

// Game feel: short centre-screen banners for moments that used to pass silently.
// - CHECKPOINT!: a machine/upgrade hits level 25/50/75/100 (its multiplier jumps).
// - PRODUCTION MILESTONE: DATA/s reaches a new power of ten in this run (10/s, 100/s, 1K/s ...).
// One banner at a time, about 2.4 s, no glow under Reduce Scene Glow.

const TEXT: Record<Language, { checkpoint: string; level: string; boost: string; milestone: string; reached: string }> = {
  en: { checkpoint: 'CHECKPOINT!', level: 'Lv', boost: 'boost', milestone: 'PRODUCTION MILESTONE', reached: 'reached' },
  tr: { checkpoint: 'EŞİK AŞILDI!', level: 'Sv', boost: 'güç', milestone: 'ÜRETİM REKORU', reached: 'ulaşıldı' },
  'pt-BR': { checkpoint: 'MARCO ATINGIDO!', level: 'Nv', boost: 'bônus', milestone: 'MARCO DE PRODUÇÃO', reached: 'alcançado' },
  es: { checkpoint: '¡CHECKPOINT!', level: 'Nv', boost: 'bono', milestone: 'HITO DE PRODUCCIÓN', reached: 'alcanzado' },
  ru: { checkpoint: 'КОНТРОЛЬНАЯ ТОЧКА!', level: 'Ур', boost: 'бонус', milestone: 'РЕКОРД ПРОИЗВОДСТВА', reached: 'достигнуто' },
  'zh-CN': { checkpoint: '检查点达成！', level: '等级', boost: '加成', milestone: '产量里程碑', reached: '达成' },
};

const MILESTONE_MIN_LEVEL = 1; // 10/s
const MILESTONE_MIN_GAP_MS = 6000;
const WARMUP_MS = 4000; // ignore the jump from 0 to the loaded save's value

interface Props {
  language: Language;
  reduced?: boolean;
  playSound?: (type: 'celebrate') => void;
}

export function JuiceBanners({ language, reduced = false, playSound }: Props) {
  const [banner, setBanner] = useState<(JuiceBannerEvent & { key: number }) | null>(null);
  const text = TEXT[language] ?? TEXT.en;
  const dataPerSecond = useLiveResource('dataPerSecond');
  const mountedAtRef = useRef(Date.now());
  const maxLevelRef = useRef<number>(-1);
  const lastMilestoneAtRef = useRef(0);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => onJuiceBanner((event) => setBanner({ ...event, key: Date.now() + Math.random() })), []);

  useEffect(() => {
    if (!Number.isFinite(dataPerSecond) || dataPerSecond <= 0) return;
    const level = Math.floor(Math.log10(dataPerSecond));
    const now = Date.now();
    if (now - mountedAtRef.current < WARMUP_MS || maxLevelRef.current < 0) {
      maxLevelRef.current = Math.max(maxLevelRef.current, level);
      return;
    }
    // A new run (prestige/ascension) drops production a lot: start counting again from there.
    if (level < maxLevelRef.current - 2) {
      maxLevelRef.current = level;
      return;
    }
    if (level <= maxLevelRef.current) return;
    maxLevelRef.current = level;
    if (level < MILESTONE_MIN_LEVEL || now - lastMilestoneAtRef.current < MILESTONE_MIN_GAP_MS) return;
    lastMilestoneAtRef.current = now;
    setBanner({ kind: 'milestone', perSecond: Math.pow(10, level), key: now });
    playSound?.('celebrate');
  }, [dataPerSecond, playSound]);

  useEffect(() => {
    if (!banner) return;
    shakeElement(bannerRef.current, 0.6);
    const timeout = window.setTimeout(() => setBanner(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [banner]);

  const isCheckpoint = banner?.kind === 'checkpoint';
  const title = !banner ? '' : isCheckpoint ? text.checkpoint : text.milestone;
  const subtitle = !banner
    ? ''
    : banner.kind === 'checkpoint'
      ? `${banner.upgradeName} · ${text.level} ${banner.level} · x${formatNumber(banner.multiplier)} ${text.boost}`
      : `${formatNumber(banner.perSecond)} DATA/s ${text.reached}`;
  const color = isCheckpoint ? '#34d399' : '#facc15';

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[18%] z-[150] flex justify-center" ref={bannerRef}>
      <AnimatePresence>
        {banner && (
          <motion.div
            key={banner.key}
            data-testid={`juice-banner-${banner.kind}`}
            initial={{ opacity: 0, y: -24, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: [0.85, 1.08, 1] }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="relative overflow-hidden rounded-lg border bg-black/70 px-6 py-2 text-center backdrop-blur-sm"
            style={{ borderColor: color, boxShadow: reduced ? 'none' : `0 0 24px ${color}55` }}
          >
            {!reduced && (
              <motion.div
                className="absolute inset-y-0 w-1/3"
                style={{ background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }}
                initial={{ x: '-120%' }}
                animate={{ x: '320%' }}
                transition={{ duration: 0.9, delay: 0.2, ease: 'easeInOut' }}
              />
            )}
            <div
              className="relative font-mono text-xl font-bold uppercase tracking-[0.25em]"
              style={{ color, textShadow: reduced ? 'none' : `0 0 10px ${color}` }}
            >
              {title}
            </div>
            <div className="relative mt-0.5 font-mono text-xs uppercase tracking-wider text-white/80">{subtitle}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
