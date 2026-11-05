// v1.04 display preferences (per device, localStorage): UI scale and click-effect visibility.
import { useEffect, useState } from "react";

export const UI_SCALE_OPTIONS = [0.9, 1, 1.15, 1.3] as const;
export type UiScale = (typeof UI_SCALE_OPTIONS)[number];

const SCALE_KEY = "datafall_ui_scale";
const CLICK_FX_KEY = "datafall_click_effects";
const EVENT = "datafall:display-prefs";

const read = (key: string): string | null => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* ignore */ } };

export function getUiScale(): UiScale {
  const v = Number(read(SCALE_KEY));
  return (UI_SCALE_OPTIONS as readonly number[]).includes(v) ? (v as UiScale) : 1;
}

// Electron: zoom the whole page (crisp text, layout reflows). Browser fallback: CSS zoom on the root.
function applyUiScale(scale: number) {
  const bridge = (window as unknown as { df?: { setUiScale?: (f: number) => void } }).df;
  if (bridge?.setUiScale) bridge.setUiScale(scale);
  else document.documentElement.style.setProperty("zoom", String(scale));
}

export function setUiScale(scale: UiScale) {
  write(SCALE_KEY, String(scale));
  applyUiScale(scale);
  window.dispatchEvent(new Event(EVENT));
}

export function getClickEffectsEnabled(): boolean {
  return read(CLICK_FX_KEY) !== "off";
}

export function setClickEffectsEnabled(enabled: boolean) {
  write(CLICK_FX_KEY, enabled ? "on" : "off");
  window.dispatchEvent(new Event(EVENT));
}

export function useDisplayPrefs() {
  const [state, setState] = useState(() => ({ uiScale: getUiScale(), clickEffects: getClickEffectsEnabled() }));
  useEffect(() => {
    const onChange = () => setState({ uiScale: getUiScale(), clickEffects: getClickEffectsEnabled() });
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);
  return state;
}

// Apply the saved scale once at startup.
try { if (getUiScale() !== 1) applyUiScale(getUiScale()); } catch { /* ignore */ }
