import { Upgrade, ResourceType, Resource, formatNumber, ContractsState } from "@/lib/useGame";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, FileText, Zap, Database, Coins, Bitcoin } from "lucide-react";
import { memo, useMemo } from "react";
import { getCheckpointProgress } from "@/lib/useGame";
import { ContractsTerminal } from "./ContractsTerminal";

interface UpgradePanelProps {
  upgrades: Upgrade[];
  resources: Record<ResourceType, Resource>;
  onBuy: (id: string, quantity?: number) => void;
  playSound: (type: 'click' | 'buy_fab' | 'buy_black') => void;
  getUpgradePreview: (upgrade: Upgrade) => string;
  getBulkProductionGain: (upgrade: Upgrade, quantity: number) => number;
  selectedBulkOption: 1 | 10 | 100 | 'max';
  onBulkOptionChange: (option: 1 | 10 | 100 | 'max') => void;
  contracts: ContractsState;
  onClaimContractReward: (contractId: string) => void;
  onRefreshContracts: () => void;
  totalCritChance?: number;
  ascensionLevel?: number;
  tutorialHighlight?: string | null;
  activeUpgradeTab?: string;
  onSetActiveUpgradeTab?: (tab: string) => void;
}

type BuyMode = '1x' | '10x' | '100x' | 'MAX';

type CategoryStyle = {
  accentText: string;
  accentBorder: string;
  cardTone: string;
  hoverTone: string;
  previewText: string;
  chipTone: string;
  progressGradient: string;
};

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  fabrication: {
    accentText: 'text-cyan-300',
    accentBorder: 'border-l-cyan-400',
    cardTone: 'bg-cyan-500/[0.03]',
    hoverTone: 'hover:bg-cyan-500/[0.08] hover:border-cyan-500/60',
    previewText: 'text-cyan-200',
    chipTone: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    progressGradient: 'bg-gradient-to-r from-cyan-500 to-blue-500',
  },
  click_upgrades: {
    accentText: 'text-yellow-300',
    accentBorder: 'border-l-yellow-400',
    cardTone: 'bg-yellow-500/[0.03]',
    hoverTone: 'hover:bg-yellow-500/[0.08] hover:border-yellow-500/60',
    previewText: 'text-yellow-200',
    chipTone: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
    progressGradient: 'bg-gradient-to-r from-yellow-500 to-amber-500',
  },
  crypto_mining: {
    accentText: 'text-red-300',
    accentBorder: 'border-l-red-400',
    cardTone: 'bg-red-500/[0.03]',
    hoverTone: 'hover:bg-red-500/[0.08] hover:border-red-500/60',
    previewText: 'text-red-200',
    chipTone: 'bg-red-500/10 text-red-300 border-red-500/30',
    progressGradient: 'bg-gradient-to-r from-red-500 to-rose-500',
  },
};

const toResourceLabel = (resource: string): string => {
  return resource === 'credits' ? 'nodes' : resource;
};

const getQuantityForMode = (upgrade: Upgrade, resources: Record<ResourceType, Resource>, buyMode: BuyMode, isOneTimeUnlock: boolean): number => {
  if (isOneTimeUnlock) return 1;
  if (buyMode === '1x') return 1;
  if (buyMode === '10x') return 10;
  if (buyMode === '100x') return 100;
  return calculateMaxAffordable(upgrade, resources);
};

const getCheckpointInterval = (_category: string): number => 25;

const getEffectiveUpgradeValue = (upgrade: Upgrade, count: number): number => {
  if (count <= 0) return 0;

  const baseValue = upgrade.effect.value;
  const interval = getCheckpointInterval(upgrade.category);
  const checkpointsPassed = Math.floor(count / interval);

  let valuePerLevel: number;
  if (
    upgrade.effect.type === 'click' ||
    upgrade.effect.type === 'crit_chance' ||
    upgrade.effect.type === 'crit_multiplier'
  ) {
    valuePerLevel = baseValue * count;
  } else {
    valuePerLevel = baseValue * (1 + 0.1 * (count - 1));
  }

  return valuePerLevel * Math.pow(3, checkpointsPassed);
};

