/**
 * 3D Lane Rendering Service
 * Builds elevated 3D lane ribbons for Mapbox GL visualization
 */

import type { LaneSegment, Lane } from '@shared/schema';
import type { RouteStep } from '@/services/routing';
import mapboxgl from 'mapbox-gl';

// Configurable constants - can be adjusted based on real API data or preferences
export const LANE_CONFIG = {
  WIDTH: 3.5, // meters (standard lane width)
  ELEVATION: 0.75, // meters above road surface
  LENGTH: 80, // meters (length of visible lane ribbon)
  FADE_IN_DISTANCE: 300, // Start showing lanes 300m before maneuver
  FADE_OUT_DISTANCE: 50, // Hide lanes 50m after passing maneuver
  MIN_START_DISTANCE: 5, // Minimum distance to place lane start from maneuver
};

// Color constants for data-driven styling
export const LANE_COLORS = {
  RECOMMENDED: '#3b82f6', // Primary blue with glow
  ALLOWED: '#9ca3af', // Neutral gray
  DISALLOWED: '#6b7280', // Dim gray with transparency
};

interface LaneGeometry {
  type: 'Feature';
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  properties: {
    laneId: string;
    recommended: boolean;
    direction: Lane['direction'];
    color: string;
    opacity: number;
    height: number;
  };
}

export interface LaneMesh {
  geojson: GeoJSON.FeatureCollection<GeoJSON.Polygon>;
  opacity: number;
  visible: boolean;
}

/**
 * Calculate bearing between two coordinates
 */
function calculateBearing(from: [number, number], to: [number, number]): number {
  const [lng1, lat1] = from;
  const [lng2, lat2] = to;
  
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
  
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * Calculate destination point given start point, bearing, and distance
 */
function destinationPoint(
  point: [number, number],
  bearing: number,
  distance: number
): [number, number] {
  const radius = 6371e3; // Earth radius in meters
  const [lng, lat] = point;
  
  const lat1Rad = lat * Math.PI / 180;
  const lng1Rad = lng * Math.PI / 180;
  const bearingRad = bearing * Math.PI / 180;
  
  const lat2Rad = Math.asin(
    Math.sin(lat1Rad) * Math.cos(distance / radius) +
    Math.cos(lat1Rad) * Math.sin(distance / radius) * Math.cos(bearingRad)
  );
  
  const lng2Rad = lng1Rad + Math.atan2(
    Math.sin(bearingRad) * Math.sin(distance / radius) * Math.cos(lat1Rad),
    Math.cos(distance / radius) - Math.sin(lat1Rad) * Math.sin(lat2Rad)
  );
  
  return [lng2Rad * 180 / Math.PI, lat2Rad * 180 / Math.PI];
}

/**
 * Get color for lane based on status
 */
function getLaneColor(lane: Lane): string {
  if (lane.recommended) {
    return LANE_COLORS.RECOMMENDED;
  }
  
  // Non-recommended lanes are allowed (neutral)
  // Future: could mark disallowed lanes based on direction mismatch
  return LANE_COLORS.ALLOWED;
}

/**
 * Get opacity for lane based on status
 */
function getLaneOpacity(lane: Lane, distanceFactor: number): number {
  const baseOpacity = lane.recommended ? 0.9 : 0.5;
  return baseOpacity * distanceFactor;
}

/**
 * Build 3D lane ribbon geometry for a single lane
 */
function buildLaneRibbon(
  lane: Lane,
  laneIndex: number,
  totalLanes: number,
  startPoint: [number, number],
  bearing: number,
  distanceFactor: number
): LaneGeometry {
  // Calculate lane offset from center (lanes spread perpendicular to bearing)
  const laneOffset = (laneIndex - (totalLanes - 1) / 2) * LANE_CONFIG.WIDTH;
  const perpBearing = (bearing + 90) % 360; // Perpendicular to road direction
  
  // Calculate lane center line
  const laneCenter = destinationPoint(startPoint, perpBearing, laneOffset);
  
  // Build lane ribbon polygon (rectangular strip)
  const halfWidth = LANE_CONFIG.WIDTH / 2;
  const forwardBearing = bearing;
  
  // Four corners of the lane ribbon
  const front = destinationPoint(laneCenter, forwardBearing, LANE_CONFIG.LENGTH / 2);
  const back = destinationPoint(laneCenter, (forwardBearing + 180) % 360, LANE_CONFIG.LENGTH / 2);
  
  const frontLeft = destinationPoint(front, perpBearing, halfWidth);
  const frontRight = destinationPoint(front, (perpBearing + 180) % 360, halfWidth);
  const backLeft = destinationPoint(back, perpBearing, halfWidth);
  const backRight = destinationPoint(back, (perpBearing + 180) % 360, halfWidth);
  
  // Create polygon coordinates (close the ring)
  const coordinates = [[
    frontLeft,
    frontRight,
    backRight,
    backLeft,
    frontLeft
  ]];
  
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates
    },
    properties: {
      laneId: lane.id,
      recommended: lane.recommended ?? false,
      direction: lane.direction,
      color: getLaneColor(lane),
      opacity: getLaneOpacity(lane, distanceFactor),
      height: LANE_CONFIG.ELEVATION
    }
  };
}

