import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Hazard } from '@/data/hazards';
import { getHazardMetadata } from '@/data/hazards';
import type { SpeedCamera } from '@/data/speedCameras';
import { formatSpeedLimit } from '@/services/radar';

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  onLocationSelect?: (lat: number, lng: number) => void;
  markers?: Array<{ lat: number; lng: number; label?: string }>;
  route?: Array<[number, number]>;
  hazards?: Hazard[];
  speedCameras?: SpeedCamera[];
}

export default function MapView({
  center = [37.7749, -122.4194],
  zoom = 13,
  onLocationSelect,
  markers = [],
  route,
  hazards = [],
  speedCameras = []
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
    }).setView(center, zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    if (onLocationSelect) {
      map.on('click', (e) => {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      });
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView(center, zoom);
  }, [center, zoom]);

  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const layersToRemove: L.Layer[] = [];

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        layersToRemove.push(layer);
      }
    });

    layersToRemove.forEach(layer => map.removeLayer(layer));

    const icon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    markers.forEach(({ lat, lng, label }) => {
      const marker = L.marker([lat, lng], { icon }).addTo(map);
      if (label) {
        marker.bindPopup(label);
      }
    });

    hazards.forEach((hazard) => {
      const metadata = getHazardMetadata(hazard.type);
      
      const hazardIcon = L.divIcon({
        className: 'hazard-marker',
        html: `
          <div class="flex items-center justify-center w-8 h-8 rounded-full ${metadata.bgColorClass} border-2 border-white shadow-lg">
            <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              ${getIconSvgPath(hazard.type)}
            </svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });

      const hazardMarker = L.marker([hazard.coordinates[0], hazard.coordinates[1]], {
        icon: hazardIcon
      }).addTo(map);

      hazardMarker.bindPopup(`
        <div class="text-sm">
          <div class="font-semibold mb-1">${hazard.description}</div>
          ${hazard.speedLimit ? `<div class="text-xs text-gray-600">Speed limit: ${hazard.speedLimit} km/h</div>` : ''}
        </div>
      `);
    });

    speedCameras.forEach((camera) => {
      const cameraIcon = L.divIcon({
        className: 'speed-camera-marker',
        html: `
          <div class="flex items-center justify-center w-10 h-10 rounded-full bg-red-600 border-2 border-white shadow-lg">
            <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
      });

      const cameraMarker = L.marker([camera.lat, camera.lon], {
        icon: cameraIcon
      }).addTo(map);

      const directionText = camera.direction ? ` (${camera.direction})` : '';
      cameraMarker.bindPopup(`
        <div class="text-sm">
          <div class="font-semibold mb-1">Speed Camera</div>
          <div class="text-xs text-gray-600">Limit: ${formatSpeedLimit(camera.speedLimitKmh)}${directionText}</div>
        </div>
      `);

      cameraMarker.bindTooltip(`Speed camera – limit ${formatSpeedLimit(camera.speedLimitKmh)}`, {
        direction: 'top',
        offset: [0, -20]
      });
    });

    if (route && route.length > 1) {
      L.polyline(route, {
        color: 'hsl(217, 91%, 52%)',
        weight: 4,
        opacity: 0.8,
      }).addTo(map);

      const bounds = L.latLngBounds(route);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [markers, route, hazards, speedCameras]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full"
      data-testid="map-container"
    />
  );
}

function getIconSvgPath(type: string): string {
  const paths: Record<string, string> = {
    speed_camera: '<path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.5-4.5L21 7l-8 8-4-4m0 0L6.5 13.5 5 12l4-4z"/><circle cx="12" cy="12" r="3"/>',
    school_zone: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 14v6"/>',
    dangerous_curve: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>',
    accident_zone: '<path stroke-linecap="round" stroke-linejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>'
  };
  return paths[type] || paths.dangerous_curve;
}
