/**
 * Cinematic Camera Service - Smooth camera follow for navigation
 * Features: 60fps tracking, auto-bearing alignment, motion sickness prevention
 */

import mapboxgl from 'mapbox-gl';

interface CinematicCameraConfig {
  pitch: number;
  zoom: number;
  maxBearingDelta: number;
  easingDuration: number;
}

interface CameraPosition {
  center: [number, number]; // [lat, lng]
  bearing?: number;
  pitch?: number;
  zoom?: number;
}

const CITY_ZOOM = 15.5;
const HIGHWAY_ZOOM = 12.5;
const CINEMATIC_PITCH = 62;
const MAX_BEARING_DELTA_PER_FRAME = 5; // degrees per frame (prevents motion sickness)
const EASING_DURATION = 200; // ms for smooth transitions (reduced to prevent jitter)
const MIN_ZOOM = 10;
const MAX_ZOOM = 18;
const UPDATE_THROTTLE_MS = 100; // Throttle updates to prevent excessive easeTo calls

let animationFrameId: number | null = null;
let lastBearing: number | null = null;
let lastUpdateTime = 0;
let isEnabled = false;

/**
 * Calculate bearing between two points
 */
function calculateBearing(from: [number, number], to: [number, number]): number {
  const lat1 = from[0] * Math.PI / 180;
  const lat2 = to[0] * Math.PI / 180;
  const dLon = (to[1] - from[1]) * Math.PI / 180;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  
  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  bearing = (bearing + 360) % 360; // Normalize to 0-360
  
  return bearing;
}

/**
 * Smoothly interpolate bearing to prevent motion sickness
 */
function smoothBearing(targetBearing: number, currentBearing: number): number {
  if (currentBearing === null) {
    return targetBearing;
  }

  // Calculate shortest rotation
  let delta = targetBearing - currentBearing;
  
  // Normalize to -180 to 180
  if (delta > 180) {
    delta -= 360;
  } else if (delta < -180) {
    delta += 360;
  }

  // Clamp to max delta per frame
  const clampedDelta = Math.max(-MAX_BEARING_DELTA_PER_FRAME, Math.min(MAX_BEARING_DELTA_PER_FRAME, delta));
  
  return (currentBearing + clampedDelta + 360) % 360;
}

/**
 * Determine zoom level based on context (city vs highway)
 */
function getContextualZoom(speed?: number): number {
  // If speed is available (future enhancement), use it
  // For now, default to city zoom for navigation
  return CITY_ZOOM;
}

/**
 * Clamp zoom to safe limits
 */
function clampZoom(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
}

/**
 * Find the closest route segment to the current position
 */
function findNearestSegment(
  currentPos: [number, number],
  route: Array<[number, number]>
): { from: [number, number]; to: [number, number] } | null {
  if (!route || route.length < 2) return null;

  let minDistance = Infinity;
  let nearestSegment: { from: [number, number]; to: [number, number] } | null = null;

  for (let i = 0; i < route.length - 1; i++) {
    const from = route[i];
    const to = route[i + 1];
    
    // Calculate distance from current position to the midpoint of this segment
    const midLat = (from[0] + to[0]) / 2;
    const midLng = (from[1] + to[1]) / 2;
    
    const distance = Math.sqrt(
      Math.pow(currentPos[0] - midLat, 2) + Math.pow(currentPos[1] - midLng, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestSegment = { from, to };
    }
  }

  return nearestSegment;
}

/**
 * Start cinematic camera follow mode
 */
export function startCinematicFollow(
  map: mapboxgl.Map,
  getRoute?: () => Array<[number, number]> | undefined
) {
  if (isEnabled) {
    return; // Already running
  }

  isEnabled = true;
  lastBearing = map.getBearing();
  lastUpdateTime = Date.now();

  const updateCamera = () => {
    if (!isEnabled || !map) {
      return;
    }

    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTime;

    // Throttle updates to prevent jitter from excessive easeTo calls
    if (timeSinceLastUpdate < UPDATE_THROTTLE_MS) {
      animationFrameId = requestAnimationFrame(updateCamera);
      return;
    }

    lastUpdateTime = now;

    // Get current camera position directly from map
    const mapCenter = map.getCenter();
    const currentPos: [number, number] = [mapCenter.lat, mapCenter.lng];
    const currentZoom = map.getZoom();
    
    // Calculate target bearing from nearest route segment if available
    let targetBearing = lastBearing || 0;
    const route = getRoute?.();
    
    if (route && route.length >= 2) {
      const nearestSegment = findNearestSegment(currentPos, route);
      if (nearestSegment) {
        targetBearing = calculateBearing(nearestSegment.from, nearestSegment.to);
      }
    }

    // Smooth bearing transition to prevent motion sickness
    const smoothedBearing = smoothBearing(targetBearing, lastBearing || targetBearing);
    lastBearing = smoothedBearing;

    // Get contextual zoom
    const targetZoom = getContextualZoom();
    const clampedZoom = clampZoom(targetZoom);

    // Smooth camera movement with short easing
    map.easeTo({
      center: mapCenter, // Keep current center
      bearing: smoothedBearing,
      pitch: CINEMATIC_PITCH,
      zoom: clampedZoom,
      duration: EASING_DURATION,
      easing: (t) => t * (2 - t) // Ease out quad for smoothness
    });

    // Continue animation loop at 60fps
    animationFrameId = requestAnimationFrame(updateCamera);
  };

  // Start the animation loop
  updateCamera();
}

/**
 * Stop cinematic camera follow mode
 */
export function stopCinematicFollow() {
  isEnabled = false;
  
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  
  lastBearing = null;
}

/**
 * Check if cinematic mode is currently active
 */
export function isCinematicActive(): boolean {
  return isEnabled;
}

/**
 * Get cinematic camera configuration
 */
export function getCinematicConfig(): CinematicCameraConfig {
  return {
    pitch: CINEMATIC_PITCH,
    zoom: CITY_ZOOM,
    maxBearingDelta: MAX_BEARING_DELTA_PER_FRAME,
    easingDuration: EASING_DURATION
  };
}
