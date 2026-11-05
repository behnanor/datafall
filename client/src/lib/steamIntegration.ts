/**
 * Steam Integration Layer for DataFall
 * Provides unified API for Steam features when running in Electron
 * Falls back gracefully to browser-only mode when Steam is unavailable
 * 
 * This module is safe to import in browser environments - all Electron/Steam
 * functionality is lazy-loaded and guarded behind runtime checks.
 * 
 * Important: Web and Electron are separate builds. When deployed:
 * - Web users get the browser build where all Steam calls safely do nothing
 * - Steam users get the Electron build where Electron APIs are available
 */

// Cached IPC renderer - only set once we successfully acquire it
let cachedIpcRenderer: any = null;

export interface SteamLeaderboardEntry {
  rank: number;
  score: number;
  steamId: string;
  personaName: string;
}

export interface SteamLeaderboardSetResult {
  ok: boolean;
  reason?: string;
  leaderboardId?: number;
  scoreChanged?: boolean;
  globalRankNew?: number;
  globalRankPrevious?: number;
}

export interface SteamLeaderboardEntriesResult {
  ok: boolean;
  reason?: string;
  leaderboardId?: number;
  entries: SteamLeaderboardEntry[];
}

/**
 * Check if running in Electron environment
 * This is a fresh check each time to handle late-loading globals
 */
const isElectron = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check for Electron-specific globals
  const w = window as any;
  return !!(
    w.process?.versions?.electron ||
    w.process?.type === 'renderer' ||
    (typeof w.require === 'function' && w.process)
  );
};

/**
 * Get IPC renderer for Electron communication
 * Returns null in browser environments, returns IPC handle in Electron
 */
const getIpcRenderer = (): any => {
  // Return cached handle if available
  if (cachedIpcRenderer) return cachedIpcRenderer;
  
  // Exit early if not in Electron
  if (!isElectron()) return null;
  
  // Try to acquire ipcRenderer from Electron
  try {
    const ipc = (window as any).require('electron').ipcRenderer;
    if (ipc) {
      cachedIpcRenderer = ipc;
      return cachedIpcRenderer;
    }
  } catch {
    // Electron require failed - might be wrong environment
  }
  
  return null;
};

