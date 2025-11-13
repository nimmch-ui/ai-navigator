# AI Navigator

## Overview

AI Navigator is a map-first, AI-assisted Progressive Web App (PWA) that redefines personal navigation. It offers an interactive mapping experience with ChatGPT-style intelligence for smart route planning, location discovery, and navigation guidance. Key features include multimodal navigation (2D, 3D, Cinematic, AR, VR, Eco), real-time rerouting, lane-level guidance, AR preview, speed camera alerts, voice navigation, premium 3D maps, offline downloads, and a dedicated Car Mode UI. The project aims to integrate advanced AI with rich mapping features for an immersive and efficient navigation experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend uses React 18, TypeScript, Vite, Wouter for routing, shadcn/ui, Radix UI, and Tailwind CSS. State management employs TanStack Query and React hooks. Map integration is powered by Mapbox GL JS for interactive 3D maps with custom markers and GeoJSON overlays, featuring a full-viewport map with responsive UI panels.

### Backend
The backend utilizes Express.js for HTTP services and API routing, integrated with Vite middleware for development. Data storage is currently in-memory but designed with Drizzle ORM for future PostgreSQL integration and Zod validation.

### Design System
The design system incorporates the Inter font, a hierarchical sizing scale, an 8-pixel base grid, and HSL-based color tokens for light/dark mode. Accessibility features include consistent hover/active states and focus-visible rings. Icons are from Lucide React.

### Core Features
- **Multimodal Navigation:** Supports 6 UI modes (CLASSIC, 3D, CINEMATIC, AR, VR, ECO) with intelligent fallback based on device capabilities.
- **Mapping & Visualization:** Mapbox GL JS provides premium 3D maps with terrain, sky, buildings, automatic day/night switching, 2D/3D toggling, 3D lane rendering, and AI-assisted camera control.
- **Augmented Reality (AR):** AR Preview mode uses `getUserMedia` and `DeviceOrientation` for overlaying navigation data onto a live camera feed.
- **Voice Guidance & Haptics:** Utilizes Web Speech API for turn-by-turn instructions with emotion-adaptive voice styles and a `useHaptics` hook for tactile feedback and spatial audio via `AudioBus`.
- **Real-time Data & Alerts:** Integrates OpenWeatherMap, RainViewer API, and a speed camera radar system, centralizing navigation data in `SharedNavigationState`.
- **Performance & Offline:** Employs debouncing, AbortController, React.memo, lazy loading, optimized map rendering, and PWA functionality with `manifest.json` and a Service Worker for offline map region downloads.
- **User Interaction:** Features an interactive `ModeSwitcher` UI, keyboard shortcuts, and gesture navigation. User preferences are persisted via `localStorage` using `PreferencesService`.
- **Telemetry & Deep Links:** Includes a production-ready analytics service and supports URL-based deep links.
- **Global Availability:** Configured for global deployment across EU, US, ASIA, MENA, AFRICA, LATAM regions with automatic geolocation, regional infrastructure, and high-latency region optimization.
- **Localization:** Supports 14 languages with automatic locale detection, unit conversion, RTL support, and a custom i18n implementation.
- **Regional Data Provider Layer:** Implements a robust, region-aware data provider system with automatic failover, health monitoring, and caching for Maps, Traffic Flow, Speed Cameras, Weather Forecasts, and Weather Radar across 6 global regions. Includes an `OfflineModeService` for network quality detection, `RouteCache` and `TileCache` for offline data storage, and `TTSCacheService` for monitoring voice guidance usage. User data is stored offline-first in IndexedDB with cloud-ready sync capabilities (currently simulated with `FakeSyncBackend`).

## External Dependencies

