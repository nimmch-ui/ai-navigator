# AI Navigator

## Overview
AI Navigator is a map-first, AI-assisted Progressive Web App (PWA) designed to revolutionize personal navigation. It provides an interactive mapping experience powered by ChatGPT-style AI for intelligent route planning, location discovery, and navigation. The application integrates advanced AI with rich mapping functionalities to deliver an immersive and efficient navigation experience. Key capabilities include multimodal navigation (2D, 3D, Cinematic, AR, VR, Eco), real-time rerouting, lane-level guidance, AR previews, speed camera alerts, voice navigation, premium 3D maps, offline downloads, and a dedicated Car Mode UI.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with React 18, TypeScript, and Vite. It uses Wouter for routing, shadcn/ui, Radix UI, and Tailwind CSS for the UI. State management relies on TanStack Query and React hooks. Map integration is handled by Mapbox GL JS, providing interactive 3D maps with custom markers and GeoJSON overlays, featuring a full-viewport map and responsive UI panels.

### Backend
The backend uses Express.js for HTTP services and API routing. During development, it integrates with Vite middleware. Data storage is currently in-memory but is designed to use Drizzle ORM for future PostgreSQL integration, with Zod for validation.

### Design System
The design system features the Inter font, a hierarchical sizing scale, an 8-pixel base grid, and HSL-based color tokens for both light and dark modes. Accessibility is ensured through consistent hover/active states and focus-visible rings. Icons are sourced from Lucide React.

### Core Features
- **Multimodal Navigation:** Supports CLASSIC, 3D, CINEMATIC, AR, VR, and ECO UI modes, with intelligent fallback based on device capabilities.
- **Mapping & Visualization:** Mapbox GL JS provides premium 3D maps, terrain, sky, buildings, automatic day/night switching, 2D/3D toggling, 3D lane rendering, and AI-assisted camera control.
- **Augmented Reality (AR):** An AR Preview mode utilizes `getUserMedia` and `DeviceOrientation` to overlay navigation data onto a live camera feed.
- **Voice Guidance & Haptics:** Leverages the Web Speech API for turn-by-turn instructions with emotion-adaptive voice styles and a `useHaptics` hook for tactile feedback and spatial audio via `AudioBus`.
- **Real-time Data & Alerts:** Integrates OpenWeatherMap, RainViewer API, and a speed camera radar system, centralizing navigation data in `SharedNavigationState`.
- **Performance & Offline:** Optimizations include debouncing, AbortController, React.memo, lazy loading, optimized map rendering, and PWA functionality with `manifest.json` and a Service Worker for offline map region downloads.
- **User Interaction:** Features an interactive `ModeSwitcher` UI, keyboard shortcuts, and gesture navigation. User preferences are persisted via `localStorage` using `PreferencesService`.
- **Telemetry & Deep Links:** Includes production-ready analytics and supports URL-based deep links.
- **Global Availability & Localization:** Configured for global deployment across multiple regions with automatic geolocation, regional infrastructure, and high-latency region optimization. It supports 14 languages with automatic locale detection, unit conversion, RTL support, and a custom i18n implementation.
- **Regional Data Provider Layer:** Implements a robust, region-aware data provider system with automatic failover, health monitoring, and caching for Maps, Traffic Flow, Speed Cameras, Weather Forecasts, and Weather Radar across 6 global regions. Includes `OfflineModeService`, `RouteCache`, `TileCache`, and `TTSCacheService`.
- **User Data Store & Cloud Sync:** Centralized IndexedDB-based storage for user data with async CRUD operations, automatic migration, and event-driven updates. Features a production-ready cloud sync layer with a clean backend abstraction, enabling multi-device convergence with identity reconciliation and conflict resolution.
- **Predictive AI Navigation Engine:** A real-time predictive risk forecasting system that analyzes map geometry, speed, hazards, weather, and driver behavior to provide adaptive voice warnings. It includes a risk scoring model for overspeed, sharp turn, collision proximity, late braking, and lane deviation, utilizing physics-based calculations and weather-adjusted risk multipliers.

## External Dependencies

- **UI & Component Libraries:** @radix-ui/*, lucide-react, class-variance-authority, cmdk
- **Mapping:** Mapbox GL JS, Mapbox Streets styles, Mapbox Geocoding API, Mapbox Directions API, MapTiler Tiles
- **Weather:** OpenWeatherMap API, RainViewer API, Open-Meteo.com (MeteoFuse)
- **Browser APIs:** Web Speech API (SpeechSynthesis), Service Worker API, Web App Manifest, getUserMedia API, WebXR Device API, DeviceOrientation API, Page Visibility API
- **Form Management:** react-hook-form, @hookform/resolvers, Zod
- **Database & ORM:** Drizzle ORM, @neondatabase/serverless, drizzle-zod
- **Utilities:** date-fns, nanoid, clsx + tailwind-merge, idb-keyval (IndexedDB caching)
- **Regional Data Providers:** HERE Traffic, TomTom Traffic, ipapi.co (Geolocation)