// Steam achievement ID mappings (internal ID -> Steam ID)
// These must match the achievements configured in Steamworks Partner dashboard
// v1.03: removed the K/M overrides for data/credits/crypto (ACH_DATA_1K etc.). Steamworks uses the full numbers
// (ACH_DATA_1000), so those 13 achievements could never unlock.
export const STEAM_ACHIEVEMENT_MAP: Record<string, string> = {
  // Clicking Achievements
  'first_click': 'ACH_FIRST_CLICK',
  'click_100': 'ACH_CLICK_100',
  'click_1000': 'ACH_CLICK_1K',
  'click_10000': 'ACH_CLICK_10K',
  'click_100000': 'ACH_CLICK_100K',
  'click_1000000': 'ACH_CLICK_1M',
  
  // Data Collection Achievements
  'data_100': 'ACH_DATA_100',
  
  // Credits Achievements
  
  // Crypto Achievements
  'crypto_10': 'ACH_CRYPTO_10',
  'crypto_100': 'ACH_CRYPTO_100',
  
  // Prestige/Ascension Achievements
  'first_ascension': 'ACH_FIRST_ASCEND',
  'ascension_5': 'ACH_ASCEND_5',
  'ascension_10': 'ACH_ASCEND_10',
  'ascension_25': 'ACH_ASCEND_25',
  'ascension_50': 'ACH_ASCEND_50',
  'ascension_100': 'ACH_ASCEND_100',
  
  // Upgrade Achievements
  'first_upgrade': 'ACH_FIRST_UPGRADE',
  'upgrade_10': 'ACH_UPGRADE_10',
  'upgrade_50': 'ACH_UPGRADE_50',
  'upgrade_100': 'ACH_UPGRADE_100',
  'upgrade_500': 'ACH_UPGRADE_500',
  
  // Critical Hit Achievements
  'first_crit': 'ACH_FIRST_CRIT',
  'crit_100': 'ACH_CRIT_100',
  'crit_1000': 'ACH_CRIT_1K',
  
  // Contract Achievements
  'first_contract': 'ACH_FIRST_CONTRACT',
  'contract_10': 'ACH_CONTRACT_10',
  'contract_50': 'ACH_CONTRACT_50',
  'contract_100': 'ACH_CONTRACT_100',
  
  // Boss Achievements
  'first_boss': 'ACH_FIRST_BOSS',
  'boss_10': 'ACH_BOSS_10',
  'boss_50': 'ACH_BOSS_50',
  
  // Cosmetic Achievements
  'first_cosmetic': 'ACH_FIRST_COSMETIC',
  'cosmetic_10': 'ACH_COSMETIC_10',
  'cosmetic_25': 'ACH_COSMETIC_25',
  'cosmetic_50': 'ACH_COSMETIC_50',
  
  // Time Played Achievements
  'playtime_1h': 'ACH_PLAYTIME_1H',
  'playtime_5h': 'ACH_PLAYTIME_5H',
  'playtime_10h': 'ACH_PLAYTIME_10H',
  'playtime_24h': 'ACH_PLAYTIME_24H',
  'playtime_100h': 'ACH_PLAYTIME_100H',
  
  // Pickup Achievements
  'pickup_10': 'ACH_PICKUP_10',
  'pickup_100': 'ACH_PICKUP_100',
  'pickup_1000': 'ACH_PICKUP_1K',
  
  // Special Achievements
  'tutorial_complete': 'ACH_TUTORIAL_DONE',
  'max_data_rate': 'ACH_MAX_DATA_RATE',
  'all_upgrades': 'ACH_ALL_UPGRADES',
  'speed_run': 'ACH_SPEED_RUN',
};

// v1.03: these 13 Steam slots are reused for the new milestones (Steam caps the app at 100 achievements).
// They stay as in-game achievements; the game just stops sending them to Steam.
export const RETIRED_STEAM_ACHIEVEMENTS = new Set<string>([
  "ACH_DATA_1000",
  "ACH_DATA_10000",
  "ACH_DATA_100000",
  "ACH_DATA_1000000",
  "ACH_DATA_10000000",
  "ACH_DATA_100000000",
  "ACH_CREDITS_1000",
  "ACH_CREDITS_10000",
  "ACH_CREDITS_100000",
  "ACH_CREDITS_1000000",
  "ACH_CREDITS_10000000",
  "ACH_CRYPTO_1000",
  "ACH_CRYPTO_10000",
]);

// Best-effort conversion for internal ids that are not in the explicit map.
// Steamworks achievement API names are typically uppercase with an ACH_ prefix.
const toSteamApiName = (internalId: string): string | null => {
  const key = String(internalId || '').trim();
  if (!key) return null;
  // If the map knows it, trust the map.
  const mapped = STEAM_ACHIEVEMENT_MAP[key];
  if (mapped) return mapped;
  // Otherwise, normalize into something Steam-ish.
  const norm = key.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  return norm ? `ACH_${norm}` : null;
};



class SteamIntegration {
  private initialized = false;
  private initAttempted = false;
  private steamUsername: string | null = null;
  private steamId: string | null = null;
  private unlockedAchievements: Set<string> = new Set();

  constructor() {
    // Lazy initialization - don't init in constructor to avoid bundling issues
  }

  private ensureInit(): void {
    // Don't re-init if already initialized
    if (this.initialized) return;
    
    // Only try to init if we're in Electron and have IPC
    const ipc = getIpcRenderer();
    if (ipc && !this.initAttempted) {
      this.initAttempted = true;
      this.init(ipc);
    }
  }

