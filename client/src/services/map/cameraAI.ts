/**
 * AI-Assisted Camera Control System
 * Intelligent camera state machine for smooth, context-aware navigation experience
 */

import type { RouteStep } from '@/services/routing';
import type { WeatherData } from '@/services/weather';

// Camera state machine states
export type CameraIntent = 
  | 'cruising'          // Normal navigation, stable camera
  | 'approaching_turn'  // Pre-rotating for upcoming turn
  | 'in_turn'           // Active turn execution
  | 'searching_target'  // After search, overview then settle
  | 'overview';         // User-requested full route view

// Camera configuration for each state
export interface CameraParams {
  pitch: number;        // 0-85 degrees
  zoom: number;         // Mapbox zoom level
  bearing?: number;     // 0-360 degrees (undefined = follow route)
  duration?: number;    // Animation duration in ms
  easing?: (t: number) => number;
}

// Context information for AI decision making
export interface CameraContext {
  // Route information
  currentStep?: RouteStep;
  nextStep?: RouteStep;
  distanceToNextStep: number;  // meters
  distanceToStepAfterNext?: number; // meters
  routeGeometry?: [number, number][];
  
  // Vehicle state
  speed: number;        // km/h
  currentBearing: number; // 0-360
  
  // Weather conditions
  weather?: WeatherData;
  
  // User interactions
  userOverride?: boolean;
  cinematicMode: boolean;
  
  // Route characteristics
  isHighway: boolean;
  turnDensity: 'low' | 'medium' | 'high'; // turns per km
}

// Camera state with smooth transition tracking
export interface CameraState {
  intent: CameraIntent;
  params: CameraParams;
  lastUpdate: number;
  targetBearing?: number;
  transitionProgress: number; // 0-1
}

// Configuration constants
const CAMERA_CONFIG = {
  // State-specific base parameters
  cruising: {
    city: { pitch: 57, zoom: 15 },
    highway: { pitch: 55, zoom: 13 },
  },
  approaching_turn: {
    pitch: 60,        // Slightly higher for visibility
    zoomAdjust: 0.5,  // Increase zoom a bit
  },
  in_turn: {
    pitchReduce: 5,   // Lower pitch during turn
    zoomReduce: 1,    // Tighter view
  },
  searching_target: {
    pitch: 45,
    zoom: 12,
    duration: 1500,
  },
  overview: {
    pitch: 30,
    zoom: 11,
    duration: 2000,
  },
  
  // Thresholds
  turnApproachDistance: 200,    // Start pre-rotating 200m before turn
  turnActiveDistance: 50,       // Consider "in turn" within 50m
  denseTurnThreshold: 150,      // Two turns <150m = dense
  slowSpeedThreshold: 8,        // km/h - traffic congestion
  
  // Animation constraints
  maxBearingDelta: 3,           // degrees per frame at 60fps
  maxPitchDelta: 1,             // degrees per frame
  maxZoomDelta: 0.05,           // zoom units per frame
  
  // Weather adjustments
  severeWeatherPitchReduce: 8,
  severeWeatherZoomReduce: 1.5,
  severeWeatherBearingSlowdown: 0.5, // multiply bearing delta
};

/**
 * Determine camera intent based on navigation context
 */
export function determineIntent(
  currentIntent: CameraIntent,
  context: CameraContext
): CameraIntent {
  const { distanceToNextStep, distanceToStepAfterNext, userOverride } = context;
  
  // User override takes precedence
  if (userOverride) {
    return currentIntent;
  }
  
  // Overview state is user-triggered, maintain until dismissed
  if (currentIntent === 'overview') {
    return 'overview';
  }
  
  // Searching target state (transition to cruising after settling)
  if (currentIntent === 'searching_target') {
    // Auto-transition to cruising after animation completes
    return 'cruising';
  }
  
  // Check if we're in an active turn
  if (distanceToNextStep <= CAMERA_CONFIG.turnActiveDistance) {
    return 'in_turn';
  }
  
  // Check if approaching a turn
  if (distanceToNextStep <= CAMERA_CONFIG.turnApproachDistance) {
    return 'approaching_turn';
  }
  
  // Default to cruising
  return 'cruising';
}

/**
 * Calculate turn density to adjust camera behavior
 */
