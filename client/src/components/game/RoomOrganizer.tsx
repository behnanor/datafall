import { useState, useCallback, DragEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid3X3, Trash2, Settings2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upgrade, MachinePosition, RoomLayout } from '@/lib/useGame';

interface RoomOrganizerProps {
  upgrades: Upgrade[];
  roomLayout: RoomLayout;
  onUpdatePosition: (upgradeId: string, gridX: number, gridY: number) => void;
  onRemovePosition: (upgradeId: string) => void;
}

const GRID_SIZE = 8;

const getMachineIcon = (upgradeId: string): string => {
  if (upgradeId.includes('data_miner')) return '💻';
  if (upgradeId.includes('botnet')) return '🌐';
  if (upgradeId.includes('quantum')) return '⚛️';
  if (upgradeId.includes('ai_core')) return '🤖';
  if (upgradeId.includes('neural')) return '🧠';
  if (upgradeId.includes('crypto')) return '₿';
  if (upgradeId.includes('blockchain')) return '⛓️';
  if (upgradeId.includes('click')) return '👆';
  if (upgradeId.includes('neural_implant')) return '🧿';
  if (upgradeId.includes('reflex')) return '⚡';
  return '🔧';
};

const getMachineColor = (category: string): string => {
  switch (category) {
    case 'fabrication': return 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400';
    case 'crypto_mining': return 'bg-orange-500/20 border-orange-500/40 text-orange-400';
    case 'click_upgrades': return 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-400';
    default: return 'bg-gray-500/20 border-gray-500/40 text-gray-400';
  }
};

