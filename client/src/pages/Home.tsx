import { useState, useCallback, useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import MapView from '@/components/MapView';
import SearchBar from '@/components/SearchBar';
import MapControls from '@/components/MapControls';
import ChatPanel from '@/components/ChatPanel';
import RoutePanel from '@/components/RoutePanel';
import ThemeToggle from '@/components/ThemeToggle';
import Settings from '@/components/Settings';
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
import { mockHazards, getHazardWarningMessage } from '@/data/hazards';
import type { Hazard } from '@/data/hazards';
import { announce, isVoiceSupported, getVoiceEnabled, setVoiceEnabled } from '@/services/voiceGuidance';
import { calculateTripEstimate, type VehicleType } from '@/services/tripEstimates';
import type { TripEstimate } from '@/services/tripEstimates';
import { PreferencesService, type TransportMode, type RoutePreference } from '@/services/preferences';
import { TripHistoryService } from '@/services/tripHistory';
import { sendChatMessage, type ChatContext } from '@/services/chatApi';
import { calculateRoute, formatDistance, formatDuration, getManeuverIcon, type RouteResult } from '@/services/routing';
import { getSpeedCameras } from '@/services/radar';
import type { SpeedCamera } from '@/data/speedCameras';
import { detectCamerasOnRoute, getCurrentSpeedLimit, type CameraProximityWarning } from '@/services/cameraProximity';
import { calculateEcoEstimate, type EcoEstimate } from '@/services/ecoEstimates';
import { fetchWeather, getSevereWeatherWarning, type WeatherData } from '@/services/weather';

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
  const [mapCenter, setMapCenter] = useState<[number, number]>([37.7749, -122.4194]);
  const [mapZoom, setMapZoom] = useState(13);
  const [markers, setMarkers] = useState<Array<{ lat: number; lng: number; label?: string }>>([
    { lat: 37.7749, lng: -122.4194, label: 'San Francisco' }
  ]);
  const [route, setRoute] = useState<Array<[number, number]> | undefined>();
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const { toast } = useToast();
  const routeAbortControllerRef = useRef<AbortController | null>(null);
  
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
  const [hazardAlertsEnabled, setHazardAlertsEnabled] = useState(true);
  const [nearbyHazards, setNearbyHazards] = useState<Hazard[]>([]);
  const [tripEstimate, setTripEstimate] = useState<TripEstimate | null>(null);
  const [speedCameras, setSpeedCameras] = useState<SpeedCamera[]>([]);
  const [cameraWarnings, setCameraWarnings] = useState<CameraProximityWarning[]>([]);
  const [dismissedCameraIds, setDismissedCameraIds] = useState<Set<string>>(new Set());
  const [currentSpeedLimit, setCurrentSpeedLimit] = useState<number | null>(null);
  const [ecoEstimate, setEcoEstimate] = useState<EcoEstimate | null>(null);
  const [isElectricVehicle, setIsElectricVehicle] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [severeWeatherDismissed, setSevereWeatherDismissed] = useState(false);

  const [origin, setOrigin] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [originCoords, setOriginCoords] = useState<[number, number]>([37.7749, -122.4194]);
  const [destinationCoords, setDestinationCoords] = useState<[number, number] | null>(null);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  const recentSearches: SearchResult[] = [];

  useEffect(() => {
    const prefs = PreferencesService.getPreferences();
    const smartDefaults = TripHistoryService.getSmartDefaults();
    
    if (smartDefaults) {
      setTransportMode(smartDefaults.transportMode);
      setRoutePreference(smartDefaults.routePreference);
    } else {
      setTransportMode(prefs.transportMode);
      setRoutePreference(prefs.routePreference);
    }
    
    setEcoMode(prefs.ecoMode);
    setVehicleType(prefs.vehicleType);
    setVoiceEnabledState(prefs.voiceGuidance);
    setHazardAlertsEnabled(prefs.hazardAlerts);

    getSpeedCameras().then(cameras => {
      setSpeedCameras(cameras);
    });
  }, []);

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

  const handleHazardAlertsChange = (enabled: boolean) => {
    setHazardAlertsEnabled(enabled);
    PreferencesService.updatePreference('hazardAlerts', enabled);
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
      return;
    }

    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!mapboxToken) {
      toast({
        title: 'Configuration Error',
        description: 'Mapbox token is not configured',
        variant: 'destructive'
      });
      return;
    }

    setIsSearching(true);
    try {
      const proximity = `${mapCenter[1]},${mapCenter[0]}`;
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&limit=5&proximity=${proximity}`
      );

      if (!response.ok) {
        console.error('[Search] Geocoding API error:', response.status, response.statusText);
        toast({
          title: 'Search Error',
          description: 'Unable to search at this time. Please try again.',
          variant: 'destructive'
        });
        return;
      }

      const data = await response.json();
      
      const results: SearchResult[] = data.features.map((feature: any) => {
        const coords: [number, number] = [feature.center[1], feature.center[0]];
        console.log('[Search] Feature:', {
          name: feature.text,
          place_name: feature.place_name,
          center_raw: feature.center,
          center_lng: feature.center[0],
          center_lat: feature.center[1],
          converted_coords: coords
        });
        return {
          id: feature.id,
          name: feature.text,
          address: feature.place_name,
          category: feature.place_type?.[0] || 'Location',
          coordinates: coords
        };
      });

      if (results.length === 0) {
        toast({
          title: 'Location not found',
          description: 'Please try another address or place name.',
          variant: 'destructive'
        });
      }

      setSearchResults(results);
    } catch (error) {
      console.error('[Search] Network error:', error);
      toast({
        title: 'Connection Error',
        description: 'Unable to connect to search service. Please check your internet connection.',
        variant: 'destructive'
      });
    } finally {
      setIsSearching(false);
    }
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
    
    setMapCenter(result.coordinates);
    setMapZoom(15);
    setMarkers([{ lat: result.coordinates[0], lng: result.coordinates[1], label: result.name }]);
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
    
    try {
      const result = await calculateRoute(
        originCoords,
        destinationCoords,
        transportMode,
        routePreference
      );

      if (abortController.signal.aborted) {
        return;
      }

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

      announce(
        `Route calculated. Distance ${formatDistance(result.distance)}, duration ${formatDuration(result.duration)}.`,
        { priority: 'normal' }
      );
    } catch (error) {
      if (abortController.signal.aborted) {
        return;
      }
      
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
      if (!abortController.signal.aborted) {
        setIsCalculatingRoute(false);
      }
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
      
      const context: ChatContext = {
        origin,
        destination,
        transportMode,
        ecoMode,
        hazardsOnRoute: nearbyHazards.map(h => h.description)
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

  const handleStartNavigation = async () => {
    if (origin && destination && routeResult && originCoords && destinationCoords) {
      const distanceKm = routeResult.distance / 1000;
      const durationMin = routeResult.duration / 60;
      
      TripHistoryService.addTrip({
        origin,
        destination,
        transportMode,
        routePreference,
        distance: distanceKm,
        duration: durationMin
      });
      
      announce(
        `Navigation started. Distance ${formatDistance(routeResult.distance)}, estimated time ${formatDuration(routeResult.duration)}.`,
        { priority: 'high' }
      );

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
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex">
      <div className="flex-1 relative">
        <MapView
          center={mapCenter}
          zoom={mapZoom}
          markers={markers}
          route={route}
          hazards={hazardAlertsEnabled ? mockHazards : []}
          speedCameras={speedCameras}
        />

        <div className="absolute top-0 left-0 right-0 p-4 z-[1000]">
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
              <Settings
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
                hazardAlertsEnabled={hazardAlertsEnabled}
                onHazardAlertsChange={handleHazardAlertsChange}
                voiceSupported={isVoiceSupported()}
              />
              <ThemeToggle />
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

        <div className="absolute top-20 left-4 right-4 z-[999] max-w-md mx-auto space-y-2">
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

        <div className="absolute top-24 left-4 z-[999]">
          <SpeedLimitHUD
            speedLimit={currentSpeedLimit}
            transportMode={transportMode}
          />
        </div>

        <div className="absolute bottom-6 right-6 z-[1000] flex flex-col gap-2">
          <MapControls
            onZoomIn={() => setMapZoom((z) => Math.min(z + 1, 18))}
            onZoomOut={() => setMapZoom((z) => Math.max(z - 1, 3))}
            onLayersToggle={() => toast({ title: 'Layers', description: 'Layer toggle coming soon' })}
            onCurrentLocation={() => {
              setMapCenter([37.7749, -122.4194]);
              setMapZoom(13);
            }}
          />
        </div>

        {hazardAlertsEnabled && (
          <div className="absolute bottom-6 left-4 z-[999]">
            <HazardLegend />
          </div>
        )}

        {(tripEstimate || ecoEstimate || weatherData.length > 0) && (
          <div className="absolute bottom-32 left-4 z-[999] max-w-sm space-y-2">
            {weatherData.length > 0 && <WeatherPanel weatherData={weatherData} />}
            {ecoEstimate && <EcoSummary estimate={ecoEstimate} />}
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
          <div className="absolute top-20 left-4 z-[1000] max-w-md">
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
              onClose={() => {
                setShowRoute(false);
                setDestination('');
                setDestinationCoords(null);
                setRouteResult(null);
                setRoute(undefined);
                setTripEstimate(null);
                setWeatherData([]);
                setSevereWeatherDismissed(false);
              }}
              onStartNavigation={handleStartNavigation}
            />
          </div>
        )}

        {!showChat && (
          <div className="absolute bottom-6 right-6 z-[999] lg:hidden">
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
      </div>

      <div className={`${showChat ? 'fixed inset-0 z-[1001] lg:relative lg:inset-auto' : 'hidden'} lg:flex lg:w-96`}>
        <ChatPanel
          onClose={() => setShowChat(false)}
          onSendMessage={handleSendMessage}
          messages={chatMessages}
          isLoading={isChatLoading}
        />
      </div>
    </div>
  );
}
