/**
 * ProjectToScreen - Convert GPS coordinates to screen positions for AR overlay
 * Uses device orientation (compass heading + pitch) and camera FOV
 */

export interface DeviceOrientation {
  alpha: number;  // Compass heading (0-360)
  beta: number;   // Pitch (forward/back tilt)
  gamma: number;  // Roll (left/right tilt)
}

export interface ScreenPosition {
  x: number;      // Screen X coordinate (0-1, left to right)
  y: number;      // Screen Y coordinate (0-1, top to bottom)
  distance: number;  // Distance from user in meters
  isVisible: boolean; // Whether point is in camera FOV
}

export interface ProjectionConfig {
  cameraFOV: number;      // Field of view in degrees (default: 60)
  screenWidth: number;    // Screen width in pixels
  screenHeight: number;   // Screen height in pixels
  maxDistance: number;    // Max render distance in meters (default: 500)
}

const DEFAULT_CONFIG: ProjectionConfig = {
  cameraFOV: 60,
  screenWidth: 1280,
  screenHeight: 720,
  maxDistance: 500
};

/**
 * Calculate bearing between two GPS coordinates
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Normalize angle to 0-360 range
 */
function normalizeAngle(angle: number): number {
  while (angle < 0) angle += 360;
  while (angle >= 360) angle -= 360;
  return angle;
}

/**
 * Calculate shortest angular distance between two bearings
 */
function angleDifference(angle1: number, angle2: number): number {
  let diff = angle2 - angle1;
  while (diff < -180) diff += 360;
  while (diff > 180) diff -= 360;
  return diff;
}

/**
 * Project GPS coordinate to screen position using device orientation
 */
export function projectToScreen(
  userLat: number,
  userLon: number,
  targetLat: number,
  targetLon: number,
  orientation: DeviceOrientation,
  config: Partial<ProjectionConfig> = {}
): ScreenPosition {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Calculate bearing and distance to target
  const bearing = calculateBearing(userLat, userLon, targetLat, targetLon);
  const distance = calculateDistance(userLat, userLon, targetLat, targetLon);

  // Normalize device heading (alpha is 0-360, where 0 = North)
  const deviceHeading = normalizeAngle(orientation.alpha);

  // Calculate relative bearing (how far off-center the target is)
  const relativeBearing = angleDifference(deviceHeading, bearing);

  // Check if target is within horizontal FOV
  const halfFOV = cfg.cameraFOV / 2;
  const isInHorizontalFOV = Math.abs(relativeBearing) <= halfFOV;

  // Check if target is within vertical FOV
  // Beta is device pitch: 0 = horizontal, 90 = pointing down, -90 = pointing up
  const devicePitch = orientation.beta || 0;
  const isInVerticalFOV = devicePitch > -45 && devicePitch < 45;

  // Check if within max distance
  const isInRange = distance <= cfg.maxDistance;

  const isVisible = isInHorizontalFOV && isInVerticalFOV && isInRange;

  // Project to screen coordinates
  // X: Map relative bearing to screen width (-halfFOV to +halfFOV -> 0 to 1)
  const x = 0.5 + (relativeBearing / cfg.cameraFOV);

  // Y: Simple projection based on pitch and distance
  // Objects further away appear higher on screen (perspective)
  const verticalAngle = Math.atan2(0, distance) * 180 / Math.PI; // Height assumed 0 for now
  const relativeVerticalAngle = verticalAngle - devicePitch;
  const y = 0.5 - (relativeVerticalAngle / cfg.cameraFOV);

  return {
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y)),
    distance,
    isVisible
  };
}

/**
 * Low-pass filter for smoothing orientation values
 */
export class OrientationSmoothing {
  private alpha: number;
  private lastAlpha: number | null = null;
  private lastBeta: number | null = null;
  private lastGamma: number | null = null;

  constructor(smoothingFactor: number = 0.2) {
    this.alpha = Math.max(0, Math.min(1, smoothingFactor));
  }

  /**
   * Apply low-pass filter to orientation values
   */
  smooth(orientation: DeviceOrientation): DeviceOrientation {
    if (this.lastAlpha === null) {
      // First reading, no smoothing
      this.lastAlpha = orientation.alpha;
      this.lastBeta = orientation.beta;
      this.lastGamma = orientation.gamma;
      return orientation;
    }

    // Apply low-pass filter: smoothed = (1-α) * previous + α * current
    const smoothedAlpha = this.smoothAngle(this.lastAlpha, orientation.alpha, this.alpha);
    const smoothedBeta = (1 - this.alpha) * this.lastBeta! + this.alpha * orientation.beta;
    const smoothedGamma = (1 - this.alpha) * this.lastGamma! + this.alpha * orientation.gamma;

    // Update last values
    this.lastAlpha = smoothedAlpha;
    this.lastBeta = smoothedBeta;
    this.lastGamma = smoothedGamma;

    return {
      alpha: smoothedAlpha,
      beta: smoothedBeta,
      gamma: smoothedGamma
    };
  }

  /**
   * Smooth angle values accounting for 0-360 wraparound
   */
  private smoothAngle(previous: number, current: number, factor: number): number {
    // Handle angle wraparound (0-360)
    let diff = current - previous;
    
    if (diff > 180) {
      diff -= 360;
    } else if (diff < -180) {
      diff += 360;
    }

    const smoothed = previous + diff * factor;
    return normalizeAngle(smoothed);
  }

  /**
   * Reset smoothing state
   */
  reset(): void {
    this.lastAlpha = null;
    this.lastBeta = null;
    this.lastGamma = null;
  }
}
