import { app, BrowserWindow, Menu, ipcMain, globalShortcut } from "electron";
import path from "path";
import fs from "fs";
import net from "net";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

app.commandLine.appendSwitch("use-angle", "d3d11");
app.commandLine.appendSwitch("disable-gpu-sandbox");
app.commandLine.appendSwitch("in-process-gpu");
app.commandLine.appendSwitch("disable-direct-composition");

// Steam Deck / Linux (Proton): players reported no sound. Chromium's out-of-process
// audio service is known to fail under Wine, so run audio in-process there only.
const isProton = !!(process.env.STEAM_COMPAT_DATA_PATH || process.env.WINEPREFIX || process.env.WINELOADERNOEXEC);
if (isProton) {
  app.commandLine.appendSwitch("disable-features", "AudioServiceOutOfProcess");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// v1.03 TEST build (exe name contains "TEST"): runs next to the real game with its own profile and
// save folder, never writes the real save, and sends no achievements or leaderboard scores.
const IS_TEST_BUILD = /TEST/i.test(path.basename(process.execPath)) || process.env.DATAFALL_TEST_BUILD === "1";
// Demo build: the renderer keeps its own save file (save.demo.v3.json, own namespace) in the same folder, as the
// March demo did, so old demo saves continue and a full-game save is never loaded or overwritten.
const IS_DEMO_BUILD = /demo/i.test(path.basename(process.execPath)) || process.env.DATAFALL_DEMO_BUILD === "1";
const FULL_SAVE_FOLDER = IS_TEST_BUILD ? "DataFall V1.03 TEST" : "DataFall";
const DEMO_SAVE_FILE = "save.demo.v3.json";
const SAVE_FOLDER_NAME = FULL_SAVE_FOLDER;
if (IS_TEST_BUILD) {
  // DATAFALL_TEST_PROFILE_DIR lets automated checks use a throwaway profile instead of the tester's.
  app.setPath("userData", process.env.DATAFALL_TEST_PROFILE_DIR || path.join(app.getPath("appData"), IS_DEMO_BUILD ? "DataFall Demo V1.03 TEST" : "DataFall V1.03 TEST"));
}

let serverProcess = null;
let mainWindow = null;
const leaderboardIdCache = new Map();

// -------------------- Steamworks --------------------
let steamClient = null;
let steamInitialized = false;

function getSteamAppId() {
  const envId =
    process.env.STEAM_APP_ID ||
    process.env.SteamAppId ||
    process.env.SteamAppID;

  const parsed = parseInt(String(envId || ""), 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;

  return 4291910;
}

function ensureSteamAppIdTxt(appId) {
  try {
    const exeDir = path.dirname(process.execPath);
    const p = path.join(exeDir, "steam_appid.txt");
    if (!fs.existsSync(p)) fs.writeFileSync(p, String(appId), "utf8");
  } catch {}
}

function initSteam() {
  try {
    const appId = getSteamAppId();
    ensureSteamAppIdTxt(appId);

    const steamworks = require("@pipelab/steamworks.js");
    steamClient = steamworks.init(appId);
    steamInitialized = true;

    console.log("[steam] init OK appId =", appId);

    if (steamClient && typeof steamClient.runCallbacks === "function") {
      setInterval(() => {
        try {
          steamClient.runCallbacks();
        } catch {}
      }, 1000);
    }
  } catch (e) {
    steamClient = null;
    steamInitialized = false;
    console.log("[steam] not available:", e?.message || e);
  }
}

function toSafeInt(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.floor(parsed);
}

function getLeaderboardsApi() {
  return steamClient?.leaderboards ?? null;
}

function getCurrentSteamLanguage() {
  try {
    const raw = steamClient?.apps?.currentGameLanguage?.() ?? null;
    return typeof raw === "string" && raw.trim() ? raw.trim() : null;
  } catch {
    return null;
  }
}

function normalizeSteamId(value) {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  if (!text) return "";
  const match = text.match(/\d{10,20}/);
  return match?.[0] || text;
}

function getLocalPlayerName() {
  try {
    const name = steamClient?.localplayer?.getName?.();
    return typeof name === "string" ? name.trim() : "";
  } catch {
    return "";
  }
}

function getLocalPlayerSteamId() {
  try {
    const raw =
      steamClient?.localplayer?.getSteamId?.()?.steamId64 ??
      steamClient?.localplayer?.getSteamId?.()?.steamId ??
      steamClient?.localplayer?.getSteamId?.() ??
      "";
    return normalizeSteamId(raw);
  } catch {
    return "";
  }
}

function resolveSteamPersonaName(steamId) {
  const steamIdText = String(steamId || "").trim();
  if (!steamIdText) return "";

  const normalizedTarget = normalizeSteamId(steamIdText);
  const localSteamId = getLocalPlayerSteamId();
  if (normalizedTarget && localSteamId && normalizedTarget === localSteamId) {
    const localName = getLocalPlayerName();
    if (localName) return localName;
  }

  try {
    const friends = steamClient?.friends;
    if (!friends) return "";

    const asBigInt = BigInt(normalizedTarget || steamIdText);
    if (typeof friends.getFriendPersonaName === "function") {
      const name = friends.getFriendPersonaName(asBigInt);
      if (typeof name === "string" && name.trim()) return name.trim();
    }
    if (typeof friends.getFriendName === "function") {
      const name = friends.getFriendName(asBigInt);
      if (typeof name === "string" && name.trim()) return name.trim();
    }

    if (typeof friends.getFriends === "function") {
      const flags = friends.FriendFlags?.All ?? 65535;
      const allFriends = friends.getFriends(flags);
      if (Array.isArray(allFriends)) {
        const found = allFriends.find((friend) => {
          const id = normalizeSteamId(friend?.steamId);
          return !!id && id === normalizedTarget;
        });
        if (found?.name && typeof found.name === "string" && found.name.trim()) {
          return found.name.trim();
        }
      }
    }

    return "";
  } catch {
    return "";
  }
}

function normalizeEntry(entry, index = 0) {
  const steamIdRaw =
    entry?.steamId ??
    entry?.steamID ??
    entry?.steamid ??
    entry?.user?.steamId ??
    entry?.player?.steamId ??
    "";
  const steamId = normalizeSteamId(steamIdRaw);
  const personaResolved = resolveSteamPersonaName(steamId);

  const personaName =
    String(
      entry?.personaName ??
      entry?.name ??
      entry?.userName ??
      entry?.playerName ??
      ""
    ).trim() ||
    personaResolved ||
    "Unknown Player";

  return {
    rank: toSafeInt(entry?.rank ?? entry?.globalRank ?? entry?.globalrank ?? index + 1, index + 1),
    score: toSafeInt(entry?.score ?? entry?.value ?? 0, 0),
    steamId,
    personaName,
  };
}

async function findOrCreateLeaderboard(leaderboardName) {
  const normalized = String(leaderboardName || "").trim();
  if (!normalized) throw new Error("leaderboardName is required");

  const cached = leaderboardIdCache.get(normalized);
  if (cached) return cached;

  const leaderboards = getLeaderboardsApi();
  if (!leaderboards) {
    throw new Error("steamClient.leaderboards is unavailable. Ensure @pipelab/steamworks.js is initialized.");
  }

  const created = await leaderboards.findOrCreateLeaderboard(
    normalized,
    leaderboards.SortMethod.Descending,
    leaderboards.DisplayType.Numeric
  );
  const resolvedName = created || normalized;
  leaderboardIdCache.set(normalized, resolvedName);
  return resolvedName;
}

// -------------------- Server --------------------
function waitForPort(port, host = "127.0.0.1", timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const tryOnce = () => {
      const socket = new net.Socket();
      socket.setTimeout(1000);

      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });

      const onFail = () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) reject(new Error(`Port ${port} not ready`));
        else setTimeout(tryOnce, 250);
      };

      socket.once("error", onFail);
      socket.once("timeout", onFail);

      socket.connect(port, host);
    };

    tryOnce();
  });
}

