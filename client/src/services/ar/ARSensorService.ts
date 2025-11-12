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
   */
  async requestCamera(facingMode: "user" | "environment" = "environment"): Promise<MediaStream> {
    if (!ARSensorService.isSupported()) {
      throw new Error("Camera not supported");
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
    } catch (error) {
      console.error("Camera access denied:", error);
      throw new Error("Camera permission denied");
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
   * Check if camera is currently active
   */
  isActive(): boolean {
    return this.stream !== null;
  }
}
