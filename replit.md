# AI Navigator

## Overview
AI Navigator is a map-first, AI-assisted Progressive Web App (PWA) designed to provide an interactive mapping experience for intelligent route planning, location discovery, and navigation. It offers multimodal navigation (2D, 3D, Cinematic, AR, VR, Eco), real-time rerouting, lane-level guidance, AR previews, speed camera alerts, voice navigation, premium 3D maps, offline downloads, and a dedicated Car Mode UI. The project aims to deliver an immersive and efficient navigation experience powered by ChatGPT-style AI.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with React 18, TypeScript, and Vite. It utilizes Wouter for routing, shadcn/ui, Radix UI, and Tailwind CSS for UI components. State management is handled by TanStack Query and React hooks. Map integration is powered by Mapbox GL JS, providing interactive 3D maps with custom markers and GeoJSON overlays.

### Backend
The backend uses Express.js for HTTP services and API routing. It is designed for future PostgreSQL integration via Drizzle ORM, with Zod for validation.

### Design System
The application features a consistent design system with the Inter font, an 8-pixel base grid, HSL-based color tokens for light/dark modes, and accessibility considerations. Icons are from Lucide React.

### Core Features
- **Multimodal Navigation:** Supports CLASSIC, 3D, CINEMATIC, AR, VR, and ECO UI modes with intelligent fallback.
- **Mapping & Visualization:** Mapbox GL JS provides 3D maps, terrain, sky, buildings, automatic day/night switching, 2D/3D toggling, and AI-assisted camera control.
- **Augmented Reality (AR):** An AR Preview mode overlays navigation data onto a live camera feed using `getUserMedia` and `DeviceOrientation`.
- **Voice Guidance & Haptics:** Leverages Web Speech API for turn-by-turn instructions with emotion-adaptive voice and a `useHaptics` hook for tactile feedback and spatial audio.
- **Real-time Data & Alerts:** Integrates weather APIs and a speed camera radar system, centralizing navigation data.
- **Performance & Offline:** Includes optimizations like debouncing, lazy loading, and PWA functionality with a Service Worker for offline map downloads.
- **User Interaction:** Features an interactive `ModeSwitcher` UI, keyboard shortcuts, gesture navigation, and `localStorage` persistence for preferences.
- **Telemetry & Deep Links:** Includes production-ready analytics and supports URL-based deep links.
- **Global Availability & Localization:** Configured for global deployment with automatic geolocation, regional infrastructure, and support for 15 languages with automatic locale detection and unit conversion.
- **Regional Data Provider Layer:** Implements a region-aware data system with automatic failover, health monitoring, and caching for Maps, Traffic Flow, Speed Cameras, and Weather across 6 global regions.
- **User Data Store & Cloud Sync:** Centralized IndexedDB-based storage for user data with cloud sync capabilities, authentication (Scrypt-based hashing, session tokens), conflict resolution (last-write-wins), and multi-device support.
- **Predictive AI Navigation Engine:** A real-time risk forecasting system analyzing map geometry, speed, hazards, weather, and driver behavior with physics-based risk scoring and a PredictiveSafetyBadge UI component.
- **Intelligent AI Driver Safety System (SafetyController):** Orchestrates a proactive safety layer with early-warning systems (voice, haptic, HUD flash), weather-adaptive safety, and driver state adaptation.
- **Night Vision Driving Assist (Q5-A1 COMPLETE - All 3 Parts):** AI-powered night vision system for enhanced low-light driving safety with real-time image processing, hazard detection, and Pro tier integration:
  - **Part 1/3 - Core Enhancement:** NightVisionService with low-light enhancement using gamma correction (configurable gamma factor 0.8-2.5) and histogram equalization for improved contrast; noise reduction using 3x3 averaging filter; processes frames at ~10-30ms; edge detection using Sobel operator with configurable threshold and edge point extraction; color mapping modes (infrared simulation with green tint, thermal contrast with blue→cyan→green→yellow→red gradient, normal processing)
  - **Part 2/3 - Overlay & Alerts:** NightVisionOverlay React component with real-time canvas-based rendering, color-coded detection overlays (road edges in green, animals in orange, pedestrians in yellow, hazards in red); NightVisionVoiceAlerts service with voice alerts for animal detection ("Animal detected on right"), pedestrian crossing ("Pedestrian crossing ahead"), low visibility warnings ("Low visibility zone"), road edge loss ("Stay centered in lane"); NightVisionHazardIntegration service links detections into EventBus hazard pipeline with events (nightVision:hazardDetected, nightVision:animalDetected, nightVision:pedestrianDetected, nightVision:lowVisibility, nightVision:stats); voice alerts support 3 voice styles (neutral, warm, energetic) with entity-based throttling (animals 15s, pedestrians 10s, low visibility 30s); demo page at /night-vision-demo
  - **Part 3/3 - Settings UI & Pro Tier (COMPLETE):** Full Settings integration with intensity slider (10-100%) controlling gamma factor via linear interpolation (10%→0.8, 100%→2.5), thermal mode toggle switching between 'normal' and 'thermal' color modes; Pro tier enforcement (hasFeature('pro')) with paywall display for Free/Premium users; NightVisionService wired to PreferencesService with EventBus subscriptions for real-time preference updates; NIGHT_VISION added to MODE_CAPABILITIES with webgl=false, camera=true; MonetizationService test mode with lazy isTestMode() for Playwright testing; all settings persist via localStorage and apply immediately to NightVisionService
  - **Detection Pipeline:** processFrame() orchestrates enhancement, color mapping, edge detection, and AI object detection; returns NightVisionResult with enhanced ImageData, edge map, detections array, and performance metrics; hazard severity calculation based on detection type and confidence; direction estimation (left/right/ahead) from bbox position
  - **Pro Tier Integration:** Night Vision mode available globally (all regions), requires Pro subscription, enforced at ModeSwitcher with paywall, Settings UI conditionally displays controls only when uiMode=NIGHT_VISION AND hasFeature('pro')
