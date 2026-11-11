import { memo } from "react";
import { Target } from "lucide-react";
import { formatNumber, getAscensionCost, AUTOMATION_UNLOCK_ASCENSION, CHALLENGE_UNLOCK_ASCENSION, FINALE_UNLOCK_ASCENSION, CRYPTO_RELIC_SHOP_UNLOCK_ASCENSION, BLACK_MARKET_UNLOCK_ASCENSION, PARAGON_LAB_UNLOCK_ASCENSION, type Resource, type ResourceType, type Upgrade } from "@/lib/useGame";
import type { Language } from "@/lib/i18n";
import { getBossVariant, BOSS_MODIFIERS } from "@/lib/bossVariants";
import { getResourceLabel } from "@/lib/gameText";

// v1.03: always-visible "Next goal" card (next unlock / purchase milestone + ETA) for the first hours.
type L6 = [en: string, tr: string, pt: string, es: string, ru: string, zh: string];
const pick = (language: Language, t: L6): string =>
  language === "tr" ? t[1] : language === "pt-BR" ? t[2] : language === "es" ? t[3] : language === "ru" ? t[4] : language === "zh-CN" ? t[5] : t[0];

export type AscensionMilestone = { at: number; label: L6 };

export const ASCENSION_MILESTONES: AscensionMilestone[] = [
  { at: CRYPTO_RELIC_SHOP_UNLOCK_ASCENSION, label: ["Relic Shop", "Relik Dükkanı", "Loja de Relíquias", "Tienda de Reliquias", "Лавка реликвий", "遗物商店"] },
  { at: BLACK_MARKET_UNLOCK_ASCENSION, label: ["Black Market", "Kara Borsa", "Mercado Negro", "Mercado Negro", "Чёрный рынок", "黑市"] },
  { at: AUTOMATION_UNLOCK_ASCENSION, label: ["Automation", "Otomasyon", "Automação", "Automatización", "Автоматизация", "自动化"] },
  { at: PARAGON_LAB_UNLOCK_ASCENSION, label: ["Paragon Lab", "Paragon Laboratuvarı", "Laboratório Paragon", "Laboratorio Paragon", "Лаборатория Paragon", "Paragon 实验室"] },
  { at: 25, label: ["Paragon II modules", "Paragon II modülleri", "Módulos Paragon II", "Módulos Paragon II", "Модули Paragon II", "Paragon II 模块"] },
  { at: CHALLENGE_UNLOCK_ASCENSION, label: ["Challenges", "Meydan Okumalar", "Desafios", "Desafíos", "Испытания", "挑战"] },
  { at: 40, label: ["Overclock upgrades", "Hız aşırtma yükseltmeleri", "Melhorias de Overclock", "Mejoras de Overclock", "Разгонные улучшения", "超频升级"] },
  { at: 45, label: ["Core Signal boss", "Çekirdek Sinyali bossu", "Chefe Sinal do Núcleo", "Jefe Señal del Núcleo", "Босс: Сигнал Ядра", "核心信号首领"] },
  { at: FINALE_UNLOCK_ASCENSION, label: ["Final Breach", "Son Saldırı", "Invasão Final", "Brecha Final", "Финальный взлом", "最终突破"] },
];

const formatEta = (seconds: number, language: Language): string => {
  if (!Number.isFinite(seconds) || seconds > 99 * 3600) return "—";
  const s = Math.max(1, Math.ceil(seconds));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const u = language === "tr" ? ["sa", "dk", "sn"] : language === "ru" ? ["ч", "м", "с"] : language === "zh-CN" ? ["小时", "分", "秒"] : ["h", "m", "s"];
  if (h > 0) return `${h}${u[0]} ${m}${u[1]}`;
  if (m > 0) return `${m}${u[1]} ${r}${u[2]}`;
  return `${r}${u[2]}`;
};

interface NextGoalProps {
  language: Language;
  resources: Record<ResourceType, Resource>;
  upgrades: Upgrade[];
  ascensionLevel: number;
  milestones?: AscensionMilestone[];
}