- **UI & Component Libraries:** @radix-ui/*, lucide-react, class-variance-authority, cmdk
- **Mapping:** Mapbox GL JS, Mapbox Streets styles, Mapbox Geocoding API, Mapbox Directions API, MapTiler Tiles
- **Weather:** OpenWeatherMap API, RainViewer API, Open-Meteo.com (MeteoFuse)
- **Browser APIs:** Web Speech API (SpeechSynthesis), Service Worker API, Web App Manifest, getUserMedia API, WebXR Device API, DeviceOrientation API, Page Visibility API
- **Form Management:** react-hook-form, @hookform/resolvers, Zod
- **Database & ORM:** Drizzle ORM, @neondatabase/serverless, drizzle-zod
- **Utilities:** date-fns, nanoid, clsx + tailwind-merge, idb-keyval (IndexedDB caching)
- **Regional Data Providers:** HERE Traffic, TomTom Traffic, ipapi.co (Geolocation)

## User Data Store & Cloud Sync (Q3-A5)

### Local User Data Store
Centralized IndexedDB-based storage for user data with async CRUD operations, automatic migration from legacy localStorage, and event-driven updates.

**Core Services:**
- `UserDataStore` (`client/src/services/data/UserDataStore.ts`): Singleton managing user profile, favorites, trip history with IndexedDB
- Async initialization with migration from legacy `TripHistoryService`
- EventBus integration for real-time updates (`favorites:*`, `trips:*`, `userdata:migrationCompleted`)
- Storage limits: 50 favorites (Map dedup), 100 trips (LRU eviction)

### Cloud Sync & Multi-Device Support
Production-ready cloud sync layer with clean backend abstraction, enabling multi-device convergence with identity reconciliation.

**Architecture:**
- `ISyncBackend` interface: loadUserData, saveUserData, clearUserData abstraction
- `FakeSyncBackend`: IndexedDB-based cloud simulation using 'cloud-sync' namespace
- `SyncService`: Singleton managing sync operations, queue, canonical identity, and offline integration
  - syncAll(): Full sync with 3-phase discovery, returns canonical userId
  - queueSync(): Offline operation queuing
  - setSyncEnabled(): Toggle with localStorage persistence

**Multi-Device Identity Reconciliation:**
- Each device generates anonymous userId on first init
- Canonical identity = earliest createdAt timestamp (first device wins)
- 3-Phase Discovery: Local ID → Persisted canonical → Backend canonical
- Automatic stale record cleanup (both local and remote)
- Works in any sync order (A→B or B→A converges to same identity)
- sync:identityChanged event for real-time UI updates

**Conflict Resolution:**
- Identity: Earliest createdAt wins
- Profile: Latest updatedAt wins
- Favorites: Latest lastUsedAt wins, Map-based deduplication
- Trips: Union by ID, sorted by timestamp
- Metadata: Version bumping, lastSyncedAt tracking

**Offline Integration:**
- Network status monitoring via EventBus
- Auto-queue when offline with connectivity checks
- Exponential backoff: 30s → 2min → 5min (max 3 retries)
- Auto-process queue on reconnection

**Settings UI:**
- Cloud Sync toggle with automatic first-time sync
- Sync Now button with loading states and metrics
- Clear Cloud Copy (local data preserved)
- Anonymous user ID display (first 8 chars)
- Real-time identity updates via EventBus subscription
- Comprehensive toast feedback

**EventBus Events:**
- sync:enabled/disabled, sync:completed, sync:failed
- sync:push_completed, sync:pull_completed, sync:cloud_cleared
- sync:identityChanged (previousUserId, canonicalUserId)

**Backend Swap Ready:**
To replace FakeSyncBackend with real backend (REST/GraphQL/Firebase):
1. Implement ISyncBackend interface
2. Update SyncService constructor
3. Configure auth/API keys
4. No changes needed to SyncService logic, UserDataStore, or UI

**Data Flow:**
1. User enables sync → syncAll() called
2. Export local data via exportData()
3. 3-phase discovery: local ID, persisted canonical, backend canonical
4. Load remote data if found
5. Merge with conflict resolution (earliest createdAt for identity)
6. Emit sync:identityChanged if identity switches
7. Save merged data to local (importData) and remote (saveUserData)
8. Update backend canonical key
9. Delete stale records (local and remote)
10. Return canonicalUserId to caller

**Security & Privacy:**
- Anonymous UUIDs (no PII)
- User-specific data keys
- Separate IndexedDB namespaces (local vs cloud simulation)
- Ready for encryption in production backend