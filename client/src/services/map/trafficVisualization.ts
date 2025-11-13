/**
 * Traffic Visualization Layer for Mapbox GL JS
 * 
 * Renders real-time traffic data from TrafficFusionEngine on 2D, 3D, and AR maps.
 * Features:
 * - Red/orange/yellow haze visualization for congestion levels
 * - Incident markers with severity-based icons
 * - Consistent color scheme across all UI modes
 */

import mapboxgl from 'mapbox-gl';
import type { TrafficSegment } from '../ai/TrafficFusionEngine';
import type { TrafficIncidentData } from '../data/types';

const TRAFFIC_LAYER_ID = 'traffic-congestion';
const TRAFFIC_SOURCE_ID = 'traffic-segments';
const INCIDENTS_SOURCE_ID = 'traffic-incidents';
const INCIDENTS_LAYER_ID = 'traffic-incidents-layer';

/**
 * Traffic congestion colors based on level (0-100)
 */
function getCongestionColor(congestion: number): string {
  if (congestion >= 80) return '#FF0000'; // Red (severe)
  if (congestion >= 60) return '#FF6600'; // Orange (heavy)
  if (congestion >= 40) return '#FFAA00'; // Amber (moderate)
  if (congestion >= 20) return '#FFDD00'; // Yellow (light)
  return '#00FF00'; // Green (free-flow)
}

/**
 * Traffic congestion line width based on level
 */
function getCongestionWidth(congestion: number): number {
  if (congestion >= 80) return 8; // Severe
  if (congestion >= 60) return 6; // Heavy
  if (congestion >= 40) return 5; // Moderate
  if (congestion >= 20) return 4; // Light
  return 3; // Free-flow
}

/**
 * Convert traffic segments to GeoJSON
 */
function segmentsToGeoJSON(segments: TrafficSegment[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: segments.map((segment) => ({
      type: 'Feature',
      properties: {
        segmentId: segment.segmentId,
        congestion: segment.congestion,
        predictedCongestion: segment.predictedCongestion,
        speed: segment.speed,
        color: getCongestionColor(segment.congestion),
        width: getCongestionWidth(segment.congestion),
      },
      geometry: {
        type: 'LineString',
        coordinates: segment.coordinates.map(([lat, lng]) => [lng, lat]),
      },
    })),
  };
}

/**
 * Convert incidents to GeoJSON
 */
function incidentsToGeoJSON(incidents: TrafficIncidentData[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: incidents.map((incident) => ({
      type: 'Feature',
      properties: {
        type: incident.type,
        severity: incident.severity,
        description: incident.description,
      },
      geometry: {
        type: 'Point',
        coordinates: [incident.location[1], incident.location[0]], // [lng, lat]
      },
    })),
  };
}

/**
 * Get incident marker color based on severity
 */
function getIncidentColor(severity: 'low' | 'medium' | 'high' | 'critical'): string {
  switch (severity) {
    case 'critical': return '#8B0000'; // Dark red
    case 'high': return '#FF0000'; // Red
    case 'medium': return '#FFA500'; // Orange
    case 'low': return '#FFD700'; // Gold
    default: return '#FFFF00'; // Yellow
  }
}

/**
 * Add traffic visualization layer to Mapbox map
 * Note: Should be called when style is loaded (e.g., in 'load' or 'style.load' events)
 */
