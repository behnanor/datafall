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
  interface Window {
    df?: DFBridge;
  }
}

export {};
