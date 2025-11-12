/**
 * Mode Descriptors
 * Defines visual logic, behaviors, and lifecycle hooks for each UI mode
 */

import { UiMode } from '@/types/ui';
import type { ModeDescriptor } from '@/services/ui/ModeManager';
import { SharedNavigationState } from '@/services/ui/SharedNavigationState';
import { PreferencesService } from '@/services/preferences';
import { EventBus } from '@/services/eventBus';
import { Analytics } from '@/services/analytics';

/**
 * CLASSIC Mode
 * Flat map, pitch=0, standard layers
 */
export const CLASSIC_MODE: ModeDescriptor = {
  mode: UiMode.CLASSIC,
  onEnter: async () => {
    console.log('[Mode:CLASSIC] Entering Classic mode - flat map view');
    
    // Camera settings applied automatically via modeCameraSettings
    // Pitch: 0, Bearing: 0, Standard easing
    
    // Note: Visual layers (terrain, buildings) controlled by MapboxMap component
  },
  onExit: async () => {
    console.log('[Mode:CLASSIC] Exiting Classic mode');
  }
};

/**
 * 3D Mode
 * Terrain + 3D buildings, pitch≈60, cinematic easing
 */
export const THREED_MODE: ModeDescriptor = {
  mode: UiMode.THREED,
  onEnter: async () => {
    console.log('[Mode:3D] Entering 3D mode - terrain + buildings');
    
    // Terrain and buildings enabled automatically via MapboxMap
    // Pitch: 60, Cinematic easing
    
    // Visual enhancements:
    // - 3D buildings layer (MapboxMap)
    // - Terrain with 1.2x exaggeration (toggle3DMode)
    // - Sky layer for atmosphere
  },
  onExit: async () => {
    console.log('[Mode:3D] Exiting 3D mode');
  }
};

/**
 * CINEMATIC Mode
 * 3D + smooth zoom transitions, "warm" voice tone
 */
export const CINEMATIC_MODE: ModeDescriptor = {
  mode: UiMode.CINEMATIC,
  onEnter: async () => {
    console.log('[Mode:CINEMATIC] Entering Cinematic mode - smooth transitions + warm voice');
    
    // Smooth zoom transitions handled by CameraRig
    // Pitch: 45, Extended duration: 1500ms
    
    // Visual enhancements:
    // - Smooth camera transitions (CameraRig)
    // - Auto-bearing updates during navigation
    // - Extended easing duration for cinematic feel
    
    // Set warm voice tone only if not already set (avoid redundant analytics)
    const currentPrefs = PreferencesService.getPreferences();
    if (currentPrefs.voiceStyle !== 'warm') {
      PreferencesService.updatePreference('voiceStyle', 'warm');
      
      // Emit event to notify listeners (voiceGuidance service)
      EventBus.emit('preferences:voiceStyleChanged', { voiceStyle: 'warm' });
      
      // Track TTS style change
      Analytics.trackTTSStyleChanged('warm', UiMode.CINEMATIC);
    }
  },
  onExit: async () => {
    console.log('[Mode:CINEMATIC] Exiting Cinematic mode - resetting voice to neutral');
    
    // Reset voice tone to neutral only if not already neutral (avoid redundant analytics)
    const currentPrefs = PreferencesService.getPreferences();
    if (currentPrefs.voiceStyle !== 'neutral') {
      PreferencesService.updatePreference('voiceStyle', 'neutral');
      
      // Emit event to notify listeners
      EventBus.emit('preferences:voiceStyleChanged', { voiceStyle: 'neutral' });
      
      // Track TTS style reset
      Analytics.trackTTSStyleChanged('neutral', UiMode.CINEMATIC);
    }
  }
};

/**
 * AR Mode
 * Camera overlay + lane arrows + radar pins
 * Falls back to 3D if camera permission denied
 */
export const AR_MODE: ModeDescriptor = {
  mode: UiMode.AR,
  onEnter: async () => {
    console.log('[Mode:AR] Entering AR mode - camera overlay');
    
    // AR camera overlay handled by ARExperienceProvider
    // Permission checks in ARView component
    // Pitch: 30, Device orientation based
    
    // AR Visual elements:
    // - Live camera feed (getUserMedia)
    // - Canvas overlays for lane arrows
    // - Speed camera radar pins
    // - Device orientation for bearing
    
    // Note: If camera permission denied, modeCapabilities.ts will
    // automatically fallback to THREED mode via getBestSupportedMode
  },
  onExit: async () => {
    console.log('[Mode:AR] Exiting AR mode');
    
    // AR cleanup handled by ARExperienceProvider
    // Camera stream stopped automatically
  }
};

/**
 * VR Mode
 * Immersive WebXR if available, fallback AR→3D
 */
export const VR_MODE: ModeDescriptor = {
  mode: UiMode.VR,
  onEnter: async () => {
    console.log('[Mode:VR] Entering VR mode - immersive WebXR');
    
    // WebXR checks handled by modeCapabilities.ts
    // Fallback chain: VR → AR → 3D → CLASSIC
    // Pitch: 60, Full immersion
    
    // VR Visual elements:
    // - WebXR session initialization
    // - Stereoscopic rendering
    // - Head tracking for camera control
    // - Spatial audio positioning
    
    // Note: VR implementation requires WebXR support
    // Fallback handled automatically by getBestSupportedMode
  },
  onExit: async () => {
    console.log('[Mode:VR] Exiting VR mode');
    
    // WebXR cleanup
    // Exit fullscreen, release XR session
  }
};

/**
 * ECO Mode
 * Eco route active, CO₂/fuel panel visible
 */
export const ECO_MODE: ModeDescriptor = {
  mode: UiMode.ECO,
  onEnter: async () => {
    console.log('[Mode:ECO] Entering Eco mode - efficiency focus');
    
    // Enable eco routing and ensure estimate data exists
    SharedNavigationState.updateState({
      ecoMode: true
    });
    
    // Camera: Flat view like CLASSIC
    // Pitch: 0, Eco-focused UI overlays
    
    // Eco Visual elements:
    // - CO₂/fuel savings panel (EcoStats component)
    // - Green route highlighting
    // - Efficiency metrics display
    
    // Note: Eco routing preferences handled by routing service
  },
  onExit: async () => {
    console.log('[Mode:ECO] Exiting Eco mode');
    
    // Disable eco routing (but keep data)
    SharedNavigationState.updateState({
      ecoMode: false
    });
  }
};

/**
 * All mode descriptors
 */
export const MODE_DESCRIPTORS: ModeDescriptor[] = [
  CLASSIC_MODE,
  THREED_MODE,
  CINEMATIC_MODE,
  AR_MODE,
  VR_MODE,
  ECO_MODE
];
