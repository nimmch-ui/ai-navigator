/**
 * WebGL Capability Detection Service
 * Detects browser support for WebGL, WebXR, and camera access
 */

export interface DeviceCapabilities {
  hasWebGL: boolean;
  webglSupported: boolean; // Alias for hasWebGL for backwards compatibility
  hasWebXR: boolean;
  hasCamera: boolean;
}

/**
 * Detect WebGL support
 */
function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch (e) {
    return false;
  }
}

/**
 * Detect WebXR support
 */
function detectWebXR(): boolean {
  return 'xr' in navigator && 'isSessionSupported' in (navigator as any).xr;
}

/**
 * Detect camera access support
 */
function detectCamera(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Get all device capabilities (cached)
 */
let cachedCapabilities: DeviceCapabilities | null = null;

export function getDeviceCapabilities(): DeviceCapabilities {
  if (cachedCapabilities) {
    return cachedCapabilities;
  }

  const hasWebGL = detectWebGL();
  
  cachedCapabilities = {
    hasWebGL,
    webglSupported: hasWebGL, // Alias for backwards compatibility
    hasWebXR: detectWebXR(),
    hasCamera: detectCamera()
  };

  console.log('[WebGLCapability] Device capabilities:', cachedCapabilities);

  return cachedCapabilities;
}

/**
 * Reset cached capabilities (for testing)
 */
export function resetCapabilitiesCache(): void {
  cachedCapabilities = null;
}
