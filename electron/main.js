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

function getSaveFolderName() {
  const editionFromEnv = String(
    process.env.GAME_EDITION || process.env.VITE_GAME_EDITION || ""
  )
    .trim()
    .toLowerCase();

  if (editionFromEnv === "demo") return "DataFall Demo";

  const appName = String(app.getName?.() || "")
    .trim()
    .toLowerCase();
  if (appName.includes("demo")) return "DataFall Demo";

  return "DataFall";
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

function startServer() {
  const isDev = process.env.NODE_ENV === "development";
  const appRoot = app.getAppPath(); // prod: .../resources/app.asar

  const serverEntry = isDev
    ? path.join(process.cwd(), "dist", "index.mjs")
    : path.join(appRoot, "dist", "index.mjs");

  const env = {
    ...process.env,
    NODE_ENV: isDev ? "development" : "production",
    PORT: "5000",
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
    title: app.getName() || "DataFall",
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
  await waitForPort(5000);
  await mainWindow.loadURL("http://127.0.0.1:5000");

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

// New/Preferred
ipcMain.on("df:set-fullscreen", (_event, value) => setFullscreen(value));
ipcMain.on("df:toggle-fullscreen", () => toggleFullscreen());
ipcMain.handle("df:is-fullscreen", () => (mainWindow ? mainWindow.isFullScreen() : false));

// Legacy/Other code paths (your current steamIntegration.ts uses these)
ipcMain.on("set-fullscreen", (_event, value) => setFullscreen(value));
ipcMain.on("toggle-fullscreen", () => toggleFullscreen());
ipcMain.handle("is-fullscreen", () => (mainWindow ? mainWindow.isFullScreen() : false));

// Steam ready probe
ipcMain.handle("df:is-steam-ready", () => !!steamInitialized);
ipcMain.handle("is-steam-ready", () => !!steamInitialized);

// -------------------- Steam Cloud (Auto-Cloud) file I/O --------------------
// Crash-safe write: write to a temp file, keep the previous good save as .bak,
// then atomically rename. A crash mid-write can no longer leave an empty/corrupt save.
function writeSaveAtomic(file, payload) {
  const tmp = file + ".tmp";
  const bak = file + ".bak";
  fs.writeFileSync(tmp, payload, "utf8");
  try {
    if (fs.existsSync(file)) {
      const current = fs.readFileSync(file, "utf8");
      if (isValidSaveJson(current)) fs.copyFileSync(file, bak);
    }
  } catch {}
  fs.renameSync(tmp, file);
}

function isValidSaveJson(text) {
  if (!text || !text.trim()) return false;
  try {
    const parsed = JSON.parse(text);
    return parsed === null || typeof parsed === "object";
  } catch {
    return false;
  }
}

function readSaveWithBackup(file) {
  const candidates = [file, file + ".bak"];
  for (const f of candidates) {
    try {
      if (!fs.existsSync(f)) continue;
      const data = fs.readFileSync(f, "utf8");
      if (isValidSaveJson(data)) return { data, from: f };
      console.log("[cloud] corrupt save ignored =>", f);
    } catch {}
  }
  return { data: null, from: null };
}
function getAutoCloudSavePath() {
  const base =
    process.env.LOCALAPPDATA ||
    path.join(app.getPath("home"), "AppData", "Local");

  const dir = path.join(base, getSaveFolderName());
  const file = path.join(dir, "save.json");
  return { dir, file };
}

ipcMain.handle("df:save-file", async (_event, jsonString) => {
  try {
    const { dir, file } = getAutoCloudSavePath();
    fs.mkdirSync(dir, { recursive: true });

    const payload =
      typeof jsonString === "string" ? jsonString : JSON.stringify(jsonString ?? null);

    writeSaveAtomic(file, payload);

    console.log("[cloud] save OK =>", file, "| bytes =", Buffer.byteLength(payload, "utf8"));
    return { ok: true, file };
  } catch (e) {
    console.log("[cloud] save failed:", e?.message || e);
    return { ok: false, reason: e?.message || String(e) };
  }
});

ipcMain.handle("df:load-file", async () => {
  try {
    const { file } = getAutoCloudSavePath();
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

// -------------------- Steam Achievements --------------------
ipcMain.on("df:unlock-achievement", (_event, achievementId) => {
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

ipcMain.on("steam-cloud-save", async (event, jsonString) => {
  try {
    const { dir, file } = getAutoCloudSavePath();
    fs.mkdirSync(dir, { recursive: true });

    const payload =
      typeof jsonString === "string" ? jsonString : JSON.stringify(jsonString ?? null);

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

ipcMain.on("steam-cloud-load", async (event) => {
  try {
    const { file } = getAutoCloudSavePath();
    if (!fs.existsSync(file)) {
      console.log("[cloud] legacy load: no file =>", file);
      event.sender.send("steam-cloud-load-result", { success: true, data: null, file });
      return;
    }
    const data = fs.readFileSync(file, "utf8");
    console.log("[cloud] legacy load OK =>", file, "| bytes =", Buffer.byteLength(data, "utf8"));
    event.sender.send("steam-cloud-load-result", { success: true, data, file });
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
app.whenReady().then(async () => {
  initSteam();
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
