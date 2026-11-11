import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Language } from "@/lib/i18n";
import { pick6, type L6 } from "@/lib/bossVariants";

// v1.04 UX: a small "?" next to each currency that says where it comes from, what it buys,
// and whether it survives an ascension. New players mixed these up (review feedback).
export type CurrencyHelpKind = "data" | "credits" | "crypto" | "prestige";

const HELP: Record<CurrencyHelpKind, { get: L6; use: L6; reset: boolean }> = {
  data: {
    get: ["From clicks and Data machines.", "Tıklamalardan ve Veri makinelerinden gelir.", "Vem de cliques e máquinas de Dados.", "Viene de clics y máquinas de Datos.", "Даётся за клики и машины данных.", "来自点击和数据机器。"],
    use: ["Buys Data machines. Sell it to get Nodes.", "Veri makinelerini alır. Satınca Dizin kazanırsın.", "Compra máquinas de Dados. Venda para ganhar Nodes.", "Compra máquinas de Datos. Véndelos para obtener Nodos.", "Покупает машины данных. Продайте, чтобы получить узлы.", "用于购买数据机器。出售可换取节点。"],
    reset: true,
  },
  credits: {
    get: ["From selling Data, plus a small trickle from production.", "Veri satarak ve üretimden gelen küçük bir akışla gelir.", "Vem de vender Dados, mais um pequeno fluxo da produção.", "Viene de vender Datos, más un pequeño flujo de la producción.", "Даются за продажу данных и понемногу от производства.", "来自出售数据，以及少量生产自动收入。"],
    use: ["Buys crypto rigs, click upgrades and cosmetics.", "Kripto makinelerini, tıklama yükseltmelerini ve kozmetikleri alır.", "Compra máquinas de cripto, melhorias de clique e cosméticos.", "Compra equipos de cripto, mejoras de clic y cosméticos.", "Покупает крипто-фермы, улучшения клика и косметику.", "用于购买加密矿机、点击升级和装扮。"],
    reset: true,
  },
  crypto: {
    get: ["From crypto rigs.", "Kripto makinelerinden gelir.", "Vem das máquinas de cripto.", "Viene de los equipos de cripto.", "Даётся крипто-фермами.", "来自加密矿机。"],
    use: ["Needed to ascend. Holding more than required gives a bigger Prestige reward.", "Yükselmek için gerekir. Gerekenden fazlası daha büyük Prestij ödülü verir.", "Necessária para ascender. Ter mais que o necessário dá mais Prestígio.", "Necesaria para ascender. Tener más de lo necesario da más Prestigio.", "Нужна для вознесения. Излишек даёт больше престижа.", "飞升所需。超出需求越多，声望奖励越高。"],
    reset: true,
  },
  prestige: {
    get: ["From ascending (beating the boss).", "Yükselişten gelir (bossu yenerek).", "Vem de ascender (vencendo o chefe).", "Viene de ascender (venciendo al jefe).", "Даётся за вознесение (победу над боссом).", "来自飞升（击败首领）。"],
    use: ["Buys permanent Prestige upgrades and Ascension cosmetics.", "Kalıcı Prestij yükseltmelerini ve Yükseliş kozmetiklerini alır.", "Compra melhorias permanentes de Prestígio e cosméticos de Ascensão.", "Compra mejoras permanentes de Prestigio y cosméticos de Ascensión.", "Покупает постоянные улучшения престижа и косметику вознесения.", "用于购买永久声望升级和飞升装扮。"],
    reset: false,
  },
};

const RESETS: L6 = ["Resets when you ascend.", "Yükselişte sıfırlanır.", "Zera ao ascender.", "Se reinicia al ascender.", "Сгорает при вознесении.", "飞升时清零。"];
const KEPT: L6 = ["Kept forever.", "Kalıcıdır.", "Fica para sempre.", "Se conserva para siempre.", "Остаётся навсегда.", "永久保留。"];

export function CurrencyHelp({ kind, language, className = "" }: { kind: CurrencyHelpKind; language: Language; className?: string }) {
  const h = HELP[kind];
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" aria-label="?" className={`inline-flex items-center opacity-60 hover:opacity-100 focus:opacity-100 ${className}`} data-testid={`currency-help-${kind}`}>
            <HelpCircle className="h-3 w-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[240px] border border-cyan-500/40 bg-slate-950 text-slate-200 normal-case tracking-normal font-normal">
          <p>{pick6(language, h.get)}</p>
          <p className="mt-1">{pick6(language, h.use)}</p>
          <p className={`mt-1 font-semibold ${h.reset ? "text-amber-300" : "text-emerald-300"}`}>{pick6(language, h.reset ? RESETS : KEPT)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Plain-text version for places that can't hold the "?" button (e.g. inside another button). */
export const getCurrencyHelpText = (kind: CurrencyHelpKind, language: Language): string => {
  const h = HELP[kind];
  return `${pick6(language, h.get)} ${pick6(language, h.use)} ${pick6(language, h.reset ? RESETS : KEPT)}`;
};
