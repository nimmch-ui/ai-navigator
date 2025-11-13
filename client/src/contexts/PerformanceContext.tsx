/**
 * Performance Context - Exposes device performance tier for adaptive quality management
 * Provides automatic quality scaling and thermal throttling prevention
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { performanceMonitor, type PerformanceMetrics, type PerformanceTier } from '@/services/mobile/PerformanceMonitor';
import { adaptiveQuality, type QualitySettings } from '@/services/mobile/AdaptiveQualityController';
import { WebGLDetector, type WebGLCapabilities } from '@/services/mobile/WebGLDetector';

export interface PerformanceContextValue {
  tier: PerformanceTier;
  metrics: PerformanceMetrics;
  qualitySettings: QualitySettings;
  webglCapabilities: WebGLCapabilities;
  isLowEnd: boolean;
  batterySaverActive: boolean;
  slowNetwork: boolean;
  thermalThrottling: boolean;
  shouldUse2DMap: boolean;
}

const PerformanceContext = createContext<PerformanceContextValue | null>(null);

export function usePerformance() {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformance must be used within PerformanceProvider');
  }
  return context;
}

interface PerformanceProviderProps {
  children: ReactNode;
}

export function PerformanceProvider({ children }: PerformanceProviderProps) {
  const [tier, setTier] = useState<PerformanceTier>(performanceMonitor.getTier());
  const [metrics, setMetrics] = useState<PerformanceMetrics>(performanceMonitor.getMetrics());
  const [qualitySettings, setQualitySettings] = useState<QualitySettings>(adaptiveQuality.getSettings());
  const [webglCapabilities] = useState<WebGLCapabilities>(WebGLDetector.detect());

  useEffect(() => {
    // Start monitoring
    performanceMonitor.start();

    // Subscribe to tier changes
    const unsubTier = performanceMonitor.onTierChange((newTier) => {
      setTier(newTier);
      console.log('[PerformanceProvider] Tier changed to:', newTier);
    });

    // Subscribe to metrics changes
    const unsubMetrics = performanceMonitor.onMetricsChange((newMetrics) => {
      setMetrics(newMetrics);
    });

    // Subscribe to quality settings changes
    const unsubQuality = adaptiveQuality.onSettingsChange((newSettings) => {
      setQualitySettings(newSettings);
      console.log('[PerformanceProvider] Quality settings updated:', newSettings);
    });

    return () => {
      unsubTier();
      unsubMetrics();
      unsubQuality();
      performanceMonitor.stop();
    };
  }, []);

  const value: PerformanceContextValue = {
    tier,
    metrics,
    qualitySettings,
    webglCapabilities,
    isLowEnd: tier === 'low',
    batterySaverActive: performanceMonitor.shouldEnableBatterySaver(),
    slowNetwork: performanceMonitor.hasSlowNetwork(),
    thermalThrottling: performanceMonitor.isThermalThrottling(),
    shouldUse2DMap: !webglCapabilities.isSupported || webglCapabilities.isLowEnd
  };

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
}
