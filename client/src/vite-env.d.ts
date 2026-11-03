/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GAME_EDITION?: 'full' | 'demo';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface DFBridge {
  openOverlay?: (type?: string) => void;
  unlockAchievement?: (id: string) => void;
  isSteamReady?: () => Promise<boolean>;

  setFullscreen?: (value: boolean) => void;
  toggleFullscreen?: () => void;
  isFullscreen?: () => Promise<boolean>;
}

declare global {
  interface Window {
    df?: DFBridge;
  }
}

export {};
