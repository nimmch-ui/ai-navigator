# AI Navigator

## Overview

AI Navigator is a map-first navigation application that integrates AI assistance with interactive mapping, offering a Google Maps/Apple Maps-like experience. It features ChatGPT-style AI for route planning, location discovery, and navigation guidance. The application aims to provide a clean interface for searching locations, getting AI recommendations, viewing routes, and interacting with an intelligent chat assistant.

Key capabilities include:
- Multimodal navigation (car, bike, walk, transit)
- Smart search with route preferences (Fastest, Shortest, Eco)
- Smart Rerouting with GPS deviation detection, traffic incident awareness, and ETA monitoring
- Lane-Level Guidance (LLG) with visual lane indicators for complex intersections
- AR Preview Mode with camera-based navigation overlay and sensor fusion
- Speed camera radar system with visual alerts and configurable display
- Real-time speed limit display and eco-consumption estimates
- Weather awareness with origin/destination forecasts and severe weather alerts
- Voice navigation with turn-by-turn instructions and camera warnings
- Favorites management with geocoding for quick navigation
- Trip history with replay functionality
- Premium 3D map with buildings, smooth animations, and day/night modes
- Comprehensive settings for cameras, speed warnings, voice guidance, and units

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:** React 18 with TypeScript, Vite for development, Wouter for routing.
**UI Component System:** shadcn/ui (New York style), Radix UI primitives, Tailwind CSS for styling, CSS variables for theming.
**State Management:** TanStack Query for server state, React hooks for local state, custom hooks for reusable logic.
**Key Layout Patterns:** Full-viewport map with overlaid UI panels, responsive design (desktop sidebar, mobile bottom sheet), fixed header, floating right-side controls.
**Map Integration:** Mapbox GL JS for 3D interactive maps with buildings, smooth camera animations, day/night style switching, custom HTML markers, and GeoJSON route overlays.

### Backend Architecture

**Server Framework:** Express.js for HTTP server and API routing.
**Development Environment:** Vite middleware integration, server-side rendering preparation, hot reload support.
**Data Storage:** In-memory storage (MemStorage) for prototyping with an abstracted interface (IStorage) for future database migration.
**Database Schema:** Drizzle ORM configured for PostgreSQL with user table schema and Zod validation (not actively connected).

### Design System

**Typography:** Inter font family, hierarchical sizing, optimized line-height.
**Spacing & Layout:** Tailwind spacing units, 8-pixel base grid system.
**Color System:** HSL-based color tokens, semantic naming, light/dark mode definitions, transparent border/outline colors.
**Interactive Elements:** Hover/active state elevation, focus-visible ring for accessibility, consistent border radius.

### Design Decisions

