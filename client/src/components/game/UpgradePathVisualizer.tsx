import { Upgrade, ResourceType, Resource, formatNumber } from "@/lib/useGame";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { GitBranch, Cpu, Bitcoin, MousePointerClick, Filter, Zap, Lock } from "lucide-react";
import { useMemo, useState } from "react";

interface UpgradePathVisualizerProps {
  upgrades: Upgrade[];
  resources: Record<ResourceType, Resource>;
  buttonClassName?: string;
}

interface PathConfig {
  name: string;
  icon: typeof Cpu;
  color: "cyan" | "yellow" | "red";
  prerequisite?: string;
  tiers: { upgrades: string[]; label: string }[];
}

type PathKey = keyof typeof UPGRADE_PATHS;
type SelectedPath = "all" | PathKey;

interface PathNodeView {
  pathKey: PathKey;
  upgrade: Upgrade;
  tierIndex: number;
  tierLabel: string;
  isUnlocked: boolean;
  isAffordable: boolean;
  nextCosts: Partial<Record<ResourceType, number>>;
  missing: { resource: ResourceType; amount: number } | null;
  totalNextCost: number;
}

const toResourceLabel = (resource: string): string => (
  resource === "credits" ? "nodes" : resource
);

const UPGRADE_PATHS: Record<string, PathConfig> = {
  fabrication: {
    name: "Factory Path",
    icon: Cpu,
    color: "cyan",
    tiers: [
      { upgrades: ["data_miner_v1"], label: "Tier 1" },
      { upgrades: ["data_miner_v2"], label: "Tier 2" },
      { upgrades: ["botnet_node"], label: "Tier 3" },
      { upgrades: ["quantum_server"], label: "Tier 4" },
      { upgrades: ["ai_core"], label: "Tier 5" },
      { upgrades: ["neural_network"], label: "Tier 6" },
      { upgrades: ["singularity_nexus"], label: "Tier 7" },
    ],
  },
  click_upgrades: {
    name: "Click Path",
    icon: MousePointerClick,
    color: "yellow",
    prerequisite: "unlock_click_upgrades",
    tiers: [
      { upgrades: ["manual_override"], label: "Click Power" },
      { upgrades: ["exploit_finder"], label: "Crit Damage" },
      { upgrades: ["zero_day"], label: "Crit Chance" },
    ],
  },
  crypto_mining: {
    name: "Mining Path",
    icon: Bitcoin,
    color: "red",
    prerequisite: "unlock_crypto_mining",
    tiers: [
      { upgrades: ["crypto_rig_basic"], label: "Tier 1" },
      { upgrades: ["crypto_rig_advanced"], label: "Tier 2" },
      { upgrades: ["crypto_farm"], label: "Tier 3" },
      { upgrades: ["quantum_miner"], label: "Tier 4" },
      { upgrades: ["mining_datacenter"], label: "Tier 5" },
    ],
  },
};

const RESOURCE_TEXT_COLORS: Partial<Record<ResourceType, string>> = {
  data: "text-cyan-300",
  credits: "text-amber-300",
  crypto: "text-red-300",
  silicon: "text-violet-300",
  interest: "text-emerald-300",
  prestige: "text-fuchsia-300",
};

const PATH_THEME: Record<PathKey, {
  accentText: string;
  border: string;
  bg: string;
  chip: string;
  icon: string;
  progress: string;
}> = {
  fabrication: {
    accentText: "text-cyan-300",
    border: "border-cyan-500/35",
    bg: "bg-cyan-500/5",
    chip: "bg-cyan-500/10 text-cyan-200 border-cyan-500/30",
    icon: "text-cyan-300",
    progress: "from-cyan-500 to-blue-500",
  },
  click_upgrades: {
    accentText: "text-yellow-300",
    border: "border-yellow-500/35",
    bg: "bg-yellow-500/5",
    chip: "bg-yellow-500/10 text-yellow-200 border-yellow-500/30",
    icon: "text-yellow-300",
    progress: "from-yellow-500 to-amber-500",
  },
  crypto_mining: {
    accentText: "text-red-300",
    border: "border-red-500/35",
    bg: "bg-red-500/5",
    chip: "bg-red-500/10 text-red-200 border-red-500/30",
    icon: "text-red-300",
    progress: "from-red-500 to-rose-500",
  },
};

