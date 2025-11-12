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
import { resolveTheme, getStyleUrl, type MapTheme } from '@/services/map/theme';
import {
  updateCamera,
  createInitialCameraState,
  type CameraState,
  type CameraContext,
  type CameraIntent
} from '@/services/map/cameraAI';
import { fetchRadarData, getMostRecentRadarTileUrl } from '@/services/weatherRadar';
import { buildLaneMesh, findNextLaneManeuver, LANE_CONFIG, type LaneMesh } from '@/services/map/lane3d';
import type { LaneSegment } from '@shared/schema';
import type { RouteStep } from '@/services/routing';
import type { WeatherData } from '@/services/weather';
import { 
  applyWeatherLighting, 
  adjustRouteIntensity, 
  resetWeatherLighting 
} from '@/services/map/weatherLighting';
import { 
  startRouteBreathing, 
  handleCameraPan, 
  cleanupMotionPolish 
} from '@/services/map/motionPolish';
import { useToast } from '@/hooks/use-toast';

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
  cinematicMode?: boolean;
  mapTheme?: MapTheme;
  radarEnabled?: boolean;
  radarOpacity?: number;
  onRadarError?: (error: string) => void;
  laneData?: Map<number, LaneSegment>;
  currentPosition?: [number, number];
  // AI Camera props
  routeSteps?: RouteStep[];
  speed?: number; // km/h
  weather?: WeatherData;
  distanceToNextStep?: number; // meters
  distanceToStepAfterNext?: number; // meters
  // Realism Pack props
  weatherLightingEnabled?: boolean;
  motionPolishEnabled?: boolean;
  isDarkMode?: boolean;
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
  is3DMode = true,
  cinematicMode = false,
  mapTheme = 'auto',
  radarEnabled = false,
  radarOpacity = 0.6,
  onRadarError,
  laneData,
  currentPosition,
  routeSteps,
  speed = 0,
  weather,
  distanceToNextStep = Infinity,
  distanceToStepAfterNext,
  weatherLightingEnabled = true,
  motionPolishEnabled = true,
  isDarkMode = false
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const currentStyleUrl = useRef<string>('');
  const radarRefreshInterval = useRef<number | null>(null);
  const radarEnabledRef = useRef<boolean>(radarEnabled);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const [webglError, setWebglError] = useState(false);
  
  // Lane rendering state
  const activeLaneSegmentRef = useRef<string | null>(null);
  const laneMeshCacheRef = useRef<Map<string, LaneMesh>>(new Map());
  
  // AI Camera state
  const cameraStateRef = useRef<CameraState | null>(null);
  const cameraAnimationFrameRef = useRef<number | null>(null);
  const lastCameraUpdateRef = useRef<number>(Date.now());

  // Toast notifications
  const { toast } = useToast();

  /**
   * Handle 3D mode errors
   */
  const handle3DModeError = (message: string) => {
    toast({
      title: "3D Mode Limited",
      description: message,
      variant: "default",
    });
  };

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
   * Add 3D buildings layer to the map
   */
  const add3DBuildingsLayer = (mapInstance: mapboxgl.Map) => {
    try {
      if (!mapInstance.isStyleLoaded()) {
        console.warn('[3D Buildings] Style not loaded yet, deferring building layer setup');
        return;
      }

      const layers = mapInstance.getStyle().layers;
      const labelLayerId = layers?.find(
        (layer) => layer.type === 'symbol' && layer.layout && 'text-field' in layer.layout
      )?.id;

      if (!mapInstance.getLayer('3d-buildings')) {
        mapInstance.addLayer(
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
      }
    } catch (error) {
      console.warn('[3D Buildings] Failed to add buildings layer:', error);
    }
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

    // Resolve theme to get initial style
    const resolvedTheme = resolveTheme(mapTheme, center[0], center[1]);
    const initialStyle = getStyleUrl(resolvedTheme);
    currentStyleUrl.current = initialStyle;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: initialStyle,
      center: [center[1], center[0]], // Convert [lat, lng] to [lng, lat] for Mapbox
      zoom: zoom,
      pitch: is3DMode ? 45 : 0,
      bearing: 0,
      antialias: true // Smooth rendering
    });

    map.current.on('load', () => {
      if (!map.current) return;

      // Add 3D buildings layer
      add3DBuildingsLayer(map.current);

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
   * Handle theme switching with smooth transitions
   */
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Resolve the theme based on current settings and location
    const resolvedTheme = resolveTheme(mapTheme, center[0], center[1]);
    const newStyleUrl = getStyleUrl(resolvedTheme);
    
    // Check if style needs to change by comparing actual URLs
    const needsStyleChange = currentStyleUrl.current !== newStyleUrl;

    if (needsStyleChange) {
      // Store current camera position
      const currentCenter = map.current.getCenter();
      const currentZoom = map.current.getZoom();
      const currentPitch = map.current.getPitch();
      const currentBearing = map.current.getBearing();

      // Set up listener for when new style is loaded
      const onStyleLoad = () => {
        if (!map.current) return;

        // Wait for style to fully load before applying 3D features
        map.current.once('style.load', () => {
          if (!map.current) return;

          // Re-add 3D buildings layer
          add3DBuildingsLayer(map.current);

          // Re-apply 3D mode (terrain and sky)
          toggle3DMode(map.current, is3DMode, 1.2, handle3DModeError);

          // Re-apply weather lighting (resilience requirement)
          if (weatherLightingEnabled) {
            try {
              applyWeatherLighting(map.current, weather, mapTheme, isDarkMode, true);
            } catch (error) {
              console.warn('[WeatherLighting] Failed to apply after style change:', error);
            }
          }

          // Restore camera position
          map.current.easeTo({
            center: currentCenter,
            zoom: currentZoom,
            pitch: currentPitch,
            bearing: currentBearing,
            duration: 500
          });
        });

        // Remove listener after execution
        map.current?.off('styledata', onStyleLoad);
      };

      // Add listener before changing style
      map.current.on('styledata', onStyleLoad);

      // Change the style and update ref
      map.current.setStyle(newStyleUrl);
      currentStyleUrl.current = newStyleUrl;
    }
  }, [mapTheme, mapLoaded, center, is3DMode]);

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

    toggle3DMode(map.current, is3DMode, 1.2, handle3DModeError);
  }, [is3DMode, mapLoaded]);

  /**
   * Helper: Find closest point on route to current position
   */
  const findClosestRouteIndex = (
    position: [number, number],
    routePoints: [number, number][]
  ): number => {
    if (!routePoints || routePoints.length === 0) return 0;
    
    let closestIndex = 0;
    let minDistance = Infinity;
    
    for (let i = 0; i < routePoints.length; i++) {
      const [lat, lng] = routePoints[i];
      const [posLat, posLng] = position;
      
      // Simple distance calculation (good enough for nearby points)
      const latDiff = lat - posLat;
      const lngDiff = lng - posLng;
      const distance = latDiff * latDiff + lngDiff * lngDiff;
      
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }
    
    return closestIndex;
  };

  /**
   * AI-Assisted Camera Control System
   * Replaces legacy cinematic follow with intelligent state-based camera
   */
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    if (!cinematicMode) {
      // Cancel animation loop and clear state
      if (cameraAnimationFrameRef.current) {
        cancelAnimationFrame(cameraAnimationFrameRef.current);
        cameraAnimationFrameRef.current = null;
      }
      cameraStateRef.current = null;
      return;
    }

    // Initialize camera AI state
    const currentBearing = map.current.getBearing();
    const isHighway = speed > 80; // Simple heuristic: >80 km/h = highway
    
    // Determine turn density from route steps
    let turnDensity: 'low' | 'medium' | 'high' = 'low';
    if (distanceToNextStep < 200 && distanceToStepAfterNext && distanceToStepAfterNext < 150) {
      turnDensity = 'high';
    } else if (distanceToNextStep < 300) {
      turnDensity = 'medium';
    }

    // Slice route geometry from current position
    let slicedRoute = route;
    if (currentPosition && route && route.length > 0) {
      const closestIndex = findClosestRouteIndex(currentPosition, route);
      slicedRoute = route.slice(closestIndex);
    }

    const initialContext: CameraContext = {
      currentStep: routeSteps?.[0],
      nextStep: routeSteps?.[1],
      distanceToNextStep,
      distanceToStepAfterNext,
      routeGeometry: slicedRoute,
      speed,
      currentBearing,
      weather,
      userOverride: false,
      cinematicMode: true,
      isHighway,
      turnDensity,
    };

    // Initialize camera state if not already set
    if (!cameraStateRef.current) {
      cameraStateRef.current = createInitialCameraState(initialContext);
      lastCameraUpdateRef.current = Date.now();
    }

    // Camera update loop
    const updateCameraLoop = () => {
      if (!map.current || !cinematicMode || !cameraStateRef.current) return;

      const now = Date.now();
      const deltaTime = now - lastCameraUpdateRef.current;
      lastCameraUpdateRef.current = now;

      // Slice route geometry from current position for accurate bearing
      let activeRouteSegment = route;
      if (currentPosition && route && route.length > 0) {
        const closestIndex = findClosestRouteIndex(currentPosition, route);
        activeRouteSegment = route.slice(closestIndex);
      }

      // Build current context with live route segment
      const context: CameraContext = {
        currentStep: routeSteps?.[0],
        nextStep: routeSteps?.[1],
        distanceToNextStep,
        distanceToStepAfterNext,
        routeGeometry: activeRouteSegment, // Use sliced geometry from current position
        speed,
        currentBearing: map.current.getBearing(),
        weather,
        userOverride: false,
        cinematicMode: true,
        isHighway: speed > 80,
        turnDensity,
      };

      // Update camera state with AI
      const newCameraState = updateCamera(
        cameraStateRef.current,
        context,
        deltaTime
      );

      cameraStateRef.current = newCameraState;

      // Apply camera parameters to map
      const { pitch, zoom, bearing, duration } = newCameraState.params;

      // Smooth camera update using easeTo
      map.current.easeTo({
        pitch,
        zoom,
        bearing,
        center: currentPosition 
          ? [currentPosition[1], currentPosition[0]] // Convert [lat, lng] to [lng, lat]
          : map.current.getCenter(),
        duration: duration || 100,
        easing: (t) => t, // Linear for frame-by-frame updates
      });

      // Continue loop
      cameraAnimationFrameRef.current = requestAnimationFrame(updateCameraLoop);
    };

    // Start the loop
    updateCameraLoop();

    return () => {
      if (cameraAnimationFrameRef.current) {
        cancelAnimationFrame(cameraAnimationFrameRef.current);
        cameraAnimationFrameRef.current = null;
      }
    };
  }, [
    cinematicMode,
    mapLoaded,
    route,
    routeSteps,
    speed,
    weather,
    distanceToNextStep,
    distanceToStepAfterNext,
    currentPosition,
  ]);

  /**
   * Weather Lighting Effect
   * Applies visual adjustments based on weather conditions
   */
  useEffect(() => {
    if (!map.current || !mapLoaded || !weatherLightingEnabled) {
      if (map.current && mapLoaded && !weatherLightingEnabled) {
        resetWeatherLighting(map.current);
      }
      return;
    }

    try {
      applyWeatherLighting(map.current, weather, mapTheme, isDarkMode, true);
      
      // Apply route intensity adjustments
      if (map.current.getLayer('route')) {
        adjustRouteIntensity(map.current, 'route', weather, mapTheme, isDarkMode, true);
      }
    } catch (error) {
      console.warn('[WeatherLighting] Failed to apply lighting effects:', error);
    }
  }, [weather, mapTheme, isDarkMode, weatherLightingEnabled, mapLoaded]);

  /**
   * Motion Polish Effect
   * Route breathing glow and camera pan blur
   */
  useEffect(() => {
    if (!map.current || !mapLoaded || !motionPolishEnabled || !route || route.length === 0) {
      cleanupMotionPolish();
      return;
    }

    // Start route breathing effect
    if (map.current.getLayer('route')) {
      startRouteBreathing(map.current, 'route', speed, true);
    }

    // Handle camera pan for motion blur
    if (cinematicMode) {
      const currentBearing = map.current.getBearing();
      if (map.current.getLayer('route-glow')) {
        handleCameraPan(map.current, 'route-glow', currentBearing, true);
      }
    }

    return () => {
      cleanupMotionPolish();
    };
  }, [speed, cinematicMode, motionPolishEnabled, mapLoaded, route]);

  /**
   * Weather radar layer management with auto-refresh
   */
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Update ref to track current radarEnabled state
    radarEnabledRef.current = radarEnabled;

    const RADAR_SOURCE_ID = 'weather_radar';
    const RADAR_LAYER_ID = 'weather_radar_layer';
    const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

    async function updateRadarLayer() {
      if (!map.current) return;

      try {
        const radarData = await fetchRadarData();
        
        if (!radarData) {
          onRadarError?.('Failed to fetch weather radar data');
          return;
        }

        // Guard: Check if radar is still enabled after async fetch
        // This prevents race condition where fetch completes after toggle off
        if (!radarEnabledRef.current) {
          return;
        }

        const tileUrl = getMostRecentRadarTileUrl(radarData);

        // Check if source exists
        const source = map.current.getSource(RADAR_SOURCE_ID);
        
        if (source) {
          // Update existing source tiles
          if (source.type === 'raster') {
            (source as mapboxgl.RasterTileSource).setTiles([tileUrl]);
          }
        } else {
          // Add new source and layer
          map.current.addSource(RADAR_SOURCE_ID, {
            type: 'raster',
            tiles: [tileUrl],
            tileSize: 256,
            attribution: '<a href="https://www.rainviewer.com/">RainViewer</a>'
          });

          // Find the first label layer to insert radar below it
          const layers = map.current.getStyle().layers;
          const labelLayerId = layers?.find(
            (layer) => layer.type === 'symbol' && layer.layout && 'text-field' in layer.layout
          )?.id;

          map.current.addLayer(
            {
              id: RADAR_LAYER_ID,
              type: 'raster',
              source: RADAR_SOURCE_ID,
              paint: {
                'raster-opacity': radarOpacity,
                'raster-fade-duration': 300
              }
            },
            labelLayerId // Insert before labels
          );
        }

        // Update opacity
        if (map.current.getLayer(RADAR_LAYER_ID)) {
          map.current.setPaintProperty(RADAR_LAYER_ID, 'raster-opacity', radarOpacity);
        }
      } catch (error) {
        console.error('Error updating radar layer:', error);
        onRadarError?.('Weather radar service temporarily unavailable');
      }
    }

    function removeRadarLayer() {
      if (!map.current) return;

      if (map.current.getLayer(RADAR_LAYER_ID)) {
        map.current.removeLayer(RADAR_LAYER_ID);
      }
      if (map.current.getSource(RADAR_SOURCE_ID)) {
        map.current.removeSource(RADAR_SOURCE_ID);
      }
    }

    if (radarEnabled) {
      // Add/update radar layer immediately
      updateRadarLayer();

      // Set up auto-refresh interval
      radarRefreshInterval.current = window.setInterval(updateRadarLayer, REFRESH_INTERVAL);
    } else {
      // Remove radar layer
      removeRadarLayer();
      
      // Clear refresh interval
      if (radarRefreshInterval.current !== null) {
        clearInterval(radarRefreshInterval.current);
        radarRefreshInterval.current = null;
      }
    }

    return () => {
      // Cleanup on unmount
      if (radarRefreshInterval.current !== null) {
        clearInterval(radarRefreshInterval.current);
        radarRefreshInterval.current = null;
      }
    };
  }, [radarEnabled, radarOpacity, mapLoaded, onRadarError]);

  /**
   * 3D Lane Rendering - Dedicated source/layer with paint-based fade
   */
  useEffect(() => {
    if (!map.current || !mapLoaded || !route || route.length < 2) return;
    if (!laneData || laneData.size === 0) {
      // No lane data - remove layer if it exists
      if (map.current.getLayer('lane-extrusion')) {
        map.current.removeLayer('lane-extrusion');
      }
      if (map.current.getSource('lanes')) {
        map.current.removeSource('lanes');
      }
      activeLaneSegmentRef.current = null;
      return;
    }

    const LANE_SOURCE_ID = 'lanes';
    const LANE_LAYER_ID = 'lane-extrusion';

    // Find next lane maneuver
    const nextManeuver = currentPosition 
      ? findNextLaneManeuver(currentPosition, route, laneData)
      : null;

    if (!nextManeuver) {
      // No upcoming maneuver in range - remove layer
      if (map.current.getLayer(LANE_LAYER_ID)) {
        map.current.removeLayer(LANE_LAYER_ID);
      }
      if (map.current.getSource(LANE_SOURCE_ID)) {
        map.current.removeSource(LANE_SOURCE_ID);
      }
      activeLaneSegmentRef.current = null;
      return;
    }

    const { segment, distance } = nextManeuver;
    
    // Check if this is a new maneuver (only rebuild if segment changed)
    const segmentChanged = activeLaneSegmentRef.current !== segment.segmentId;
    
    if (segmentChanged) {
      // Build new lane mesh (or get from cache)
      let laneMesh = laneMeshCacheRef.current.get(segment.segmentId);
      
      if (!laneMesh) {
        const builtMesh = buildLaneMesh(segment, route, distance);
        if (builtMesh) {
          laneMesh = builtMesh;
          laneMeshCacheRef.current.set(segment.segmentId, builtMesh);
        }
      }

      if (!laneMesh) return;

      // Add or update source
      const source = map.current.getSource(LANE_SOURCE_ID);
      if (source) {
        (source as mapboxgl.GeoJSONSource).setData(laneMesh.geojson);
      } else {
        map.current.addSource(LANE_SOURCE_ID, {
          type: 'geojson',
          data: laneMesh.geojson
        });
      }

      // Add layer if it doesn't exist
      if (!map.current.getLayer(LANE_LAYER_ID)) {
        // Find insertion point (before labels)
        const layers = map.current.getStyle().layers;
        const labelLayerId = layers?.find(
          (layer) => layer.type === 'symbol' && layer.layout && 'text-field' in layer.layout
        )?.id;

        map.current.addLayer(
          {
            id: LANE_LAYER_ID,
            type: 'fill-extrusion',
            source: LANE_SOURCE_ID,
            paint: {
              // Data-driven color from feature properties
              'fill-extrusion-color': ['get', 'color'],
              // Data-driven opacity with fade factor
              'fill-extrusion-opacity': ['get', 'opacity'],
              // Data-driven height for elevation
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': 0
            }
          },
          labelLayerId
        );
      }

      activeLaneSegmentRef.current = segment.segmentId;
    } else if (distance < -LANE_CONFIG.FADE_OUT_DISTANCE) {
      // Passed the maneuver, clear the layer
      if (map.current.getLayer(LANE_LAYER_ID)) {
        map.current.removeLayer(LANE_LAYER_ID);
      }
      if (map.current.getSource(LANE_SOURCE_ID)) {
        map.current.removeSource(LANE_SOURCE_ID);
      }
      activeLaneSegmentRef.current = null;
      laneMeshCacheRef.current.delete(segment.segmentId);
    }

    return () => {
      // Cleanup on unmount
      if (map.current) {
        if (map.current.getLayer(LANE_LAYER_ID)) {
          map.current.removeLayer(LANE_LAYER_ID);
        }
        if (map.current.getSource(LANE_SOURCE_ID)) {
          map.current.removeSource(LANE_SOURCE_ID);
        }
      }
    };
  }, [laneData, route, currentPosition, mapLoaded]);

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
