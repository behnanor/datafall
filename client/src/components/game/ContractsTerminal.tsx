import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Clock, Gift, Zap, Ghost, Key, Target, Radio } from 'lucide-react';
import { CurrencyIcon } from '@/components/game/CurrencyIcon';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Contract, ContractsState, CONTRACT_NPCS, formatNumber } from '@/lib/useGame';
import { localizeInlineText, useI18n } from '@/lib/i18n';
import { localizeTitledEntry } from '@/lib/gameLocale';

interface ContractsTerminalProps {
  contracts: ContractsState;
  onClaimReward: (contractId: string) => void;
  onRefresh: () => void;
}

const getNPCIcon = (avatar: string) => {
  switch (avatar) {
    case 'ghost': return <Ghost className="w-5 h-5" />;
    case 'key': return <Key className="w-5 h-5" />;
    case 'zap': return <Zap className="w-5 h-5" />;
    case 'target': return <Target className="w-5 h-5" />;
    case 'radio': return <Radio className="w-5 h-5" />;
    default: return <FileText className="w-5 h-5" />;
  }
};

const getDifficultyColor = (difficulty: Contract['difficulty']) => {
  switch (difficulty) {
    case 'easy': return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
    case 'medium': return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
    case 'hard': return 'text-red-400 bg-red-500/20 border-red-500/30';
  }
};

const getProgressColor = (difficulty: Contract['difficulty']) => {
  switch (difficulty) {
    case 'easy': return 'bg-emerald-500';
    case 'medium': return 'bg-amber-500';
    case 'hard': return 'bg-red-500';
  }
};

const getDifficultyLabel = (difficulty: Contract['difficulty'], language: ReturnType<typeof useI18n>['language']) => {
  switch (difficulty) {
    case 'easy':
      return localizeInlineText(language, 'EASY', 'KOLAY', 'FÁCIL', 'FÁCIL', 'ЛЕГКО');
    case 'medium':
      return localizeInlineText(language, 'MEDIUM', 'ORTA', 'MÉDIO', 'MEDIO', 'СРЕДНЕ');
    case 'hard':
      return localizeInlineText(language, 'HARD', 'ZOR', 'DIFÍCIL', 'DIFÍCIL', 'СЛОЖНО');
  }
};

