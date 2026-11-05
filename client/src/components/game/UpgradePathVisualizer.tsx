import { Upgrade, ResourceType, Resource, formatNumber } from "@/lib/useGame";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { GitBranch, Cpu, Bitcoin, MousePointerClick, Filter, Zap, Lock } from "lucide-react";
import { useMemo, useState } from "react";
import { localizeInlineText, localizeText, useI18n, type Language } from "@/lib/i18n";

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

const UPGRADE_PATHS = {
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
      { upgrades: ["overclock_core"], label: "Tier 8" },
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
      { upgrades: ["overclock_rig"], label: "Tier 6" },
    ],
  },
} as const satisfies Record<string, PathConfig>;

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

const RESOURCE_TEXT_COLORS: Partial<Record<ResourceType, string>> = {
  data: "text-cyan-300",
  credits: "text-amber-300",
  crypto: "text-red-300",
  silicon: "text-violet-300",
  prestige: "text-fuchsia-300",
};

const PATH_THEME: Record<
  PathKey,
  {
    accentText: string;
    border: string;
    bg: string;
    chip: string;
    icon: string;
    progress: string;
  }
> = {
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

const localizePathUiText = (language: Language, en: string, tr: string, ptBR: string, es?: string, ru?: string, zh?: string): string =>
  language === "zh-CN" && zh ? zh : localizeInlineText(language, en, tr, ptBR, es, ru);

const toResourceLabel = (resource: string, language: Language): string => {
  if (resource === "credits") return localizePathUiText(language, "nodes", "dizin", "nodes", "nodos", "узлы", "节点");
  if (resource === "crypto") return localizePathUiText(language, "crypto", "kripto", "cripto", "cripto", "крипта", "加密币");
  if (resource === "data") return localizePathUiText(language, "data", "veri", "dados", "datos", "данные", "数据");
  if (resource === "prestige") return localizePathUiText(language, "crown", "taç", "coroa", "corona", "корона", "王冠");
  return resource;
};

const getPathName = (pathKey: PathKey, language: Language): string => {
  if (language === "tr") {
    if (pathKey === "fabrication") return "Fabrika Hatti";
    if (pathKey === "click_upgrades") return "Tıklama Hattı";
    return "Madencilik Hatti";
  }
  if (language === "pt-BR") {
    if (pathKey === "fabrication") return "Rota de Produção";
    if (pathKey === "click_upgrades") return "Rota de Clique";
    return "Rota de Mineração";
  }
  if (language === "es") {
    if (pathKey === "fabrication") return "Ruta de Producción";
    if (pathKey === "click_upgrades") return "Ruta de Clic";
    return "Ruta de Minería";
  }
  if (language === "ru") {
    if (pathKey === "fabrication") return "Линия производства";
    if (pathKey === "click_upgrades") return "Линия клика";
    return "Линия майнинга";
  }
  if (language === "zh-CN") {
    if (pathKey === "fabrication") return "生产路线";
    if (pathKey === "click_upgrades") return "点击路线";
    return "挖矿路线";
  }
  return UPGRADE_PATHS[pathKey].name;
};

const getTierLabel = (pathKey: PathKey, tierLabel: string, language: Language): string => {
  if (language === "en") return tierLabel;
  if (language === "tr" && tierLabel.startsWith("Tier ")) return `Kademe ${tierLabel.replace("Tier ", "")}`;
  if (language === "pt-BR" && tierLabel.startsWith("Tier ")) return `Nível ${tierLabel.replace("Tier ", "")}`;
  if (language === "es" && tierLabel.startsWith("Tier ")) return `Nivel ${tierLabel.replace("Tier ", "")}`;
  if (language === "ru" && tierLabel.startsWith("Tier ")) return `Уровень ${tierLabel.replace("Tier ", "")}`;
  if (language === "zh-CN" && tierLabel.startsWith("Tier ")) return `阶段 ${tierLabel.replace("Tier ", "")}`;
  if (pathKey === "click_upgrades") {
    if (tierLabel === "Click Power") return localizePathUiText(language, tierLabel, "Tıklama Gücü", "Poder de Clique", "Poder de Clic", "Сила клика", "点击威力");
    if (tierLabel === "Crit Damage") return localizePathUiText(language, tierLabel, "Kritik Hasar", "Dano Crítico", "Daño Crítico", "Критический урон", "暴击伤害");
    if (tierLabel === "Crit Chance") return localizePathUiText(language, tierLabel, "Kritik Şans", "Chance Crítica", "Prob. Crítica", "Шанс крита", "暴击率");
  }
  return tierLabel;
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

const getEffectLabel = (upgrade: Upgrade, language: Language): string => {
  if (upgrade.effect.type === "production" && upgrade.effect.resource) {
    if (language === "tr") return `+${formatNumber(upgrade.effect.value)} ${toResourceLabel(upgrade.effect.resource, language)}/sv`;
    if (language === "pt-BR") return `+${formatNumber(upgrade.effect.value)} ${toResourceLabel(upgrade.effect.resource, language)}/nvl`;
    if (language === "es") return `+${formatNumber(upgrade.effect.value)} ${toResourceLabel(upgrade.effect.resource, language)}/nv`;
    if (language === "ru") return `+${formatNumber(upgrade.effect.value)} ${toResourceLabel(upgrade.effect.resource, language)}/ур`;
    if (language === "zh-CN") return `每级 +${formatNumber(upgrade.effect.value)} ${toResourceLabel(upgrade.effect.resource, language)}`;
    return `+${formatNumber(upgrade.effect.value)} ${upgrade.effect.resource}/lvl`;
  }
  if (upgrade.effect.type === "click") return localizePathUiText(language, `+${formatNumber(upgrade.effect.value)} click/lvl`, `+${formatNumber(upgrade.effect.value)} tık/sv`, `+${formatNumber(upgrade.effect.value)} clique/nvl`, `+${formatNumber(upgrade.effect.value)} clic/nv`, `+${formatNumber(upgrade.effect.value)} клик/ур`, `每级 +${formatNumber(upgrade.effect.value)} 点击`);
  if (upgrade.effect.type === "click_multiplier") return localizePathUiText(language, `+${(upgrade.effect.value * 100).toFixed(0)}% click mult/lvl`, `+${(upgrade.effect.value * 100).toFixed(0)}% tık çarpanı/sv`, `+${(upgrade.effect.value * 100).toFixed(0)}% mult. de clique/nvl`, `+${(upgrade.effect.value * 100).toFixed(0)}% mult. de clic/nv`, `+${(upgrade.effect.value * 100).toFixed(0)}% множ. клика/ур`, `每级 +${(upgrade.effect.value * 100).toFixed(0)}% 点击倍率`);
  if (upgrade.effect.type === "crit_chance") return localizePathUiText(language, `+${(upgrade.effect.value * 100).toFixed(1)}% crit/lvl`, `+${(upgrade.effect.value * 100).toFixed(1)}% krit/sv`, `+${(upgrade.effect.value * 100).toFixed(1)}% crit/nvl`, `+${(upgrade.effect.value * 100).toFixed(1)}% crít./nv`, `+${(upgrade.effect.value * 100).toFixed(1)}% крит/ур`, `每级 +${(upgrade.effect.value * 100).toFixed(1)}% 暴击率`);
  if (upgrade.effect.type === "crit_multiplier") return localizePathUiText(language, `+${upgrade.effect.value}x crit dmg/lvl`, `+${upgrade.effect.value}x krit hasar/sv`, `+${upgrade.effect.value}x dano crítico/nvl`, `+${upgrade.effect.value}x daño crít./nv`, `+${upgrade.effect.value}x крит. урон/ур`, `每级 +${upgrade.effect.value}x 暴击伤害`);
  if (upgrade.effect.type === "unlock") return localizePathUiText(language, "Path unlock", "Hat kilidi", "Desbloqueio de rota", "Desbloqueo de ruta", "Открытие линии", "路线解锁");
  return localizePathUiText(language, "Upgrade", "Yükseltme", "Melhoria", "Mejora", "Улучшение", "升级");
};

const buildPathNodes = (
  pathKey: PathKey,
  upgrades: Upgrade[],
  resources: Record<ResourceType, Resource>,
): PathNodeView[] => {
  const path = UPGRADE_PATHS[pathKey];
  const prerequisiteId = "prerequisite" in path ? path.prerequisite : undefined;
  const prerequisiteUnlocked = prerequisiteId
    ? (upgrades.find((upgrade) => upgrade.id === prerequisiteId)?.count ?? 0) > 0
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
  const { language } = useI18n();
  const theme = PATH_THEME[pathKey];
  const Icon = UPGRADE_PATHS[pathKey].icon;

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
          <h3 className={`text-sm font-bold tracking-wide ${theme.accentText}`}>{getPathName(pathKey, language)}</h3>
        </div>
        <div className="text-right text-[10px] text-muted-foreground">
          <p>{unlockedCount}/{nodes.length} {localizePathUiText(language, "unlocked", "açık", "desbloqueados", "desbloqueadas", "открыто", "已解锁")}</p>
          <p>{affordableCount} {localizePathUiText(language, "affordable now", "şu an alınabilir", "disponíveis agora", "asequibles ahora", "доступно сейчас", "当前可购买")}</p>
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
      <p className="mt-1 text-[10px] text-muted-foreground">
        {progressPct}% {localizePathUiText(language, "path activation", "hat etkinliği", "ativação da rota", "activación de la ruta", "активации линии", "路线激活度")}
      </p>

      <div className="mt-3 space-y-2">
        {filteredNodes.length === 0 && (
          <div className="rounded border border-muted/40 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
            {localizePathUiText(language, "No upgrades match the current filter.", "Bu filtreye uyan yükseltme yok.", "Nenhuma melhoria corresponde ao filtro atual.", "Ninguna mejora coincide con el filtro actual.", "Нет улучшений под текущий фильтр.", "没有符合当前筛选条件的升级。")}
          </div>
        )}

        {filteredNodes.map((node) => {
          const statusLabel = !node.isUnlocked
            ? localizePathUiText(language, "Locked", "Kilitli", "Bloqueado", "Bloqueado", "Заблокировано", "已锁定")
            : node.isAffordable
              ? localizePathUiText(language, "Can Upgrade", "Yükseltilebilir", "Pode melhorar", "Se puede mejorar", "Можно улучшить", "可升级")
              : localizePathUiText(language, "Missing Resources", "Kaynak Eksik", "Faltam recursos", "Faltan recursos", "Не хватает ресурсов", "资源不足");
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
                  <p className="text-[10px] text-muted-foreground">{getTierLabel(pathKey, node.tierLabel, language)}</p>
                </div>
                <span className={`rounded border px-2 py-0.5 text-[10px] font-mono ${statusClass}`}>
                  {statusLabel}
                </span>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                <div className="rounded border border-border/50 bg-background/40 px-2 py-1">
                  <p className="uppercase tracking-wide text-muted-foreground">{localizePathUiText(language, "Level", "Seviye", "Nível", "Nivel", "Уровень", "等级")}</p>
                  <p className="font-mono text-cyan-200">{node.upgrade.count}</p>
                </div>
                <div className="rounded border border-border/50 bg-background/40 px-2 py-1">
                  <p className="uppercase tracking-wide text-muted-foreground">{localizePathUiText(language, "Effect", "Etki", "Efeito", "Efecto", "Эффект", "效果")}</p>
                  <p className="truncate text-cyan-200">{getEffectLabel(node.upgrade, language)}</p>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                {Object.entries(node.nextCosts).map(([resource, cost]) => (
                  <span
                    key={`${node.upgrade.id}-${resource}`}
                    className={`rounded border border-border/50 bg-background/50 px-1.5 py-0.5 text-[10px] font-mono ${RESOURCE_TEXT_COLORS[resource as ResourceType] || "text-slate-200"}`}
                  >
                    {formatNumber(cost || 0)} {toResourceLabel(resource, language)}
                  </span>
                ))}
              </div>

              {node.isUnlocked && !node.isAffordable && node.missing && (
                <p className="mt-2 text-[10px] text-amber-300">
                  {language === "tr"
                    ? `${formatNumber(Math.floor(node.missing.amount))} ${toResourceLabel(node.missing.resource, language)} daha gerekli`
                    : language === "pt-BR"
                      ? `Faltam ${formatNumber(Math.floor(node.missing.amount))} ${toResourceLabel(node.missing.resource, language)}`
                      : language === "es"
                        ? `Faltan ${formatNumber(Math.floor(node.missing.amount))} ${toResourceLabel(node.missing.resource, language)}`
                        : language === "ru"
                          ? `Нужно ещё ${formatNumber(Math.floor(node.missing.amount))} ${toResourceLabel(node.missing.resource, language)}`
                          : language === "zh-CN"
                            ? `还需要 ${formatNumber(Math.floor(node.missing.amount))} ${toResourceLabel(node.missing.resource, language)}`
                            : `Need ${formatNumber(Math.floor(node.missing.amount))} more ${toResourceLabel(node.missing.resource, language)}`}
                </p>
              )}
              {!node.isUnlocked && (
                <p className="mt-2 text-[10px] text-slate-400">
                  {localizePathUiText(language, "Unlock the previous tier to activate this upgrade.", "Bu yükseltmeyi etkinleştirmek için önceki kademeyi aç.", "Desbloqueie o nível anterior para ativar esta melhoria.", "Desbloquea el nivel anterior para activar esta mejora.", "Открой предыдущий уровень, чтобы активировать это улучшение.", "解锁上一阶段以激活此升级。")}
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
  const { language } = useI18n();
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
          {localizePathUiText(language, "Upgrade Paths", "Yükseltme Hatları", "Rotas de Melhoria", "Rutas de Mejora", "Линии улучшений", "升级路线")}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-5xl max-h-[88vh] bg-background/95 backdrop-blur-xl border-purple-500/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-purple-300 font-display tracking-wide">
            <GitBranch className="h-5 w-5" />
            {localizePathUiText(language, "Machine Upgrade Paths", "Makine Yükseltme Hatları", "Rotas de Melhoria das Máquinas", "Rutas de Mejora de Máquinas", "Линии улучшения машин", "机器升级路线")}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[72vh] pr-3">
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="rounded border border-cyan-500/30 bg-cyan-500/10 p-2">
                <p className="text-[10px] uppercase tracking-wide text-cyan-300/80">{localizePathUiText(language, "Upgrades", "Yükseltmeler", "Melhorias", "Mejoras", "Улучшения", "升级")}</p>
                <p className="text-sm font-mono text-cyan-200">{allNodes.length}</p>
              </div>
              <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-2">
                <p className="text-[10px] uppercase tracking-wide text-emerald-300/80">{localizePathUiText(language, "Unlocked", "Açık", "Desbloqueados", "Desbloqueadas", "Открыто", "已解锁")}</p>
                <p className="text-sm font-mono text-emerald-200">{unlockedNodes.length}</p>
              </div>
              <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2">
                <p className="text-[10px] uppercase tracking-wide text-amber-300/80">{localizePathUiText(language, "Affordable", "Alınabilir", "Acessiveis", "Asequibles", "Доступно", "可购买")}</p>
                <p className="text-sm font-mono text-amber-200">{affordableNowCount}</p>
              </div>
              <div className="rounded border border-fuchsia-500/30 bg-fuchsia-500/10 p-2">
                <p className="text-[10px] uppercase tracking-wide text-fuchsia-300/80">{localizePathUiText(language, "Total Levels", "Toplam Seviye", "Níveis Totais", "Niveles totales", "Всего уровней", "总等级")}</p>
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
                  {localizePathUiText(language, "All Paths", "Tüm Hatlar", "Todas as Rotas", "Todas las rutas", "Все линии", "全部路线")}
                </Button>
                {pathKeys.map((key) => (
                  <Button
                    key={key}
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedPath(key)}
                    className={selectedPath === key ? "bg-purple-500/20 border-purple-400/60 text-purple-200" : ""}
                  >
                    {getPathName(key, language)}
                  </Button>
                ))}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowUnlockedOnly((value) => !value)}
                  className={`ml-auto gap-1 ${showUnlockedOnly ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-200" : ""}`}
                >
                  <Filter className="h-3.5 w-3.5" />
                  {localizePathUiText(language, "Unlocked Only", "Sadece Açıklar", "Somente Desbloqueados", "Solo desbloqueadas", "Только открытые", "仅已解锁")}
                </Button>
              </div>
            </div>

            <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-300" />
                <p className="text-sm font-semibold text-amber-200">{localizePathUiText(language, "Priority Queue", "Öncelik Sırası", "Fila Prioritaria", "Cola de prioridad", "Очередь приоритетов", "优先队列")}</p>
              </div>
              <div className="space-y-1.5">
                {priorityNodes.length === 0 && (
                  <p className="text-xs text-slate-400">{localizePathUiText(language, "No unlocked upgrades yet.", "Henüz açık yükseltme yok.", "Ainda não há melhorias desbloqueadas.", "Aún no hay mejoras desbloqueadas.", "Пока нет открытых улучшений.", "尚无已解锁的升级。")}</p>
                )}
                {priorityNodes.map((node) => {
                  const pathName = getPathName(node.pathKey, language);
                  return (
                    <div key={`priority-${node.pathKey}-${node.upgrade.id}`} className="flex items-center justify-between rounded border border-amber-500/20 bg-slate-950/60 px-2 py-1">
                      <div className="min-w-0">
                        <p className="truncate text-xs text-amber-100">{node.upgrade.name}</p>
                        <p className="text-[10px] text-slate-400">{pathName} • {localizePathUiText(language, "Lvl", "Sv", "Nvl", "Nv", "Ур.", "等级")} {node.upgrade.count}</p>
                      </div>
                      {node.isAffordable ? (
                        <span className="text-[10px] text-emerald-300">{localizePathUiText(language, "Ready", "Hazır", "Pronto", "Listo", "Готово", "就绪")}</span>
                      ) : node.missing ? (
                        <span className="text-[10px] text-amber-300">
                          {language === "tr"
                            ? `${formatNumber(Math.floor(node.missing.amount))} ${toResourceLabel(node.missing.resource, language)} eksik`
                            : language === "pt-BR"
                              ? `Faltam ${formatNumber(Math.floor(node.missing.amount))} ${toResourceLabel(node.missing.resource, language)}`
                              : language === "ru"
                                ? `Нужно ${formatNumber(Math.floor(node.missing.amount))} ${toResourceLabel(node.missing.resource, language)}`
                              : `Need ${formatNumber(Math.floor(node.missing.amount))} ${toResourceLabel(node.missing.resource, language)}`}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          {localizePathUiText(language, "Locked", "Kilitli", "Bloqueado", "Bloqueado", "Заблокировано", "已锁定")}
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