/**
 * Build complete lane mesh for a maneuver step
 * API-ready abstraction - can be replaced with real lane API data
 */
export function buildLaneMesh(
  laneSegment: LaneSegment,
  routeGeometry: [number, number][],
  distanceToManeuver: number
): LaneMesh | null {
  if (!laneSegment.lanes || laneSegment.lanes.length === 0) {
    return null;
  }
  
  // Calculate visibility and opacity based on distance
  const visible = distanceToManeuver <= LANE_CONFIG.FADE_IN_DISTANCE && 
                  distanceToManeuver >= -LANE_CONFIG.FADE_OUT_DISTANCE;
  
  if (!visible) {
    return null;
  }
  
  // Calculate fade factor for smooth transitions
  let distanceFactor = 1.0;
  const fadeInStart = LANE_CONFIG.FADE_IN_DISTANCE;
  const fadeInComplete = LANE_CONFIG.FADE_IN_DISTANCE - 100;
  
  if (distanceToManeuver > fadeInComplete) {
    // Fade in from FADE_IN_DISTANCE to (FADE_IN_DISTANCE - 100)
    distanceFactor = 1 - (distanceToManeuver - fadeInComplete) / 100;
  } else if (distanceToManeuver < 0) {
    // Fade out after passing (0m to -FADE_OUT_DISTANCE)
    distanceFactor = 1 + (distanceToManeuver / LANE_CONFIG.FADE_OUT_DISTANCE);
  }
  
  distanceFactor = Math.max(0, Math.min(1, distanceFactor));
  
  // Use explicit coordinate index if provided, otherwise fall back to stepIndex
  const maneuverPointIndex = laneSegment.maneuverCoordinateIndex ?? 
                              Math.min(laneSegment.stepIndex, routeGeometry.length - 1);
  
  if (maneuverPointIndex < 1 || maneuverPointIndex >= routeGeometry.length) {
    return null; // Need at least 2 points for bearing calculation
  }
  
  // Get maneuver point and calculate approach bearing from the polyline segment
  const maneuverPoint = routeGeometry[maneuverPointIndex];
  const previousPoint = routeGeometry[maneuverPointIndex - 1];
  const bearing = calculateBearing(previousPoint, maneuverPoint);
  
  // Position lanes before the maneuver point, clamped to MIN_START_DISTANCE
  const laneStartDistance = Math.max(
    LANE_CONFIG.MIN_START_DISTANCE,
    Math.min(40, distanceToManeuver / 2)
  );
  const laneStartPoint = destinationPoint(
    maneuverPoint,
    (bearing + 180) % 360,
    laneStartDistance
  );
  
  // Build geometry for each lane
  const features: LaneGeometry[] = laneSegment.lanes.map((lane, index) =>
    buildLaneRibbon(
      lane,
      index,
      laneSegment.lanes.length,
      laneStartPoint,
      bearing,
      distanceFactor
    )
  );
  
  return {
    geojson: {
      type: 'FeatureCollection',
      features
    },
    opacity: distanceFactor,
    visible: true
  };
}

/**
 * Calculate distance to maneuver from current position
 */
export function calculateDistanceToManeuver(
  currentPosition: [number, number],
  routeGeometry: [number, number][],
  stepIndex: number
): number {
  if (stepIndex >= routeGeometry.length) {
    return Infinity;
  }
  
  const maneuverPoint = routeGeometry[stepIndex];
  
  // Simple haversine distance calculation
  const [lng1, lat1] = currentPosition;
  const [lng2, lat2] = maneuverPoint;
  
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Find the next maneuver that has lane data
 * Guards against multiple segments within fade-in range by selecting closest
 */
export function findNextLaneManeuver(
  currentPosition: [number, number],
  routeGeometry: [number, number][],
  laneData: Map<number, LaneSegment>
): { segment: LaneSegment; distance: number } | null {
  if (laneData.size === 0) {
    return null;
  }
  
  let closestManeuver: { segment: LaneSegment; distance: number } | null = null;
  let minDistance = Infinity;
  
  laneData.forEach((segment) => {
    const coordinateIndex = segment.maneuverCoordinateIndex ?? segment.stepIndex;
    const distance = calculateDistanceToManeuver(
      currentPosition,
      routeGeometry,
      coordinateIndex
    );
    
    // Only consider upcoming maneuvers within fade-in range
    // Guard: always pick the closest one if multiple are in range
    if (distance >= 0 && distance <= LANE_CONFIG.FADE_IN_DISTANCE && distance < minDistance) {
      minDistance = distance;
      closestManeuver = { segment, distance };
    }
  });
  
  return closestManeuver;
}
