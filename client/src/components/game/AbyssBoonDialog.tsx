import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { Language } from "@/lib/i18n";
import { pick6 } from "@/lib/bossVariants";
import { getAbyssBoon, getAbyssBoonDesc, getAbyssBoonName, groupAbyssBoons, type AbyssBoonId } from "@/lib/abyssBoons";

// v1.04 Endless: pick one of three Abyss Boons. Opened from the Endless panel when a pick is waiting.
export function AbyssBoonDialog({ language, depth, offer, owned, pending, onChoose, onClose }: {
  language: Language;
  depth: number;
  offer: AbyssBoonId[];
  owned: AbyssBoonId[];
  pending: number;
  onChoose: (id: AbyssBoonId) => void;
  onClose: () => void;
}) {
  const grouped = groupAbyssBoons(owned);
  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/75 backdrop-blur-sm" data-testid="abyss-boon-dialog">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-[min(680px,94vw)] max-h-[90vh] overflow-y-auto rounded-xl border border-orange-500/40 bg-slate-950/95 p-6 shadow-2xl">
        <p className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.3em] text-orange-300/80">
          <Sparkles className="h-3.5 w-3.5" /> {pick6(language, ["Endless", "Sonsuz", "Infinito", "Infinito", "Бесконечный режим", "无尽"])} · {pick6(language, ["Depth", "Derinlik", "Profundidade", "Profundidad", "Глубина", "深度"])} {depth}
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white">
          {pick6(language, ["Choose an Abyss Boon", "Bir Uçurum Lütfu seç", "Escolha uma Bênção Abissal", "Elige una Bendición Abisal", "Выбери дар бездны", "选择一项深渊恩赐"])}
        </h2>
        <p className="mt-1 text-sm text-slate-300">
          {pick6(language, [
            "Permanent for this save and they stack. You get a new pick every 5 depths.",
            "Bu kayıt için kalıcıdır ve üst üste biner. Her 5 derinlikte yeni bir seçim hakkı kazanırsın.",
            "Permanente neste save e acumula. Você ganha uma nova escolha a cada 5 níveis.",
            "Permanente en esta partida y se acumula. Ganas una nueva elección cada 5 niveles.",
            "Навсегда для этого сохранения и складывается. Новый выбор каждые 5 уровней глубины.",
            "对本存档永久生效且可叠加。每 5 层深度获得一次新选择。",
          ])}
          {pending > 1 && (
            <span className="ml-1 font-semibold text-orange-200">
              {pick6(language, [`(${pending} picks waiting)`, `(${pending} seçim bekliyor)`, `(${pending} escolhas pendentes)`, `(${pending} elecciones pendientes)`, `(ожидает выборов: ${pending})`, `（还有 ${pending} 次选择）`])}
            </span>
          )}
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {offer.map(id => {
            const boon = getAbyssBoon(id);
            const stacks = owned.filter(o => o === id).length;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChoose(id)}
                className="group rounded-lg border-2 bg-slate-900/70 p-4 text-left transition hover:-translate-y-0.5 hover:bg-slate-900"
                style={{ borderColor: `${boon.color}88`, boxShadow: `0 0 18px ${boon.color}22` }}
                data-testid={`abyss-boon-${id}`}
              >
                <p className="text-sm font-bold" style={{ color: boon.color }}>{getAbyssBoonName(id, language)}</p>
                <p className="mt-2 text-sm text-slate-100">{getAbyssBoonDesc(id, language)}</p>
                {stacks > 0 && (
                  <p className="mt-2 text-[10px] font-mono text-slate-400">{pick6(language, [`Owned: x${stacks}`, `Sende: x${stacks}`, `Possui: x${stacks}`, `Tienes: x${stacks}`, `Есть: x${stacks}`, `已拥有：x${stacks}`])}</p>
                )}
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 group-hover:text-white">{pick6(language, ["Take", "Al", "Pegar", "Tomar", "Взять", "选择"])}</p>
              </button>
            );
          })}
        </div>
        {grouped.length > 0 && (
          <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{pick6(language, ["Your boons", "Lütufların", "Suas bênçãos", "Tus bendiciones", "Твои дары", "你的恩赐"])}</p>
            <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-200">
              {grouped.map(g => <li key={g.id}><span style={{ color: getAbyssBoon(g.id).color }}>{getAbyssBoonName(g.id, language)}</span> x{g.count}</li>)}
            </ul>
          </div>
        )}
        <div className="mt-4 text-right">
          <button type="button" onClick={onClose} className="rounded border border-slate-600 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800" data-testid="abyss-boon-later">
            {pick6(language, ["Decide later", "Sonra karar ver", "Decidir depois", "Decidir después", "Решить позже", "稍后决定"])}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
