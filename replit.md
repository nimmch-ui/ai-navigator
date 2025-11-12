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