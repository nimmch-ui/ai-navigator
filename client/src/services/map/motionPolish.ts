import mapboxgl from 'mapbox-gl';

/**
 * Motion Polish Configuration
 * Adds visual flair: route breathing glow, motion blur emulation
 */

export interface MotionPolishConfig {
  enabled: boolean;
  breathingEnabled: boolean;
  motionBlurEnabled: boolean;
}

interface BreathingState {
  phase: number; // 0 to 2π
  lastUpdate: number;
  animationFrame: number | null;
}

interface MotionBlurState {
  lastBearing: number;
  lastUpdate: number;
  isBlurring: boolean;
  blurTimeout: number | null;
}

const breathingState: BreathingState = {
  phase: 0,
  lastUpdate: 0,
  animationFrame: null,
};

const motionBlurState: MotionBlurState = {
  lastBearing: 0,
  lastUpdate: 0,
  isBlurring: false,
  blurTimeout: null,
};

/**
 * Route Breathing Effect
 * Low speed: pulsing glow (2-3 second cycle)
 * Cruise speed: steady bright glow
 */
export function startRouteBreathing(
  map: mapboxgl.Map,
  routeLayerId: string,
  speed: number, // km/h
  enabled: boolean = true
): void {
  if (!enabled || !map || !map.getLayer(routeLayerId)) {
    stopRouteBreathing();
    return;
  }

  const isLowSpeed = speed < 20; // < 20 km/h = low speed

  if (!isLowSpeed) {
    // Cruise speed: steady glow
    stopRouteBreathing();
    applySteadyGlow(map, routeLayerId);
    return;
  }

  // Low speed: breathing animation
  if (breathingState.animationFrame !== null) {
    return; // Already animating
  }

  const animate = (timestamp: number) => {
    if (!map || !map.getLayer(routeLayerId)) {
      stopRouteBreathing();
      return;
    }

    const deltaTime = timestamp - breathingState.lastUpdate;
    breathingState.lastUpdate = timestamp;

    // Update phase (2-3 second cycle)
    const cycleSpeed = (2 * Math.PI) / 2500; // 2.5 second cycle
    breathingState.phase = (breathingState.phase + deltaTime * cycleSpeed) % (2 * Math.PI);

    // Calculate glow intensity (sine wave: 0.7 to 1.0)
    const baseIntensity = 0.7;
    const amplitude = 0.3;
    const intensity = baseIntensity + amplitude * Math.sin(breathingState.phase);

    try {
      // Apply breathing effect to route
      map.setPaintProperty(routeLayerId, 'line-opacity', intensity);
      
      // Optional: adjust line width slightly for breathing effect
      const baseWidth = 5;
      const widthVariation = 0.5;
      const width = baseWidth + widthVariation * Math.sin(breathingState.phase);
      map.setPaintProperty(routeLayerId, 'line-width', width);

    } catch (error) {
      console.warn('[MotionPolish] Breathing animation error:', error);
      stopRouteBreathing();
      return;
    }

    breathingState.animationFrame = requestAnimationFrame(animate);
  };

  breathingState.lastUpdate = performance.now();
  breathingState.animationFrame = requestAnimationFrame(animate);
}

/**
 * Stop route breathing animation
 */
export function stopRouteBreathing(): void {
  if (breathingState.animationFrame !== null) {
    cancelAnimationFrame(breathingState.animationFrame);
    breathingState.animationFrame = null;
  }
  breathingState.phase = 0;
}

/**
 * Apply steady glow for cruise speed
 */
function applySteadyGlow(map: mapboxgl.Map, routeLayerId: string): void {
  if (!map || !map.getLayer(routeLayerId)) return;

  try {
    map.setPaintProperty(routeLayerId, 'line-opacity', 0.95);
    map.setPaintProperty(routeLayerId, 'line-width', 5);
  } catch (error) {
    console.warn('[MotionPolish] Failed to apply steady glow:', error);
  }
}

/**
 * Motion Blur Emulation
 * Briefly ramps opacity on route halo during fast camera pans
 */
export function handleCameraPan(
  map: mapboxgl.Map,
  routeLayerId: string,
  currentBearing: number,
  enabled: boolean = true
): void {
  if (!enabled || !map || !map.getLayer(routeLayerId)) return;

  const now = performance.now();
  const deltaTime = now - motionBlurState.lastUpdate;
  const deltaRearing = Math.abs(currentBearing - motionBlurState.lastBearing);

  // Detect fast pan (>5 degrees per 16ms frame)
  const bearingSpeed = deltaRearing / (deltaTime / 16.67);
  const isFastPan = bearingSpeed > 5;

  if (isFastPan && !motionBlurState.isBlurring) {
    // Start motion blur
    applyMotionBlur(map, routeLayerId, true);
    motionBlurState.isBlurring = true;

    // Clear any existing timeout
    if (motionBlurState.blurTimeout !== null) {
      clearTimeout(motionBlurState.blurTimeout);
    }

    // Schedule blur removal after 150ms
    motionBlurState.blurTimeout = window.setTimeout(() => {
      applyMotionBlur(map, routeLayerId, false);
      motionBlurState.isBlurring = false;
      motionBlurState.blurTimeout = null;
    }, 150);
  }

  motionBlurState.lastBearing = currentBearing;
  motionBlurState.lastUpdate = now;
}

/**
 * Apply/remove motion blur effect
 */
function applyMotionBlur(
  map: mapboxgl.Map,
  routeLayerId: string,
  enabled: boolean
): void {
  if (!map || !map.getLayer(routeLayerId)) return;

  try {
    if (enabled) {
      // Add slight transparency for blur effect
      const currentOpacity = map.getPaintProperty(routeLayerId, 'line-opacity') as number ?? 0.95;
      map.setPaintProperty(routeLayerId, 'line-opacity', Math.max(0.7, currentOpacity - 0.15));
    } else {
      // Restore opacity
      map.setPaintProperty(routeLayerId, 'line-opacity', 0.95);
    }
  } catch (error) {
    console.warn('[MotionPolish] Failed to apply motion blur:', error);
  }
}

/**
 * Cleanup all motion polish effects
 */
export function cleanupMotionPolish(): void {
  stopRouteBreathing();
  
  if (motionBlurState.blurTimeout !== null) {
    clearTimeout(motionBlurState.blurTimeout);
    motionBlurState.blurTimeout = null;
  }
  
  motionBlurState.isBlurring = false;
}
