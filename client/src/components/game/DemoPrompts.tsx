import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, X } from "lucide-react";
import type { Language } from "@/lib/i18n";
import { pick6 } from "@/lib/bossVariants";
import { FULL_GAME_APP_ID } from "./DemoEndScreen";

// v1.03 demo: an always-visible "Get the full game" button, and one gentle reminder when Crypto Mining unlocks.
const REMINDER_KEY = "df_demo_mining_reminder_shown";
const openStore = () => {
  const w = window as unknown as { df?: { openStore?: (id: number) => void } };
  if (w.df?.openStore) w.df.openStore(FULL_GAME_APP_ID);
  else window.open(`https://store.steampowered.com/app/${FULL_GAME_APP_ID}/`, "_blank");
};
const readFlag = () => { try { return localStorage.getItem(REMINDER_KEY) === "1"; } catch { return false; } };
const writeFlag = () => { try { localStorage.setItem(REMINDER_KEY, "1"); } catch { /* ignore */ } };

export function DemoPrompts({ language, cryptoMiningUnlocked }: { language: Language; cryptoMiningUnlocked: boolean }) {
  const [showReminder, setShowReminder] = useState(false);
  const [baseline, setBaseline] = useState<boolean | null>(null);

  // Remember the state a few seconds after start (the save has loaded by then), so a save that already had
  // mining does not trigger the reminder.
  const latest = cryptoMiningUnlocked;
  useEffect(() => { const id = setTimeout(() => setBaseline(b => (b === null ? latestRef.current : b)), 4000); return () => clearTimeout(id); }, []);
  const latestRef = useRef(latest);
  latestRef.current = latest;
  useEffect(() => {
    if (baseline === false && cryptoMiningUnlocked && !readFlag()) { writeFlag(); setShowReminder(true); }
  }, [baseline, cryptoMiningUnlocked]);

  const dismiss = () => setShowReminder(false);
  return (
    <>
      <button type="button" onClick={openStore} data-testid="button-demo-full-game"
        className="fixed bottom-3 left-1/2 z-[60] -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-fuchsia-400/50 bg-slate-950/85 px-3 py-1.5 text-[11px] font-mono text-fuchsia-100 shadow-lg hover:bg-fuchsia-900/40">
        <ShoppingCart className="h-3.5 w-3.5" />
        {pick6(language, ["Demo · Get the full game", "Demo · Tam oyunu al", "Demo · Jogo completo", "Demo · Juego completo", "Демо · Полная версия", "试玩 · 获取完整版"])}
      </button>
      <AnimatePresence>
        {showReminder && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-14 left-1/2 z-[61] w-[min(420px,92vw)] -translate-x-1/2 rounded-lg border border-cyan-500/40 bg-slate-950/95 p-4 shadow-2xl" data-testid="demo-mining-reminder">
            <button type="button" onClick={dismiss} className="absolute right-2 top-2 text-slate-400 hover:text-white" aria-label="close"><X className="h-4 w-4" /></button>
            <p className="text-sm font-semibold text-cyan-100">
              {pick6(language, ["Crypto Mining online!", "Kripto Madenciliği açıldı!", "Mineração de Cripto ativa!", "¡Minería de Cripto activa!", "Майнинг крипты запущен!", "加密挖矿已上线！"])}
            </p>
            <p className="mt-1 text-xs text-slate-300">
              {pick6(language, ["The demo ends at your first ascension. The full game has 50 ascensions, a final boss, Endless mode, and your demo progress carries over.", "Demo ilk yükselişinde biter. Tam oyunda 50 yükseliş, final bossu ve Sonsuz mod var; demo ilerlemen de taşınır.", "A demo termina na sua primeira ascensão. O jogo completo tem 50 ascensões, um chefe final e o modo Infinito, e seu progresso é mantido.", "La demo termina en tu primera ascensión. El juego completo tiene 50 ascensiones, un jefe final y el modo Infinito, y tu progreso se conserva.", "Демо заканчивается на первом вознесении. В полной версии 50 вознесений, финальный босс и бесконечный режим, а прогресс сохраняется.", "试玩在第一次飞升时结束。完整版拥有 50 次飞升、最终首领和无尽模式，且试玩进度可继承。"])}
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => { openStore(); dismiss(); }} className="rounded bg-fuchsia-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-fuchsia-500">
                {pick6(language, ["View on Steam", "Steam'de gör", "Ver na Steam", "Ver en Steam", "Открыть в Steam", "在 Steam 查看"])}
              </button>
              <button type="button" onClick={dismiss} className="rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:text-white">
                {pick6(language, ["Keep playing", "Oynamaya devam", "Continuar", "Seguir jugando", "Продолжить", "继续游玩"])}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
