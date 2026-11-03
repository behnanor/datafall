// Global frame-rate cap.
// Animations (framer-motion and our own loops) all go through requestAnimationFrame,
// which normally runs at the monitor refresh rate (144/240Hz on gaming monitors).
// We wrap requestAnimationFrame so callbacks run at most `cap` times per second.
// MUST be imported before anything that captures requestAnimationFrame (see main.tsx).

export const FPS_CAP_OPTIONS = [30, 60, 120, 0] as const; // 0 = unlimited
export type FpsCap = (typeof FPS_CAP_OPTIONS)[number];

const STORAGE_KEY = 'datafall_fps_cap';
const DEFAULT_CAP: FpsCap = 60;

let currentCap: number = DEFAULT_CAP;
try {
  const stored = Number(localStorage.getItem(STORAGE_KEY));
  if ((FPS_CAP_OPTIONS as readonly number[]).includes(stored) && localStorage.getItem(STORAGE_KEY) !== null) {
    currentCap = stored;
  }
} catch {
  // storage unavailable: keep default
}

export function getFpsCap(): FpsCap {
  return currentCap as FpsCap;
}

export function setFpsCap(cap: FpsCap) {
  currentCap = cap;
  try {
    localStorage.setItem(STORAGE_KEY, String(cap));
  } catch {
    // ignore
  }
}

if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
  const nativeRaf = window.requestAnimationFrame.bind(window);
  const nativeCancel = window.cancelAnimationFrame.bind(window);

  let queue = new Map<number, FrameRequestCallback>();
  let nextId = 1;
  let scheduled = 0;
  let lastFrame = 0;

  const pump = (now: number) => {
    scheduled = 0;
    const minGap = currentCap > 0 ? 1000 / currentCap : 0;
    // Small tolerance so a 60 cap on a 60Hz screen never drops to 30.
    if (minGap > 0 && now - lastFrame < minGap - 2) {
      scheduled = nativeRaf(pump);
      return;
    }
    lastFrame = now;
    const run = queue;
    queue = new Map();
    run.forEach((cb) => {
      try {
        cb(now);
      } catch (e) {
        setTimeout(() => {
          throw e;
        });
      }
    });
  };

  window.requestAnimationFrame = (cb: FrameRequestCallback): number => {
    const id = nextId++;
    queue.set(id, cb);
    if (!scheduled) scheduled = nativeRaf(pump);
    return id;
  };

  window.cancelAnimationFrame = (id: number) => {
    queue.delete(id);
    if (queue.size === 0 && scheduled) {
      nativeCancel(scheduled);
      scheduled = 0;
    }
  };
}
