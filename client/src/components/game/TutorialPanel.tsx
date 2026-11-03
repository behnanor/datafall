import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Bot, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import type { TutorialPhaseWithObjectives, TutorialState } from '@/lib/useGame';

interface TutorialPanelProps {
  currentPhase: TutorialPhaseWithObjectives | null;
  tutorial: TutorialState;
  onSkip: () => void;
  onStart: () => void;
  isTutorialComplete: boolean;
}

export const TutorialPanel = memo(function TutorialPanel({
  currentPhase,
  tutorial,
  onSkip,
  onStart,
  isTutorialComplete,
}: TutorialPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragRef = useRef<HTMLDivElement>(null);

  if (tutorial.skipped || isTutorialComplete) return null;

  if (!tutorial.started) {
    return (
      <motion.div
        ref={dragRef}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        drag
        dragElastic={0.2}
        dragMomentum={false}
        onDragEnd={(event, info) => {
          setPosition(prev => ({ x: prev.x + info.offset.x, y: prev.y + info.offset.y }));
        }}
        style={{ x: position.x, y: position.y }}
        className="fixed top-20 left-[75%] -translate-x-1/2 z-[30] w-[360px] max-w-[92vw] cursor-grab active:cursor-grabbing"
        data-testid="tutorial-welcome"
      >
        <div className="bg-slate-900/95 border border-cyan-500/50 rounded-lg overflow-hidden shadow-xl shadow-cyan-500/10">
          <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 px-4 py-3 border-b border-cyan-500/30">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center">
                <Bot className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-cyan-300 font-display tracking-wider">ARIA</p>
                <p className="text-[10px] text-muted-foreground">AI Handler</p>
              </div>
            </div>
          </div>
          <div className="px-4 py-3">
            <p className="text-sm text-foreground/90 leading-relaxed mb-3">
              Welcome, Operator. I'm ARIA, your AI handler. Ready to begin your training?
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50"
                onClick={onStart}
                data-testid="button-start-tutorial"
              >
                Begin Training
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
                onClick={onSkip}
                data-testid="button-skip-tutorial"
              >
                Skip
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!currentPhase) return null;

  // Backwards/forwards compatibility: tutorial phase fields changed over time.
  const phaseTitle = (currentPhase as any).name ?? (currentPhase as any).title ?? 'Tutorial';
  const phaseMessage = (currentPhase as any).handlerMessage ?? (currentPhase as any).dialogue ?? (currentPhase as any).description ?? '';

  const completedCount = currentPhase.objectives.filter(o => o.completed).length;
  const totalCount = currentPhase.objectives.length;

  return (
    <motion.div
      ref={dragRef}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      drag
      dragElastic={0.2}
      dragMomentum={false}
      onDragEnd={(event, info) => {
        setPosition(prev => ({ x: prev.x + info.offset.x, y: prev.y + info.offset.y }));
      }}
      style={{ x: position.x, y: position.y }}
      className="fixed top-20 left-[75%] -translate-x-1/2 z-[30] w-[360px] max-w-[92vw] cursor-grab active:cursor-grabbing"
      data-testid="tutorial-panel"
    >
      <div className="bg-slate-900/95 border border-cyan-500/50 rounded-lg overflow-hidden shadow-xl shadow-cyan-500/10">
        <div 
          className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 px-3 py-2 border-b border-cyan-500/30 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center">
              <Bot className="w-3 h-3 text-cyan-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-cyan-300 font-display tracking-wider">{phaseTitle}</p>
              <p className="text-[9px] text-muted-foreground">{completedCount}/{totalCount} objectives</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed(!isCollapsed);
              }}
              className="text-muted-foreground/70 hover:text-foreground transition-colors p-1"
              data-testid="button-toggle-tutorial-collapse"
              aria-label={isCollapsed ? 'Expand tutorial panel' : 'Collapse tutorial panel'}
            >
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onSkip(); }}
              className="text-muted-foreground/60 hover:text-foreground transition-colors p-1"
              data-testid="button-close-tutorial"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="px-3 py-2 border-b border-border/30">
                {phaseMessage ? (
                  <p className="text-xs text-foreground/80 italic leading-relaxed">
                    "{phaseMessage}"
                  </p>
                ) : null}
              </div>
              <div className="px-3 py-2 space-y-1.5">
                {currentPhase.objectives.map((objective) => (
                  <motion.div
                    key={objective.id}
                    className={`flex items-center gap-2 text-xs ${
                      objective.completed ? 'text-emerald-400' : 'text-foreground/70'
                    }`}
                    animate={objective.completed ? { scale: [1, 1.05, 1] } : {}}
                    data-testid={`tutorial-objective-${objective.id}`}
                  >
                    {objective.completed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-cyan-500/50 flex-shrink-0" />
                    )}
                    <span className={objective.completed ? 'line-through opacity-60' : ''}>
                      {objective.text}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});
