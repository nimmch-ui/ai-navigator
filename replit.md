# AI Navigator

## Overview

AI Navigator is a map-first navigation application that integrates AI assistance with interactive mapping, offering a Google Maps/Apple Maps-like experience. It features ChatGPT-style AI for route planning, location discovery, and navigation guidance. The application aims to provide a clean interface for searching locations, getting AI recommendations, viewing routes, and interacting with an intelligent chat assistant.

Key capabilities include:
- Multimodal navigation (car, bike, walk, transit)
- Smart search with route preferences (Fastest, Shortest, Eco)
- Speed camera radar system with visual alerts
- Real-time speed limit display and eco-consumption estimates
- Weather awareness with origin/destination forecasts and severe weather alerts

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:** React 18 with TypeScript, Vite for development, Wouter for routing.
**UI Component System:** shadcn/ui (New York style), Radix UI primitives, Tailwind CSS for styling, CSS variables for theming.
**State Management:** TanStack Query for server state, React hooks for local state, custom hooks for reusable logic.
**Key Layout Patterns:** Full-viewport map with overlaid UI panels, responsive design (desktop sidebar, mobile bottom sheet), fixed header, floating right-side controls.
**Map Integration:** Leaflet.js for interactive maps, OpenStreetMap tile layers, custom markers and route overlays.

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

- UI uses Lucide React icons.
- Hazard ID-based throttling for voice announcements.
- Configurable coefficients in trip estimates for future calibration.
- Mock hazard data for demonstration purposes.
- Haversine formula for accurate geographic distance calculations.
- Voice queue prevents simultaneous announcements.
- Speed limit HUD positioned for visibility.
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

## External Dependencies

**UI & Component Libraries:**
- @radix-ui/* for accessible primitives
- lucide-react for iconography
- class-variance-authority for component variants
- cmdk for command palette

**Mapping:**
- Leaflet.js and @types/leaflet
- OpenStreetMap tile server
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