// Preferred port 5000 keeps the renderer origin (and its localStorage) unchanged; fall back to a free port.
let serverPort = 5000;
// Free = nothing answers on it (on Windows a 127.0.0.1 bind can succeed next to a 0.0.0.0 listener, so we probe by connecting).
function isPortFree(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(400);
    socket.once("connect", () => { socket.destroy(); resolve(false); });
    socket.once("timeout", () => { socket.destroy(); resolve(true); });
    socket.once("error", () => { socket.destroy(); resolve(true); });
    socket.connect(port, "127.0.0.1");
  });
}
function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => { const p = srv.address().port; srv.close(() => resolve(p)); });
  });
}
async function pickServerPort() {
  if (await isPortFree(5000)) return 5000;
  const p = await getFreePort();
  console.log("[server] port 5000 busy, using", p);
  return p;
}

function startServer() {
  const isDev = process.env.NODE_ENV === "development";
  const appRoot = app.getAppPath(); // prod: .../resources/app.asar

  const serverEntry = isDev
    ? path.join(process.cwd(), "dist", "index.mjs")
    : path.join(appRoot, "dist", "index.mjs");

  const env = {
    ...process.env,
    NODE_ENV: isDev ? "development" : "production",
    PORT: String(serverPort),
    ELECTRON_RUN_AS_NODE: "1",
    SteamAppId: String(getSteamAppId()),
    STEAM_APP_ID: String(getSteamAppId()),
  };

  serverProcess = spawn(process.execPath, [serverEntry], {
    env,
    stdio: "inherit",
    windowsHide: false,
  });

  serverProcess.on("exit", (code) => {
    console.log("[server] exited with code", code);
  });
}