const formatUpgradeEffect = (upgrade: Upgrade, count: number): string => {
  if (upgrade.effect.type === 'unlock') {
    return upgrade.count > 0 ? 'Unlocked' : `Unlock ${String(upgrade.effect.unlocksCategory || '').replace('_', ' ')}`;
  }
  if (count <= 0) return 'No bonus yet';

  const value = getEffectiveUpgradeValue(upgrade, count);
  if (upgrade.effect.type === 'production' && upgrade.effect.resource) return `+${formatNumber(value)} ${toResourceLabel(upgrade.effect.resource)}/s`;
  if (upgrade.effect.type === 'click') return `+${formatNumber(value)} click value`;
  if (upgrade.effect.type === 'click_multiplier') return `+${(value * 100).toFixed(0)}% click multiplier`;
  if (upgrade.effect.type === 'crit_chance') return `+${(value * 100).toFixed(1)}% crit chance`;
  if (upgrade.effect.type === 'crit_multiplier') return `+${formatNumber(value)}x crit multiplier`;
  if (upgrade.effect.type === 'interest_boost') return `+${(value * 100).toFixed(1)}% interest`;
  return '';
};

const getMissingCostLine = (costs: Record<string, number>, resources: Record<ResourceType, Resource>): string | null => {
  const deficits = Object.entries(costs)
    .map(([res, cost]) => {
      const missing = cost - resources[res as ResourceType].amount;
      return { res, missing };
    })
    .filter(x => x.missing > 0)
    .sort((a, b) => b.missing - a.missing);

  if (deficits.length === 0) return null;
  return `Need ${formatNumber(Math.floor(deficits[0].missing))} ${toResourceLabel(deficits[0].res)}`;
};

const calculateMaxAffordable = (upgrade: Upgrade, resources: Record<ResourceType, Resource>): number => {
  let count = 0;
  let tempResources = { ...resources };
  
  for (let i = 0; i < 10000; i++) {
    let canAfford = true;
    for (const [res, baseCost] of Object.entries(upgrade.baseCost)) {
      const cost = Math.floor((baseCost as number) * Math.pow(upgrade.costMultiplier, upgrade.count + count));
      if (tempResources[res as ResourceType].amount < cost) {
        canAfford = false;
        break;
      }
    }
    if (!canAfford) break;
    
    for (const [res, baseCost] of Object.entries(upgrade.baseCost)) {
      const cost = Math.floor((baseCost as number) * Math.pow(upgrade.costMultiplier, upgrade.count + count));
      tempResources[res as ResourceType] = {
        ...tempResources[res as ResourceType],
        amount: tempResources[res as ResourceType].amount - cost
      };
    }
    count++;
  }
  return Math.max(1, count);
};

const calculateUpgradeCost = (upgrade: Upgrade, quantity: number): Record<string, number> => {
  const costs: Record<string, number> = {};
  for (const [res, amount] of Object.entries(upgrade.baseCost)) {
    let totalCost = 0;
    for (let i = 0; i < quantity; i++) {
      totalCost += Math.floor((amount as number) * Math.pow(upgrade.costMultiplier, upgrade.count + i));
    }
    costs[res] = totalCost;
  }
  return costs;
};