function calculateTurnDensity(
  distanceToNext: number,
  distanceToAfter?: number
): 'low' | 'medium' | 'high' {
  if (!distanceToAfter) return 'low';
  
  const totalDistance = distanceToNext + distanceToAfter;
  
  if (totalDistance < CAMERA_CONFIG.denseTurnThreshold) {
    return 'high';
  } else if (totalDistance < CAMERA_CONFIG.denseTurnThreshold * 2) {
    return 'medium';
  }
  
  return 'low';
}

/**
 * Check if weather conditions are severe
 */
function isSevereWeather(weather?: WeatherData): boolean {
  if (!weather) return false;
  
  const condition = weather.condition.toLowerCase();
  return (
    condition.includes('rain') ||
    condition.includes('snow') ||
    condition.includes('fog') ||
    condition.includes('storm')
  );
}

/**
 * Calculate target bearing for next maneuver
 */
function calculateTargetBearing(
  currentPos: [number, number],
  targetPos: [number, number]
): number {
  const [lng1, lat1] = currentPos;
  const [lng2, lat2] = targetPos;
  
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
 * Calculate optimal camera parameters based on intent and context
 */
export function calculateCameraParams(
  intent: CameraIntent,
  context: CameraContext
): CameraParams {
  const {
    isHighway,
    speed,
    weather,
    distanceToNextStep,
    distanceToStepAfterNext,
    currentBearing,
    routeGeometry,
  } = context;
  
  let params: CameraParams;
  
  // Calculate turn density for AI adjustments
  const turnDensity = calculateTurnDensity(distanceToNextStep, distanceToStepAfterNext);
  const severeWeather = isSevereWeather(weather);
  const inTraffic = speed < CAMERA_CONFIG.slowSpeedThreshold;
  
  switch (intent) {
    case 'cruising': {
      const base = isHighway 
        ? CAMERA_CONFIG.cruising.highway 
        : CAMERA_CONFIG.cruising.city;
      
      params = {
        pitch: base.pitch,
        zoom: base.zoom,
        bearing: currentBearing,
        duration: 500,
      };
      
      // AI Heuristic: Adjust for turn density
      if (turnDensity === 'high') {
        params.zoom = Math.min(params.zoom + 1, 16.5);
      }
      
      break;
    }
    
    case 'approaching_turn': {
      const baseZoom = isHighway ? 13 : 15;
      
      params = {
        pitch: CAMERA_CONFIG.approaching_turn.pitch,
        zoom: baseZoom + CAMERA_CONFIG.approaching_turn.zoomAdjust,
        duration: 800,
      };
      
      // Calculate target bearing for pre-rotation
      if (routeGeometry && routeGeometry.length > 1) {
        params.bearing = calculateTargetBearing(
          routeGeometry[0],
          routeGeometry[Math.min(5, routeGeometry.length - 1)]
        );
      }
      
      // AI Heuristic: Dense turns need earlier pre-rotation
      if (turnDensity === 'high') {
        params.zoom = Math.min(params.zoom! + 0.5, 16.5);
        params.duration = 1200; // Slower rotation
      }
      
      break;
    }
    
    case 'in_turn': {
      const baseZoom = isHighway ? 13 : 15;
      const basePitch = isHighway ? 55 : 57;
      
      params = {
        pitch: basePitch - CAMERA_CONFIG.in_turn.pitchReduce,
        zoom: baseZoom - CAMERA_CONFIG.in_turn.zoomReduce,
        duration: 300,
      };
      
      // Tighter bearing follow during turn
      if (routeGeometry && routeGeometry.length > 1) {
        params.bearing = calculateTargetBearing(
          routeGeometry[0],
          routeGeometry[Math.min(2, routeGeometry.length - 1)]
        );
      }
      
      break;
    }
    
    case 'searching_target': {
      params = {
        pitch: CAMERA_CONFIG.searching_target.pitch,
        zoom: CAMERA_CONFIG.searching_target.zoom,
        duration: CAMERA_CONFIG.searching_target.duration,
        easing: easeInOutCubic,
      };
      break;
    }
    
    case 'overview': {
      params = {
        pitch: CAMERA_CONFIG.overview.pitch,
        zoom: CAMERA_CONFIG.overview.zoom,
        duration: CAMERA_CONFIG.overview.duration,
        easing: easeInOutCubic,
      };
      break;
    }
    
    default:
      params = {
        pitch: 55,
        zoom: 14,
        bearing: currentBearing,
      };
  }
  
  // AI Heuristic: Traffic adjustments
  if (inTraffic && intent !== 'overview') {
    params.pitch = Math.max(params.pitch - 8, 35); // Reduce pitch for better legibility
  }
  
  // AI Heuristic: Severe weather adjustments
  if (severeWeather && intent !== 'overview') {
    params.pitch = Math.max(
      params.pitch - CAMERA_CONFIG.severeWeatherPitchReduce,
      40
    );
    params.zoom = Math.max(
      params.zoom - CAMERA_CONFIG.severeWeatherZoomReduce,
      12
    );
  }
  
  return params;
}

/**
 * Smooth camera parameter interpolation with clamped deltas
 * Prevents motion sickness by limiting per-frame changes
 */
export function interpolateCameraParams(
  current: CameraParams,
  target: CameraParams,
  deltaTime: number // milliseconds since last frame
): CameraParams {
  const frameRatio = Math.min(deltaTime / 16.67, 2); // Normalize to 60fps, cap at 2x
  
  // Clamp deltas based on frame rate
  const maxBearingDelta = CAMERA_CONFIG.maxBearingDelta * frameRatio;
  const maxPitchDelta = CAMERA_CONFIG.maxPitchDelta * frameRatio;
  const maxZoomDelta = CAMERA_CONFIG.maxZoomDelta * frameRatio;
  
  // Interpolate pitch
  const pitchDiff = target.pitch - current.pitch;
  const pitch = current.pitch + Math.sign(pitchDiff) * Math.min(
    Math.abs(pitchDiff),
    maxPitchDelta
  );
  
  // Interpolate zoom
  const zoomDiff = target.zoom - current.zoom;
  const zoom = current.zoom + Math.sign(zoomDiff) * Math.min(
    Math.abs(zoomDiff),
    maxZoomDelta
  );
  
  // Interpolate bearing (handle wraparound)
  let bearing = current.bearing;
  if (target.bearing !== undefined && current.bearing !== undefined) {
    let bearingDiff = target.bearing - current.bearing;
    
    // Handle 360-degree wraparound
    if (bearingDiff > 180) bearingDiff -= 360;
    if (bearingDiff < -180) bearingDiff += 360;
    
    const clampedDiff = Math.sign(bearingDiff) * Math.min(
      Math.abs(bearingDiff),
      maxBearingDelta
    );
    
    bearing = (current.bearing + clampedDiff + 360) % 360;
  } else if (target.bearing !== undefined) {
    bearing = target.bearing;
  }
  
  return {
    pitch,
    zoom,
    bearing,
    duration: target.duration,
  };
}

/**
 * Easing functions for smooth animations
 */
function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Main camera update function - call this in requestAnimationFrame loop
 */
export function updateCamera(
  currentState: CameraState,
  context: CameraContext,
  deltaTime: number
): CameraState {
  // Determine new intent
  const newIntent = determineIntent(currentState.intent, context);
  
  // Calculate target camera parameters
  const targetParams = calculateCameraParams(newIntent, context);
  
  // Smooth interpolation with clamped deltas
  const interpolatedParams = interpolateCameraParams(
    currentState.params,
    targetParams,
    deltaTime
  );
  
  // Update transition progress
  let transitionProgress = currentState.transitionProgress;
  if (newIntent !== currentState.intent) {
    transitionProgress = 0;
  } else {
    transitionProgress = Math.min(transitionProgress + deltaTime / 1000, 1);
  }
  
  return {
    intent: newIntent,
    params: interpolatedParams,
    lastUpdate: Date.now(),
    targetBearing: targetParams.bearing,
    transitionProgress,
  };
}

/**
 * Initialize camera state
 */
export function createInitialCameraState(context: CameraContext): CameraState {
  const params = calculateCameraParams('cruising', context);
  
  return {
    intent: 'cruising',
    params,
    lastUpdate: Date.now(),
    transitionProgress: 1,
  };
}

/**
 * Trigger overview mode (full route view)
 */
export function triggerOverview(
  currentState: CameraState,
  routeBounds?: [[number, number], [number, number]]
): CameraState {
  return {
    ...currentState,
    intent: 'overview',
    transitionProgress: 0,
  };
}

/**
 * Trigger searching target mode (after location search)
 */
export function triggerSearchTarget(currentState: CameraState): CameraState {
  return {
    ...currentState,
    intent: 'searching_target',
    transitionProgress: 0,
  };
}

/**
 * Exit special modes and return to navigation
 */
export function exitSpecialMode(currentState: CameraState): CameraState {
  if (currentState.intent === 'overview' || currentState.intent === 'searching_target') {
    return {
      ...currentState,
      intent: 'cruising',
      transitionProgress: 0,
    };
  }
  return currentState;
}