// -------------------- Window --------------------
function attachWebContentsDebug(wc) {
  wc.on("console-message", (_e, level, message, line, sourceId) => {
    console.log(`[renderer console][${level}] ${message} (${sourceId}:${line})`);
  });

  wc.on("render-process-gone", (_e, details) => {
    console.log("[renderer] gone:", details);
  });

  wc.on("did-fail-load", (_e, errorCode, errorDesc, validatedURL) => {
    console.log("[renderer] did-fail-load:", errorCode, errorDesc, validatedURL);
  });
}

function registerDevtoolsShortcuts() {
  try {
    globalShortcut.unregisterAll();

    // F12
    globalShortcut.register("F12", () => {
      if (!mainWindow) return;
      try {
        const wc = mainWindow.webContents;
        if (wc.isDevToolsOpened()) wc.closeDevTools();
        else wc.openDevTools({ mode: "detach" });
      } catch {}
    });

    // Ctrl+Shift+I
    globalShortcut.register("CommandOrControl+Shift+I", () => {
      if (!mainWindow) return;
      try {
        mainWindow.webContents.openDevTools({ mode: "detach" });
      } catch {}
    });
  } catch (e) {
    console.log("[devtools] shortcut register failed:", e?.message || e);
  }
}

async function createWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    fullscreen: true,
    autoHideMenuBar: true,
    title: "DataFall",
    backgroundColor: "#0f172a",
    show: true,

    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: true, // allow opening devtools even in packaged
    },
  });

  mainWindow.setMenu(null);
  mainWindow.setMenuBarVisibility(false);

  attachWebContentsDebug(mainWindow.webContents);

  // Devtools shortcuts must exist because you killed the menu (fair).
  registerDevtoolsShortcuts();

  // Optional: force-open DevTools via env
  if (process.env.DF_DEVTOOLS === "1") {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  // Start server and load it
  await waitForPort(serverPort);
  await mainWindow.loadURL(`http://127.0.0.1:${serverPort}`);

  // Force fullscreen after load (Windows likes to argue)
  try {
    mainWindow.maximize();
    mainWindow.setFullScreen(true);
    mainWindow.focus();
  } catch {}
}

// -------------------- IPC (Fullscreen) --------------------
// IMPORTANT: renderer currently uses BOTH naming styles in different places.
// So we support both, because humans love inconsistency.

function setFullscreen(value) {
  if (!mainWindow) return;
  mainWindow.setFullScreen(!!value);
}

function toggleFullscreen() {
  if (!mainWindow) return;
  mainWindow.setFullScreen(!mainWindow.isFullScreen());
}

function setFpsLimit(value) {
  // Electron's webContents.setFrameRate only affects offscreen rendering,
  // so standard BrowserWindow presentation should stay on Chromium defaults.
  // We keep the IPC channel for compatibility with the renderer settings UI.
  void value;
}

