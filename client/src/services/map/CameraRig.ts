/**
 * CameraRig - Cinematic Camera Choreography System
 * Provides smooth camera movements, easing curves, and advanced controls for CINEMATIC mode
 */

import type mapboxgl from 'mapbox-gl';

// Easing functions for smooth animations
export const easingCurves = {
  linear: (t: number): number => t,
  
  easeInOutCubic: (t: number): number => {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  },
  
  easeInCubic: (t: number): number => t * t * t,
  
  easeOutCubic: (t: number): number => 1 - Math.pow(1 - t, 3),
  
  easeInOutQuad: (t: number): number => {
    return t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;
  },
  
  easeInOutQuart: (t: number): number => {
    return t < 0.5
      ? 8 * t * t * t * t
      : 1 - Math.pow(-2 * t + 2, 4) / 2;
  }
};

export interface CameraRigConfig {
  cinematicTilt: [number, number];  // [min, max] pitch range for cinematic mode
  bearingSmoothingFactor: number;   // 0-1, how much to smooth bearing changes
  parallaxIntensity: number;        // Parallax effect on gestures
  defaultDuration: number;          // Default animation duration (ms)
  easing: (t: number) => number;    // Default easing function
}

export interface PanToOptions {
  center: [number, number];
  zoom?: number;
  pitch?: number;
  bearing?: number;
  duration?: number;
  easing?: (t: number) => number;
}

export interface FollowRouteOptions {
  segment: [number, number][];  // Route segment to follow
  speedKmH: number;             // Current speed
  smooth?: boolean;             // Apply smoothing
  duration?: number;
}

export interface OrbitPOIOptions {
  center: [number, number];
  radius?: number;      // Orbit radius in meters
  startBearing?: number;
  endBearing?: number;
  duration?: number;
  easing?: (t: number) => number;
}

/**
 * CameraRig class - Advanced camera control for cinematic experiences
 */
export class CameraRig {
  private map: mapboxgl.Map;
  private config: CameraRigConfig;
  private animationFrameId: number | null = null;
  private isAnimating = false;
  private lastBearing: number = 0;
  private bearingVelocity: number = 0;
  
  constructor(map: mapboxgl.Map, config?: Partial<CameraRigConfig>) {
    this.map = map;
    this.config = {
      cinematicTilt: [55, 65],
      bearingSmoothingFactor: 0.15,
      parallaxIntensity: 0.3,
      defaultDuration: 1000,
      easing: easingCurves.easeInOutCubic,
      ...config
    };
    
    // Initialize bearing from map
    this.lastBearing = this.map.getBearing();
  }
  
  /**
   * Pan camera to specific location with smooth animation
   */
  panTo(options: PanToOptions): Promise<void> {
    const {
      center,
      zoom = this.map.getZoom(),
      pitch = this.map.getPitch(),
      bearing = this.map.getBearing(),
      duration = this.config.defaultDuration,
      easing = this.config.easing
    } = options;
    
    return new Promise((resolve) => {
      this.map.easeTo({
        center,
        zoom,
        pitch,
        bearing,
        duration,
        easing,
      });
      
      setTimeout(resolve, duration);
    });
  }
  
  /**
   * Follow route segment with speed-aware camera behavior
   */
  followRoute(options: FollowRouteOptions): void {
    const { segment, speedKmH, smooth = true, duration } = options;
    
    if (segment.length < 2) return;
    
    // Calculate bearing from current position to next point
    const [currentLng, currentLat] = segment[0];
    const [nextLng, nextLat] = segment[1];
    
    const targetBearing = this.calculateBearing(
      currentLat, currentLng,
      nextLat, nextLng
    );
    
    // Apply smoothing for CINEMATIC mode
    const finalBearing = smooth
      ? this.smoothBearing(targetBearing)
      : targetBearing;
    
    // Speed-aware camera pitch and zoom
    const pitch = this.calculateSpeedAwarePitch(speedKmH);
    const zoom = this.calculateSpeedAwareZoom(speedKmH);
    
    // Animate to new camera position
    this.map.easeTo({
      center: [currentLng, currentLat],
      bearing: finalBearing,
      pitch,
      zoom,
      duration: duration || this.calculateDurationFromSpeed(speedKmH),
      easing: easingCurves.easeInOutCubic
    });
    
    this.lastBearing = finalBearing;
  }
  
