/**
 * Mode Capabilities - Defines technical requirements for each UI mode
 */

import { UiMode } from '@/types/ui';
import { Analytics } from '@/services/analytics';

export interface ModeCapability {
  mode: UiMode;
  requires: {
    webgl: boolean;
    webxr?: boolean;
    camera?: boolean;
  };
  fallbackPriority: number; // Lower = higher priority fallback
}

export const MODE_CAPABILITIES: Record<UiMode, ModeCapability> = {
  [UiMode.CLASSIC]: {
    mode: UiMode.CLASSIC,
    requires: {
      webgl: false
    },
    fallbackPriority: 100 // Always works, lowest priority
  },
  [UiMode.THREED]: {
    mode: UiMode.THREED,
    requires: {
      webgl: true
    },
    fallbackPriority: 50
  },
  [UiMode.CINEMATIC]: {
    mode: UiMode.CINEMATIC,
    requires: {
      webgl: true
    },
    fallbackPriority: 60
  },
  [UiMode.AR]: {
    mode: UiMode.AR,
    requires: {
      webgl: true,
      camera: true
    },
    fallbackPriority: 30
  },
  [UiMode.VR]: {
    mode: UiMode.VR,
    requires: {
      webgl: true,
      webxr: true
    },
    fallbackPriority: 10 // Highest priority when available
  },
  [UiMode.ECO]: {
    mode: UiMode.ECO,
    requires: {
      webgl: false
    },
    fallbackPriority: 90
  }
};

/**
 * Check if a mode is supported based on device capabilities
 */
export function isModeSupported(
  mode: UiMode,
  capabilities: {
    hasWebGL: boolean;
    hasWebXR: boolean;
    hasCamera: boolean;
  }
): boolean {
  const modeReqs = MODE_CAPABILITIES[mode].requires;
  
  if (modeReqs.webgl && !capabilities.hasWebGL) return false;
  if (modeReqs.webxr && !capabilities.hasWebXR) return false;
  if (modeReqs.camera && !capabilities.hasCamera) return false;
  
  return true;
}

/**
 * Get best supported mode as fallback
 * Order: VR → AR → 3D → Classic (as per spec)
 */
export function getBestSupportedMode(
  requestedMode: UiMode,
  capabilities: {
    hasWebGL: boolean;
    hasWebXR: boolean;
    hasCamera: boolean;
  }
): UiMode {
  // If requested mode is supported, use it
  if (isModeSupported(requestedMode, capabilities)) {
    return requestedMode;
  }
  
  // Track specific unsupported mode events
  if (requestedMode === UiMode.VR && !capabilities.hasWebXR) {
    Analytics.trackVRUnsupported('WebXR not available on this device');
  }
  if (requestedMode === UiMode.AR && !capabilities.hasCamera) {
    Analytics.trackARPermissionDenied('Camera not available on this device');
  }

  // Try fallback order: VR → AR → 3D → Classic
  const fallbackOrder = [UiMode.VR, UiMode.AR, UiMode.THREED, UiMode.CLASSIC];
  
  for (const mode of fallbackOrder) {
    if (isModeSupported(mode, capabilities)) {
      return mode;
    }
  }

  // Ultimate fallback (always works)
  return UiMode.CLASSIC;
}
