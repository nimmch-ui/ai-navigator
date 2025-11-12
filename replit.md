# AI Navigator

## Overview

AI Navigator is a map-first, AI-assisted Progressive Web App (PWA) designed to redefine personal navigation. It offers an interactive mapping experience with ChatGPT-style intelligence, providing smart route planning, location discovery, and navigation guidance. Key capabilities include multimodal navigation (2D, 3D, Cinematic, AR, VR, Eco), real-time rerouting, lane-level guidance, AR preview, speed camera alerts, voice navigation, premium 3D maps, offline downloads, and a dedicated Car Mode UI. The project aims to blend advanced AI with rich mapping features to create an immersive and efficient navigation experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend uses React 18, TypeScript, Vite, and Wouter for routing. UI components are built with shadcn/ui, Radix UI primitives, and styled with Tailwind CSS. State management employs TanStack Query for server state and React hooks for local state. Map integration is handled by Mapbox GL JS, providing interactive 3D maps with custom markers and GeoJSON overlays, featuring a full-viewport map with responsive overlaid UI panels.

### Backend
The backend utilizes Express.js for HTTP services and API routing, integrated with Vite middleware for development. Data storage is currently an in-memory solution (MemStorage) with an abstracted interface, and Drizzle ORM is configured for future PostgreSQL integration with Zod validation.

### Design System
The design system incorporates the Inter font, a hierarchical sizing scale, an 8-pixel base grid, and HSL-based color tokens for light/dark mode. Accessibility features include consistent hover/active states and focus-visible rings. Icons are sourced from Lucide React.

### Core Features & Technical Implementations
- **Multimodal Navigation:** Supports 6 distinct UI modes (CLASSIC, 3D, CINEMATIC, AR, VR, ECO) with intelligent fallback logic based on device capabilities (e.g., VR → AR → 3D → Classic). Each mode has specific visual settings, audio characteristics, and use cases, with seamless transitions managed by a `ModeManager` service.
- **Mapping & Visualization:** Mapbox GL JS powers premium 3D maps with terrain, sky, buildings, automatic day/night switching, and 2D/3D toggling. Includes 3D lane rendering using fill-extrusion layers and AI-assisted camera control that dynamically adjusts camera parameters based on navigation context.
- **Augmented Reality (AR):** AR Preview mode uses `getUserMedia` and `DeviceOrientation` for overlaying navigation data onto a live camera feed. A full AR implementation provides canvas-based overlays for speed, maneuvers, and radar, with safety systems and a multi-tier fallback.
- **Voice Guidance & Haptics:** Utilizes Web Speech API for turn-by-turn instructions and warnings, with emotion-adaptive voice styles (e.g., "warm" voice in Cinematic mode) managed by `EmotionEngine`. Features a `useHaptics` hook for tactile feedback and an `AudioBus` service for spatial audio.
- **Real-time Data & Alerts:** Integrates OpenWeatherMap for forecasts and severe alerts, RainViewer API for live radar, and a speed camera radar system with visual and voice alerts. Navigation data is centralized in a `SharedNavigationState` service.
- **Performance & Offline:** Implements debouncing, AbortController, React.memo, lazy loading, and optimized map rendering. PWA functionality with `manifest.json` and a Service Worker enables offline map region downloads and app updates.
- **User Interaction:** Features an interactive `ModeSwitcher` UI (desktop/mobile), keyboard shortcuts (1-6, C/A/E), and gesture navigation (long-press map to toggle 2D/3D). User preferences are persisted via `localStorage` using `PreferencesService`.
- **Telemetry & Deep Links:** Includes a production-ready analytics service tracking 8 event types (e.g., `mode_selected`, `mode_fallback`) for observability. Supports URL-based deep links for shareable navigation with query parameters and hash routes, handled by a `DeepLinksService`.

## External Dependencies

