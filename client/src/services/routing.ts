import type { TransportMode, RoutePreference } from './preferences';

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver: {
    type: string;
    modifier?: string;
    location: [number, number];
  };
}

export interface RouteResult {
  distance: number;
  duration: number;
  geometry: Array<[number, number]>;
  steps: RouteStep[];
  profile: string;
}

interface MapboxRoute {
  distance: number;
  duration: number;
  geometry: {
    coordinates: Array<[number, number]>;
  };
  legs: Array<{
    steps: Array<{
      maneuver: {
        type: string;
        modifier?: string;
        instruction: string;
        location: [number, number];
      };
      distance: number;
      duration: number;
    }>;
  }>;
}

function getMapboxProfile(mode: TransportMode): string {
  switch (mode) {
    case 'car':
    case 'transit':
      return 'driving-traffic';
    case 'bike':
      return 'cycling';
    case 'walk':
      return 'walking';
    default:
      return 'driving-traffic';
  }
}

function getRoutePreferenceParams(preference: RoutePreference): string {
  switch (preference) {
    case 'fastest':
      return '';
    case 'shortest':
      return '&overview=full';
    case 'eco':
      return '&overview=full';
    default:
      return '';
  }
}

export async function calculateRoute(
  origin: [number, number],
  destination: [number, number],
  mode: TransportMode,
  routePreference: RoutePreference = 'fastest'
): Promise<RouteResult> {
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
  
  if (!mapboxToken) {
    throw new Error('Mapbox token not configured');
  }

  const profile = getMapboxProfile(mode);
  const coordinates = `${origin[1]},${origin[0]};${destination[1]},${destination[0]}`;
  const preferenceParams = getRoutePreferenceParams(routePreference);
  
  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}?` +
    `geometries=geojson&steps=true&overview=full&access_token=${mapboxToken}${preferenceParams}`;

  console.log('[Routing] Calculating route:', {
    origin,
    destination,
    mode,
    profile,
    coordinates,
    url: url.replace(mapboxToken, 'TOKEN')
  });

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Routing] Mapbox API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(`Mapbox API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error('No route found');
    }

    const route: MapboxRoute = data.routes[0];
    
    const steps: RouteStep[] = route.legs[0].steps.map(step => ({
      instruction: step.maneuver.instruction,
      distance: step.distance,
      duration: step.duration,
      maneuver: {
        type: step.maneuver.type,
        modifier: step.maneuver.modifier,
        location: step.maneuver.location
      }
    }));

    return {
      distance: route.distance,
      duration: route.duration,
      geometry: route.geometry.coordinates.map(coord => [coord[1], coord[0]]),
      steps,
      profile
    };
  } catch (error) {
    console.error('Route calculation error:', error);
    throw error instanceof Error ? error : new Error('Failed to calculate route');
  }
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  return `${km.toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 
    ? `${hours} h ${remainingMinutes} min`
    : `${hours} h`;
}

export function getManeuverIcon(type: string, modifier?: string): 'straight' | 'left' | 'right' {
  if (type === 'turn' || type === 'new name') {
    if (modifier?.includes('left')) return 'left';
    if (modifier?.includes('right')) return 'right';
  }
  if (type === 'merge' || type === 'fork') {
    if (modifier?.includes('left')) return 'left';
    if (modifier?.includes('right')) return 'right';
  }
  return 'straight';
}
