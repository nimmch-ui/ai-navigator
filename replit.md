# AI Navigator

## Overview

AI Navigator is a map-first navigation application that combines intelligent AI assistance with interactive mapping capabilities. The application provides users with a Google Maps/Apple Maps-like experience enhanced by ChatGPT-style AI interactions for route planning, location discovery, and navigation guidance.

The application is built as a full-stack TypeScript application with a React frontend and Express backend, designed to deliver a clean, uncluttered interface where users can search locations, get AI-powered recommendations, view routes, and interact with an intelligent chat assistant.

**Implementation Progress (8-Part Specification):**
- ✅ **Part 1B: Multimodal Core (COMPLETE)** - Production-ready Mapbox Directions API integration with car/bike/walk/transit modes, AbortController pattern for race condition prevention
- ✅ **Part 2A: Search & Route Preferences (COMPLETE)** - Smart autocomplete search, route preference selector (Fastest/Shortest/Eco), intelligent route selection from Mapbox alternatives, enhanced error handling
- ✅ **Part 2B: Radar Basics (Speed Cameras) (COMPLETE)** - Extensible speed camera system with map markers, tooltips, and service layer architecture ready for real API integration

**Recently Added Features (November 11, 2025):**
- **Speed Camera Radar System**: Visual markers on map showing speed camera locations with speed limits
- **Interactive Camera Markers**: Red circular markers with camera icons, tooltips on hover, detailed popups on click
- **Extensible Radar Architecture**: Service layer design (`services/radar.ts`) allows easy replacement of mock data with real APIs
- **Speed Camera Data Model**: 6 demo cameras around San Francisco with speed limits (40-60 km/h) and optional directional info
- **Route Preference Selection**: Three route options (Fastest, Shortest, Eco) with intelligent selection from Mapbox alternatives
- **Eco Route Algorithm**: Selects lowest-duration route within 10% of shortest distance for optimal efficiency
- **Smart Search Autocomplete**: Mapbox Geocoding API integration with up to 5 location suggestions
- **Enhanced Error Handling**: Differentiates between API errors, network failures, and "no results found"
- **Accessibility Improvements**: Full ARIA support (aria-pressed, aria-label, sr-only) for route preference buttons

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast hot module replacement
- Wouter for lightweight client-side routing (single-page application pattern)

**UI Component System:**
- shadcn/ui component library (New York style variant) for consistent, accessible UI components
- Radix UI primitives for headless accessible components
- Tailwind CSS for utility-first styling with custom design tokens
- CSS variables for theming support (light/dark mode capability)

**State Management:**
- TanStack Query (React Query) for server state management and data fetching
- React hooks for local component state
- Custom hooks for reusable logic (mobile detection, toast notifications)

**Key Layout Patterns:**
- Full-viewport map with overlaid UI panels
- Responsive design with desktop (320px collapsible sidebar) and mobile (bottom sheet) layouts
- Fixed header bar (h-16) for search and controls
- Floating right-side controls for map interactions

**Map Integration:**
- Leaflet.js for interactive map rendering
- OpenStreetMap tile layers for map data
- Custom marker and route overlay support

### Backend Architecture

**Server Framework:**
- Express.js for HTTP server and API routing
- HTTP server creation with support for future WebSocket upgrades
- Custom request logging middleware for API monitoring

**Development Environment:**
- Vite middleware integration in development for seamless full-stack development
- Server-side rendering preparation (template loading system)
- Hot reload support through Vite's HMR

**Data Storage:**
- In-memory storage implementation (MemStorage class) for development/prototyping
- Abstracted storage interface (IStorage) allowing easy migration to persistent databases
- User management capabilities (CRUD operations)

**Database Schema (Prepared but not actively used):**
- Drizzle ORM configured for PostgreSQL
- User table with UUID primary keys, username/password fields
- Zod schema validation for type-safe data insertion
- Migration system ready via drizzle-kit

### Design System

**Typography:**
- Inter font family (Google Fonts) for clean, modern appearance
- Hierarchical sizing: Headers (24-32px, 600-700 weight), Body (14-16px, 400-500 weight)
- Optimized line-height (1.6) for chat readability

**Spacing & Layout:**
- Tailwind spacing units (2, 4, 6, 8) for consistent component padding and gaps
- 8-pixel base grid system for visual rhythm

