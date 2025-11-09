import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MapView from '@/components/MapView';
import SearchBar from '@/components/SearchBar';
import MapControls from '@/components/MapControls';
import ChatPanel from '@/components/ChatPanel';
import RoutePanel from '@/components/RoutePanel';
import ThemeToggle from '@/components/ThemeToggle';

export default function Home() {
  const [showChat, setShowChat] = useState(false);
  const [showRoute, setShowRoute] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([37.7749, -122.4194]);
  const [mapZoom, setMapZoom] = useState(13);
  const [markers, setMarkers] = useState<Array<{ lat: number; lng: number; label?: string }>>([
    { lat: 37.7749, lng: -122.4194, label: 'San Francisco' }
  ]);
  const [route, setRoute] = useState<Array<[number, number]> | undefined>();
  
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>>([]);

  const searchResults = [
    {
      id: '1',
      name: 'Golden Gate Bridge',
      address: 'Golden Gate Bridge, San Francisco, CA',
      category: 'Landmark',
      coordinates: [37.8199, -122.4783] as [number, number]
    },
    {
      id: '2',
      name: 'Alcatraz Island',
      address: 'Alcatraz Island, San Francisco, CA 94133',
      category: 'Historic Site',
      coordinates: [37.8267, -122.4230] as [number, number]
    }
  ];

  const recentSearches = [
    {
      id: 'r1',
      name: 'Ferry Building',
      address: '1 Ferry Building, San Francisco, CA 94111',
      category: 'Building',
      coordinates: [37.7955, -122.3937] as [number, number]
    }
  ];

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

  const handleSearch = (query: string) => {
    console.log('Search:', query);
  };

  const handleResultSelect = (result: typeof searchResults[0]) => {
    console.log('Selected:', result);
    setMapCenter(result.coordinates);
    setMapZoom(15);
    setMarkers([{ lat: result.coordinates[0], lng: result.coordinates[1], label: result.name }]);
    
    setShowRoute(true);
    setRoute([
      [37.7749, -122.4194],
      [37.78, -122.45],
      result.coordinates
    ]);
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
                onResultSelect={handleResultSelect}
                results={searchResults}
                recentSearches={recentSearches}
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
