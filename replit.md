# AI Navigator

## Overview
AI Navigator is a map-first, AI-assisted Progressive Web App (PWA) designed for interactive mapping, intelligent route planning, location discovery, and navigation. It offers multimodal navigation (2D, 3D, Cinematic, AR, VR, Eco), real-time rerouting, lane-level guidance, AR previews, speed camera alerts, voice navigation, premium 3D maps, offline downloads, and a dedicated Car Mode UI. The project aims to deliver an immersive and efficient navigation experience powered by ChatGPT-style AI. It includes advanced features like an Intelligent AI Driver Safety System with Night Vision Driving Assist, a Predictive AI Navigation Engine, and sophisticated monetization capabilities with global rollout readiness.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The application features a consistent design system using the Inter font, an 8-pixel base grid, HSL-based color tokens for light/dark modes, and accessibility considerations. Icons are sourced from Lucide React. It provides an interactive `ModeSwitcher` UI, keyboard shortcuts, and gesture navigation.

### Technical Implementations
The frontend is built with React 18, TypeScript, and Vite, utilizing Wouter for routing, shadcn/ui, Radix UI, and Tailwind CSS for components. State management is handled by TanStack Query and React hooks. Map integration is powered by Mapbox GL JS for interactive 3D maps. The backend uses Express.js for HTTP services and API routing, with planned PostgreSQL integration via Drizzle ORM and Zod for validation.

### Feature Specifications
- **Multimodal Navigation:** Supports CLASSIC, 3D, CINEMATIC, AR, VR, and ECO UI modes with intelligent fallback.
- **Mapping & Visualization:** Offers 3D maps, terrain, sky, buildings, automatic day/night switching, and AI-assisted camera control.
- **Augmented Reality (AR):** AR Preview mode overlays navigation onto a live camera feed.
- **Voice & Haptic Guidance:** Leverages Web Speech API for turn-by-turn instructions with emotion-adaptive voice and haptic feedback.
- **Real-time Data & Alerts:** Integrates weather APIs and a speed camera radar system.
- **Performance & Offline:** Includes debouncing, lazy loading, and PWA functionality with Service Worker for offline map downloads.
- **Global Availability & Localization:** Supports 15 languages, automatic locale detection, unit conversion, and regional infrastructure.
- **Regional Data Provider Layer:** Region-aware data system with failover, health monitoring, and caching for Maps, Traffic Flow, Speed Cameras, and Weather across 6 global regions.
- **User Data Store & Cloud Sync:** IndexedDB-based storage with cloud sync, authentication, and multi-device support.
- **Predictive AI Navigation Engine:** Real-time risk forecasting analyzing map geometry, speed, hazards, weather, and driver behavior with physics-based risk scoring.
- **Intelligent AI Driver Safety System (SafetyController):** Orchestrates a proactive safety layer with early-warning systems, weather-adaptive safety, and driver state adaptation.
- **Night Vision Driving Assist:** AI-powered night vision system for low-light driving safety with real-time image processing, hazard detection, and Pro tier integration, including visual overlays and voice alerts.
- **Monetization & Payments:** A subscription billing framework with Stripe integration, premium feature enforcement (Free, Premium, Pro tiers), multi-currency support, and comprehensive localization across 10 languages for global rollout.
- **Real-time Traffic AI Core:** AI-powered traffic intelligence layer providing real-time congestion monitoring, incident detection, and predictive analytics, fusing traffic flow, incidents, weather, and historical patterns.
- **Dynamic Rerouting & ETA Optimization:** Smart ETA calculation and automatic rerouting system responsive to traffic conditions, including alternative route comparisons and user-configurable reroute thresholds.
  - **Safety Constraints:** Minimum 3-minute intervals between reroutes (5 minutes near junctions), rejection tracking with cooldown (2 rejections = 10-minute pause), junction detection (>30° bearing change within 500m).
  - **Offline Fallback:** TrafficFusionEngine freezes live updates when offline, restores cached snapshot, throttles polling (1 min good network, 3 min weak), emits offline:mode_entered/offline:mode_recovered events.
  - **Telemetry System:** Comprehensive event tracking (traffic_update_received, reroute_suggested, reroute_accepted, reroute_rejected) for complete lifecycle monitoring.
  - **AR/3D Traffic Visualization:** Real-time congestion heatmap with red gradient (0-100%), incident markers with severity-based colors, integrated into MapboxMap component. Note: Known edge case where layers may not persist through theme switches (requires TrafficLayerController enhancement).

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