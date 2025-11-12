/**
 * useHaptics - Vibration feedback for navigation events
 * Uses Vibration API to provide tactile feedback for hazards, alerts, and navigation cues
 */

import { useCallback, useRef } from 'react';
import { PreferencesService } from '@/services/preferences';

export type HapticPattern = 'success' | 'warning' | 'hazardPulse' | 'turnCue' | 'cameraAlert';

interface HapticConfig {
  pattern: number | number[];
  cooldown?: number; // Minimum ms between same pattern type
}

const HAPTIC_PATTERNS: Record<HapticPattern, HapticConfig> = {
  success: {
    pattern: [50, 30, 50], // Short double pulse
    cooldown: 500
  },
  warning: {
    pattern: [100, 50, 100, 50, 100], // Triple pulse
    cooldown: 1000
  },
  hazardPulse: {
    pattern: [200, 100, 200], // Strong double pulse
    cooldown: 2000
  },
  turnCue: {
    pattern: [30], // Single gentle tap
    cooldown: 500
  },
  cameraAlert: {
    pattern: [50, 50, 50, 50, 50], // Quick burst
    cooldown: 3000
  }
};

/**
 * Hook for haptic feedback with debouncing and intensity modulation
 */
export function useHaptics() {
  const lastHapticTime = useRef<Map<HapticPattern, number>>(new Map());
  const isSupported = 'vibrate' in navigator;

  /**
   * Trigger haptic feedback with pattern and optional intensity scaling
   */
  const triggerHaptic = useCallback((
    pattern: HapticPattern,
    intensityMultiplier = 1.0
  ): boolean => {
    if (!isSupported) {
      return false;
    }

    const config = HAPTIC_PATTERNS[pattern];
    const now = Date.now();
    const lastTime = lastHapticTime.current.get(pattern) || 0;

    // Check cooldown
    if (config.cooldown && now - lastTime < config.cooldown) {
      console.log(`[Haptics] ${pattern} rate limited`);
      return false;
    }

    // Apply user preference intensity on top of passed multiplier
    const preferences = PreferencesService.getPreferences();
    const finalIntensity = intensityMultiplier * preferences.hapticsIntensity;

    // Scale pattern intensity
    const scaledPattern = Array.isArray(config.pattern)
      ? config.pattern.map(duration => Math.round(duration * finalIntensity))
      : Math.round(config.pattern * finalIntensity);

    try {
      const success = navigator.vibrate(scaledPattern);
      if (success) {
        lastHapticTime.current.set(pattern, now);
        console.log(`[Haptics] Triggered ${pattern} (base: ${intensityMultiplier}, user: ${preferences.hapticsIntensity}, final: ${finalIntensity})`);
      }
      return success;
    } catch (error) {
      console.error('[Haptics] Failed to vibrate:', error);
      return false;
    }
  }, [isSupported]);

  /**
   * Trigger hazard pulse with severity-based intensity
   * @param severity 0-1, where 1 is most severe
   */
  const triggerHazardPulse = useCallback((severity: number): boolean => {
    const intensity = Math.max(0.5, Math.min(1.5, 0.5 + severity));
    return triggerHaptic('hazardPulse', intensity);
  }, [triggerHaptic]);

  /**
   * Trigger camera alert with distance-based intensity
   * @param distance Distance to camera in meters
   */
  const triggerCameraAlert = useCallback((distance: number): boolean => {
    // Closer = stronger vibration (max at 100m, min at 500m)
    const intensity = distance <= 100 ? 1.5 :
                     distance <= 300 ? 1.0 :
                     0.7;
    return triggerHaptic('cameraAlert', intensity);
  }, [triggerHaptic]);

  /**
   * Cancel all ongoing vibrations
   */
  const cancelHaptics = useCallback((): void => {
    if (isSupported) {
      navigator.vibrate(0);
    }
  }, [isSupported]);

  /**
   * Test haptic feedback (for settings UI)
   */
  const testHaptic = useCallback((pattern: HapticPattern): void => {
    // Bypass cooldown for testing
    const config = HAPTIC_PATTERNS[pattern];
    if (isSupported) {
      navigator.vibrate(config.pattern);
    }
  }, [isSupported]);

  return {
    isSupported,
    triggerHaptic,
    triggerHazardPulse,
    triggerCameraAlert,
    cancelHaptics,
    testHaptic
  };
}

/**
 * Standalone utility for one-off haptic triggers outside React components
 */
export const HapticsUtil = {
  vibrate(pattern: HapticPattern, intensityMultiplier = 1.0): boolean {
    if (!('vibrate' in navigator)) return false;

    const config = HAPTIC_PATTERNS[pattern];
    
    // Apply user preference intensity on top of passed multiplier
    const preferences = PreferencesService.getPreferences();
    const finalIntensity = intensityMultiplier * preferences.hapticsIntensity;
    
    const scaledPattern = Array.isArray(config.pattern)
      ? config.pattern.map(duration => Math.round(duration * finalIntensity))
      : Math.round(config.pattern * finalIntensity);

    try {
      return navigator.vibrate(scaledPattern);
    } catch {
      return false;
    }
  },

  cancel(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  }
};
