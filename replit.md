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