  private async init(ipc: any) {
    if (!ipc) return;

    // Listen for Steam responses
    ipc.on('steam-user-info', (_event: any, data: any) => {
      if (data.initialized) {
        this.initialized = true;
        this.steamUsername = data.username;
        this.steamId = data.steamId;
        console.log('Steam connected:', this.steamUsername);
      }
    });

    ipc.on('steam-achievement-unlocked', (_event: any, data: any) => {
      if (data.success) {
        this.unlockedAchievements.add(data.achievementId);
      }
    });

    // Request user info
    ipc.send('steam-get-user');
  }

  isAvailable(): boolean {
    this.ensureInit();
    return this.initialized && getIpcRenderer() !== null;
  }

  getSteamUsername(): string | null {
    return this.steamUsername;
  }

  getSteamId(): string | null {
    return this.steamId;
  }

  /**
   * Unlock a Steam achievement.
   * Accepts either an internal id (e.g. "clicks_10") or a Steam API name (e.g. "ACH_CLICKS_10").
   */
  unlockAchievement(internalIdOrApiName: string): void {
    // Skip silently if not in Steam mode (no console spam in browser)
    if (!isElectron()) return;

    this.ensureInit();

    const maybe = String(internalIdOrApiName || '');
    const steamId = maybe.startsWith('ACH_')
      ? maybe
      : (toSteamApiName(maybe) || STEAM_ACHIEVEMENT_MAP[maybe] || null);

    if (!steamId || RETIRED_STEAM_ACHIEVEMENTS.has(steamId)) return;
    if (this.unlockedAchievements.has(steamId)) return;

    const ipc = getIpcRenderer();
    if (ipc) {
      console.log('[Steam] unlock request:', internalIdOrApiName, '=>', steamId);
      ipc.send('steam-unlock-achievement', steamId);
    }
  }

  /**
   * Save game to Steam Cloud
   * @param saveData - The game save data object
   */
  saveToCloud(saveData: any, fileName?: string): Promise<boolean> {
    return new Promise((resolve) => {
      const ipc = getIpcRenderer();
      if (!isElectron() || !ipc) {
        resolve(false);
        return;
      }
      
      this.ensureInit();

      const handler = (_event: any, result: any) => {
        ipc.removeListener('steam-cloud-save-result', handler);
        resolve(result.success);
      };

      ipc.on('steam-cloud-save-result', handler);
      ipc.send('steam-cloud-save', { data: saveData, fileName });

      // Timeout after 5 seconds
      setTimeout(() => {
        ipc.removeListener('steam-cloud-save-result', handler);
        resolve(false);
      }, 5000);
    });
  }

  /**
   * Load game from Steam Cloud
   */
  loadFromCloud(fileName?: string): Promise<any | null> {
    return new Promise((resolve) => {
      const ipc = getIpcRenderer();
      if (!isElectron() || !ipc) {
        resolve(null);
        return;
      }
      
      this.ensureInit();

      const handler = (_event: any, result: any) => {
        ipc.removeListener('steam-cloud-load-result', handler);
        if (result.success && result.data) {
          resolve(result.data);
        } else {
          resolve(null);
        }
      };

      ipc.on('steam-cloud-load-result', handler);
      ipc.send('steam-cloud-load', { fileName });

      // Timeout after 5 seconds
      setTimeout(() => {
        ipc.removeListener('steam-cloud-load-result', handler);
        resolve(null);
      }, 5000);
    });
  }

  /**
   * Open Steam overlay
   * @param type - Overlay type: 'friends', 'community', 'store', 'achievements'
   */
  openOverlay(type: 'friends' | 'community' | 'store' | 'achievements' = 'friends'): void {
    const ipc = getIpcRenderer();
    if (!isElectron() || !ipc) return;
    this.ensureInit();
    ipc.send('steam-open-overlay', type);
  }

