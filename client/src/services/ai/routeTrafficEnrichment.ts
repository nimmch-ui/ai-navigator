import type { TrafficSegment } from './TrafficFusionEngine';
import type { TrafficIncidentData } from '../data/types';
import { trafficFusionEngine } from './TrafficFusionEngine';

/**
 * Enriched route segment with traffic data
 */
export interface EnrichedRouteSegment {
  coordinates: [number, number][];
  congestion: number; // 0-100
  predictedCongestion: number; // 0-100
  speed: number; // km/h
  color: 'green' | 'yellow' | 'orange' | 'red'; // Visual color code
  incidents: TrafficIncidentData[];
}

/**
 * Enrich route coordinates with real-time traffic data
 * 
 * @param routeCoordinates - Array of route coordinates
 * @returns Array of enriched segments with traffic data
 */
export function enrichRouteWithTrafficData(
  routeCoordinates: [number, number][]
): EnrichedRouteSegment[] {
  if (!routeCoordinates || routeCoordinates.length < 2) {
    return [];
  }

  const allSegments = trafficFusionEngine.getAllSegments();
  const enrichedSegments: EnrichedRouteSegment[] = [];
  
  // Split route into segments and match with traffic data
  const SEGMENT_LENGTH = 10; // coordinates per segment
  
  for (let i = 0; i < routeCoordinates.length - 1; i += SEGMENT_LENGTH) {
    const end = Math.min(i + SEGMENT_LENGTH + 1, routeCoordinates.length);
    const segmentCoords = routeCoordinates.slice(i, end);
    
    // Find matching traffic segment (nearest)
    const trafficSegment = findNearestTrafficSegment(segmentCoords, allSegments);
    
    if (trafficSegment) {
      enrichedSegments.push({
        coordinates: segmentCoords,
        congestion: trafficSegment.congestion,
        predictedCongestion: trafficSegment.predictedCongestion,
        speed: trafficSegment.speed,
        color: getCongestionColor(trafficSegment.congestion),
        incidents: trafficSegment.incidents,
      });
    } else {
      // No traffic data available - use default (free flow)
      enrichedSegments.push({
        coordinates: segmentCoords,
        congestion: 0,
        predictedCongestion: 0,
        speed: 60,
        color: 'green',
        incidents: [],
      });
    }
  }
  
  return enrichedSegments;
}

/**
 * Find nearest traffic segment to route coordinates
 * Uses multiple sample points for better matching
 */
function findNearestTrafficSegment(
  routeCoords: [number, number][],
  trafficSegments: TrafficSegment[]
): TrafficSegment | null {
  if (trafficSegments.length === 0 || routeCoords.length === 0) {
    return null;
  }

  // Sample multiple points along the route segment for better matching
  const samplePoints: [number, number][] = [];
  const sampleCount = Math.min(5, routeCoords.length);
  
  for (let i = 0; i < sampleCount; i++) {
    const index = Math.floor((i / (sampleCount - 1)) * (routeCoords.length - 1));
    samplePoints.push(routeCoords[index]);
  }

  let bestMatch: { segment: TrafficSegment; avgDistance: number } | null = null;

  for (const segment of trafficSegments) {
    if (segment.coordinates.length === 0) continue;
    
    // Calculate average distance from all sample points to segment
    let totalDistance = 0;
    for (const point of samplePoints) {
      // Find closest point on segment to this route point
      let minDistToSegment = Infinity;
      for (const segCoord of segment.coordinates) {
        const dist = calculateDistance(point, segCoord);
        if (dist < minDistToSegment) {
          minDistToSegment = dist;
        }
      }
      totalDistance += minDistToSegment;
    }
    
    const avgDistance = totalDistance / samplePoints.length;
    
    if (!bestMatch || avgDistance < bestMatch.avgDistance) {
      bestMatch = { segment, avgDistance };
    }
  }

  // Return if within reasonable distance (3km average)
  return bestMatch && bestMatch.avgDistance < 3000 ? bestMatch.segment : null;
}

/**
 * Get color code for congestion level
 */
function getCongestionColor(congestion: number): 'green' | 'yellow' | 'orange' | 'red' {
  if (congestion >= 70) return 'red';
  if (congestion >= 50) return 'orange';
  if (congestion >= 30) return 'yellow';
  return 'green';
}

/**
 * Calculate distance between two points (Haversine formula)
 */
function calculateDistance(
  point1: [number, number],
  point2: [number, number]
): number {
  const [lat1, lon1] = point1;
  const [lat2, lon2] = point2;
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Get traffic segments for display helpers
 */
export function getSegmentTraffic(segmentId: string): TrafficSegment | null {
  return trafficFusionEngine.getSegmentTraffic(segmentId);
}

/**
 * Get upcoming incidents within radius
 */
export function getUpcomingIncidents(
  center: [number, number],
  radiusMeters: number
): TrafficIncidentData[] {
  return trafficFusionEngine.getUpcomingIncidents(center, radiusMeters);
}
