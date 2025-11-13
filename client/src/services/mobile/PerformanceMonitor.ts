/**
 * Performance Monitor - Device performance tracking and adaptive quality management
 * Monitors FPS, memory, battery, and network to adjust visual quality dynamically
 */

export interface PerformanceMetrics {
  fps: number;
  memory: number; // MB used
  batteryLevel: number; // 0-1
  isCharging: boolean;
  connectionType: 'wifi' | '4g' | '3g' | '2g' | 'slow-2g' | 'offline' | 'unknown';
  saveDataEnabled: boolean;
}

export type PerformanceTier = 'high' | 'medium' | 'low';

export interface PerformanceThresholds {
  fpsTarget: number;
  fpsMinimum: number;
  memoryWarning: number; // MB
  batteryCritical: number; // 0-1
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  fpsTarget: 60,
  fpsMinimum: 30,
  memoryWarning: 512,
  batteryCritical: 0.15
};

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics = {
    fps: 60,
    memory: 0,
    batteryLevel: 1,
    isCharging: false,
    connectionType: 'unknown',
    saveDataEnabled: false
  };

  private performanceTier: PerformanceTier = 'high';
  private frameTimestamps: number[] = [];
  private rafId: number | null = null;
  private memoryIntervalId: NodeJS.Timeout | null = null;
  private metricsCallbacks: Set<(metrics: PerformanceMetrics) => void> = new Set();
  private tierChangeCallbacks: Set<(tier: PerformanceTier) => void> = new Set();
  private batteryManager: any = null;
  private thresholds: PerformanceThresholds;

  private constructor(thresholds: PerformanceThresholds = DEFAULT_THRESHOLDS) {
    this.thresholds = thresholds;
  }

  static getInstance(thresholds?: PerformanceThresholds): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor(thresholds);
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start performance monitoring
   */
  async start(): Promise<void> {
    // Initialize battery monitoring
    if ('getBattery' in navigator) {
      try {
        this.batteryManager = await (navigator as any).getBattery();
        this.updateBatteryStatus();
        
        this.batteryManager.addEventListener('levelchange', () => this.updateBatteryStatus());
        this.batteryManager.addEventListener('chargingchange', () => this.updateBatteryStatus());
      } catch (error) {
        console.warn('[PerformanceMonitor] Battery API unavailable:', error);
      }
    }

    // Initialize network monitoring
    this.updateNetworkStatus();
    if ('connection' in navigator || 'mozConnection' in navigator || 'webkitConnection' in navigator) {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      connection?.addEventListener('change', () => this.updateNetworkStatus());
    }

    // Start FPS monitoring
    this.startFPSMonitoring();

    // Monitor memory (if available)
    this.startMemoryMonitoring();

    console.log('[PerformanceMonitor] Monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    
    if (this.memoryIntervalId !== null) {
      clearInterval(this.memoryIntervalId);
      this.memoryIntervalId = null;
    }
    
    console.log('[PerformanceMonitor] Monitoring stopped');
  }

  /**
   * FPS monitoring using requestAnimationFrame
   */
  private startFPSMonitoring(): void {
    const measureFPS = (timestamp: number) => {
      this.frameTimestamps.push(timestamp);

      // Keep only last second of frames
      const oneSecondAgo = timestamp - 1000;
      this.frameTimestamps = this.frameTimestamps.filter(t => t > oneSecondAgo);

      // Calculate FPS
      if (this.frameTimestamps.length > 1) {
        this.metrics.fps = this.frameTimestamps.length;
      }

      // Update performance tier based on FPS
      this.updatePerformanceTier();

      this.rafId = requestAnimationFrame(measureFPS);
    };

    this.rafId = requestAnimationFrame(measureFPS);
  }

  /**
   * Memory monitoring (Chrome only)
   */
  private startMemoryMonitoring(): void {
    // Clear existing interval if any
    if (this.memoryIntervalId !== null) {
      clearInterval(this.memoryIntervalId);
    }

    const checkMemory = () => {
      if ('memory' in performance) {
        const mem = (performance as any).memory;
        this.metrics.memory = mem.usedJSHeapSize / (1024 * 1024); // Convert to MB
      }
    };

    // Check every 5 seconds
    this.memoryIntervalId = setInterval(checkMemory, 5000) as any;
    checkMemory();
  }

  /**
   * Update battery status
   */
  private updateBatteryStatus(): void {
    if (!this.batteryManager) return;

    this.metrics.batteryLevel = this.batteryManager.level;
    this.metrics.isCharging = this.batteryManager.charging;

    this.notifyMetricsChange();
  }

  /**
   * Update network connection status
   */
  private updateNetworkStatus(): void {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    if (connection) {
      const effectiveType = connection.effectiveType || 'unknown';
      this.metrics.connectionType = effectiveType;
      this.metrics.saveDataEnabled = connection.saveData || false;
    } else {
      // Fallback: assume online
      this.metrics.connectionType = navigator.onLine ? 'unknown' : 'offline';
    }

    this.notifyMetricsChange();
  }

  /**
   * Update performance tier based on current metrics
   */
  private updatePerformanceTier(): void {
    const oldTier = this.performanceTier;
    let newTier: PerformanceTier = 'high';

    // Check FPS
    if (this.metrics.fps < this.thresholds.fpsMinimum) {
      newTier = 'low';
    } else if (this.metrics.fps < this.thresholds.fpsTarget) {
      newTier = 'medium';
    }

    // Check battery
    if (!this.metrics.isCharging && this.metrics.batteryLevel < this.thresholds.batteryCritical) {
      newTier = 'low';
    }

    // Check memory
    if (this.metrics.memory > this.thresholds.memoryWarning) {
      newTier = newTier === 'high' ? 'medium' : 'low';
    }

    // Check network
    if (this.metrics.saveDataEnabled || ['2g', 'slow-2g'].includes(this.metrics.connectionType)) {
      newTier = newTier === 'high' ? 'medium' : 'low';
    }

    if (newTier !== oldTier) {
      this.performanceTier = newTier;
      console.log(`[PerformanceMonitor] Tier changed: ${oldTier} → ${newTier}`, this.metrics);
      this.notifyTierChange();
    }

    this.notifyMetricsChange();
  }

  /**
   * Subscribe to metrics changes
   */
  onMetricsChange(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.metricsCallbacks.add(callback);
    return () => this.metricsCallbacks.delete(callback);
  }

  /**
   * Subscribe to tier changes
   */
  onTierChange(callback: (tier: PerformanceTier) => void): () => void {
    this.tierChangeCallbacks.add(callback);
    return () => this.tierChangeCallbacks.delete(callback);
  }

  /**
   * Notify all subscribers of metrics change
   */
  private notifyMetricsChange(): void {
    this.metricsCallbacks.forEach(cb => cb({ ...this.metrics }));
  }

  /**
   * Notify all subscribers of tier change
   */
  private notifyTierChange(): void {
    this.tierChangeCallbacks.forEach(cb => cb(this.performanceTier));
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get current performance tier
   */
  getTier(): PerformanceTier {
    return this.performanceTier;
  }

  /**
   * Check if device is low-end
   */
  isLowEndDevice(): boolean {
    return this.performanceTier === 'low';
  }

  /**
   * Check if battery saver mode should be active
   */
  shouldEnableBatterySaver(): boolean {
    return !this.metrics.isCharging && this.metrics.batteryLevel < 0.2;
  }

  /**
   * Check if network is slow
   */
  hasSlowNetwork(): boolean {
    return ['2g', 'slow-2g'].includes(this.metrics.connectionType) || this.metrics.saveDataEnabled;
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();