### UI & Component Libraries
- @radix-ui/*
- lucide-react
- class-variance-authority
- cmdk

### Mapping
- Mapbox GL JS
- Mapbox Streets styles
- Mapbox Geocoding API
- Mapbox Directions API

### Weather
- OpenWeatherMap API
- RainViewer API

### Browser APIs
- Web Speech API (SpeechSynthesis)
- Service Worker API
- Web App Manifest
- getUserMedia API
- WebXR Device API
- DeviceOrientation API
- Page Visibility API

### Form Management
- react-hook-form
- @hookform/resolvers
- Zod

### Database & ORM
- Drizzle ORM
- @neondatabase/serverless
- drizzle-zod

### Utilities
- date-fns
- nanoid
- clsx + tailwind-merge

## Production Readiness

### Q2-A6: QA, Docs & Finalization (Completed)
All features are production-ready and comprehensively tested:

**Service Worker Configuration:**
- Fixed critical MIME type issue: Service worker now correctly served as `application/javascript` instead of `text/html`
- Development mode: Explicit route in `server/index.ts` serves from `client/public/sw.js` before Vite catch-all
- Production mode: Express static middleware serves from `dist/public/sw.js` (built artifacts)
- All PWA assets (sw.js, manifest.json, icons) relocated to `client/public/` for proper Vite build process

**Comprehensive Testing:**
- E2E tests verified: Service worker registration, PWA manifest validation, mode switching, mode persistence
- All 6 navigation modes operational with intelligent fallback logic (VR→AR→3D→CLASSIC)
- Cross-mode data persistence confirmed: radars, speed, voice, eco data remain consistent
- Mode selection persists across page reloads via localStorage

**Documentation:**
- Complete modes overview with detailed descriptions, camera settings, and use cases
- Fallback chain diagram and troubleshooting guide for common issues
- External dependencies and browser API requirements documented

### Deployment Notes
- Service worker uses proper Content-Type headers and Service-Worker-Allowed: / scope
- PWA install/update flow tested and functional
- Analytics tracking operational for all mode transitions and user interactions
- Deep links support shareable navigation URLs with query parameters

## Global Launch Configuration

### Q3-A1: Worldwide Availability (Completed)
The app is now configured for global deployment with region-aware routing and intelligent fallback mechanisms:

**Supported Regions:**
- EU (Europe) - Default region
- US (North America)
- ASIA (Asia-Pacific)
- MENA (Middle East & North Africa)
- AFRICA (Sub-Saharan Africa)
- LATAM (Latin America)

**Regional Infrastructure:**
- Automatic geolocation detection using ipapi.co with 24-hour cache
- Continent-to-region mapping for optimal server selection
- Health check monitoring with 5-minute intervals
- Automatic failover to EU region if primary region is unavailable

**High-Latency Region Optimization:**
- Identified regions: ASIA, LATAM, AFRICA
- Extended cache duration (15 minutes vs 5 minutes for low-latency regions)
- Async caching layer for radar, route, and weather data
- Retry logic with automatic fallback on request failures

**User Experience:**
- Transparent fallback notification banner when using non-primary region
- Language detection from browser settings (defaults to English)
- Timezone detection for localized time displays
- Regional preferences stored in localStorage with 24-hour refresh

**Technical Implementation:**
- `global.config.ts`: Central configuration for all regions and settings
- `geolocationService`: Detects user location and maps to optimal region
- `regionRouter`: Manages regional endpoints and health checks
- `RegionalCache`: Provides adaptive caching based on region latency
- Health check endpoint: `/api/health` for monitoring regional server status

**Cross-Region Data Sync:**
- Real-time radar and route data updates work globally
- Cache invalidation strategies for stale data prevention
- Fallback to stale cache when network requests fail
- Pending request deduplication to prevent redundant API calls

## Localization Engine (i18n)

### Q3-A2: Full Localization Support (Completed)
The app now supports 14 languages with automatic locale detection, unit conversion, and RTL support:

**Supported Languages:**
- English (en) - Default
- Albanian (sq-AL) - Including Kosovo users 🇦🇱
- Serbian (sr) - Cyrillic script
- Slovenian (sl-SI)
- German (Switzerland) (de-CH)
- French (Switzerland) (fr-CH)
- Italian (Switzerland) (it-CH)
- Turkish (tr)
- Spanish (es) - LATAM default
- Portuguese (Brazil) (pt-BR)
- Hindi (hi)
- Bengali (bn)
- Arabic (ar) - RTL support
- Chinese Simplified (zh-CN)

**Locale Detection:**
- Browser language auto-detection with normalization
- Region-based fallback (MENA → Arabic, LATAM → Spanish, etc.)
- LocalStorage persistence for user preference
- Fallback chain: userLocale → region default → English

**Translation System:**
- Lightweight custom i18n implementation (no external dependencies)
- JSON-based language packs in `client/src/services/i18n/locales/`
- 33 translation keys covering all UI elements:
  - App: title, subtitle
  - Navigation: start, end, recenter, follow
  - Speed: limit, current, average
  - Alerts: camera_ahead, hazard, slowdown, speeding
  - Weather: rain, snow, clear
  - Eco: saving, route, score
  - Modes: classic, 3d, cinematic, ar, vr, eco
  - Settings: language, units, theme
  - Voice: style, muted, enabled

**Unit System:**
- Automatic metric/imperial based on locale
- Imperial: United States (English)
- Metric: All other regions
- Speed conversion: km/h ↔ mph
- Distance conversion: meters/km ↔ feet/miles

**RTL Support:**
- Automatic direction detection for Arabic
- Document dir attribute automatically set
- Layout adapts for right-to-left languages

**React Integration:**
- `useTranslation()` hook for components
- Real-time locale switching without page reload
- Unit formatting functions: `formatSpeed()`, `formatDistance()`
- Available locales list with native names

**Technical Implementation:**
- `i18n` service: Core translation engine
- Dynamic import of language packs (code splitting)
- Custom event system for locale changes
- TypeScript-first with strongly typed keys
- Zero external i18n library dependencies