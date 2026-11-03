import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Music, LogOut, Settings, BookOpen, SkipForward, RotateCcw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useState } from 'react';
import { FPS_CAP_OPTIONS, getFpsCap, setFpsCap, type FpsCap } from '@/lib/fpsLimiter';

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
}: SettingsModalProps) {

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
          >
            <div className="bg-slate-950 border-2 border-cyan-500/50 rounded-lg shadow-2xl p-8 max-w-md w-96 backdrop-blur-xl">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <Settings className="w-6 h-6 text-cyan-400" />
                <h2 className="text-2xl font-bold text-cyan-400 font-mono tracking-wider">SETTINGS</h2>
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-cyan-500/0 via-cyan-500/50 to-cyan-500/0 mb-6" />

              {/* Audio Section */}
              <div className="space-y-4 mb-6">
                <p className="text-xs font-mono text-cyan-400 uppercase tracking-wider">Audio Settings</p>
                
                {/* Master Volume Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {masterVolume ? (
                      <Volume2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-red-400" />
                    )}
                    <span className="text-xs font-mono text-slate-300 uppercase">Master Volume</span>
                  </div>
                  <Button
                    onClick={onMasterVolumeToggle}
                    size="sm"
                    className={`h-7 px-3 text-xs font-mono transition-all ${
                      masterVolume
                        ? 'bg-green-600/20 hover:bg-green-600/30 border border-green-500 text-green-400'
                        : 'bg-red-600/20 hover:bg-red-600/30 border border-red-500 text-red-400'
                    }`}
                  >
                    {masterVolume ? '◆ ON' : '◇ OFF'}
                  </Button>
                </div>

                {/* Music Toggle */}
                <div className={`flex items-center justify-between ${!masterVolume ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-mono text-slate-300 uppercase">Background Music</span>
                  </div>
                  <Button
                    onClick={onToggleMusic}
                    size="sm"
                    disabled={!masterVolume}
                    className={`h-7 px-3 text-xs font-mono transition-all ${
                      isMusicPlaying
                        ? 'bg-green-600/20 hover:bg-green-600/30 border border-green-500 text-green-400'
                        : 'bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-400'
                    }`}
                  >
                    {isMusicPlaying ? '◆ ON' : '◇ OFF'}
                  </Button>
                </div>

                {/* Music Volume */}
                <div className={`pl-6 space-y-2 ${!masterVolume ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {musicVolume === 0 ? (
                        <VolumeX className="w-4 h-4 text-slate-500" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-cyan-400" />
                      )}
                      <span className="text-xs font-mono text-slate-400 uppercase">Music Volume</span>
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

                {/* SFX Volume */}
                <div className={`pl-6 space-y-2 ${!masterVolume ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {sfxVolume === 0 ? (
                        <VolumeX className="w-4 h-4 text-slate-500" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-purple-400" />
                      )}
                      <span className="text-xs font-mono text-slate-400 uppercase">SFX Volume</span>
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

                {/* Skip Track Button */}
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
                  NEXT TRACK
                </Button>
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-cyan-500/0 via-cyan-500/50 to-cyan-500/0 mb-6" />

              {/* Tutorial Section */}
              <div className="space-y-2 mb-6">
                <p className="text-xs font-mono text-cyan-400 uppercase tracking-wider mb-2">Tutorial</p>
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
                    SKIP TUTORIAL
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                      <BookOpen className="w-4 h-4 text-green-400" />
                      <span>{tutorialSkipped ? 'Tutorial skipped' : 'Tutorial complete'}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm('Restart the tutorial from the beginning?')) {
                          onResetTutorial?.();
                          onClose();
                        }
                      }}
                      className="w-full text-xs h-8 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/40 hover:border-purple-500/60 font-mono transition-all duration-200 flex items-center justify-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      RESTART TUTORIAL
                    </Button>
                  </div>
                )}
              </div>

              {/* Display Section */}
              <div className="space-y-4 mb-6">
                <p className="text-xs font-mono text-cyan-400 uppercase tracking-wider">Display Settings</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={onSetFullscreen}
                    size="sm"
                    className="h-8 text-[10px] font-mono bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/40"
                  >
                    FULLSCREEN
                  </Button>
                  <Button
                    onClick={onSetWindowed}
                    size="sm"
                    className="h-8 text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600"
                  >
                    WINDOWED
                  </Button>
                </div>
                <FpsCapSelector />
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-cyan-500/0 via-cyan-500/50 to-cyan-500/0 mb-6" />

              {/* Game Info */}
              <div className="text-center mb-6 space-y-1">
                <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">datafall v1.0.1</p>
                <p className="text-[10px] font-mono text-[#ffffff]">Auto-saves every 5 seconds</p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="w-full text-xs h-8 bg-cyan-500/5 hover:bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/60 font-mono transition-all duration-200"
                >
                  CLOSE
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onQuit}
                  className="w-full text-xs h-8 bg-cyan-500/5 hover:bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/60 font-mono transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <LogOut className="w-3 h-3" />
                  SAVE & EXIT
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


function FpsCapSelector() {
  const [cap, setCap] = useState<FpsCap>(getFpsCap());
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Animation FPS (lower = less CPU)</p>
      <p className="text-[9px] font-mono text-slate-500">Limits the game's animations. Your FPS counter may still show your monitor's refresh rate. For a full cap, set "Max Frame Rate" for DataFall in your GPU control panel.</p>
      <div className="grid grid-cols-4 gap-2">
        {FPS_CAP_OPTIONS.map((opt) => (
          <Button
            key={opt}
            onClick={() => {
              setFpsCap(opt);
              setCap(opt);
            }}
            size="sm"
            data-testid={`fps-cap-${opt}`}
            className={
              cap === opt
                ? 'h-8 text-[10px] font-mono bg-cyan-600/40 text-cyan-200 border border-cyan-400'
                : 'h-8 text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600'
            }
          >
            {opt === 0 ? 'UNLIMITED' : opt}
          </Button>
        ))}
      </div>
    </div>
  );
}
