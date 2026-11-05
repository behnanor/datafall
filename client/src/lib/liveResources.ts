// v1.04 CPU: the resource counters change on every game tick. Passing them as props to MainView made the
// whole room view (character, machines, overlays) re-render with every tick. Game.tsx now publishes them
// here, and only the small number labels subscribe, so the room only re-renders when something in it changes.
import { useLayoutEffect, useSyncExternalStore } from 'react';

export interface LiveResources {
  data: number;
  credits: number;
  dataPerSecond: number;
}

let current: LiveResources = { data: 0, credits: 0, dataPerSecond: 0 };
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function publish(next: LiveResources) {
  if (next.data === current.data && next.credits === current.credits && next.dataPerSecond === current.dataPerSecond) return;
  current = next;
  listeners.forEach((listener) => listener());
}

/** Called by the screen that owns the game state, once per render. */
export function usePublishLiveResources(data: number, credits: number, dataPerSecond: number) {
  useLayoutEffect(() => {
    publish({ data, credits, dataPerSecond });
  }, [data, credits, dataPerSecond]);
}

export function useLiveResource(key: keyof LiveResources): number {
  return useSyncExternalStore(subscribe, () => current[key], () => current[key]);
}
