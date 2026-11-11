import { useState } from "react";
import { motion } from "framer-motion";
import { Gift, Sparkles, Swords, Wrench, LayoutDashboard, Package, Gauge, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Language } from "@/lib/i18n";
import { pick6 } from "@/lib/bossVariants";
import { WHATS_NEW_RELEASES, getUnseenReleases, type WhatsNewArea, type WhatsNewRelease } from "@/lib/whatsNew";
import { ASCENSION_MILESTONES } from "./NextGoal";

// One-time "What's new" screen for returning players (and reopenable from Settings).
// The text lives in lib/whatsNew.ts so the list can be edited without touching this layout.

const AREA_ICON: Record<WhatsNewArea, { icon: typeof Swords; cls: string }> = {
  boss: { icon: Swords, cls: "text-red-300" },
  content: { icon: Package, cls: "text-fuchsia-300" },
  ui: { icon: LayoutDashboard, cls: "text-cyan-300" },
  fix: { icon: Wrench, cls: "text-emerald-300" },
  perf: { icon: Gauge, cls: "text-amber-300" },
};

function ReleaseList({ release, language }: { release: WhatsNewRelease; language: Language }) {
  return (
    <ul className="space-y-2 text-sm text-slate-200" data-testid={`whats-new-list-${release.version}`}>
      {release.entries.map(entry => {
        const { icon: Icon, cls } = AREA_ICON[entry.area];
        return (
          <li key={entry.id} className="flex gap-2.5" data-testid={`whats-new-entry-${entry.id}`}>
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${cls}`} />
            <span>{pick6(language, entry.text)}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function WhatsNewDialog({ language, ascensions, giftClaimed, seenVersion, manual = false, onClaimGift, onClose }: {
  language: Language;
  ascensions: number;
  giftClaimed: boolean;
  /** Version saved in the player's file; decides which releases count as new. */
  seenVersion: string;
  /** Opened from Settings: show the notes without the welcome-back framing. */
  manual?: boolean;
  onClaimGift: () => void;
  onClose: () => void;
}) {
  const unseen = manual ? [] : getUnseenReleases(seenVersion);
  const latest = unseen[0] ?? WHATS_NEW_RELEASES[0];
  const older = manual ? WHATS_NEW_RELEASES.slice(1) : unseen.slice(1);
  const [showOlder, setShowOlder] = useState(false);
  const next = ASCENSION_MILESTONES.filter(m => m.at > ascensions).sort((a, b) => a.at - b.at).slice(0, 3);
  const showGift = !manual && !giftClaimed;

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/75 backdrop-blur-sm" data-testid="whats-new">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-[min(660px,94vw)] max-h-[90vh] overflow-y-auto rounded-xl border border-fuchsia-500/40 bg-slate-950/95 p-6 shadow-2xl shadow-fuchsia-900/30">
        <p className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.3em] text-fuchsia-300/80"><Sparkles className="h-3.5 w-3.5" /> DataFall v{latest.version} · {pick6(language, latest.title)}</p>
        <h2 className="mt-2 text-2xl font-bold text-white">
          {manual
            ? pick6(language, ["What's new", "Yenilikler", "Novidades", "Novedades", "Что нового", "更新内容"])
            : pick6(language, ["Welcome back, Operator", "Tekrar hoş geldin, Operatör", "Bem-vindo de volta, Operador", "Bienvenido de nuevo, Operador", "С возвращением, оператор", "欢迎回来，操作员"])}
        </h2>
        {!manual && (
          <p className="mt-1 text-sm text-slate-300">
            {pick6(language, [`Your save is safe: ascension ${ascensions}. Here's what changed:`, `Kaydın güvende: yükseliş ${ascensions}. Neler değişti:`, `Seu save está seguro: ascensão ${ascensions}. Veja o que mudou:`, `Tu partida está a salvo: ascensión ${ascensions}. Esto es lo que cambió:`, `Сохранение на месте: вознесение ${ascensions}. Что изменилось:`, `你的存档安全无虞：第 ${ascensions} 次飞升。更新内容如下：`])}
          </p>
        )}

        <div className="mt-4">
          <ReleaseList release={latest} language={language} />
        </div>

        {older.length > 0 && (
          <div className="mt-4 rounded-lg border border-slate-700/60 bg-slate-900/40">
            <button type="button" onClick={() => setShowOlder(v => !v)} className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-mono uppercase tracking-wider text-slate-300 hover:text-white" data-testid="whats-new-older-toggle">
              <span>
                {manual
                  ? pick6(language, ["Earlier updates", "Önceki güncellemeler", "Atualizações anteriores", "Actualizaciones anteriores", "Прошлые обновления", "更早的更新"])
                  : pick6(language, ["Also new since you last played", "Son oynadığından beri ayrıca", "Também novo desde a sua última partida", "También nuevo desde tu última partida", "Также нового с вашей последней игры", "自你上次游玩以来的其他更新"])}
                {" "}({older.map(r => `v${r.version}`).join(", ")})
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showOlder ? "rotate-180" : ""}`} />
            </button>
            {showOlder && (
              <div className="space-y-4 px-3 pb-3">
                {older.map(r => (
                  <div key={r.version}>
                    <p className="mb-2 text-[11px] font-mono uppercase tracking-wider text-fuchsia-300/70">v{r.version} · {pick6(language, r.title)}</p>
                    <ReleaseList release={r} language={language} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {next.length > 0 && (
          <div className="mt-4 rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-3" data-testid="whats-new-next">
            <p className="text-[11px] font-mono uppercase tracking-wider text-cyan-300/80">
              {pick6(language, ["Coming up for you", "Sıradaki kilitlerin", "Seus próximos desbloqueios", "Tus próximos desbloqueos", "Скоро для вас", "即将解锁"])}
            </p>
            <ul className="mt-1 space-y-1 text-sm text-cyan-100">
              {next.map(m => {
                const away = m.at - ascensions;
                return (
                  <li key={m.at}>
                    {pick6(language, m.label)}: {pick6(language, [`${away} ascension${away === 1 ? '' : 's'} away`, `${away} yükseliş kaldı`, `faltam ${away} ascensões`, `faltan ${away} ascensiones`, `осталось вознесений: ${away}`, `还差 ${away} 次飞升`])}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {showGift ? (
            <Button onClick={onClaimGift} className="h-11 flex-1 bg-gradient-to-r from-fuchsia-600 to-amber-500 font-bold hover:from-fuchsia-500 hover:to-amber-400" data-testid="button-welcome-gift">
              <Gift className="mr-2 h-4 w-4" />
              {pick6(language, ["Open your welcome-back loot box", "Hoş geldin ganimet kutunu aç", "Abrir sua caixa de boas-vindas", "Abrir tu caja de bienvenida", "Открыть подарочный ящик", "打开回归战利品箱"])}
            </Button>
          ) : (
            <Button onClick={onClose} className="h-11 flex-1 bg-fuchsia-600 hover:bg-fuchsia-500" data-testid="button-whats-new-close">
              {pick6(language, ["Back to the grid", "Ağa dön", "Voltar à grade", "Volver a la red", "Назад в сеть", "返回网络"])}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