export function RoomOrganizer({ upgrades, roomLayout, onUpdatePosition, onRemovePosition }: RoomOrganizerProps) {
  const [draggedMachine, setDraggedMachine] = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ x: number; y: number } | null>(null);

  const ownedUpgrades = upgrades.filter(u => u.count > 0 && u.effect.type === 'production');

  const getPositionAt = useCallback((x: number, y: number): MachinePosition | undefined => {
    // gridX is column, gridY is row
    return roomLayout.machinePositions.find(p => p.gridX === x && p.gridY === y);
  }, [roomLayout.machinePositions]);

  const isPlaced = useCallback((upgradeId: string): boolean => {
    return roomLayout.machinePositions.some(p => p.upgradeId === upgradeId);
  }, [roomLayout.machinePositions]);

  const handleDragStart = (e: DragEvent, upgradeId: string) => {
    e.dataTransfer.setData('text/plain', upgradeId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedMachine(upgradeId);
  };

  const handleDragEnd = () => {
    setDraggedMachine(null);
    setDragOverCell(null);
  };

  const handleDragOver = (e: DragEvent, x: number, y: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCell({ x, y });
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
  };

  const handleDrop = (e: DragEvent, x: number, y: number) => {
    e.preventDefault();
    const upgradeId = e.dataTransfer.getData('text/plain');
    
    if (upgradeId) {
      const existingAtPosition = getPositionAt(x, y);
      if (!existingAtPosition || existingAtPosition.upgradeId === upgradeId) {
        onUpdatePosition(upgradeId, x, y);
      }
    }
    
    setDraggedMachine(null);
    setDragOverCell(null);
  };

  const handleRemoveMachine = (upgradeId: string) => {
    onRemovePosition(upgradeId);
  };

  const clearAllPositions = () => {
    roomLayout.machinePositions.forEach(pos => {
      onRemovePosition(pos.upgradeId);
    });
  };

  return (
    <div className="h-full flex flex-col" data-testid="room-organizer">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-purple-400" />
          <h3 className="font-display text-lg text-purple-400">Room Organizer</h3>
        </div>
        {roomLayout.machinePositions.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={clearAllPositions}
            data-testid="clear-all-positions"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground mb-2 px-1">
        Drag machines onto the grid to arrange your room
      </p>

      <div className="mb-3">
        <div className="relative p-3 bg-gradient-to-br from-purple-950/40 to-cyan-950/40 rounded-xl border border-purple-500/30 shadow-lg shadow-purple-500/10 overflow-hidden">
          {/* Grid floor pattern */}
          <div className="absolute inset-0 opacity-20 pointer-events-none rounded-xl overflow-hidden">
            <div className="w-full h-full" style={{ 
              backgroundImage: 'linear-gradient(rgba(168, 85, 247, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(168, 85, 247, 0.3) 1px, transparent 1px)',
              backgroundSize: '20% 20%'
            }} />
          </div>
          
          <div 
            className="grid w-full min-w-0 gap-1 relative z-10"
            style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
              const x = index % GRID_SIZE;
              const y = Math.floor(index / GRID_SIZE);
              const machineAt = getPositionAt(x, y);
              const upgrade = machineAt ? upgrades.find(u => u.id === machineAt.upgradeId) : null;
              const isDropTarget = dragOverCell?.x === x && dragOverCell?.y === y;
              const isDraggingThis = machineAt && draggedMachine === machineAt.upgradeId;

              return (
                <motion.div
                  key={`${x}-${y}`}
                  className={`aspect-square rounded-lg border-2 flex items-center justify-center transition-all relative ${
                    isDropTarget
                      ? 'border-purple-400 bg-purple-500/30 scale-105'
                      : machineAt
                        ? isDraggingThis
                          ? 'border-yellow-400/50 bg-yellow-500/10 opacity-50'
                          : `${getMachineColor(upgrade?.category || '')} shadow-md`
                        : 'border-dashed border-purple-500/30 bg-purple-900/10 hover:border-purple-400/50 hover:bg-purple-500/10'
                  }`}
                  onDragOver={(e) => handleDragOver(e, x, y)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, x, y)}
                  data-testid={`grid-cell-${x}-${y}`}
                >
                  {machineAt && upgrade ? (
                    <div 
                      className="text-center relative cursor-grab active:cursor-grabbing w-full h-full flex items-center justify-center group"
                      draggable
                      onDragStart={(e) => handleDragStart(e, machineAt.upgradeId)}
                      onDragEnd={handleDragEnd}
                    >
                      <span className="text-xl drop-shadow-lg">{getMachineIcon(upgrade.id)}</span>
                      <motion.button
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveMachine(machineAt.upgradeId);
                        }}
                        data-testid={`remove-machine-${machineAt.upgradeId}`}
                      >
                        <Trash2 className="w-2.5 h-2.5 text-white" />
                      </motion.button>
                    </div>
                  ) : (
                    <span className="text-purple-500/20 text-xs">+</span>
                  )}
                </motion.div>
              );
            })}
          </div>
          
          {/* Corner decorations */}
          <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-purple-400/50 rounded-tl" />
          <div className="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-purple-400/50 rounded-tr" />
          <div className="absolute bottom-1 left-1 w-2 h-2 border-b-2 border-l-2 border-purple-400/50 rounded-bl" />
          <div className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-purple-400/50 rounded-br" />
        </div>
      </div>

      <div className="text-xs text-muted-foreground mb-2 px-1 flex items-center gap-1">
        <Grid3X3 className="w-3 h-3" />
        Available Machines ({ownedUpgrades.length})
      </div>

      <ScrollArea className="flex-1 -mx-2 px-2">
        <div className="space-y-1 pb-2">
          <AnimatePresence>
            {ownedUpgrades.map((upgrade) => {
              const placed = isPlaced(upgrade.id);
              const isDragging = draggedMachine === upgrade.id;

              return (
                <motion.div
                  key={upgrade.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: isDragging ? 0.5 : 1, x: 0 }}
                  draggable={!placed}
                  onDragStart={(e) => !placed && handleDragStart(e as unknown as DragEvent, upgrade.id)}
                  onDragEnd={handleDragEnd}
                  className={`p-2 rounded-lg border transition-all ${
                    placed
                      ? 'border-emerald-500/30 bg-emerald-500/10 opacity-60 cursor-default'
                      : `${getMachineColor(upgrade.category)} cursor-grab active:cursor-grabbing hover:opacity-80`
                  }`}
                  data-testid={`machine-${upgrade.id}`}
                >
                  <div className="flex items-center gap-2">
                    {!placed && (
                      <GripVertical className="w-3 h-3 text-muted-foreground/50" />
                    )}
                    <span className="text-lg">{getMachineIcon(upgrade.id)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{upgrade.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        x{upgrade.count} owned
                      </p>
                    </div>
                    {placed && (
                      <span className="text-[10px] text-emerald-400">Placed</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {ownedUpgrades.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              <Grid3X3 className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No machines to arrange yet</p>
              <p className="text-[10px]">Buy production upgrades first</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
