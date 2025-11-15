# AI Navigator

## Overview
AI Navigator is a production-ready, map-first, AI-assisted Progressive Web App (PWA) designed for interactive mapping, intelligent route planning, location discovery, and navigation. It offers multimodal navigation (2D, 3D, Cinematic, AR, VR, Eco, Night Vision), real-time rerouting, and advanced features like an Intelligent AI Driver Safety System with Night Vision Driving Assist, a Predictive AI Navigation Engine, sophisticated monetization capabilities, and mobile-optimized performance. The project aims to deliver an immersive and efficient navigation experience with global rollout readiness.

## User Preferences
Preferred communication style: Simple, everyday language.

## Production Deployment Notes (November 15, 2025)

### Security & Privacy Enhancements
- **GPS Privacy Protection**: All location coordinate logging is gated with `import.meta.env.DEV` checks to prevent sensitive user location data from appearing in production console logs. Only accuracy and speed metrics are logged in development.
- **SSR/Browser Safety**: GPS service includes browser environment checks (`typeof window !== 'undefined'`) to prevent crashes in server-side rendering or non-browser contexts.
- **API Key Security**: Client-side keys (VITE_MAPBOX_TOKEN, VITE_STRIPE_PUBLIC_KEY) properly separated from server-side secrets (OPENAI_API_KEY, STRIPE_SECRET_KEY). No backend secrets exposed to client.

### GPS Navigation Implementation
- **Service**: `client/src/services/gps.ts` - Production-ready GPS tracking service using navigator.geolocation API
- **Features**: 
  - Real-time position tracking with `watchPosition()`
  - High-accuracy mode for mobile devices (iOS/Android/iPad)
  - Graceful fallback to route simulation when GPS fails
  - Permission denial handling with user-friendly toast notifications
  - 15-second timeout with automatic fallback
  - Proper cleanup of watchers and timers to prevent memory leaks
- **Integration**: Automatically starts GPS tracking when navigation begins, stops when navigation ends

### Production Configuration
- **Demo Mode**: Disabled (`DEV_NAV_DEMO_MODE = false`) to prevent auto-loading of Zurich HB → Airport demo route
- **Fallback Banner**: Hidden in production (`RegionFallbackBanner` checks `import.meta.env.PROD`) for clean UX while maintaining regional failover functionality
- **Test Mode**: Set `VITE_TEST_MODE=true` in Replit Secrets to enable internal testing account (nimm.ch@icloud.com) with full premium access

### Weather System
- **Providers**: MeteoFuse (free Open-Meteo.com API) with MockWeather fallback
- **Resilience**: Enhanced error handling and detailed logging for troubleshooting
- **Fallback**: Guaranteed MockWeather fallback that never fails

### Mobile Optimization
- **GPS Support**: Full iOS/iPad/Android geolocation support
- **Performance**: Adaptive quality scaling based on device capabilities
- **UI**: Touch-optimized controls, responsive breakpoints

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
- **Real-time GPS Navigation:** Production-safe GPS tracking using navigator.geolocation API with graceful fallback to simulation when GPS is unavailable, permission denied, or signal is weak. Includes 15-second timeout with automatic fallback and proper cleanup to prevent memory leaks.
- **Real-time Data & Alerts:** Integrates weather APIs and a speed camera radar system.
- **Performance & Offline:** Includes debouncing, lazy loading, PWA functionality with Service Worker for offline map downloads, and adaptive quality scaling for mobile performance.
- **Global Availability & Localization:** Supports 15 languages, automatic locale detection, unit conversion, and regional infrastructure.
- **Regional Data Provider Layer:** Region-aware data system with failover, health monitoring, and caching for Maps, Traffic Flow, Speed Cameras, and Weather across 6 global regions. Fallback banner hidden in production for clean UX.
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
- **Browser APIs:** Web Speech API, Geolocation API (navigator.geolocation), Service Worker API, Web App Manifest, getUserMedia API, WebXR Device API, DeviceOrientation API, Page Visibility API
- **Form Management:** react-hook-form, @hookform/resolvers, Zod
- **Database & ORM:** Drizzle ORM, @neondatabase/serverless, drizzle-zod
- **Utilities:** date-fns, nanoid, clsx + tailwind-merge, idb-keyval
- **Regional Data Providers:** HERE Traffic, TomTom Traffic, ipapi.co
- **Payments:** Stripe SDK, @stripe/stripe-js, @stripe/react-stripe-js