# DataFall

## Overview

DataFall is a cyberpunk-themed idle/clicker tycoon game. Players build and manage their cyberpunk industrial empire by collecting resources (data, silicon, credits, crypto), purchasing upgrades, and progressing through a prestige system. The game features a dark neon aesthetic with cyan, magenta, and amber color schemes, utilizing the Rajdhani and Inter font families for a futuristic look.

**Version:** 1.0.0  
**Platforms:** Web Browser, Steam (Windows/Mac/Linux via Electron)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18+ with TypeScript for the UI layer
- Vite as the build tool and development server with HMR (Hot Module Replacement)
- Wouter for lightweight client-side routing
- Custom Vite plugins for meta image handling and Replit-specific integrations

**UI Component System**
- shadcn/ui components (Radix UI primitives) configured in "new-york" style
- Tailwind CSS v4 with custom cyberpunk color palette and design tokens
- Custom CSS animations via tw-animate-css
- Framer Motion for advanced animations and transitions

**State Management**
- TanStack Query (React Query) for server state management
- Local React hooks for game state (useGame custom hook)
- Game state persisted in localStorage (browser) or Steam Cloud (desktop)

**Game Architecture**
- Incremental game loop with per-second resource generation
- Resource system: credits, data, silicon, interest, crypto, prestige
- Upgrade system with base costs, multipliers, and bulk purchasing (1x, 10x, 100x, 1000x, MAX)
- Critical hit mechanics with floating pickups (auto-spawn every 30-120 seconds)
- Prestige/ascension system with logarithmic conversion
- 10 prestige upgrades with max level caps (15-50) and cost scaling
- 250+ achievements across 5 categories
- Contracts system with randomized objectives
- Boss encounters for active gameplay
- Cosmetics market with 200+ items

### Desktop Architecture (Steam Release)

**Electron Integration** (in `/electron` folder)
- Electron wrapper for Steam desktop deployment
- steamworks.js for Steam SDK integration
- Steam Cloud save synchronization
- Steam achievements (50+ mapped for initial release)
- Steam overlay support with forced refresh for UI-based games

**Build Process**
- Web build: `npm run build` → outputs to `dist/public`
- Steam build: Uses Electron packager with `--asar.unpackDir` for native modules
- Supports Windows, macOS, and Linux

**Steam Configuration**
- App ID: Currently using 480 (Spacewar test app) - replace before release
- Achievement mappings in `client/src/lib/steamIntegration.ts`
- Cloud save file: `datafall_save.json`

### Backend Architecture

**Server Framework**
- Express.js with TypeScript running on Node.js
- Development mode uses Vite middleware for SSR and HMR
- Production builds serve static assets from dist/public
- Custom logging middleware for request/response tracking

**Build Process**
- Client built with Vite to dist/public
- Server bundled with esbuild to dist/index.cjs
- Selective dependency bundling (allowlist approach) to reduce cold start times
- Shared code via @shared path alias

**Storage Layer**
- Browser: localStorage with save versioning
- Steam: Steam Cloud via steamworks.js with localStorage backup
- Automatic conflict resolution (uses newer save)

### External Dependencies

**UI Libraries**
- Radix UI primitives for accessible component foundations
- Lucide React for icon system
- cmdk for command palette functionality
- Embla Carousel for carousel components
- date-fns for date manipulation
- Framer Motion for animations

**Steam Integration**
- steamworks.js for Steam SDK access
- Electron for desktop wrapper
- electron-packager for build distribution

**Development Tools**
- Replit-specific plugins (@replit/vite-plugin-runtime-error-modal, cartographer, dev-banner)
- TypeScript with strict mode enabled
- ESNext module system with bundler resolution

**Type Safety**
- Zod for runtime validation
- React Hook Form with @hookform/resolvers for form validation

**Path Aliases**
- @/ → client/src
- @shared/ → shared
- @assets/ → attached_assets

### Key Files

- `client/src/lib/useGame.ts` - Main game logic hook (4600+ lines)
- `client/src/lib/steamIntegration.ts` - Steam SDK bridge
- `client/src/pages/Game.tsx` - Main game page component
- `client/src/components/game/` - Game UI components
- `electron/main.js` - Electron main process for Steam
- `electron/package.json` - Electron dependencies

### Design Decisions

- Monorepo structure with shared types between client and server
- Component-first architecture with shadcn/ui as the foundation
- Game state designed for offline-first play with Steam Cloud sync
- Prestige system enables long-term engagement and replayability
- Debug panel disabled in production (keyboard shortcut commented out)
- Audio memory leak fixed with proper event listener cleanup
- Accessibility: All dialogs have proper ARIA attributes

## Recent Changes (January 2026)

- Fixed audio memory leak in track-ended event listener
- Fixed Dialog accessibility warnings (aria-describedby)
- Added Electron wrapper for Steam desktop deployment
- Implemented steamworks.js integration for achievements
- Added Steam Cloud save/load with conflict resolution
- Created 50+ Steam achievement mappings
- Cosmetics market rebalanced (credits and ascension points only)
- Debug panel disabled for production builds
