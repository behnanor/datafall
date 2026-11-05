// Global frame-rate cap.
// requestAnimationFrame normally runs at the monitor refresh rate (144/240Hz on gaming monitors).
// We wrap requestAnimationFrame so callbacks (framer-motion JS animations, canvas effects) run at most
// `cap` times per second.
// Infinite CSS keyframe animations (animate-pulse, animate-spin, index.css loops) bypass rAF and run at
// full refresh; on a screen faster than the cap we pause them and step their currentTime from the
// capped loop.
// v1.04 CPU fixes:
//  - framer-motion's WAAPI (compositor) animations are left alone. v1.03 hid Element.prototype.animate,
//    which moved those cheap GPU animations onto the main thread as JS, so the cap raised CPU use.
//  - CSS stepping only runs when the screen refreshes faster than the cap (a 60 cap on a 60Hz screen
//    does nothing now), and the expensive document.getAnimations() scan runs twice a second instead of
//    every frame.
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

let onCapChange = () => {};

export function setFpsCap(cap: FpsCap) {
  currentCap = cap;
  try {
    localStorage.setItem(STORAGE_KEY, String(cap));
  } catch {
    // ignore
  }
  onCapChange();
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
    measureFrame(now);
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

  // Display refresh interval, measured from native frames (median of recent gaps).
  const gaps: number[] = [];
  let lastNative = 0;
  let displayFrameMs = 1000 / 60;
  const measureFrame = (now: number) => {
    if (lastNative) {
      const gap = now - lastNative;
      if (gap > 2 && gap < 100) {
        gaps.push(gap);
        if (gaps.length > 30) gaps.shift();
        const sorted = [...gaps].sort((x, y) => x - y);
        displayFrameMs = sorted[Math.floor(sorted.length / 2)];
      }
    }
    lastNative = now;
  };
  // Stepping only helps when the screen draws more often than the cap allows.
  const cssStepNeeded = () => currentCap > 0 && displayFrameMs < 1000 / currentCap - 2;

  // Infinite CSS animations we paused and now step manually.
  const steppedCss = new Set<Animation>();
  let cssLoopActive = false;
  let lastCssTick = 0;
  let lastScan = 0;
  const SCAN_INTERVAL_MS = 500;

  const isInfiniteCss = (a: Animation) =>
    typeof CSSAnimation !== 'undefined' &&
    a instanceof CSSAnimation &&
    a.effect?.getTiming().iterations === Infinity;

  const releaseCss = () => {
    steppedCss.forEach((a) => {
      try {
        a.play();
      } catch {
        // ignore
      }
    });
    steppedCss.clear();
  };

  const scanCss = () => {
    const live = new Set<Animation>();
    for (const a of document.getAnimations()) {
      if (!isInfiniteCss(a)) continue;
      live.add(a);
      if (!steppedCss.has(a)) {
        if (a.playState !== 'running') continue; // paused by the game's own CSS
        a.pause();
        steppedCss.add(a);
      }
    }
    // Forget animations whose element was removed or whose class changed.
    steppedCss.forEach((a) => {
      if (!live.has(a)) steppedCss.delete(a);
    });
  };

  const cssTick = (now: number) => {
    if (currentCap <= 0 || typeof document.getAnimations !== 'function') {
      cssLoopActive = false;
      releaseCss();
      return;
    }
    const elapsed = lastCssTick ? now - lastCssTick : 0;
    lastCssTick = now;

    if (!cssStepNeeded()) {
      releaseCss();
    } else {
      if (now - lastScan >= SCAN_INTERVAL_MS) {
        lastScan = now;
        scanCss();
      }
      steppedCss.forEach((a) => {
        a.currentTime = (Number(a.currentTime) || 0) + elapsed;
      });
    }

    window.requestAnimationFrame(cssTick);
  };

  const startCssLoop = () => {
    lastScan = 0;
    if (cssLoopActive || currentCap <= 0) return;
    cssLoopActive = true;
    lastCssTick = 0;
    window.requestAnimationFrame(cssTick);
  };

  onCapChange = startCssLoop;
  startCssLoop();
}
