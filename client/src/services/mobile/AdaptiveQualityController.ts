/**
 * Adaptive Quality Controller - Automatic quality scaling based on device performance
 * Adjusts map quality, 3D rendering, and update rates to prevent overheating and maintain smooth performance
 */

import { performanceMonitor, type PerformanceTier, type PerformanceMetrics } from './PerformanceMonitor';
import { EventBus } from '@/services/eventBus';

export interface QualitySettings {
  // Map rendering
  mapQuality: 'high' | 'medium' | 'low';
  enable3DTerrain: boolean;
  enableBuildings: boolean;
  textureQuality: number; // 0.5-1.0 multiplier
  
  // Update rates (milliseconds)
  trafficUpdateInterval: number;
  weatherUpdateInterval: number;
  cameraUpdateInterval: number;
  
  // Features
  enableAnimations: boolean;
  enableSmoothTransitions: boolean;
  maxTrafficMarkers: number;
  
  // Performance
  throttleRendering: boolean;
}

const QUALITY_PRESETS: Record<PerformanceTier, QualitySettings> = {
  high: {
    mapQuality: 'high',
    enable3DTerrain: true,
    enableBuildings: true,
    textureQuality: 1.0,
    trafficUpdateInterval: 10000, // 10s
    weatherUpdateInterval: 300000, // 5min
    cameraUpdateInterval: 16, // 60fps
    enableAnimations: true,
    enableSmoothTransitions: true,
    maxTrafficMarkers: 100,
    throttleRendering: false
  },
  medium: {
    mapQuality: 'medium',
    enable3DTerrain: false,
    enableBuildings: true,
    textureQuality: 0.75,
    trafficUpdateInterval: 20000, // 20s
    weatherUpdateInterval: 600000, // 10min
    cameraUpdateInterval: 33, // 30fps
    enableAnimations: true,
    enableSmoothTransitions: true,
    maxTrafficMarkers: 50,
    throttleRendering: false
  },
  low: {
    mapQuality: 'low',
    enable3DTerrain: false,
    enableBuildings: false,
    textureQuality: 0.5,
    trafficUpdateInterval: 60000, // 60s
    weatherUpdateInterval: 900000, // 15min
    cameraUpdateInterval: 66, // 15fps
    enableAnimations: false,
    enableSmoothTransitions: false,
    maxTrafficMarkers: 20,
    throttleRendering: true
  }
};

export class AdaptiveQualityController {
  private static instance: AdaptiveQualityController;
  private currentSettings: QualitySettings;
  private settingsCallbacks: Set<(settings: QualitySettings) => void> = new Set();
  private isEnabled: boolean = true;

  private constructor() {
    this.currentSettings = QUALITY_PRESETS.high;
    this.setupMonitoring();
  }

  static getInstance(): AdaptiveQualityController {
    if (!AdaptiveQualityController.instance) {
      AdaptiveQualityController.instance = new AdaptiveQualityController();
    }
    return AdaptiveQualityController.instance;
  }

  /**
   * Setup performance monitoring and auto-adjustment
   */
  private setupMonitoring(): void {
    // Listen to tier changes from PerformanceMonitor
    performanceMonitor.onTierChange((tier) => {
      if (this.isEnabled) {
        this.applyTierSettings(tier);
      }
    });

    // Listen to metrics for fine-grained adjustments
    performanceMonitor.onMetricsChange((metrics) => {
      if (this.isEnabled) {
        this.applyDynamicAdjustments(metrics);
      }
    });

    // Apply initial settings
    const currentTier = performanceMonitor.getTier();
    this.applyTierSettings(currentTier);
  }

  /**
   * Apply quality settings based on performance tier
   */
  private applyTierSettings(tier: PerformanceTier): void {
    const newSettings = { ...QUALITY_PRESETS[tier] };
    
    // Check if settings actually changed
    if (JSON.stringify(newSettings) !== JSON.stringify(this.currentSettings)) {
      this.currentSettings = newSettings;
      console.log(`[AdaptiveQuality] Applied ${tier} tier settings`, newSettings);
      
      this.notifySettingsChange();
    }
  }