**Color System:**
- HSL-based color tokens for easy theme manipulation
- Semantic color naming (primary, secondary, muted, accent, destructive)
- Separate light/dark mode definitions
- Border and outline colors with alpha transparency for layered depth

**Interactive Elements:**
- Hover and active state elevation effects (shadow-based feedback)
- Focus-visible ring system for keyboard navigation accessibility
- Consistent border radius (lg: 9px, md: 6px, sm: 3px)

### External Dependencies

**UI & Component Libraries:**
- @radix-ui/* packages for accessible primitives (dialogs, dropdowns, tooltips, etc.)
- lucide-react for consistent iconography (used for hazard icons: Camera, School, AlertTriangle, Construction)
- class-variance-authority for type-safe component variants
- cmdk for command palette functionality

**Mapping:**
- Leaflet.js (@types/leaflet for TypeScript support)
- Leaflet divIcon for custom hazard markers with embedded SVG icons
- OpenStreetMap tile server for map tiles

**Browser APIs:**
- Web Speech API (SpeechSynthesis) for voice guidance announcements

**Form Management:**
- react-hook-form for form state management
- @hookform/resolvers for validation integration
- Zod for schema validation

**Database & ORM (configured but not actively connected):**
- Drizzle ORM for type-safe database queries
- @neondatabase/serverless for PostgreSQL connection
- drizzle-zod for runtime validation

**Utilities:**
- date-fns for date manipulation
- nanoid for unique ID generation
- clsx + tailwind-merge for className composition

**Development Tools:**
- @replit/vite-plugin-* for Replit-specific development features
- tsx for TypeScript execution
- esbuild for production builds

### API Structure

The application currently has a minimal API setup with:
- Route registration system in `server/routes.ts`
- Storage abstraction for future backend expansion
- Request/response logging for debugging
- CORS and JSON body parsing middleware

The frontend is prepared to communicate with backend APIs through:
- TanStack Query for data fetching
- Centralized API request helper with credential support
- Error handling with status code checking

### Authentication & Authorization

Basic user schema prepared with:
- Username/password storage structure
- UUID-based user identification
- Schema validation through Zod
- No active authentication flow implemented (infrastructure only)

## Recent Implementation Details (November 11, 2025)

### Eco Mode & Trip Estimates
**File**: `client/src/services/tripEstimates.ts`
- Calculates fuel consumption for gas vehicles (L/100km coefficients)
- Calculates energy consumption for EVs (kWh/100km coefficients)
- Estimates CO2 emissions for environmental awareness
- Provides eco-friendly driving tips based on vehicle type
- All coefficients are configurable for future tuning
- Includes disclaimers about estimate accuracy

### Hazard Warning System
**Files**: `client/src/data/hazards.ts`, `client/src/components/HazardAlert.tsx`
- Four hazard types: speed cameras, school zones, dangerous curves, accident zones
- Each hazard has severity level (low/medium/high), alert radius (~300m), speed limit data
- Proximity detection using Haversine formula for distance calculation
- Visual alerts appear when user is within hazard alert radius
- Hazard markers rendered on map with color-coded icons (red, yellow, orange, blue)
- Dismissible alert banners with distance information

### Voice Guidance Service
**File**: `client/src/services/voiceGuidance.ts`
- Browser-based text-to-speech using Web Speech API
- Message queue system with priority support (high/normal)
- Entity-based throttling prevents repeated announcements for same hazard
- Graceful fallback when speech synthesis unavailable
- LocalStorage persistence for user voice preference

### UI Components
- **Settings** (`client/src/components/Settings.tsx`): Popover with eco mode toggle, vehicle type selector, voice guidance switch
- **TripSummary** (`client/src/components/TripSummary.tsx`): Card showing trip metrics with conditional rendering based on vehicle type
- **HazardAlert** (`client/src/components/HazardAlert.tsx`): Alert banner with hazard icon, distance, speed limit info
- **HazardLegend** (`client/src/components/HazardLegend.tsx`): Legend explaining hazard marker colors and types
- **MapView** (updated): Now accepts `hazards` prop and renders custom markers with Leaflet divIcons

### Design Decisions
- Used Lucide React icons instead of emojis per architecture guidelines
- Hazard ID-based throttling (not text-based) for voice announcements
- Configurable coefficients in trip estimates for future real-world calibration
- Mock hazard data positioned around San Francisco for demonstration
- Distance calculations use Haversine formula for geographic accuracy
- Voice queue prevents multiple simultaneous announcements