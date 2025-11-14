import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { MessageSquare, Box, Map as MapIcon, Video, Sun, Moon, Cloud, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { useUiMode } from '@/contexts/UiModeContext';
import { UiMode } from '@/types/ui';
import MapboxMap from '@/components/MapboxMap';
import SearchBar from '@/components/SearchBar';
import MapControls from '@/components/MapControls';
import { useARExperience } from '@/contexts/ARExperienceProvider';
import ARToggleButton from '@/components/ar/ARToggleButton';
import ARPreviewOverlay from '@/components/ar/ARPreviewOverlay';
import ARView from '@/components/ARView';

const ChatPanel = lazy(() => import('@/components/ChatPanel'));
import RoutePanel from '@/components/RoutePanel';
import ThemeToggle from '@/components/ThemeToggle';
import { CarModeToggle } from '@/components/CarModeToggle';
import Settings from '@/components/Settings';
import { ModeSwitcher, ModeSwitcherCompact } from '@/components/ModeSwitcher';
import { Paywall } from '@/components/Paywall';
import Favorites from '@/components/Favorites';
import TripHistory from '@/components/TripHistory';
import ReportButton from '@/components/ReportButton';
import CommunityReportMarker from '@/components/CommunityReportMarker';
import type { CommunityReport } from '@shared/schema';
import HazardAlert from '@/components/HazardAlert';
import TripSummary from '@/components/TripSummary';
import HazardLegend from '@/components/HazardLegend';
import TransportModeSelector from '@/components/TransportModeSelector';
import RoutePreferenceSelector from '@/components/RoutePreferenceSelector';
import SpeedLimitHUD from '@/components/SpeedLimitHUD';
import CameraProximityAlert from '@/components/CameraProximityAlert';
import EcoSummary from '@/components/EcoSummary';
import WeatherPanel from '@/components/WeatherPanel';
import SevereWeatherAlert from '@/components/SevereWeatherAlert';
import PredictiveSafetyBadge from '@/components/PredictiveSafetyBadge';
import HUDFlashAlert from '@/components/HUDFlashAlert';
import { mockHazards, getHazardWarningMessage } from '@/data/hazards';
import type { Hazard } from '@/data/hazards';
import { announce, isVoiceSupported, getVoiceEnabled, setVoiceEnabled, getVoiceVolume, setVoiceVolume, getHapticsEnabled, setHapticsEnabled, isHapticsSupported } from '@/services/voiceGuidance';
import { calculateTripEstimate, type VehicleType } from '@/services/tripEstimates';
import type { TripEstimate } from '@/services/tripEstimates';
import { PreferencesService, type TransportMode, type RoutePreference, type SpeedUnit, type MapTheme, type VoiceStyle } from '@/services/preferences';
import type { Region } from '@/services/data/types';
import { RegionDetector } from '@/services/data/regionDetector';
import { TripHistoryService, type TripRecord } from '@/services/tripHistory';
import { FavoritesService, type Favorite } from '@/services/favorites';
import { sendChatMessage, type ChatContext } from '@/services/chatApi';
import { calculateRoute, formatDistance, formatDuration, getManeuverIcon, type RouteResult } from '@/services/routing';
import { searchPlaces, type GeocodingResult } from '@/services/geocoding';
import { getNextTheme, getThemeLabel, resolveTheme } from '@/services/map/theme';
import { getLaneDataForRoute } from '@/services/lanes';
import type { LaneSegment } from '@shared/schema';
import { getSpeedCameras } from '@/services/radar';
import type { SpeedCamera } from '@/data/speedCameras';
import { detectCamerasOnRoute, getCurrentSpeedLimit, type CameraProximityWarning } from '@/services/cameraProximity';
import { calculateEcoEstimate, type EcoEstimate } from '@/services/ecoEstimates';
import { fetchWeather, getSevereWeatherWarning, type WeatherData } from '@/services/weather';
import { DebouncedFetcher } from '@/lib/debounce';
import { trafficService } from '@/services/traffic';
import { reroutingService } from '@/services/rerouting';
import type { TrafficIncident, RerouteOption } from '@shared/schema';
import { RerouteBanner } from '@/components/RerouteBanner';
import { useRerouting } from '@/hooks/useRerouting';
import { ModeService } from '@/services/mode';
import { getDeviceCapabilities } from '@/services/map/webglCapability';
import { getBestSupportedMode } from '@/services/map/modeCapabilities';
import { validateCoordinates, getZurichFallback } from '@/utils/coordinateValidation';

// ⚠️ DEVELOPMENT MODE: Import demo navigation data for testing
import { 
  DEV_NAV_DEMO_MODE, 
  MOCK_ROUTE, 
  MOCK_TRIP_ESTIMATE,
  DEMO_ORIGIN,
  DEMO_DESTINATION,
  DEMO_ORIGIN_COORDS,
  DEMO_DESTINATION_COORDS,
  MOCK_SPEED_LIMIT
} from '@/dev/navigationDemo';

interface SearchResult {
  id: string;
  name: string;
  address: string;
  category: string;
  coordinates: [number, number];
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export default function Home() {
  const [showChat, setShowChat] = useState(false);
  const [showRoute, setShowRoute] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(getZurichFallback());
  const [mapZoom, setMapZoom] = useState(13);
  const [markers, setMarkers] = useState<Array<{ lat: number; lng: number; label?: string }>>([
    { lat: 37.7749, lng: -122.4194, label: 'San Francisco' }
  ]);
  const [minTrustScore, setMinTrustScore] = useState(0);
  const [selectedReport, setSelectedReport] = useState<CommunityReport | null>(null);

  const { data: communityReports = [] } = useQuery<CommunityReport[]>({
    queryKey: ['/api/reports', minTrustScore],
    queryFn: async () => {
      const params = minTrustScore > 0 ? `?minTrustScore=${minTrustScore}` : '';
      const response = await fetch(`/api/reports${params}`);
      if (!response.ok) throw new Error('Failed to fetch reports');
      return response.json();
    },
    refetchInterval: 30000,
  });
  const [route, setRoute] = useState<Array<[number, number]> | undefined>();
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const { toast } = useToast();
  const { isARActive, toggleAR, isInitializing } = useARExperience();
  const { uiMode, setUiMode, spatialAudio, setSpatialAudio, ambientMusic, setAmbientMusic, hapticsEnabled, setHapticsEnabled: setHapticsEnabledPref } = useUiMode();
  const routeAbortControllerRef = useRef<AbortController | null>(null);
  const geocodeFetcher = useRef(new DebouncedFetcher(300));
  const routeFetcher = useRef(new DebouncedFetcher(150));
  
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>>([]);

  const [transportMode, setTransportMode] = useState<TransportMode>("car");
  const [routePreference, setRoutePreference] = useState<RoutePreference>("fastest");
  const [ecoMode, setEcoMode] = useState(false);
  const [vehicleType, setVehicleType] = useState<VehicleType>("car");
  const [voiceEnabled, setVoiceEnabledState] = useState(getVoiceEnabled());
  const [voiceVolume, setVoiceVolumeState] = useState(getVoiceVolume());
  const [hazardAlertsEnabled, setHazardAlertsEnabled] = useState(true);
  const [showSpeedCameras, setShowSpeedCameras] = useState(true);
  const [speedWarnings, setSpeedWarnings] = useState(true);
  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>("kmh");
  const [nearbyHazards, setNearbyHazards] = useState<Hazard[]>([]);
  const [tripEstimate, setTripEstimate] = useState<TripEstimate | null>(null);
  const [speedCameras, setSpeedCameras] = useState<SpeedCamera[]>([]);
  const [cameraWarnings, setCameraWarnings] = useState<CameraProximityWarning[]>([]);
  const [dismissedCameraIds, setDismissedCameraIds] = useState<Set<string>>(new Set());
  const [currentSpeedLimit, setCurrentSpeedLimit] = useState<number | null>(null);
  
  // Voice & Emotion settings state
  const [voiceStyle, setVoiceStyleState] = useState<VoiceStyle>(() => {
    return PreferencesService.getPreferences().voiceStyle;
  });
  const [emotionAdaptive, setEmotionAdaptiveState] = useState(() => {
    return PreferencesService.getPreferences().emotionAdaptive;
  });
  const [hapticsIntensity, setHapticsIntensityState] = useState(() => {
    return PreferencesService.getPreferences().hapticsIntensity;
  });
  const [ecoEstimate, setEcoEstimate] = useState<EcoEstimate | null>(null);
  const [isElectricVehicle, setIsElectricVehicle] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [severeWeatherDismissed, setSevereWeatherDismissed] = useState(false);
  // Derive mode flags from uiMode (no separate state needed)
  const is3DMode = uiMode === UiMode.THREED || uiMode === UiMode.CINEMATIC;
  const cinematicMode = uiMode === UiMode.CINEMATIC;
  const [mapTheme, setMapTheme] = useState<MapTheme>('auto');
  const [radarEnabled, setRadarEnabled] = useState(false);
  const [radarOpacity, setRadarOpacity] = useState(0.6);
  const [rerouteSettings, setRerouteSettings] = useState(PreferencesService.getPreferences().rerouteSettings);
  const [weatherLighting, setWeatherLighting] = useState(true);
  const [motionPolish, setMotionPolish] = useState(true);
  const [radarPulse, setRadarPulse] = useState(true);
  const [nightVisionIntensity, setNightVisionIntensity] = useState(50);
  const [nightVisionThermalMode, setNightVisionThermalMode] = useState(false);
  const [region, setRegion] = useState<Region>(PreferencesService.getPreferences().region);

  const [origin, setOrigin] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [originCoords, setOriginCoords] = useState<[number, number]>([37.7749, -122.4194]);
  const [destinationCoords, setDestinationCoords] = useState<[number, number] | null>(null);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [laneSegments, setLaneSegments] = useState<Map<number, LaneSegment>>(new Map());
  const [currentNavigationPosition, setCurrentNavigationPosition] = useState<[number, number] | undefined>();
  const positionUpdateTimerRef = useRef<number | null>(null);

  const handleRouteUpdate = useCallback((newRoute: RouteResult) => {
    setRouteResult(newRoute);
    setRoute(newRoute.geometry);
    setDismissedCameraIds(new Set());
    
    // Extract lane data from route steps
    const laneData = getLaneDataForRoute(newRoute.steps);
    setLaneSegments(laneData);
    
    // Initialize navigation position to start of route
    if (newRoute.geometry.length > 0) {
      setCurrentNavigationPosition(newRoute.geometry[0]);
    }
    
    const distanceKm = newRoute.distance / 1000;
    const durationMin = newRoute.duration / 60;
    
    const estimate = calculateTripEstimate({
      distanceKm,
      durationMin,
      vehicleType,
      ecoMode
    });
    setTripEstimate(estimate);

    if (ecoMode && newRoute.geometry.length > 0) {
      const eco = calculateEcoEstimate(
        distanceKm,
        durationMin,
        transportMode,
        isElectricVehicle
      );
      setEcoEstimate(eco);
    } else {
      setEcoEstimate(null);
    }

    if (newRoute.geometry.length > 0 && speedCameras.length > 0) {
      const cameras = detectCamerasOnRoute(newRoute.geometry, speedCameras);
      setCameraWarnings(cameras);
    } else {
      setCameraWarnings([]);
    }

    reroutingService.setInitialETA(newRoute.duration);
    reroutingService.updateCurrentETA(newRoute.duration);
  }, [vehicleType, ecoMode, transportMode, routePreference, speedCameras]);

  const rerouting = useRerouting({
    routeResult,
    origin: originCoords,
    destination: destinationCoords,
    transportMode,
    routePreference,
    rerouteSettings,
    onRouteUpdate: handleRouteUpdate,
  });

  const recentSearches: SearchResult[] = [];

  useEffect(() => {
    const prefs = PreferencesService.getPreferences();
    
    let mounted = true;
    
    TripHistoryService.getSmartDefaults()
      .then(smartDefaults => {
        if (!mounted) return;
        if (smartDefaults) {
          setTransportMode(smartDefaults.transportMode);
          setRoutePreference(smartDefaults.routePreference);
        } else {
          setTransportMode(prefs.transportMode);
          setRoutePreference(prefs.routePreference);
        }
      })
      .catch(err => {
        console.error('[Home] Failed to load smart defaults:', err);
        if (!mounted) return;
        setTransportMode(prefs.transportMode);
        setRoutePreference(prefs.routePreference);
      });

    setEcoMode(prefs.ecoMode);
    setVehicleType(prefs.vehicleType);
    setVoiceEnabledState(prefs.voiceGuidance);
    setVoiceEnabled(prefs.voiceGuidance);
    setVoiceVolumeState(prefs.voiceVolume);
    setVoiceVolume(prefs.voiceVolume);
    setHapticsEnabled(prefs.hapticsEnabled);
    setHazardAlertsEnabled(prefs.hazardAlerts);
    setShowSpeedCameras(prefs.showSpeedCameras);
    setSpeedWarnings(prefs.speedWarnings);
    setSpeedUnit(prefs.speedUnit);
    // cinematicMode is now derived from uiMode (ModeService handles this)
    setMapTheme(prefs.mapTheme);
    setRadarEnabled(prefs.radarEnabled);
    setRadarOpacity(prefs.radarOpacity);
    setRerouteSettings(prefs.rerouteSettings);
    setWeatherLighting(prefs.realismPack.weatherLighting);
    setMotionPolish(prefs.realismPack.motionPolish);
    setRadarPulse(prefs.realismPack.radarPulse);
    setNightVisionIntensity(prefs.nightVision.intensity);
    setNightVisionThermalMode(prefs.nightVision.thermalMode);

    getSpeedCameras().then(cameras => {
      if (mounted) {
        setSpeedCameras(cameras);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  // ⚠️ DEVELOPMENT MODE: Load demo navigation UI on mount for testing
  useEffect(() => {
    if (import.meta.env.DEV && DEV_NAV_DEMO_MODE && !routeResult) {
      console.log('[Home] 🎬 Loading DEV demo navigation for testing');
      
      // Set origin and destination
      setOrigin(DEMO_ORIGIN);
      setDestination(DEMO_DESTINATION);
      setOriginCoords(DEMO_ORIGIN_COORDS);
      setDestinationCoords(DEMO_DESTINATION_COORDS);
      
      // Center map on route
      setMapCenter(DEMO_ORIGIN_COORDS);
      setMapZoom(12);
      
      // Load mock route and trigger all dependent state updates
      handleRouteUpdate(MOCK_ROUTE);
      
      // Enable route display
      setShowRoute(true);
      
      // Set mock speed limit for HUD
      setCurrentSpeedLimit(MOCK_SPEED_LIMIT);
      
      // Set trip estimate (handleRouteUpdate also calculates this, but we can override)
      setTripEstimate(MOCK_TRIP_ESTIMATE);
      
      console.log('[Home] ✅ DEV demo navigation loaded - All navigation UI should be visible');
    }
  }, []); // Run once on mount, ignore handleRouteUpdate dependency to prevent loops

  const handleTransportModeChange = (mode: TransportMode) => {
    setTransportMode(mode);
    PreferencesService.updatePreference('transportMode', mode);
    
    if (mode === 'car') {
      setVehicleType('car');
    } else if (mode === 'bike') {
      setVehicleType('bike');
    } else if (mode === 'walk') {
      setVehicleType('walk');
    }
  };

  const handleRoutePreferenceChange = (pref: RoutePreference) => {
    setRoutePreference(pref);
    PreferencesService.updatePreference('routePreference', pref);
  };

  const handleEcoModeChange = (enabled: boolean) => {
    setEcoMode(enabled);
    PreferencesService.updatePreference('ecoMode', enabled);
  };

  const handleVehicleTypeChange = (type: VehicleType) => {
    setVehicleType(type);
    PreferencesService.updatePreference('vehicleType', type);
  };

  const handleVoiceEnabledChange = (enabled: boolean) => {
    setVoiceEnabledState(enabled);
    setVoiceEnabled(enabled);
    PreferencesService.updatePreference('voiceGuidance', enabled);
  };

  const handleVoiceVolumeChange = (volume: number) => {
    setVoiceVolumeState(volume);
    setVoiceVolume(volume);
    PreferencesService.updatePreference('voiceVolume', volume);
  };

  const handleHapticsEnabledChange = (enabled: boolean) => {
    setHapticsEnabled(enabled);
    setHapticsEnabledPref(enabled);
  };

  const handleHazardAlertsChange = (enabled: boolean) => {
    setHazardAlertsEnabled(enabled);
    PreferencesService.updatePreference('hazardAlerts', enabled);
  };

  const handleShowSpeedCamerasChange = (enabled: boolean) => {
    setShowSpeedCameras(enabled);
    PreferencesService.updatePreference('showSpeedCameras', enabled);
  };

  const handleSpeedWarningsChange = (enabled: boolean) => {
    setSpeedWarnings(enabled);
    PreferencesService.updatePreference('speedWarnings', enabled);
  };

  const handleSpeedUnitChange = (unit: SpeedUnit) => {
    setSpeedUnit(unit);
    PreferencesService.updatePreference('speedUnit', unit);
  };

  const handleWeatherLightingChange = (enabled: boolean) => {
    setWeatherLighting(enabled);
    const prefs = PreferencesService.getPreferences();
    PreferencesService.updatePreference('realismPack', {
      ...prefs.realismPack,
      weatherLighting: enabled
    });
  };

  const handleMotionPolishChange = (enabled: boolean) => {
    setMotionPolish(enabled);
    const prefs = PreferencesService.getPreferences();
    PreferencesService.updatePreference('realismPack', {
      ...prefs.realismPack,
      motionPolish: enabled
    });
  };

  const handleRadarPulseChange = (enabled: boolean) => {
    setRadarPulse(enabled);
    const prefs = PreferencesService.getPreferences();
    PreferencesService.updatePreference('realismPack', {
      ...prefs.realismPack,
      radarPulse: enabled
    });
  };

  const handleNightVisionIntensityChange = (intensity: number) => {
    setNightVisionIntensity(intensity);
    const prefs = PreferencesService.getPreferences();
    PreferencesService.updatePreference('nightVision', {
      ...prefs.nightVision,
      intensity
    });
  };

  const handleNightVisionThermalModeChange = (enabled: boolean) => {
    setNightVisionThermalMode(enabled);
    const prefs = PreferencesService.getPreferences();
    PreferencesService.updatePreference('nightVision', {
      ...prefs.nightVision,
      thermalMode: enabled
    });
  };

  const handleRegionChange = (newRegion: Region) => {
    setRegion(newRegion);
    PreferencesService.updatePreference('region', newRegion);
    RegionDetector.setRegion(newRegion);
  };

  // Cinematic mode is now derived from uiMode (UiMode.CINEMATIC)

  const handleVoiceStyleChange = (style: VoiceStyle) => {
    setVoiceStyleState(style);
    PreferencesService.updatePreference('voiceStyle', style);
  };

  const handleEmotionAdaptiveChange = (enabled: boolean) => {
    setEmotionAdaptiveState(enabled);
    PreferencesService.updatePreference('emotionAdaptive', enabled);
  };

  const handleHapticsIntensityChange = (intensity: number) => {
    setHapticsIntensityState(intensity);
    PreferencesService.updatePreference('hapticsIntensity', intensity);
  };

  const handleMapThemeChange = () => {
    const nextTheme = getNextTheme(mapTheme);
    setMapTheme(nextTheme);
    PreferencesService.updatePreference('mapTheme', nextTheme);
    
    const resolvedTheme = resolveTheme(nextTheme, mapCenter[0], mapCenter[1]);
    toast({
      title: `Map Theme: ${getThemeLabel(nextTheme, resolvedTheme)}`,
      description: nextTheme === 'auto' 
        ? `Automatically switching to ${resolvedTheme} mode based on time of day`
        : `Manually set to ${nextTheme} mode`
    });
  };

  const handleRadarToggle = () => {
    const newValue = !radarEnabled;
    setRadarEnabled(newValue);
    PreferencesService.updatePreference('radarEnabled', newValue);
    toast({
      title: newValue ? "Weather Radar ON" : "Weather Radar OFF",
      description: newValue ? "Live weather radar overlay enabled" : "Weather radar overlay disabled"
    });
  };

  const handleRadarOpacityChange = (value: number[]) => {
    const newOpacity = value[0];
    setRadarOpacity(newOpacity);
    PreferencesService.updatePreference('radarOpacity', newOpacity);
  };

  const handleRadarError = (error: string) => {
    toast({
      title: "Weather Radar Unavailable",
      description: error,
      variant: "destructive"
    });
  };

  const handleSelectFavorite = (favorite: Favorite) => {
    setDestination(favorite.address);
    setDestinationCoords(favorite.coordinates);
    toast({
      title: "Destination set",
      description: `Navigating to ${favorite.name}`
    });
  };

  const handleReplayTrip = (trip: TripRecord) => {
    setOrigin(trip.origin);
    setDestination(trip.destination);
    setTransportMode(trip.transportMode);
    setRoutePreference(trip.routePreference);
    toast({
      title: "Trip replayed",
      description: `Replaying trip from ${trip.origin} to ${trip.destination}`
    });
  };

  useEffect(() => {
    if (!hazardAlertsEnabled) {
      setNearbyHazards([]);
      return;
    }

    const checkNearbyHazards = () => {
      const currentPos = mapCenter;
      const nearby: Hazard[] = [];

      mockHazards.forEach((hazard) => {
        const distance = calculateDistance(
          currentPos[0],
          currentPos[1],
          hazard.coordinates[0],
          hazard.coordinates[1]
        );

        if (distance <= hazard.alertRadius) {
          nearby.push(hazard);
          
          const message = getHazardWarningMessage(hazard, distance);
          announce(message, {
            priority: hazard.severity === 'high' ? 'high' : 'normal',
            entityId: hazard.id,
            throttleMs: 45000
          });
        }
      });

      setNearbyHazards(nearby);
    };

    checkNearbyHazards();
  }, [mapCenter, hazardAlertsEnabled]);

  useEffect(() => {
    if (showRoute) {
      const distanceKm = 5.6;
      const durationMin = 15;

      const estimate = calculateTripEstimate({
        distanceKm,
        durationMin,
        vehicleType,
        ecoMode
      });

      setTripEstimate(estimate);
    } else {
      setTripEstimate(null);
    }
  }, [showRoute, vehicleType, ecoMode]);

  const geocodeAddress = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      geocodeFetcher.current.cancel();
      return;
    }

    setIsSearching(true);
    
    const results = await geocodeFetcher.current.fetch<GeocodingResult[]>(async (signal) => {
      return searchPlaces(query, {
        signal,
        limit: 5,
        proximity: mapCenter
      });
    });

    if (results === null) {
      setIsSearching(false);
      return;
    }

    const searchResults: SearchResult[] = results.map((result, index) => ({
      id: `${result.placeName}-${index}`,
      name: result.placeName,
      address: result.address,
      category: 'Location',
      coordinates: result.coordinates
    }));

    if (searchResults.length === 0) {
      toast({
        title: 'Location not found',
        description: 'Please try another address or place name.'
      });
    }

    setSearchResults(searchResults);
    setIsSearching(false);
  }, [mapCenter, toast]);

  const handleSearch = (query: string) => {
    geocodeAddress(query);
  };

  const handleSearchSubmit = (query: string) => {
    geocodeAddress(query);
  };

  const handleResultSelect = (result: SearchResult) => {
    console.log('[ResultSelect] Selected:', {
      name: result.name,
      coordinates: result.coordinates,
      isOrigin: !origin
    });
    
    // Validate coordinates before setting map center
    const validatedCoords = validateCoordinates(result.coordinates, 'search result selection');
    setMapCenter(validatedCoords);
    setMapZoom(15);
    setMarkers([{ lat: validatedCoords[0], lng: validatedCoords[1], label: result.name }]);
    setSearchResults([]);
    
    if (!origin) {
      console.log('[ResultSelect] Setting as origin:', result.coordinates);
      setOrigin(result.name);
      setOriginCoords(result.coordinates);
    } else {
      console.log('[ResultSelect] Setting as destination:', result.coordinates);
      setDestination(result.name);
      setDestinationCoords(result.coordinates);
    }
  };

  const handleCalculateRoute = useCallback(async () => {
    if (!destinationCoords) return;
    if (!originCoords || !Array.isArray(originCoords) || originCoords.length !== 2) {
      console.error('[Route] Invalid origin coordinates:', originCoords);
      toast({
        title: 'Route Error',
        description: 'Invalid origin location. Please select a starting point.',
        variant: 'destructive'
      });
      return;
    }

    if (routeAbortControllerRef.current) {
      routeAbortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    routeAbortControllerRef.current = abortController;

    setIsCalculatingRoute(true);
    setShowRoute(true);
    setRouteResult(null);
    
    console.log('[Route] Calculating with coords:', { 
      origin: originCoords, 
      destination: destinationCoords 
    });
    
    const result = await routeFetcher.current.fetch<RouteResult>(async (signal) => {
      return calculateRoute(
        originCoords,
        destinationCoords,
        transportMode,
        routePreference,
        signal
      );
    });

    if (result === null || abortController.signal.aborted) {
      setIsCalculatingRoute(false);
      return;
    }

    try {
      setRouteResult(result);
      setRoute(result.geometry);
      
      setMarkers([
        { lat: originCoords[0], lng: originCoords[1], label: origin || 'Origin' },
        { lat: destinationCoords[0], lng: destinationCoords[1], label: destination }
      ]);

      const warnings = detectCamerasOnRoute(result.geometry, speedCameras);
      setCameraWarnings(warnings);
      setDismissedCameraIds(new Set());

      if (ecoMode) {
        const isEV = vehicleType === 'ev';
        const estimate = calculateEcoEstimate(
          result.distance,
          result.duration,
          transportMode,
          isEV
        );
        setEcoEstimate(estimate);
      } else {
        setEcoEstimate(null);
      }

      const distanceKm = result.distance / 1000;
      const durationMin = result.duration / 60;
      
      const estimate = calculateTripEstimate({
        distanceKm,
        durationMin,
        vehicleType,
        ecoMode
      });
      setTripEstimate(estimate);
    } catch (error) {
      console.error('Route calculation error:', error);
      toast({
        title: 'Route Error',
        description: error instanceof Error ? error.message : 'Failed to calculate route',
        variant: 'destructive'
      });
      setRouteResult(null);
      setRoute(undefined);
      setShowRoute(false);
    } finally {
      setIsCalculatingRoute(false);
    }
  }, [originCoords, destinationCoords, transportMode, routePreference, origin, destination, vehicleType, ecoMode, speedCameras, toast]);

  useEffect(() => {
    if (destinationCoords) {
      handleCalculateRoute();
      setShowChat(false);
    }
  }, [destinationCoords, transportMode, routePreference, handleCalculateRoute]);

  useEffect(() => {
    const limit = getCurrentSpeedLimit(mapCenter, speedCameras);
    setCurrentSpeedLimit(limit);
  }, [mapCenter, speedCameras]);

  useEffect(() => {
    if (weatherData.length > 0 && getSevereWeatherWarning(weatherData)) {
      setSevereWeatherDismissed(false);
    }
  }, [weatherData]);

  const handleDismissCamera = useCallback((cameraId: string) => {
    setDismissedCameraIds(prev => new Set(prev).add(cameraId));
  }, []);

  const activeWarning = cameraWarnings.find(w => !dismissedCameraIds.has(w.camera.id));

  // Compute isDarkMode from mapTheme
  const isDarkMode = mapTheme === 'night' || (mapTheme === 'auto' && resolveTheme(mapTheme, mapCenter[0], mapCenter[1]) === 'night');

  useEffect(() => {
    if (activeWarning && voiceEnabled) {
      const isCritical = activeWarning.distance < 300;
      const cameraMessage = isCritical 
        ? `<break time="200ms"/>Speed camera ahead<break time="400ms"/>${Math.round(activeWarning.distance)} meters<break time="300ms"/>Limit ${activeWarning.camera.speedLimitKmh} kilometers per hour`
        : `Speed camera ahead in ${Math.round(activeWarning.distance)} meters. Limit ${activeWarning.camera.speedLimitKmh} kilometers per hour.`;
      
      announce(cameraMessage, { 
        priority: 'high',
        entityId: `camera-${activeWarning.camera.id}`,
        throttleMs: 60000,
        isCritical: isCritical,
        ssml: isCritical
      });
    }
  }, [activeWarning?.camera.id, voiceEnabled]);

  const handleSendMessage = async (message: string) => {
    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: message,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setIsChatLoading(true);

    try {
      const currentHistory = [...chatMessages, userMessage];
      
      const routeSummary = routeResult 
        ? `${formatDistance(routeResult.distance)}, ETA ${formatDuration(routeResult.duration)}`
        : undefined;
      
      const nearbyCameras = cameraWarnings.map(w => 
        `Speed camera in ${Math.round(w.distance)}m, limit ${w.camera.speedLimitKmh} km/h`
      );
      
      const weatherStatus = weatherData.length > 0
        ? weatherData.map(w => `${w.location}: ${w.description}, ${Math.round(w.temperature)}°C`).join('; ')
        : undefined;
      
      const context: ChatContext = {
        origin,
        destination,
        transportMode,
        ecoMode,
        hazardsOnRoute: nearbyHazards.map(h => h.description),
        routeSummary,
        nearbyCameras,
        weatherConditions: weatherStatus
      };

      const responseText = await sendChatMessage(
        message,
        currentHistory.map(m => ({ role: m.role, content: m.content })),
        context
      );

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: responseText,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      toast({
        title: 'Chat Error',
        description: error instanceof Error ? error.message : 'Failed to get AI response',
        variant: 'destructive'
      });
      
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const dismissHazardAlert = (hazardId: string) => {
    setNearbyHazards((prev) => prev.filter((h) => h.id !== hazardId));
  };

  useEffect(() => {
    if (rerouting.isNavigating && routeResult && routeResult.geometry.length > 0) {
      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex < routeResult.geometry.length) {
          const position = routeResult.geometry[currentIndex];
          rerouting.updatePosition(position);
          currentIndex += Math.floor(routeResult.geometry.length / 20);
        } else {
          clearInterval(interval);
        }
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [rerouting.isNavigating, routeResult]);

  const handleStartNavigation = async () => {
    if (origin && destination && routeResult && originCoords && destinationCoords) {
      const distanceKm = routeResult.distance / 1000;
      const durationMin = routeResult.duration / 60;
      
      await TripHistoryService.addTrip(
        {
          origin,
          destination,
          transportMode,
          routePreference,
          distance: distanceKm,
          duration: durationMin
        },
        { lat: originCoords[0], lng: originCoords[1] },
        { lat: destinationCoords[0], lng: destinationCoords[1] }
      );
      
      if (voiceEnabled) {
        announce(
          `Navigation started. Distance ${formatDistance(routeResult.distance)}, estimated time ${formatDuration(routeResult.duration)}.`,
          { priority: 'high' }
        );
      }

      if (voiceEnabled && routeResult.steps.length > 0) {
        const firstStep = routeResult.steps[0];
        if (firstStep) {
          setTimeout(() => {
            announce(firstStep.instruction, { priority: 'normal' });
          }, 3000);
        }
        
        const secondStep = routeResult.steps[1];
        if (secondStep && secondStep.distance > 100) {
          setTimeout(() => {
            const distance = Math.round(secondStep.distance);
            announce(`In ${distance} meters, ${secondStep.instruction}`, { priority: 'normal' });
          }, 8000);
        }
      }

      setSevereWeatherDismissed(false);
      
      try {
        console.log('[Weather] Fetching weather for route...');
        const [originWeather, destWeather] = await Promise.all([
          fetchWeather(originCoords[0], originCoords[1], origin),
          fetchWeather(destinationCoords[0], destinationCoords[1], destination)
        ]);
        
        setWeatherData([originWeather, destWeather]);
        
        const warning = getSevereWeatherWarning([originWeather, destWeather]);
        if (warning && voiceEnabled) {
          announce(warning, { priority: 'high' });
        }
        
        console.log('[Weather] Weather data loaded:', { originWeather, destWeather });
      } catch (error) {
        console.error('[Weather] Failed to fetch weather:', error);
      }

      if (!rerouting.isNavigating) {
        rerouting.startNavigation();
      }
    }
  };

  const handleARFallbackTo3D = () => {
    setUiMode(UiMode.THREED);
    toast({
      title: "Switched to 3D Mode",
      description: "AR mode is unavailable, using 3D map instead",
    });
  };

  const handleCloseAR = () => {
    setUiMode(UiMode.THREED);
  };

  // Mode toggle handler for long-press gesture (Classic ↔ 3D)
  const handleModeToggle = useCallback(() => {
    const currentMode = uiMode;
    const newMode = currentMode === UiMode.CLASSIC ? UiMode.THREED : UiMode.CLASSIC;
    ModeService.setMode(newMode);
  }, [uiMode]);

  // WebGL fallback check on mode changes
  const lastToastedFallbackRef = useRef<string | null>(null);
  useEffect(() => {
    const capabilities = getDeviceCapabilities();
    
    // Check if current mode is supported
    const bestMode = getBestSupportedMode(uiMode, capabilities);
    
    if (bestMode !== uiMode) {
      // Mode is unsupported, need to fallback
      
      // Create a unique key for this fallback combination
      const fallbackKey = `${uiMode}->${bestMode}`;
      
      // Always enforce fallback
      ModeService.setMode(bestMode);
      
      // Only show toast if this specific fallback hasn't been toasted yet
      if (lastToastedFallbackRef.current !== fallbackKey) {
        lastToastedFallbackRef.current = fallbackKey;
        toast({
          title: "Switched to supported mode",
          description: `${uiMode} mode is unavailable on this device. Using ${bestMode} mode instead.`,
        });
      }
    }
    // Don't clear the ref when mode is supported - keep toast suppression
  }, [uiMode, toast]); // Monitor uiMode changes

  return (
    <div className="h-screen w-screen overflow-hidden flex">
      <HUDFlashAlert />
      <div className="flex-1 relative">
        {uiMode === UiMode.AR ? (
          <ARView
            currentPosition={currentNavigationPosition}
            currentSpeed={0}
            speedLimit={currentSpeedLimit ?? undefined}
            heading={0}
            routeSteps={routeResult?.steps}
            nextManeuver={routeResult?.steps?.[0] ? {
              direction: routeResult.steps[0].instruction,
              distance: routeResult.steps[0].distance,
              lat: routeResult.steps[0].maneuver.location[0],
              lng: routeResult.steps[0].maneuver.location[1]
            } : undefined}
            speedCameras={speedCameras}
            onClose={handleCloseAR}
            onFallbackTo3D={handleARFallbackTo3D}
          />
        ) : (
          <MapboxMap
            center={mapCenter}
            zoom={mapZoom}
            markers={markers}
            route={route}
            hazards={hazardAlertsEnabled ? mockHazards : []}
            speedCameras={speedCameras}
            showSpeedCameras={showSpeedCameras}
            is3DMode={is3DMode}
            cinematicMode={cinematicMode}
            uiMode={uiMode}
            mapTheme={mapTheme}
            laneData={laneSegments}
            currentPosition={currentNavigationPosition}
            radarEnabled={radarEnabled}
            radarOpacity={radarOpacity}
            onRadarError={handleRadarError}
            routeSteps={routeResult?.steps}
            speed={0}
            weather={weatherData[0]}
            distanceToNextStep={routeResult?.steps?.[0]?.distance || Infinity}
            distanceToStepAfterNext={routeResult?.steps?.[1]?.distance}
            weatherLightingEnabled={weatherLighting}
            motionPolishEnabled={motionPolish}
            isDarkMode={isDarkMode}
            onModeToggleRequest={handleModeToggle}
          />
        )}

        {uiMode !== UiMode.AR && (
          <div className="absolute top-0 left-0 right-0 p-4 z-30">
            <div className="max-w-2xl mx-auto space-y-3">
              <div className="flex items-center gap-2">
              <div className="flex-1">
                <SearchBar
                  onSearch={handleSearch}
                  onSubmit={handleSearchSubmit}
                  onResultSelect={handleResultSelect}
                  results={searchResults}
                  recentSearches={recentSearches}
                  isLoading={isSearching}
                />
              </div>
              <div data-car-mode-hide>
                <Favorites onSelectFavorite={handleSelectFavorite} />
              </div>
              <div data-car-mode-hide>
                <TripHistory onReplayTrip={handleReplayTrip} />
              </div>
              <div data-car-mode-hide>
                <ReportButton currentLocation={mapCenter} />
              </div>
              <Settings
                uiMode={uiMode}
                onUiModeChange={setUiMode}
                spatialAudio={spatialAudio}
                onSpatialAudioChange={setSpatialAudio}
                ambientMusic={ambientMusic}
                onAmbientMusicChange={setAmbientMusic}
                transportMode={transportMode}
                onTransportModeChange={handleTransportModeChange}
                routePreference={routePreference}
                onRoutePreferenceChange={handleRoutePreferenceChange}
                ecoMode={ecoMode}
                onEcoModeChange={handleEcoModeChange}
                vehicleType={vehicleType}
                onVehicleTypeChange={handleVehicleTypeChange}
                voiceEnabled={voiceEnabled}
                onVoiceEnabledChange={handleVoiceEnabledChange}
                voiceVolume={voiceVolume}
                onVoiceVolumeChange={handleVoiceVolumeChange}
                voiceStyle={voiceStyle}
                onVoiceStyleChange={handleVoiceStyleChange}
                emotionAdaptive={emotionAdaptive}
                onEmotionAdaptiveChange={handleEmotionAdaptiveChange}
                hapticsEnabled={hapticsEnabled}
                onHapticsEnabledChange={handleHapticsEnabledChange}
                hapticsIntensity={hapticsIntensity}
                onHapticsIntensityChange={handleHapticsIntensityChange}
                hazardAlertsEnabled={hazardAlertsEnabled}
                onHazardAlertsChange={handleHazardAlertsChange}
                showSpeedCameras={showSpeedCameras}
                onShowSpeedCamerasChange={handleShowSpeedCamerasChange}
                speedWarnings={speedWarnings}
                onSpeedWarningsChange={handleSpeedWarningsChange}
                speedUnit={speedUnit}
                onSpeedUnitChange={handleSpeedUnitChange}
                voiceSupported={isVoiceSupported()}
                hapticsSupported={isHapticsSupported()}
                weatherLighting={weatherLighting}
                onWeatherLightingChange={handleWeatherLightingChange}
                motionPolish={motionPolish}
                onMotionPolishChange={handleMotionPolishChange}
                radarPulse={radarPulse}
                onRadarPulseChange={handleRadarPulseChange}
                nightVisionIntensity={nightVisionIntensity}
                onNightVisionIntensityChange={handleNightVisionIntensityChange}
                nightVisionThermalMode={nightVisionThermalMode}
                onNightVisionThermalModeChange={handleNightVisionThermalModeChange}
                region={region}
                onRegionChange={handleRegionChange}
              />
              <ThemeToggle />
              <CarModeToggle />
            </div>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
              <TransportModeSelector
                value={transportMode}
                onChange={handleTransportModeChange}
              />
              <RoutePreferenceSelector
                value={routePreference}
                onChange={handleRoutePreferenceChange}
              />
            </div>
          </div>
        </div>
        )}

        {/* Reroute Banner and UI overlays (hidden in AR mode) */}
        {uiMode !== UiMode.AR && (
          <>
            <RerouteBanner
              rerouteOption={rerouting.rerouteOption}
              onAccept={() => rerouting.acceptReroute(rerouting.rerouteOption!)}
              onIgnore={rerouting.ignoreReroute}
            />

            <div className="absolute top-20 left-4 right-4 z-20 max-w-md mx-auto space-y-2">
          {!severeWeatherDismissed && weatherData.length > 0 && getSevereWeatherWarning(weatherData) && (
            <SevereWeatherAlert
              message={getSevereWeatherWarning(weatherData)!}
              onDismiss={() => setSevereWeatherDismissed(true)}
            />
          )}
          
          {activeWarning && (
            <CameraProximityAlert
              camera={activeWarning.camera}
              distance={activeWarning.distance}
              onDismiss={() => handleDismissCamera(activeWarning.camera.id)}
              radarPulseEnabled={radarPulse}
            />
          )}
          
          {hazardAlertsEnabled && nearbyHazards.slice(0, 2).map((hazard) => {
            const distance = calculateDistance(
              mapCenter[0],
              mapCenter[1],
              hazard.coordinates[0],
              hazard.coordinates[1]
            );
            return (
              <HazardAlert
                key={hazard.id}
                hazard={hazard}
                distance={distance}
                onDismiss={() => dismissHazardAlert(hazard.id)}
              />
            );
          })}
        </div>

        <div className="absolute top-24 left-4 z-20 space-y-2">
          <SpeedLimitHUD
            speedLimit={currentSpeedLimit}
            transportMode={transportMode}
          />
          <PredictiveSafetyBadge data-testid="component-predictive-safety-badge" />
          {radarEnabled && (
            <div className="bg-card/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg max-w-xs">
              <Label htmlFor="radar-opacity" className="text-sm font-medium mb-2 block">
                Radar Opacity: {Math.round(radarOpacity * 100)}%
              </Label>
              <Slider
                id="radar-opacity"
                min={0.3}
                max={0.8}
                step={0.1}
                value={[radarOpacity]}
                onValueChange={handleRadarOpacityChange}
                className="w-full"
                data-testid="slider-radar-opacity"
              />
            </div>
          )}
        </div>

        {/* Desktop: Mode Switcher at top-right */}
        <div className="absolute top-4 right-4 z-30 hidden md:block">
          <ModeSwitcher onUpgradeClick={() => setShowPaywall(true)} />
        </div>

        {/* Mobile: Compact Mode Switcher at bottom-center */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 md:hidden">
          <ModeSwitcherCompact onUpgradeClick={() => setShowPaywall(true)} />
        </div>

        {/* Control cluster: bottom-right */}
        <div className="absolute bottom-6 right-6 z-30 flex flex-col gap-2">
          <Button
            size="icon"
            variant={radarEnabled ? "default" : "outline"}
            className="rounded-full shadow-lg"
            onClick={handleRadarToggle}
            title={radarEnabled ? "Weather Radar ON" : "Weather Radar OFF"}
            data-testid="button-toggle-radar"
          >
            {radarEnabled ? <Cloud className="h-5 w-5" /> : <CloudOff className="h-5 w-5" />}
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="rounded-full shadow-lg"
            onClick={handleMapThemeChange}
            title={`Map Theme: ${getThemeLabel(mapTheme, resolveTheme(mapTheme, mapCenter[0], mapCenter[1]))}`}
            data-testid="button-toggle-theme"
          >
            {mapTheme === 'night' ? (
              <Moon className="h-5 w-5" />
            ) : mapTheme === 'day' ? (
              <Sun className="h-5 w-5" />
            ) : (
              resolveTheme(mapTheme, mapCenter[0], mapCenter[1]) === 'day' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )
            )}
          </Button>
          <MapControls
            onZoomIn={() => setMapZoom((z) => Math.min(z + 1, 18))}
            onZoomOut={() => setMapZoom((z) => Math.max(z - 1, 3))}
            onLayersToggle={() => toast({ title: 'Layers', description: 'Layer toggle coming soon' })}
            onCurrentLocation={() => {
              setMapCenter(getZurichFallback());
              setMapZoom(13);
            }}
          />
        </div>

            {hazardAlertsEnabled && (
              <div className="absolute bottom-6 left-4 z-20">
                <HazardLegend />
              </div>
            )}

            {(tripEstimate || ecoEstimate || weatherData.length > 0) && (
              <div className="absolute bottom-32 left-4 z-20 max-w-sm space-y-2">
                {weatherData.length > 0 && <WeatherPanel weatherData={weatherData} />}
                {ecoEstimate && uiMode === UiMode.ECO && <EcoSummary estimate={ecoEstimate} />}
                {tripEstimate && (
                  <TripSummary
                    estimate={tripEstimate}
                    vehicleType={vehicleType}
                    ecoMode={ecoMode}
                  />
                )}
              </div>
            )}

            {showRoute && destinationCoords && (
              <div className="absolute top-20 left-4 z-30 max-w-md">
                <RoutePanel
                  origin={origin || "Current Location"}
                  destination={destination || "Destination"}
                  route={routeResult ? {
                    name: `${routePreference.charAt(0).toUpperCase() + routePreference.slice(1)} Route`,
                    distance: formatDistance(routeResult.distance),
                    duration: formatDuration(routeResult.duration),
                    steps: routeResult.steps.map(step => ({
                      instruction: step.instruction,
                      distance: formatDistance(step.distance),
                      icon: getManeuverIcon(step.maneuver.type, step.maneuver.modifier)
                    }))
                  } : null}
                  isLoading={isCalculatingRoute}
                  isNavigating={rerouting.isNavigating}
                  onClose={() => {
                    rerouting.stopNavigation();
                    setShowRoute(false);
                    setDestination('');
                    setDestinationCoords(null);
                    setRouteResult(null);
                    setRoute(undefined);
                    setTripEstimate(null);
                    setWeatherData([]);
                    setSevereWeatherDismissed(false);
                    setCameraWarnings([]);
                    setEcoEstimate(null);
                  }}
                  onStartNavigation={handleStartNavigation}
                  onStopNavigation={rerouting.stopNavigation}
                />
              </div>
            )}

            {selectedReport && (
              <div className="absolute bottom-24 right-6 z-20" data-testid="selected-report-popup">
                <CommunityReportMarker report={selectedReport} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedReport(null)}
                  className="mt-2 w-full"
                  data-testid="button-close-report"
                >
                  Close
                </Button>
              </div>
            )}

            {communityReports.length > 0 && !selectedReport && (
              <div className="absolute top-32 right-4 z-20 max-h-64 overflow-y-auto" data-car-mode-hide>
                <div className="bg-card/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border w-64">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold">Reports ({communityReports.length})</h3>
                    <select
                      value={minTrustScore}
                      onChange={(e) => setMinTrustScore(Number(e.target.value))}
                      className="text-xs border rounded px-2 py-1 bg-background"
                      data-testid="select-trust-filter"
                    >
                      <option value="0">All</option>
                      <option value="40">40%+ Trust</option>
                      <option value="70">70%+ Trust</option>
                    </select>
                  </div>
                  {communityReports.slice(0, 5).map((report) => (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className="w-full text-left p-2 rounded hover-elevate active-elevate-2 mb-1 last:mb-0 border"
                      data-testid={`button-view-report-${report.id}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium truncate">
                          {report.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {report.trustScore}%
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                        <span>✓ {report.confirmations}</span>
                        <span>✗ {report.rejections}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!showChat && (
              <div className="absolute bottom-6 right-6 z-20 lg:hidden" data-car-mode-hide>
                <Button
                  size="lg"
                  className="rounded-full shadow-lg h-14 w-14"
                  onClick={() => setShowChat(true)}
                  data-testid="button-open-chat"
                >
                  <MessageSquare className="h-6 w-6" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <div className={`${showChat ? 'fixed inset-0 z-[100] lg:relative lg:inset-auto' : 'hidden'} lg:flex lg:w-96`} data-car-mode-hide>
        <Suspense fallback={
          <div className="flex items-center justify-center h-full w-full bg-card">
            <div className="text-muted-foreground">Loading chat...</div>
          </div>
        }>
          <ChatPanel
            onClose={() => setShowChat(false)}
            onSendMessage={handleSendMessage}
            messages={chatMessages}
            isLoading={isChatLoading}
          />
        </Suspense>
      </div>

      {/* AR Preview Overlay */}
      {isARActive && routeResult && routeResult.steps.length > 0 && (
        <ARPreviewOverlay
          nextManeuver={routeResult.steps[0].instruction}
          distance={formatDistance(routeResult.steps[0].distance)}
          direction={
            routeResult.steps[0].maneuver.modifier?.includes('left') ? 'left' :
            routeResult.steps[0].maneuver.modifier?.includes('right') ? 'right' :
            'straight'
          }
          onClose={() => toggleAR(false)}
        />
      )}

      {/* Paywall Modal */}
      <Paywall open={showPaywall} onOpenChange={setShowPaywall} />
    </div>
  );
}
