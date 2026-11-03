import { useState } from "react";
import { Resource, ResourceType, formatNumber, Upgrade, getAscensionCost } from "@/lib/useGame";
import type { SteamLeaderboardEntry } from "@/lib/steamIntegration";
import { Button } from "@/components/ui/button";
import { Database, Cpu, Coins, ArrowRightLeft, Lock, Settings, Crown, RotateCcw, Trophy, BarChart3, AlertTriangle, Sparkles, Keyboard } from "lucide-react";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UpgradePathVisualizer } from "./UpgradePathVisualizer";

interface ResourcePanelProps {
  resources: Record<ResourceType, Resource>;
  upgrades: Upgrade[];
  onSell: (type: ResourceType, amount: number) => void;
  onSellAll: (type: ResourceType) => void;
  totalCritChance?: number;
  interestRate?: number;
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
  onCryptoRelicsClick?: () => void;
  cryptoRelicShopUnlocked?: boolean;
  cryptoRelicUnlockRequirement?: number;
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

export function ResourcePanel({
  resources,
  upgrades,
  onSell,
  onSellAll,
  totalCritChance = 0,
  interestRate = 0,
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
  ascensionLevel,
  onOpenPrestige,
  onAscendTutorialStep,
  onCryptoRelicsClick,
  cryptoRelicShopUnlocked = false,
  cryptoRelicUnlockRequirement = 10,
  tutorialHighlight,
  playSound,
  leaderboardEntries = [],
  leaderboardLoading = false,
  leaderboardError = null,
  leaderboardMyRank = null,
  onRefreshLeaderboard,
  onOpenLeaderboard,
}: ResourcePanelProps) {
  const [isAscendDialogOpen, setIsAscendDialogOpen] = useState(false);
  const [isCustomConvertOpen, setIsCustomConvertOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [customError, setCustomError] = useState('');

  const handleCustomConvert = () => {
    const amount = parseInt(customAmount);
    if (!customAmount || isNaN(amount) || amount <= 0) {
      setCustomError('Please enter a valid number');
      return;
    }
    const dataNeeded = amount * 100;
    if (resources.data.amount < dataNeeded) {
      setCustomError(`Need ${dataNeeded} data (you have ${Math.floor(resources.data.amount)})`);
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
    <div className="w-80 bg-card/50 border-r border-border p-6 flex flex-col gap-6 backdrop-blur-md h-full z-10 shadow-xl overflow-y-auto"
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      <div className="space-y-3">
        <div className="flex gap-2">
          <Button 
            variant="outline"
            size="sm"
            className={`flex-1 text-xs h-8 px-3 font-mono bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20 ${tutorialHighlight === 'prestige_button' ? 'tutorial-highlight' : ''}`}
            onClick={onOpenPrestige}
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
            <RotateCcw className="w-4 h-4 mr-1" /> Ascend
          </Button>
        </div>
        <div className="rounded-md border border-purple-500/30 bg-purple-950/20 px-2.5 py-1.5 text-xs font-mono text-purple-200/90 flex items-center justify-between gap-2 whitespace-nowrap">
          <span className="min-w-0">
            Required: <span className="font-semibold text-purple-300">{formatNumber(ascensionCost)} CRYPTO</span>
          </span>
          <span className={`font-semibold ${canAscend ? 'text-emerald-300' : 'text-purple-300/70'}`}>
            {canAscend ? 'Ready' : 'Locked'}
          </span>
        </div>
        {ascensionLevel > 0 && (
          <div className="rounded-md border border-fuchsia-500/30 bg-fuchsia-950/20 px-2.5 py-1.5 text-xs font-mono text-fuchsia-200/90 flex items-center justify-between">
            <span>Current Ascension</span>
            <span className="font-semibold text-fuchsia-300">#{ascensionLevel}</span>
          </div>
        )}

        <div>
          <h2 className="text-2xl font-bold tracking-wider text-primary">RESOURCES</h2>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">System Status: Online</p>
        </div>
      </div>


      <div className={`p-4 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 hover:border-cyan-500/50 transition-colors ${tutorialHighlight === 'data_display' ? 'tutorial-highlight' : ''}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
            <Database className="w-4 h-4" /> Data
          </h3>
        </div>
        <div className="text-3xl font-mono font-bold text-cyan-300 transition-all duration-300 ease-out tabular-nums">
          {formatNumber(Math.floor(resources.data.amount))}
        </div>
        <div className="text-xs font-mono text-cyan-400/70 mt-1 transition-all duration-300 tabular-nums">
          +{formatNumber(resources.data.perSecond)}/s
        </div>
        
        <div className={`mt-3 pt-3 border-t border-cyan-500/30 ${tutorialHighlight === 'sell_button' ? 'tutorial-highlight' : ''}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <ArrowRightLeft className="w-3 h-3 text-cyan-400" />
              <span className="text-[10px] font-bold text-cyan-400 uppercase">Convert</span>
            </div>
            <span className="text-xs font-mono font-semibold tracking-wide text-cyan-200/90">100 DATA = 1 CREDIT</span>
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
                    disabled={resources.data.amount < 100}
                    data-testid="button-convert-1"
                  >
                    1
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">100 data -&gt; 1 node</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-[10px] h-7 bg-cyan-500/5 hover:bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/60 font-mono px-1"
                    onClick={() => onSell('data', 10)}
                    disabled={resources.data.amount < 1000}
                    data-testid="button-convert-10"
                  >
                    10
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">1,000 data -&gt; 10 nodes</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-[10px] h-7 bg-cyan-500/5 hover:bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/60 font-mono px-1"
                    onClick={() => onSell('data', 100)}
                    disabled={resources.data.amount < 10000}
                    data-testid="button-convert-100"
                  >
                    100
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">10,000 data -&gt; 100 nodes</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-[10px] h-7 bg-cyan-500/5 hover:bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/60 font-mono px-1"
                    onClick={() => onSell('data', 1000)}
                    disabled={resources.data.amount < 100000}
                    data-testid="button-convert-1000"
                  >
                    1K
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">100,000 data -&gt; 1,000 nodes</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-[10px] h-7 bg-amber-500/5 hover:bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:border-amber-500/60 font-mono font-bold px-1"
                    onClick={() => onSellAll('data')}
                    disabled={resources.data.amount < 100}
                    data-testid="button-convert-all"
                  >
                    ALL
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Convert all data -&gt; nodes</TooltipContent>
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
                <TooltipContent side="bottom" className="text-xs">Custom amount</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {(Object.entries(resources) as [ResourceType, Resource][]).map(([key, res]) => {
          if (!res.unlocked || key === 'credits' || key === 'data') return null;
          const Icon = icons[key as keyof typeof icons];
          if (!Icon) return null;

          return (
            <div 
              key={key}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${colors[key as keyof typeof colors]}`} />
                  <span className="font-mono uppercase text-sm font-medium">{key}</span>
                </div>
                <span className="font-mono text-lg tabular-nums transition-all duration-300 ease-out">
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

      <div className="p-4 rounded-lg bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 hover:border-yellow-500/50 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-widest flex items-center gap-1">
            <span aria-hidden="true">₡</span>
            <span>Nodes</span>
          </h3>
        </div>
        <div className="text-3xl font-mono font-bold text-yellow-400 transition-all duration-300 ease-out tabular-nums">
          {formatNumber(Math.floor(resources.credits.amount))}
        </div>
      </div>

      <div className={`bg-gradient-to-br from-red-500/10 to-rose-500/10 border border-red-500/30 p-3 rounded-lg ${tutorialHighlight === 'crypto_display' ? 'tutorial-highlight' : ''}`}>
        <h3 className="text-xs font-bold text-red-400 mb-2 uppercase tracking-widest flex items-center gap-2">
          <Coins className="w-4 h-4" /> Crypto Coin
        </h3>
        <div className="text-2xl font-mono font-bold text-red-300 transition-all duration-300 ease-out tabular-nums">
          {formatNumber(resources.crypto.amount)}
        </div>
        <div className="text-[10px] text-red-400/70 font-mono mt-1 transition-all duration-300 tabular-nums">+{formatNumber(resources.crypto.perSecond)}/s</div>
      </div>

      <div className="mt-auto space-y-3">
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
            <span>STATS</span>
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
          COSMETICS MARKET
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onCryptoRelicsClick}
          disabled={!cryptoRelicShopUnlocked}
          className="w-full text-xs h-8 bg-red-500/5 hover:bg-red-500/15 text-red-300 border border-red-500/30 hover:border-red-500/60 disabled:opacity-60 disabled:cursor-not-allowed font-mono transition-all duration-200 flex items-center justify-center gap-2"
          data-testid="button-crypto-relic-shop"
        >
          <Cpu className="w-3 h-3" />
          RELIC CRYPTO SHOP
        </Button>
        {!cryptoRelicShopUnlocked && (
          <div className="rounded border border-red-500/20 bg-red-950/20 px-2 py-1 text-[10px] font-mono text-red-300/80 text-center">
            Unlock at Ascension {cryptoRelicUnlockRequirement} ({ascensionLevel}/{cryptoRelicUnlockRequirement})
          </div>
        )}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onSettingsClick}
          className="w-full text-xs h-8 bg-cyan-500/5 hover:bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/60 font-mono transition-all duration-200 flex items-center justify-center gap-2"
          data-testid="button-settings"
        >
          <Settings className="w-3 h-3" />
          SETTINGS
        </Button>
        <div className="grid grid-cols-2 gap-2 items-stretch">
          <UpgradePathVisualizer
            upgrades={upgrades}
            resources={resources}
            buttonClassName="w-full h-full justify-center"
          />
          <div className="rounded-md border border-amber-500/35 bg-amber-500/10 p-2 space-y-1.5">
            <div className="flex items-center justify-between gap-1">
              <div className="text-[10px] uppercase tracking-wide text-amber-300 flex items-center gap-1">
                <Crown className="w-3 h-3" />
                Max Asc.
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

            {leaderboardLoading ? (
              <div className="text-[10px] text-slate-300">Loading...</div>
            ) : leaderboardError ? (
              <div className="text-[10px] text-red-300 leading-tight">
                {leaderboardError}
              </div>
            ) : leaderboardEntries.length === 0 ? (
              <div className="text-[10px] text-slate-400">No entries</div>
            ) : (
              <div className="space-y-1">
                {leaderboardEntries.slice(0, 3).map((entry) => (
                  <div
                    key={`${entry.rank}-${entry.steamId}`}
                    className="flex items-center justify-between text-[10px] font-mono text-amber-100/90"
                  >
                    <span className="truncate pr-1">#{entry.rank} {entry.personaName}</span>
                    <span className="text-cyan-300">{entry.score}</span>
                  </div>
                ))}
              </div>
            )}

            {leaderboardMyRank !== null && leaderboardMyRank > 0 && (
              <div className="text-[10px] text-amber-200/90">
                You: #{leaderboardMyRank}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenLeaderboard}
              className="w-full h-6 px-2 text-[10px] bg-slate-900/70 border-amber-500/35 text-amber-200 hover:bg-amber-500/15"
              data-testid="button-open-leaderboards"
            >
              Open Board
            </Button>
          </div>
        </div>
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest">Terminal Log</h3>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-500/20 px-2 py-1 rounded border border-cyan-500/30">{formatTime(elapsedTime)}</span>
          </div>
          <div className="font-mono text-[10px] text-muted-foreground space-y-1 opacity-70">
            <p>{'>'} System initialized...</p>
            <p>{'>'} Connection established...</p>
            <p>{'>'} Waiting for user input...</p>
            <p className="animate-pulse">{'>'} _</p>
          </div>
        </div>
      </div>
      
      <Dialog open={isAscendDialogOpen} onOpenChange={setIsAscendDialogOpen}>
        <DialogContent className="bg-slate-950/95 border-purple-500/50 backdrop-blur-xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-purple-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Confirm Ascension
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you ready to reset your progress and claim your rewards?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Current Crypto</span>
                <span className="font-mono text-lg text-red-400">{formatNumber(resources.crypto.amount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Required Crypto</span>
                <span className="font-mono text-lg text-purple-300">{formatNumber(ascensionCost)}</span>
              </div>
              {!canAscend && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Missing</span>
                  <span className="font-mono text-sm text-red-300">{formatNumber(missingCrypto)}</span>
                </div>
              )}
              <div className="border-t border-purple-500/30 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Prestige Reward</span>
                  <span className="font-mono text-2xl text-purple-400 font-bold">
                    {canAscend ? `+${prestigeGain}` : 'None (0)'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <p className="text-xs text-amber-300 font-medium mb-1">Warning: This will reset:</p>
              <ul className="text-[10px] text-muted-foreground space-y-1">
                <li>- All Data, Nodes, and Crypto</li>
                <li>- All Upgrades (Factory, Click, Mining)</li>
                <li>- Current run timer</li>
              </ul>
              <p className="text-xs text-emerald-400 mt-2">Kept: Prestige Points & Prestige Upgrades</p>
              <p className="text-[10px] text-cyan-400/70 mt-1">Tip: More crypto = exponentially more prestige!</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setIsAscendDialogOpen(false)}
              className="flex-1 border-muted-foreground/30"
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmAscend}
              disabled={!canAscend}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white disabled:bg-purple-900/40 disabled:text-purple-200/50 disabled:cursor-not-allowed"
              data-testid="button-confirm-ascend"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Face the Firewall
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCustomConvertOpen} onOpenChange={setIsCustomConvertOpen}>
        <DialogContent className="bg-slate-950/95 border-cyan-500/50 backdrop-blur-xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-cyan-400 flex items-center gap-2">
              <Keyboard className="w-5 h-5" />
              Custom Conversion
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Enter node amount to convert (100 data -&gt; 1 node)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-cyan-400 uppercase">Nodes to Receive</label>
              <Input
                type="number"
                placeholder="Enter amount"
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
                  Will cost: {formatNumber(parseInt(customAmount) * 100)} data
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
                <span className="text-muted-foreground">Available Data:</span>
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
              Cancel
            </Button>
            <Button
              onClick={handleCustomConvert}
              className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
              data-testid="button-confirm-custom-convert"
            >
              Convert
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


