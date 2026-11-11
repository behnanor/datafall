import { memo, useEffect, useState } from "react";
import { Resource, ResourceType, formatNumber, Upgrade, getAscensionCost, type PrestigeGainBreakdown, type AutomationSettings, AUTO_BUY_MODES, AUTOMATION_UNLOCK_ASCENSION, AUTO_ASCEND_MULTIPLE_OPTIONS, type ChallengeId, type ChallengeState, CHALLENGES, RARITY_ECONOMY, CHALLENGE_UNLOCK_ASCENSION, CHALLENGE_SPRINT_LIMIT_SECONDS, FINALE_UNLOCK_ASCENSION, getEndlessDepth } from "@/lib/useGame";
import { getBoostLines } from "@/lib/gameLocale";

// v1.04: cheapest Nodes cosmetic; above this the Ascend window reminds players to spend their Nodes first.
const COSMETIC_MIN_PRICE = RARITY_ECONOMY.common.price;
import { NextGoal } from "./NextGoal";
import { CurrencyHelp, getCurrencyHelpText } from "./CurrencyHelp";
import { getAbyssBoon, getAbyssBoonName, groupAbyssBoons, ABYSS_BOON_EVERY_DEPTHS, getAbyssBoonPicksEarned, type AbyssBoonId } from "@/lib/abyssBoons";
import { getEndlessTitle, getNextEndlessRewardDepth, getUnlockedAbyssVariants, ABYSS_VARIANT_NAMES, ABYSS_VARIANT_HUES } from "@/lib/endless";
import { ECHO_EVERY_DEPTHS, getEchoPrestigeMultiplier, pick6 } from "@/lib/bossVariants";

type LocalizedTuple = [en: string, tr: string, pt: string, es: string, ru: string];
const CHALLENGE_TEXT: Record<ChallengeId, { name: LocalizedTuple; rule: LocalizedTuple }> = {
  no_clicks: {
    name: ['Hands Off', 'Eller Uzakta', 'Mãos Livres', 'Manos Fuera', 'Руки прочь'],
    rule: ['Clicks earn nothing. Ascend on production alone.', 'Tıklamalar hiçbir şey kazandırmaz. Sadece üretimle yüksel.', 'Cliques não rendem nada. Ascenda só com produção.', 'Los clics no dan nada. Asciende solo con producción.', 'Клики ничего не дают. Вознеситесь только на производстве.'],
  },
  half_crypto: {
    name: ['Crypto Drought', 'Kripto Kuraklığı', 'Seca de Cripto', 'Sequía de Cripto', 'Криптозасуха'],
    rule: ['All crypto production is halved.', 'Tüm kripto üretimi yarıya iner.', 'Toda a produção de cripto cai pela metade.', 'Toda la producción de cripto se reduce a la mitad.', 'Вся добыча крипты уменьшена вдвое.'],
  },
  sprint: {
    name: ['Overclock Sprint', 'Hız Koşusu', 'Sprint Overclock', 'Sprint Overclock', 'Разгонный спринт'],
    rule: ['Ascend within 30 minutes.', '30 dakika içinde yüksel.', 'Ascenda em até 30 minutos.', 'Asciende en menos de 30 minutos.', 'Вознеситесь за 30 минут.'],
  },
  bare_metal: {
    name: ['Bare Metal', 'Çıplak Metal', 'Metal Puro', 'Metal Desnudo', 'Голое железо'],
    rule: ['Cosmetic and relic bonuses are turned off.', 'Kozmetik ve relik bonusları kapalı.', 'Bônus de cosméticos e relíquias desligados.', 'Bonos de cosméticos y reliquias desactivados.', 'Бонусы косметики и реликвий отключены.'],
  },
};
import type { SteamLeaderboardEntry } from "@/lib/steamIntegration";
import { Button } from "@/components/ui/button";
import { Database, Cpu, Coins, ArrowRightLeft, Settings, Crown, RotateCcw, Trophy, BarChart3, AlertTriangle, Sparkles, Keyboard, Rocket } from "lucide-react";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UpgradePathVisualizer } from "./UpgradePathVisualizer";
import { CurrencyIcon } from "@/components/game/CurrencyIcon";
import { localizeInlineText, upperForLanguage, useI18n } from "@/lib/i18n";
import { getResourceLabel } from "@/lib/gameText";

interface ResourcePanelProps {
  finaleCompleted?: boolean;
  finaleWeaken?: number;
  abyssVariant?: number;
  onSetAbyssVariant?: (variant: number) => void;
  // v1.04 Endless: Abyss Boons owned / waiting to be picked.
  abyssBoons?: AbyssBoonId[];
  pendingAbyssBoons?: number;
  onOpenAbyssBoons?: () => void;
  echoBonus?: number;
  onStartFinale?: () => void;
  challenges?: ChallengeState;
  onStartChallenge?: (id: ChallengeId) => void;
  onAbandonChallenge?: () => void;
  automation?: AutomationSettings;
  onSetAutomation?: (next: AutomationSettings) => void;
  prestigeBreakdown?: PrestigeGainBreakdown;
  // < 1 when the catch-up assist makes floating pickups appear faster (slow upgrade pace).
  floaterPaceMultiplier?: number;
  resources: Record<ResourceType, Resource>;
  upgrades: Upgrade[];
  onSell: (type: ResourceType, amount: number) => void;
  onSellAll: (type: ResourceType) => void;
  conversionDataCost?: number;
  conversionNodeGain?: number;
  totalCritChance?: number;
  blackMarketUnlocked?: boolean;
  onSettingsClick?: () => void;
  onAchievementsClick?: () => void;
  onStatsClick?: () => void;
  onCosmeticsClick?: () => void;
  achievementCount?: { unlocked: number; total: number };
  unclaimedAchievements?: number;
  elapsedTime?: number;
  prestigeAmount: number;
  onStartBossEncounter: () => void;
  getPrestigeGain: () => number;
  ascensionLevel: number;
  onOpenPrestige: () => void;
  onAscendTutorialStep?: () => void;
  /** Lets the page hold back other pop-ups (tutorial reward) while the Ascend window is open. */
  onAscendDialogOpenChange?: (open: boolean) => void;
  onCryptoRelicsClick?: () => void;
  cryptoRelicShopUnlocked?: boolean;
  cryptoRelicUnlockRequirement?: number;
  onOpenBlackMarket?: () => void;
  blackMarketUnlockRequirement?: number;
  onOpenParagonLab?: () => void;
  paragonLabUnlocked?: boolean;
  paragonLabUnlockRequirement?: number;
  tutorialHighlight?: string | null;
  playSound?: (type: any) => void;
  leaderboardEntries?: SteamLeaderboardEntry[];
  leaderboardLoading?: boolean;
  leaderboardError?: string | null;
  leaderboardMyRank?: number | null;
  onRefreshLeaderboard?: () => void;
  onOpenLeaderboard?: () => void;
}