// New/Preferred
ipcMain.on("df:set-fullscreen", (_event, value) => setFullscreen(value));
ipcMain.on("df:toggle-fullscreen", () => toggleFullscreen());
ipcMain.handle("df:is-fullscreen", () => (mainWindow ? mainWindow.isFullScreen() : false));
ipcMain.on("df:set-fps-limit", (_event, value) => setFpsLimit(value));

// Legacy/Other code paths (your current steamIntegration.ts uses these)
ipcMain.on("set-fullscreen", (_event, value) => setFullscreen(value));
ipcMain.on("toggle-fullscreen", () => toggleFullscreen());
ipcMain.handle("is-fullscreen", () => (mainWindow ? mainWindow.isFullScreen() : false));

// Steam ready probe
ipcMain.handle("df:is-steam-ready", () => !!steamInitialized);
ipcMain.handle("is-steam-ready", () => !!steamInitialized);
ipcMain.handle("df:get-steam-language", () => getCurrentSteamLanguage());
ipcMain.handle("get-steam-language", () => getCurrentSteamLanguage());
ipcMain.on("df:get-steam-language-sync", (event) => {
  event.returnValue = getCurrentSteamLanguage();
});
ipcMain.on("get-steam-language-sync", (event) => {
  event.returnValue = getCurrentSteamLanguage();
});

// -------------------- Steam Cloud (Auto-Cloud) file I/O --------------------
// A save is only kept as .bak, or loaded, when it is non-empty valid JSON, so a crash
// mid-write (empty/truncated save.json) can no longer replace the good backup.
function isValidSaveJson(text) {
  if (!text || !text.trim()) return false;
  try {
    const parsed = JSON.parse(text);
    return parsed === null || typeof parsed === "object";
  } catch {
    return false;
  }
}

// Crash-safe write: temp file, keep the previous valid save as .bak, then atomic rename.
function writeSaveAtomic(file, payload) {
  const tempFile = `${file}.tmp`;
  const backupFile = `${file}.bak`;
  fs.writeFileSync(tempFile, payload, "utf8");
  try {
    if (fs.existsSync(file) && isValidSaveJson(fs.readFileSync(file, "utf8"))) {
      fs.copyFileSync(file, backupFile);
    }
  } catch {}
  fs.renameSync(tempFile, file);
}

// Returns the first valid save of [file, file.bak], or null.
function readSaveWithBackup(file) {
  for (const f of [file, `${file}.bak`]) {
    try {
      if (!fs.existsSync(f)) continue;
      const data = fs.readFileSync(f, "utf8");
      if (isValidSaveJson(data)) return { data, from: f };
      console.log("[cloud] corrupt save ignored =>", f);
    } catch (e) {
      console.log("[cloud] read failed =>", f, e?.message || e);
    }
  }
  return { data: null, from: null };
}

function getAutoCloudSavePath(fileName = "save.json") {
  const base =
    process.env.LOCALAPPDATA ||
    path.join(app.getPath("home"), "AppData", "Local");

  const dir = path.join(base, SAVE_FOLDER_NAME);
  const sanitizedFileName =
    typeof fileName === "string" && /^[a-zA-Z0-9._-]+$/.test(fileName)
      ? fileName
      : "save.json";
  const file = path.join(dir, sanitizedFileName);
  return { dir, file };
}

ipcMain.handle("df:save-file", async (_event, payloadInput) => {
  try {
    const fileName =
      payloadInput && typeof payloadInput === "object" && !Array.isArray(payloadInput)
        ? payloadInput.fileName
        : undefined;
    const rawData =
      payloadInput && typeof payloadInput === "object" && !Array.isArray(payloadInput) && "data" in payloadInput
        ? payloadInput.data
        : payloadInput;
    const { dir, file } = getAutoCloudSavePath(fileName);
    fs.mkdirSync(dir, { recursive: true });

    const payload =
      typeof rawData === "string" ? rawData : JSON.stringify(rawData ?? null);
    writeSaveAtomic(file, payload);

    console.log("[cloud] save OK =>", file, "| bytes =", Buffer.byteLength(payload, "utf8"));
    return { ok: true, file };
  } catch (e) {
    console.log("[cloud] save failed:", e?.message || e);
    return { ok: false, reason: e?.message || String(e) };
  }
});

