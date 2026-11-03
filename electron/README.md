# DataFall - Steam Desktop Build

This folder contains the Electron wrapper for deploying DataFall to Steam.

## Prerequisites

1. **Node.js 18+** installed
2. **Steam client** running and logged in (for development testing)
3. **Steamworks Partner account** (for production release)

## Setup

```bash
cd electron
npm install
```

## Development

```bash
# Build the web client first
cd ..
npm run build

# Run Electron in development mode
cd electron
npm run start:dev
```

## Building for Distribution

### Windows
```bash
npm run build:win
```

### macOS
```bash
npm run build:mac
```

### Linux
```bash
npm run build:linux
```

Builds will output to `electron/dist/`.

## Steam Configuration

### App ID

The file `steam_appid.txt` contains the Steam App ID. Currently set to `480` (Spacewar test app).

**Before release, replace with your actual Steam App ID.**

### Achievements

Achievement mappings are defined in `client/src/lib/steamIntegration.ts`.

You must configure matching achievements in the Steamworks Partner dashboard:
- Achievement API Name must match the Steam ID in the mapping (e.g., `ACH_FIRST_CLICK`)
- Use the internal game achievement ID as reference

### Steam Cloud

Steam Cloud save is automatically handled via `steamworks.js`:
- Save file: `datafall_save.json`
- Automatically syncs with Steam's Remote Storage
- Falls back to localStorage if Steam is unavailable

Configure Steam Cloud in Steamworks Partner:
- Byte quota: 1048576 (1 MB recommended)
- File count quota: 10
- Root paths: Use `{64BitSteamID}/`

## Steam Overlay

The overlay is handled automatically. A forced refresh loop ensures the overlay updates correctly in UI-based games.

## Important Packaging Notes

1. **Always use** `--asar.unpackDir="node_modules/steamworks.js"` when packaging
2. **Test the packaged build** with Steam running before uploading to Steam
3. **Remove `steam_appid.txt`** when uploading to Steam (Steam provides the app ID)

## Files

- `main.js` - Electron main process with Steam integration
- `package.json` - Electron dependencies and build scripts
- `steam_appid.txt` - Steam App ID for development

## Troubleshooting

### "Steam not initialized"
- Ensure Steam client is running
- Verify you own/have access to the test app (480)
- Check `steam_appid.txt` is in the correct directory

### Overlay not appearing
- Enable Steam Overlay in Steam settings
- The overlay may take a moment to appear on first launch

### Achievement not unlocking
- Verify achievement ID matches Steamworks dashboard exactly
- Use Spacewar (480) for testing before your app ID is approved
