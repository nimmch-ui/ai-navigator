import { useState, useCallback, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import MapView from '@/components/MapView';
import SearchBar from '@/components/SearchBar';
import MapControls from '@/components/MapControls';
import ChatPanel from '@/components/ChatPanel';
import RoutePanel from '@/components/RoutePanel';
import ThemeToggle from '@/components/ThemeToggle';
import Settings, { VehicleType } from '@/components/Settings';
import HazardAlert from '@/components/HazardAlert';
import TripSummary from '@/components/TripSummary';
import HazardLegend from '@/components/HazardLegend';
import { mockHazards, getHazardWarningMessage } from '@/data/hazards';
import type { Hazard } from '@/data/hazards';
import { announce, isVoiceSupported, getVoiceEnabled, setVoiceEnabled } from '@/services/voiceGuidance';
import { calculateTripEstimate } from '@/services/tripEstimates';
import type { TripEstimate } from '@/services/tripEstimates';

interface SearchResult {
  id: string;
  name: string;
  address: string;
  category: string;
  coordinates: [number, number];
}

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
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
  const { toast } = useToast();
  
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>>([]);

  // New states for eco mode and hazards
  const [ecoMode, setEcoMode] = useState(false);
  const [vehicleType, setVehicleType] = useState<VehicleType>("car");
  const [voiceEnabled, setVoiceEnabledState] = useState(getVoiceEnabled());
  const [nearbyHazards, setNearbyHazards] = useState<Hazard[]>([]);
  const [tripEstimate, setTripEstimate] = useState<TripEstimate | null>(null);

  const recentSearches: SearchResult[] = [];

  const routes = [
    {
      id: 'fastest',
      name: 'Fastest',
      distance: '3.5 mi',
      duration: '15 min',
      steps: [
        { instruction: 'Head north on Market St toward 10th St', distance: '0.2 mi', icon: 'straight' as const },
        { instruction: 'Turn left onto Hayes St', distance: '0.5 mi', icon: 'left' as const },
        { instruction: 'Turn right onto Franklin St', distance: '1.2 mi', icon: 'right' as const },
        { instruction: 'Continue onto US-101 N', distance: '1.6 mi', icon: 'straight' as const }
      ]
    },
    {
      id: 'shortest',
      name: 'Shortest',
      distance: '3.2 mi',
      duration: '18 min',
      steps: [
        { instruction: 'Head west on Market St', distance: '0.3 mi', icon: 'straight' as const },
        { instruction: 'Turn right onto Van Ness Ave', distance: '0.8 mi', icon: 'right' as const }
      ]
    }
  ];

  // Handle voice enabled change
  const handleVoiceEnabledChange = (enabled: boolean) => {
    setVoiceEnabledState(enabled);
    setVoiceEnabled(enabled);
  };

  // Check for nearby hazards based on current position
  useEffect(() => {
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

        // If within alert radius, add to nearby hazards
        if (distance <= hazard.alertRadius) {
          nearby.push(hazard);
          
          // Announce hazard via voice if enabled
          const message = getHazardWarningMessage(hazard, distance);
          announce(message, {
            priority: hazard.severity === 'high' ? 'high' : 'normal',
            entityId: hazard.id,
            throttleMs: 45000 // Don't repeat same hazard within 45 seconds
          });
        }
      });

      setNearbyHazards(nearby);
    };

    checkNearbyHazards();
  }, [mapCenter]);

  // Calculate trip estimate when route changes
  useEffect(() => {
    if (showRoute) {
      // Mock data for demonstration - in real app, this would come from Mapbox Directions API
      const distanceKm = 5.6; // ~3.5 miles
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
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&limit=5`
      );

      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }

      const data = await response.json();
      
      const results: SearchResult[] = data.features.map((feature: any) => ({
        id: feature.id,
        name: feature.text,
        address: feature.place_name,
        category: feature.place_type?.[0] || 'Location',
        coordinates: [feature.center[1], feature.center[0]] as [number, number]
      }));

      setSearchResults(results);
    } catch (error) {
      console.error('Geocoding error:', error);
      toast({
        title: 'Search Error',
        description: 'Failed to search for location. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSearching(false);
    }
  }, [toast]);

  const handleSearch = (query: string) => {
    geocodeAddress(query);
  };

  const handleSearchSubmit = (query: string) => {
    geocodeAddress(query);
  };

  const handleResultSelect = (result: SearchResult) => {
    setMapCenter(result.coordinates);
    setMapZoom(15);
    setMarkers([{ lat: result.coordinates[0], lng: result.coordinates[1], label: result.name }]);
    setSearchResults([]);
  };

  const handleSendMessage = (message: string) => {
    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: message,
      timestamp: new Date()
    };
    setChatMessages([...chatMessages, userMessage]);

    setTimeout(() => {
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: "I'd be happy to help you with that! Based on your location, I can show you the best route and provide recommendations for your journey.",
        timestamp: new Date()
      };
      setChatMessages((prev) => [...prev, aiMessage]);
    }, 1000);
  };

  const dismissHazardAlert = (hazardId: string) => {
    setNearbyHazards((prev) => prev.filter((h) => h.id !== hazardId));
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex">
      <div className="flex-1 relative">
        <MapView
          center={mapCenter}
          zoom={mapZoom}
          markers={markers}
          route={route}
          hazards={mockHazards}
        />

        <div className="absolute top-0 left-0 right-0 p-4 z-[1000]">
          <div className="max-w-2xl mx-auto flex items-center gap-2">
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
              ecoMode={ecoMode}
              onEcoModeChange={setEcoMode}
              vehicleType={vehicleType}
              onVehicleTypeChange={setVehicleType}
              voiceEnabled={voiceEnabled}
              onVoiceEnabledChange={handleVoiceEnabledChange}
              voiceSupported={isVoiceSupported()}
            />
            <ThemeToggle />
          </div>
        </div>

        {/* Hazard alerts */}
        {nearbyHazards.length > 0 && (
          <div className="absolute top-20 left-4 right-4 z-[999] max-w-md mx-auto space-y-2">
            {nearbyHazards.slice(0, 2).map((hazard) => {
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
        )}

        <div className="absolute bottom-6 right-6 z-[1000] flex flex-col gap-2">
          <MapControls
            onZoomIn={() => setMapZoom((z) => Math.min(z + 1, 18))}
            onZoomOut={() => setMapZoom((z) => Math.max(z - 1, 3))}
            onLayersToggle={() => console.log('Toggle layers')}
            onCurrentLocation={() => {
              setMapCenter([37.7749, -122.4194]);
              setMapZoom(13);
            }}
          />
        </div>

        {/* Hazard legend */}
        <div className="absolute bottom-6 left-4 z-[999]">
          <HazardLegend />
        </div>

        {/* Trip summary */}
        {tripEstimate && (
          <div className="absolute bottom-32 left-4 z-[999] max-w-sm">
            <TripSummary
              estimate={tripEstimate}
              vehicleType={vehicleType}
              ecoMode={ecoMode}
            />
          </div>
        )}

        {showRoute && (
          <div className="absolute top-20 left-4 z-[1000] max-w-md">
            <RoutePanel
              origin="Current Location"
              destination="Golden Gate Bridge"
              routes={routes}
              onClose={() => setShowRoute(false)}
              onStartNavigation={(routeId) => {
                console.log('Start navigation:', routeId);
                announce(
                  `Navigation started. Distance 5.6 kilometers, estimated time 15 minutes.`,
                  { priority: 'high' }
                );
              }}
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

        {/* Demo button to toggle route visibility for testing */}
        <div className="absolute top-20 right-4 z-[999]">
          <Button
            onClick={() => setShowRoute(!showRoute)}
            variant="secondary"
            data-testid="button-toggle-route"
          >
            {showRoute ? 'Hide Route' : 'Show Route'}
          </Button>
        </div>
      </div>

      <div className={`${showChat ? 'fixed inset-0 z-[1001] lg:relative lg:inset-auto' : 'hidden'} lg:flex lg:w-96`}>
        <ChatPanel
          onClose={() => setShowChat(false)}
          onSendMessage={handleSendMessage}
          messages={chatMessages}
        />
      </div>
    </div>
  );
}