  /**
   * Set fullscreen mode
   */
  setFullscreen(isFullscreen: boolean): void {
    const ipc = getIpcRenderer();
    if (!isElectron() || !ipc) return;
    ipc.send('set-fullscreen', isFullscreen);
  }

  /**
   * Toggle fullscreen mode
   */
  toggleFullscreen(): void {
    const ipc = getIpcRenderer();
    if (!isElectron() || !ipc) return;
    ipc.send('toggle-fullscreen');
  }

  async setLeaderboardScore(
    leaderboardName: string,
    score: number,
    options?: { keepBest?: boolean; detail?: number[] }
  ): Promise<SteamLeaderboardSetResult> {
    const ipc = getIpcRenderer();
    if (!isElectron() || !ipc) {
      return { ok: false, reason: 'not_electron' };
    }

    this.ensureInit();

    try {
      const result = await ipc.invoke('df:leaderboard-set-score', {
        leaderboardName,
        score,
        keepBest: options?.keepBest ?? true,
        detail: options?.detail ?? [],
      });

      return {
        ok: !!result?.ok,
        reason: result?.reason,
        leaderboardId: result?.leaderboardId,
        scoreChanged: !!result?.scoreChanged,
        globalRankNew: result?.globalRankNew,
        globalRankPrevious: result?.globalRankPrevious,
      };
    } catch (error: any) {
      return { ok: false, reason: error?.message || String(error) };
    }
  }

  async getLeaderboardEntries(
    leaderboardName: string,
    options?: { limit?: number; aroundUser?: boolean; mode?: 'global' | 'friends' | 'around_user' }
  ): Promise<SteamLeaderboardEntriesResult> {
    const ipc = getIpcRenderer();
    if (!isElectron() || !ipc) {
      return { ok: false, reason: 'not_electron', entries: [] };
    }

    this.ensureInit();

    try {
      const result = await ipc.invoke('df:leaderboard-get-entries', {
        leaderboardName,
        limit: options?.limit ?? 10,
        aroundUser: !!options?.aroundUser,
        mode: options?.mode ?? 'global',
      });

      const entries = Array.isArray(result?.entries)
        ? result.entries.map((entry: any) => ({
            rank: Number(entry?.rank) || 0,
            score: Number(entry?.score) || 0,
            steamId: String(entry?.steamId || ''),
            personaName: String(entry?.personaName || 'Unknown'),
          }))
        : [];

      return {
        ok: !!result?.ok,
        reason: result?.reason,
        leaderboardId: result?.leaderboardId,
        entries,
      };
    } catch (error: any) {
      return { ok: false, reason: error?.message || String(error), entries: [] };
    }
  }
}

// Export singleton instance
export const steamIntegration = new SteamIntegration();

// Export helper functions for easy use
export const isSteamAvailable = () => steamIntegration.isAvailable();
export const unlockSteamAchievement = (id: string) => steamIntegration.unlockAchievement(id);
export const saveToSteamCloud = (data: any, fileName?: string) => steamIntegration.saveToCloud(data, fileName);
export const loadFromSteamCloud = (fileName?: string) => steamIntegration.loadFromCloud(fileName);
export const openSteamOverlay = (type?: 'friends' | 'community' | 'store' | 'achievements') => steamIntegration.openOverlay(type);
export const setSteamFullscreen = (isFullscreen: boolean) => steamIntegration.setFullscreen(isFullscreen);
export const toggleSteamFullscreen = () => steamIntegration.toggleFullscreen();
export const setSteamLeaderboardScore = (
  leaderboardName: string,
  score: number,
  options?: { keepBest?: boolean; detail?: number[] }
) => steamIntegration.setLeaderboardScore(leaderboardName, score, options);
export const getSteamLeaderboardEntries = (
  leaderboardName: string,
  options?: { limit?: number; aroundUser?: boolean; mode?: 'global' | 'friends' | 'around_user' }
) => steamIntegration.getLeaderboardEntries(leaderboardName, options);
