import { app, BrowserWindow, Menu, ipcMain, globalShortcut, protocol, shell } from "electron";
import path from "path";
import fs from "fs";
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

// -------------------- Game files (app:// protocol) --------------------
// v1.04: the game is served from the packaged files through a fixed app://datafall origin instead of a local
// HTTP server on 127.0.0.1:<port>. localStorage (settings + the local save copy) is tied to the origin, so a
// fixed origin can never come back empty because a port was busy. No server process, no open port.
const APP_SCHEME = "app";
const APP_HOST = "datafall";
const APP_URL = `${APP_SCHEME}://${APP_HOST}/`;
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, codeCache: true },
  },
]);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".txt": "text/plain; charset=utf-8",
};

function getStaticRoot() {
  const base = process.env.NODE_ENV === "development" ? process.cwd() : app.getAppPath(); // prod: .../resources/app.asar
  return path.join(base, "dist", "public");
}

function isFile(p) {
  try { return fs.statSync(p).isFile(); } catch { return false; }
}

// Same behaviour as the old express static server: serve the file, fall back to index.html for unknown paths.
function serveAppRequest(request) {
  const root = getStaticRoot();
  let pathname = "/";
  try { pathname = decodeURIComponent(new URL(request.url).pathname || "/"); } catch {}
  if (pathname === LEGACY_MIGRATION_PATH) {
    return new Response("<!doctype html><title>DataFall</title>", { headers: { "content-type": "text/html; charset=utf-8" } });
  }
  let filePath = path.normalize(path.join(root, pathname));
  if (filePath !== root && !filePath.startsWith(root + path.sep)) {
    return new Response("Forbidden", { status: 403 });
  }
  if (!isFile(filePath)) filePath = path.join(root, "index.html");

  let body;
  try {
    body = fs.readFileSync(filePath);
  } catch (e) {
    console.log("[app] read failed:", filePath, e?.message || e);
    return new Response("Not found", { status: 404 });
  }

  const headers = {
    "content-type": MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
    "accept-ranges": "bytes",
    "cache-control": "no-cache",
  };

  // Range requests keep <audio> seeking/looping working.
  const range = request.headers.get("range");
  const match = range ? /^bytes=(\d*)-(\d*)$/.exec(range.trim()) : null;
  if (match && (match[1] || match[2])) {
    const size = body.length;
    let start = match[1] ? parseInt(match[1], 10) : Math.max(0, size - parseInt(match[2], 10));
    let end = match[1] && match[2] ? parseInt(match[2], 10) : size - 1;
    end = Math.min(end, size - 1);
    if (!(start >= 0) || start > end) {
      return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
    }
    return new Response(body.subarray(start, end + 1), {
      status: 206,
      headers: { ...headers, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(end - start + 1) },
    });
  }
  return new Response(body, { status: 200, headers: { ...headers, "content-length": String(body.length) } });
}

function registerAppProtocol() {
  protocol.handle(APP_SCHEME, (request) => serveAppRequest(request));
}

// -------------------- One-time localStorage migration from the old http origin --------------------
// Up to v1.03 the renderer ran on http://127.0.0.1:5000, so players' settings and the local save copy live in
// that origin's localStorage. On first launch with app://, a hidden window on the same profile reads that
// storage (read-only) and then copies every key the new app:// origin does not have yet, before the game opens.
// The old storage itself is never touched, and a JSON copy is kept in the user data folder.
const LEGACY_ORIGINS = ["http://127.0.0.1:5000", "http://localhost:5000"];
const LEGACY_MIGRATION_MARKER = "legacy-storage-migrated.json";
const LEGACY_STORAGE_BACKUP = "legacy-localstorage-backup.json";
const LEGACY_MIGRATION_PATH = "/__df_migrate";

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms)),
  ]);
}

function getSaveTimestamp(value) {
  try {
    const parsed = JSON.parse(value);
    const ts = Number(parsed?.lastSaveTimestamp);
    return Number.isFinite(ts) ? ts : null;
  } catch {
    return null;
  }
}

