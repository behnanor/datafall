import { memo, useMemo, type ComponentType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Trophy,
  Lock,
  CheckCircle2,
  Star,
  Database,
  Coins,
  Zap,
  Crown,
  ArrowUpCircle,
  Sunrise,
  Gift,
  Target,
  Gauge,
  Rocket,
  Timer,
  MousePointerClick,
  Activity,
  Sparkles,
  Server,
  Landmark,
  Wallet,
  TrendingUp,
  Factory,
  Building,
  Flag,
  RefreshCw,
  Infinity as InfinityIcon,
  Gem,
  Award,
  Wand2,
} from 'lucide-react';
import { formatNumber } from '@/lib/useGame';
import type { Achievement, PlayerStats } from '@/lib/useGame';

interface AchievementsPanelProps {
  achievements: Achievement[];
  stats: PlayerStats;
  newlyUnlockedAchievement: Achievement | null;
  claimAchievementReward: (id: string) => void;
  claimAllAchievements?: () => void;
}

type AchievementCategory = Achievement['category'];

const CATEGORY_ORDER: AchievementCategory[] = ['clicking', 'resources', 'upgrades', 'prestige', 'special'];

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  'mouse-pointer': MousePointerClick,
  'mouse-pointer-click': MousePointerClick,
  'zap': Zap,
  'activity': Activity,
  'star': Star,
  'sparkles': Sparkles,
  'database': Database,
  'server': Server,
  'crown': Crown,
  'coins': Coins,
  'landmark': Landmark,
  'bitcoin': Coins,
  'wallet': Wallet,
  'arrow-up-circle': ArrowUpCircle,
  'trending-up': TrendingUp,
  'factory': Factory,
  'building': Building,
  'flag': Flag,
  'sunrise': Sunrise,
  'refresh-cw': RefreshCw,
  'infinity': InfinityIcon,
  'gem': Gem,
  'award': Award,
  'timer': Timer,
  'gift': Gift,
  'target': Target,
  'gauge': Gauge,
  'rocket': Rocket,
};

const categoryStyles: Record<
  AchievementCategory,
  {
    label: string;
    text: string;
    sectionBorder: string;
    sectionBg: string;
    badge: string;
    card: string;
    iconBg: string;
    progressFill: string;
  }
> = {
  clicking: {
    label: 'Clicking',
    text: 'text-cyan-300',
    sectionBorder: 'border-cyan-500/30',
    sectionBg: 'bg-cyan-500/[0.04]',
    badge: 'border-cyan-500/35 bg-cyan-500/15 text-cyan-200',
    card: 'border-cyan-500/35 bg-cyan-500/[0.11] hover:bg-cyan-500/[0.16]',
    iconBg: 'bg-cyan-500/20',
    progressFill: 'bg-gradient-to-r from-cyan-400 to-sky-500',
  },
  resources: {
    label: 'Resources',
    text: 'text-amber-300',
    sectionBorder: 'border-amber-500/30',
    sectionBg: 'bg-amber-500/[0.04]',
    badge: 'border-amber-500/35 bg-amber-500/15 text-amber-200',
    card: 'border-amber-500/35 bg-amber-500/[0.11] hover:bg-amber-500/[0.16]',
    iconBg: 'bg-amber-500/20',
    progressFill: 'bg-gradient-to-r from-amber-400 to-orange-500',
  },
  upgrades: {
    label: 'Upgrades',
    text: 'text-fuchsia-300',
    sectionBorder: 'border-fuchsia-500/30',
    sectionBg: 'bg-fuchsia-500/[0.04]',
    badge: 'border-fuchsia-500/35 bg-fuchsia-500/15 text-fuchsia-200',
    card: 'border-fuchsia-500/35 bg-fuchsia-500/[0.11] hover:bg-fuchsia-500/[0.16]',
    iconBg: 'bg-fuchsia-500/20',
    progressFill: 'bg-gradient-to-r from-fuchsia-400 to-pink-500',
  },
  prestige: {
    label: 'Prestige',
    text: 'text-violet-300',
    sectionBorder: 'border-violet-500/30',
    sectionBg: 'bg-violet-500/[0.04]',
    badge: 'border-violet-500/35 bg-violet-500/15 text-violet-200',
    card: 'border-violet-500/35 bg-violet-500/[0.11] hover:bg-violet-500/[0.16]',
    iconBg: 'bg-violet-500/20',
    progressFill: 'bg-gradient-to-r from-violet-400 to-purple-500',
  },
  special: {
    label: 'Special',
    text: 'text-emerald-300',
    sectionBorder: 'border-emerald-500/30',
    sectionBg: 'bg-emerald-500/[0.04]',
    badge: 'border-emerald-500/35 bg-emerald-500/15 text-emerald-200',
    card: 'border-emerald-500/35 bg-emerald-500/[0.11] hover:bg-emerald-500/[0.16]',
    iconBg: 'bg-emerald-500/20',
    progressFill: 'bg-gradient-to-r from-emerald-400 to-teal-500',
  },
};