ipcMain.handle("df:load-file", async (_event, payloadInput) => {
  try {
    const fileName =
      payloadInput && typeof payloadInput === "object" && !Array.isArray(payloadInput)
        ? payloadInput.fileName
        : undefined;
    const { file } = getAutoCloudSavePath(fileName);
    const { data, from } = readSaveWithBackup(file);
    if (!data) {
      console.log("[cloud] load: no valid save =>", file);
      return { ok: true, data: null, file };
    }
    console.log("[cloud] load OK =>", from, "| bytes =", Buffer.byteLength(data, "utf8"));
    return { ok: true, data, file: from };
  } catch (e) {
    console.log("[cloud] load failed:", e?.message || e);
    return { ok: false, data: null, reason: e?.message || String(e) };
  }
});

// Full game with no save yet: read (never write) the demo save so demo progress carries over once.
ipcMain.handle("df:import-demo-save", async () => {
  const base = process.env.LOCALAPPDATA || path.join(app.getPath("home"), "AppData", "Local");
  const { data, from } = readSaveWithBackup(path.join(base, FULL_SAVE_FOLDER, DEMO_SAVE_FILE));
  if (data) console.log("[cloud] imported demo save (read-only) =>", from);
  return { ok: true, data };
});

// TEST build only: read (never write) the real game's save so testing starts from real progress.
ipcMain.handle("df:import-live-save", async () => {
  if (!IS_TEST_BUILD) return { ok: false, data: null };
  const base = process.env.LOCALAPPDATA || path.join(app.getPath("home"), "AppData", "Local");
  const { data, from } = readSaveWithBackup(path.join(base, "DataFall", "save.json"));
  console.log("[cloud] test build imported live save (read-only) =>", from);
  return { ok: true, data };
});

// -------------------- Steam Overlay --------------------
ipcMain.on("df:open-overlay", (_event, overlayType) => {
  if (!steamInitialized || !steamClient) {
    console.log("[steam] overlay requested but Steam not initialized");
    return;
  }

  try {
    if (typeof steamClient.activateOverlay === "function") {
      steamClient.activateOverlay(overlayType || "friends");
      return;
    }

    if (steamClient.overlay && typeof steamClient.overlay.activateDialog === "function") {
      steamClient.overlay.activateDialog(overlayType || "friends");
      return;
    }

    console.log("[steam] overlay API not found on steamClient");
  } catch (e) {
    console.log("[steam] overlay error:", e?.message || e);
  }
});

// v1.03 demo end screen: open the full game's store page (Steam overlay, else the Steam client / browser).
ipcMain.on("df:open-store", (_event, appId) => {
  const id = Number(appId) || 4291910;
  try {
    if (steamInitialized && steamClient && steamClient.overlay) {
      if (typeof steamClient.overlay.activateToStore === "function") { steamClient.overlay.activateToStore(id, 0); return; }
      if (typeof steamClient.overlay.activateToWebPage === "function") { steamClient.overlay.activateToWebPage("https://store.steampowered.com/app/" + id + "/"); return; }
    }
  } catch (e) {
    console.log("[steam] store overlay error:", e?.message || e);
  }
  try { require("electron").shell.openExternal("steam://store/" + id); } catch {}
});

// -------------------- Steam Achievements --------------------
ipcMain.on("df:unlock-achievement", (_event, achievementId) => {
  if (IS_TEST_BUILD) return;
  console.log("[steam] unlock request:", achievementId);

  if (!steamInitialized || !steamClient) {
    console.log("[steam] unlock requested but Steam not initialized:", achievementId);
    return;
  }

  try {
    const ok = steamClient.achievement.activate(achievementId);
    console.log("[steam] unlock result:", achievementId, ok);
  } catch (e) {
    console.log("[steam] achievement error:", e?.message || e);
  }
});



// -------------------- Legacy SteamIntegration.ts IPC channels --------------------
// Your renderer-side steamIntegration.ts uses "steam-*" channels.
// We already support "df:*" channels. These aliases bridge the two worlds
// without changing your working df API.