const getNextCosts = (upgrade: Upgrade): Partial<Record<ResourceType, number>> => {
  const costs: Partial<Record<ResourceType, number>> = {};
  for (const [resource, baseCost] of Object.entries(upgrade.baseCost)) {
    const key = resource as ResourceType;
    const scaled = Math.floor((baseCost as number) * Math.pow(upgrade.costMultiplier, upgrade.count));
    costs[key] = Math.max(1, scaled);
  }
  return costs;
};

const getMissingCost = (
  costs: Partial<Record<ResourceType, number>>,
  resources: Record<ResourceType, Resource>,
): { resource: ResourceType; amount: number } | null => {
  let biggest: { resource: ResourceType; amount: number } | null = null;
  for (const [resource, cost] of Object.entries(costs)) {
    const key = resource as ResourceType;
    const missing = (cost || 0) - (resources[key]?.amount || 0);
    if (missing > 0 && (!biggest || missing > biggest.amount)) {
      biggest = { resource: key, amount: missing };
    }
  }
  return biggest;
};

const isAffordable = (
  costs: Partial<Record<ResourceType, number>>,
  resources: Record<ResourceType, Resource>,
): boolean => {
  for (const [resource, cost] of Object.entries(costs)) {
    const key = resource as ResourceType;
    if ((resources[key]?.amount || 0) < (cost || 0)) return false;
  }
  return true;
};

const getEffectLabel = (upgrade: Upgrade): string => {
  if (upgrade.effect.type === "production" && upgrade.effect.resource) {
    return `+${formatNumber(upgrade.effect.value)} ${upgrade.effect.resource}/lvl`;
  }
  if (upgrade.effect.type === "click") return `+${formatNumber(upgrade.effect.value)} click/lvl`;
  if (upgrade.effect.type === "click_multiplier") return `+${(upgrade.effect.value * 100).toFixed(0)}% click mult/lvl`;
  if (upgrade.effect.type === "crit_chance") return `+${(upgrade.effect.value * 100).toFixed(1)}% crit/lvl`;
  if (upgrade.effect.type === "crit_multiplier") return `+${upgrade.effect.value}x crit dmg/lvl`;
  if (upgrade.effect.type === "interest_boost") return `+${upgrade.effect.value} interest/lvl`;
  if (upgrade.effect.type === "unlock") return "Path unlock";
  return "Upgrade";
};

const buildPathNodes = (
  pathKey: PathKey,
  upgrades: Upgrade[],
  resources: Record<ResourceType, Resource>,
): PathNodeView[] => {
  const path = UPGRADE_PATHS[pathKey];
  const prerequisiteUnlocked = path.prerequisite
    ? (upgrades.find((upgrade) => upgrade.id === path.prerequisite)?.count ?? 0) > 0
    : true;

  const nodes: PathNodeView[] = [];
  path.tiers.forEach((tier, tierIndex) => {
    const previousTierPurchased = tierIndex === 0
      || path.tiers[tierIndex - 1].upgrades.some((id) => (upgrades.find((upgrade) => upgrade.id === id)?.count ?? 0) > 0);
    const unlockedByTier = prerequisiteUnlocked && previousTierPurchased;

    tier.upgrades.forEach((id) => {
      const upgrade = upgrades.find((item) => item.id === id);
      if (!upgrade) return;

      const nextCosts = getNextCosts(upgrade);
      const missing = getMissingCost(nextCosts, resources);
      const totalNextCost = Object.values(nextCosts).reduce((sum, value) => sum + (value || 0), 0);

      nodes.push({
        pathKey,
        upgrade,
        tierIndex,
        tierLabel: tier.label,
        isUnlocked: unlockedByTier,
        isAffordable: unlockedByTier && isAffordable(nextCosts, resources),
        nextCosts,
        missing,
        totalNextCost,
      });
    });
  });

  return nodes;
};