const categoryIconMap: Record<AchievementCategory, ComponentType<{ className?: string }>> = {
  clicking: MousePointerClick,
  resources: Database,
  upgrades: TrendingUp,
  prestige: Crown,
  special: Sparkles,
};

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds === Infinity) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getProgressRatio = (achievement: Achievement): number => {
  if (!achievement.maxProgress || achievement.maxProgress <= 0) return 0;
  return Math.max(0, Math.min(1, (achievement.progress || 0) / achievement.maxProgress));
};

export const AchievementsPanel = memo(function AchievementsPanel({
  achievements,
  stats,
  newlyUnlockedAchievement,
  claimAchievementReward,
  claimAllAchievements,
}: AchievementsPanelProps) {
  const {
    unlockedCount,
    totalCount,
    completionPercent,
    claimableAchievements,
    totalClaimablePrestige,
    groupedAchievements,
    categoryProgress,
    nextToUnlock,
  } = useMemo(() => {
    const visibleAchievements = achievements.filter(a => !a.hidden || a.unlocked);
    const grouped: Record<AchievementCategory, Achievement[]> = {
      clicking: [],
      resources: [],
      upgrades: [],
      prestige: [],
      special: [],
    };
    const progressByCategory: Record<AchievementCategory, { unlocked: number; total: number }> = {
      clicking: { unlocked: 0, total: 0 },
      resources: { unlocked: 0, total: 0 },
      upgrades: { unlocked: 0, total: 0 },
      prestige: { unlocked: 0, total: 0 },
      special: { unlocked: 0, total: 0 },
    };
    const claimable: Achievement[] = [];

    let unlocked = 0;
    let nextLocked: Achievement | null = null;
    let nextLockedRatio = -1;

    for (const achievement of visibleAchievements) {
      progressByCategory[achievement.category].total += 1;
      if (achievement.unlocked) {
        unlocked += 1;
        progressByCategory[achievement.category].unlocked += 1;
      }

      const isClaimable = achievement.unlocked && !achievement.claimed && achievement.prestigeReward > 0;
      if (isClaimable) {
        claimable.push(achievement);
        continue;
      }

      grouped[achievement.category].push(achievement);

      if (!achievement.unlocked) {
        const ratio = getProgressRatio(achievement);
        const rawProgress = achievement.progress || 0;
        const currentRawProgress = nextLocked?.progress || 0;
        if (ratio > nextLockedRatio || (ratio === nextLockedRatio && rawProgress > currentRawProgress)) {
          nextLocked = achievement;
          nextLockedRatio = ratio;
        }
      }
    }

    for (const category of CATEGORY_ORDER) {
      grouped[category].sort((a, b) => {
        if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
        if (!a.unlocked && !b.unlocked) {
          const ratioDiff = getProgressRatio(b) - getProgressRatio(a);
          if (ratioDiff !== 0) return ratioDiff;
          return (b.progress || 0) - (a.progress || 0);
        }
        return (b.unlockedAt || 0) - (a.unlockedAt || 0);
      });
    }

    const total = visibleAchievements.length;
    const completion = total > 0 ? (unlocked / total) * 100 : 0;
    const claimablePrestige = claimable.reduce((sum, item) => sum + item.prestigeReward, 0);

    return {
      unlockedCount: unlocked,
      totalCount: total,
      completionPercent: completion,
      claimableAchievements: claimable,
      totalClaimablePrestige: claimablePrestige,
      groupedAchievements: grouped,
      categoryProgress: progressByCategory,
      nextToUnlock: nextLocked,
    };
  }, [achievements]);

  const statCards = [
    {
      label: 'Clicks',
      value: formatNumber(stats.totalClicks),
      tone: 'text-cyan-100',
      border: 'border-cyan-500/30 bg-cyan-500/10',
      Icon: MousePointerClick,
    },
    {
      label: 'Crits',
      value: formatNumber(stats.totalCrits),
      tone: 'text-fuchsia-100',
      border: 'border-fuchsia-500/30 bg-fuchsia-500/10',
      Icon: Zap,
    },
    {
      label: 'Ascensions',
      value: formatNumber(stats.totalAscensions),
      tone: 'text-violet-100',
      border: 'border-violet-500/30 bg-violet-500/10',
      Icon: Crown,
    },
    {
      label: 'Fastest Asc',
      value: formatTime(Math.floor(stats.fastestAscension)),
      tone: 'text-emerald-100',
      border: 'border-emerald-500/30 bg-emerald-500/10',
      Icon: Timer,
    },
  ] as const;

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="px-2 mb-3">
        <div
          className="rounded-xl border border-cyan-500/25 p-3 shadow-xl shadow-cyan-900/20"
          style={{
            background: 'radial-gradient(140% 120% at 50% 0%, rgba(34, 211, 238, 0.16) 0%, rgba(15, 23, 42, 0.94) 52%, rgba(2, 6, 23, 0.98) 100%)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-amber-500/15 border border-amber-400/35">
                <Trophy className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-200/90 font-semibold">Achievement Matrix</p>
                <p className="text-[10px] text-muted-foreground">Track milestones and claim prestige rewards</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-[0.15em] text-cyan-300/70">Completion</p>
              <p className="text-sm font-mono text-cyan-100">
                {unlockedCount}/{totalCount}
              </p>
            </div>
          </div>

          <div className="mb-3">
            <div className="flex items-center justify-between text-[10px] font-mono mb-1">
              <span className="text-cyan-200/80">{completionPercent.toFixed(1)}% unlocked</span>
              <span className="text-amber-300/90">+{totalClaimablePrestige}P pending</span>
            </div>
            <div className="h-2 rounded-full bg-slate-950/70 border border-cyan-500/20 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500"
                initial={{ width: 0 }}
                animate={{ width: `${completionPercent}%` }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {statCards.map(card => (
              <div key={card.label} className={`rounded-md border px-2 py-1.5 ${card.border}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase tracking-[0.13em] text-muted-foreground">{card.label}</span>
                  <card.Icon className="w-3 h-3 text-muted-foreground/80" />
                </div>
                <p className={`text-sm font-mono mt-0.5 ${card.tone}`}>{card.value}</p>
              </div>
            ))}
          </div>

          {nextToUnlock && (
            <div className="mt-3 rounded-md border border-indigo-500/25 bg-indigo-500/10 px-2 py-1.5">
              <p className="text-[9px] uppercase tracking-[0.15em] text-indigo-200/80">Next target</p>
              <p className="text-xs text-indigo-100 truncate">{nextToUnlock.name}</p>
              <p className="text-[10px] text-indigo-200/75 truncate">{nextToUnlock.description}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 px-2 pr-1 scrollbar-thin scrollbar-thumb-cyan-500/30">
        {claimableAchievements.length > 0 && (
          <section
            className="rounded-xl border border-amber-500/35 p-3 shadow-lg shadow-amber-900/20"
            style={{ background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.14) 0%, rgba(120, 53, 15, 0.16) 100%)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Gift className="w-3.5 h-3.5 text-amber-300" />
                <p className="text-[11px] uppercase tracking-[0.16em] text-amber-200 font-semibold">
                  Claimable ({claimableAchievements.length})
                </p>
              </div>
              {claimAllAchievements && claimableAchievements.length > 1 && (
                <Button
                  size="sm"
                  onClick={claimAllAchievements}
                  className="h-6 text-[10px] px-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white border-0 shadow-md shadow-amber-700/40"
                  data-testid="button-claim-all-achievements"
                >
                  <Wand2 className="w-3 h-3 mr-1" />
                  Claim All (+{totalClaimablePrestige}P)
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {claimableAchievements.map(achievement => {
                const IconComponent = iconMap[achievement.icon] || Trophy;
                return (
                  <button
                    key={achievement.id}
                    className="w-full text-left p-2.5 rounded-lg border border-amber-400/40 bg-amber-500/15 hover:bg-amber-500/25 active:scale-[0.99] transition-all"
                    onClick={() => claimAchievementReward(achievement.id)}
                    data-testid={`achievement-claimable-${achievement.id}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="p-1.5 rounded-md bg-amber-500/25 border border-amber-400/35">
                        <IconComponent className="w-4 h-4 text-amber-200" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-semibold text-amber-50 truncate">{achievement.name}</span>
                          <Gift className="w-3 h-3 text-amber-200 shrink-0" />
                        </div>
                        <p className="text-[10px] text-amber-100/80">{achievement.description}</p>
                        <span className="text-[10px] font-mono text-amber-200 font-bold">Claim +{achievement.prestigeReward}P</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {CATEGORY_ORDER.map(category => {
          const categoryAchievements = groupedAchievements[category];
          if (!categoryAchievements || categoryAchievements.length === 0) return null;

          const style = categoryStyles[category];
          const CategoryIcon = categoryIconMap[category];
          const progress = categoryProgress[category];

          return (
            <section key={category} className={`rounded-xl border ${style.sectionBorder} ${style.sectionBg} p-3`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md border ${style.sectionBorder} ${style.iconBg}`}>
                    <CategoryIcon className={`w-3.5 h-3.5 ${style.text}`} />
                  </div>
                  <p className={`text-[11px] uppercase tracking-[0.16em] font-semibold ${style.text}`}>{style.label}</p>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${style.badge}`}>
                  {progress.unlocked}/{progress.total}
                </span>
              </div>

              <div className="space-y-2">
                {categoryAchievements.map(achievement => {
                  const IconComponent = iconMap[achievement.icon] || Trophy;
                  const isUnlocked = achievement.unlocked;
                  const progressRatio = getProgressRatio(achievement);

                  return (
                    <div
                      key={achievement.id}
                      className={`p-2.5 rounded-lg border transition-all duration-200 ${
                        isUnlocked ? style.card : 'border-slate-700/50 bg-slate-900/45 hover:border-slate-600/70'
                      }`}
                      data-testid={`achievement-${achievement.id}`}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className={`p-1.5 rounded-md border ${
                            isUnlocked
                              ? `${style.sectionBorder} ${style.iconBg}`
                              : 'border-slate-700/60 bg-slate-800/40'
                          }`}
                        >
                          {isUnlocked ? (
                            <IconComponent className={`w-4 h-4 ${style.text}`} />
                          ) : (
                            <Lock className="w-4 h-4 text-muted-foreground/60" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className={`text-xs font-semibold truncate ${isUnlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {achievement.name}
                            </span>
                            {isUnlocked && achievement.claimed ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                            ) : null}
                          </div>

                          <p className={`text-[10px] ${isUnlocked ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>
                            {achievement.description}
                          </p>

                          {achievement.prestigeReward > 0 && (
                            <span
                              className={`inline-flex mt-1 text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                                achievement.claimed
                                  ? 'border-emerald-500/35 bg-emerald-500/15 text-emerald-300'
                                  : isUnlocked
                                  ? 'border-amber-500/35 bg-amber-500/15 text-amber-300'
                                  : 'border-amber-500/25 bg-amber-500/10 text-amber-300/50'
                              }`}
                            >
                              {achievement.claimed ? 'CLAIMED ' : '+'}
                              {achievement.prestigeReward}P
                            </span>
                          )}

                          {achievement.maxProgress && !isUnlocked && (
                            <div className="mt-2">
                              <div className="h-1.5 rounded-full bg-slate-950/80 border border-slate-700/50 overflow-hidden">
                                <div
                                  className={`h-full ${style.progressFill} transition-all duration-300`}
                                  style={{ width: `${progressRatio * 100}%` }}
                                />
                              </div>
                              <div className="text-[9px] text-muted-foreground mt-0.5">
                                {formatNumber(achievement.progress || 0)} / {formatNumber(achievement.maxProgress)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <AnimatePresence>
        {newlyUnlockedAchievement && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/30 to-amber-500/20 border border-amber-500/50 rounded-lg p-4 shadow-lg shadow-amber-500/20 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-full">
                  <Trophy className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <div className="text-xs text-amber-400 uppercase tracking-wider">Achievement Unlocked!</div>
                  <div className="text-sm font-semibold text-foreground">{newlyUnlockedAchievement.name}</div>
                  <div className="text-xs text-muted-foreground">{newlyUnlockedAchievement.description}</div>
                  {newlyUnlockedAchievement.prestigeReward > 0 && (
                    <div className="text-xs text-amber-400 font-mono mt-1">
                      Claim +{newlyUnlockedAchievement.prestigeReward}P in Achievements!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
