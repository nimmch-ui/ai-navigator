/**
 * GPS Service - Real-time GPS tracking for mobile navigation
 * Uses navigator.geolocation API for iOS/Android/iPad support
 */

export interface GPSPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface GPSOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export type GPSCallback = (position: GPSPosition) => void;
export type GPSErrorCallback = (error: GeolocationPositionError) => void;

class GPSService {
  private watchId: number | null = null;
  private isSupported: boolean = false;
  private isTracking: boolean = false;
  private callbacks: Set<GPSCallback> = new Set();
  private errorCallbacks: Set<GPSErrorCallback> = new Set();
  private lastPosition: GPSPosition | null = null;

  constructor() {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      this.isSupported = 'geolocation' in navigator;
      
      if (!this.isSupported && import.meta.env.DEV) {
        console.warn('[GPS] Geolocation API not supported by this browser');
      }
    }
  }

  /**
   * Check if GPS is supported by the browser
   */
  isGPSSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Check if GPS tracking is currently active
   */
  isGPSTracking(): boolean {
    return this.isTracking;
  }

  /**
   * Get the last known GPS position
   */
  getLastPosition(): GPSPosition | null {
    return this.lastPosition;
  }

  /**
   * Get current GPS position (one-time)
   */
  async getCurrentPosition(options?: GPSOptions): Promise<GPSPosition> {
    if (!this.isSupported) {
      throw new Error('GPS not supported');
    }

    return new Promise((resolve, reject) => {
      const gpsOptions: PositionOptions = {
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        timeout: options?.timeout ?? 10000,
        maximumAge: options?.maximumAge ?? 0,
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const gpsPosition = this.transformPosition(position);
          this.lastPosition = gpsPosition;
          resolve(gpsPosition);
        },
        (error) => {
          console.error('[GPS] Get position error:', error.message);
          reject(error);
        },
        gpsOptions
      );
    });
  }

  /**
   * Start tracking GPS position continuously
   */
  startTracking(options?: GPSOptions): void {
    if (!this.isSupported) {
      console.error('[GPS] Cannot start tracking - GPS not supported');
      return;
    }

    if (this.isTracking) {
      console.warn('[GPS] Already tracking position');
      return;
    }

    const gpsOptions: PositionOptions = {
      enableHighAccuracy: options?.enableHighAccuracy ?? true,
      timeout: options?.timeout ?? 10000,
      maximumAge: options?.maximumAge ?? 1000,
    };

    if (import.meta.env.DEV) {
      console.log('[GPS] Starting position tracking with options:', gpsOptions);
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const gpsPosition = this.transformPosition(position);
        this.lastPosition = gpsPosition;
        this.isTracking = true;

        if (import.meta.env.DEV) {
          console.log('[GPS] Position updated:', {
            accuracy: gpsPosition.accuracy.toFixed(1) + 'm',
            speed: gpsPosition.speed ? (gpsPosition.speed * 3.6).toFixed(1) + ' km/h' : 'N/A',
          });
        }

        this.callbacks.forEach(callback => {
          try {
            callback(gpsPosition);
          } catch (error) {
            if (import.meta.env.DEV) {
              console.error('[GPS] Error in position callback:', error);
            }
          }
        });
      },
      (error) => {
        if (import.meta.env.DEV) {
          console.error('[GPS] Watch position error:', error.message);
        }
        
        this.errorCallbacks.forEach(callback => {
          try {
            callback(error);
          } catch (err) {
            console.error('[GPS] Error in error callback:', err);
          }
        });
      },
      gpsOptions
    );

    if (import.meta.env.DEV) {
      console.log('[GPS] Watch ID:', this.watchId);
    }
  }

  /**
   * Stop tracking GPS position
   */
  stopTracking(): void {
    if (this.watchId !== null) {
      if (import.meta.env.DEV) {
        console.log('[GPS] Stopping position tracking');
      }
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isTracking = false;
    }
  }

  /**
   * Add callback for position updates
   */
  onPositionUpdate(callback: GPSCallback): () => void {
    this.callbacks.add(callback);
    
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Add callback for GPS errors
   */
  onError(callback: GPSErrorCallback): () => void {
    this.errorCallbacks.add(callback);
    
    return () => {
      this.errorCallbacks.delete(callback);
    };
  }

  /**
   * Transform GeolocationPosition to GPSPosition
   */
  private transformPosition(position: GeolocationPosition): GPSPosition {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: position.timestamp,
    };
  }

  /**
   * Request GPS permission (useful for iOS)
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported) {
      return false;
    }

    try {
      await this.getCurrentPosition({ timeout: 5000 });
      if (import.meta.env.DEV) {
        console.log('[GPS] Permission granted');
      }
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[GPS] Permission denied or error:', error);
      }
      return false;
    }
  }
}

export const gpsService = new GPSService();
