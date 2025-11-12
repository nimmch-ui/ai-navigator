/**
 * Mode Camera Settings - Camera configurations per UI mode
 */

import { UiMode } from '@/types/ui';

export interface CameraSettings {
  pitch: number;
  bearing: number;
  duration?: number; // Transition duration in ms
  essential?: boolean;
}

export const MODE_CAMERA_SETTINGS: Record<UiMode, CameraSettings> = {
  [UiMode.CLASSIC]: {
    pitch: 0,
    bearing: 0,
    duration: 1000,
    essential: true
  },
  [UiMode.THREED]: {
    pitch: 60,
    bearing: 0,
    duration: 1000,
    essential: true
  },
  [UiMode.CINEMATIC]: {
    pitch: 45,
    bearing: 0, // Auto-bearing handled by camera controller
    duration: 1500,
    essential: true
  },
  [UiMode.AR]: {
    pitch: 30, // Varies based on device orientation
    bearing: 0, // Device orientation determines bearing
    duration: 800,
    essential: true
  },
  [UiMode.VR]: {
    pitch: 60,
    bearing: 0,
    duration: 1000,
    essential: true
  },
  [UiMode.ECO]: {
    pitch: 0,
    bearing: 0,
    duration: 1000,
    essential: true
  }
};

/**
 * Get camera settings for a mode
 */
export function getCameraSettingsForMode(mode: UiMode): CameraSettings {
  return MODE_CAMERA_SETTINGS[mode];
}