async function migrateLegacyLocalStorage() {
  const userData = app.getPath("userData");
  if (fs.existsSync(path.join(userData, LEGACY_MIGRATION_MARKER))) return;

  const perOrigin = [];
  let allRead = true;
  let copied = null;
  let win = null;
  try {
    // Answer every http request with a blank page while reading, so nothing on the network is involved.
    protocol.handle("http", () => new Response("<!doctype html><title>DataFall</title>", { headers: { "content-type": "text/html" } }));
    win = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
    for (const origin of LEGACY_ORIGINS) {
      try {
        await withTimeout(win.loadURL(`${origin}/`), 5000, "legacy load");
        const json = await withTimeout(
          win.webContents.executeJavaScript(
            "(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k !== null) o[k] = localStorage.getItem(k); } return JSON.stringify(o); })()",
            true
          ),
          5000,
          "legacy read"
        );
        perOrigin.push({ origin, data: JSON.parse(json) || {} });
      } catch (e) {
        allRead = false;
        console.log("[migrate] could not read", origin, e?.message || e);
      }
    }

    const merged = mergeLegacyStorage(perOrigin);
    saveLegacyStorageCopy(userData, perOrigin);
    // Write into the app:// origin (blank page from the app protocol handler), only keys that are missing.
    await withTimeout(win.loadURL(`${APP_SCHEME}://${APP_HOST}${LEGACY_MIGRATION_PATH}`), 5000, "app origin load");
    copied = await withTimeout(
      win.webContents.executeJavaScript(
        `(() => { const src = ${JSON.stringify(merged)}; let n = 0; for (const k of Object.keys(src)) { if (localStorage.getItem(k) === null) { localStorage.setItem(k, src[k]); n++; } } return n; })()`,
        true
      ),
      5000,
      "app origin write"
    );
    console.log("[migrate] legacy localStorage keys found:", Object.keys(merged).length, "| copied:", copied, "| all origins read:", allRead);
  } catch (e) {
    allRead = false;
    console.log("[migrate] legacy storage read failed:", e?.message || e);
  } finally {
    // close() and wait, not destroy(): destroying the renderer here made the next app:// load fail (ERR_FAILED).
    if (win && !win.isDestroyed()) {
      await withTimeout(new Promise((resolve) => { win.once("closed", resolve); win.close(); }), 3000, "legacy window close")
        .catch(() => { try { win.destroy(); } catch {} });
    }
    try { protocol.unhandle("http"); } catch {}
  }

  if (allRead && copied !== null) {
    try {
      fs.mkdirSync(userData, { recursive: true });
      fs.writeFileSync(
        path.join(userData, LEGACY_MIGRATION_MARKER),
        JSON.stringify({ migratedAt: new Date().toISOString(), copied }),
        "utf8"
      );
    } catch (e) {
      console.log("[migrate] marker write failed:", e?.message || e);
    }
  }
}

// For save-like values keep the newest copy (lastSaveTimestamp); otherwise the first origin wins.
function mergeLegacyStorage(perOrigin) {
  const merged = {};
  for (const { data } of perOrigin) {
    for (const [key, value] of Object.entries(data)) {
      if (typeof value !== "string") continue;
      if (!(key in merged)) { merged[key] = value; continue; }
      const a = getSaveTimestamp(merged[key]);
      const b = getSaveTimestamp(value);
      if (a !== null && b !== null && b > a) merged[key] = value;
    }
  }
  return merged;
}

