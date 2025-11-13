/**
 * SmartETA - Traffic-aware ETA calculation engine
 * 
 * Computes accurate ETAs by factoring in:
 * - Real-time traffic congestion
 * - Weather conditions
 * - Stop-and-go patterns
 * - Speed limits vs actual speeds
 * - UI mode preferences (eco vs fastest)
 */

import type { RouteResult } from '../routing';
import type { WeatherNow } from '../data/types';
import type { UiMode } from '@/types';
import { trafficFusionEngine } from '../ai/TrafficFusionEngine';
import { enrichRouteWithTrafficData, type EnrichedRouteSegment } from '../ai/routeTrafficEnrichment';
import { EventBus } from '../eventBus';

export interface ETAResult {
  estimatedSeconds: number;
  confidence: number; // 0-1 scale
  breakdown: {
    baseTime: number;
    trafficDelay: number;
    weatherDelay: number;
    stopAndGoDelay: number;
  };
  lastUpdated: number;
}

export interface ETAComputeOptions {
  currentSpeed?: number; // km/h
  mode?: UiMode;
  considerWeather?: boolean;
}

/**
 * Compute traffic-aware ETA for a route
 */
export function computeETA(
  route: RouteResult,
  weather?: WeatherNow | null,
  options: ETAComputeOptions = {}
): ETAResult {
  const {
    currentSpeed = 0,
    mode = 'CLASSIC',
    considerWeather = true,
  } = options;

  // Base time from Mapbox Directions API
  let baseTime = route.duration;

  // Enrich route with traffic data
  const enrichedSegments = enrichRouteWithTrafficData(route.geometry);
  
  // Calculate traffic delay
  const trafficDelay = calculateTrafficDelay(enrichedSegments, route.duration);
  
  // Calculate weather delay
  const weatherDelay = considerWeather && weather 
    ? calculateWeatherDelay(route.duration, weather)
    : 0;
  
  // Calculate stop-and-go delay based on congestion patterns
  const stopAndGoDelay = calculateStopAndGoDelay(enrichedSegments);
  
  // Apply mode-specific adjustments
  const modeMultiplier = getModeMultiplier(mode);
  
  // Total estimated time
  const estimatedSeconds = Math.round(
    (baseTime + trafficDelay + weatherDelay + stopAndGoDelay) * modeMultiplier
  );
  
  // Calculate confidence based on data freshness and coverage
  const confidence = calculateConfidence(enrichedSegments, weather);
  
  return {
    estimatedSeconds,
    confidence,
    breakdown: {
      baseTime,
      trafficDelay,
      weatherDelay,
      stopAndGoDelay,
    },
    lastUpdated: Date.now(),
  };
}

/**
 * Recalculate ETA when traffic updates arrive
 */
export function recalculateETAOnUpdate(
  currentRoute: RouteResult,
  weather?: WeatherNow | null,
  options: ETAComputeOptions = {}
): ETAResult {
  console.log('[SmartETA] Recalculating ETA due to traffic update');
  return computeETA(currentRoute, weather, options);
}

/**
 * Calculate delay caused by traffic congestion
 */
function calculateTrafficDelay(
  segments: EnrichedRouteSegment[],
  baseTime: number
): number {
  if (segments.length === 0) {
    return 0;
  }

  let totalDelay = 0;

  for (const segment of segments) {
    const congestion = segment.congestion; // 0-100
    
    // Estimate segment base time (proportional to segment length)
    const segmentLength = segment.coordinates.length;
    const segmentBaseTime = baseTime * (segmentLength / getTotalSegmentLength(segments));
    
    // Apply congestion factor
    // 0% congestion = 0% delay
    // 50% congestion = 25% delay
    // 100% congestion = 100% delay (doubled time)
    const delayFactor = Math.pow(congestion / 100, 1.5);
    const segmentDelay = segmentBaseTime * delayFactor;
    
    totalDelay += segmentDelay;
    
    // Add incident delays
    for (const incident of segment.incidents) {
      totalDelay += incident.delayMinutes * 60; // Convert to seconds
    }
  }

  return totalDelay;
}

/**
 * Calculate delay caused by weather conditions
 */
