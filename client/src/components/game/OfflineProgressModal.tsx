import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Clock, Database, Coins, Bitcoin, Zap } from "lucide-react";
import type { OfflineProgress } from "@/lib/useGame";
import { localizeInlineText, useI18n, type Language } from "@/lib/i18n";

interface OfflineProgressModalProps {
  progress: OfflineProgress | null;
  onClose: () => void;
}

function formatTime(seconds: number, language: Language): string {
  if (seconds < 60) {
    if (language === "tr") return `${seconds} saniye`;
    if (language === "pt-BR") return `${seconds} segundos`;
    if (language === "es") return `${seconds} segundos`;
    if (language === "ru") return `${seconds} сек`;
    return `${seconds} seconds`;
  }
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    if (language === "tr") return `${mins} dakika`;
    if (language === "pt-BR") return `${mins} minuto${mins > 1 ? 's' : ''}`;
    if (language === "es") return `${mins} minuto${mins > 1 ? 's' : ''}`;
    if (language === "ru") return `${mins} мин`;
    return `${mins} minute${mins > 1 ? 's' : ''}`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (mins === 0) {
    if (language === "tr") return `${hours} saat`;
    if (language === "pt-BR") return `${hours} hora${hours > 1 ? 's' : ''}`;
    if (language === "es") return `${hours} hora${hours > 1 ? 's' : ''}`;
    if (language === "ru") return `${hours} ч`;
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  if (language === "tr") return `${hours}sa ${mins}dk`;
  if (language === "pt-BR") return `${hours}h ${mins}min`;
  if (language === "es") return `${hours}h ${mins}min`;
  if (language === "ru") return `${hours}ч ${mins}м`;
  return `${hours}h ${mins}m`;
}

function formatNumber(num: number): string {
  if (!Number.isFinite(num)) return '0';

  const abs = Math.abs(num);
  if (abs < 1000) {
    if (Number.isInteger(num)) return num.toLocaleString();
    return num.toFixed(1).replace(/\.0$/, '');
  }

  const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  const rawTier = Math.floor(Math.log10(abs) / 3);
  if (rawTier >= suffixes.length) {
    return num.toExponential(2).replace('e+', 'e');
  }
  const tier = rawTier;
  const scaled = num / Math.pow(1000, tier);
  const scaledAbs = Math.abs(scaled);
  const value = scaledAbs >= 100 ? scaled.toFixed(0) : scaledAbs >= 10 ? scaled.toFixed(1) : scaled.toFixed(2);
  return `${value.replace(/\.0+$|(\.\d*[1-9])0+$/, '$1')}${suffixes[tier]}`;
}

export function OfflineProgressModal({ progress, onClose }: OfflineProgressModalProps) {
  const { language } = useI18n();
  if (!progress) return null;
  const l = (en: string, tr: string, pt: string, es?: string, ru?: string) => localizeInlineText(language, en, tr, pt, es, ru);

  const hasAnyReward = progress.dataEarned > 0 || progress.creditsEarned > 0 || 
                       progress.cryptoEarned > 0;
  const maxOfflineTime = progress.maxTime ?? 8 * 60 * 60;
  const title = l("Welcome Back, Operator", "Tekrar Hos Geldin", "Boas-vindas de volta, Operador", "Bienvenido de nuevo, Operador");
  const awayText = l(
    `You were away for ${formatTime(progress.timeAway, language)}`,
    `${formatTime(progress.timeAway, language)} boyunca uzaktaydin`,
    `Voce ficou ausente por ${formatTime(progress.timeAway, language)}`,
    `Estuviste ausente durante ${formatTime(progress.timeAway, language)}`,
  );
  const maxOfflineText = l(
    `(Max ${formatTime(maxOfflineTime, language)} of offline progress)`,
    `(En fazla ${formatTime(maxOfflineTime, language)} çevrimdışı ilerleme)`,
    `(Maximo de ${formatTime(maxOfflineTime, language)} de progresso offline)`,
    `(Maximo ${formatTime(maxOfflineTime, language)} de progreso offline)`,
  );
  const rewardsText = l(
    "Your systems continued mining while you were away:",
    "Sen yokken sistemlerin kazim yapmaya devam etti:",
    "Seus sistemas continuaram minerando enquanto voce estava ausente:",
    "Tus sistemas siguieron minando mientras estabas ausente:",
  );
  const continueText = l("Continue Hacking", "Hacking'e Devam Et", "Continuar Hackeando");
  const dataLabel = l("Data", "Veri", "Dados");
  const nodesLabel = l("Nodes", "Dizin", "Nodes");

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        data-testid="modal-offline-progress"
      >
        <motion.div
          className="relative w-full max-w-md mx-4 bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-cyan-500/50 rounded-xl overflow-hidden shadow-2xl shadow-cyan-500/20"
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 50 }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-magenta-500/5 pointer-events-none" />
          
          <div className="relative p-6 space-y-5">
            <div className="text-center space-y-2">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Zap className="w-12 h-12 mx-auto text-cyan-400" />
              </motion.div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-magenta-400 bg-clip-text text-transparent">
                {title}
              </h2>
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{awayText}</span>
              </div>
              <p className="text-xs text-muted-foreground/70">
                {maxOfflineText}
              </p>
            </div>

            {hasAnyReward && (
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-3 border border-slate-700/50">
                <p className="text-sm text-center text-cyan-300 font-medium">
                  {rewardsText}
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  {progress.dataEarned > 0 && (
                    <motion.div 
                      className="flex items-center gap-2 bg-cyan-500/10 rounded-lg p-3 border border-cyan-500/20"
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <Database className="w-5 h-5 text-cyan-400" />
                      <div>
                        <p className="text-xs text-muted-foreground">{dataLabel}</p>
                        <p className="text-sm font-bold text-cyan-400">+{formatNumber(progress.dataEarned)}</p>
                      </div>
                    </motion.div>
                  )}
                  
                  {progress.creditsEarned > 0 && (
                    <motion.div 
                      className="flex items-center gap-2 bg-amber-500/10 rounded-lg p-3 border border-amber-500/20"
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Coins className="w-5 h-5 text-amber-400" />
                      <div>
                        <p className="text-xs text-muted-foreground">{nodesLabel}</p>
                        <p className="text-sm font-bold text-amber-400">+{formatNumber(progress.creditsEarned)}</p>
                      </div>
                    </motion.div>
                  )}
                  
                  {progress.cryptoEarned > 0 && (
                    <motion.div 
                      className="flex items-center gap-2 bg-orange-500/10 rounded-lg p-3 border border-orange-500/20"
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Bitcoin className="w-5 h-5 text-orange-400" />
                      <div>
                        <p className="text-xs text-muted-foreground">{l('Crypto', 'Kripto', 'Cripto')}</p>
                        <p className="text-sm font-bold text-orange-400">+{formatNumber(progress.cryptoEarned)}</p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            <Button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-bold"
              data-testid="button-claim-offline"
            >
              <Zap className="w-4 h-4 mr-2" />
              {continueText}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
