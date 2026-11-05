import { pick6 } from '@/lib/bossVariants';
import React, { Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, Cpu, Crown, Sparkles, Trophy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AchievementsPanel } from '@/components/game/AchievementsPanel';
import { CSSCharacter } from '@/components/game/CyberpunkRoom';
import { CosmeticsPanel } from '@/components/game/CosmeticsPanel';
import { getCurrencyLabel, getLootTypeLabel, getRarityLabel } from '@/lib/gameLocale';

type LocalizeFn = (...args: any[]) => string;

export function AchievementsDialog({
  open,
  onOpenChange,
  l,
  achievements,
  stats,
  claimAchievementReward,
  claimAllAchievements,
}: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] bg-card/95 border-amber-500/30 z-[50]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-display text-amber-400">
            <Trophy className="w-5 h-5" /> {l('Achievements', 'Basarimlar', 'Conquistas', 'Logros')}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden -mx-6 -mb-6 px-6 pb-6">
          <AchievementsPanel
            achievements={achievements}
            stats={stats}
            newlyUnlockedAchievement={null}
            claimAchievementReward={claimAchievementReward}
            claimAllAchievements={claimAllAchievements}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function StatsDialog({
  open,
  onOpenChange,
  l,
  stats,
  formatNumber,
}: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card/95 border-fuchsia-500/30 z-[50]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-display text-fuchsia-400">
            <BarChart3 className="w-5 h-5" /> {l('Player Stats', 'Oyuncu Istatistikleri', 'Estatisticas do Jogador', 'Estadisticas del Jugador')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded p-3"><div className="text-[10px] text-muted-foreground uppercase">{l('Total Clicks', 'Toplam Tiklama', 'Cliques Totais', 'Clics Totales')}</div><div className="text-lg font-mono text-cyan-400">{formatNumber(stats.totalClicks)}</div></div>
            <div className="bg-fuchsia-500/10 border border-fuchsia-500/30 rounded p-3"><div className="text-[10px] text-muted-foreground uppercase">{l('Critical Hits', 'Kritik Vuruslar', 'Acertos Criticos', 'Golpes Criticos')}</div><div className="text-lg font-mono text-fuchsia-400">{formatNumber(stats.totalCrits)}</div></div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3"><div className="text-[10px] text-muted-foreground uppercase">{l('Data', 'Veri', 'Dados', 'Datos')}</div><div className="text-lg font-mono text-amber-400">{formatNumber(Math.floor(stats.totalDataCollected))}</div></div>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3"><div className="text-[10px] text-muted-foreground uppercase">{l('Nodes', 'Dizin', 'Nodes', 'Nodos')}</div><div className="text-lg font-mono text-yellow-400">{formatNumber(Math.floor(stats.totalCreditsEarned))}</div></div>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded p-3"><div className="text-[10px] text-muted-foreground uppercase">{l('Ascensions', 'Yukselisler', 'Ascensoes', 'Ascensiones')}</div><div className="text-lg font-mono text-purple-400">{stats.totalAscensions}</div></div>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-3"><div className="text-[10px] text-muted-foreground uppercase">{l('Upgrades Bought', 'Alinan Yukseltmeler', 'Upgrades Comprados', 'Mejoras Compradas')}</div><div className="text-lg font-mono text-emerald-400">{stats.totalUpgradesPurchased}</div></div>
            <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3"><div className="text-[10px] text-muted-foreground uppercase">{l('Pickups Collected', 'Toplanan Oduller', 'Coletas Recolhidas', 'Pickups Recogidos')}</div><div className="text-lg font-mono text-orange-400">{stats.pickupsCollected}</div></div>
            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded p-3"><div className="text-[10px] text-muted-foreground uppercase">{l('Prestige Spent', 'Harcanan Prestij', 'Prestigio Gasto', 'Prestigio Gastado')}</div><div className="text-lg font-mono text-indigo-400">{formatNumber(Math.floor(stats.totalPrestigeSpent))}</div></div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AscensionPetUnlockDialog({
  open,
  onOpenChange,
  l,
  pet,
  boostLines,
  onClaim,
  onEquip,
}: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card/95 border-purple-500/40 z-[120]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-display text-purple-300">
            <Sparkles className="w-5 h-5" /> {l('Ascension Pet Unlocked', 'Yukselis Evcili Acildi', 'Pet de Ascensao Desbloqueado', 'Mascota de Ascension Desbloqueada')}
          </DialogTitle>
        </DialogHeader>
        {pet && (
          <div className="space-y-4">
            <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
                  <Cpu className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <p className="font-bold text-purple-100">{pet.name}</p>
                  <p className="text-xs text-muted-foreground">{pet.description}</p>
                  <p className="text-[11px] text-purple-200/80 mt-1">
                    {l('Unlock Requirement', 'Acilis Kosulu', 'Requisito de Desbloqueio', 'Requisito de Desbloqueo')}: {pet.ascensionRequirement ?? 0} {l('ascensions', 'yukselis', 'ascensoes', 'ascensiones')}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 space-y-1.5">
              <p className="text-[10px] uppercase tracking-widest text-cyan-300/80">{l('Boosts', 'Bonuslar', 'Boosts', 'Bonificaciones')}</p>
              {boostLines.map((line: string) => <p key={line} className="text-xs text-cyan-100">{line}</p>)}
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={onClaim} className="border-border/70" data-testid="button-claim-ascension-pet">{l('Claim', 'Al', 'Resgatar', 'Reclamar')}</Button>
              <Button onClick={onEquip} className="bg-purple-600/80 hover:bg-purple-600 text-white" data-testid="button-equip-ascension-pet">{l('Equip', 'Tak', 'Equipar', 'Equipar')}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function TutorialRewardDialog({
  open,
  onOpenChange,
  l,
  language,
  reward,
  preview,
  rewardTypeLabel,
  localizedInfo,
  formatNumber,
  onOpenCosmetics,
  onContinue,
}: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card/95 border-cyan-500/40 z-[120]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-display text-cyan-300">
            <Sparkles className="w-5 h-5" /> {l('Tutorial Complete', 'Egitim Tamamlandi', 'Tutorial Completo', 'Tutorial Completado')}
          </DialogTitle>
        </DialogHeader>
        {reward && (
          <div className="space-y-4">
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3">
              <p className="text-sm text-cyan-100">{l('Congratulations on completing the tutorial. Here is your reward.', 'Egitimi tamamladigin icin tebrikler. Odulun burada.', 'Parabens por concluir o tutorial. Aqui esta sua recompensa.', 'Felicidades por completar el tutorial. Aqui tienes tu recompensa.')}</p>
            </div>
            <div className="rounded-lg border border-cyan-500/30 bg-slate-900/70 p-3">
              {preview && (
                <div className="mb-3 rounded-lg border border-cyan-500/25 bg-slate-950/80 p-2">
                  <p className="text-[10px] uppercase tracking-widest text-cyan-300/80 mb-2">{l('Preview', 'Onizleme', 'Previa', 'Vista Previa')}</p>
                  <div>{preview}</div>
                </div>
              )}
              <p className="text-xs text-cyan-300/80 uppercase tracking-wider">{rewardTypeLabel}</p>
              <p className="text-lg font-bold text-cyan-100">{localizedInfo?.name ?? reward.itemName}</p>
              <p className="text-xs text-muted-foreground mt-1">{localizedInfo?.description ?? reward.itemDescription}</p>
              <p className="text-xs text-emerald-300 mt-2">{l('Shop Value', 'Magaza Degeri', 'Valor de Loja', 'Valor de Tienda')}: {formatNumber(reward.price)} {getCurrencyLabel(reward.currency, language)}</p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button onClick={onOpenCosmetics} className="bg-cyan-600/85 hover:bg-cyan-600 text-white">{l('Open Cosmetics', 'Kozmetiklere Git', 'Abrir Cosmeticos', 'Abrir Cosmeticos')}</Button>
              <Button variant="outline" onClick={onContinue} className="border-cyan-500/40 text-cyan-200">{l('Continue', 'Devam Et', 'Continuar', 'Continuar')}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function LeaderboardsDialog({
  open,
  onOpenChange,
  l,
  leaderboardTab,
  leaderboardPeriod,
  onLeaderboardTabChange,
  onLeaderboardPeriodChange,
  onRefresh,
  currentUtcCycleKey,
  currentDailyAscensionScore,
  leaderboardEntries,
  leaderboardLoading,
  leaderboardError,
  friendsLeaderboardEntries,
  friendsLeaderboardLoading,
  friendsLeaderboardError,
  dailyLeaderboardEntries,
  endlessLeaderboardEntries = [],
  endlessLeaderboardLoading = false,
  endlessLeaderboardError = null,
  endlessUnlocked = false,
  dailyLeaderboardLoading,
  dailyLeaderboardError,
  dailyFriendsLeaderboardEntries,
  dailyFriendsLeaderboardLoading,
  dailyFriendsLeaderboardError,
  limit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  l: LocalizeFn;
  leaderboardTab: 'global' | 'friends';
  leaderboardPeriod: 'today' | 'all_time' | 'endless';
  onLeaderboardTabChange: (tab: 'global' | 'friends') => void;
  onLeaderboardPeriodChange: (period: 'today' | 'all_time' | 'endless') => void;
  onRefresh: () => void;
  currentUtcCycleKey: string;
  currentDailyAscensionScore: number;
  leaderboardEntries: any[];
  leaderboardLoading: boolean;
  leaderboardError: string | null;
  friendsLeaderboardEntries: any[];
  friendsLeaderboardLoading: boolean;
  friendsLeaderboardError: string | null;
  dailyLeaderboardEntries: any[];
  endlessLeaderboardEntries?: any[];
  endlessLeaderboardLoading?: boolean;
  endlessLeaderboardError?: string | null;
  endlessUnlocked?: boolean;
  dailyLeaderboardLoading: boolean;
  dailyLeaderboardError: string | null;
  dailyFriendsLeaderboardEntries: any[];
  dailyFriendsLeaderboardLoading: boolean;
  dailyFriendsLeaderboardError: string | null;
  limit: number;
}) {
  const activeEntries = leaderboardTab === 'global'
    ? (leaderboardPeriod === 'endless' ? endlessLeaderboardEntries : leaderboardPeriod === 'today' ? dailyLeaderboardEntries : leaderboardEntries)
    : (leaderboardPeriod === 'endless' ? endlessLeaderboardEntries : leaderboardPeriod === 'today' ? dailyFriendsLeaderboardEntries : friendsLeaderboardEntries);
  const activeLoading = leaderboardTab === 'global'
    ? (leaderboardPeriod === 'endless' ? endlessLeaderboardLoading : leaderboardPeriod === 'today' ? dailyLeaderboardLoading : leaderboardLoading)
    : (leaderboardPeriod === 'endless' ? endlessLeaderboardLoading : leaderboardPeriod === 'today' ? dailyFriendsLeaderboardLoading : friendsLeaderboardLoading);
  const activeError = leaderboardTab === 'global'
    ? (leaderboardPeriod === 'endless' ? endlessLeaderboardError : leaderboardPeriod === 'today' ? dailyLeaderboardError : leaderboardError)
    : (leaderboardPeriod === 'endless' ? endlessLeaderboardError : leaderboardPeriod === 'today' ? dailyFriendsLeaderboardError : friendsLeaderboardError);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] bg-card/95 border-amber-500/30 z-[55] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-display text-amber-300">
            <Crown className="w-5 h-5" /> {l('Leaderboards', 'Liderlik Tablolari', 'Placar de Lideres', 'Clasificaciones')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => onLeaderboardTabChange('global')} className={`h-8 px-3 text-xs ${leaderboardTab === 'global' ? 'bg-amber-500/20 border-amber-500/50 text-amber-200' : 'bg-slate-900/70 border-slate-700 text-slate-300'}`} data-testid="button-leaderboard-tab-global">
            {l('Global', 'Genel', 'Global', 'Global')}
          </Button>
          <Button type="button" variant="outline" onClick={() => onLeaderboardPeriodChange('today')} className={`h-8 px-3 text-xs ${leaderboardPeriod === 'today' ? 'bg-violet-500/20 border-violet-500/50 text-violet-200' : 'bg-slate-900/70 border-slate-700 text-slate-300'}`} data-testid="button-leaderboard-period-today">
            {l('Today', 'Bugun', 'Hoje', 'Hoy')}
          </Button>
          <Button type="button" variant="outline" onClick={() => onLeaderboardPeriodChange('all_time')} className={`h-8 px-3 text-xs ${leaderboardPeriod === 'all_time' ? 'bg-amber-500/20 border-amber-500/50 text-amber-200' : 'bg-slate-900/70 border-slate-700 text-slate-300'}`} data-testid="button-leaderboard-period-all-time">
            {l('All time', 'Tum Zamanlar', 'Todo o periodo', 'Todo el tiempo')}
          </Button>
          {endlessUnlocked && (
            <Button type="button" variant="outline" onClick={() => onLeaderboardPeriodChange('endless')} className={`h-8 px-3 text-xs ${leaderboardPeriod === 'endless' ? 'bg-orange-500/20 border-orange-500/50 text-orange-200' : 'bg-slate-900/70 border-slate-700 text-slate-300'}`} data-testid="button-leaderboard-period-endless">
              {l('Endless', 'Sonsuz', 'Infinito', 'Infinito', 'Бесконечный')}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => onLeaderboardTabChange('friends')} className={`h-8 px-3 text-xs ${leaderboardTab === 'friends' ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200' : 'bg-slate-900/70 border-slate-700 text-slate-300'}`} data-testid="button-leaderboard-tab-friends">
            {l('Friends', 'Arkadaslar', 'Amigos', 'Amigos')}
          </Button>
          <div className="ml-auto">
            <Button type="button" onClick={onRefresh} className="h-8 px-3 text-xs bg-amber-600 hover:bg-amber-500" data-testid="button-leaderboard-refresh-modal">
              {l('Refresh', 'Yenile', 'Atualizar', 'Actualizar')}
            </Button>
          </div>
        </div>

        <div className="text-[11px] text-slate-400">
          {leaderboardTab === 'global'
            ? l(
                `${leaderboardPeriod === 'today' ? 'Global today' : 'Global all-time'} rankings (top ${limit})`,
                `${leaderboardPeriod === 'today' ? 'Bugunku genel' : 'Genel tum zamanlar'} siralama (ilk ${limit})`,
                `${leaderboardPeriod === 'today' ? 'Global de hoje' : 'Global de todo o periodo'} (top ${limit})`,
              )
            : l(
                `${leaderboardPeriod === 'today' ? 'Friends today' : 'Friends all-time'} rankings (top ${limit})`,
                `${leaderboardPeriod === 'today' ? 'Bugunku arkadas' : 'Arkadas tum zamanlar'} siralama (ilk ${limit})`,
                `${leaderboardPeriod === 'today' ? 'Amigos de hoje' : 'Amigos de todo o periodo'} (top ${limit})`,
              )}
        </div>
        <div className="text-[10px] uppercase tracking-wide text-slate-500">
          {leaderboardPeriod === 'today'
            ? l(
                `UTC daily cycle: ${currentUtcCycleKey} | your daily score: ${currentDailyAscensionScore}`,
                `UTC gunluk dongu: ${currentUtcCycleKey} | senin gunluk skorun: ${currentDailyAscensionScore}`,
                `Ciclo diario UTC: ${currentUtcCycleKey} | sua pontuacao diaria: ${currentDailyAscensionScore}`,
                `Ciclo diario UTC: ${currentUtcCycleKey} | tu puntuacion diaria: ${currentDailyAscensionScore}`,
              )
            : l(
                `UTC daily board key: ${currentUtcCycleKey}`,
                `UTC gunluk tahta anahtari: ${currentUtcCycleKey}`,
                `Chave UTC diaria do placar: ${currentUtcCycleKey}`,
                `Clave UTC diaria del tablero: ${currentUtcCycleKey}`,
              )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto space-y-2 pr-1">
          {activeLoading ? (
            <div className="rounded border border-slate-700/50 bg-slate-900/70 p-3 text-sm text-slate-300">
              {l('Loading leaderboard...', 'Liderlik tablosu yukleniyor...', 'Carregando placar...', 'Cargando clasificacion...')}
            </div>
          ) : activeError ? (
            <div className="rounded border border-red-500/35 bg-red-500/10 p-3 text-sm text-red-300">{activeError}</div>
          ) : activeEntries.length === 0 ? (
            <div className="rounded border border-slate-700/50 bg-slate-900/70 p-3 text-sm text-slate-400">
              {l('No entries yet.', 'Henuz kayit yok.', 'Ainda nao ha registros.', 'Aun no hay registros.')}
            </div>
          ) : (
            activeEntries.map((entry) => (
              <div key={`${leaderboardTab}-${leaderboardPeriod}-${entry.rank}-${entry.steamId}`} className="flex items-center justify-between rounded border border-amber-500/20 bg-slate-950/70 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-mono text-amber-200">#{entry.rank}</p>
                  <p className="truncate text-xs text-slate-300">{entry.personaName}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">{l('Ascension', 'Yukselis', 'Ascensao', 'Ascension')}</p>
                  <p className="text-sm font-mono text-cyan-300">{entry.score}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CosmeticsMarketDialog({
  open,
  onOpenChange,
  l,
  loadingLabel,
  panelProps,
  equippedTheme,
  equippedSkin,
  equippedAccessory,
  equippedHeadStyle,
  equippedClickEffect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  l: LocalizeFn;
  loadingLabel: string;
  panelProps: any;
  equippedTheme: any;
  equippedSkin: any;
  equippedAccessory: any;
  equippedHeadStyle: any;
  equippedClickEffect: any;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-6xl h-[84vh] grid-rows-[auto_minmax(0,1fr)] content-start bg-card/95 border-purple-500/30 z-[50]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-display text-purple-400">
            <Sparkles className="w-5 h-5" /> {l('Cosmetics Market', 'Kozmetik Pazari', 'Mercado de Cosmeticos', 'Mercado de Cosmeticos')}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-hidden -mx-6 -mb-6 px-6 pb-6">
          <div className="h-full min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-4">
            <div className="min-h-0 overflow-hidden">
              <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground">{loadingLabel}</div>}>
                <CosmeticsPanel {...panelProps} />
              </Suspense>
            </div>

            <div className="hidden lg:flex min-h-0 flex-col rounded-xl border border-cyan-500/30 bg-slate-950/60 p-3 shadow-[0_0_24px_rgba(6,182,212,0.12)]">
              <div className="mb-3">
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-300/80">{l('Live Character Preview', 'Canli Karakter Onizlemesi', 'Previa de Personagem ao Vivo', 'Vista Previa del Personaje en Vivo')}</p>
                <p className="text-[11px] text-slate-400 mt-1">{l('Updates instantly as you equip cosmetics.', 'Kozmetik taktikca aninda guncellenir.', 'Atualiza instantaneamente conforme voce equipa cosmeticos.', 'Se actualiza al instante al equipar cosmeticos.')}</p>
              </div>

              <div className="relative flex-1 min-h-[420px] overflow-hidden rounded-lg border border-cyan-500/25 bg-slate-950/80">
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(34,211,238,0.14) 0%, rgba(2,6,23,0.85) 58%, rgba(2,6,23,0.98) 100%)' }} />
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                  <div style={{ transform: 'scale(6.2)', transformOrigin: 'center center' }}>
                    <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}>
                      <CSSCharacter
                        reaction="idle"
                        facingRight={true}
                        skinPalette={{
                          ...equippedSkin.palette,
                          paletteMode: equippedSkin.paletteMode,
                          gradientColors: equippedSkin.gradientColors,
                          animationSpeed: equippedSkin.animationSpeed,
                        }}
                        accessoryId={equippedAccessory.id}
                        headStyleId={equippedHeadStyle.id}
                      />
                    </motion.div>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded border border-slate-700/60 bg-slate-900/70 px-2 py-1">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">{l('Theme', 'Tema', 'Tema', 'Tema')}</p>
                  <p className="text-xs text-cyan-200 truncate">{equippedTheme.name}</p>
                </div>
                <div className="rounded border border-slate-700/60 bg-slate-900/70 px-2 py-1">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">{l('Skin', 'Kaplama', 'Skin', 'Skin')}</p>
                  <p className="text-xs text-cyan-200 truncate">{equippedSkin.name}</p>
                </div>
                <div className="rounded border border-slate-700/60 bg-slate-900/70 px-2 py-1">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">{l('Head', 'Bas', 'Cabeca', 'Cabeza')}</p>
                  <p className="text-xs text-cyan-200 truncate">{equippedHeadStyle.name}</p>
                </div>
                <div className="rounded border border-slate-700/60 bg-slate-900/70 px-2 py-1">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">{l('Accessory', 'Aksesuar', 'Acessorio', 'Accesorio')}</p>
                  <p className="text-xs text-cyan-200 truncate">{equippedAccessory.name}</p>
                </div>
                <div className="rounded border border-slate-700/60 bg-slate-900/70 px-2 py-1 col-span-2">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">{l('Click Effect', 'Tiklama Efekti', 'Efeito de Clique', 'Efecto de Clic')}</p>
                  <p className="text-xs text-cyan-200 truncate">{equippedClickEffect ? equippedClickEffect.name : l('None', 'Yok', 'Nenhum', 'Ninguno')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function LootBoxDialog({
  open,
  onOpenChange,
  l,
  language,
  lootBoxReward,
  lootBoxOpened,
  isLootBoxOpening,
  isLootBoxCharging,
  isLootBoxBursting,
  activeLootBoxColors,
  lootRewardDetails,
  lootRarityClass,
  onOpenLootBox,
  onEquipLootReward,
  isLootRewardEquipped,
  onContinueRun,
  showMinimizedBubble,
  onReopen,
  leftPanelOpen,
  rightPanelOpen,
}: any) {
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md bg-card/95 border-amber-500/30 z-[55]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-display text-amber-400">
              <Sparkles className="w-5 h-5" /> {lootBoxReward?.source === 'welcome' ? pick6(language, ['Welcome-Back Loot Box', 'Hoş Geldin Ganimet Kutusu', 'Loot Box de Boas-Vindas', 'Loot Box de Bienvenida', 'Подарочный лутбокс', '回归战利品箱']) : l('Ascension Loot Box', 'Yukselis Ganimet Kutusu', 'Loot Box de Ascensao', 'Loot Box de Ascension')}
            </DialogTitle>
          </DialogHeader>

          {lootBoxReward && (
            <div className="space-y-4">
              {!lootBoxOpened ? (
                <div className="space-y-4 text-center">
                  <motion.div className="relative mx-auto h-44 w-52 [perspective:1200px]" animate={isLootBoxCharging ? { y: [0, -10, 0], scale: [1, 1.03, 1] } : isLootBoxBursting ? { y: [0, -16, 2, 0], scale: [1, 1.12, 0.95, 1] } : { y: [0, -6, 0] }} transition={isLootBoxCharging ? { duration: 0.52, repeat: Infinity, ease: 'easeInOut' } : isLootBoxBursting ? { duration: 0.5, ease: 'easeOut' } : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}>
                    <motion.div className="absolute left-1/2 top-20 h-32 w-40 -translate-x-1/2 -translate-y-1/2 [transform-style:preserve-3d]" animate={isLootBoxCharging ? { rotateY: [0, 14, -14, 0], rotateX: [0, -5, 2, 0], scale: [1, 1.04, 1] } : isLootBoxBursting ? { rotateY: [0, 30, -24, 0], rotateX: [0, -9, 4, 0], scale: [1, 1.15, 0.94, 1] } : { rotateY: [0, 6, -6, 0], rotateX: [0, -2, 0] }} transition={isLootBoxCharging ? { duration: 0.42, repeat: Infinity, ease: 'easeInOut' } : isLootBoxBursting ? { duration: 0.46, ease: 'easeOut' } : { duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
                      <div className="absolute inset-0 rounded-xl border [transform:translateZ(16px)]" style={{ borderColor: activeLootBoxColors.accent, background: `linear-gradient(180deg, ${activeLootBoxColors.bodyFrom} 0%, ${activeLootBoxColors.bodyVia} 55%, ${activeLootBoxColors.bodyTo} 100%)`, boxShadow: isLootBoxOpening ? `0 16px 36px rgba(15,23,42,0.75), 0 0 52px ${activeLootBoxColors.glow}` : `0 14px 30px rgba(15,23,42,0.7), 0 0 35px ${activeLootBoxColors.glow}` }} />
                      <div className="absolute left-1 top-2 h-24 w-8 rounded-lg border [transform:rotateY(-68deg)_translateZ(6px)]" style={{ borderColor: activeLootBoxColors.accent, background: activeLootBoxColors.sideLeft }} />
                      <div className="absolute right-1 top-2 h-24 w-8 rounded-lg border [transform:rotateY(68deg)_translateZ(6px)]" style={{ borderColor: activeLootBoxColors.accent, background: activeLootBoxColors.sideRight }} />
                      <div className="absolute left-1/2 top-1 h-12 w-36 -translate-x-1/2 rounded-xl border [transform:rotateX(68deg)_translateZ(18px)]" style={{ borderColor: activeLootBoxColors.accent, background: `linear-gradient(180deg, ${activeLootBoxColors.topFrom} 0%, ${activeLootBoxColors.topTo} 100%)` }} />
                      <div className="absolute left-1/2 top-16 h-16 w-[4px] -translate-x-1/2 rounded-full [transform:translateZ(18px)]" style={{ background: activeLootBoxColors.core, boxShadow: `0 0 10px ${activeLootBoxColors.glow}` }} />
                      <div className="absolute left-[24%] top-[56%] h-14 w-[3px] rounded-full [transform:translateZ(18px)]" style={{ background: activeLootBoxColors.core, boxShadow: `0 0 8px ${activeLootBoxColors.glow}` }} />
                      <div className="absolute right-[24%] top-[56%] h-14 w-[3px] rounded-full [transform:translateZ(18px)]" style={{ background: activeLootBoxColors.accent, boxShadow: `0 0 8px ${activeLootBoxColors.glow}` }} />
                    </motion.div>
                    <motion.div className="absolute left-1/2 top-32 h-5 w-40 -translate-x-1/2 rounded-full blur-xl" style={{ background: activeLootBoxColors.glow }} animate={isLootBoxCharging ? { opacity: [0.45, 0.95, 0.45], scaleX: [0.95, 1.22, 0.95] } : isLootBoxBursting ? { opacity: [0.55, 1, 0], scaleX: [1, 1.6, 2], scaleY: [1, 1.4, 2] } : { opacity: [0.35, 0.75, 0.35], scaleX: [0.9, 1.06, 0.9] }} transition={isLootBoxCharging ? { duration: 0.6, repeat: Infinity, ease: 'easeInOut' } : isLootBoxBursting ? { duration: 0.45, ease: 'easeOut' } : { duration: 1.9, repeat: Infinity, ease: 'easeInOut' }} />
                    <motion.div className="absolute left-1/2 top-[56px] -translate-x-1/2" animate={isLootBoxCharging ? { y: [0, -5, 0], opacity: [0.85, 1, 0.85], scale: [1, 1.08, 1] } : isLootBoxBursting ? { y: [0, -10, -2], opacity: [1, 1, 0], scale: [1, 1.35, 0.8] } : { y: [0, -3, 0], opacity: [0.7, 1, 0.7] }} transition={isLootBoxCharging ? { duration: 0.52, repeat: Infinity, ease: 'easeInOut' } : isLootBoxBursting ? { duration: 0.42, ease: 'easeOut' } : { duration: 1.8, repeat: Infinity }}>
                      <Sparkles className="h-8 w-8 drop-shadow-[0_0_10px_rgba(251,191,36,0.85)]" style={{ color: activeLootBoxColors.core }} />
                    </motion.div>
                    <AnimatePresence>
                      {isLootBoxOpening && (
                        <motion.div className="absolute inset-0 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <motion.div className="absolute left-1/2 top-[52%] h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border" style={{ borderColor: activeLootBoxColors.accent }} initial={{ opacity: 0.35, scale: 0.65 }} animate={{ opacity: [0.35, 0], scale: [0.65, 1.65] }} transition={{ duration: 0.55, repeat: isLootBoxCharging ? Infinity : 0, ease: 'easeOut' }} />
                          <motion.div className="absolute left-1/2 top-[52%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: `radial-gradient(circle, ${activeLootBoxColors.glow} 0%, transparent 70%)` }} initial={{ opacity: 0.15, scale: 0.7 }} animate={{ opacity: isLootBoxBursting ? [0.2, 0.95, 0] : [0.2, 0.55, 0.2], scale: isLootBoxBursting ? [0.8, 1.6, 2.1] : [0.8, 1.15, 0.8] }} transition={{ duration: isLootBoxBursting ? 0.45 : 0.65, repeat: isLootBoxCharging ? Infinity : 0, ease: 'easeOut' }} />
                          {isLootBoxBursting && <motion.div className="absolute inset-0 rounded-xl bg-white" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.55, 0] }} transition={{ duration: 0.28, ease: 'easeOut' }} />}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                  <p className="text-sm text-slate-300">
                    {isLootBoxCharging ? l('Decrypting lock sequence...', 'Kilit dizisi cozülüyor...', 'Descriptografando sequencia de bloqueio...', 'Descifrando secuencia de bloqueo...') : isLootBoxBursting ? l('Jackpot breach confirmed!', 'Buyuk odul kirilimi onaylandi!', 'Rompimento do jackpot confirmado!', 'Breach del jackpot confirmado!') : lootBoxReward?.source === 'welcome' ? pick6(language, ['A gift for coming back to DataFall v1.03. Open it to claim your reward.', 'DataFall v1.03\'e döndüğün için bir hediye. Ödülünü almak için aç.', 'Um presente por voltar ao DataFall v1.03. Abra para resgatar sua recompensa.', 'Un regalo por volver a DataFall v1.03. Ábrelo para reclamar tu recompensa.', 'Подарок за возвращение в DataFall v1.03. Откройте, чтобы забрать награду.', '回归 DataFall v1.03 的礼物。打开领取奖励。']) : l('Boss dropped a loot box. Open it to claim your reward.', 'Boss bir ganimet kutusu dusurdu. Odulunu almak icin ac.', 'O chefe derrubou uma loot box. Abra para resgatar sua recompensa.', 'El jefe ha soltado una loot box. Abrela para reclamar tu recompensa.')}
                  </p>
                  <p className="text-xs text-slate-400">{l('Click Effects and Loot-Box crate skins are exclusive. Mine Skins can drop here too, and can also be bought in Crypto Shop.', 'Tiklama efektleri ve loot-box kasa kaplamalari ozeldir. Maden kaplamalari da burada dusebilir ve Kripto Dukkanindan da alinabilir.', 'Efeitos de Clique e skins de caixa de loot box sao exclusivos. Skins de mineradora tambem podem cair aqui e podem ser compradas na Loja Cripto.', 'Los Efectos de Clic y las skins de caja Loot Box son exclusivos. Las Skins de Minero tambien pueden salir aqui y tambien pueden comprarse en la Tienda de Cripto.')}</p>
                  <Button onClick={onOpenLootBox} disabled={isLootBoxOpening} className="w-full bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-80 disabled:cursor-wait">
                    {isLootBoxCharging ? l('Charging Loot Box...', 'Kutu Yukleniyor...', 'Carregando Loot Box...', 'Cargando Loot Box...') : isLootBoxBursting ? l('Revealing Reward...', 'Odul Aciga Cikiyor...', 'Revelando Recompensa...', 'Revelando Recompensa...') : l('Open Loot Box', 'Kutuyu Ac', 'Abrir Loot Box', 'Abrir Loot Box')}
                  </Button>
                </div>
              ) : lootBoxReward.kind === 'cosmetic' ? (
                <div className="space-y-3">
                  <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4">
                    <p className="text-center text-xs uppercase tracking-wider text-cyan-300/80">{l('Unlocked Cosmetic', 'Acilan Kozmetik', 'Cosmetico Desbloqueado', 'Cosmetico Desbloqueado')}</p>
                    <div className="mt-3 grid grid-cols-[140px_minmax(0,1fr)] gap-3 items-start">
                      <div>{lootRewardDetails?.preview}</div>
                      <div className="text-left">
                        <p className="text-lg font-bold text-cyan-200">{lootRewardDetails?.name ?? lootBoxReward.itemName}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${lootRarityClass[lootBoxReward.rarity]}`}>{getRarityLabel(lootBoxReward.rarity, language).toUpperCase()}</span>
                          <span className="text-[11px] text-slate-300">{getLootTypeLabel(lootBoxReward.cosmeticType, language)}</span>
                          {lootBoxReward.isAscensionItem && <span className="rounded border border-fuchsia-400/45 bg-fuchsia-500/10 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-300">{l('Ascension Catalog', 'Yukselis Katalogu', 'Catalogo de Ascensao', 'Catalogo de Ascension')}</span>}
                        </div>
                        {lootRewardDetails?.description && <p className="mt-2 text-xs text-slate-300">{lootRewardDetails.description}</p>}
                        <div className="mt-3 space-y-1 rounded border border-cyan-500/20 bg-slate-950/55 p-2">
                          <p className="text-[10px] uppercase tracking-wide text-cyan-300/75">{l('Stats', 'Istatistikler', 'Atributos', 'Atributos')}</p>
                          {lootRewardDetails?.boostLines.length ? lootRewardDetails.boostLines.map((line: string, idx: number) => <p key={`${line}-${idx}`} className="text-xs text-emerald-300">{line}</p>) : <p className="text-xs text-slate-400">{l('No direct stat boost.', 'Dogrudan stat bonusu yok.', 'Sem bonus direto de atributo.', 'Sin bonus directo de atributo.')}</p>}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  <p className="text-xs text-slate-400 text-center">{l('Added to your Cosmetics Market inventory. Duplicate drops are blocked.', 'Kozmetik Pazar envanterine eklendi. Cift dusmeler engellenir.', 'Adicionado ao inventario do Mercado de Cosmeticos. Drops duplicados sao bloqueados.', 'Anadido a tu inventario del Mercado de Cosmeticos. Las recompensas duplicadas estan bloqueadas.')}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={onEquipLootReward} disabled={isLootRewardEquipped} className="border-cyan-500/50 text-cyan-200 hover:bg-cyan-500/15 disabled:opacity-80">
                      {isLootRewardEquipped ? l('Equipped', 'Takili', 'Equipado', 'Equipado') : l('Equip Now', 'Hemen Tak', 'Equipar Agora', 'Equipar Ahora')}
                    </Button>
                    <Button onClick={onContinueRun} className="w-full">{l('Continue Run', 'Kosuya Devam Et', 'Continuar Run', 'Continuar Partida')}</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-center">
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <p className="text-xs uppercase tracking-wider text-emerald-300/90">{l('Loot Pool Exhausted', 'Ganimet Havuzu Tukendi', 'Pool de Saque Esgotado', 'Pool de Loot Agotado')}</p>
                    <p className="mt-1 text-sm text-emerald-200">{l('No cosmetic items left to drop.', 'Dusecek kozmetik esya kalmadi.', 'Nao restam itens cosmeticos para cair.', 'No quedan cosmeticos por soltar.')}</p>
                    <p className="mt-2 text-base font-bold text-emerald-300">+{lootBoxReward.data} {getCurrencyLabel('data', language)} | +{lootBoxReward.credits} {getCurrencyLabel('credits', language)} | +{lootBoxReward.crypto} {getCurrencyLabel('crypto', language)}</p>
                  </div>
                  <Button onClick={onContinueRun} className="w-full">{l('Continue Run', 'Kosuya Devam Et', 'Continuar Run', 'Continuar Partida')}</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {showMinimizedBubble && (
        <motion.button
          type="button"
          onClick={onReopen}
          initial={{ opacity: 0, scale: 0.8, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 12 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
          className={`fixed bottom-4 z-[70] h-12 w-12 rounded-full border backdrop-blur-sm shadow-[0_0_20px_rgba(251,191,36,0.35)] ${rightPanelOpen ? (leftPanelOpen ? 'left-[336px]' : 'left-4') : 'right-4'} bg-amber-500/20 border-amber-400/60 text-amber-200`}
          title={l('Loot box ready - click to reopen', 'Kutu hazir - yeniden acmak icin tikla', 'Loot box pronta. Clique para reabrir', 'Loot box lista: haz clic para reabrir')}
          data-testid="lootbox-reopen-bubble"
        >
          <Sparkles className="mx-auto h-5 w-5" />
          <span className="absolute -right-1 -top-1 rounded-full border border-amber-300/70 bg-amber-500 px-1 text-[10px] font-bold leading-4 text-slate-950">1</span>
        </motion.button>
      )}
    </>
  );
}