function calculateWeatherDelay(baseTime: number, weather: WeatherNow): number {
  let delayFactor = 0;

  // Rain impact
  if (weather.rain1h && weather.rain1h > 0) {
    if (weather.rain1h > 5) {
      delayFactor += 0.15; // Heavy rain: +15%
    } else if (weather.rain1h > 2) {
      delayFactor += 0.10; // Moderate rain: +10%
    } else {
      delayFactor += 0.05; // Light rain: +5%
    }
  }

  // Snow impact
  if (weather.snow1h && weather.snow1h > 0) {
    if (weather.snow1h > 5) {
      delayFactor += 0.30; // Heavy snow: +30%
    } else if (weather.snow1h > 2) {
      delayFactor += 0.20; // Moderate snow: +20%
    } else {
      delayFactor += 0.10; // Light snow: +10%
    }
  }

  // Wind impact (high winds)
  if (weather.windSpeed > 15) { // >15 m/s
    delayFactor += 0.05; // +5%
  }

  // Visibility impact
  if (weather.visibility < 1000) { // <1km visibility
    delayFactor += 0.15; // Low visibility: +15%
  } else if (weather.visibility < 5000) { // <5km visibility
    delayFactor += 0.05; // Reduced visibility: +5%
  }

  // Cap total weather delay at 50%
  delayFactor = Math.min(delayFactor, 0.5);

  return baseTime * delayFactor;
}

/**
 * Calculate delay from stop-and-go traffic patterns
 */
function calculateStopAndGoDelay(segments: EnrichedRouteSegment[]): number {
  let stopAndGoDelay = 0;

  for (const segment of segments) {
    // Stop-and-go occurs in medium-high congestion (50-80%)
    if (segment.congestion >= 50 && segment.congestion < 80) {
      // Each stop-and-go segment adds ~10-30 seconds depending on length
      const segmentLength = segment.coordinates.length;
      const delayPerPoint = 1.5; // seconds per coordinate point
      stopAndGoDelay += segmentLength * delayPerPoint * (segment.congestion / 100);
    }
    
    // Severe congestion (80-100%) - mostly stopped
    if (segment.congestion >= 80) {
      const segmentLength = segment.coordinates.length;
      const delayPerPoint = 3; // seconds per coordinate point (longer stops)
      stopAndGoDelay += segmentLength * delayPerPoint;
    }
  }

  return stopAndGoDelay;
}

/**
 * Get mode-specific time multiplier
 */
function getModeMultiplier(mode: UiMode): number {
  switch (mode) {
    case 'ECO':
      return 1.1; // Eco mode drives slower, +10% time
    case 'CINEMATIC':
    case 'VR':
      return 1.0; // Normal speed
    case 'CLASSIC':
    case '3D':
    case 'AR':
    case 'NIGHT_VISION':
    default:
      return 1.0;
  }
}

/**
 * Calculate confidence in ETA estimate
 */
function calculateConfidence(
  segments: EnrichedRouteSegment[],
  weather?: WeatherNow | null
): number {
  let confidence = 1.0;

  // Reduce confidence if we have no traffic data
  const segmentsWithTraffic = segments.filter(s => s.congestion > 0);
  const trafficCoverage = segments.length > 0 
    ? segmentsWithTraffic.length / segments.length 
    : 0;
  
  confidence *= 0.5 + (trafficCoverage * 0.5); // Range: 0.5 - 1.0

  // Reduce confidence if weather data is stale or missing
  if (!weather) {
    confidence *= 0.95;
  }

  // Clamp to 0-1 range
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Helper to get total segment length
 */
function getTotalSegmentLength(segments: EnrichedRouteSegment[]): number {
  return segments.reduce((sum, seg) => sum + seg.coordinates.length, 0);
}

/**
 * Set up ETA auto-recalculation on traffic updates
 */
export function setupETAAutoUpdate(
  getCurrentRoute: () => RouteResult | null,
  getCurrentWeather: () => WeatherNow | null,
  onETAUpdate: (eta: ETAResult) => void,
  options: ETAComputeOptions = {}
): () => void {
  const handleTrafficUpdate = () => {
    const route = getCurrentRoute();
    if (!route) return;
    
    const weather = getCurrentWeather();
    const newETA = recalculateETAOnUpdate(route, weather, options);
    onETAUpdate(newETA);
  };

  // Listen for traffic updates
  EventBus.on('ai:trafficUpdate' as any, handleTrafficUpdate);

  // Cleanup function
  return () => {
    EventBus.off('ai:trafficUpdate' as any, handleTrafficUpdate);
  };
}
