/**
 * AR Sensor Service
 * Manages camera access, permissions, and device selection for AR Preview mode
 */

export type CameraPermissionState = "granted" | "denied" | "prompt";

export interface CameraDevice {
  deviceId: string;
  label: string;
  kind: string;
}

export class ARSensorService {
  private stream: MediaStream | null = null;
  private devices: CameraDevice[] = [];

  /**
   * Check if getUserMedia is supported
   */
  static isSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    );
  }

  /**
   * Check camera permission status
   */
  async checkPermission(): Promise<CameraPermissionState> {
    if (!ARSensorService.isSupported()) {
      return "denied";
    }

    try {
      // Try to query permission status if supported
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        return result.state as CameraPermissionState;
      }
      return "prompt";
    } catch (error) {
      console.warn("Permission query not supported:", error);
      return "prompt";
    }
  }

  /**
   * Request camera access
   * Throws specific errors based on getUserMedia failure reason
   */
  async requestCamera(facingMode: "user" | "environment" = "environment"): Promise<MediaStream> {
    if (!ARSensorService.isSupported()) {
      throw new Error("Camera not supported on this device");
    }

    try {
      // Request camera with appropriate constraints
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      return this.stream;
    } catch (error: any) {
      console.error("Camera access error:", error);
      
      // Map DOMException names to user-friendly errors
      if (error.name === 'NotAllowedError') {
        throw new Error("Camera permission denied");
      } else if (error.name === 'NotFoundError') {
        throw new Error("No camera found");
      } else if (error.name === 'NotReadableError') {
        throw new Error("Camera in use");
      } else if (error.name === 'OverconstrainedError') {
        throw new Error("Camera constraints not supported");
      } else {
        throw new Error("Camera access failed");
      }
    }
  }

  /**
   * Get available camera devices
   */
  async getDevices(): Promise<CameraDevice[]> {
    if (!ARSensorService.isSupported()) {
      return [];
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.devices = devices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.substring(0, 5)}`,
          kind: device.kind,
        }));
      
      return this.devices;
    } catch (error) {
      console.error("Failed to enumerate devices:", error);
      return [];
    }
  }

  /**
   * Switch to specific camera device
   */
  async switchCamera(deviceId: string): Promise<MediaStream> {
    if (!ARSensorService.isSupported()) {
      throw new Error("Camera not supported");
    }

    // Stop current stream if exists
    this.stopCamera();

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      return this.stream;
    } catch (error) {
      console.error("Failed to switch camera:", error);
      throw new Error("Failed to switch camera");
    }
  }

  /**
   * Stop camera stream and release resources
   */
  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  /**
   * Get current camera stream
   */
  getStream(): MediaStream | null {
    return this.stream;
  }

  /**
   * Request camera with fallback strategy
   * Tries environment (rear) camera first, falls back to user (front) camera
   * Preserves permission errors for proper user guidance
   */
  async requestCameraWithFallback(): Promise<{ stream: MediaStream; facingMode: 'environment' | 'user' }> {
    if (!ARSensorService.isSupported()) {
      throw new Error("Camera not supported on this device");
    }

    let rearError: any = null;

    // Try rear camera first
    try {
      const stream = await this.requestCamera('environment');
      return { stream, facingMode: 'environment' };
    } catch (error) {
      rearError = error;
      console.warn('[ARSensorService] Rear camera unavailable, trying front camera:', error);
    }

    // Fallback to front camera
    try {
      const stream = await this.requestCamera('user');
      return { stream, facingMode: 'user' };
    } catch (frontError) {
      console.error('[ARSensorService] Both cameras failed. Rear:', rearError, 'Front:', frontError);
      
      // Determine root cause - prioritize permission errors, then hardware errors
      const rearMsg = rearError instanceof Error ? rearError.message : '';
      const frontMsg = frontError instanceof Error ? frontError.message : '';
      
      // If permission denied on either camera, that's the primary issue
      if (rearMsg === 'Camera permission denied' || frontMsg === 'Camera permission denied') {
        throw new Error("Camera permission denied");
      }
      
      // If no camera found on both, device lacks cameras
      if (rearMsg === 'No camera found' && frontMsg === 'No camera found') {
        throw new Error("No camera found");
      }
      
      // If camera in use
      if (rearMsg === 'Camera in use' || frontMsg === 'Camera in use') {
        throw new Error("Camera in use");
      }
      
      // If camera constraints not supported
      if (rearMsg === 'Camera constraints not supported' || frontMsg === 'Camera constraints not supported') {
        throw new Error("Camera constraints not supported");
      }
      
      // Generic fallback
      throw new Error("Camera access failed");
    }
  }

  /**
   * Check camera stream health
   */
  isStreamActive(): boolean {
    if (!this.stream) return false;
    
    const videoTracks = this.stream.getVideoTracks();
    return videoTracks.length > 0 && videoTracks[0].readyState === 'live';
  }

  /**
   * Get stream diagnostics
   */
  getStreamDiagnostics(): { active: boolean; trackCount: number; resolution?: { width: number; height: number } } | null {
    if (!this.stream) return null;

    const videoTracks = this.stream.getVideoTracks();
    if (videoTracks.length === 0) return { active: false, trackCount: 0 };

    const track = videoTracks[0];
    const settings = track.getSettings();

    return {
      active: track.readyState === 'live',
      trackCount: videoTracks.length,
      resolution: settings.width && settings.height 
        ? { width: settings.width, height: settings.height }
        : undefined
    };
  }

  /**
   * Check if camera is currently active
   */
  isActive(): boolean {
    return this.stream !== null;
  }
}
