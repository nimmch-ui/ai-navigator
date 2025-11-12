# AI Navigator

## Overview

AI Navigator is a map-first navigation application offering an AI-assisted, interactive mapping experience similar to Google Maps or Apple Maps. It integrates ChatGPT-style AI for intelligent route planning, location discovery, and navigation guidance, providing a clean interface for users. The application is a Progressive Web App (PWA) that can be installed on mobile devices, tablets, and desktops. It supports multimodal navigation, smart search, real-time rerouting, lane-level guidance, AR preview mode, speed camera alerts, real-time speed limits, weather awareness, voice navigation, premium 3D maps with day/night modes, offline map downloads, and a dedicated Car Mode UI for simplified in-vehicle navigation. Its core ambition is to blend advanced AI with a rich mapping experience to redefine personal navigation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

The frontend uses React 18 with TypeScript, Vite for bundling, and Wouter for routing. UI components are built with shadcn/ui, Radix UI primitives, and styled with Tailwind CSS, utilizing CSS variables for theming. State management is handled by TanStack Query for server state and React hooks for local state. Map integration is powered by Mapbox GL JS for interactive 3D maps, including buildings, smooth animations, custom markers, and GeoJSON overlays. Key layout patterns include a full-viewport map with overlaid UI panels, responsive design (desktop sidebar, mobile bottom sheet), and fixed controls.

### Backend

The backend utilizes Express.js for HTTP server and API routing. It integrates with Vite middleware for development, supporting hot reload. Data storage is currently an in-memory solution (MemStorage) with an abstracted interface for future database migration. Drizzle ORM is configured for PostgreSQL with Zod validation, though not actively connected.

### Design System

The design system employs the Inter font family, a hierarchical sizing scale, and an 8-pixel base grid system with Tailwind spacing units. Colors are HSL-based tokens with semantic naming for light/dark mode. Interactive elements feature consistent hover/active states and focus-visible rings for accessibility. Icons are sourced from Lucide React.

### Core Features & Technical Implementations

