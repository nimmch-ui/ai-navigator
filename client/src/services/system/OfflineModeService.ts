import { EventBus } from '@/services/eventBus';

export type NetworkQuality = 'good' | 'weak' | 'offline';

export interface NetworkStatus {
  isOffline: boolean;
  quality: NetworkQuality;
  timestamp: number;
}

interface NetworkStatusChangedEvent {
  previous: NetworkStatus;
  current: NetworkStatus;
}

const PING_TIMEOUT_MS = 3000;
const WEAK_THRESHOLD_MS = 2000;
const PING_INTERVAL_MS = 30000;

export class OfflineModeService {
  private static instance: OfflineModeService;
  private status: NetworkStatus;
  private pingIntervalId: number | null = null;
  private statusChangeCallbacks: Set<(status: NetworkStatus) => void> = new Set();

  private constructor() {
    this.status = {
      isOffline: !navigator.onLine,
      quality: navigator.onLine ? 'good' : 'offline',
      timestamp: Date.now(),
    };

    this.setupEventListeners();
    this.startPeriodicPing();
  }

  static getInstance(): OfflineModeService {
    if (!OfflineModeService.instance) {
      OfflineModeService.instance = new OfflineModeService();
    }
    return OfflineModeService.instance;
  }

  private setupEventListeners(): void {
    window.addEventListener('online', () => this.handleOnlineEvent());
    window.addEventListener('offline', () => this.handleOfflineEvent());
  }

  private handleOnlineEvent(): void {
    console.log('[OfflineModeService] Browser reports online');
    this.checkNetworkQuality();
  }

  private handleOfflineEvent(): void {
    console.log('[OfflineModeService] Browser reports offline');
    this.setStatus({
      isOffline: true,
      quality: 'offline',
      timestamp: Date.now(),
    });
  }

  private async checkNetworkQuality(): Promise<void> {
    if (!navigator.onLine) {
      this.setStatus({
        isOffline: true,
        quality: 'offline',
        timestamp: Date.now(),
      });
      return;
    }

    try {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);

      const response = await fetch('/api/health', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;

      if (response.ok) {
        const quality: NetworkQuality = latency > WEAK_THRESHOLD_MS ? 'weak' : 'good';
        this.setStatus({
          isOffline: false,
          quality,
          timestamp: Date.now(),
        });
        console.log(`[OfflineModeService] Network check: ${quality} (${latency}ms)`);
      } else {
        this.setStatus({
          isOffline: false,
          quality: 'weak',
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('[OfflineModeService] Network ping timeout - marking as weak');
        this.setStatus({
          isOffline: false,
          quality: 'weak',
          timestamp: Date.now(),
        });
      } else {
        console.warn('[OfflineModeService] Network ping failed:', error);
        this.setStatus({
          isOffline: true,
          quality: 'offline',
          timestamp: Date.now(),
        });
      }
    }
  }

  private startPeriodicPing(): void {
    this.checkNetworkQuality();

    this.pingIntervalId = window.setInterval(() => {
      this.checkNetworkQuality();
    }, PING_INTERVAL_MS);
  }

  private setStatus(newStatus: NetworkStatus): void {
    const previous = { ...this.status };
    
    if (
      previous.isOffline === newStatus.isOffline &&
      previous.quality === newStatus.quality
    ) {
      return;
    }

    this.status = newStatus;

    if (!previous.isOffline && newStatus.isOffline) {
      EventBus.emit('offline:mode_entered', {
        timestamp: Date.now(),
        quality: newStatus.quality,
      });
    } else if (previous.isOffline && !newStatus.isOffline) {
      const duration = newStatus.timestamp - previous.timestamp;
      EventBus.emit('offline:mode_exit', {
        timestamp: Date.now(),
        duration,
      });
    }

    const event: NetworkStatusChangedEvent = {
      previous,
      current: newStatus,
    };

    console.log('[OfflineModeService] Status changed:', event);

    EventBus.emit('network:statusChanged', event);

    this.statusChangeCallbacks.forEach(callback => {
      try {
        callback(newStatus);
      } catch (error) {
        console.error('[OfflineModeService] Error in status change callback:', error);
      }
    });
  }

  getStatus(): NetworkStatus {
    return { ...this.status };
  }

  /**
   * Subscribe to network status changes
   * Returns unsubscribe function
   */
  subscribe(callback: (status: NetworkStatus) => void): () => void {
    this.statusChangeCallbacks.add(callback);
    return () => {
      this.statusChangeCallbacks.delete(callback);
    };
  }

  isNavigationRestricted(): boolean {
    return this.status.isOffline;
  }

  canUseOnlineFeatures(): boolean {
    return !this.status.isOffline;
  }

  onStatusChange(callback: (status: NetworkStatus) => void): () => void {
    this.statusChangeCallbacks.add(callback);
    
    return () => {
      this.statusChangeCallbacks.delete(callback);
    };
  }

  forceCheck(): void {
    this.checkNetworkQuality();
  }

  destroy(): void {
    if (this.pingIntervalId !== null) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
    this.statusChangeCallbacks.clear();
  }
}

export const offlineModeService = OfflineModeService.getInstance();
