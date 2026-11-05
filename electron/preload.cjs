const { contextBridge, ipcRenderer, webFrame } = require("electron");

contextBridge.exposeInMainWorld("df", {
  // steam helpers
  isSteamReady: () => ipcRenderer.invoke("df:is-steam-ready"),
  getSteamLanguage: () => ipcRenderer.invoke("df:get-steam-language"),
  getSteamLanguageSync: () => ipcRenderer.sendSync("df:get-steam-language-sync"),
  openOverlay: (type) => ipcRenderer.send("df:open-overlay", type),
  setUiScale: (factor) => { const f = Number(factor); if (f >= 0.5 && f <= 2) webFrame.setZoomFactor(f); },
  openStore: (appId) => ipcRenderer.send("df:open-store", appId),
  unlockAchievement: (id) => ipcRenderer.send("df:unlock-achievement", id),

  // window helpers
  setFullscreen: (val) => ipcRenderer.send("df:set-fullscreen", val),
  toggleFullscreen: () => ipcRenderer.send("df:toggle-fullscreen"),
  isFullscreen: () => ipcRenderer.invoke("df:is-fullscreen"),
  setFpsLimit: (fps) => ipcRenderer.send("df:set-fps-limit", fps),

  // file-based save/load (mirrored by Steam Auto-Cloud)
  saveFile: (data) => ipcRenderer.invoke("df:save-file", data),
  loadFile: () => ipcRenderer.invoke("df:load-file"),
});

// Your renderer code (useGame.ts) expects window.electronAPI.
// So we expose a compatibility alias to the same functions.
contextBridge.exposeInMainWorld("electronAPI", {
  isSteamReady: () => ipcRenderer.invoke("df:is-steam-ready"),
  getSteamLanguage: () => ipcRenderer.invoke("df:get-steam-language"),
  getSteamLanguageSync: () => ipcRenderer.sendSync("df:get-steam-language-sync"),
  openOverlay: (type) => ipcRenderer.send("df:open-overlay", type),
  setUiScale: (factor) => { const f = Number(factor); if (f >= 0.5 && f <= 2) webFrame.setZoomFactor(f); },
  openStore: (appId) => ipcRenderer.send("df:open-store", appId),
  unlockAchievement: (id) => ipcRenderer.send("df:unlock-achievement", id),

  setFullscreen: (val) => ipcRenderer.send("df:set-fullscreen", val),
  toggleFullscreen: () => ipcRenderer.send("df:toggle-fullscreen"),
  isFullscreen: () => ipcRenderer.invoke("df:is-fullscreen"),
  setFpsLimit: (fps) => ipcRenderer.send("df:set-fps-limit", fps),

  saveFile: (data) => ipcRenderer.invoke("df:save-file", data),
  loadFile: () => ipcRenderer.invoke("df:load-file"),
  importLiveSave: () => ipcRenderer.invoke("df:import-live-save"),
  importDemoSave: () => ipcRenderer.invoke("df:import-demo-save"),
});


// -------------------- Legacy steamIntegration.ts shims --------------------
// steamIntegration.ts tries to detect Electron via window.process / window.require.
// With contextIsolation enabled, those are not present by default.
// We expose minimal, safe shims so steamIntegration.ts can use ipcRenderer safely.

const _listenerMap = new Map(); // Map<Function, Function>

const safeIpcRenderer = {
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, listener) => {
    const wrapped = (event, ...args) => listener(event, ...args);
    _listenerMap.set(listener, wrapped);
    ipcRenderer.on(channel, wrapped);
    return safeIpcRenderer;
  },
  once: (channel, listener) => {
    const wrapped = (event, ...args) => listener(event, ...args);
    _listenerMap.set(listener, wrapped);
    ipcRenderer.once(channel, wrapped);
    return safeIpcRenderer;
  },
  removeListener: (channel, listener) => {
    const wrapped = _listenerMap.get(listener) || listener;
    ipcRenderer.removeListener(channel, wrapped);
    _listenerMap.delete(listener);
    return safeIpcRenderer;
  },
};

contextBridge.exposeInMainWorld("process", {
  type: "renderer",
  versions: { electron: process.versions.electron },
});

contextBridge.exposeInMainWorld("require", (moduleName) => {
  if (moduleName === "electron") return { ipcRenderer: safeIpcRenderer };
  throw new Error("Module not available in renderer: " + moduleName);
});