ipcMain.on("steam-get-user", (event) => {
  try {
    if (steamInitialized && steamClient) {
      // steamworks.js API surface differs by version; keep it safe.
      let username = null;
      let steamId = null;

      try {
        // common patterns (best-effort)
        username =
          steamClient?.localplayer?.getName?.() ??
          steamClient?.user?.getName?.() ??
          steamClient?.user?.name ??
          null;
      } catch {}

      try {
        const rawSteamId =
          steamClient?.localplayer?.getSteamId?.()?.steamId64 ??
          steamClient?.localplayer?.getSteamId?.()?.steamId ??
          steamClient?.user?.getSteamId?.()?.steamId64 ??
          steamClient?.user?.getSteamId?.()?.steamId ??
          steamClient?.localplayer?.getSteamId?.() ??
          steamClient?.user?.getSteamId?.() ??
          null;

        steamId = rawSteamId === null || rawSteamId === undefined ? null : String(rawSteamId);
      } catch {}

      event.sender.send("steam-user-info", {
        initialized: true,
        username,
        steamId,
      });
      return;
    }

    event.sender.send("steam-user-info", {
      initialized: false,
      username: null,
      steamId: null,
    });
  } catch (e) {
    console.log("[steam] steam-get-user error:", e?.message || e);
    event.sender.send("steam-user-info", {
      initialized: false,
      username: null,
      steamId: null,
    });
  }
});

ipcMain.on("steam-unlock-achievement", (event, achievementId) => {
  if (IS_TEST_BUILD) return;
  console.log("[steam] legacy unlock request:", achievementId);
  if (!steamInitialized || !steamClient) {
    event.sender.send("steam-achievement-unlocked", {
      success: false,
      achievementId,
      reason: "steam not initialized",
    });
    return;
  }

  try {
    const ok = !!steamClient.achievement?.activate?.(achievementId);
    console.log("[steam] legacy unlock result:", achievementId, ok);
    event.sender.send("steam-achievement-unlocked", { success: ok, achievementId });
  } catch (e) {
    console.log("[steam] legacy achievement error:", e?.message || e);
    event.sender.send("steam-achievement-unlocked", {
      success: false,
      achievementId,
      reason: e?.message || String(e),
    });
  }
});

ipcMain.on("steam-open-overlay", (_event, overlayType) => {
  // Forward to existing df handler if possible.
  try {
    if (mainWindow) {
      mainWindow.webContents.send("df:open-overlay", overlayType);
    }
  } catch {}
});

ipcMain.on("steam-cloud-save", async (event, payloadInput) => {
  try {
    const fileName =
      payloadInput && typeof payloadInput === "object" && !Array.isArray(payloadInput)
        ? payloadInput.fileName
        : undefined;
    const rawData =
      payloadInput && typeof payloadInput === "object" && !Array.isArray(payloadInput) && "data" in payloadInput
        ? payloadInput.data
        : payloadInput;
    const { dir, file } = getAutoCloudSavePath(fileName);
    fs.mkdirSync(dir, { recursive: true });

    const payload =
      typeof rawData === "string" ? rawData : JSON.stringify(rawData ?? null);
    writeSaveAtomic(file, payload);

    console.log("[cloud] legacy save OK =>", file, "| bytes =", Buffer.byteLength(payload, "utf8"));
    event.sender.send("steam-cloud-save-result", { success: true, file });
  } catch (e) {
    console.log("[cloud] legacy save failed:", e?.message || e);
    event.sender.send("steam-cloud-save-result", {
      success: false,
      reason: e?.message || String(e),
    });
  }
});

ipcMain.on("steam-cloud-load", async (event, payloadInput) => {
  try {
    const fileName =
      payloadInput && typeof payloadInput === "object" && !Array.isArray(payloadInput)
        ? payloadInput.fileName
        : undefined;
    const { file } = getAutoCloudSavePath(fileName);
    const { data, from } = readSaveWithBackup(file);
    if (!data) {
      console.log("[cloud] legacy load: no valid save =>", file);
      event.sender.send("steam-cloud-load-result", { success: true, data: null, file });
      return;
    }
    console.log("[cloud] legacy load OK =>", from, "| bytes =", Buffer.byteLength(data, "utf8"));
    event.sender.send("steam-cloud-load-result", { success: true, data, file: from });
  } catch (e) {
    console.log("[cloud] legacy load failed:", e?.message || e);
    event.sender.send("steam-cloud-load-result", {
      success: false,
      reason: e?.message || String(e),
    });
  }
});

