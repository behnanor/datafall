import { motion } from "framer-motion";
import { Gift, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Language } from "@/lib/i18n";
import { pick6, type L6 } from "@/lib/bossVariants";
import { ASCENSION_MILESTONES } from "./NextGoal";

// v1.03: one-time screen for returning players (saves from before v1.03), with a welcome-back loot box.
const NEW_IN_103: L6[] = [
  ["Faster progression: ascension 50 is now about 50 hours away, with something new every 5 ascensions.", "Daha hızlı ilerleme: yükseliş 50 artık yaklaşık 50 saat uzakta ve her 5 yükselişte yeni bir şey açılıyor.", "Progresso mais rápido: a ascensão 50 agora fica a cerca de 50 horas, com algo novo a cada 5 ascensões.", "Progreso más rápido: la ascensión 50 está ahora a unas 50 horas, con algo nuevo cada 5 ascensiones.", "Быстрее прогресс: до 50-го вознесения теперь около 50 часов, и каждые 5 вознесений открывается что-то новое.", "进度更快：第 50 次飞升现在约需 50 小时，每 5 次飞升都会解锁新内容。"],
  ["A real ending: break the Core at ascension 50, then Endless mode with rewards every 5 depths.", "Gerçek bir son: yükseliş 50'de Çekirdeği kır, ardından her 5 derinlikte ödül veren Sonsuz mod.", "Um final de verdade: quebre o Núcleo na ascensão 50 e depois o modo Infinito, com recompensas a cada 5 níveis.", "Un final de verdad: rompe el Núcleo en la ascensión 50 y luego el modo Infinito, con recompensas cada 5 niveles.", "Настоящий финал: сломай Ядро на 50-м вознесении, затем бесконечный режим с наградами каждые 5 уровней.", "真正的结局：在第 50 次飞升击破核心，然后进入每 5 层都有奖励的无尽模式。"],
  ["New systems: Automation (15), Paragon II (25), Challenges (30), the Core Signal boss (45).", "Yeni sistemler: Otomasyon (15), Paragon II (25), Görevler (30), Çekirdek Sinyali bossu (45).", "Novos sistemas: Automação (15), Paragon II (25), Desafios (30), o chefe Sinal do Núcleo (45).", "Nuevos sistemas: Automatización (15), Paragon II (25), Desafíos (30), el jefe Señal del Núcleo (45).", "Новые системы: автоматизация (15), Paragon II (25), испытания (30), босс «Сигнал Ядра» (45).", "新系统：自动化 (15)、Paragon II (25)、挑战 (30)、核心信号首领 (45)。"],
  ["Bosses get modifiers; with automation on, only every 5th ascension needs a fight.", "Bosslar artık değiştiricilere sahip; otomasyon açıkken sadece her 5. yükselişte savaş var.", "Os chefes têm modificadores; com a automação ligada, só a cada 5ª ascensão há luta.", "Los jefes tienen modificadores; con la automatización activa, solo cada 5ª ascensión hay combate.", "У боссов появились модификаторы; с автоматизацией бой нужен только каждое 5-е вознесение.", "首领拥有词缀；开启自动化后，每 5 次飞升才需战斗一次。"],
  ["A \"Next goal\" tracker, auto-buy modes, and the Prestige shop rebalanced (any difference was refunded).", "\"Sıradaki hedef\" göstergesi, otomatik alım modları ve yeniden dengelenen Prestij dükkânı (fark sana iade edildi).", "Um marcador de \"Próxima meta\", modos de compra automática e a loja de Prestígio rebalanceada (a diferença foi reembolsada).", "Un indicador de \"Siguiente meta\", modos de compra automática y la tienda de Prestigio reequilibrada (la diferencia se reembolsó).", "Трекер «Следующая цель», режимы автопокупки и перебалансированный магазин престижа (разница возвращена).", "\"下一个目标\"追踪、自动购买模式，以及重新平衡的声望商店（差额已返还）。"],
  ["Steam achievements fixed: the ones you already earned unlock automatically.", "Steam başarımları düzeltildi: zaten kazandıkların kendiliğinden açılıyor.", "Conquistas da Steam corrigidas: as que você já ganhou são desbloqueadas automaticamente.", "Logros de Steam corregidos: los que ya conseguiste se desbloquean automáticamente.", "Достижения Steam исправлены: уже заработанные откроются автоматически.", "Steam 成就已修复：已获得的成就会自动解锁。"],
];

export function WhatsNewDialog({ language, ascensions, giftClaimed, onClaimGift, onClose }: {
  language: Language;
  ascensions: number;
  giftClaimed: boolean;
  onClaimGift: () => void;
  onClose: () => void;
}) {
  const next = ASCENSION_MILESTONES.filter(m => m.at > ascensions).sort((a, b) => a.at - b.at).slice(0, 3);
  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/75 backdrop-blur-sm" data-testid="whats-new">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-[min(640px,94vw)] max-h-[90vh] overflow-y-auto rounded-xl border border-fuchsia-500/40 bg-slate-950/95 p-6 shadow-2xl">
        <p className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.3em] text-fuchsia-300/80"><Sparkles className="h-3.5 w-3.5" /> DataFall v1.03</p>
        <h2 className="mt-2 text-2xl font-bold text-white">
          {pick6(language, ["Welcome back, Operator", "Tekrar hoş geldin, Operatör", "Bem-vindo de volta, Operador", "Bienvenido de nuevo, Operador", "С возвращением, оператор", "欢迎回来，操作员"])}
        </h2>
        <p className="mt-1 text-sm text-slate-300">
          {pick6(language, [`Your save is safe: ascension ${ascensions}. Here's what changed:`, `Kaydın güvende: yükseliş ${ascensions}. Neler değişti:`, `Seu save está seguro: ascensão ${ascensions}. Veja o que mudou:`, `Tu partida está a salvo: ascensión ${ascensions}. Esto es lo que cambió:`, `Сохранение на месте: вознесение ${ascensions}. Что изменилось:`, `你的存档安全无虞：第 ${ascensions} 次飞升。更新内容如下：`])}
        </p>
        <ul className="mt-4 space-y-2 text-sm text-slate-200">
          {NEW_IN_103.map((line, i) => <li key={i} className="flex gap-2"><span className="text-fuchsia-400">▸</span>{pick6(language, line)}</li>)}
        </ul>
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
          {!giftClaimed ? (
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