function saveLegacyStorageCopy(userData, perOrigin) {
  if (!perOrigin.some(({ data }) => Object.keys(data).length > 0)) return;
  try {
    const backupFile = path.join(userData, LEGACY_STORAGE_BACKUP);
    if (fs.existsSync(backupFile)) return;
    fs.mkdirSync(userData, { recursive: true });
    fs.writeFileSync(backupFile, JSON.stringify({ createdAt: new Date().toISOString(), origins: perOrigin }, null, 1), "utf8");
  } catch (e) {
    console.log("[migrate] backup copy failed:", e?.message || e);
  }
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

// Closing the window: ask the renderer for one last save and wait for its answer (max 2.5 s) before closing,
// so Alt+F4 / the X button no longer race the final save.
function attachCloseFlush(win) {
  let allowClose = false;
  win.on("close", (event) => {
    if (allowClose) return;
    event.preventDefault();
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      ipcMain.removeListener("df:flush-save-done", onDone);
      allowClose = true;
      try { if (!win.isDestroyed()) win.close(); } catch {}
    };
    const onDone = (e) => { if (e.sender === win.webContents) finish(); };
    const timer = setTimeout(finish, 2500);
    ipcMain.on("df:flush-save-done", onDone);
    try {
      if (win.webContents.isDestroyed() || win.webContents.isCrashed()) finish();
      else win.webContents.send("df:flush-save");
    } catch {
      finish();
    }
  });
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

  attachCloseFlush(mainWindow);

  // DATAFALL_DEV_URL lets development load the Vite dev server instead of the built files.
  await mainWindow.loadURL(process.env.DATAFALL_DEV_URL || APP_URL);

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

// -------------------- Rotating save backups --------------------
// v1.04: next to save.json.bak (previous save) we keep timestamped copies in <save folder>/backups:
//   launch  - the save as it was before the first write of each game session (last 5)
//   periodic- at most one per 30 minutes of play (last 12)
//   daily   - one per calendar day (last 7)
//   rollback- any write that would lose progress (fewer ascensions, less play time, a reset, another
//             save slot): the old save is kept here first (last 10), and .bak is not replaced.
// Note: whether Steam Auto-Cloud uploads backups/ depends on the Auto-Cloud file pattern in Steamworks.
const BACKUP_DIR_NAME = "backups";
const BACKUP_KEEP = { launch: 5, periodic: 12, daily: 7, rollback: 10 };
const PERIODIC_BACKUP_MS = 30 * 60 * 1000;
const sessionSnapshotTaken = new Set();

function backupStamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function listBackups(file, kind) {
  const dir = path.join(path.dirname(file), BACKUP_DIR_NAME);
  const prefix = `${path.basename(file)}.${kind ? kind + "." : ""}`;
  try {
    return fs.readdirSync(dir)
      .filter((name) => name.startsWith(prefix) && name.endsWith(".json"))
      .map((name) => {
        const full = path.join(dir, name);
        let mtimeMs = 0;
        try { mtimeMs = fs.statSync(full).mtimeMs; } catch {}
        return { name, full, mtimeMs };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs || b.name.localeCompare(a.name));
  } catch {
    return [];
  }
}

function snapshotSave(file, kind) {
  try {
    if (!fs.existsSync(file)) return false;
    const dir = path.join(path.dirname(file), BACKUP_DIR_NAME);
    fs.mkdirSync(dir, { recursive: true });
    let target = path.join(dir, `${path.basename(file)}.${kind}.${backupStamp()}.json`);
    for (let i = 2; fs.existsSync(target); i++) {
      target = path.join(dir, `${path.basename(file)}.${kind}.${backupStamp()}-${i}.json`);
    }
    fs.copyFileSync(file, target);
    for (const old of listBackups(file, kind).slice(BACKUP_KEEP[kind] ?? 10)) {
      try { fs.unlinkSync(old.full); } catch {}
    }
    console.log("[cloud] backup", kind, "=>", target);
    return true;
  } catch (e) {
    console.log("[cloud] backup", kind, "failed:", e?.message || e);
    return false;
  }
}

function takeRotatingBackups(file) {
  if (!sessionSnapshotTaken.has(file)) {
    sessionSnapshotTaken.add(file);
    snapshotSave(file, "launch");
  }
  const newestPeriodic = listBackups(file, "periodic")[0];
  if (!newestPeriodic || Date.now() - newestPeriodic.mtimeMs >= PERIODIC_BACKUP_MS) snapshotSave(file, "periodic");
  const today = backupStamp().slice(0, 8);
  if (!listBackups(file, "daily").some((b) => b.name.includes(`.daily.${today}`))) snapshotSave(file, "daily");
}

// Progress of a save, used to spot a write that would throw progress away.
function saveProgress(text) {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      namespace: typeof parsed.saveNamespace === "string" ? parsed.saveNamespace : null,
      ascensions: Number(parsed?.stats?.totalAscensions) || 0,
      elapsed: Number(parsed?.elapsedTime) || 0,
    };
  } catch {
    return null;
  }
}

function isProgressLoss(oldText, newText) {
  const before = saveProgress(oldText);
  if (!before) return false; // nothing worth protecting in the old file
  const after = saveProgress(newText);
  if (!after) return true; // reset (null) or junk over a real save
  if (before.namespace && after.namespace && before.namespace !== after.namespace) return true;
  if (after.ascensions < before.ascensions) return true;
  return after.ascensions === before.ascensions && after.elapsed + 60 < before.elapsed;
}

