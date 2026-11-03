import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bug, ChevronDown, ChevronUp, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DebugPanelProps {
  onAddData: (amount: number) => void;
  onAddCredits: (amount: number) => void;
  onAddCrypto: (amount: number) => void;
  onAddPrestige: (amount: number) => void;
  onAddAscensionCount: (amount: number) => void;
  onSetTime: (seconds: number) => void;
  onReset: () => void;
  onSpawnPickup: (type: 'data' | 'credits' | 'crit' | 'autoclick') => void;
  onHide?: () => void;
}

export function DebugPanel({ 
  onAddData, 
  onAddCredits, 
  onAddCrypto, 
  onAddPrestige,
  onAddAscensionCount,
  onSetTime,
  onReset,
  onSpawnPickup,
  onHide
}: DebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-4 left-4 z-[200]">
      <motion.div 
        className="bg-slate-950/95 border-2 border-red-500/50 rounded-lg shadow-2xl backdrop-blur-xl overflow-hidden"
        layout
      >
        <div className="flex items-center justify-between px-4 py-2 text-red-400 hover:bg-red-500/10 transition-colors">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 flex-1 text-left"
          >
            <Bug className="w-4 h-4" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider">Debug Panel</span>
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            onClick={onHide}
            className="flex items-center justify-center hover:bg-red-500/20 rounded transition-colors p-1"
            title="Hide debug panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-4 border-t border-red-500/30">
                <div className="space-y-2">
                  <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">Data</p>
                  <div className="grid grid-cols-4 gap-1">
                    <Button size="sm" onClick={() => onAddData(100000)} className="text-[10px] h-7 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/40">+100K</Button>
                    <Button size="sm" onClick={() => onAddData(1000000)} className="text-[10px] h-7 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/40">+1M</Button>
                    <Button size="sm" onClick={() => onAddData(10000000)} className="text-[10px] h-7 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/40">+10M</Button>
                    <Button size="sm" onClick={() => onAddData(100000000)} className="text-[10px] h-7 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/40">+100M</Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-mono text-yellow-400 uppercase tracking-wider">Nodes</p>
                  <div className="grid grid-cols-4 gap-1">
                    <Button size="sm" onClick={() => onAddCredits(100000)} className="text-[10px] h-7 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-300 border border-yellow-500/40">+100K</Button>
                    <Button size="sm" onClick={() => onAddCredits(1000000)} className="text-[10px] h-7 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-300 border border-yellow-500/40">+1M</Button>
                    <Button size="sm" onClick={() => onAddCredits(10000000)} className="text-[10px] h-7 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-300 border border-yellow-500/40">+10M</Button>
                    <Button size="sm" onClick={() => onAddCredits(100000000)} className="text-[10px] h-7 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-300 border border-yellow-500/40">+100M</Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-mono text-orange-400 uppercase tracking-wider">Crypto</p>
                  <div className="grid grid-cols-4 gap-1">
                    <Button size="sm" onClick={() => onAddCrypto(100000)} className="text-[10px] h-7 bg-orange-600/20 hover:bg-orange-600/40 text-orange-300 border border-orange-500/40">+100K</Button>
                    <Button size="sm" onClick={() => onAddCrypto(1000000)} className="text-[10px] h-7 bg-orange-600/20 hover:bg-orange-600/40 text-orange-300 border border-orange-500/40">+1M</Button>
                    <Button size="sm" onClick={() => onAddCrypto(10000000)} className="text-[10px] h-7 bg-orange-600/20 hover:bg-orange-600/40 text-orange-300 border border-orange-500/40">+10M</Button>
                    <Button size="sm" onClick={() => onAddCrypto(100000000)} className="text-[10px] h-7 bg-orange-600/20 hover:bg-orange-600/40 text-orange-300 border border-orange-500/40">+100M</Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-mono text-purple-400 uppercase tracking-wider">Prestige</p>
                  <div className="grid grid-cols-4 gap-1">
                    <Button size="sm" onClick={() => onAddPrestige(100)} className="text-[10px] h-7 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/40">+100</Button>
                    <Button size="sm" onClick={() => onAddPrestige(1000)} className="text-[10px] h-7 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/40">+1K</Button>
                    <Button size="sm" onClick={() => onAddPrestige(10000)} className="text-[10px] h-7 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/40">+10K</Button>
                    <Button size="sm" onClick={() => onAddPrestige(100000)} className="text-[10px] h-7 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/40">+100K</Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-mono text-fuchsia-400 uppercase tracking-wider">★ Ascension (Count)</p>
                  <div className="grid grid-cols-4 gap-1">
                    <Button size="sm" onClick={() => onAddAscensionCount(1)} className="text-[10px] h-7 bg-fuchsia-600/20 hover:bg-fuchsia-600/40 text-fuchsia-300 border border-fuchsia-500/40">+1</Button>
                    <Button size="sm" onClick={() => onAddAscensionCount(5)} className="text-[10px] h-7 bg-fuchsia-600/20 hover:bg-fuchsia-600/40 text-fuchsia-300 border border-fuchsia-500/40">+5</Button>
                    <Button size="sm" onClick={() => onAddAscensionCount(10)} className="text-[10px] h-7 bg-fuchsia-600/20 hover:bg-fuchsia-600/40 text-fuchsia-300 border border-fuchsia-500/40">+10</Button>
                    <Button size="sm" onClick={() => onAddAscensionCount(25)} className="text-[10px] h-7 bg-fuchsia-600/20 hover:bg-fuchsia-600/40 text-fuchsia-300 border border-fuchsia-500/40">+25</Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-mono text-green-400 uppercase tracking-wider">Time Skip</p>
                  <div className="grid grid-cols-4 gap-1">
                    <Button size="sm" onClick={() => onSetTime(60)} className="text-[10px] h-7 bg-green-600/20 hover:bg-green-600/40 text-green-300 border border-green-500/40">1m</Button>
                    <Button size="sm" onClick={() => onSetTime(300)} className="text-[10px] h-7 bg-green-600/20 hover:bg-green-600/40 text-green-300 border border-green-500/40">5m</Button>
                    <Button size="sm" onClick={() => onSetTime(600)} className="text-[10px] h-7 bg-green-600/20 hover:bg-green-600/40 text-green-300 border border-green-500/40">10m</Button>
                    <Button size="sm" onClick={() => onSetTime(900)} className="text-[10px] h-7 bg-green-600/20 hover:bg-green-600/40 text-green-300 border border-green-500/40">15m</Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-mono text-pink-400 uppercase tracking-wider">Spawn Pickup (Test)</p>
                  <div className="grid grid-cols-4 gap-1">
                    <Button size="sm" onClick={() => onSpawnPickup('data')} className="text-[10px] h-7 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/40" data-testid="debug-spawn-data">DATA</Button>
                    <Button size="sm" onClick={() => onSpawnPickup('credits')} className="text-[10px] h-7 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-300 border border-yellow-500/40" data-testid="debug-spawn-credits">NODES</Button>
                    <Button size="sm" onClick={() => onSpawnPickup('crit')} className="text-[10px] h-7 bg-pink-600/20 hover:bg-pink-600/40 text-pink-300 border border-pink-500/40" data-testid="debug-spawn-crit">CRIT!</Button>
                    <Button size="sm" onClick={() => onSpawnPickup('autoclick')} className="text-[10px] h-7 bg-fuchsia-600/20 hover:bg-fuchsia-600/40 text-fuchsia-300 border border-fuchsia-500/40" data-testid="debug-spawn-autoclick">AUTO</Button>
                  </div>
                </div>

                <div className="pt-2 border-t border-red-500/30">
                  <Button 
                    size="sm" 
                    onClick={() => {
                      if (confirm('Reset all progress? This will restart the game from the beginning.')) onReset();
                    }}
                    className="w-full text-[10px] h-7 bg-red-600/30 hover:bg-red-600/50 text-red-300 border border-red-500/40"
                  >
                    RESTART GAME
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