export const ContractsTerminal = React.memo(function ContractsTerminal({ contracts, onClaimReward, onRefresh }: ContractsTerminalProps) {
  const { language } = useI18n();
  const l = (en: string, tr: string, pt: string, es?: string, ru?: string) => localizeInlineText(language, en, tr, pt, es, ru);
  const activeContracts = contracts.activeContracts.filter(c => c.status !== 'claimed');
  const completedCount = contracts.activeContracts.filter(c => c.status === 'completed').length;
  const inProgressCount = contracts.activeContracts.filter(c => c.status === 'active').length;
  
  const getTimeUntilRefresh = () => {
    // Contracts auto-refresh every 4 hours (no manual refresh charges).
    const refreshIntervalMs = 4 * 60 * 60 * 1000;
    const nextRefresh = contracts.lastRefreshTime + refreshIntervalMs;
    const remaining = nextRefresh - Date.now();
    if (remaining <= 0) return l('Ready', 'Hazır', 'Pronto', 'Listo');
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const mins = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    return language === 'tr'
      ? `${hours}s ${mins}d`
      : language === 'pt-BR'
        ? `${hours}h ${mins}min`
        : language === 'es'
          ? `${hours}h ${mins}min`
          : language === 'ru'
            ? `${hours}ч ${mins}м`
            : `${hours}h ${mins}m`;
  };

  const titleLabel = l('Contracts', 'Görevler', 'Contratos', 'Contratos');
  const readyLabel = l('ready', 'hazır', 'pronto', 'listo');
  const completedSummary = l(
    `Completed: ${contracts.totalContractsCompleted} total`,
    `Tamamlanan: ${contracts.totalContractsCompleted} toplam`,
    `Concluidos: ${contracts.totalContractsCompleted} no total`,
    `Completados: ${contracts.totalContractsCompleted} en total`,
  );
  const activeLabel = l('Active', 'Aktif', 'Ativos', 'Activos');
  const claimableLabel = l('Claimable', 'Alınabilir', 'Resgatavel', 'Reclamable');
  const refreshLabel = l('Refresh', 'Yenileme', 'Atualização', 'Actualizar');
  const rewardsLabel = l('Rewards:', 'Ödüller:', 'Recompensas:', 'Recompensas:');
  const claimLabel = l('Claim', 'Al', 'Resgatar', 'Reclamar');
  const fromLabel = l('From', 'Kimden', 'De', 'De');
  const emptyTitle = l('All contracts completed!', 'Tüm görevler tamamlandı!', 'Todos os contratos foram concluidos!', 'Todos los contratos completados!');
  const emptySubtitle = l('New contracts refresh every 4 hours', 'Yeni görevler her 4 saatte bir yenilenir', 'Novos contratos são atualizados a cada 4 horas', 'Los nuevos contratos se actualizan cada 4 horas');
  const footerText = l(
    'Contracts refresh automatically every 4 hours',
    'Görevler her 4 saatte bir otomatik yenilenir',
    'Os contratos são atualizados automaticamente a cada 4 horas',
    'Los contratos se actualizan automáticamente cada 4 horas',
  );

  return (
    <div className="h-full flex flex-col" data-testid="contracts-terminal">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-cyan-400" />
          <h3 className="font-display text-lg text-cyan-400">{titleLabel}</h3>
          {completedCount > 0 && (
            <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full border border-emerald-500/30">
              {completedCount} {readyLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{getTimeUntilRefresh()}</span>
        </div>
      </div>

      <div className="text-xs text-muted-foreground mb-2 px-1">
        {completedSummary}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 px-1">
        <div className="rounded border border-cyan-500/20 bg-cyan-500/5 px-2 py-1.5">
          <p className="text-[9px] uppercase tracking-widest text-cyan-300/70">{activeLabel}</p>
          <p className="text-sm font-mono font-semibold text-cyan-200">{inProgressCount}</p>
        </div>
        <div className="rounded border border-emerald-500/20 bg-emerald-500/5 px-2 py-1.5">
          <p className="text-[9px] uppercase tracking-widest text-emerald-300/70">{claimableLabel}</p>
          <p className="text-sm font-mono font-semibold text-emerald-200">{completedCount}</p>
        </div>
        <div className="rounded border border-amber-500/20 bg-amber-500/5 px-2 py-1.5">
          <p className="text-[9px] uppercase tracking-widest text-amber-300/70">{refreshLabel}</p>
          <p className="text-sm font-mono font-semibold text-amber-200">{getTimeUntilRefresh()}</p>
        </div>
      </div>

      <ScrollArea className="flex-1 -mx-2 px-2">
        <div className="space-y-2 pb-2">
          <AnimatePresence mode="popLayout">
            {activeContracts.map((contract, index) => {
              const rawNpc = CONTRACT_NPCS.find(n => n.id === contract.npcId);
              const npc = rawNpc ? localizeTitledEntry(rawNpc, language) : undefined;
              const progress = Math.min(100, (contract.currentProgress / contract.targetAmount) * 100);
              const isCompleted = contract.status === 'completed';

              return (
                <motion.div
                  key={contract.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-3 rounded-lg border ${
                    isCompleted 
                      ? 'bg-emerald-500/10 border-emerald-500/30' 
                      : 'bg-card/50 border-border/50'
                  }`}
                  data-testid={`contract-${contract.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${npc?.color}20`, borderColor: `${npc?.color}40`, borderWidth: 1 }}
                    >
                      <div style={{ color: npc?.color }}>
                        {getNPCIcon(npc?.avatar || '')}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{contract.title}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getDifficultyColor(contract.difficulty)}`}>
                          {getDifficultyLabel(contract.difficulty, language)}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground mb-2">
                        {contract.description}
                      </p>

                      <div className="mb-2">
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="text-muted-foreground">
                            {formatNumber(contract.currentProgress)} / {formatNumber(contract.targetAmount)}
                          </span>
                          <span className={isCompleted ? 'text-emerald-400' : 'text-muted-foreground'}>
                            {Math.floor(progress)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full ${getProgressColor(contract.difficulty)}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[10px]">
                          <span className="text-muted-foreground">{rewardsLabel}</span>
                          {contract.rewards.credits && (
                            <span className="flex items-center gap-0.5 whitespace-nowrap rounded-full border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-amber-400">
                              <CurrencyIcon kind="credits" className="w-3 h-3" />
                              {formatNumber(contract.rewards.credits)}
                            </span>
                          )}
                          {contract.rewards.data && (
                            <span className="flex items-center gap-0.5 whitespace-nowrap rounded-full border border-cyan-500/20 bg-cyan-500/10 px-1.5 py-0.5 text-cyan-400">
                              <CurrencyIcon kind="data" className="w-3 h-3" />
                              {formatNumber(contract.rewards.data)}
                            </span>
                          )}
                          {contract.rewards.crypto && (
                            <span className="flex items-center gap-0.5 whitespace-nowrap rounded-full border border-orange-500/20 bg-orange-500/10 px-1.5 py-0.5 text-orange-400">
                              <CurrencyIcon kind="crypto" className="w-3 h-3" />
                              {formatNumber(contract.rewards.crypto)}
                            </span>
                          )}
                          {contract.rewards.prestige && (
                            <span className="flex items-center gap-0.5 whitespace-nowrap rounded-full border border-yellow-500/20 bg-yellow-500/10 px-1.5 py-0.5 text-yellow-400">
                              <CurrencyIcon kind="ascension" className="w-3 h-3" />
                              {formatNumber(contract.rewards.prestige)}
                            </span>
                          )}
                        </div>

                        {isCompleted && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 shrink-0 self-start px-2 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 sm:self-center"
                            onClick={() => onClaimReward(contract.id)}
                            data-testid={`claim-contract-${contract.id}`}
                          >
                            <Gift className="w-3 h-3 mr-1" />
                            {claimLabel}
                          </Button>
                        )}
                      </div>

                      <div className="mt-1.5 text-[10px] text-muted-foreground/60">
                        {fromLabel}: {npc?.name} • {npc?.title}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {activeContracts.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{emptyTitle}</p>
              <p className="text-xs">{emptySubtitle}</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Manual refresh removed. Keep a simple, accurate info line. */}
      <p className="text-[10px] text-center text-muted-foreground mt-2">
        {footerText}
      </p>
    </div>
  );
});