export function addTrafficLayer(map: mapboxgl.Map): void {
  try {
    // Add traffic segments source
    if (!map.getSource(TRAFFIC_SOURCE_ID)) {
    map.addSource(TRAFFIC_SOURCE_ID, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });
  }

  // Add traffic congestion layer (gradient lines)
  if (!map.getLayer(TRAFFIC_LAYER_ID)) {
    // Find insertion point (before labels, after roads)
    const layers = map.getStyle().layers;
    const labelLayerId = layers?.find(
      (layer) => layer.type === 'symbol' && layer.layout && 'text-field' in layer.layout
    )?.id;

    map.addLayer(
      {
        id: TRAFFIC_LAYER_ID,
        type: 'line',
        source: TRAFFIC_SOURCE_ID,
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'width'],
          'line-opacity': 0.8,
          'line-blur': 2, // Soft haze effect
        },
      },
      labelLayerId // Insert before labels
    );
  }

  // Add incidents source
  if (!map.getSource(INCIDENTS_SOURCE_ID)) {
    map.addSource(INCIDENTS_SOURCE_ID, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });
  }

  // Add incidents layer (circle markers)
  if (!map.getLayer(INCIDENTS_LAYER_ID)) {
    const layers = map.getStyle().layers;
    const labelLayerId = layers?.find(
      (layer) => layer.type === 'symbol' && layer.layout && 'text-field' in layer.layout
    )?.id;

    map.addLayer(
      {
        id: INCIDENTS_LAYER_ID,
        type: 'circle',
        source: INCIDENTS_SOURCE_ID,
        paint: {
          'circle-radius': [
            'match',
            ['get', 'severity'],
            'critical', 12,
            'high', 10,
            'medium', 8,
            'low', 6,
            6 // default
          ],
          'circle-color': [
            'match',
            ['get', 'severity'],
            'critical', '#8B0000',
            'high', '#FF0000',
            'medium', '#FFA500',
            'low', '#FFD700',
            '#FFFF00' // default
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
          'circle-opacity': 0.9,
        },
      },
      labelLayerId
    );
  }

  console.log('[TrafficViz] Traffic visualization layers added');
  } catch (error) {
    console.warn('[TrafficViz] Failed to add traffic layers:', error);
  }
}

/**
 * Update traffic visualization with new segment data
 * Handles empty arrays to clear stale data
 */
export function updateTrafficLayer(map: mapboxgl.Map, segments: TrafficSegment[]): void {
  if (!map.getSource(TRAFFIC_SOURCE_ID)) {
    console.warn('[TrafficViz] Traffic source not found, adding layer first');
    addTrafficLayer(map);
  }

  const source = map.getSource(TRAFFIC_SOURCE_ID) as mapboxgl.GeoJSONSource;
  if (source) {
    const geojson = segmentsToGeoJSON(segments);
    source.setData(geojson);
    console.log('[TrafficViz] Updated traffic layer with', segments.length, 'segments');
  }

  // Extract and update incidents from all segments (defensive: handle undefined incidents)
  const allIncidents: TrafficIncidentData[] = segments.flatMap((s) => s.incidents || []);
  updateIncidentsLayer(map, allIncidents);
}

/**
 * Update incidents layer with new incident data
 */
export function updateIncidentsLayer(map: mapboxgl.Map, incidents: TrafficIncidentData[]): void {
  if (!map.getSource(INCIDENTS_SOURCE_ID)) {
    console.warn('[TrafficViz] Incidents source not found, adding layer first');
    addTrafficLayer(map);
  }

  const source = map.getSource(INCIDENTS_SOURCE_ID) as mapboxgl.GeoJSONSource;
  if (source) {
    const geojson = incidentsToGeoJSON(incidents);
    source.setData(geojson);
    console.log('[TrafficViz] Updated incidents layer with', incidents.length, 'incidents');
  }
}

/**
 * Remove traffic visualization layer
 */
export function removeTrafficLayer(map: mapboxgl.Map): void {
  if (map.getLayer(TRAFFIC_LAYER_ID)) {
    map.removeLayer(TRAFFIC_LAYER_ID);
  }
  if (map.getSource(TRAFFIC_SOURCE_ID)) {
    map.removeSource(TRAFFIC_SOURCE_ID);
  }
  if (map.getLayer(INCIDENTS_LAYER_ID)) {
    map.removeLayer(INCIDENTS_LAYER_ID);
  }
  if (map.getSource(INCIDENTS_SOURCE_ID)) {
    map.removeSource(INCIDENTS_SOURCE_ID);
  }
  console.log('[TrafficViz] Traffic visualization layers removed');
}

/**
 * Set traffic layer visibility
 */
export function setTrafficLayerVisibility(map: mapboxgl.Map, visible: boolean): void {
  if (map.getLayer(TRAFFIC_LAYER_ID)) {
    map.setLayoutProperty(TRAFFIC_LAYER_ID, 'visibility', visible ? 'visible' : 'none');
  }
  if (map.getLayer(INCIDENTS_LAYER_ID)) {
    map.setLayoutProperty(INCIDENTS_LAYER_ID, 'visibility', visible ? 'visible' : 'none');
  }
  console.log('[TrafficViz] Traffic layer visibility set to', visible);
}