- **Navigation:** Multimodal support, smart search with route preferences, real-time rerouting based on GPS deviation, traffic incidents, and ETA changes. Lane-Level Guidance provides visual indicators.
- **Mapping:** Mapbox GL JS delivers premium 3D maps with terrain, sky, buildings, and automatic day/night style switching based on local time. Supports 2D/3D toggling and cinematic camera follow mode. Favorites use Mapbox Geocoding.
- **AR Preview Mode:** Uses `getUserMedia` for camera access and `WebXR`/`DeviceOrientation` APIs for sensor fusion, overlaying navigation data onto the live camera feed.
- **AR Mode (Full Implementation):** Production-ready augmented reality navigation overlay activated via UiMode.AR. Features live camera feed with canvas-based AR overlays including: speed badge with limit display, next maneuver arrow with distance countdown, and radar icons for speed cameras with distance indicators. Implements comprehensive safety system with automatic dash-mount warning at speeds >30 km/h and UI simplification at high speeds. Utilizes multi-tier fallback hierarchy: full AR (WebXR + camera + orientation) → pseudo-AR (camera + DeviceOrientation) → 3D mode (graceful degradation). Camera permission handling includes user-friendly error messages and automatic fallback on denial. Browser compatibility: Chrome/Edge (full AR), Safari iOS (pseudo-AR), Firefox (pseudo-AR). Mobile requirements: HTTPS required for camera access, rear camera preferred, gyroscope/accelerometer for orientation. Performance optimizations include Page Visibility API integration (pauses rendering when hidden), projection smoothing with low-pass filter to prevent jitter, and RAF-based rendering loop. Projection engine uses Haversine formula for distance calculation, bearing-based visibility detection (±90° camera FOV), and GPS-to-screen coordinate transformation. Safety features: handheld use discouraged via persistent warning overlay, automatic mode exit on camera failure, and simplified UI at high speeds. All AR features implemented in: `useARCapabilities.ts` (capability detection), `ProjectToScreen.ts` (GPS projection service), `ARView.tsx` (camera + canvas overlay component), integrated into `Home.tsx` with conditional rendering and UiMode state machine.
- **Weather & Alerts:** Integrates weather awareness with origin/destination forecasts, severe weather alerts via OpenWeatherMap, and a RainViewer API for live radar overlay. Speed camera radar system with visual alerts and configurable display.
- **Voice Guidance:** Web Speech API (SpeechSynthesis) provides turn-by-turn instructions and camera warnings. Hazard throttling prevents repetitive announcements.
- **Performance:** Employs debouncing for API requests (geocoding, routing) with AbortController, `React.memo` for component optimization, and lazy loading for faster initial renders. Map performance is optimized with pre-warmed styles and throttled camera updates.
- **Offline Prefetch:** Allows downloading map regions for offline navigation using a Service Worker for caching Mapbox styles, sprites, fonts, and vector tiles. Includes interactive area selection and quota enforcement.
- **Progressive Web App (PWA):** Full PWA functionality with `manifest.json`, app icons (192x192, 512x512), service worker registration, and update notifications. Users can install the app on their home screen for a native-like experience. Service worker provides offline support and handles app updates with user-controlled update flow (SKIP_WAITING message).
- **Car Mode UI:** Dedicated simplified interface for in-vehicle use with larger touch targets (minimum 48px), higher contrast colors, and essential-only navigation elements. Hides non-essential UI (AI chat panel, favorites, trip history) to reduce driver distraction. Activated via toggle button in header or URL parameter (?mode=car). State persisted in localStorage.
- **Community Reporting:** Lightweight Waze-style reporting system allowing users to report fixed cameras, mobile cameras, accidents, roadwork, and hazards. Features include: 2-minute cooldown between reports to prevent spam, voting system (confirm/not-there) with duplicate vote prevention, trust score calculation based on confirmation ratio, filtering by minimum trust score (0%, 40%, 70%+), in-memory storage with abstracted interface for future database migration, and real-time report display with auto-refresh every 30 seconds. Report UI includes sheet-based submission form and interactive map markers with voting overlay.
- **3D Lane Rendering:** Premium lane-level guidance system displaying elevated 3D lane ribbons above road surface during navigation. Uses Mapbox GL fill-extrusion layers with color-coded visualization (blue for recommended lanes, gray for allowed lanes). Lanes fade in at 300m before maneuvers and fade out 50m after, elevated ~0.75m above road surface. Implemented via dedicated `lane3d.ts` geometry builder service with configurable constants (width: 3.5m, length: 80m), integrated with MapboxMap component using typed cache (Map<string, LaneMesh>) for performance. Lane data extracted from route steps via `getLaneDataForRoute()` with abstracted interface ready for real-time lane API integration. Current implementation uses mock data with realistic patterns for turns, straights, and U-turns.
- **AI-Assisted Camera Control:** Intelligent camera state machine with 5 states (cruising, approaching_turn, in_turn, searching_target, overview) providing context-aware camera movements during navigation. Features AI heuristics that adjust camera parameters based on turn density, vehicle speed, and weather conditions. Smooth animations via requestAnimationFrame with clamped per-frame deltas prevent motion sickness. Implemented in `cameraAI.ts` service with integration into MapboxMap component. Camera slices route geometry from current position for accurate bearing calculations. Cruising mode provides stable bearing lock with pitch 55-60° and zoom 15 (city) / 13 (highway). Approaching turn mode pre-rotates bearing and increases pitch. In-turn mode tightens zoom and bearing updates. Dense turns (<150m apart) trigger higher zoom and earlier pre-rotation. Traffic (<8 km/h) reduces pitch for legibility. Severe weather reduces pitch/zoom and slows bearing changes. Cinematic mode toggle persists via PreferencesService.
- **Realism Pack:** Optional visual/audio enhancements providing cinematic polish. Weather Lighting dynamically adjusts map style (contrast, saturation, road glow) based on real-time weather conditions and time of day with automatic night mode enhancements. Motion Polish delivers speed-aware route breathing glow and motion blur emulation during camera pans using 60fps requestAnimationFrame. Radar Pulse animates camera icons with 2-3 pulse cycles when within 300m, then steady state to prevent motion sickness, with voice announcement cooldown. All three features are individually toggleable in Settings and persist via PreferencesService in the `realismPack` object.
- **WebGL Error Handling:** Robust terrain initialization with graceful fallback for devices with limited WebGL support. All terrain/sky setup functions in `visual3d.ts` return `{ success: boolean, deferred: boolean }` to distinguish between style-not-loaded deferrals and true failures. Uses `map.once('style.load')` to automatically retry 3D setup after style changes. Implements try/catch blocks around all Mapbox terrain, sky layer, and 3D buildings operations with non-blocking console warnings. Toast notifications appear only for confirmed failures (not deferrals) with message "3D mode limited on this device". 2D/3D toggle remains functional at all times, ensuring app works on all devices regardless of WebGL capabilities.
- **Immersive Experience Foundation:** "Tesla+Apple+Waze+GPT" multi-sensory architecture built on typed event-driven patterns. UiMode enum supports 6 modes (CLASSIC, THREED, CINEMATIC, AR, VR, ECO) with immersion level calculation (0-6 scale). UiModeContext React provider serves as single source of truth, using debounced localStorage writes (300ms) to prevent thrashing while emitting dual events (uiMode:changed, immersion:levelChanged) on every change. EventBus singleton provides type-safe pub/sub with EventPayloadMap for memory leak prevention. EmotionEngine singleton scaffolds future AI integration with setDriverState(), applyToTTS(), and applyToAudio() APIs. All six feature modules (Radar, Hazard, Speed, Weather, Voice, Eco) subscribe to EventBus using start/stop lifecycle pattern, logging mode adaptations to console. Settings UI features dedicated "Immersive Experience" section with mode selector and audio toggles (Spatial Audio, Ambient Music). PreferencesService extended with schemaVersion (v1) for future migrations. Immersive settings persist across sessions and verified via automated end-to-end tests.
- **State Persistence:** User preferences are persisted via `PreferencesService` using `localStorage`.