// -------------------- Steam Leaderboards (Steamworks Client API) --------------------
ipcMain.handle("df:leaderboard-set-score", async (_event, payload) => {
  if (IS_TEST_BUILD) return { ok: false, reason: "test_build" };
  try {
    if (!steamInitialized || !steamClient) {
      return { ok: false, reason: "steam_not_initialized" };
    }

    const leaderboards = getLeaderboardsApi();
    if (!leaderboards) {
      return { ok: false, reason: "leaderboards_api_unavailable" };
    }

    const leaderboardName = String(payload?.leaderboardName || "").trim();
    const rawScore = toSafeInt(payload?.score, -1);
    const keepBest = payload?.keepBest !== false;
    const detail = Array.isArray(payload?.detail)
      ? payload.detail
          .map((value) => toSafeInt(value, 0))
          .filter((value) => Number.isFinite(value))
          .slice(0, 64)
      : [];

    if (!leaderboardName) return { ok: false, reason: "missing_leaderboard_name" };
    if (rawScore < 0) return { ok: false, reason: "invalid_score" };

    const leaderboardHandle = await findOrCreateLeaderboard(leaderboardName);
    const uploadMethod = keepBest
      ? leaderboards.UploadScoreMethod.KeepBest
      : leaderboards.UploadScoreMethod.ForceUpdate;
    const uploadResult = await leaderboards.uploadScore(
      String(leaderboardHandle),
      rawScore,
      uploadMethod,
      detail
    );

    if (!uploadResult) {
      return { ok: false, reason: "UploadLeaderboardScore returned null" };
    }

    return {
      ok: true,
      leaderboardId: 0,
      scoreChanged: true,
      globalRankNew: toSafeInt(uploadResult.globalRank, 0),
      globalRankPrevious: 0,
    };
  } catch (error) {
    return { ok: false, reason: error?.message || String(error) };
  }
});

ipcMain.handle("df:leaderboard-get-entries", async (_event, payload) => {
  try {
    if (!steamInitialized || !steamClient) {
      return { ok: false, reason: "steam_not_initialized", entries: [] };
    }

    const leaderboards = getLeaderboardsApi();
    if (!leaderboards) {
      return { ok: false, reason: "leaderboards_api_unavailable", entries: [] };
    }

    const leaderboardName = String(payload?.leaderboardName || "").trim();
    const limit = Math.max(1, Math.min(500, toSafeInt(payload?.limit, 10)));
    const aroundUser = !!payload?.aroundUser;
    const mode = String(payload?.mode || "").trim().toLowerCase();
    const scope = mode === "friends" ? "friends" : (aroundUser || mode === "around_user" ? "around_user" : "global");

    if (!leaderboardName) return { ok: false, reason: "missing_leaderboard_name", entries: [] };

    const leaderboardHandle = await findOrCreateLeaderboard(leaderboardName);
    const rangeStart = scope === "around_user" ? -Math.floor(limit / 2) : 1;
    const rangeEnd = scope === "around_user" ? Math.floor(limit / 2) : limit;
    const dataRequest = scope === "friends"
      ? leaderboards.DataRequest.Friends
      : scope === "around_user"
        ? leaderboards.DataRequest.GlobalAroundUser
        : leaderboards.DataRequest.Global;

    const rawEntries = await leaderboards.downloadScores(
      String(leaderboardHandle),
      dataRequest,
      rangeStart,
      rangeEnd
    );
    const entries = (Array.isArray(rawEntries) ? rawEntries : []).map((entry, index) => normalizeEntry(entry, index));

    return {
      ok: true,
      leaderboardId: 0,
      entries,
    };
  } catch (error) {
    return { ok: false, reason: error?.message || String(error), entries: [] };
  }
});

// -------------------- Lifecycle --------------------
// v1.04: only one DataFall window. A second launch (e.g. Steam relaunch while alt-tabbed) focuses the running one.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    try {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    } catch {}
  });
}

app.whenReady().then(async () => {
  if (!app.hasSingleInstanceLock()) return;
  initSteam();
  serverPort = await pickServerPort();
  startServer();
  await createWindow();
});

app.on("will-quit", () => {
  try {
    globalShortcut.unregisterAll();
  } catch {}
});

app.on("window-all-closed", () => {
  if (serverProcess) {
    try { serverProcess.kill(); } catch {}
  }
  if (process.platform !== "darwin") app.quit();
});
