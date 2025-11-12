/**
 * useARCapabilities - Detect AR support and manage camera permissions
 * Checks for WebXR, DeviceOrientation, and getUserMedia availability
 */

import { useState, useEffect } from 'react';

export interface ARCapabilities {
  isSupported: boolean;
  hasWebXR: boolean;
  hasDeviceOrientation: boolean;
  hasCamera: boolean;
  cameraPermission: 'granted' | 'denied' | 'prompt' | 'unknown';
  orientationPermission: 'granted' | 'denied' | 'prompt' | 'unknown';
  fallbackMode: 'full-ar' | 'pseudo-ar' | 'none';
  errorMessage?: string;
}

export interface ARPermissionRequest {
  requestCamera: () => Promise<boolean>;
  requestOrientation: () => Promise<boolean>;
}

/**
 * Hook to detect AR capabilities and manage permissions
 */
export function useARCapabilities(): ARCapabilities & ARPermissionRequest {
  const [capabilities, setCapabilities] = useState<ARCapabilities>({
    isSupported: false,
    hasWebXR: false,
    hasDeviceOrientation: false,
    hasCamera: false,
    cameraPermission: 'unknown',
    orientationPermission: 'unknown',
    fallbackMode: 'none',
  });

  // Check for WebXR support
  const checkWebXR = (): boolean => {
    if ('xr' in navigator) {
      return true;
    }
    return false;
  };

  // Check for DeviceOrientation support
  const checkDeviceOrientation = (): boolean => {
    return 'DeviceOrientationEvent' in window;
  };

  // Check for camera (getUserMedia) support
  const checkCamera = (): boolean => {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    );
  };

  // Request camera permission
  const requestCamera = async (): Promise<boolean> => {
    if (!checkCamera()) {
      setCapabilities(prev => ({
        ...prev,
        cameraPermission: 'denied',
        errorMessage: 'Camera not supported on this device'
      }));
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Rear camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      // Stop the test stream immediately
      stream.getTracks().forEach(track => track.stop());

      setCapabilities(prev => ({
        ...prev,
        cameraPermission: 'granted',
        hasCamera: true,
        errorMessage: undefined
      }));

      return true;
    } catch (error) {
      const err = error as Error;
      console.error('[AR] Camera permission denied:', err);
      
      setCapabilities(prev => ({
        ...prev,
        cameraPermission: 'denied',
        errorMessage: err.name === 'NotAllowedError'
          ? 'Camera permission denied'
          : 'Camera not available'
      }));

      return false;
    }
  };

  // Request device orientation permission (iOS 13+)
  const requestOrientation = async (): Promise<boolean> => {
    if (!checkDeviceOrientation()) {
      setCapabilities(prev => ({
        ...prev,
        orientationPermission: 'denied',
        errorMessage: 'Device orientation not supported'
      }));
      return false;
    }

    // Check if permission request is needed (iOS 13+)
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        
        if (permission === 'granted') {
          setCapabilities(prev => ({
            ...prev,
            orientationPermission: 'granted',
            hasDeviceOrientation: true,
            errorMessage: undefined
          }));
          return true;
        } else {
          setCapabilities(prev => ({
            ...prev,
            orientationPermission: 'denied',
            errorMessage: 'Device orientation permission denied'
          }));
          return false;
        }
      } catch (error) {
        console.error('[AR] Orientation permission error:', error);
        setCapabilities(prev => ({
          ...prev,
          orientationPermission: 'denied',
          errorMessage: 'Failed to request orientation permission'
        }));
        return false;
      }
    } else {
      // No permission needed, assume granted
      setCapabilities(prev => ({
        ...prev,
        orientationPermission: 'granted',
        hasDeviceOrientation: true
      }));
      return true;
    }
  };

  // Determine fallback mode
  const determineFallbackMode = (caps: Partial<ARCapabilities>): 'full-ar' | 'pseudo-ar' | 'none' => {
    const hasCamera = caps.hasCamera && caps.cameraPermission === 'granted';
    const hasOrientation = caps.hasDeviceOrientation && caps.orientationPermission === 'granted';

    if (hasCamera && hasOrientation) {
      return 'full-ar';
    } else if (hasCamera || hasOrientation) {
      return 'pseudo-ar';
    } else {
      return 'none';
    }
  };

  // Initial capability detection
  useEffect(() => {
    const hasWebXR = checkWebXR();
    const hasDeviceOrientation = checkDeviceOrientation();
    const hasCamera = checkCamera();

    const fallbackMode = determineFallbackMode({
      hasCamera,
      hasDeviceOrientation,
      cameraPermission: 'prompt',
      orientationPermission: hasDeviceOrientation ? 'prompt' : 'denied'
    });

    setCapabilities({
      isSupported: hasCamera || hasDeviceOrientation,
      hasWebXR,
      hasDeviceOrientation,
      hasCamera,
      cameraPermission: hasCamera ? 'prompt' : 'denied',
      orientationPermission: hasDeviceOrientation ? 'prompt' : 'denied',
      fallbackMode,
      errorMessage: !hasCamera && !hasDeviceOrientation
        ? 'AR not supported on this device'
        : undefined
    });
  }, []);

  return {
    ...capabilities,
    requestCamera,
    requestOrientation
  };
}

/**
 * Simple hook to check if AR is available (for quick checks)
 */
export function useARAvailable(): boolean {
  const { isSupported } = useARCapabilities();
  return isSupported;
}