const UpgradeCard = memo(({ upgrade, category, resources, onBuy, getUpgradePreview, buyMode, getBulkProductionGain }: {
  upgrade: Upgrade;
  category: string;
  resources: Record<ResourceType, Resource>;
  onBuy: (id: string, quantity?: number) => void;
  getUpgradePreview: (u: Upgrade) => string;
  buyMode: BuyMode;
  getBulkProductionGain: (upgrade: Upgrade, quantity: number) => number;
}) => {
  const isOneTimeUnlock = upgrade.effect?.type === 'unlock';
  const styles = CATEGORY_STYLES[category] ?? CATEGORY_STYLES.fabrication;

  const quantity = useMemo(() => {
    return getQuantityForMode(upgrade, resources, buyMode, isOneTimeUnlock);
  }, [buyMode, isOneTimeUnlock, upgrade, resources]);

  const totalCost = useMemo(() => calculateUpgradeCost(upgrade, quantity), [upgrade, quantity]);
  
  const canAfford = useMemo(() => Object.entries(totalCost).every(
    ([key, cost]) => resources[key as ResourceType].amount >= cost
  ), [totalCost, resources]);

  const missingCostLine = useMemo(() => getMissingCostLine(totalCost, resources), [totalCost, resources]);
  const currentEffect = useMemo(() => formatUpgradeEffect(upgrade, upgrade.count), [upgrade]);
  const afterBuyEffect = useMemo(() => formatUpgradeEffect(upgrade, upgrade.count + quantity), [upgrade, quantity]);

  const checkpointProgress = useMemo(() => getCheckpointProgress(upgrade.count, category), [upgrade.count, category]);
  const progressPercent = (checkpointProgress.current / checkpointProgress.max) * 100;
  const isOnline = upgrade.count > 0;

  return (
    <div className="transition-transform active:scale-[0.98]">
      <Button
        variant="outline"
        className={`w-full h-auto p-4 flex flex-col items-start gap-3 border-l-4 transition-all duration-200
          ${canAfford 
            ? `${styles.accentBorder} ${styles.cardTone} ${styles.hoverTone}`
            : 'border-l-muted opacity-50 cursor-not-allowed hover:bg-transparent'
          }`}
        disabled={!canAfford}
        onClick={() => onBuy(upgrade.id, quantity)}
      >
        <div className="flex items-start justify-between w-full">
          <div className="flex items-center gap-2">
            <span className={`font-bold text-lg font-display ${styles.accentText}`}>
              {upgrade.name}
            </span>
            {isOnline && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Zap className="w-2.5 h-2.5" />
                ONLINE
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {buyMode !== '1x' && !isOneTimeUnlock && (
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${styles.chipTone}`}>
                x{quantity}
              </span>
            )}
            <Badge variant="secondary" className="font-mono text-xs">Lvl {upgrade.count}</Badge>
          </div>
        </div>

        <div className="w-full grid grid-cols-2 gap-2 text-[10px] font-mono">
          <div className="rounded border border-border/50 bg-black/20 px-2 py-1.5">
            <p className="text-muted-foreground uppercase tracking-wider">Current</p>
            <p className={`${styles.previewText} mt-0.5 font-semibold truncate`}>{currentEffect}</p>
          </div>
          <div className="rounded border border-border/50 bg-black/20 px-2 py-1.5">
            <p className="text-muted-foreground uppercase tracking-wider">After Buy</p>
            <p className={`${styles.previewText} mt-0.5 font-semibold truncate`}>{afterBuyEffect}</p>
          </div>
        </div>

        <p className="text-xs text-left text-muted-foreground leading-relaxed whitespace-normal">
          {upgrade.description}
        </p>

        <div className={`text-xs font-mono font-bold ${canAfford ? 'text-emerald-400' : 'text-emerald-800'} w-full`}>
          <span>{getUpgradePreview(upgrade)}</span>
          {buyMode !== '1x' && upgrade.effect.type === 'production' && (
            <span className={`block mt-1 ${canAfford ? 'text-emerald-400' : 'text-emerald-800'}`}>
              Total: +{formatNumber(getBulkProductionGain(upgrade, quantity))} {toResourceLabel(upgrade.effect.resource || '')}/s
            </span>
          )}
          {!canAfford && missingCostLine && (
            <span className="block mt-1 text-rose-400/90">{missingCostLine}</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-1 w-full pt-2 border-t border-border/50">
          {Object.entries(totalCost).map(([res, cost]) => {
            const canAffordThis = resources[res as ResourceType].amount >= cost;
            const baseColor = res === 'data' ? 'text-cyan-400' : res === 'credits' ? 'text-yellow-400' : res === 'crypto' ? 'text-red-400' : 'text-foreground';
            const dimColor = res === 'data' ? 'text-cyan-800' : res === 'credits' ? 'text-yellow-800' : res === 'crypto' ? 'text-red-800' : 'text-gray-600';
            return (
              <span 
                key={res} 
                className={`text-xs font-mono ${canAffordThis ? baseColor : dimColor}`}
              >
                {formatNumber(cost)} {toResourceLabel(res)}
              </span>
            );
          })}
        </div>

        <div className="w-full mt-2 space-y-1">
          <div className="text-[10px] text-muted-foreground font-mono">
            Checkpoint: {checkpointProgress.current} / {checkpointProgress.max}
          </div>
          <div className="w-full bg-muted/40 rounded-full h-2 overflow-hidden border border-border/50">
            <div
              className={`h-full ${styles.progressGradient} transition-[width] duration-300`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className={`text-[10px] font-mono ${styles.previewText}`}>
            Next: 2x multiplier at lvl {checkpointProgress.nextCheckpoint}
          </div>
        </div>
      </Button>
    </div>
  );
});

UpgradeCard.displayName = 'UpgradeCard';

const UpgradeList = memo(({ category, upgrades, resources, onBuy, getUpgradePreview, buyMode, getBulkProductionGain }: { 
  category: string;
  upgrades: Upgrade[];
  resources: Record<ResourceType, Resource>;
  onBuy: (id: string, quantity?: number) => void;
  getUpgradePreview: (u: Upgrade) => string;
  buyMode: BuyMode;
  getBulkProductionGain: (upgrade: Upgrade, quantity: number) => number;
}) => {
  const filteredUpgrades = useMemo(() => 
    upgrades.filter(u => u.category === category && !(u.effect.type === 'unlock' && u.count > 0)),
    [upgrades, category]
  );

  return (
    <div className="space-y-4 pt-4 pb-4">
      {filteredUpgrades.map((upgrade) => (
        <UpgradeCard
          key={upgrade.id}
          upgrade={upgrade}
          category={category}
          resources={resources}
          onBuy={onBuy}
          getUpgradePreview={getUpgradePreview}
          buyMode={buyMode}
          getBulkProductionGain={getBulkProductionGain}
        />
      ))}
    </div>
  );
});

UpgradeList.displayName = 'UpgradeList';

export function UpgradePanel({ upgrades, resources, onBuy, playSound, getUpgradePreview, getBulkProductionGain, selectedBulkOption, onBulkOptionChange, contracts, onClaimContractReward, onRefreshContracts, totalCritChance = 0, ascensionLevel = 0, tutorialHighlight, activeUpgradeTab = 'fabrication', onSetActiveUpgradeTab }: UpgradePanelProps) {
  const buyMode: BuyMode = selectedBulkOption === 1 ? '1x' : selectedBulkOption === 10 ? '10x' : selectedBulkOption === 100 ? '100x' : 'MAX';
  const clickUnlocked = (upgrades.find(u => u.id === 'unlock_click_upgrades')?.count ?? 0) > 0;
  const cryptoMiningUnlocked = (upgrades.find(u => u.id === 'unlock_crypto_mining')?.count ?? 0) > 0;
  const totalUpgrades = upgrades.reduce((sum, u) => sum + u.count, 0);
  const jobsUnlocked = clickUnlocked && totalUpgrades >= 10;
  const completedContracts = contracts.activeContracts.filter(c => c.status === 'completed').length;
  const zeroDay = upgrades.find(u => u.id === 'zero_day');
  const exploitFinder = upgrades.find(u => u.id === 'exploit_finder');
  const hasZeroDay = zeroDay && zeroDay.count > 0;
  const hasExploitFinder = exploitFinder && exploitFinder.count > 0;
  const showCritChance = ascensionLevel > 0 || hasZeroDay || hasExploitFinder;
  const visibleUpgrades = useMemo(
    () => upgrades.filter(u => u.category === activeUpgradeTab && !(u.effect.type === 'unlock' && u.count > 0)),
    [upgrades, activeUpgradeTab]
  );
  const totalLevelsInTab = useMemo(
    () => visibleUpgrades.reduce((sum, u) => sum + u.count, 0),
    [visibleUpgrades]
  );
  const affordableInTab = useMemo(
    () => visibleUpgrades.filter((upgrade) => {
      const quantity = getQuantityForMode(upgrade, resources, buyMode, upgrade.effect.type === 'unlock');
      const totalCost = calculateUpgradeCost(upgrade, quantity);
      return Object.entries(totalCost).every(([key, cost]) => resources[key as ResourceType].amount >= cost);
    }).length,
    [visibleUpgrades, resources, buyMode]
  );
  const activeContracts = useMemo(
    () => contracts.activeContracts.filter(c => c.status !== 'claimed').length,
    [contracts.activeContracts]
  );

  const handleTabChange = (newTab: string) => {
    playSound('click');
    onSetActiveUpgradeTab?.(newTab);
  };

  return (
    <div className="w-96 bg-card/50 border-l border-border flex flex-col h-full backdrop-blur-md">
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-wider text-secondary">MARKET</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Upgrade Systems</p>
          </div>
          {showCritChance && (
            <div className="text-right">
              <div className="text-[9px] text-muted-foreground uppercase">Crit Chance</div>
              <div className="text-lg font-mono font-bold text-red-400">{(totalCritChance * 100).toFixed(1)}%</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded border border-cyan-500/20 bg-cyan-500/5 px-2 py-1.5">
            <p className="text-[9px] uppercase tracking-widest text-cyan-300/70">
              {activeUpgradeTab === 'contracts' ? 'Active' : 'Visible'}
            </p>
            <p className="text-sm font-mono font-semibold text-cyan-200">
              {activeUpgradeTab === 'contracts' ? activeContracts : visibleUpgrades.length}
            </p>
          </div>
          <div className="rounded border border-emerald-500/20 bg-emerald-500/5 px-2 py-1.5">
            <p className="text-[9px] uppercase tracking-widest text-emerald-300/70">
              {activeUpgradeTab === 'contracts' ? 'Ready' : 'Affordable'}
            </p>
            <p className="text-sm font-mono font-semibold text-emerald-200">
              {activeUpgradeTab === 'contracts' ? completedContracts : affordableInTab}
            </p>
          </div>
          <div className="rounded border border-amber-500/20 bg-amber-500/5 px-2 py-1.5">
            <p className="text-[9px] uppercase tracking-widest text-amber-300/70">
              {activeUpgradeTab === 'contracts' ? 'Completed' : 'Total Lvls'}
            </p>
            <p className="text-sm font-mono font-semibold text-amber-200">
              {activeUpgradeTab === 'contracts' ? contracts.totalContractsCompleted : totalLevelsInTab}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
          <div className="rounded border border-cyan-500/20 bg-cyan-500/5 px-2 py-1.5 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-cyan-300"><Database className="w-3 h-3" />Data</span>
            <span className="text-cyan-100">{formatNumber(Math.floor(resources.data.amount))}</span>
          </div>
          <div className="rounded border border-amber-500/20 bg-amber-500/5 px-2 py-1.5 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-amber-300"><Coins className="w-3 h-3" />Nodes</span>
            <span className="text-amber-100">{formatNumber(Math.floor(resources.credits.amount))}</span>
          </div>
          <div className="rounded border border-red-500/20 bg-red-500/5 px-2 py-1.5 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-red-300"><Bitcoin className="w-3 h-3" />Crypto</span>
            <span className="text-red-100">{formatNumber(Math.floor(resources.crypto.amount))}</span>
          </div>
        </div>
        
        <div className="flex gap-1">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onBulkOptionChange(1)}
            className={`flex-1 text-xs h-7 px-2 font-mono transition-all duration-200 ${selectedBulkOption === 1 ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-cyan-500/5 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/15'}`}
            data-testid="button-buy-1x"
          >
            1x
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onBulkOptionChange(10)}
            className={`flex-1 text-xs h-7 px-2 font-mono transition-all duration-200 ${selectedBulkOption === 10 ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-cyan-500/5 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/15'}`}
            data-testid="button-buy-10x"
          >
            10x
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onBulkOptionChange(100)}
            className={`flex-1 text-xs h-7 px-2 font-mono transition-all duration-200 ${selectedBulkOption === 100 ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-cyan-500/5 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/15'}`}
            data-testid="button-buy-100x"
          >
            100x
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onBulkOptionChange('max')}
            className={`flex-1 text-xs h-7 px-2 font-mono transition-all duration-200 ${selectedBulkOption === 'max' ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'bg-emerald-500/5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/15'}`}
            data-testid="button-buy-max"
          >
            MAX
          </Button>
        </div>
      </div>

      <Tabs value={activeUpgradeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 pt-4 shrink-0">
          <TabsList className={`w-full grid grid-cols-4 h-auto ${tutorialHighlight === 'upgrades' ? 'tutorial-highlight rounded' : ''}`}>
            <TabsTrigger value="fabrication" className="data-[state=active]:text-cyan-400 text-xs px-2 flex items-center gap-1">
              <Database className="w-3 h-3" />
              Factory
            </TabsTrigger>
            <TabsTrigger value="click_upgrades" disabled={!clickUnlocked} className={`text-xs px-2 flex items-center gap-1 ${!clickUnlocked ? "opacity-50 cursor-not-allowed data-[state=active]:text-yellow-500" : "data-[state=active]:text-yellow-500"}`}>
               {!clickUnlocked && <Lock className="w-3 h-3 mr-0.5 inline" />}
               {clickUnlocked && <Zap className="w-3 h-3" />}
               Click
            </TabsTrigger>
            <TabsTrigger 
              value="crypto_mining" 
              disabled={!cryptoMiningUnlocked} 
              className={`text-xs px-2 ${!cryptoMiningUnlocked ? "opacity-50 cursor-not-allowed flex items-center gap-0.5 data-[state=active]:text-red-500" : "text-red-500 data-[state=active]:text-red-500"} flex items-center gap-1`}
            >
              {!cryptoMiningUnlocked && <Lock className="w-3 h-3 text-red-500 shrink-0" />}
              {cryptoMiningUnlocked && <Bitcoin className="w-3 h-3 shrink-0" />}
              Mining
            </TabsTrigger>
            <TabsTrigger 
              value="contracts" 
              disabled={!jobsUnlocked}
              className={`data-[state=active]:text-cyan-400 text-xs px-2 relative ${!jobsUnlocked ? "opacity-50 cursor-not-allowed" : ""} ${tutorialHighlight === 'contracts' ? 'tutorial-highlight rounded' : ''}`}
            >
              {!jobsUnlocked && <Lock className="w-3 h-3 mr-0.5 inline" />}
              <FileText className="w-3 h-3 mr-0.5 inline" />
              Jobs
              {completedContracts > 0 && jobsUnlocked && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full text-[10px] flex items-center justify-center text-white">
                  {completedContracts}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden relative">
          <TabsContent value="fabrication" className="h-full mt-0 absolute inset-0">
            <ScrollArea className="h-full px-6">
              <UpgradeList category="fabrication" upgrades={upgrades} resources={resources} onBuy={onBuy} getUpgradePreview={getUpgradePreview} buyMode={buyMode} getBulkProductionGain={getBulkProductionGain} />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="click_upgrades" className="h-full mt-0 absolute inset-0">
            <ScrollArea className="h-full px-6">
              <UpgradeList category="click_upgrades" upgrades={upgrades} resources={resources} onBuy={onBuy} getUpgradePreview={getUpgradePreview} buyMode={buyMode} getBulkProductionGain={getBulkProductionGain} />
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="crypto_mining" className="h-full mt-0 absolute inset-0">
             <ScrollArea className="h-full px-6">
              <UpgradeList category="crypto_mining" upgrades={upgrades} resources={resources} onBuy={onBuy} getUpgradePreview={getUpgradePreview} buyMode={buyMode} getBulkProductionGain={getBulkProductionGain} />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="contracts" className="h-full mt-0 absolute inset-0 p-4">
            <ContractsTerminal 
              contracts={contracts}
              onClaimReward={onClaimContractReward}
              onRefresh={onRefreshContracts}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