const icons = {
  data: Database,
  silicon: Cpu,
};

const colors = {
  data: "text-cyan-400",
  silicon: "text-purple-400",
};

export const ResourcePanel = memo(function ResourcePanel({
  resources,
  upgrades,
  onSell,
  onSellAll,
  conversionDataCost = 100,
  conversionNodeGain = 1,
  totalCritChance = 0,
  blackMarketUnlocked = false,
  onSettingsClick,
  onAchievementsClick,
  onStatsClick,
  onCosmeticsClick,
  achievementCount = { unlocked: 0, total: 0 },
  unclaimedAchievements = 0,
  elapsedTime = 0,
  prestigeAmount,
  onStartBossEncounter,
  getPrestigeGain,
  prestigeBreakdown,
  floaterPaceMultiplier = 1,
  automation,
  onSetAutomation,
  challenges,
  onStartChallenge,
  onAbandonChallenge,
  finaleCompleted = false,
  finaleWeaken = 0,
  abyssVariant = 0,
  onSetAbyssVariant,
  abyssBoons = [],
  pendingAbyssBoons = 0,
  onOpenAbyssBoons,
  echoBonus = 0,
  onStartFinale,
  ascensionLevel,
  onOpenPrestige,
  onAscendTutorialStep,
  onAscendDialogOpenChange,
  onCryptoRelicsClick,
  cryptoRelicShopUnlocked = false,
  cryptoRelicUnlockRequirement = 5,
  onOpenBlackMarket,
  blackMarketUnlockRequirement = 15,
  onOpenParagonLab,
  paragonLabUnlocked = false,
  paragonLabUnlockRequirement = 25,
  tutorialHighlight,
  playSound,
  leaderboardEntries = [],
  leaderboardLoading = false,
  leaderboardError = null,
  leaderboardMyRank = null,
  onRefreshLeaderboard,
  onOpenLeaderboard,
}: ResourcePanelProps) {
  const { language, t } = useI18n();
  const [isAscendDialogOpen, setIsAscendDialogOpen] = useState(false);
  const [armedChallenge, setArmedChallenge] = useState<ChallengeId | null>(null);
  const [isCustomConvertOpen, setIsCustomConvertOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [customError, setCustomError] = useState('');
  const lowerDataLabel = t('common.data').toLowerCase();
  const lowerNodesLabel = t('common.nodes').toLowerCase();
  const formatConversionOutput = (amount: number) => {
    const converted = amount * conversionNodeGain;
    if (Number.isInteger(converted)) return formatNumber(converted);
    return converted.toFixed(2).replace(/\.?0+$/, '');
  };
  const getConversionCost = (amount: number) => conversionDataCost * amount;

  const handleCustomConvert = () => {
    const amount = parseInt(customAmount);
    if (!customAmount || isNaN(amount) || amount <= 0) {
      setCustomError(t('resourcePanel.invalidAmount'));
      return;
    }
    const dataNeeded = getConversionCost(amount);
    if (resources.data.amount < dataNeeded) {
      setCustomError(t('resourcePanel.needData', {
        needed: dataNeeded,
        current: Math.floor(resources.data.amount),
      }));
      return;
    }
    onSell('data', amount);
    setCustomAmount('');
    setCustomError('');
    setIsCustomConvertOpen(false);
  };
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const prestigeGain = getPrestigeGain();
  const ascensionCost = getAscensionCost(ascensionLevel);
  const canAscend = resources.crypto.amount >= ascensionCost;
  const missingCrypto = Math.max(0, ascensionCost - resources.crypto.amount);
  const isBlackMarketUnlocked = blackMarketUnlocked || ascensionLevel >= blackMarketUnlockRequirement;
  
  useEffect(() => {
    onAscendDialogOpenChange?.(isAscendDialogOpen);
  }, [isAscendDialogOpen, onAscendDialogOpenChange]);

  const handleAscendClick = () => {
    onAscendTutorialStep?.();
    if (canAscend) {
      playSound?.('prestige_realm');
    }
    setIsAscendDialogOpen(true);
  };
  
  const confirmAscend = () => {
    if (!canAscend) return;
    setIsAscendDialogOpen(false);
    onStartBossEncounter();
  };
  
  return (
    <div className="w-80 bg-card/50 border-r border-border p-4 flex flex-col gap-4 backdrop-blur-md h-full z-10 shadow-xl overflow-y-auto"
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      <div className="space-y-2 rounded-lg border border-purple-500/25 bg-purple-950/10 p-3">
        <div className="flex gap-2">
          <Button 
            variant="outline"
            size="sm"
            className={`flex-1 text-xs h-8 px-3 font-mono bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20 ${tutorialHighlight === 'prestige_button' ? 'tutorial-highlight' : ''}`}
            onClick={onOpenPrestige}
            title={`${pick6(language, ['Prestige', 'Prestij', 'Prestígio', 'Prestigio', 'Престиж', '声望'])}: ${getCurrencyHelpText('prestige', language)}`}
            data-testid="button-prestige-menu"
          >
            <Crown className="w-5 h-5" />
            <span className="ml-2 text-sm font-bold">{Math.floor(prestigeAmount)}</span>
          </Button>
          
          <Button 
            variant="outline"
            size="sm"
            onClick={handleAscendClick}
            className={`flex-1 text-xs h-8 px-3 font-mono bg-purple-500/10 border-purple-500/40 text-purple-400 hover:bg-purple-500/20 ${canAscend ? 'ascend-glow' : ''} ${tutorialHighlight === 'ascend_button' ? 'tutorial-highlight' : ''}`}
            data-testid="button-ascend"
          >
            <RotateCcw className="w-4 h-4 mr-1" /> {t('resourcePanel.ascend')}
          </Button>
        </div>
        <div className="rounded-md border border-purple-500/30 bg-purple-950/20 px-2.5 py-1.5 text-xs font-mono text-purple-200/90 flex items-center justify-between gap-2 whitespace-nowrap">
          <span className="min-w-0">
            {t('resourcePanel.required')}: <span className="font-semibold text-purple-300">{formatNumber(ascensionCost)} {upperForLanguage(t('common.crypto'))}</span>
          </span>
          <span className={`font-semibold ${canAscend ? 'text-emerald-300' : 'text-purple-300/70'}`}>
            {canAscend ? t('common.ready') : t('common.locked')}
          </span>
        </div>
        {!finaleCompleted && <NextGoal language={language} resources={resources} upgrades={upgrades} ascensionLevel={ascensionLevel} />}
        {ascensionLevel > 0 && (
          <div className="rounded-md border border-fuchsia-500/30 bg-fuchsia-950/20 px-2.5 py-1.5 text-xs font-mono text-fuchsia-200/90 flex items-center justify-between">
            <span>{t('resourcePanel.currentAscension')}</span>
            <span className="font-semibold text-fuchsia-300">#{ascensionLevel}</span>
          </div>
        )}

        <div>
          <h2 className="text-xl font-bold tracking-wider text-primary">{t('resourcePanel.resources')}</h2>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">{t('resourcePanel.systemOnline')}</p>
        </div>
      </div>


      <div className={`p-4 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 hover:border-cyan-500/50 transition-colors ${tutorialHighlight === 'data_display' ? 'tutorial-highlight' : ''}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
            <Database className="w-4 h-4" /> {t('common.data')} <CurrencyHelp kind="data" language={language} />
          </h3>
        </div>
        <div className="text-3xl font-mono font-bold text-cyan-300 transition-all duration-300 ease-out tabular-nums">
          {formatNumber(Math.floor(resources.data.amount))}
        </div>
        <div className="text-xs font-mono text-cyan-400/70 mt-1 transition-all duration-300 tabular-nums">
          +{formatNumber(resources.data.perSecond)}/s
        </div>
        {floaterPaceMultiplier < 0.98 && (
          <div className="text-[10px] font-mono text-emerald-300/80 mt-0.5" data-testid="catchup-assist">
            {localizeInlineText(language, `Catch-up: floaters x${(1 / floaterPaceMultiplier).toFixed(1)} faster`, `Telafi: yüzenler x${(1 / floaterPaceMultiplier).toFixed(1)} daha hızlı`, `Recuperação: itens x${(1 / floaterPaceMultiplier).toFixed(1)} mais rápidos`, `Recuperación: objetos x${(1 / floaterPaceMultiplier).toFixed(1)} más rápido`, `Догоняющий бонус: бонусы x${(1 / floaterPaceMultiplier).toFixed(1)} быстрее`)}
          </div>
        )}
        
        <div className={`mt-3 pt-3 border-t border-cyan-500/30 ${tutorialHighlight === 'sell_button' ? 'tutorial-highlight' : ''}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <ArrowRightLeft className="w-3 h-3 text-cyan-400" />
              <span className="text-[10px] font-bold text-cyan-400 uppercase">{t('resourcePanel.convertLabel')}</span>
            </div>
            <span className="text-xs font-mono font-semibold tracking-wide text-cyan-200/90">
              {formatNumber(conversionDataCost)} {upperForLanguage(t('common.data'))} = {formatConversionOutput(1)} {upperForLanguage(t('common.nodes'))}
            </span>
          </div>
          <div className={`grid grid-cols-6 gap-1 rounded ${['sell_button','convert','conversion'].includes(String(tutorialHighlight || '')) ? 'tutorial-highlight' : ''}`}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-[10px] h-7 bg-cyan-500/5 hover:bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/60 font-mono px-1"
                    onClick={() => onSell('data', 1)}
                    disabled={resources.data.amount < getConversionCost(1)}
                    data-testid="button-convert-1"
                  >
                    1
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">{`${formatNumber(getConversionCost(1))} ${lowerDataLabel} -> ${formatConversionOutput(1)} ${lowerNodesLabel}`}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-[10px] h-7 bg-cyan-500/5 hover:bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/60 font-mono px-1"
                    onClick={() => onSell('data', 10)}
                    disabled={resources.data.amount < getConversionCost(10)}
                    data-testid="button-convert-10"
                  >
                    10
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">{`${formatNumber(getConversionCost(10))} ${lowerDataLabel} -> ${formatConversionOutput(10)} ${lowerNodesLabel}`}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-[10px] h-7 bg-cyan-500/5 hover:bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/60 font-mono px-1"
                    onClick={() => onSell('data', 100)}
                    disabled={resources.data.amount < getConversionCost(100)}
                    data-testid="button-convert-100"
                  >
                    100
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">{`${formatNumber(getConversionCost(100))} ${lowerDataLabel} -> ${formatConversionOutput(100)} ${lowerNodesLabel}`}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-[10px] h-7 bg-cyan-500/5 hover:bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/60 font-mono px-1"
                    onClick={() => onSell('data', 1000)}
                    disabled={resources.data.amount < getConversionCost(1000)}
                    data-testid="button-convert-1000"
                  >
                    1K
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">{`${formatNumber(getConversionCost(1000))} ${lowerDataLabel} -> ${formatConversionOutput(1000)} ${lowerNodesLabel}`}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-[10px] h-7 bg-amber-500/5 hover:bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:border-amber-500/60 font-mono font-bold px-1"
                    onClick={() => onSellAll('data')}
                    disabled={resources.data.amount < getConversionCost(1)}
                    data-testid="button-convert-all"
                  >
                    {t('resourcePanel.convertAll')}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">{`${formatNumber(conversionDataCost)} ${lowerDataLabel} -> ${formatConversionOutput(1)} ${lowerNodesLabel}`}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-[10px] h-7 bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/60 font-mono px-1"
                    onClick={() => setIsCustomConvertOpen(true)}
                    data-testid="button-convert-custom"
                  >
                    <Keyboard className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">{t('resourcePanel.customAmount')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {onStartFinale && ascensionLevel >= FINALE_UNLOCK_ASCENSION && !finaleCompleted && (
        <Button onClick={onStartFinale} className="w-full h-10 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 font-bold tracking-wider" data-testid="button-breach-core">
          {localizeInlineText(language, 'BREACH THE CORE', 'ÇEKİRDEĞE SIZ', 'INVADIR O NÚCLEO', 'ROMPER EL NÚCLEO', 'ВЗЛОМАТЬ ЯДРО')}
          {finaleWeaken > 0 && <span className="ml-2 text-[10px] font-mono opacity-90">({localizeInlineText(language, 'Core weakened', 'Çekirdek zayıfladı', 'Núcleo enfraquecido', 'Núcleo debilitado', 'Ядро ослаблено')}: -{Math.round(finaleWeaken * 100)}%)</span>}
        </Button>
      )}
      {finaleCompleted && (
        <div className="rounded-lg border border-orange-500/40 bg-orange-950/20 px-3 py-2 text-center" data-testid="endless-badge">
          <p className="text-[11px] font-bold uppercase tracking-widest text-orange-300">{localizeInlineText(language, 'Endless mode', 'Sonsuz mod', 'Modo infinito', 'Modo infinito', 'Бесконечный режим')}</p>
          <p className="text-[10px] font-mono text-orange-200/80">{localizeInlineText(language, 'Depth', 'Derinlik', 'Profundidade', 'Profundidad', 'Глубина')}: {getEndlessDepth(ascensionLevel)}</p>
          {(() => {
            const depth = getEndlessDepth(ascensionLevel);
            const title = getEndlessTitle(depth, language);
            const unlocked = getUnlockedAbyssVariants(depth);
            const nextEcho = (Math.floor(depth / ECHO_EVERY_DEPTHS) + 1) * ECHO_EVERY_DEPTHS;
            return (
              <div className="mt-1 space-y-1" data-testid="endless-rewards">
                {title && <p className="text-xs font-bold text-amber-200">{title}</p>}
                <p className="text-[10px] font-mono text-orange-200/70">
                  {pick6(language, ['Next reward', 'Sıradaki ödül', 'Próxima recompensa', 'Siguiente recompensa', 'Следующая награда', '下一个奖励'])}: {getNextEndlessRewardDepth(depth)} · {pick6(language, ['Core Echo', 'Çekirdek Yankısı', 'Eco do Núcleo', 'Eco del Núcleo', 'Эхо Ядра', '核心回响'])}: {nextEcho} (x{getEchoPrestigeMultiplier(nextEcho) + echoBonus})
                </p>
                {onOpenAbyssBoons && (pendingAbyssBoons > 0 ? (
                  <button type="button" onClick={onOpenAbyssBoons} className="mt-1 w-full animate-pulse rounded border border-orange-400 bg-orange-500/25 px-2 py-1 text-[11px] font-bold text-orange-100 hover:bg-orange-500/40" data-testid="button-abyss-boon">
                    {pick6(language, ['Choose an Abyss Boon', 'Uçurum Lütfu seç', 'Escolher Bênção Abissal', 'Elegir Bendición Abisal', 'Выбрать дар бездны', '选择深渊恩赐'])}{pendingAbyssBoons > 1 ? ` (${pendingAbyssBoons})` : ''}
                  </button>
                ) : (
                  <p className="text-[10px] font-mono text-orange-200/70">
                    {pick6(language, ['Next Abyss Boon', 'Sıradaki Uçurum Lütfu', 'Próxima Bênção Abissal', 'Siguiente Bendición Abisal', 'Следующий дар бездны', '下一项深渊恩赐'])}: {(getAbyssBoonPicksEarned(depth) + 1) * ABYSS_BOON_EVERY_DEPTHS}
                  </p>
                ))}
                {abyssBoons.length > 0 && (
                  <p className="text-[10px] leading-snug text-slate-300" data-testid="abyss-boon-summary">
                    {groupAbyssBoons(abyssBoons).map((g, i) => (
                      <span key={g.id}>{i > 0 ? ' · ' : ''}<span style={{ color: getAbyssBoon(g.id).color }}>{getAbyssBoonName(g.id, language)}</span>{g.count > 1 ? ` x${g.count}` : ''}</span>
                    ))}
                  </p>
                )}
                {unlocked > 0 && onSetAbyssVariant && (
                  <div className="flex flex-wrap justify-center gap-1 pt-1" data-testid="abyss-variants">
                    <button type="button" onClick={() => onSetAbyssVariant(0)} className={`h-5 px-1.5 rounded border text-[9px] font-mono ${abyssVariant === 0 ? 'border-orange-300 text-orange-100' : 'border-slate-600 text-slate-400'}`}>{pick6(language, ['off', 'kapalı', 'desl.', 'apag.', 'выкл', '关'])}</button>
                    {Array.from({ length: unlocked }, (_, i) => (
                      <button key={i} type="button" title={pick6(language, ABYSS_VARIANT_NAMES[i])} onClick={() => onSetAbyssVariant(i + 1)}
                        className={`h-5 w-5 rounded-full border-2 ${abyssVariant === i + 1 ? 'border-white' : 'border-transparent'}`}
                        style={{ background: `hsl(${ABYSS_VARIANT_HUES[i]}, 85%, 55%)` }} />
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
      {automation && onSetAutomation && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/10 p-3 space-y-2" data-testid="automation-panel">
          <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-300">{localizeInlineText(language, 'Automation', 'Otomasyon', 'Automação', 'Automatización', 'Автоматизация')}</p>
          {ascensionLevel < AUTOMATION_UNLOCK_ASCENSION ? (
            <p className="text-[10px] font-mono text-slate-400">{localizeInlineText(language, `Unlocks at ascension ${AUTOMATION_UNLOCK_ASCENSION}`, `Yükseliş ${AUTOMATION_UNLOCK_ASCENSION} ile açılır`, `Desbloqueia na ascensão ${AUTOMATION_UNLOCK_ASCENSION}`, `Se desbloquea en la ascensión ${AUTOMATION_UNLOCK_ASCENSION}`, `Открывается на вознесении ${AUTOMATION_UNLOCK_ASCENSION}`)}</p>
          ) : (
            <>
              <label className="flex items-center justify-between gap-2 text-[11px] text-slate-200 cursor-pointer">
                <span>{localizeInlineText(language, 'Auto-buy miners & rigs', 'Madenci ve rigleri otomatik al', 'Comprar mineradores e rigs', 'Comprar mineros y rigs', 'Автопокупка майнеров и ригов')}</span>
                <input type="checkbox" className="h-4 w-4 accent-emerald-400" checked={automation.autoBuy} onChange={(e) => onSetAutomation({ ...automation, autoBuy: e.target.checked })} data-testid="toggle-auto-buy" />
              </label>
              {automation.autoBuy && (
                <div className="flex gap-1" data-testid="auto-buy-modes">
                  {AUTO_BUY_MODES.map(mode => (
                    <button key={mode} type="button" onClick={() => onSetAutomation({ ...automation, autoBuyMode: mode })}
                      className={`flex-1 h-6 rounded border text-[10px] font-mono ${automation.autoBuyMode === mode ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100' : 'border-slate-600 text-slate-400 hover:text-slate-200'}`}>
                      {mode === 'cheapest'
                        ? localizeInlineText(language, 'Cheapest', 'En ucuz', 'Mais barato', 'Más barato', 'Дешёвое')
                        : mode === 'payback'
                          ? localizeInlineText(language, 'Best payback', 'En iyi geri dönüş', 'Melhor retorno', 'Mejor retorno', 'Окупаемость')
                          : localizeInlineText(language, 'Crypto first', 'Önce kripto', 'Cripto primeiro', 'Cripto primero', 'Сначала крипта')}
                    </button>
                  ))}
                </div>
              )}
              <label className="flex items-center justify-between gap-2 text-[11px] text-slate-200 cursor-pointer">
                <span>{localizeInlineText(language, 'Auto-ascend', 'Otomatik yüksel', 'Ascender automaticamente', 'Ascender automáticamente', 'Автовознесение')}</span>
                <input type="checkbox" className="h-4 w-4 accent-emerald-400" checked={automation.autoAscend} onChange={(e) => onSetAutomation({ ...automation, autoAscend: e.target.checked })} data-testid="toggle-auto-ascend" />
              </label>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400">{localizeInlineText(language, 'at crypto x required', 'gereken kriptonun katı', 'com cripto x necessária', 'con cripto x necesaria', 'при крипте x от нужной')}</span>
                <div className="flex gap-1">
                  {AUTO_ASCEND_MULTIPLE_OPTIONS.map(multiple => (
                    <button key={multiple} type="button" onClick={() => onSetAutomation({ ...automation, autoAscendMultiple: multiple })} className={`rounded px-1.5 py-0.5 text-[10px] font-mono border ${automation.autoAscendMultiple === multiple ? 'border-emerald-400 bg-emerald-500/25 text-emerald-100' : 'border-slate-600 text-slate-400 hover:text-slate-200'}`} data-testid={`auto-ascend-x${multiple}`}>x{multiple}</button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {challenges && onStartChallenge && onAbandonChallenge && (
        <div className="rounded-lg border border-orange-500/30 bg-orange-950/10 p-3 space-y-2" data-testid="challenges-panel">
          <p className="text-[11px] font-bold uppercase tracking-widest text-orange-300">{localizeInlineText(language, 'Challenges', 'Meydan Okumalar', 'Desafios', 'Desafíos', 'Испытания')}</p>
          {ascensionLevel < CHALLENGE_UNLOCK_ASCENSION ? (
            <p className="text-[10px] font-mono text-slate-400">{localizeInlineText(language, `Unlocks at ascension ${CHALLENGE_UNLOCK_ASCENSION}`, `Yükseliş ${CHALLENGE_UNLOCK_ASCENSION} ile açılır`, `Desbloqueia na ascensão ${CHALLENGE_UNLOCK_ASCENSION}`, `Se desbloquea en la ascensión ${CHALLENGE_UNLOCK_ASCENSION}`, `Открывается на вознесении ${CHALLENGE_UNLOCK_ASCENSION}`)}</p>
          ) : (
            <>
              <p className="text-[10px] text-slate-400">{localizeInlineText(language, 'Starting restarts your current run. Ascend during the challenge to complete it.', 'Başlatmak mevcut turu yeniden başlatır. Tamamlamak için meydan okuma sırasında yüksel.', 'Começar reinicia a run atual. Ascenda durante o desafio para concluí-lo.', 'Empezar reinicia la partida actual. Asciende durante el desafío para completarlo.', 'Старт перезапускает текущий забег. Вознеситесь во время испытания, чтобы пройти его.')}</p>
              {CHALLENGES.map(challenge => {
                const text = CHALLENGE_TEXT[challenge.id];
                const done = challenges.completed.includes(challenge.id);
                const active = challenges.active === challenge.id;
                return (
                  <div key={challenge.id} className={`rounded border px-2 py-1.5 ${active ? 'border-orange-400/70 bg-orange-500/10' : done ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-700 bg-slate-900/40'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-slate-100">{localizeInlineText(language, ...text.name)}</span>
                      {done && <span className="text-[10px] font-mono text-emerald-300">✓</span>}
                    </div>
                    <p className="text-[10px] text-slate-400">{localizeInlineText(language, ...text.rule)}</p>
                    <p className="text-[10px] text-emerald-300/90">{localizeInlineText(language, 'Reward', 'Ödül', 'Recompensa', 'Recompensa', 'Награда')}: {getBoostLines(challenge.reward, language).join(', ')}</p>
                    {active ? (
                      <div className="mt-1 flex items-center justify-between gap-2">
                        {challenge.id === 'sprint' && (
                          <span className="text-[10px] font-mono text-orange-200">{formatTime(Math.max(0, CHALLENGE_SPRINT_LIMIT_SECONDS - elapsedTime))}</span>
                        )}
                        <button type="button" onClick={onAbandonChallenge} className="ml-auto rounded border border-red-500/50 px-2 py-0.5 text-[10px] text-red-200 hover:bg-red-500/15" data-testid={`challenge-abandon-${challenge.id}`}>
                          {localizeInlineText(language, 'Abandon', 'Bırak', 'Abandonar', 'Abandonar', 'Сдаться')}
                        </button>
                      </div>
                    ) : !challenges.active && (
                      <button
                        type="button"
                        onClick={() => {
                          if (armedChallenge === challenge.id) { setArmedChallenge(null); onStartChallenge(challenge.id); }
                          else setArmedChallenge(challenge.id);
                        }}
                        className={`mt-1 w-full rounded border px-2 py-0.5 text-[10px] ${armedChallenge === challenge.id ? 'border-orange-400 bg-orange-500/25 text-orange-100' : 'border-slate-600 text-slate-300 hover:bg-slate-800'}`}
                        data-testid={`challenge-start-${challenge.id}`}
                      >
                        {armedChallenge === challenge.id
                          ? localizeInlineText(language, 'Confirm: restart run', 'Onayla: turu yeniden başlat', 'Confirmar: reiniciar run', 'Confirmar: reiniciar partida', 'Подтвердить: перезапуск')
                          : done
                            ? localizeInlineText(language, 'Play again', 'Tekrar oyna', 'Jogar de novo', 'Jugar de nuevo', 'Ещё раз')
                            : localizeInlineText(language, 'Start', 'Başlat', 'Começar', 'Empezar', 'Начать')}
                      </button>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-lg bg-gradient-to-br from-yellow-500/12 to-orange-500/8 border border-yellow-500/30">
          <h3 className="text-[11px] font-bold text-yellow-400 uppercase tracking-widest flex items-center gap-1">
            <CurrencyIcon kind="credits" className="w-3.5 h-3.5" />
            {t('common.nodes')}
            <CurrencyHelp kind="credits" language={language} />
          </h3>
          <div className="mt-2 text-2xl font-mono font-bold text-yellow-300 tabular-nums">
            {formatNumber(Math.floor(resources.credits.amount))}
          </div>
          <div className="text-[10px] text-yellow-300/70 font-mono mt-1 tabular-nums">+{formatNumber(resources.credits.perSecond)}/s</div>
        </div>
        <div className={`p-3 rounded-lg bg-gradient-to-br from-red-500/12 to-rose-500/8 border border-red-500/30 ${tutorialHighlight === 'crypto_display' ? 'tutorial-highlight' : ''}`}>
          <h3 className="text-[11px] font-bold text-red-300 uppercase tracking-widest flex items-center gap-1">
            <CurrencyIcon kind="crypto" className="w-3.5 h-3.5" />
            {t('common.crypto')}
            <CurrencyHelp kind="crypto" language={language} />
          </h3>
          <div className="mt-2 text-2xl font-mono font-bold text-red-200 tabular-nums">
            {formatNumber(resources.crypto.amount)}
          </div>
          <div className="text-[10px] text-red-300/70 font-mono mt-1 tabular-nums">+{formatNumber(resources.crypto.perSecond)}/s</div>
        </div>
      </div>

      <div className="space-y-3">
        {(Object.entries(resources) as [ResourceType, Resource][]).map(([key, res]) => {
          if (!res.unlocked || key === 'credits' || key === 'data') return null;
          const Icon = icons[key as keyof typeof icons];
          if (!Icon) return null;

          return (
            <div 
              key={key}
              className="rounded-lg border border-slate-700/50 bg-slate-900/35 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${colors[key as keyof typeof colors]}`} />
                  <span className="font-mono uppercase text-sm font-medium">{getResourceLabel(key, language)}</span>
                </div>
                <span className="font-mono text-base tabular-nums transition-all duration-300 ease-out">
                  {formatNumber(Math.floor(res.amount))} 
                </span>
              </div>
              
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono h-6 items-center transition-all duration-300 tabular-nums">
                <span>+{formatNumber(res.perSecond)}/s</span>
              </div>

            </div>
          );
        })}
      </div>

      <div className="mt-auto space-y-3">
        <div className="rounded-md border border-amber-500/35 bg-amber-500/10 p-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] uppercase tracking-wide text-amber-300 flex items-center gap-1">
              <Crown className="w-3 h-3" />
              {t('resourcePanel.maxAsc')}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefreshLeaderboard}
              className="h-6 px-1.5 text-[10px] bg-amber-500/20 border-amber-500/40 text-amber-200 hover:bg-amber-500/30"
              data-testid="button-refresh-leaderboard"
            >
              R
            </Button>
          </div>

          <div className="min-h-[74px]">
            {leaderboardLoading ? (
              <div className="h-[74px] flex items-center text-[10px] text-slate-300">{t('common.loading')}</div>
            ) : leaderboardError ? (
              <div className="h-[74px] flex items-center text-[10px] text-red-300 leading-tight">
                {leaderboardError}
              </div>
            ) : (
              <div className="space-y-1">
                {[0, 1, 2].map((slot) => {
                  const entry = leaderboardEntries[slot];
                  return (
                    <div
                      key={`leaderboard-slot-${slot}-${entry?.steamId ?? 'empty'}`}
                      className="flex items-center justify-between text-[10px] font-mono text-amber-100/90 h-5"
                    >
                      {entry ? (
                        <>
                          <span className="truncate pr-1">#{entry.rank} {entry.personaName}</span>
                          <span className="text-cyan-300">{entry.score}</span>
                        </>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="h-4 text-[10px] text-amber-200/90">
            {leaderboardMyRank !== null && leaderboardMyRank > 0 ? t('resourcePanel.youRank', { rank: leaderboardMyRank }) : ''}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenLeaderboard}
            className="w-full h-7 px-2 text-[10px] bg-slate-900/70 border-amber-500/35 text-amber-200 hover:bg-amber-500/15"
            data-testid="button-open-leaderboards"
          >
            {t('resourcePanel.openBoard')}
          </Button>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onAchievementsClick}
              className={`w-full text-xs h-8 bg-amber-500/5 hover:bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:border-amber-500/60 font-mono transition-all duration-200 flex items-center justify-center gap-1 ${unclaimedAchievements > 0 ? 'ring-2 ring-amber-400/50 animate-pulse' : ''}`}
              data-testid="button-achievements"
            >
              <Trophy className="w-3 h-3" />
              <span>{achievementCount.unlocked}/{achievementCount.total}</span>
            </Button>
            {unclaimedAchievements > 0 && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 bg-amber-500 text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-background"
              >
                {unclaimedAchievements > 9 ? '9+' : unclaimedAchievements}
              </motion.div>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onStatsClick}
            className="flex-1 text-xs h-8 bg-fuchsia-500/5 hover:bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/30 hover:border-fuchsia-500/60 font-mono transition-all duration-200 flex items-center justify-center gap-1"
            data-testid="button-stats"
          >
            <BarChart3 className="w-3 h-3" />
            <span>{upperForLanguage(t('common.stats'))}</span>
          </Button>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onCosmeticsClick}
          className={`w-full text-xs h-8 bg-purple-500/5 hover:bg-purple-500/15 text-purple-400 border border-purple-500/30 hover:border-purple-500/60 font-mono transition-all duration-200 flex items-center justify-center gap-2 ${tutorialHighlight === 'cosmetics_button' ? 'tutorial-highlight' : ''}`}
          data-testid="button-cosmetics"
        >
          <Sparkles className="w-3 h-3" />
          {t('resourcePanel.cosmeticsMarket')}
        </Button>

        <div className="rounded-md border border-purple-500/25 bg-purple-950/15 p-2 space-y-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onCryptoRelicsClick}
            disabled={!cryptoRelicShopUnlocked || !onCryptoRelicsClick}
            className="w-full text-xs h-8 bg-red-500/5 hover:bg-red-500/15 text-red-300 border border-red-500/30 hover:border-red-500/60 disabled:opacity-60 disabled:cursor-not-allowed font-mono transition-all duration-200 flex items-center justify-center gap-2"
            data-testid="button-crypto-relic-shop"
          >
            <Cpu className="w-3 h-3" />
            {t('resourcePanel.relicForge')}
          </Button>
          {!cryptoRelicShopUnlocked && (
            <div className="rounded border border-red-500/20 bg-red-950/30 px-2 py-1 text-[10px] font-mono text-red-300/80 text-center">
              {t('resourcePanel.unlockAtAscension', {
                requirement: cryptoRelicUnlockRequirement,
                current: ascensionLevel,
              })}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenBlackMarket}
            disabled={!isBlackMarketUnlocked || !onOpenBlackMarket}
            className="w-full text-xs h-8 bg-rose-500/5 hover:bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:border-rose-500/60 disabled:opacity-60 disabled:cursor-not-allowed font-mono transition-all duration-200 flex items-center justify-center gap-2"
            data-testid="button-black-market-ship"
          >
            <Rocket className="w-3 h-3" />
            {t('resourcePanel.blackMarket')}
          </Button>
          {!isBlackMarketUnlocked && (
            <div className="rounded border border-rose-500/20 bg-rose-950/30 px-2 py-1 text-[10px] font-mono text-rose-200/80 text-center">
              {t('resourcePanel.unlockAtAscension', {
                requirement: blackMarketUnlockRequirement,
                current: ascensionLevel,
              })}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenParagonLab}
            disabled={!paragonLabUnlocked || !onOpenParagonLab}
            className="w-full text-xs h-8 bg-rose-500/5 hover:bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:border-rose-500/60 disabled:opacity-60 disabled:cursor-not-allowed font-mono transition-all duration-200 flex items-center justify-center gap-2"
            data-testid="button-paragon-lab"
          >
            <Crown className="w-3 h-3" />
            {t('resourcePanel.paragonLab')}
          </Button>
          {!paragonLabUnlocked && (
            <div className="rounded border border-rose-500/20 bg-rose-950/30 px-2 py-1 text-[10px] font-mono text-rose-200/80 text-center">
              {t('resourcePanel.unlockAtAscension', {
                requirement: paragonLabUnlockRequirement,
                current: ascensionLevel,
              })}
            </div>
          )}
        </div>

        <UpgradePathVisualizer
          upgrades={upgrades}
          resources={resources}
          buttonClassName="w-full h-8 justify-center"
        />
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onSettingsClick}
          className="w-full text-xs h-8 bg-cyan-500/5 hover:bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/60 font-mono transition-all duration-200 flex items-center justify-center gap-2"
          data-testid="button-settings"
        >
          <Settings className="w-3 h-3" />
          {upperForLanguage(t('common.settings'))}
        </Button>

        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest">{t('resourcePanel.terminalLog')}</h3>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-500/20 px-2 py-1 rounded border border-cyan-500/30">{formatTime(elapsedTime)}</span>
          </div>
          <div className="font-mono text-[10px] text-muted-foreground space-y-1 opacity-70">
            <p>{'>'} {t('resourcePanel.systemInitialized')}</p>
            <p>{'>'} {t('resourcePanel.connectionEstablished')}</p>
            <p>{'>'} {t('resourcePanel.waitingForInput')}</p>
            <p className="animate-pulse">{'>'} _</p>
          </div>
        </div>
      </div>
      
      <Dialog open={isAscendDialogOpen} onOpenChange={setIsAscendDialogOpen}>
        <DialogContent className="bg-slate-950/95 border-purple-500/50 backdrop-blur-xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-purple-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              {t('resourcePanel.confirmAscension')}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t('resourcePanel.confirmAscensionBody')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('resourcePanel.currentCrypto')}</span>
                  <span className="font-mono text-lg text-red-400">{formatNumber(resources.crypto.amount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('resourcePanel.requiredCrypto')}</span>
                  <span className="font-mono text-lg text-purple-300">{formatNumber(ascensionCost)}</span>
                </div>
              {!canAscend && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('resourcePanel.missing')}</span>
                  <span className="font-mono text-sm text-red-300">{formatNumber(missingCrypto)}</span>
                </div>
              )}
              <div className="border-t border-purple-500/30 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('resourcePanel.prestigeReward')}</span>
                  <span className="font-mono text-2xl text-purple-400 font-bold">
                    {canAscend ? `+${prestigeGain}` : `${t('common.none')} (0)`}
                  </span>
                </div>
                {canAscend && prestigeBreakdown && prestigeBreakdown.total > 0 && (
                  <div className="mt-2 space-y-0.5 text-[10px] font-mono text-purple-200/80" data-testid="ascension-breakdown">
                    <div className="flex justify-between"><span>{localizeInlineText(language, 'Crypto reward', 'Kripto ödülü', 'Recompensa de cripto', 'Recompensa de cripto', 'Награда за крипту')}</span><span>{formatNumber(prestigeBreakdown.base)}</span></div>
                    <div className="flex justify-between"><span>{localizeInlineText(language, 'Veteran bonus', 'Kıdem bonusu', 'Bônus de veterano', 'Bono de veterano', 'Бонус ветерана')}</span><span>x{prestigeBreakdown.veteranMultiplier.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>{localizeInlineText(language, 'Extra crypto bonus', 'Fazla kripto bonusu', 'Bônus de cripto extra', 'Bono de cripto extra', 'Бонус за лишнюю крипту')}</span><span>x{prestigeBreakdown.overshootMultiplier.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>{localizeInlineText(language, 'Ascension bonus', 'Yükseliş bonusu', 'Bônus de ascensão', 'Bono de ascensión', 'Бонус вознесения')}</span><span>+{formatNumber(prestigeBreakdown.flatBonus)}</span></div>
                    <div className="flex justify-between"><span>{localizeInlineText(language, 'Prestige upgrades', 'Prestij yükseltmeleri', 'Melhorias de prestígio', 'Mejoras de prestigio', 'Улучшения престижа')}</span><span>x{prestigeBreakdown.upgradeMultiplier.toFixed(2)}</span></div>
                    <p className="pt-1 text-cyan-300/70">{localizeInlineText(language, 'Holding 2x the required crypto gives +50% (up to x3).', 'Gerekenin 2 katı kripto +%50 verir (en fazla x3).', 'Ter 2x a cripto necessária dá +50% (até x3).', 'Tener 2x la cripto necesaria da +50% (hasta x3).', 'Вдвое больше нужной крипты даёт +50% (до x3).')}</p>
                  </div>
                )}
              </div>
            </div>
            
            {canAscend && onCosmeticsClick && resources.credits.amount >= COSMETIC_MIN_PRICE && (
              <div className="flex items-center gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-2.5" data-testid="ascend-spend-nodes">
                <CurrencyIcon kind="credits" className="h-4 w-4 shrink-0" />
                <p className="flex-1 text-[11px] text-yellow-100">
                  {pick6(language, [
                    `You still have ${formatNumber(Math.floor(resources.credits.amount))} Nodes. They reset now, but cosmetics you buy with them stay forever.`,
                    `Hâlâ ${formatNumber(Math.floor(resources.credits.amount))} Dizin'in var. Şimdi sıfırlanacak, ama onlarla aldığın kozmetikler kalıcı.`,
                    `Você ainda tem ${formatNumber(Math.floor(resources.credits.amount))} Nodes. Eles zeram agora, mas cosméticos comprados com eles ficam para sempre.`,
                    `Aún tienes ${formatNumber(Math.floor(resources.credits.amount))} Nodos. Se reinician ahora, pero los cosméticos que compres con ellos son permanentes.`,
                    `У вас ещё ${formatNumber(Math.floor(resources.credits.amount))} узлов. Сейчас они сгорят, а купленная на них косметика останется навсегда.`,
                    `你还有 ${formatNumber(Math.floor(resources.credits.amount))} 节点。它们将被清零，但用它们购买的装扮会永久保留。`,
                  ])}
                </p>
                <Button size="sm" variant="outline" className="h-7 shrink-0 border-yellow-500/50 px-2 text-[11px] text-yellow-200 hover:bg-yellow-500/20" onClick={() => { setIsAscendDialogOpen(false); onCosmeticsClick(); }} data-testid="ascend-open-cosmetics">
                  {pick6(language, ['Spend first', 'Önce harca', 'Gastar antes', 'Gastar antes', 'Сначала потратить', '先去花掉'])}
                </Button>
              </div>
            )}

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <p className="text-xs text-amber-300 font-medium mb-1">{t('resourcePanel.warningReset')}</p>
              <ul className="text-[10px] text-muted-foreground space-y-1">
                <li>- {t('resourcePanel.resetDataNodesCrypto')}</li>
                <li>- {t('resourcePanel.resetUpgrades')}</li>
                <li>- {t('resourcePanel.resetTimer')}</li>
              </ul>
              <p className="text-xs text-emerald-400 mt-2">{t('resourcePanel.keptPrestige')}</p>
              <p className="text-[10px] text-emerald-300/80 mt-1" data-testid="ascend-kept-cosmetics">{pick6(language, ['Also kept: all cosmetics, relics and achievements.', 'Ayrıca kalanlar: tüm kozmetikler, relikler ve başarımlar.', 'Também mantidos: todos os cosméticos, relíquias e conquistas.', 'También se conservan: cosméticos, reliquias y logros.', 'Также сохраняются: вся косметика, реликвии и достижения.', '同样保留：所有装扮、遗物与成就。'])}</p>
              <p className="text-[10px] text-cyan-400/70 mt-1">{t('resourcePanel.moreCryptoTip')}</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setIsAscendDialogOpen(false)}
              className="flex-1 border-muted-foreground/30"
            >
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={confirmAscend}
              disabled={!canAscend}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white disabled:bg-purple-900/40 disabled:text-purple-200/50 disabled:cursor-not-allowed"
              data-testid="button-confirm-ascend"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {t('resourcePanel.faceFirewall')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCustomConvertOpen} onOpenChange={setIsCustomConvertOpen}>
        <DialogContent className="bg-slate-950/95 border-cyan-500/50 backdrop-blur-xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-cyan-400 flex items-center gap-2">
              <Keyboard className="w-5 h-5" />
              {t('resourcePanel.customConversion')}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t('resourcePanel.customConversionBody')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-cyan-400 uppercase">{t('resourcePanel.nodesToReceive')}</label>
              <Input
                type="number"
                placeholder={t('resourcePanel.enterAmount')}
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setCustomError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCustomConvert();
                  }
                }}
                className="bg-cyan-500/10 border-cyan-500/40 text-cyan-300 placeholder:text-cyan-600/50 focus:border-cyan-400"
                data-testid="input-custom-convert"
                autoFocus
              />
              {customAmount && (
                <div className="text-xs font-mono text-cyan-400/70">
                  {t('resourcePanel.willCost', { amount: formatNumber(parseInt(customAmount) * 100) })}
                </div>
              )}
            </div>

            {customError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-xs text-red-400">{customError}</p>
              </div>
            )}

            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{t('resourcePanel.availableData')}</span>
                <span className="font-mono text-cyan-300">{formatNumber(Math.floor(resources.data.amount))}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsCustomConvertOpen(false);
                setCustomAmount('');
                setCustomError('');
              }}
              className="flex-1 border-muted-foreground/30"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleCustomConvert}
              className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
              data-testid="button-confirm-custom-convert"
            >
              {t('common.convert')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});


