import { useState, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import MapView from '@/components/MapView';
import SearchBar from '@/components/SearchBar';
import MapControls from '@/components/MapControls';
import ChatPanel from '@/components/ChatPanel';
import RoutePanel from '@/components/RoutePanel';
import ThemeToggle from '@/components/ThemeToggle';

interface SearchResult {
  id: string;
  name: string;
  address: string;
  category: string;
  coordinates: [number, number];
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

  return (
    <div className="h-screen w-screen overflow-hidden flex">
      <div className="flex-1 relative">
        <MapView
          center={mapCenter}
          zoom={mapZoom}
          markers={markers}
          route={route}
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
            <ThemeToggle />
          </div>
        </div>

        <div className="absolute bottom-6 right-6 z-[1000]">
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

        {showRoute && (
          <div className="absolute bottom-6 left-6 z-[1000] max-w-md">
            <RoutePanel
              origin="Current Location"
              destination="Golden Gate Bridge"
              routes={routes}
              onClose={() => setShowRoute(false)}
              onStartNavigation={(routeId) => console.log('Start navigation:', routeId)}
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
        />
      </div>
    </div>
  );
}
