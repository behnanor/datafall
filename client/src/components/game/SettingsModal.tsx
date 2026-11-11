import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Music, LogOut, Settings, BookOpen, SkipForward, RotateCcw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useI18n, type Language } from '@/lib/i18n';
import { FPS_CAP_OPTIONS, getFpsCap, setFpsCap, type FpsCap } from '@/lib/fpsLimiter';
import { canOpenLogsFolder, openLogsFolder } from '@/lib/errorLog';
import { UI_SCALE_OPTIONS, setUiScale, setClickEffectsEnabled, setScreenShakeEnabled, useDisplayPrefs } from '@/lib/displayPrefs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterVolume: boolean;
  onMasterVolumeToggle: () => void;
  musicVolume: number;
  onMusicVolumeChange: (volume: number) => void;
  sfxVolume: number;
  onSfxVolumeChange: (volume: number) => void;
  isMusicPlaying: boolean;
  onToggleMusic: () => void;
  onSkipTrack?: () => void;
  onQuit: () => void;
  tutorialComplete?: boolean;
  tutorialSkipped?: boolean;
  onSkipTutorial?: () => void;
  onResetTutorial?: () => void;
  onSetFullscreen?: () => void;
  onSetWindowed?: () => void;
  reduceSceneGlow?: boolean;
  onSetReduceSceneGlow?: (reduced: boolean) => void;
  onResetGame?: () => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  masterVolume,
  onMasterVolumeToggle,
  musicVolume,
  onMusicVolumeChange,
  sfxVolume,
  onSfxVolumeChange,
  isMusicPlaying,
  onToggleMusic,
  onSkipTrack,
  onQuit,
  tutorialComplete,
  tutorialSkipped,
  onSkipTutorial,
  onResetTutorial,
  onSetFullscreen,
  onSetWindowed,
  reduceSceneGlow = false,
  onSetReduceSceneGlow,
  onResetGame,
}: SettingsModalProps) {
  const { language, setLanguage, t } = useI18n();
  const [resetArmed, setResetArmed] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const stopPointerEvent = (event: React.PointerEvent | React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const languageOptions = [
    { value: 'tr', label: `TR - ${t('common.turkish')}` },
    { value: 'en', label: `EN - ${t('common.english')}` },
    { value: 'pt-BR', label: `PT-BR - ${t('common.portugueseBrazil')}` },
    { value: 'es', label: `ES - ${t('common.spanish')}` },
    { value: 'ru', label: `RU - ${t('common.russian')}` },
    { value: 'zh-CN', label: `ZH-CN - ${t('common.simplifiedChinese')}` },
  ] as const;
  const reducedGlowLabel =
    language === 'tr'
      ? 'AZALTILMIS'
      : language === 'pt-BR'
        ? 'REDUZIDO'
        : language === 'es'
          ? 'REDUCIDO'
          : language === 'ru'
            ? 'СНИЖЕНО'
            : language === 'zh-CN'
              ? '已降低'
              : 'REDUCED';
  const fullGlowLabel =
    language === 'tr'
      ? 'TAM'
      : language === 'pt-BR'
        ? 'COMPLETO'
        : language === 'es'
          ? 'COMPLETO'
          : language === 'ru'
            ? 'ПОЛНОЕ'
            : language === 'zh-CN'
              ? '完整'
              : 'FULL';
  useEffect(() => {
    if (!isOpen) {
      setResetArmed(false);
      setResetConfirmOpen(false);
    }
  }, [isOpen]);

  const handleResetData = () => {
    if (!resetArmed) {
      setResetArmed(true);
      return;
    }
    setResetConfirmOpen(true);
  };

  const confirmResetData = () => {
    onResetGame?.();
    setResetConfirmOpen(false);
    setResetArmed(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onPointerDown={stopPointerEvent}
            onClick={(event) => {
              stopPointerEvent(event);
              onClose();
            }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onPointerDown={stopPointerEvent}
            onClick={(event) => event.stopPropagation()}
            className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
          >
            <div className="bg-slate-950 border-2 border-cyan-500/50 rounded-lg shadow-2xl p-8 max-w-md w-96 backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-6">
                <Settings className="w-6 h-6 text-cyan-400" />
                <h2 className="text-2xl font-bold text-cyan-400 font-mono tracking-wider">{t('settings.title')}</h2>
              </div>

              <div className="h-px bg-gradient-to-r from-cyan-500/0 via-cyan-500/50 to-cyan-500/0 mb-6" />

              <div className="space-y-4 mb-6">
                <p className="text-xs font-mono text-cyan-400 uppercase tracking-wider">{t('settings.audioSettings')}</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {masterVolume ? (
                      <Volume2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-red-400" />
                    )}
                    <span className="text-xs font-mono text-slate-300 uppercase">{t('settings.masterVolume')}</span>
                  </div>
                  <div className="flex shrink-0 overflow-hidden rounded-md border border-slate-700 bg-slate-950/80">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (!masterVolume) onMasterVolumeToggle();
                      }}
                      aria-pressed={masterVolume}
                      className={`h-7 rounded-none px-3 text-[10px] font-mono transition-all ${
                        masterVolume
                          ? 'bg-green-600/20 text-green-200 shadow-[inset_0_0_0_1px_rgba(34,197,94,0.35)]'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {t('common.on')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (masterVolume) onMasterVolumeToggle();
                      }}
                      aria-pressed={!masterVolume}
                      className={`h-7 rounded-none border-l border-slate-700 px-3 text-[10px] font-mono transition-all ${
                        !masterVolume
                          ? 'bg-red-600/20 text-red-200 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.35)]'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {t('common.off')}
                    </Button>
                  </div>
                </div>

                <div className={`flex items-center justify-between ${!masterVolume ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-mono text-slate-300 uppercase">{t('settings.backgroundMusic')}</span>
                  </div>
                  <div className="flex shrink-0 overflow-hidden rounded-md border border-slate-700 bg-slate-950/80">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={!masterVolume}
                      onClick={() => {
                        if (!isMusicPlaying) onToggleMusic();
                      }}
                      aria-pressed={isMusicPlaying}
                      className={`h-7 rounded-none px-3 text-[10px] font-mono transition-all ${
                        isMusicPlaying
                          ? 'bg-green-600/20 text-green-200 shadow-[inset_0_0_0_1px_rgba(34,197,94,0.35)]'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {t('common.on')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={!masterVolume}
                      onClick={() => {
                        if (isMusicPlaying) onToggleMusic();
                      }}
                      aria-pressed={!isMusicPlaying}
                      className={`h-7 rounded-none border-l border-slate-700 px-3 text-[10px] font-mono transition-all ${
                        !isMusicPlaying
                          ? 'bg-slate-700/70 text-slate-200 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.28)]'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {t('common.off')}
                    </Button>
                  </div>
                </div>

                <div className={`pl-6 space-y-2 ${!masterVolume ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {musicVolume === 0 ? (
                        <VolumeX className="w-4 h-4 text-slate-500" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-cyan-400" />
                      )}
                      <span className="text-xs font-mono text-slate-400 uppercase">{t('settings.musicVolume')}</span>
                    </div>
                    <span className="text-xs font-mono text-cyan-400 font-bold">{Math.round(musicVolume * 100)}%</span>
                  </div>
                  <Slider
                    value={[musicVolume]}
                    onValueChange={(val) => onMusicVolumeChange(val[0])}
                    max={1}
                    step={0.01}
                    className="w-full"
                    disabled={!masterVolume}
                  />
                </div>

                <div className={`pl-6 space-y-2 ${!masterVolume ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {sfxVolume === 0 ? (
                        <VolumeX className="w-4 h-4 text-slate-500" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-purple-400" />
                      )}
                      <span className="text-xs font-mono text-slate-400 uppercase">{t('settings.sfxVolume')}</span>
                    </div>
                    <span className="text-xs font-mono text-purple-400 font-bold">{Math.round(sfxVolume * 100)}%</span>
                  </div>
                  <Slider
                    value={[sfxVolume]}
                    onValueChange={(val) => onSfxVolumeChange(val[0])}
                    max={1}
                    step={0.01}
                    className="w-full"
                    disabled={!masterVolume}
                  />
                </div>

                <Button
                  onClick={onSkipTrack}
                  disabled={!masterVolume || !isMusicPlaying}
                  className={`w-full text-xs h-8 font-mono transition-all flex items-center justify-center gap-1 ${
                    masterVolume && isMusicPlaying
                      ? 'bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/40'
                      : 'bg-slate-800 border border-slate-600 text-slate-500'
                  }`}
                >
                  <SkipForward className="w-3 h-3" />
                  {t('settings.nextTrack')}
                </Button>
              </div>

              <div className="h-px bg-gradient-to-r from-cyan-500/0 via-cyan-500/50 to-cyan-500/0 mb-6" />

              <div className="space-y-2 mb-6">
                <p className="text-xs font-mono text-cyan-400 uppercase tracking-wider mb-2">{t('common.tutorial')}</p>
                {!tutorialComplete && !tutorialSkipped ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onSkipTutorial?.();
                      onClose();
                    }}
                    className="w-full text-xs h-8 bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 border border-amber-500/40 hover:border-amber-500/60 font-mono transition-all duration-200 flex items-center justify-center gap-1"
                  >
                    <SkipForward className="w-3 h-3" />
                    {t('settings.skipTutorial')}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                      <BookOpen className="w-4 h-4 text-green-400" />
                      <span>{tutorialSkipped ? t('settings.tutorialStatusSkipped') : t('settings.tutorialStatusComplete')}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm(t('settings.restartTutorialConfirm'))) {
                          onResetTutorial?.();
                          onClose();
                        }
                      }}
                      className="w-full text-xs h-8 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/40 hover:border-purple-500/60 font-mono transition-all duration-200 flex items-center justify-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      {t('settings.restartTutorial')}
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-3 mb-6">
                <p className="text-xs font-mono text-cyan-400 uppercase tracking-wider">{t('settings.languageSettings')}</p>
                <Select value={language} onValueChange={(value) => setLanguage(value as typeof language)}>
                  <SelectTrigger className="h-9 w-full border-cyan-500/40 bg-slate-900 text-xs font-mono text-cyan-100 shadow-[0_0_18px_rgba(6,182,212,0.12)] focus:ring-1 focus:ring-cyan-400/60">
                    <SelectValue placeholder={t('settings.languageSettings')} />
                  </SelectTrigger>
                  <SelectContent className="border-cyan-500/40 bg-slate-950 text-xs font-mono text-cyan-100">
                    {languageOptions.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        className="text-xs font-mono text-cyan-100 focus:bg-cyan-500/15 focus:text-cyan-50"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4 mb-6">
                <p className="text-xs font-mono text-cyan-400 uppercase tracking-wider">{t('settings.displaySettings')}</p>
                <div className="flex items-start justify-between gap-3 rounded-md border border-cyan-500/20 bg-slate-900/70 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-mono uppercase text-slate-200">{t('settings.disableSceneGlow')}</p>
                    <p className="mt-1 text-[10px] font-mono text-slate-400">{t('settings.disableSceneGlowHint')}</p>
                  </div>
                  <div className="flex shrink-0 overflow-hidden rounded-md border border-slate-700 bg-slate-950/80">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onSetReduceSceneGlow?.(false)}
                      aria-pressed={!reduceSceneGlow}
                      className={`h-7 rounded-none px-3 text-[10px] font-mono transition-all ${
                        !reduceSceneGlow
                          ? 'bg-cyan-600/20 text-cyan-200 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.35)]'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {fullGlowLabel}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onSetReduceSceneGlow?.(true)}
                      aria-pressed={reduceSceneGlow}
                      className={`h-7 rounded-none border-l border-slate-700 px-3 text-[10px] font-mono transition-all ${
                        reduceSceneGlow
                          ? 'bg-amber-600/20 text-amber-200 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.35)]'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {reducedGlowLabel}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={onSetFullscreen}
                    size="sm"
                    className="h-8 text-[10px] font-mono bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/40"
                  >
                    {t('settings.fullscreen')}
                  </Button>
                  <Button
                    onClick={onSetWindowed}
                    size="sm"
                    className="h-8 text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600"
                  >
                    {t('settings.windowed')}
                  </Button>
                </div>
                <FpsCapSelector language={language} />
                <DisplayPrefsSelector language={language} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetData}
                  className={`w-full text-xs h-8 font-mono transition-all duration-200 ${
                    resetArmed
                      ? 'bg-red-600/15 hover:bg-red-600/25 text-red-200 border border-red-500/50'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700'
                  }`}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  {resetArmed
                    ? (language === 'tr' ? 'Sıfırlamayı Onayla' : language === 'pt-BR' ? 'Confirmar Reset' : language === 'es' ? 'Confirmar Reinicio' : language === 'ru' ? 'Подтвердить сброс' : language === 'zh-CN' ? '确认重置' : 'Confirm Reset')
                    : (language === 'tr' ? 'Veriyi Sıfırla' : language === 'pt-BR' ? 'Resetar Dados' : language === 'es' ? 'Restablecer Datos' : language === 'ru' ? 'Сбросить данные' : language === 'zh-CN' ? '重置数据' : 'Reset Data')}
                </Button>
              </div>

              <div className="h-px bg-gradient-to-r from-cyan-500/0 via-cyan-500/50 to-cyan-500/0 mb-6" />

              <div className="text-center mb-6 space-y-1">
                <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">{`DataFall V${__APP_VERSION__}${import.meta.env.VITE_TEST_BUILD === 'true' ? ' TEST' : ''}`}</p>
                <p className="text-[10px] font-mono text-[#ffffff]">{t('settings.autoSave')}</p>
                {canOpenLogsFolder() && (
                  <button
                    type="button"
                    onClick={openLogsFolder}
                    className="text-[10px] font-mono text-slate-500 underline hover:text-slate-300"
                  >
                    {language === 'tr' ? 'Log klasörünü aç' : language === 'pt-BR' ? 'Abrir pasta de logs' : language === 'es' ? 'Abrir carpeta de registros' : language === 'ru' ? 'Открыть папку логов' : language === 'zh-CN' ? '打开日志文件夹' : 'Open log folder'}
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    onClose();
                  }}
                  className="w-full text-xs h-8 bg-cyan-500/5 hover:bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/60 font-mono transition-all duration-200"
                >
                  {t('common.close')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onQuit}
                  className="w-full text-xs h-8 bg-cyan-500/5 hover:bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/60 font-mono transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <LogOut className="w-3 h-3" />
                  {t('settings.saveAndExit')}
                </Button>
              </div>
            </div>
          </motion.div>

          <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
            <AlertDialogContent className="max-w-md border-red-500/35 bg-slate-950 text-slate-100 shadow-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-mono text-red-300">
                  {language === 'tr' ? 'Tüm veriyi sıfırla?' : language === 'pt-BR' ? 'Resetar todos os dados?' : language === 'es' ? 'Restablecer todos los datos?' : language === 'ru' ? 'Сбросить все данные?' : language === 'zh-CN' ? '重置全部数据？' : 'Reset all data?'}
                </AlertDialogTitle>
                <AlertDialogDescription className="font-mono text-xs leading-5 text-slate-300">
                  {language === 'tr'
                    ? 'Bu, oyunu en başa döndürür. Tüm kayıtlı veri, yükseltmeler, prestij, kozmetikler ve istatistikler kalıcı olarak silinir. Bu işlem geri alınamaz.'
                    : language === 'pt-BR'
                      ? 'Isso leva o jogo de volta ao inicio. Todos os dados salvos, melhorias, prestigio, cosmeticos e estatisticas serao apagados permanentemente. Esta acao nao pode ser desfeita.'
                      : language === 'es'
                        ? 'Esto devuelve el juego al inicio. Todos los datos guardados, mejoras, prestigio, cosmeticos y estadisticas se borraran permanentemente. Esta accion no se puede deshacer.'
                        : language === 'ru'
                          ? 'Это вернет игру к самому началу. Все сохраненные данные, улучшения, престиж, косметика и статистика будут удалены навсегда. Это действие нельзя отменить.'
                          : language === 'zh-CN'
                            ? '这会将游戏重置到最初状态。所有存档数据、升级、声望、外观和统计都会被永久删除。此操作无法撤销。'
                            : 'This sends the game back to square one. All saved data, upgrades, prestige, cosmetics, and stats will be permanently deleted. This action cannot be undone.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                  onClick={() => {
                    setResetConfirmOpen(false);
                    setResetArmed(false);
                  }}
                >
                  {t('common.close')}
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 text-white hover:bg-red-500"
                  onClick={confirmResetData}
                >
                  {language === 'tr' ? 'Her şeyi sil' : language === 'pt-BR' ? 'Apagar tudo' : language === 'es' ? 'Borrar todo' : language === 'ru' ? 'Удалить все' : language === 'zh-CN' ? '全部删除' : 'Delete everything'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </AnimatePresence>
  );
}

const FPS_LIMIT_LABEL: Record<Language, string> = {
  en: 'FPS Limit (lower = less CPU/GPU)',
  tr: 'FPS Limiti (düşük = daha az CPU/GPU)',
  'pt-BR': 'Limite de FPS (menor = menos CPU/GPU)',
  es: 'Limite de FPS (menor = menos CPU/GPU)',
  ru: 'Лимит FPS (меньше = ниже нагрузка)',
  'zh-CN': '帧率上限（越低越省 CPU/GPU）',
};

const FPS_UNLIMITED_LABEL: Record<Language, string> = {
  en: 'UNLIMITED',
  tr: 'SINIRSIZ',
  'pt-BR': 'ILIMITADO',
  es: 'ILIMITADO',
  ru: 'БЕЗ ЛИМИТА',
  'zh-CN': '不限',
};

// v1.04: text/UI size and click effects on/off (saved per device).
const UI_SCALE_LABEL: Record<Language, string> = {
  en: 'Text & UI size', tr: 'Yazı ve arayüz boyutu', 'pt-BR': 'Tamanho do texto e da interface', es: 'Tamaño de texto e interfaz', ru: 'Размер текста и интерфейса', 'zh-CN': '文字与界面大小',
};
const CLICK_FX_LABEL: Record<Language, string> = {
  en: 'Click effects', tr: 'Tıklama efektleri', 'pt-BR': 'Efeitos de clique', es: 'Efectos de clic', ru: 'Эффекты кликов', 'zh-CN': '点击特效',
};
const SCREEN_SHAKE_LABEL: Record<Language, string> = {
  en: 'Screen shake', tr: 'Ekran sarsıntısı', 'pt-BR': 'Tremor de tela', es: 'Vibración de pantalla', ru: 'Тряска экрана', 'zh-CN': '屏幕震动',
};
const ON_LABEL: Record<Language, string> = { en: 'On', tr: 'Açık', 'pt-BR': 'Ligado', es: 'Activado', ru: 'Вкл', 'zh-CN': '开' };
const OFF_LABEL: Record<Language, string> = { en: 'Off', tr: 'Kapalı', 'pt-BR': 'Desligado', es: 'Desactivado', ru: 'Выкл', 'zh-CN': '关' };
function DisplayPrefsSelector({ language }: { language: Language }) {
  const { uiScale, clickEffects, screenShake } = useDisplayPrefs();
  const btn = (active: boolean) => active
    ? 'h-8 text-[10px] font-mono bg-cyan-600/40 text-cyan-200 border border-cyan-400'
    : 'h-8 text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600';
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{UI_SCALE_LABEL[language] ?? UI_SCALE_LABEL.en}</p>
        <div className="grid grid-cols-4 gap-2">
          {UI_SCALE_OPTIONS.map((opt) => (
            <Button key={opt} size="sm" aria-pressed={uiScale === opt} data-testid={`ui-scale-${opt}`} onClick={() => setUiScale(opt)} className={btn(uiScale === opt)}>
              {Math.round(opt * 100)}%
            </Button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{CLICK_FX_LABEL[language] ?? CLICK_FX_LABEL.en}</p>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" aria-pressed={clickEffects} data-testid="click-fx-on" onClick={() => setClickEffectsEnabled(true)} className={btn(clickEffects)}>{ON_LABEL[language] ?? ON_LABEL.en}</Button>
          <Button size="sm" aria-pressed={!clickEffects} data-testid="click-fx-off" onClick={() => setClickEffectsEnabled(false)} className={btn(!clickEffects)}>{OFF_LABEL[language] ?? OFF_LABEL.en}</Button>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{SCREEN_SHAKE_LABEL[language] ?? SCREEN_SHAKE_LABEL.en}</p>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" aria-pressed={screenShake} data-testid="screen-shake-on" onClick={() => setScreenShakeEnabled(true)} className={btn(screenShake)}>{ON_LABEL[language] ?? ON_LABEL.en}</Button>
          <Button size="sm" aria-pressed={!screenShake} data-testid="screen-shake-off" onClick={() => setScreenShakeEnabled(false)} className={btn(!screenShake)}>{OFF_LABEL[language] ?? OFF_LABEL.en}</Button>
        </div>
      </div>
    </div>
  );
}

function FpsCapSelector({ language }: { language: Language }) {
  const [cap, setCap] = useState<FpsCap>(getFpsCap());
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{FPS_LIMIT_LABEL[language] ?? FPS_LIMIT_LABEL.en}</p>
      <div className="grid grid-cols-4 gap-2">
        {FPS_CAP_OPTIONS.map((opt) => (
          <Button
            key={opt}
            onClick={() => {
              setFpsCap(opt);
              setCap(opt);
            }}
            size="sm"
            aria-pressed={cap === opt}
            data-testid={`fps-cap-${opt}`}
            className={
              cap === opt
                ? 'h-8 text-[10px] font-mono bg-cyan-600/40 text-cyan-200 border border-cyan-400'
                : 'h-8 text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600'
            }
          >
            {opt === 0 ? (FPS_UNLIMITED_LABEL[language] ?? FPS_UNLIMITED_LABEL.en) : opt}
          </Button>
        ))}
      </div>
    </div>
  );
}
