# AI Navigator

> AI-powered Progressive Web App (PWA) for intelligent navigation with multimodal UI, real-time traffic, AR preview, and predictive safety features.

## Overview

AI Navigator is a production-ready navigation application featuring:

- **Multimodal Navigation**: 2D, 3D, Cinematic, AR, VR, ECO, and Night Vision modes
- **Intelligent Routing**: Real-time traffic fusion, predictive hazard detection, weather-aware rerouting
- **AR Experience**: Live camera preview with turn-by-turn overlays and device orientation tracking
- **Global Availability**: 15 languages, 6 regional data centers, offline map support
- **Premium Features**: Stripe-powered subscription billing (Free, Premium, Pro tiers)
- **Voice & Haptics**: Turn-by-turn voice guidance with haptic feedback patterns

## Quick Start

### Prerequisites

- **Node.js**: v18+ (recommended: v20)
- **Environment Variables**: See [Environment Setup](#environment-setup)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Navigate to `http://localhost:5000`

## Environment Setup

### Required Environment Variables

Create a `.env` file in the project root:

```bash
# Mapbox (required for maps)
VITE_MAPBOX_TOKEN=your_mapbox_token_here

# Stripe (required for payments)
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
STRIPE_SECRET_KEY=your_stripe_secret_key

# Testing Stripe (for development)
TESTING_VITE_STRIPE_PUBLIC_KEY=your_test_stripe_public_key
TESTING_STRIPE_SECRET_KEY=your_test_stripe_secret_key
```

### How to Obtain API Keys

#### Mapbox Token
1. Create account at [mapbox.com](https://www.mapbox.com)
2. Go to Account → Tokens
3. Create new token with **Maps SDK** and **Geocoding API** scopes
4. Copy token to `VITE_MAPBOX_TOKEN`

#### Stripe Keys
1. Create account at [stripe.com](https://stripe.com)
2. Go to Developers → API keys
3. Copy **Publishable key** → `VITE_STRIPE_PUBLIC_KEY`
4. Copy **Secret key** → `STRIPE_SECRET_KEY`
5. For testing: use **Test mode** keys → `TESTING_*` variables

## Architecture

### Tech Stack

**Frontend**
- React 18 + TypeScript + Vite
- Mapbox GL JS (3D maps)
- TanStack Query (data fetching)
- shadcn/ui + Radix UI (components)
- Tailwind CSS (styling)

**Backend**
- Express.js (HTTP server)
- In-memory storage (MemStorage)
- Drizzle ORM + PostgreSQL (planned)

**APIs & Services**
- Mapbox: Maps, Geocoding, Directions
- Stripe: Subscription billing
- OpenWeatherMap: Weather data
- HERE/TomTom: Traffic providers

### Key Systems

#### 1. Routing & Navigation
- **RoutingController**: Orchestrates route computation, ETA calculation, rerouting
- **TrafficFusionEngine**: Fuses real-time traffic from multiple providers
- **PredictiveNavigation**: AI-powered risk forecasting (sharp turns, speed changes, hazards)
- **SmartETA**: Weather-aware, mode-adaptive ETA computation

#### 2. Multimodal UI
- **UiModeContext**: Manages mode switching (CLASSIC, 3D, CINEMATIC, AR, VR, ECO, NIGHT_VISION)
- **modeCameraSettings**: Camera pitch/bearing configurations per mode
- **visual3d**: 3D terrain, sky layer, lighting controls

#### 3. AR Experience
- **ARExperienceProvider**: Camera stream management, device orientation tracking, health monitoring
- **ARSensorService**: getUserMedia with rear/front camera fallback, stream diagnostics
- **OrientationService**: WebXR + DeviceOrientation APIs for heading/tilt
- **ProjectToScreen**: GPS-to-screen coordinate projection for AR overlays

#### 4. Data & Caching
- **ProviderRegistry**: Region-aware provider selection (6 global regions)
- **HealthMonitor**: Circuit breaker pattern for API resilience
- **CacheService**: Multi-layer caching (traffic, weather, radar, speed cameras)
- **ResilientFetcher**: Exponential backoff, rate limit detection (429 handling)

#### 5. Performance Monitoring
- **PerformanceMonitor**: FPS, battery, memory, network tier detection
- **PerformanceContext**: Exposes `high/medium/low` tier for manual feature optimization

#### 6. Monetization
- **MonetizationService**: Subscription management, feature gating, localized pricing
- **Paywall**: Multi-currency pricing UI with Stripe Checkout integration

## Mobile Support

### Progressive Web App (PWA)

AI Navigator is a fully installable PWA with:

- **Standalone Mode**: Runs like a native app (no browser chrome)
- **Home Screen Install**: "Add to Home Screen" on iOS/Android
- **Offline Support**: Service Worker caching for map tiles, routes
- **App Shortcuts**: Quick actions (Navigate Home, Car Mode)

**Manifest**: `client/public/manifest.json`

### Device Capabilities

| Feature | Detection | Fallback |
|---------|-----------|----------|
| **WebGL** | `MapboxMap.tsx` checks support | Falls back to 2D if unavailable |
| **3D Terrain** | `visual3d.ts` tries terrain | Continues in 2D mode gracefully |
| **AR Camera** | `ARSensorService` checks getUserMedia | Shows "Camera not supported" UI |
| **Device Orientation** | `OrientationService` checks API | Uses basic HUD overlay |
| **Haptics** | `navigator.vibrate` check | Disables haptic feedback silently |

### Performance Tiers

The app automatically classifies device performance:

```typescript
import { usePerformance } from '@/contexts/PerformanceContext';

function MyComponent() {
  const { tier, isLowEnd, batterySaverActive } = usePerformance();
  
  // tier: 'high' | 'medium' | 'low'
  // Manually optimize features based on tier
}
```

**Tier Thresholds:**
- **Low**: <30 FPS, <15% battery (not charging), 2G network, >512MB memory
- **Medium**: <60 FPS, moderate battery/network
- **High**: 60 FPS, good battery/network

**Optimization Guidance:**

For **low-end devices**, consider:
- Disabling 3D terrain: `map.setTerrain(null)`
- Reducing refresh rates: Weather updates every 5min vs 1min
- Limiting concurrent requests: 2 max vs 6
- Disabling animations: Set `enableAnimations: false`

### AR Camera Fallback

AR camera access uses a robust fallback strategy:

1. **Rear Camera** (environment): Preferred for navigation
2. **Front Camera** (user): Fallback if rear unavailable
3. **No Camera**: Graceful error with actionable message

```typescript
// ARExperienceProvider uses requestCameraWithFallback()
const { stream, facingMode } = await cameraService.requestCameraWithFallback();
// User sees toast: "AR Preview: Front Camera" if fallback used
```

**Stream Health Monitoring:**
- Checks camera stream every 2 seconds
- Alerts user if stream disconnects
- Provides diagnostics (resolution, track count)

### Touch & Gestures

Mapbox GL JS provides built-in touch support:
- **Pinch to Zoom**: Two-finger zoom in/out
- **Pan**: Single-finger drag
- **Rotate**: Two-finger rotation
- **Tilt**: Two-finger vertical drag (3D mode)

No custom gesture handling required.

### Responsive Breakpoints

```typescript
import { useIsMobile } from '@/hooks/use-mobile';

const isMobile = useIsMobile(); // true if width < 768px
```

**Viewport Settings** (`client/index.html`):
```html
<meta name="viewport" 
  content="width=device-width, initial-scale=1.0, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
```

## Features by Subscription Tier

| Feature | Free | Premium | Pro |
|---------|------|---------|-----|
| Basic Navigation | ✅ | ✅ | ✅ |
| Voice Guidance | ✅ | ✅ | ✅ |
| Real-time Traffic | ✅ | ✅ | ✅ |
| 2D/3D Maps | ✅ | ✅ | ✅ |
| Offline Maps | ❌ | ✅ | ✅ |
| AR Preview | ❌ | ✅ | ✅ |
| Cinematic/VR Modes | ❌ | ✅ | ✅ |
| Speed Camera Alerts | ❌ | ✅ | ✅ |
| **Night Vision Assist** | ❌ | ❌ | ✅ |
| Predictive AI Safety | ❌ | ❌ | ✅ |
| Priority Routing | ❌ | ❌ | ✅ |

**Pricing**: See `MonetizationService.ts` for regional pricing (10 currencies, 15 languages)

## Development

### Project Structure

```
client/src/
├── components/         # React components (UI, map, AR, navigation)
├── contexts/          # React contexts (UIMode, AR, Performance)
├── services/          # Core business logic
│   ├── navigation/    # Routing, ETA, rerouting
│   ├── traffic/       # Traffic fusion, incidents
│   ├── weather/       # Weather providers, caching
│   ├── ar/           # AR sensors, orientation
│   ├── map/          # 3D controls, camera settings
│   ├── mobile/       # Performance monitoring
│   ├── monetization/ # Stripe billing
│   └── i18n/         # Internationalization
├── hooks/            # Custom React hooks
├── lib/              # Utilities (query client, resilient fetch)
└── types/            # TypeScript type definitions

server/
├── routes.ts         # Express API routes
├── storage.ts        # Storage interface (MemStorage)
└── vite.ts           # Vite dev server integration

shared/
└── schema.ts         # Shared types (routes, traffic, weather)
```

### Key Files

- **Routing**: `client/src/services/navigation/RoutingController.ts`
- **Traffic**: `client/src/services/traffic/TrafficFusionEngine.ts`
- **AR**: `client/src/contexts/ARExperienceProvider.tsx`
- **Performance**: `client/src/services/mobile/PerformanceMonitor.ts`
- **Payments**: `client/src/services/monetization/MonetizationService.ts`
- **i18n**: `client/src/services/i18n/locales/en.json`

### Adding a New Language

1. Create `client/src/services/i18n/locales/{lang}.json` (copy `en.json`)
2. Translate all keys
3. Add to `SUPPORTED_LOCALES` in `client/src/services/i18n/index.ts`
4. Update `MonetizationService` pricing for new region (if applicable)

### Testing AR Features

**Requirements:**
- HTTPS (required for getUserMedia)
- Physical mobile device or Chrome DevTools device emulation
- Camera permissions granted

**Steps:**
1. Open app on mobile or emulate mobile in Chrome DevTools
2. Click AR toggle button in header
3. Grant camera permissions when prompted
4. Rear camera will be used; if unavailable, app falls back to front camera

**Troubleshooting:**
- Check browser console for camera errors
- Verify HTTPS (localhost is exempt)
- Test in Chrome/Safari (best AR support)

## Deployment

### Publishing to Replit

This app is designed for Replit Deployments:

1. Ensure all environment variables are set in Replit Secrets
2. Click **"Deploy"** in Replit sidebar
3. Select **"Autoscale Deployment"** for production traffic
4. Configure custom domain (optional)

**Health Check**: `/api/health` endpoint for deployment monitoring

### Manual Deployment

```bash
# Build frontend
cd client && npm run build

# Start production server
npm start
```

Frontend builds to `client/dist`, served by Express at `/`

## Internationalization (i18n)

**Supported Languages** (15):
- English (en), Spanish (es), French (fr), German (de), Italian (it)
- Portuguese (pt), Dutch (nl), Russian (ru), Japanese (ja), Korean (ko)
- Chinese Simplified (zh-CN), Chinese Traditional (zh-TW)
- Arabic (ar), Hindi (hi), Turkish (tr)

**Usage:**
```typescript
import { i18n } from '@/services/i18n';

const translated = i18n.t('navigation.rerouting');
// Auto-detects browser locale or uses 'en' fallback
```

**Type Safety:**
Translation keys are derived from `en.json` via TypeScript:
```typescript
type TranslationKey = keyof typeof import('./locales/en.json');
```

## Known Limitations

1. **Database**: Currently uses in-memory storage (MemStorage). PostgreSQL integration prepared but not active.
2. **Offline Maps**: Download UI exists but requires backend storage implementation
3. **AI Models**: Night Vision object detection and lane tracking are documented in `BACKLOG.md` (requires TensorFlow.js integration)
4. **WebXR**: VR mode requires WebXR-compatible headset (limited browser support)

## Troubleshooting

### Maps not loading
- Verify `VITE_MAPBOX_TOKEN` is set and valid
- Check browser console for 401/403 errors
- Ensure token has Maps SDK scope enabled

### Stripe checkout fails
- Verify `VITE_STRIPE_PUBLIC_KEY` and `STRIPE_SECRET_KEY` match (both test or both live)
- Check Stripe dashboard for webhook errors
- Ensure prices are created in Stripe dashboard

### AR camera not working
- Verify HTTPS (required for getUserMedia)
- Check browser permissions (camera blocked?)
- Test on physical device (emulators have limited camera support)
- If rear camera fails, app will try front camera automatically

### Performance issues on mobile
- Check performance tier: `usePerformance()` hook
- Disable 3D terrain if `tier === 'low'`
- Reduce map refresh rate for slow networks
- Check battery level (battery saver mode may activate)

## Contributing

### Code Style

- **TypeScript**: Strict mode enabled
- **React**: Functional components, hooks-based
- **Imports**: Use `@/` alias for `client/src/`
- **Components**: Prefer shadcn/ui primitives over custom styling

### Git Workflow

1. Create feature branch: `git checkout -b feature/name`
2. Make changes, test locally
3. Commit with descriptive messages
4. Push and create Pull Request

### Testing

```bash
# Run TypeScript type check
npx tsc --noEmit

# Playwright e2e tests (if configured)
npm test
```

## License

MIT License - See LICENSE file for details

## Support

- **Documentation**: See `native-notes/` for CarPlay/Android Auto migration guides
- **Issues**: Report bugs via GitHub Issues
- **Backlog**: See `BACKLOG.md` for planned AI features
- **Old README**: See `README_OLD.md` for original feature documentation

---

**Built with ❤️ using Replit**
