// Global frame-rate cap.
// requestAnimationFrame normally runs at the monitor refresh rate (144/240Hz on gaming monitors).
// We wrap requestAnimationFrame so callbacks run at most `cap` times per second.
// Two kinds of animation bypass requestAnimationFrame and run on the compositor at full refresh:
//  - framer-motion's hardware-accelerated (WAAPI) opacity/transform animations: we hide
//    Element.prototype.animate so framer falls back to its rAF-driven JS animations.
//  - infinite CSS keyframe animations (animate-pulse, animate-spin, index.css loops): we pause
//    them and step their currentTime from the capped loop.
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

// framer-motion checks Object.hasOwnProperty(Element.prototype, 'animate') once, on first animation.
if (typeof Element !== 'undefined' && Object.prototype.hasOwnProperty.call(Element.prototype, 'animate')) {
  try {
    delete (Element.prototype as { animate?: unknown }).animate;
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

  // Infinite CSS animations we paused and now step manually.
  const steppedCss = new Set<Animation>();
  let cssLoopActive = false;
  let lastCssTick = 0;

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

  const cssTick = (now: number) => {
    if (currentCap <= 0 || typeof document.getAnimations !== 'function') {
      cssLoopActive = false;
      releaseCss();
      return;
    }
    const elapsed = lastCssTick ? now - lastCssTick : 0;
    lastCssTick = now;

    const live = new Set<Animation>();
    for (const a of document.getAnimations()) {
      if (!isInfiniteCss(a)) continue;
      live.add(a);
      if (!steppedCss.has(a)) {
        if (a.playState !== 'running') continue; // paused by the game's own CSS
        a.pause();
        steppedCss.add(a);
      } else {
        a.currentTime = (Number(a.currentTime) || 0) + elapsed;
      }
    }
    // Forget animations whose element was removed or whose class changed.
    steppedCss.forEach((a) => {
      if (!live.has(a)) steppedCss.delete(a);
    });

    window.requestAnimationFrame(cssTick);
  };

  const startCssLoop = () => {
    if (cssLoopActive || currentCap <= 0) return;
    cssLoopActive = true;
    lastCssTick = 0;
    window.requestAnimationFrame(cssTick);
  };

  onCapChange = startCssLoop;
  startCssLoop();
}
