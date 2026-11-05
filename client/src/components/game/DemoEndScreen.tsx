import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { Language } from "@/lib/i18n";
import { pick6, type L6 } from "@/lib/bossVariants";

// v1.03: end screen for the demo build (VITE_DEMO_BUILD=true). Points players to the full game's store page.
export const FULL_GAME_APP_ID = 4291910;

const openFullGameStore = () => {
  const w = window as unknown as { df?: { openStore?: (id: number) => void } };
  if (w.df?.openStore) w.df.openStore(FULL_GAME_APP_ID);
  else window.open(`https://store.steampowered.com/app/${FULL_GAME_APP_ID}/`, "_blank");
};

const FEATURES: L6[] = [
  ["50 ascensions, a final boss and an Endless mode", "50 yükseliş, final bossu ve Sonsuz mod", "50 ascensões, um chefe final e o modo Infinito", "50 ascensiones, un jefe final y el modo Infinito", "50 вознесений, финальный босс и бесконечный режим", "50 次飞升、最终首领与无尽模式"],
  ["Automation, challenges, Paragon Lab and relics", "Otomasyon, görevler, Paragon Laboratuvarı ve relikler", "Automação, desafios, Laboratório Paragon e relíquias", "Automatización, desafíos, Laboratorio Paragon y reliquias", "Автоматизация, испытания, лаборатория Paragon и реликвии", "自动化、挑战、Paragon 实验室与遗物"],
  ["Hundreds of cosmetics, Steam achievements and leaderboards", "Yüzlerce kozmetik, Steam başarımları ve liderlik tabloları", "Centenas de cosméticos, conquistas e placares da Steam", "Cientos de cosméticos, logros y clasificaciones de Steam", "Сотни косметики, достижения и таблицы лидеров Steam", "数百种外观、Steam 成就与排行榜"],
  ["Your demo progress carries over", "Demo ilerlemen tam sürüme taşınır", "Seu progresso da demo é mantido", "Tu progreso de la demo se conserva", "Прогресс демо сохраняется", "试玩进度可继承"],
];

const DISCORD_URL = "https://discord.com/invite/N4sHghSxuY";
const openUrl = (url: string) => { window.open(url, "_blank"); };

// Like the March demo: the demo ends at its ascension cap; the screen stays (also on relaunch) with store / Discord / quit.
export function DemoEndScreen({ language, ascensions, onQuit }: { language: Language; ascensions: number; onQuit: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm" data-testid="demo-end-screen">
      <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="w-[min(560px,92vw)] rounded-xl border border-cyan-500/40 bg-slate-950/95 p-6 text-center shadow-2xl">
        <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-cyan-300/80">DataFall · Demo</p>
        <h2 className="mt-2 text-2xl font-bold text-cyan-100">
          {pick6(language, ["You reached the end of the demo", "Demonun sonuna ulaştın", "Você chegou ao fim da demo", "Has llegado al final de la demo", "Вы дошли до конца демо", "你已完成试玩内容"])}
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          {pick6(language, [`Ascensions done: ${ascensions}. The grid keeps falling in the full game:`, `${ascensions} yükseliş tamamlandı. Tam sürümde ağ düşmeye devam ediyor:`, `Ascensões concluídas: ${ascensions}. A grade continua caindo no jogo completo:`, `Ascensiones completadas: ${ascensions}. La red sigue cayendo en el juego completo:`, `Завершено вознесений: ${ascensions}. В полной версии сеть продолжает падать:`, `已完成 ${ascensions} 次飞升。完整版中网络仍在坠落：`])}
        </p>
        <ul className="mt-4 space-y-1.5 text-left text-sm text-slate-200">
          {FEATURES.map((f, i) => <li key={i} className="flex gap-2"><span className="text-cyan-400">▸</span>{pick6(language, f)}</li>)}
        </ul>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button onClick={openFullGameStore} className="h-11 flex-1 bg-gradient-to-r from-cyan-600 to-fuchsia-600 font-bold hover:from-cyan-500 hover:to-fuchsia-500" data-testid="button-demo-store">
            {pick6(language, ["Get the full game on Steam", "Tam sürümü Steam'de al", "Obter o jogo completo na Steam", "Consigue el juego completo en Steam", "Полная версия в Steam", "在 Steam 获取完整版"])}
          </Button>
          <Button variant="outline" onClick={() => openUrl(DISCORD_URL)} className="h-11 sm:w-36 border-cyan-500/40 text-cyan-100" data-testid="button-demo-discord">
            {pick6(language, ["Join Discord", "Discord'a katıl", "Entrar no Discord", "Unirse a Discord", "Discord", "加入 Discord"])}
          </Button>
          <Button variant="ghost" onClick={onQuit} className="h-11 sm:w-28 text-slate-300" data-testid="button-demo-quit">
            {pick6(language, ["Quit", "Çık", "Sair", "Salir", "Выйти", "退出"])}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