- UI uses Lucide React icons for consistent visual language.
- Hazard ID-based throttling for voice announcements prevents repetitive alerts.
- Configurable coefficients in trip estimates for future calibration.
- Mock hazard data for demonstration purposes.
- Haversine formula for accurate geographic distance calculations.
- Voice queue prevents simultaneous announcements.
- Speed limit HUD positioned for visibility with configurable units (km/h vs mph).
- Camera proximity alerts show only the nearest non-dismissed alert.
- Eco estimates calculated only when eco mode is enabled.
- Camera detection occurs after route calculation.
- Dismissed camera IDs reset with new route calculations.
- Weather service uses VITE_WEATHER_API_KEY environment variable with graceful fallback to mock data.
- Mock weather generates random conditions (clear/clouds/rain) for testing without API key.
- Severe weather detection based on OpenWeatherMap weather ID codes (thunderstorm/snow/rain/fog).
- Weather dismissal state resets on route closure and when fresh severe weather data arrives.
- Parallel Promise.all for efficient origin/destination weather fetching.
- Weather data cleared when route panel closes to prevent stale UI.
- Mapbox GL JS replaces Leaflet for premium 3D experience with buildings and animations.
- Day/night map styles automatically switch based on time (19:00-06:00 is night).
- Coordinate format standardized as [lat, lng] throughout app, converted to [lng, lat] for Mapbox internally.
- Favorites use Mapbox Geocoding API to convert addresses to coordinates.
- Trip history stores full trip details (origin, destination, mode, preference, distance, duration).
- Settings persist via PreferencesService with localStorage for all user preferences.
- Speed camera visibility controlled by showSpeedCameras setting.
- Route visualization enhanced with glow effect and smooth camera transitions.
- Mapbox token check with graceful error UI when VITE_MAPBOX_TOKEN is missing.
- Premium 3D visuals use Mapbox terrain DEM (mapbox://mapbox.terrain-rgb) with 1.2x exaggeration.
- Sky layer provides atmospheric rendering for realistic horizon when camera is pitched.
- 2D/3D toggle button switches between flat (pitch 0) and cinematic 3D view (pitch 45).
- Visual3D service in services/map/visual3d.ts manages terrain, sky, and camera transitions.
- Cinematic camera follow mode provides smooth 60fps tracking with auto-bearing alignment.
- Camera service uses requestAnimationFrame for fluid camera movement with easing.
- Motion sickness prevention: max 5° bearing delta per frame, zoom clamped to 10-18.
- Cinematic defaults: pitch 62°, zoom 15.5 (city) / 12.5 (highway), bearing follows route heading.
- Cinematic mode persists via PreferencesService and toggles via Video icon button.
- Day/Night theming with auto-detection based on local time and optional sunrise/sunset calculation.
- Theme service supports three modes: auto (time-based), day (manual light), night (manual dark).
- Map styles switch between Mapbox Streets (day) and Dark (night) with smooth transitions.
- Style switching re-adds terrain, sky, and 3D buildings layers after load completes.
- Theme preference persists via PreferencesService and cycles through auto/day/night via Sun/Moon button.
- Sunrise/sunset calculations use simplified solar declination algorithm based on latitude/longitude.
- Weather radar overlay using RainViewer API for live precipitation data.
- Radar layer positioned above roads but below labels for optimal visibility.
- Auto-refresh every 5 minutes to show latest radar frames.
- Radar toggle and opacity slider (30-80%) with persistence via PreferencesService.
- Graceful failure handling with non-blocking toast notifications for service unavailability.
- No API key required for RainViewer basic usage.
- Lane-Level Guidance (LLG) displays visual lane indicators 200-300m before maneuvers.
- Mock lane data service generates typical intersection configurations (2-5 lanes) for demo.
- LaneBar component renders arrow icons (↑↗→↘↓) with recommended lane highlighting.
- Lane data schema extends route model with LaneSegment (start/end points, lane configs per segment).
- Distance-based logic triggers lane bar visibility automatically during active navigation.
- TODO: Integrate real lane metadata from traffic API providers (Mapbox Traffic/Lanes, HERE, TomTom).
- AR Preview Mode uses getUserMedia for camera access with privacy-first local processing.
- WebXR and DeviceOrientation APIs provide sensor fusion for heading/tilt tracking.
- ARExperienceProvider context manages camera/orientation lifecycle and permissions globally.
- AR overlay components: CameraOverlay (video feed), HUDOverlay (navigation data), ARPreviewOverlay (container).
- ARToggleButton includes privacy modal explaining camera usage before first permission request.
- AR mode requires active route with valid steps; displays next maneuver, distance, and direction.
- Sensor fallback chain: WebXR (best) → DeviceOrientation → manual HUD (no sensors).
- AR settings persist via PreferencesService (enabled flag, permission status, sensor capabilities).
- TODO: Add AR chevron rendering aligned with real-world directions via sensor fusion validation.
- Smart Rerouting monitors GPS position, traffic incidents, and ETA changes during active navigation.
- TrafficService provides mock incident data (ready for Mapbox Traffic API integration).
- ReroutingService detects GPS deviation (configurable off-route distance threshold), ETA increases (configurable %), and traffic impacts.
- useRerouting custom hook encapsulates rerouting state and effects, preventing Home.tsx bloat.
- RerouteBanner displays time savings, reason (traffic/GPS/ETA/manual), and Accept/Ignore buttons.
- Ref-based auto-accept timeout guards prevent unintended forced reroutes after user dismisses or navigation stops.
- Auto-accept configurable via preferences (2s delay when enabled, respects user dismissal).
- Reroute settings: enabled/disabled, ETA increase threshold (default 15%), off-route distance (default 100m), auto-accept (default off), minimum time savings (default 2min).
- Traffic incident polling every 30s, GPS deviation checks every 5s during active navigation.
- Position simulation for demo (steps through route geometry every 10s).
- TODO: Integrate real traffic data from Mapbox Traffic API instead of mock incidents.
- TODO: Add voice announcements for reroute suggestions ("Faster route available, saving 5 minutes").

### Performance Optimizations

**Request Optimization (November 2025):**
- DebouncedFetcher utility class in lib/debounce.ts provides debouncing with AbortController support
- Geocoding requests debounced to 300ms to prevent excessive API calls during rapid typing
- Routing requests debounced to 150ms for mode/preference changes
- AbortController cancels in-flight requests when new requests are made
- Pending promises properly resolved to prevent UI stalls
- Request cancellation prevents race conditions and stale data updates

**Component Optimization:**
- React.memo applied to heavy components (RoutePanel, ChatPanel, SearchBar) to prevent unnecessary re-renders
- ChatPanel lazy loaded with React.lazy + Suspense for faster initial page load
- Proper dependency management in hooks minimizes re-render triggers
- Memoization reduces rendering overhead during rapid state changes

**Map Performance:**
- Pre-warmed map styles and layers for efficient startup
- WebGL capability check with graceful 2D fallback for unsupported browsers
- Terrain, sky, and 3D building layers managed efficiently
- Cinematic camera updates throttled to max 15 updates/sec for smooth 60fps performance

## External Dependencies

**UI & Component Libraries:**
- @radix-ui/* for accessible primitives
- lucide-react for iconography
- class-variance-authority for component variants
- cmdk for command palette

**Mapping:**
- Mapbox GL JS and @types/mapbox-gl for 3D maps
- Mapbox Streets styles (light/dark for day/night)
- Mapbox Geocoding API (VITE_MAPBOX_TOKEN)
- Mapbox Directions API (VITE_MAPBOX_TOKEN)

**Weather:**
- OpenWeatherMap API (VITE_WEATHER_API_KEY, optional)

**Browser APIs:**
- Web Speech API (SpeechSynthesis) for voice guidance

**Form Management:**
- react-hook-form
- @hookform/resolvers
- Zod for schema validation

**Database & ORM (configured, not actively connected):**
- Drizzle ORM
- @neondatabase/serverless
- drizzle-zod

**Utilities:**
- date-fns
- nanoid
- clsx + tailwind-merge

**Development Tools:**
- @replit/vite-plugin-*
- tsx
- esbuild