export const NextGoal = memo(function NextGoal({ language, resources, upgrades, ascensionLevel, milestones = ASCENSION_MILESTONES }: NextGoalProps) {
  const unlock = upgrades.find(u => u.id === "unlock_crypto_mining");
  const clickUnlock = upgrades.find(u => u.id === "unlock_click_upgrades");
  let title: string;
  let progress = 0;
  let eta = Infinity;
  let detail = "";
  let sellHint = false;

  const rate = (r: Resource) => Math.max(0, r.perSecond || 0);
  const etaFor = (need: number, have: number, perSec: number) => (have >= need ? 0 : perSec > 0 ? (need - have) / perSec : Infinity);

  const unlockGoal = (u: Upgrade) => {
    const needData = u.cost?.data ?? 0, needCredits = u.cost?.credits ?? 0;
    progress = Math.min(needData > 0 ? resources.data.amount / needData : 1, needCredits > 0 ? resources.credits.amount / needCredits : 1);
    eta = Math.max(etaFor(needData, resources.data.amount, rate(resources.data)), etaFor(needCredits, resources.credits.amount, rate(resources.credits)));
    const parts: string[] = [];
    if (needData > 0) parts.push(`${formatNumber(Math.min(resources.data.amount, needData))}/${formatNumber(needData)} ${getResourceLabel("data", language)}`);
    if (needCredits > 0) parts.push(`${formatNumber(Math.min(resources.credits.amount, needCredits))}/${formatNumber(needCredits)} ${getResourceLabel("credits", language)}`);
    detail = parts.join(" · ");
    sellHint = resources.credits.amount < needCredits && rate(resources.credits) <= 0;
  };

  if (clickUnlock && clickUnlock.count === 0) {
    title = pick(language, ["Unlock Click Upgrades", "Tıklama Yükseltmelerini aç", "Desbloquear Melhorias de Clique", "Desbloquear Mejoras de Clic", "Открыть улучшения клика", "解锁点击升级"]);
    unlockGoal(clickUnlock);
  } else if (unlock && unlock.count === 0) {
    title = pick(language, ["Unlock Crypto Mining", "Kripto Madenciliğini aç", "Desbloquear Mineração de Cripto", "Desbloquear Minería de Cripto", "Открыть майнинг крипты", "解锁加密挖矿"]);
    unlockGoal(unlock);
  } else {
    const need = getAscensionCost(ascensionLevel);
    title = pick(language, [`Ascension #${ascensionLevel + 1}`, `Yükseliş #${ascensionLevel + 1}`, `Ascensão #${ascensionLevel + 1}`, `Ascensión #${ascensionLevel + 1}`, `Вознесение #${ascensionLevel + 1}`, `第 ${ascensionLevel + 1} 次飞升`]);
    progress = need > 0 ? resources.crypto.amount / need : 1;
    eta = etaFor(need, resources.crypto.amount, rate(resources.crypto));
    detail = `${formatNumber(Math.min(resources.crypto.amount, need))} / ${formatNumber(need)} ${getResourceLabel("crypto", language)}`;
  }

  // v1.04: one plain "do this now" line, so the card says how to reach the goal, not only what it is.
  const isAscensionGoal = !(clickUnlock && clickUnlock.count === 0) && !(unlock && unlock.count === 0);
  let action: L6 | null = null;
  if (progress >= 1) {
    action = isAscensionGoal
      ? ["Press ASCEND and beat the boss.", "YÜKSEL'e bas ve bossu yen.", "Aperte ASCENDER e vença o chefe.", "Pulsa ASCENDER y vence al jefe.", "Нажмите «Вознестись» и победите босса.", "点击飞升并击败首领。"]
      : ["Buy it in the Upgrades panel.", "Yükseltmeler panelinden satın al.", "Compre no painel de Melhorias.", "Cómpralo en el panel de Mejoras.", "Купите в панели улучшений.", "在升级面板中购买。"];
  } else if (sellHint) {
    action = ["Sell Data for Nodes with the Convert buttons.", "Dönüştür butonlarıyla Veriyi Dizin'e sat.", "Venda Dados por Nodes com os botões de Converter.", "Vende Datos por Nodos con los botones de Convertir.", "Продайте данные за узлы кнопками обмена.", "用兑换按钮把数据换成节点。"];
  } else if (isAscensionGoal && rate(resources.crypto) <= 0) {
    action = ["Buy a crypto rig with Nodes (Mining tab).", "Dizin ile bir kripto makinesi al (Madencilik sekmesi).", "Compre uma máquina de cripto com Nodes (aba Mineração).", "Compra un equipo de cripto con Nodos (pestaña Minería).", "Купите крипто-ферму за узлы (вкладка майнинга).", "用节点购买加密矿机（加密挖矿标签）。"];
  }

  const bossVariant = getBossVariant(ascensionLevel);
  const nextMilestone = milestones.filter(m => m.at > ascensionLevel).sort((a, b) => a.at - b.at)[0];
  const ready = progress >= 1;
  const pct = Math.max(0, Math.min(100, progress * 100));

  return (
    <div className="rounded-md border border-cyan-500/30 bg-cyan-950/15 px-2.5 py-2 text-xs font-mono" data-testid="next-goal">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-cyan-300/80 uppercase tracking-wider text-[10px]">
          <Target className="w-3 h-3" />
          {pick(language, ["Next goal", "Sıradaki hedef", "Próxima meta", "Siguiente meta", "Следующая цель", "下一个目标"])}
        </span>
        <span className={`tabular-nums ${ready ? "text-emerald-300 font-semibold" : "text-cyan-200/80"}`}>
          {ready
            ? pick(language, ["READY", "HAZIR", "PRONTO", "LISTO", "ГОТОВО", "就绪"])
            : Number.isFinite(eta) && eta <= 99 * 3600
              ? `≈ ${formatEta(eta, language)}`
              : !sellHint ? "—" : pick(language, ["sell Data → Nodes", "Veri sat → Dizin", "venda Dados → Nodes", "vende Datos → Nodos", "продай данные → узлы", "出售数据 → 节点"])}
        </span>
      </div>
      <div className="mt-1 text-cyan-100 font-semibold truncate">{title}</div>
      <div className="mt-1 h-1.5 rounded bg-slate-800 overflow-hidden">
        <div className={`h-full ${ready ? "bg-emerald-400" : "bg-cyan-400"} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 text-[10px] text-slate-400 tabular-nums truncate">{detail}</div>
      {action && (
        <div className={`mt-1 text-[10px] ${ready ? "text-emerald-300" : "text-cyan-200/90"}`} data-testid="next-goal-action">▸ {pick(language, action)}</div>
      )}
      {bossVariant.kind === "signal" && (
        <div className="mt-1 text-[10px] text-cyan-300 truncate">
          {pick(language, ["Boss: Core Signal (fight required)", "Boss: Çekirdek Sinyali (savaş gerekli)", "Chefe: Sinal do Núcleo (luta obrigatória)", "Jefe: Señal del Núcleo (combate obligatorio)", "Босс: Сигнал Ядра (бой обязателен)", "首领：核心信号（必须战斗）"])}
        </div>
      )}
      {bossVariant.modifiers.length > 0 && (
        <div className="mt-1 text-[10px] text-amber-300/80 truncate">
          {pick(language, ["Boss modifiers", "Boss değiştiricileri", "Modificadores do chefe", "Modificadores del jefe", "Модификаторы босса", "首领词缀"])}: {bossVariant.modifiers.map(id => pick(language, BOSS_MODIFIERS[id].name)).join(", ")}
        </div>
      )}
      {nextMilestone && (
        <div className="mt-1 text-[10px] text-fuchsia-300/80 truncate">
          {pick(language, ["At ascension", "Yükseliş", "Na ascensão", "En la ascensión", "На вознесении", "飞升"])} {nextMilestone.at}: {pick(language, nextMilestone.label)}
        </div>
      )}
    </div>
  );
});