- **Monetization & Payments (Q4 Complete - Global Rollout Ready):** A production-ready subscription billing framework with Stripe integration, premium feature enforcement, and global rollout capabilities ready for App Store & Play Store release:
  - **Part 1 - Framework:** Subscription tiers (Free, Premium, Pro), MonetizationService for client-side management, premium feature enforcement, Paywall component
  - **Part 2 - Stripe Integration:** Complete Stripe payment flow, webhook handling, subscription management, payment success/failure handling
  - **Part 3/3 - Global Rollout:** Multi-currency support (USD, EUR, INR, ALL, CHF) with automatic conversion based on locale; comprehensive localization in 10 languages (English, German, Slovenian, Albanian, Croatian, Serbian, Turkish, Hindi, Spanish, French) with automatic device language detection and normalization; all 10 languages have complete pricing translations (15 keys each); regional feature flags (AR restricted to 42 supported countries including all Balkan nations, Night Vision available globally); deterministic sequential initialization with module-level servicesReady promise exported from appInitialization.ts; global rollout status dashboard at /global-rollout awaits servicesReady for deterministic loading
- **Real-time Traffic AI Core (Q6-A1 Part 1/3 Complete):** AI-powered traffic intelligence layer providing real-time congestion monitoring, incident detection, and predictive analytics similar to Tesla/Waze:
  - **Traffic Data Abstraction:** ITraffic interface extended with getIncidents(bbox) method; TrafficSource abstraction layer (services/data/traffic/) providing unified API for flow + incidents; provider adapters for MapboxTrafficSource, HereTrafficSource, MockTrafficSource with regional failover support
  - **Provider Implementations:** MapboxTraffic queries 3x3 grid of sample points with 5km radius each for complete bbox coverage and de-duplication; HereTraffic fetches incidents via HERE API with criticality-based severity mapping; TomTomTraffic uses magnitudeOfDelay (0-4 scale) converted to delay minutes; MockTraffic provides development/offline mock data
  - **TrafficFusionEngine:** AI fusion engine combining live traffic flow, real-time incidents, weather conditions (rain/snow/fog impact), and time-of-day historical patterns; outputs per-segment congestion levels (0-100), predicted congestion 15-30min ahead using historical trends, incident risk tags (accident/construction/closure/heavy_rain/snow/fog/rush_hour); emits ai:trafficUpdate events via EventBus; environment-safe setInterval with overlap prevention
  - **Route Enrichment:** routeTrafficEnrichment helper provides enrichRouteWithTrafficData() to split routes into segments and match with traffic data; color-coding system (green/yellow/orange/red) based on congestion levels; helper functions getSegmentTraffic(segmentId) and getUpcomingIncidents(center, radius) for navigation integration
  - **Historical Patterns:** Time-of-day and day-of-week based patterns with rush hour detection (weekdays 7-9am, 4-7pm); weekend patterns for lunch/shopping hours; variance tracking for prediction confidence
  - **Weather Integration:** Fetches weather via ProviderRegistry with regional failover; calculates impact on congestion (+10 rain, +20 snow, +15 fog, +25 storm, +10 high wind, +15 low visibility); capped at +30 points maximum impact
  - **Next Steps (Parts 2/3):** Map visualization with color-coded route segments and incident icons; ETA calculation enrichment; full navigation loop integration with rerouting recommendations

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