## External Dependencies

### UI & Component Libraries

- **@radix-ui/*:** Accessible primitives
- **lucide-react:** Iconography
- **class-variance-authority:** Component variants
- **cmdk:** Command palette

### Mapping

- **Mapbox GL JS:** 3D interactive maps
- **Mapbox Streets styles:** Day/night map styles
- **Mapbox Geocoding API:** Address-to-coordinate conversion
- **Mapbox Directions API:** Routing services

### Weather

- **OpenWeatherMap API:** Weather forecasts and alerts
- **RainViewer API:** Live weather radar overlay

### Browser APIs

- **Web Speech API (SpeechSynthesis):** Voice guidance
- **Service Worker API:** PWA offline caching, update notifications
- **Web App Manifest:** PWA installation and configuration
- **getUserMedia API:** Camera access for AR mode with rear camera preference
- **WebXR Device API:** Full AR capabilities with position tracking and sensor fusion
- **DeviceOrientation API:** Gyroscope/accelerometer data for pseudo-AR mode fallback
- **Page Visibility API:** AR rendering pause when app is hidden to save battery

### Form Management

- **react-hook-form:** Form handling
- **@hookform/resolvers:** Resolver for form validation
- **Zod:** Schema validation

### Database & ORM (Configured, not actively connected)

- **Drizzle ORM:** ORM for PostgreSQL
- **@neondatabase/serverless:** Serverless database connector
- **drizzle-zod:** Zod integration for Drizzle

### Utilities

- **date-fns:** Date manipulation
- **nanoid:** Unique ID generation
- **clsx + tailwind-merge:** CSS class utilities

### Development Tools

- **@replit/vite-plugin-*: Reple.it specific Vite plugins
- **tsx:** TypeScript execution
- **esbuild:** Bundling and minification