# AI Navigator

## Overview

AI Navigator is a map-first, AI-assisted navigation Progressive Web App (PWA) offering an interactive mapping experience with ChatGPT-style intelligence. It provides smart route planning, location discovery, and navigation guidance, aiming to redefine personal navigation by blending advanced AI with rich mapping features. Key capabilities include multimodal navigation, real-time rerouting, lane-level guidance, AR preview, speed camera alerts, voice navigation, premium 3D maps, offline downloads, and a dedicated Car Mode UI.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with React 18, TypeScript, Vite, and Wouter for routing. UI components use shadcn/ui, Radix UI primitives, and Tailwind CSS for styling. State management relies on TanStack Query for server state and React hooks for local state. Map integration is handled by Mapbox GL JS, providing interactive 3D maps with custom markers and GeoJSON overlays. The design emphasizes a full-viewport map with responsive overlaid UI panels.

### Backend
The backend uses Express.js for HTTP services and API routing, integrated with Vite middleware for development. Data storage is currently an in-memory solution (MemStorage) with an abstracted interface, and Drizzle ORM is configured for PostgreSQL with Zod validation for future database integration.

### Design System
The design system features the Inter font family, a hierarchical sizing scale, an 8-pixel base grid, and HSL-based color tokens for light/dark mode. Accessibility is supported with consistent hover/active states and focus-visible rings. Icons are sourced from Lucide React.

### Core Features & Technical Implementations
- **Navigation:** Multimodal support, smart search, real-time rerouting, and lane-level guidance.
- **Mapping:** Mapbox GL JS provides premium 3D maps with terrain, sky, buildings, automatic day/night switching, and 2D/3D toggling.
- **Augmented Reality (AR):** AR Preview mode uses `getUserMedia`, `WebXR`, and `DeviceOrientation` for overlaying navigation data onto a live camera feed. A full AR implementation provides live camera feed with canvas-based AR overlays for speed, maneuvers, and radar, featuring comprehensive safety systems and multi-tier fallback (full AR → pseudo-AR → 3D mode).
- **Weather & Alerts:** Integrates OpenWeatherMap for forecasts and severe alerts, and RainViewer API for live radar. Includes a speed camera radar system with visual and voice alerts.
- **Voice Guidance:** Utilizes Web Speech API (SpeechSynthesis) for turn-by-turn instructions and warnings, with hazard throttling.
- **Performance:** Implements debouncing, AbortController for API requests, `React.memo`, lazy loading, and optimized map rendering.
- **Offline Capabilities:** PWA functionality with `manifest.json` and a Service Worker for offline map region downloads and app updates.
- **Car Mode UI:** A simplified, high-contrast interface with larger touch targets for in-vehicle use, activated via toggle or URL parameter.
- **Community Reporting:** A Waze-style reporting system for cameras, accidents, and hazards with cooldowns, voting, and trust scores.
- **3D Lane Rendering:** Displays elevated 3D lane ribbons using Mapbox GL fill-extrusion layers, color-coded for guidance.
- **AI-Assisted Camera Control:** Intelligent camera state machine with 5 states (cruising, approaching_turn, in_turn, searching_target, overview) uses AI heuristics to adjust camera parameters based on turn density, speed, and weather.
- **Realism Pack:** Optional visual/audio enhancements including dynamic weather lighting, motion polish (route glow, motion blur), and radar pulse animations.
- **WebGL Error Handling:** Robust terrain initialization with graceful fallback for devices with limited WebGL support, ensuring 2D/3D toggle functionality.
- **Immersive Experience Foundation:** A multi-sensory architecture built on typed event-driven patterns with a `UiMode` enum (CLASSIC, THREED, CINEMATIC, AR, VR, ECO) and an `EmotionEngine` for future AI integration.
- **Immersive Voice & Haptics:** Production-ready emotional, sensory navigation with a central `AudioBus` service for spatial audio, `useHaptics` hook for tactile feedback, and emotion-adaptive voice using `EmotionEngine` to modify TTS parameters based on driver state.
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
- **getUserMedia API:** Camera access for AR mode
- **WebXR Device API:** Full AR capabilities
- **DeviceOrientation API:** Gyroscope/accelerometer data for pseudo-AR mode
- **Page Visibility API:** AR rendering pause

### Form Management
- **react-hook-form:** Form handling
- **@hookform/resolvers:** Resolver for form validation
- **Zod:** Schema validation

### Database & ORM
- **Drizzle ORM:** ORM for PostgreSQL
- **@neondatabase/serverless:** Serverless database connector
- **drizzle-zod:** Zod integration for Drizzle

### Utilities
- **date-fns:** Date manipulation
- **nanoid:** Unique ID generation
- **clsx + tailwind-merge:** CSS class utilities