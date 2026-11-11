// Game feel ("juice") helpers. Everything here is cheap on purpose (CPU was a big review complaint):
// - Effects use the Web Animations API on transform-only properties (`translate`, `scale`), which the
//   browser runs on the compositor, so they cost almost nothing and never re-render React.
// - Every effect is throttled, and all of them respect the player's settings:
//   click effects off -> no click pops; screen shake off or OS "reduce motion" -> no shake.
import { getClickEffectsEnabled, getScreenShakeEnabled } from './displayPrefs';

export function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function clickJuiceAllowed(): boolean {
  return getClickEffectsEnabled() && !prefersReducedMotion();
}

export function screenShakeAllowed(): boolean {
  return getScreenShakeEnabled() && !prefersReducedMotion();
}

const lastRun = new WeakMap<Element, number>();
function throttled(el: Element, minGapMs: number): boolean {
  const now = performance.now();
  const last = lastRun.get(el) ?? -Infinity;
  if (now - last < minGapMs) return true;
  lastRun.set(el, now);
  return false;
}

/** Short screen shake. Uses the `translate` property so it stacks with the camera's pan/zoom transform. */
export function shakeElement(el: HTMLElement | null, strength = 1) {
  if (!el || typeof el.animate !== 'function' || !screenShakeAllowed()) return;
  if (throttled(el, 320)) return;
  const a = Math.max(1, Math.min(8, 3 * strength));
  el.animate(
    [
      { translate: '0 0' },
      { translate: `${a}px ${-a * 0.6}px` },
      { translate: `${-a * 0.8}px ${a * 0.5}px` },
      { translate: `${a * 0.5}px ${a * 0.3}px` },
      { translate: '0 0' },
    ],
    { duration: 150 + strength * 30, easing: 'ease-out' },
  );
}

/** Quick "bump" on a number or button so the player sees it react. */
export function bumpElement(el: HTMLElement | null, peak = 1.08, durationMs = 160) {
  if (!el || typeof el.animate !== 'function' || !clickJuiceAllowed()) return;
  if (throttled(el, 90)) return;
  el.animate([{ scale: '1' }, { scale: String(peak) }, { scale: '1' }], { duration: durationMs, easing: 'ease-out' });
}

// ---- Banner events (checkpoints, production milestones). Tiny pub/sub so useGame does not need new props. ----
export type JuiceBannerEvent =
  | { kind: 'checkpoint'; upgradeName: string; level: number; multiplier: number }
  | { kind: 'milestone'; perSecond: number };

type Listener = (event: JuiceBannerEvent) => void;
const bannerListeners = new Set<Listener>();

export function emitJuiceBanner(event: JuiceBannerEvent) {
  bannerListeners.forEach((listener) => listener(event));
}

export function onJuiceBanner(listener: Listener) {
  bannerListeners.add(listener);
  return () => {
    bannerListeners.delete(listener);
  };
}
