import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { localizeInlineText, useI18n } from '@/lib/i18n';

interface FinaleCreditsProps {
  totalAscensions: number;
  onContinue: () => void;
}

// Ending screen after breaching the Core (ascension 50). Leads into Endless mode.
export function FinaleCredits({ totalAscensions, onContinue }: FinaleCreditsProps) {
  const { language } = useI18n();
  const l = (en: string, tr: string, pt: string, es: string, ru: string) => localizeInlineText(language, en, tr, pt, es, ru);

  const lines = [
    l('The Core is breached.', 'Çekirdek kırıldı.', 'O Núcleo foi invadido.', 'El Núcleo ha caído.', 'Ядро взломано.'),
    l(`${totalAscensions} ascensions. Every firewall, every relic, every rig.`, `${totalAscensions} yükseliş. Her güvenlik duvarı, her relik, her rig.`, `${totalAscensions} ascensões. Cada firewall, cada relíquia, cada rig.`, `${totalAscensions} ascensiones. Cada firewall, cada reliquia, cada rig.`, `${totalAscensions} вознесений. Каждый файрвол, каждая реликвия, каждый риг.`),
    l('The Infinity Entity stays with you.', 'Sonsuzluk Varlığı seninle kalıyor.', 'A Entidade Infinita fica com você.', 'La Entidad Infinita se queda contigo.', 'Сущность Бесконечности остаётся с вами.'),
    '',
    'DATAFALL',
    l('A game by kNu', 'kNu tarafından bir oyun', 'Um jogo de kNu', 'Un juego de kNu', 'Игра от kNu'),
    l('Thank you for playing.', 'Oynadığın için teşekkürler.', 'Obrigado por jogar.', 'Gracias por jugar.', 'Спасибо за игру.'),
    '',
    l('The grid keeps falling. Endless mode is open: every ascension past 50 counts on the Endless leaderboard.', 'Ağ düşmeye devam ediyor. Sonsuz mod açıldı: 50 sonrası her yükseliş Sonsuz sıralamasında sayılır.', 'A grade continua caindo. O modo Infinito está aberto: cada ascensão após 50 conta no placar Infinito.', 'La red sigue cayendo. El modo Infinito está abierto: cada ascensión tras la 50 cuenta en la clasificación Infinita.', 'Сеть продолжает падать. Открыт бесконечный режим: каждое вознесение после 50 идёт в бесконечный рейтинг.'),
  ];

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2 }}
      data-testid="finale-credits"
    >
      <div className="max-w-xl px-6 text-center space-y-4">
        {lines.map((line, index) => (
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 + index * 0.9, duration: 0.8 }}
            className={
              line === 'DATAFALL'
                ? 'pt-2 text-4xl font-display font-bold tracking-[0.3em] text-orange-300'
                : index === 0
                  ? 'text-2xl font-bold text-orange-200'
                  : 'text-sm text-slate-300'
            }
          >
            {line || ' '}
          </motion.p>
        ))}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 + lines.length * 0.9 }}>
          <Button onClick={onContinue} className="mt-4 bg-orange-600 hover:bg-orange-500" data-testid="button-enter-endless">
            {l('Enter Endless Mode', 'Sonsuz Moda Gir', 'Entrar no Modo Infinito', 'Entrar al Modo Infinito', 'Войти в бесконечный режим')}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
