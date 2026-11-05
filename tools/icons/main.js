// Renders the v1.03 Steam achievement icons. Run: electron tools/icons/main.js <outDir>
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
app.disableHardwareAcceleration();
app.whenReady().then(() => {
  const win = new BrowserWindow({
    show: false, width: 1200, height: 900,
    webPreferences: { nodeIntegration: true, contextIsolation: false, webSecurity: false },
  });
  ipcMain.on('done', (_e, msg) => { console.log(msg); app.quit(); });
  win.webContents.on('console-message', (_e, _l, m) => console.log('[page]', m));
  win.loadFile(path.join(__dirname, 'icons.html'), { query: { out: process.argv[process.argv.length - 1] } });
});
