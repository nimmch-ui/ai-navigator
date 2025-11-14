# AI Navigator

## Overview
AI Navigator is a production-ready, map-first, AI-assisted Progressive Web App (PWA) designed for interactive mapping, intelligent route planning, location discovery, and navigation. It offers multimodal navigation (2D, 3D, Cinematic, AR, VR, Eco, Night Vision), real-time rerouting, and advanced features like an Intelligent AI Driver Safety System with Night Vision Driving Assist, a Predictive AI Navigation Engine, sophisticated monetization capabilities, and mobile-optimized performance. The project aims to deliver an immersive and efficient navigation experience with global rollout readiness.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The application uses a consistent design system with the Inter font, an 8-pixel base grid, HSL-based color tokens for light/dark modes, and accessibility considerations. It features an interactive `ModeSwitcher` UI, keyboard shortcuts, and gesture navigation. Icons are sourced from Lucide React.

### Technical Implementations
The frontend is built with React 18, TypeScript, and Vite, using Wouter for routing, shadcn/ui, Radix UI, and Tailwind CSS for components. State management is handled by TanStack Query and React hooks. Map integration is powered by Mapbox GL JS for interactive 3D maps. The backend uses Express.js for HTTP services and API routing, with planned PostgreSQL integration via Drizzle ORM and Zod for validation.

### Feature Specifications
- **Multimodal Navigation:** Supports CLASSIC, 3D, CINEMATIC, AR, VR, and ECO UI modes with intelligent fallback.
- **Mapping & Visualization:** Offers 3D maps, terrain, sky, buildings, automatic day/night switching, and AI-assisted camera control.
- **Augmented Reality (AR):** AR Preview mode overlays navigation onto a live camera feed.
- **Voice & Haptic Guidance:** Utilizes Web Speech API for turn-by-turn instructions with emotion-adaptive voice and haptic feedback.
- **Real-time Data & Alerts:** Integrates weather APIs and a speed camera radar system.
- **Performance & Offline:** Includes debouncing, lazy loading, PWA functionality with Service Worker for offline map downloads, and adaptive quality scaling for mobile performance.
- **Global Availability & Localization:** Supports 15 languages, automatic locale detection, unit conversion, and regional infrastructure.
- **Regional Data Provider Layer:** Region-aware data system with failover, health monitoring, and caching for Maps, Traffic Flow, Speed Cameras, and Weather across 6 global regions.
- **User Data Store & Cloud Sync:** IndexedDB-based storage with cloud sync, authentication, and multi-device support.
- **Predictive AI Navigation Engine:** Real-time risk forecasting analyzing map geometry, speed, hazards, weather, and driver behavior with physics-based risk scoring.
- **Intelligent AI Driver Safety System (SafetyController):** Orchestrates a proactive safety layer with early-warning systems, weather-adaptive safety, and driver state adaptation.
- **Night Vision Driving Assist:** AI-powered night vision system for low-light driving safety with real-time image processing, hazard detection, and Pro tier integration.
- **Monetization & Payments:** A subscription billing framework with Stripe integration, premium feature enforcement (Free, Premium, Pro tiers), multi-currency support, and comprehensive localization for global rollout.
- **Real-time Traffic AI Core:** AI-powered traffic intelligence layer providing real-time congestion monitoring, incident detection, and predictive analytics, fusing traffic flow, incidents, weather, and historical patterns.
- **Dynamic Rerouting & ETA Optimization:** Smart ETA calculation and automatic rerouting system responsive to traffic conditions, including alternative route comparisons and user-configurable reroute thresholds with safety constraints and offline fallback.
- **Coordinate Validation System:** A five-layer defense system implemented to prevent "Invalid LngLat object" errors from invalid coordinate data, including service worker cache invalidation, early guard installation, enhanced `LngLatGuard`, per-marker validation, and robust coordinate utilities.

## External Dependencies

- **UI & Component Libraries:** @radix-ui/*, lucide-react, class-variance-authority, cmdk
- **Mapping:** Mapbox GL JS, Mapbox Streets styles, Mapbox Geocoding API, Mapbox Directions API, MapTiler Tiles
- **Weather:** OpenWeatherMap API, RainViewer API, Open-Meteo.com (MeteoFuse)
- **Browser APIs:** Web Speech API, Service Worker API, Web App Manifest, getUserMedia API, WebXR Device API, DeviceOrientation API, Page Visibility API
- **Form Management:** react-hook-form, @hookform/resolvers, Zod
- **Database & ORM:** Drizzle ORM, @neondatabase/serverless, drizzle-zod
- **Utilities:** date-fns, nanoid, clsx + tailwind-merge, idb-keyval
- **Regional Data Providers:** HERE Traffic, TomTom Traffic, ipapi.co
- **Payments:** Stripe SDK, @stripe/stripe-js, @stripe/react-stripe-js