  /**
   * Orbit around a point of interest
   */
  orbitAtPOI(options: OrbitPOIOptions): Promise<void> {
    const {
      center,
      radius = 500,
      startBearing = 0,
      endBearing = 360,
      duration = 3000,
      easing = easingCurves.easeInOutQuad
    } = options;
    
    return new Promise((resolve) => {
      const startTime = Date.now();
      const bearingDelta = endBearing - startBearing;
      const [centerLng, centerLat] = center;
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easing(progress);
        
        const currentBearing = startBearing + (bearingDelta * easedProgress);
        
        // Calculate camera position on orbit
        const bearingRad = (currentBearing - 90) * (Math.PI / 180);
        const offsetLng = (radius / 111320) * Math.cos(bearingRad) / Math.cos(centerLat * Math.PI / 180);
        const offsetLat = (radius / 110540) * Math.sin(bearingRad);
        
        this.map.jumpTo({
          center: [centerLng + offsetLng, centerLat + offsetLat],
          bearing: currentBearing,
          pitch: this.config.cinematicTilt[0]
        });
        
        if (progress < 1) {
          this.animationFrameId = requestAnimationFrame(animate);
        } else {
          this.isAnimating = false;
          resolve();
        }
      };
      
      this.isAnimating = true;
      animate();
    });
  }
  
  /**
   * Apply parallax effect based on user gesture
   */
  applyParallax(deltaX: number, deltaY: number): void {
    const currentBearing = this.map.getBearing();
    const currentPitch = this.map.getPitch();
    
    const parallaxBearing = deltaX * this.config.parallaxIntensity * 0.1;
    const parallaxPitch = deltaY * this.config.parallaxIntensity * 0.05;
    
    this.map.easeTo({
      bearing: currentBearing + parallaxBearing,
      pitch: Math.max(0, Math.min(85, currentPitch + parallaxPitch)),
      duration: 200,
      easing: easingCurves.easeOutCubic
    });
  }
  
  /**
   * Smooth bearing changes to prevent jarring rotations
   */
  private smoothBearing(targetBearing: number): number {
    // Normalize bearings to 0-360 range
    const normalizeBearing = (b: number): number => {
      while (b < 0) b += 360;
      while (b >= 360) b -= 360;
      return b;
    };
    
    const current = normalizeBearing(this.lastBearing);
    const target = normalizeBearing(targetBearing);
    
    // Find shortest rotation direction
    let delta = target - current;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    
    // Apply smoothing with velocity-based damping
    const smoothingFactor = this.config.bearingSmoothingFactor;
    this.bearingVelocity = this.bearingVelocity * 0.8 + delta * smoothingFactor;
    
    return normalizeBearing(current + this.bearingVelocity);
  }
  
  /**
   * Calculate bearing between two coordinates
   */
  private calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
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
   * Calculate pitch based on speed (higher speed = lower pitch for better visibility)
   */
  private calculateSpeedAwarePitch(speedKmH: number): number {
    const [minPitch, maxPitch] = this.config.cinematicTilt;
    
    // At low speeds, use higher pitch for dramatic effect
    // At high speeds, use lower pitch for better forward visibility
    if (speedKmH < 20) return maxPitch;
    if (speedKmH > 100) return minPitch;
    
    // Linear interpolation between speeds
    const t = (speedKmH - 20) / 80;
    return maxPitch - (maxPitch - minPitch) * t;
  }
  
  /**
   * Calculate zoom based on speed
   */
  private calculateSpeedAwareZoom(speedKmH: number): number {
    if (speedKmH < 30) return 16;        // City driving - close zoom
    if (speedKmH < 60) return 15;        // Suburban - medium zoom
    if (speedKmH < 90) return 14;        // Highway - wider zoom
    return 13;                           // Fast highway - widest zoom
  }
  
  /**
   * Calculate animation duration based on speed
   */
  private calculateDurationFromSpeed(speedKmH: number): number {
    // Faster speeds need longer durations for smooth transitions
    if (speedKmH < 20) return 800;
    if (speedKmH < 60) return 1000;
    return 1200;
  }
  
  /**
   * Stop any ongoing animations
   */
  stopAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.isAnimating = false;
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<CameraRigConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Get current animation state
   */
  isCurrentlyAnimating(): boolean {
    return this.isAnimating;
  }
  
  /**
   * Cleanup
   */
  destroy(): void {
    this.stopAnimation();
  }
}
