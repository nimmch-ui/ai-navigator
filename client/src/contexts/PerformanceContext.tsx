/**
 * Performance Context - Exposes device performance tier for manual feature optimization
 * Provides lightweight monitoring without automatic quality mutations
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { performanceMonitor, type PerformanceMetrics, type PerformanceTier } from '@/services/mobile/PerformanceMonitor';

export interface PerformanceContextValue {
  tier: PerformanceTier;
  metrics: PerformanceMetrics;
  isLowEnd: boolean;
  batterySaverActive: boolean;
  slowNetwork: boolean;
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

    return () => {
      unsubTier();
      unsubMetrics();
      performanceMonitor.stop();
    };
  }, []);

  const value: PerformanceContextValue = {
    tier,
    metrics,
    isLowEnd: tier === 'low',
    batterySaverActive: performanceMonitor.shouldEnableBatterySaver(),
    slowNetwork: performanceMonitor.hasSlowNetwork()
  };

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
}
