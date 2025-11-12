/**
 * Orientation Service
 * Handles WebXR and DeviceOrientation API for heading and tilt calculation
 */

// WebXR type declarations (experimental API)
declare global {
  interface Navigator {
    xr?: {
      isSessionSupported(mode: string): Promise<boolean>;
      requestSession(mode: string, options?: any): Promise<any>;
    };
  }
}

export interface DeviceOrientation {
  alpha: number | null; // Rotation around Z-axis (compass heading)
  beta: number | null;  // Rotation around X-axis (front-to-back tilt)
  gamma: number | null; // Rotation around Y-axis (left-to-right tilt)
  absolute: boolean;
}

export interface HeadingData {
  heading: number;      // Compass heading in degrees (0-360)
  tilt: number;         // Tilt angle in degrees
  pitch: number;        // Pitch angle in degrees
  roll: number;         // Roll angle in degrees
  timestamp: number;
}

export type OrientationMode = "webxr" | "deviceorientation" | "none";

export class OrientationService {
  private mode: OrientationMode = "none";
  private xrSession: any | null = null; // XRSession type (experimental API)
  private rafId: number | null = null;
  private lastHeading: HeadingData | null = null;
  private orientationHandler: ((event: DeviceOrientationEvent) => void) | null = null;

  /**
   * Check if WebXR is supported
   */
  static async checkWebXRSupport(): Promise<boolean> {
    if (!('xr' in navigator)) {
      return false;
    }

    try {
      const xr = (navigator as any).xr;
      if (!xr) return false;
      
      const supported = await xr.isSessionSupported('immersive-ar');
      return supported;
    } catch (error) {
      console.warn("WebXR check failed:", error);
      return false;
    }
  }

  /**
   * Check if DeviceOrientation is supported
   */
  static checkDeviceOrientationSupport(): boolean {
    return 'DeviceOrientationEvent' in window;
  }

  /**
   * Request permission for DeviceOrientation (iOS 13+)
   */
  static async requestOrientationPermission(): Promise<boolean> {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        return permission === 'granted';
      } catch (error) {
        console.error("Orientation permission denied:", error);
        return false;
      }
    }
    // Permission not required on this platform
    return true;
  }

  /**
   * Start orientation tracking
   */
  async start(onUpdate: (heading: HeadingData) => void): Promise<OrientationMode> {
    // Try WebXR first
    const hasWebXR = await OrientationService.checkWebXRSupport();
    if (hasWebXR) {
      try {
        await this.startWebXR(onUpdate);
        return "webxr";
      } catch (error) {
        console.warn("WebXR failed, falling back:", error);
      }
    }

    // Fall back to DeviceOrientation
    const hasOrientation = OrientationService.checkDeviceOrientationSupport();
    if (hasOrientation) {
      const permitted = await OrientationService.requestOrientationPermission();
      if (permitted) {
        this.startDeviceOrientation(onUpdate);
        return "deviceorientation";
      }
    }

    return "none";
  }

  /**
   * Start WebXR session
   */
  private async startWebXR(onUpdate: (heading: HeadingData) => void): Promise<void> {
    const xr = (navigator as any).xr;
    if (!xr) throw new Error("WebXR not available");

    this.xrSession = await xr.requestSession('immersive-ar', {
      requiredFeatures: ['local'],
      optionalFeatures: ['dom-overlay'],
    });

    this.mode = "webxr";

    const animate = (time: number, frame: any) => { // XRFrame type (experimental API)
      if (!this.xrSession) return;

      const pose = frame.getViewerPose(this.xrSession.renderState.baseLayer!.space);
      if (pose) {
        const transform = pose.transform;
        const orientation = transform.orientation;

        // Convert quaternion to Euler angles
        const heading = this.quaternionToHeading(orientation);
        const { pitch, roll } = this.quaternionToEuler(orientation);

        const headingData: HeadingData = {
          heading: heading % 360,
          tilt: pitch,
          pitch,
          roll,
          timestamp: Date.now(),
        };

        this.lastHeading = headingData;
        onUpdate(headingData);
      }

      this.rafId = this.xrSession!.requestAnimationFrame(animate);
    };

    this.rafId = this.xrSession.requestAnimationFrame(animate);
  }

  /**
   * Start DeviceOrientation listening
   */
  private startDeviceOrientation(onUpdate: (heading: HeadingData) => void): void {
    this.mode = "deviceorientation";

    this.orientationHandler = (event: DeviceOrientationEvent) => {
      if (event.alpha === null) return;

      // Calculate compass heading (0-360)
      // Alpha is rotation around Z-axis (compass)
      const heading = event.alpha;
      
      // Beta is rotation around X-axis (front-to-back tilt)
      const pitch = event.beta || 0;
      
      // Gamma is rotation around Y-axis (left-to-right tilt)
      const roll = event.gamma || 0;

      // Overall tilt magnitude
      const tilt = Math.sqrt(pitch * pitch + roll * roll);

      const headingData: HeadingData = {
        heading: heading % 360,
        tilt,
        pitch,
        roll,
        timestamp: Date.now(),
      };

      this.lastHeading = headingData;
      onUpdate(headingData);
    };

    window.addEventListener('deviceorientation', this.orientationHandler, true);
  }

  /**
   * Convert quaternion to heading (compass direction)
   */
  private quaternionToHeading(q: DOMPointReadOnly): number {
    const { x, y, z, w } = q;
    
    // Calculate yaw (rotation around vertical axis)
    const yaw = Math.atan2(
      2.0 * (w * z + x * y),
      1.0 - 2.0 * (y * y + z * z)
    );
    
    // Convert to degrees and normalize to 0-360
    let heading = yaw * (180 / Math.PI);
    if (heading < 0) heading += 360;
    
    return heading;
  }

  /**
   * Convert quaternion to Euler angles
   */
  private quaternionToEuler(q: DOMPointReadOnly): { pitch: number; roll: number } {
    const { x, y, z, w } = q;
    
    // Pitch (rotation around X-axis)
    const sinp = 2.0 * (w * x - y * z);
    const pitch = Math.abs(sinp) >= 1
      ? Math.sign(sinp) * Math.PI / 2
      : Math.asin(sinp);
    
    // Roll (rotation around Z-axis)
    const sinr_cosp = 2.0 * (w * z + x * y);
    const cosr_cosp = 1.0 - 2.0 * (x * x + z * z);
    const roll = Math.atan2(sinr_cosp, cosr_cosp);
    
    return {
      pitch: pitch * (180 / Math.PI),
      roll: roll * (180 / Math.PI),
    };
  }

  /**
   * Stop orientation tracking
   */
  stop(): void {
    // Stop WebXR
    if (this.xrSession) {
      if (this.rafId !== null) {
        this.xrSession.cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      this.xrSession.end();
      this.xrSession = null;
    }

    // Stop DeviceOrientation
    if (this.orientationHandler) {
      window.removeEventListener('deviceorientation', this.orientationHandler, true);
      this.orientationHandler = null;
    }

    this.mode = "none";
    this.lastHeading = null;
  }

  /**
   * Get current heading data
   */
  getCurrentHeading(): HeadingData | null {
    return this.lastHeading;
  }

  /**
   * Get current tracking mode
   */
  getMode(): OrientationMode {
    return this.mode;
  }

  /**
   * Check if tracking is active
   */
  isActive(): boolean {
    return this.mode !== "none";
  }
}
