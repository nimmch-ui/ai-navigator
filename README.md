# AI Navigator

A world-class AI-powered navigation application built with React, TypeScript, Mapbox GL JS, and OpenAI. Features multimodal routing, smart route planning, live speed cameras, weather awareness, voice guidance, and premium 3D maps.

## Features

### Core Navigation
- **Multimodal Routing**: Car, bike, walk, and transit modes
- **Smart Route Planning**: Fastest, shortest, and eco-friendly route options
- **Turn-by-Turn Navigation**: Voice-guided navigation with detailed step instructions
- **Real-Time Directions**: Live route calculation with Mapbox Directions API

### Safety & Awareness
- **Speed Camera Radar**: Live camera detection with visual and voice alerts
- **Speed Limit Display**: Real-time speed limit HUD with configurable units (km/h or mph)
- **Camera Proximity Alerts**: Dismissible warnings for upcoming speed cameras
- **Hazard Warnings**: Alerts for road hazards with voice announcements

### Weather Integration
- **Weather Radar Overlay**: Live precipitation data from RainViewer API
  - Toggle ON/OFF with Cloud button
  - Adjustable opacity slider (30-80%)
  - Auto-refresh every 5 minutes
- **Severe Weather Alerts**: Automatic warnings for thunderstorms, snow, fog
- **Weather Forecasts**: Origin and destination weather conditions

### Premium Visuals
- **3D Maps**: Mapbox GL JS with terrain, buildings, and atmospheric sky
  - 1.2x terrain exaggeration for enhanced depth
  - Automatic day/night style switching
- **2D/3D Toggle**: Switch between flat and cinematic views
- **Cinematic Camera Mode**: Smooth 60fps camera follow with auto-bearing alignment
- **Day/Night Theming**: Auto-detection with manual override (auto/day/night modes)

### Smart Features
- **AI Chat Assistant**: Context-aware navigation help powered by OpenAI
- **Favorites Management**: Save locations with geocoding
- **Trip History**: View and replay previous routes
- **Eco Mode**: Battery/fuel consumption estimates for electric and gas vehicles
- **Smart Defaults**: Learn from trip history for personalized settings

## Performance Optimizations

### Request Optimization
- **Debounced Geocoding**: 300ms debounce for search queries to reduce API calls
- **Debounced Routing**: 150ms debounce for route calculations during rapid changes
- **Request Cancellation**: AbortController automatically cancels in-flight requests
- **Race Condition Prevention**: Guards prevent stale data from updating UI

### Rendering Performance
- **Memoized Components**: React.memo applied to heavy components (ChatPanel, RoutePanel, SearchBar)
- **Lazy Loading**: ChatPanel loaded on-demand for faster initial page load
- **Efficient Re-renders**: Minimal unnecessary re-renders through proper dependency management

### Map Performance
- **Pre-warmed Styles**: Map styles and layers loaded efficiently on startup
- **WebGL Detection**: Graceful fallback to 2D mode when WebGL unavailable
- **Optimized Layers**: Terrain, sky, and 3D buildings managed efficiently
- **Throttled Updates**: Cinematic camera throttled to 15 updates/sec max

## Controls & Settings

### Map Controls (Right Side)
- **Radar Toggle**: Cloud/CloudOff icon - enable/disable weather radar
- **2D/3D Toggle**: Box/Map icon - switch between flat and 3D views
- **Cinematic Mode**: Video icon - enable smooth camera follow
- **Theme Toggle**: Sun/Moon icon - cycle through auto/day/night themes

### Radar Controls
- **Opacity Slider**: Appears below speed limit when radar enabled
- **Range**: 30-80% opacity for optimal visibility

### Settings Panel
- **Voice Guidance**: Enable/disable turn-by-turn announcements
- **Speed Warnings**: Toggle camera and speed limit alerts
- **Speed Units**: Choose km/h or mph
- **Transport Mode**: Default mode for new routes
- **Route Preference**: Default preference (fastest/shortest/eco)

## Environment Variables

Create a `.env` file with the following variables:

```env
VITE_MAPBOX_TOKEN=your_mapbox_token_here
VITE_OPENAI_API_KEY=your_openai_key_here (optional)
VITE_WEATHER_API_KEY=your_openweathermap_key_here (optional)
```

**Note**: The app gracefully handles missing API keys:
- Missing Mapbox token: Shows configuration error
- Missing OpenAI key: Chat feature disabled
- Missing Weather key: Falls back to mock weather data
- RainViewer radar requires no API key (public API)

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   - Copy `.env.example` to `.env`
   - Add your Mapbox token (required)
   - Add optional API keys for full features

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**:
   - Navigate to `http://localhost:5000`
   - Grant location permissions for best experience

## Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development
- **Routing**: Wouter for client-side routing
- **UI**: shadcn/ui + Radix UI primitives
- **Styling**: Tailwind CSS with custom theming
- **State**: TanStack Query for server state
- **Maps**: Mapbox GL JS for 3D interactive maps

### Backend
- **Server**: Express.js for API routing
- **Storage**: In-memory storage (abstracted for future DB migration)
- **Schema**: Drizzle ORM with Zod validation

### Services
- **Geocoding**: Mapbox Geocoding API with debouncing
- **Routing**: Mapbox Directions API with cancellation
- **Weather**: OpenWeatherMap API + RainViewer radar
- **Voice**: Web Speech API (browser native)
- **Preferences**: localStorage with service abstraction

## Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest 2 versions)
- **WebGL Required**: For 3D maps and terrain (graceful fallback to 2D)
- **Web Speech API**: For voice guidance (optional, works in Chrome/Safari)
- **localStorage**: For preferences and history persistence

## Known Limitations

- Unit tests not yet implemented (planned for future release)
- Weather radar limited to current precipitation (no forecast overlay)
- Voice guidance uses browser TTS (quality varies by OS/browser)
- In-memory storage resets on server restart (migrate to DB for persistence)

## Performance Tips

1. **Enable Hardware Acceleration**: Improves 3D map rendering
2. **Use Modern Browser**: Latest Chrome/Firefox recommended
3. **Close Unused Panels**: Minimize re-renders
4. **Adjust Radar Opacity**: Lower opacity reduces GPU load
5. **Disable Cinematic Mode**: If experiencing lag on older devices

## Contributing

This is a demonstration project. For production use:
- Implement proper authentication
- Migrate to PostgreSQL database
- Add comprehensive error handling
- Implement rate limiting
- Add analytics and monitoring
- Create unit and integration tests

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Mapbox for mapping and geocoding APIs
- OpenWeatherMap for weather data
- RainViewer for radar imagery
- OpenAI for chat assistance
- shadcn/ui for component library
