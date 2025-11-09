import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  onLocationSelect?: (lat: number, lng: number) => void;
  markers?: Array<{ lat: number; lng: number; label?: string }>;
  route?: Array<[number, number]>;
}

export default function MapView({
  center = [37.7749, -122.4194],
  zoom = 13,
  onLocationSelect,
  markers = [],
  route
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

    if (route && route.length > 1) {
      L.polyline(route, {
        color: 'hsl(217, 91%, 52%)',
        weight: 4,
        opacity: 0.8,
      }).addTo(map);

      const bounds = L.latLngBounds(route);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [markers, route]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full"
      data-testid="map-container"
    />
  );
}