// Crash-safe write: flushed temp file, rotating backups, keep the previous valid save as .bak, atomic rename.
function writeSaveAtomic(file, payload) {
  const tempFile = `${file}.tmp`;
  const backupFile = `${file}.bak`;
  const fd = fs.openSync(tempFile, "w");
  try {
    fs.writeFileSync(fd, payload, "utf8");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  try {
    if (fs.existsSync(file)) {
      const current = fs.readFileSync(file, "utf8");
      takeRotatingBackups(file);
      if (isValidSaveJson(current)) {
        if (isProgressLoss(current, payload)) {
          // Keep the better save out of reach of the next writes; .bak keeps the previous good save too.
          snapshotSave(file, "rollback");
          console.log("[cloud] write would lose progress; old save kept in backups, .bak left as is");
        } else {
          fs.copyFileSync(file, backupFile);
        }
      }
    }
  } catch (e) {
    console.log("[cloud] backup step failed:", e?.message || e);
  }
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

// Like readSaveWithBackup, but also falls back to the rotating backups, and tells "no save" apart from
// "there is a save but it could not be read" so the game never starts fresh over an unreadable save.
function readSaveForGame(file) {
  let sawFile = false;
  let lastError = null;
  const candidates = [file, `${file}.bak`, ...listBackups(file).map((b) => b.full)];
  for (const f of candidates) {
    try {
      if (!fs.existsSync(f)) continue;
      sawFile = true;
      const data = fs.readFileSync(f, "utf8");
      if (isValidSaveJson(data)) {
        if (f !== file) console.log("[cloud] save.json missing or unreadable, using", f);
        return { status: "ok", data, from: f };
      }
      lastError = "corrupt";
      console.log("[cloud] corrupt save ignored =>", f);
    } catch (e) {
      lastError = e?.code || e?.message || String(e);
      console.log("[cloud] read failed =>", f, e?.message || e);
    }
  }
  if (!sawFile) return { status: "none", data: null, from: null };
  return { status: "error", data: null, from: null, reason: lastError || "unreadable" };
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
    const result = readSaveForGame(file);
    if (result.status === "error") {
      console.log("[cloud] load: save exists but could not be read =>", file, result.reason);
      return { ok: false, data: null, file, reason: result.reason };
    }
    if (!result.data) {
      console.log("[cloud] load: no save =>", file);
      return { ok: true, data: null, file };
    }
    console.log("[cloud] load OK =>", result.from, "| bytes =", Buffer.byteLength(result.data, "utf8"));
    return { ok: true, data: result.data, file: result.from };
  } catch (e) {
    console.log("[cloud] load failed:", e?.message || e);
    return { ok: false, data: null, reason: e?.message || String(e) };
  }
});

// The save could not be read and the player chose to go on: move the unreadable files into
// backups/unreadable-<time>/ (never delete them), so the next load starts from the local copy or fresh.
ipcMain.handle("df:quarantine-save", async (_event, payloadInput) => {
  try {
    const fileName =
      payloadInput && typeof payloadInput === "object" && !Array.isArray(payloadInput)
        ? payloadInput.fileName
        : undefined;
    const { dir, file } = getAutoCloudSavePath(fileName);
    const target = path.join(dir, BACKUP_DIR_NAME, `unreadable-${backupStamp()}`);
    fs.mkdirSync(target, { recursive: true });
    for (const f of [file, `${file}.bak`]) {
      if (!fs.existsSync(f)) continue;
      try {
        fs.renameSync(f, path.join(target, path.basename(f)));
      } catch {
        fs.copyFileSync(f, path.join(target, path.basename(f)));
        fs.unlinkSync(f);
      }
    }
    console.log("[cloud] unreadable save moved to", target);
    return { ok: true, folder: target };
  } catch (e) {
    console.log("[cloud] quarantine failed:", e?.message || e);
    return { ok: false, reason: e?.message || String(e) };
  }
});

ipcMain.handle("df:open-save-folder", async () => {
  try {
    const { dir } = getAutoCloudSavePath();
    fs.mkdirSync(dir, { recursive: true });
    const error = await shell.openPath(dir);
    return { ok: !error, reason: error || undefined };
  } catch (e) {
    return { ok: false, reason: e?.message || String(e) };
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
  registerAppProtocol();
  await migrateLegacyLocalStorage();
  await createWindow();
});

app.on("will-quit", () => {
  try {
    globalShortcut.unregisterAll();
  } catch {}
});

app.on("window-all-closed", () => {
  if (!mainWindow) return; // only the hidden legacy-storage window closed during startup
  if (process.platform !== "darwin") app.quit();
});
