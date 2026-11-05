/// <reference types="vite/client" />

interface DFBridge {
  openOverlay?: (type?: string) => void;
  openStore?: (appId?: number) => void;
  unlockAchievement?: (id: string) => void;
  isSteamReady?: () => Promise<boolean>;
  getSteamLanguage?: () => Promise<string | null>;
  getSteamLanguageSync?: () => string | null;

  setFullscreen?: (value: boolean) => void;
  toggleFullscreen?: () => void;
  isFullscreen?: () => Promise<boolean>;
  setFpsLimit?: (fps: number) => void;
}

declare global {
  /** Game version for display, e.g. "1.04" (from package.json, see vite.config.ts). */
  const __APP_VERSION__: string;
  interface Window {
    df?: DFBridge;
  }
}

export {};