function PathSection({
  pathKey,
  nodes,
  unlockedOnly,
}: {
  pathKey: PathKey;
  nodes: PathNodeView[];
  unlockedOnly: boolean;
}) {
  const path = UPGRADE_PATHS[pathKey];
  const theme = PATH_THEME[pathKey];
  const Icon = path.icon;

  const filteredNodes = unlockedOnly ? nodes.filter((node) => node.isUnlocked) : nodes;
  const unlockedCount = nodes.filter((node) => node.isUnlocked).length;
  const affordableCount = nodes.filter((node) => node.isAffordable).length;
  const progressPct = nodes.length > 0
    ? Math.round((nodes.filter((node) => node.upgrade.count > 0).length / nodes.length) * 100)
    : 0;

  return (
    <section className={`rounded-lg border p-4 ${theme.border} ${theme.bg}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${theme.icon}`} />
          <h3 className={`text-sm font-bold tracking-wide ${theme.accentText}`}>{path.name}</h3>
        </div>
        <div className="text-right text-[10px] text-muted-foreground">
          <p>{unlockedCount}/{nodes.length} unlocked</p>
          <p>{affordableCount} affordable now</p>
        </div>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
        <motion.div
          className={`h-full bg-gradient-to-r ${theme.progress}`}
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">{progressPct}% path activation</p>

      <div className="mt-3 space-y-2">
        {filteredNodes.length === 0 && (
          <div className="rounded border border-muted/40 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
            No nodes match current filter.
          </div>
        )}

        {filteredNodes.map((node) => {
          const statusLabel = !node.isUnlocked
            ? "Locked"
            : node.isAffordable
              ? "Can Upgrade"
              : "Missing Resources";
          const statusClass = !node.isUnlocked
            ? "text-slate-400 border-slate-600/40 bg-slate-700/20"
            : node.isAffordable
              ? "text-emerald-300 border-emerald-500/40 bg-emerald-500/10"
              : "text-amber-300 border-amber-500/35 bg-amber-500/10";

          return (
            <div
              key={`${pathKey}-${node.upgrade.id}`}
              className="rounded-md border border-border/50 bg-slate-950/55 p-3"
              data-testid={`upgrade-node-${node.upgrade.id}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-100">{node.upgrade.name}</p>
                  <p className="text-[10px] text-muted-foreground">{node.tierLabel}</p>
                </div>
                <span className={`rounded border px-2 py-0.5 text-[10px] font-mono ${statusClass}`}>
                  {statusLabel}
                </span>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                <div className="rounded border border-border/50 bg-background/40 px-2 py-1">
                  <p className="uppercase tracking-wide text-muted-foreground">Level</p>
                  <p className="font-mono text-cyan-200">{node.upgrade.count}</p>
                </div>
                <div className="rounded border border-border/50 bg-background/40 px-2 py-1">
                  <p className="uppercase tracking-wide text-muted-foreground">Effect</p>
                  <p className="truncate text-cyan-200">{getEffectLabel(node.upgrade)}</p>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                {Object.entries(node.nextCosts).map(([resource, cost]) => (
                  <span
                    key={`${node.upgrade.id}-${resource}`}
                    className={`rounded border border-border/50 bg-background/50 px-1.5 py-0.5 text-[10px] font-mono ${RESOURCE_TEXT_COLORS[resource as ResourceType] || "text-slate-200"}`}
                  >
                    {formatNumber(cost || 0)} {toResourceLabel(resource)}
                  </span>
                ))}
              </div>

              {node.isUnlocked && !node.isAffordable && node.missing && (
                <p className="mt-2 text-[10px] text-amber-300">
                  Need {formatNumber(Math.floor(node.missing.amount))} more {toResourceLabel(node.missing.resource)}
                </p>
              )}
              {!node.isUnlocked && (
                <p className="mt-2 text-[10px] text-slate-400">
                  Unlock previous tier to activate this node.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function UpgradePathVisualizer({ upgrades, resources, buttonClassName }: UpgradePathVisualizerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState<SelectedPath>("all");
  const [showUnlockedOnly, setShowUnlockedOnly] = useState(false);

  const pathKeys = useMemo(() => Object.keys(UPGRADE_PATHS) as PathKey[], []);

  const nodesByPath = useMemo(() => {
    const result = {} as Record<PathKey, PathNodeView[]>;
    pathKeys.forEach((key) => {
      result[key] = buildPathNodes(key, upgrades, resources);
    });
    return result;
  }, [pathKeys, upgrades, resources]);

  const allNodes = useMemo(
    () => pathKeys.flatMap((key) => nodesByPath[key]),
    [nodesByPath, pathKeys],
  );

  const unlockedNodes = useMemo(
    () => allNodes.filter((node) => node.isUnlocked),
    [allNodes],
  );

  const priorityNodes = useMemo(() => {
    return [...unlockedNodes]
      .sort((a, b) => {
        if (a.isAffordable !== b.isAffordable) return a.isAffordable ? -1 : 1;
        const missingA = a.missing?.amount ?? 0;
        const missingB = b.missing?.amount ?? 0;
        if (missingA !== missingB) return missingA - missingB;
        return a.totalNextCost - b.totalNextCost;
      })
      .slice(0, 5);
  }, [unlockedNodes]);

  const purchasedLevelTotal = useMemo(
    () => upgrades.filter((upgrade) => upgrade.effect.type !== "unlock").reduce((sum, upgrade) => sum + upgrade.count, 0),
    [upgrades],
  );

  const affordableNowCount = useMemo(
    () => unlockedNodes.filter((node) => node.isAffordable).length,
    [unlockedNodes],
  );

  const activePathKeys = selectedPath === "all" ? pathKeys : [selectedPath];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 border-purple-500/50 text-purple-400 hover:bg-purple-500/10 hover:border-purple-500 ${buttonClassName || ""}`}
          data-testid="button-upgrade-path"
        >
          <GitBranch className="h-4 w-4" />
          Upgrade Paths
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-5xl max-h-[88vh] bg-background/95 backdrop-blur-xl border-purple-500/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-purple-300 font-display tracking-wide">
            <GitBranch className="h-5 w-5" />
            Machine Upgrade Paths
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[72vh] pr-3">
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="rounded border border-cyan-500/30 bg-cyan-500/10 p-2">
                <p className="text-[10px] uppercase tracking-wide text-cyan-300/80">Nodes</p>
                <p className="text-sm font-mono text-cyan-200">{allNodes.length}</p>
              </div>
              <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-2">
                <p className="text-[10px] uppercase tracking-wide text-emerald-300/80">Unlocked</p>
                <p className="text-sm font-mono text-emerald-200">{unlockedNodes.length}</p>
              </div>
              <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2">
                <p className="text-[10px] uppercase tracking-wide text-amber-300/80">Affordable</p>
                <p className="text-sm font-mono text-amber-200">{affordableNowCount}</p>
              </div>
              <div className="rounded border border-fuchsia-500/30 bg-fuchsia-500/10 p-2">
                <p className="text-[10px] uppercase tracking-wide text-fuchsia-300/80">Total Levels</p>
                <p className="text-sm font-mono text-fuchsia-200">{formatNumber(purchasedLevelTotal)}</p>
              </div>
            </div>

            <div className="rounded border border-border/60 bg-background/60 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedPath("all")}
                  className={selectedPath === "all" ? "bg-purple-500/20 border-purple-400/60 text-purple-200" : ""}
                >
                  All Paths
                </Button>
                {pathKeys.map((key) => {
                  const path = UPGRADE_PATHS[key];
                  return (
                    <Button
                      key={key}
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedPath(key)}
                      className={selectedPath === key ? "bg-purple-500/20 border-purple-400/60 text-purple-200" : ""}
                    >
                      {path.name}
                    </Button>
                  );
                })}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowUnlockedOnly((value) => !value)}
                  className={`ml-auto gap-1 ${showUnlockedOnly ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-200" : ""}`}
                >
                  <Filter className="h-3.5 w-3.5" />
                  Unlocked Only
                </Button>
              </div>
            </div>

            <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-300" />
                <p className="text-sm font-semibold text-amber-200">Priority Queue</p>
              </div>
              <div className="space-y-1.5">
                {priorityNodes.length === 0 && (
                  <p className="text-xs text-slate-400">No unlocked upgrades yet.</p>
                )}
                {priorityNodes.map((node) => {
                  const pathName = UPGRADE_PATHS[node.pathKey].name;
                  return (
                    <div key={`priority-${node.pathKey}-${node.upgrade.id}`} className="flex items-center justify-between rounded border border-amber-500/20 bg-slate-950/60 px-2 py-1">
                      <div className="min-w-0">
                        <p className="truncate text-xs text-amber-100">{node.upgrade.name}</p>
                        <p className="text-[10px] text-slate-400">{pathName} • Lvl {node.upgrade.count}</p>
                      </div>
                      {node.isAffordable ? (
                        <span className="text-[10px] text-emerald-300">Ready</span>
                      ) : node.missing ? (
                        <span className="text-[10px] text-amber-300">
                          Need {formatNumber(Math.floor(node.missing.amount))} {toResourceLabel(node.missing.resource)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          Locked
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={`grid gap-3 ${activePathKeys.length === 1 ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3"}`}>
              {activePathKeys.map((key) => (
                <PathSection
                  key={`section-${key}`}
                  pathKey={key}
                  nodes={nodesByPath[key]}
                  unlockedOnly={showUnlockedOnly}
                />
              ))}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
