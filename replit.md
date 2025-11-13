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

### Core Features
- **Multimodal Navigation:** Supports 6 distinct UI modes (CLASSIC, 3D, CINEMATIC, AR, VR, ECO) with intelligent fallback based on device capabilities, enabling seamless transitions.
- **Mapping & Visualization:** Mapbox GL JS powers premium 3D maps with terrain, sky, buildings, automatic day/night switching, and 2D/3D toggling, including 3D lane rendering and AI-assisted camera control.
- **Augmented Reality (AR):** AR Preview mode uses `getUserMedia` and `DeviceOrientation` for overlaying navigation data onto a live camera feed, with a full AR implementation providing canvas-based overlays.
- **Voice Guidance & Haptics:** Utilizes Web Speech API for turn-by-turn instructions with emotion-adaptive voice styles and a `useHaptics` hook for tactile feedback and spatial audio via `AudioBus`.
- **Real-time Data & Alerts:** Integrates OpenWeatherMap, RainViewer API, and a speed camera radar system for real-time data and alerts, centralizing navigation data in `SharedNavigationState`.
- **Performance & Offline:** Employs debouncing, AbortController, React.memo, lazy loading, and optimized map rendering. PWA functionality with `manifest.json` and a Service Worker enables offline map region downloads.
- **User Interaction:** Features an interactive `ModeSwitcher` UI, keyboard shortcuts, and gesture navigation. User preferences are persisted via `localStorage` using `PreferencesService`.
- **Telemetry & Deep Links:** Includes a production-ready analytics service for observability and supports URL-based deep links for shareable navigation.
- **Global Availability:** Configured for global deployment across EU, US, ASIA, MENA, AFRICA, LATAM regions with automatic geolocation, regional infrastructure, and high-latency region optimization.
- **Localization:** Supports 14 languages with automatic locale detection, unit conversion (metric/imperial), RTL support for Arabic, and a custom, lightweight i18n implementation.
- **Regional Data Provider Layer:** Implements a robust, region-aware data provider system with automatic failover for Maps, Traffic, Radar, and Weather services across 6 global regions (EU, CH, US, IN, ME, GLOBAL).

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
- Open-Meteo.com (MeteoFuse)

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

### Regional Data Providers
- MapTiler Tiles
- HERE Traffic
- TomTom Traffic
- ipapi.co (Geolocation)