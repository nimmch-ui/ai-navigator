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
- **Weather & Alerts:** Integrates weather awareness with origin/destination forecasts, severe weather alerts via OpenWeatherMap, and a RainViewer API for live radar overlay. Speed camera radar system with visual alerts and configurable display.
- **Voice Guidance:** Web Speech API (SpeechSynthesis) provides turn-by-turn instructions and camera warnings. Hazard throttling prevents repetitive announcements.
- **Performance:** Employs debouncing for API requests (geocoding, routing) with AbortController, `React.memo` for component optimization, and lazy loading for faster initial renders. Map performance is optimized with pre-warmed styles and throttled camera updates.
- **Offline Prefetch:** Allows downloading map regions for offline navigation using a Service Worker for caching Mapbox styles, sprites, fonts, and vector tiles. Includes interactive area selection and quota enforcement.
- **Progressive Web App (PWA):** Full PWA functionality with `manifest.json`, app icons (192x192, 512x512), service worker registration, and update notifications. Users can install the app on their home screen for a native-like experience. Service worker provides offline support and handles app updates with user-controlled update flow (SKIP_WAITING message).
- **Car Mode UI:** Dedicated simplified interface for in-vehicle use with larger touch targets (minimum 48px), higher contrast colors, and essential-only navigation elements. Hides non-essential UI (AI chat panel, favorites, trip history) to reduce driver distraction. Activated via toggle button in header or URL parameter (?mode=car). State persisted in localStorage.
- **Community Reporting:** Lightweight Waze-style reporting system allowing users to report fixed cameras, mobile cameras, accidents, roadwork, and hazards. Features include: 2-minute cooldown between reports to prevent spam, voting system (confirm/not-there) with duplicate vote prevention, trust score calculation based on confirmation ratio, filtering by minimum trust score (0%, 40%, 70%+), in-memory storage with abstracted interface for future database migration, and real-time report display with auto-refresh every 30 seconds. Report UI includes sheet-based submission form and interactive map markers with voting overlay.
- **3D Lane Rendering:** Premium lane-level guidance system displaying elevated 3D lane ribbons above road surface during navigation. Uses Mapbox GL fill-extrusion layers with color-coded visualization (blue for recommended lanes, gray for allowed lanes). Lanes fade in at 300m before maneuvers and fade out 50m after, elevated ~0.75m above road surface. Implemented via dedicated `lane3d.ts` geometry builder service with configurable constants (width: 3.5m, length: 80m), integrated with MapboxMap component using typed cache (Map<string, LaneMesh>) for performance. Lane data extracted from route steps via `getLaneDataForRoute()` with abstracted interface ready for real-time lane API integration. Current implementation uses mock data with realistic patterns for turns, straights, and U-turns.
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