  /**
   * Apply dynamic adjustments based on real-time metrics
   */
  private applyDynamicAdjustments(metrics: PerformanceMetrics): void {
    let settingsChanged = false;

    // Thermal throttling: aggressive degradation
    if (metrics.isThermalThrottling && this.currentSettings.throttleRendering === false) {
      console.warn('[AdaptiveQuality] Thermal throttling detected - reducing load');
      this.currentSettings.enable3DTerrain = false;
      this.currentSettings.enableBuildings = false;
      this.currentSettings.enableAnimations = false;
      this.currentSettings.throttleRendering = true;
      this.currentSettings.trafficUpdateInterval = 120000; // 2min
      this.currentSettings.maxTrafficMarkers = 10;
      settingsChanged = true;
    }

    // Battery saver mode
    if (!metrics.isCharging && metrics.batteryLevel < 0.2) {
      if (this.currentSettings.enableAnimations) {
        console.log('[AdaptiveQuality] Battery low - disabling animations');
        this.currentSettings.enableAnimations = false;
        this.currentSettings.enableSmoothTransitions = false;
        settingsChanged = true;
      }
    }

    // Sustained low FPS: reduce complexity
    if (metrics.sustainedLowFPS && this.currentSettings.enable3DTerrain) {
      console.log('[AdaptiveQuality] Sustained low FPS - disabling 3D terrain');
      this.currentSettings.enable3DTerrain = false;
      settingsChanged = true;
    }

    // Slow network: reduce update frequency
    if ((metrics.connectionType === '2g' || metrics.connectionType === 'slow-2g') && 
        this.currentSettings.trafficUpdateInterval < 60000) {
      console.log('[AdaptiveQuality] Slow network - reducing update frequency');
      this.currentSettings.trafficUpdateInterval = 60000;
      this.currentSettings.weatherUpdateInterval = 900000;
      settingsChanged = true;
    }

    if (settingsChanged) {
      this.notifySettingsChange();
    }
  }

  /**
   * Subscribe to quality settings changes
   */
  onSettingsChange(callback: (settings: QualitySettings) => void): () => void {
    this.settingsCallbacks.add(callback);
    // Immediately call with current settings
    callback(this.currentSettings);
    return () => this.settingsCallbacks.delete(callback);
  }

  /**
   * Notify all subscribers of settings change
   */
  private notifySettingsChange(): void {
    this.settingsCallbacks.forEach(cb => cb({ ...this.currentSettings }));
  }

  /**
   * Get current quality settings
   */
  getSettings(): QualitySettings {
    return { ...this.currentSettings };
  }

  /**
   * Enable/disable adaptive quality control
   */
  setEnabled(enabled: boolean): void {
    if (this.isEnabled !== enabled) {
      this.isEnabled = enabled;
      console.log(`[AdaptiveQuality] ${enabled ? 'Enabled' : 'Disabled'}`);
      
      if (enabled) {
        // Reapply current tier settings
        const currentTier = performanceMonitor.getTier();
        this.applyTierSettings(currentTier);
      } else {
        // Reset to high quality when disabled
        this.currentSettings = { ...QUALITY_PRESETS.high };
        this.notifySettingsChange();
      }
    }
  }

  /**
   * Check if adaptive quality is enabled
   */
  isAdaptiveEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Manually override settings (disables automatic adjustment)
   */
  overrideSettings(settings: Partial<QualitySettings>): void {
    this.isEnabled = false;
    this.currentSettings = { ...this.currentSettings, ...settings };
    this.notifySettingsChange();
    console.log('[AdaptiveQuality] Manual override applied', settings);
  }

  /**
   * Reset to automatic mode with current tier
   */
  resetToAuto(): void {
    this.setEnabled(true);
  }

  /**
   * Get recommended settings for specific scenario
   */
  static getRecommendedSettings(scenario: 'navigation' | 'exploration' | 'battery-saver'): Partial<QualitySettings> {
    switch (scenario) {
      case 'navigation':
        return {
          enable3DTerrain: false,
          enableBuildings: false,
          trafficUpdateInterval: 15000,
          maxTrafficMarkers: 30,
          enableAnimations: false
        };
      
      case 'exploration':
        return {
          enable3DTerrain: true,
          enableBuildings: true,
          enableAnimations: true,
          enableSmoothTransitions: true
        };
      
      case 'battery-saver':
        return {
          enable3DTerrain: false,
          enableBuildings: false,
          trafficUpdateInterval: 120000,
          weatherUpdateInterval: 1800000, // 30min
          enableAnimations: false,
          enableSmoothTransitions: false,
          maxTrafficMarkers: 10,
          throttleRendering: true
        };
    }
  }
}

export const adaptiveQuality = AdaptiveQualityController.getInstance();
