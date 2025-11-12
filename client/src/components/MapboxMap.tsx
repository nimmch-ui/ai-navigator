/**
 * MapboxMap - Premium 3D map component using Mapbox GL JS
 * Features: 3D buildings, smooth camera animations, day/night modes, enhanced route visualization
 */

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Hazard } from '@/data/hazards';
import { getHazardMetadata } from '@/data/hazards';
import type { SpeedCamera } from '@/data/speedCameras';
import { formatSpeedLimit } from '@/services/radar';
import { toggle3DMode } from '@/services/map/visual3d';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

interface MapboxMapProps {
  center?: [number, number]; // [lat, lng] format for consistency
  zoom?: number;
  onLocationSelect?: (lat: number, lng: number) => void;
  markers?: Array<{ lat: number; lng: number; label?: string }>;
  route?: Array<[number, number]>; // Array of [lat, lng]
  hazards?: Hazard[];
  speedCameras?: SpeedCamera[];
  showSpeedCameras?: boolean;
  is3DMode?: boolean;
}

export default function MapboxMap({
  center = [37.7749, -122.4194], // Default: [lat, lng]
  zoom = 13,
  onLocationSelect,
  markers = [],
  route,
  hazards = [],
  speedCameras = [],
  showSpeedCameras = true,
  is3DMode = true
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const [webglError, setWebglError] = useState(false);

  /**
   * Check if WebGL is supported in the current browser
   */
  const isWebGLSupported = (): boolean => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch (e) {
      return false;
    }
  };

  /**
   * Determine if it's nighttime for day/night style switching
   */
  const isNightTime = (): boolean => {
    const hour = new Date().getHours();
    return hour >= 19 || hour < 6;
  };

  /**
   * Initialize the map with 3D buildings and smooth controls
   */
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Check for Mapbox token
    if (!MAPBOX_TOKEN) {
      console.error('Mapbox token not found. Please set VITE_MAPBOX_TOKEN in your environment.');
      setTokenError(true);
      return;
    }

    // Check for WebGL support
    if (!isWebGLSupported()) {
      console.warn('WebGL is not supported in this browser. Mapbox GL JS requires WebGL.');
      setWebglError(true);
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const mapStyle = isNightTime() ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11';

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [center[1], center[0]], // Convert [lat, lng] to [lng, lat] for Mapbox
      zoom: zoom,
      pitch: is3DMode ? 45 : 0,
      bearing: 0,
      antialias: true // Smooth rendering
    });

    map.current.on('load', () => {
      if (!map.current) return;

      // Add 3D buildings layer
      const layers = map.current.getStyle().layers;
      const labelLayerId = layers?.find(
        (layer) => layer.type === 'symbol' && layer.layout && 'text-field' in layer.layout
      )?.id;

      map.current.addLayer(
        {
          'id': '3d-buildings',
          'source': 'composite',
          'source-layer': 'building',
          'filter': ['==', 'extrude', 'true'],
          'type': 'fill-extrusion',
          'minzoom': 14,
          'paint': {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'height']
            ],
            'fill-extrusion-base': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'min_height']
            ],
            'fill-extrusion-opacity': 0.6
          }
        },
        labelLayerId
      );

      setMapLoaded(true);
    });

    // Add click handler for location selection
    if (onLocationSelect) {
      map.current.on('click', (e) => {
        onLocationSelect(e.lngLat.lat, e.lngLat.lng);
      });
    }

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  /**
   * Smooth camera animation when center/zoom changes
   */
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    map.current.easeTo({
      center: [center[1], center[0]],
      zoom: zoom,
      duration: 1000,
      easing: (t) => t * (2 - t) // Ease out quad
    });
  }, [center, zoom, mapLoaded]);

  /**
   * Toggle 3D mode (terrain and sky) when is3DMode changes
   */
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    toggle3DMode(map.current, is3DMode);
  }, [is3DMode, mapLoaded]);

  /**
   * Update markers, hazards, cameras, and route
   */
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add regular markers
    markers.forEach(({ lat, lng, label }) => {
      const el = document.createElement('div');
      el.className = 'w-10 h-10 bg-primary rounded-full border-2 border-white shadow-lg flex items-center justify-center';
      el.innerHTML = `
        <svg class="w-6 h-6 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      `;

      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat]);

      if (label) {
        marker.setPopup(new mapboxgl.Popup({ offset: 25 }).setText(label));
      }

      marker.addTo(map.current!);
      markersRef.current.push(marker);
    });

    // Add hazard markers
    hazards.forEach((hazard) => {
      const metadata = getHazardMetadata(hazard.type);
      
      const el = document.createElement('div');
      el.className = `w-8 h-8 ${metadata.bgColorClass} rounded-full border-2 border-white shadow-lg flex items-center justify-center`;
      el.innerHTML = `
        <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          ${getIconSvgPath(hazard.type)}
        </svg>
      `;

      const popupContent = `
        <div class="text-sm">
          <div class="font-semibold mb-1">${hazard.description}</div>
          ${hazard.speedLimit ? `<div class="text-xs text-muted-foreground">Speed limit: ${hazard.speedLimit} km/h</div>` : ''}
        </div>
      `;

      const marker = new mapboxgl.Marker(el)
        .setLngLat([hazard.coordinates[1], hazard.coordinates[0]])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent))
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Add speed camera markers
    if (showSpeedCameras) {
      speedCameras.forEach((camera) => {
        const el = document.createElement('div');
        el.className = 'w-10 h-10 bg-red-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center animate-pulse';
        el.innerHTML = `
          <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        `;

        const directionText = camera.direction ? ` (${camera.direction})` : '';
        const popupContent = `
          <div class="text-sm">
            <div class="font-semibold mb-1">Speed Camera</div>
            <div class="text-xs text-muted-foreground">Limit: ${formatSpeedLimit(camera.speedLimitKmh)}${directionText}</div>
          </div>
        `;

        const marker = new mapboxgl.Marker(el)
          .setLngLat([camera.lon, camera.lat])
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent))
          .addTo(map.current!);

        markersRef.current.push(marker);
      });
    }

    // Add enhanced route visualization
    if (route && route.length > 1 && map.current) {
      const routeGeoJSON: GeoJSON.Feature<GeoJSON.LineString> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: route.map(([lat, lng]) => [lng, lat])
        }
      };

      // Remove existing route layers
      if (map.current.getLayer('route')) {
        map.current.removeLayer('route');
      }
      if (map.current.getLayer('route-glow')) {
        map.current.removeLayer('route-glow');
      }
      if (map.current.getSource('route')) {
        map.current.removeSource('route');
      }

      // Add route source
      map.current.addSource('route', {
        type: 'geojson',
        data: routeGeoJSON
      });

      // Add glow effect layer
      map.current.addLayer({
        id: 'route-glow',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': 'hsl(217, 91%, 52%)',
          'line-width': 12,
          'line-opacity': 0.4,
          'line-blur': 4
        }
      });

      // Add main route layer
      map.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': 'hsl(217, 91%, 52%)',
          'line-width': 6,
          'line-opacity': 0.9
        }
      });

      // Fit bounds to route with smooth animation
      const coordinates = route.map(([lat, lng]) => [lng, lat] as [number, number]);
      const bounds = coordinates.reduce(
        (bounds, coord) => bounds.extend(coord),
        new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
      );

      map.current.fitBounds(bounds, {
        padding: 80,
        duration: 1500,
        pitch: is3DMode ? 45 : 0,
        bearing: 0
      });
    } else {
      // Remove route layers if no route
      if (map.current?.getLayer('route')) {
        map.current.removeLayer('route');
      }
      if (map.current?.getLayer('route-glow')) {
        map.current.removeLayer('route-glow');
      }
      if (map.current?.getSource('route')) {
        map.current.removeSource('route');
      }
    }
  }, [markers, route, hazards, speedCameras, mapLoaded, showSpeedCameras]);

  // Show error state if token is missing
  if (tokenError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted" data-testid="map-error">
        <div className="text-center p-6 max-w-md">
          <h3 className="text-lg font-semibold mb-2">Map Unavailable</h3>
          <p className="text-sm text-muted-foreground">
            Mapbox access token is required. Please contact support or check your configuration.
          </p>
        </div>
      </div>
    );
  }

  if (webglError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted" data-testid="map-webgl-error">
        <div className="text-center p-6 max-w-md">
          <h3 className="text-lg font-semibold mb-2">3D Map Unavailable</h3>
          <p className="text-sm text-muted-foreground mb-4">
            WebGL is required for the interactive 3D map but is not available in your browser or environment.
          </p>
          <p className="text-xs text-muted-foreground">
            This might occur in headless browsers or older devices. Features like Favorites, History, and Settings are still accessible.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mapContainer} 
      className="w-full h-full"
      data-testid="map-container"
    />
  );
}

/**
 * Get SVG path for hazard icon
 */
function getIconSvgPath(type: string): string {
  const paths: Record<string, string> = {
    speed_camera: '<path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.5-4.5L21 7l-8 8-4-4m0 0L6.5 13.5 5 12l4-4z"/><circle cx="12" cy="12" r="3"/>',
    school_zone: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 14v6"/>',
    dangerous_curve: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>',
    accident_zone: '<path stroke-linecap="round" stroke-linejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>'
  };
  return paths[type] || paths.dangerous_curve;
}
