import { GlobalConfig, type Region } from "@shared/global.config";
import { geolocationService } from "./geolocation";

export interface RegionRouterState {
  currentRegion: Region;
  usingFallback: boolean;
  fallbackReason?: string;
  lastHealthCheck?: number;
}

class RegionRouter {
  private state: RegionRouterState = {
    currentRegion: GlobalConfig.defaultRegion,
    usingFallback: false,
  };

  private healthCheckCache = new Map<Region, { healthy: boolean; timestamp: number }>();
  private readonly HEALTH_CHECK_INTERVAL = 5 * 60 * 1000;

  async initialize(): Promise<void> {
    try {
      const location = await geolocationService.detectUserLocation();
      this.state.currentRegion = location.region;
      
      const isHealthy = await this.checkRegionHealth(location.region);
      if (!isHealthy) {
        await this.activateFallback("Primary region health check failed");
      }
    } catch (error) {
      console.warn("[RegionRouter] Initialization failed, using default region:", error);
      await this.activateFallback("Initialization error");
    }
  }

  async fetchRegionEndpoint(path: string = ""): Promise<string> {
    const region = this.state.currentRegion;
    const endpoint = GlobalConfig.regionalEndpoints.find(e => e.region === region);
    
    if (!endpoint) {
      console.warn(`[RegionRouter] No endpoint for region ${region}, using fallback`);
      return `${GlobalConfig.fallbackServer}${path}`;
    }

    const shouldCheckHealth = this.shouldPerformHealthCheck(region);
    if (shouldCheckHealth) {
      const isHealthy = await this.checkRegionHealth(region);
      if (!isHealthy && !this.state.usingFallback) {
        await this.activateFallback(`Region ${region} health check failed`);
        return `${GlobalConfig.fallbackServer}${path}`;
      }
    }

    return `${endpoint.url}${path}`;
  }

  private shouldPerformHealthCheck(region: Region): boolean {
    const cached = this.healthCheckCache.get(region);
    if (!cached) return true;

    const elapsed = Date.now() - cached.timestamp;
    return elapsed > this.HEALTH_CHECK_INTERVAL;
  }

  private async checkRegionHealth(region: Region): Promise<boolean> {
    const endpoint = GlobalConfig.regionalEndpoints.find(e => e.region === region);
    if (!endpoint) return false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), GlobalConfig.requestTimeout.fallback);

      const response = await fetch(`${endpoint.url}/api/health`, {
        method: "HEAD",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const isHealthy = response.ok;
      this.healthCheckCache.set(region, {
        healthy: isHealthy,
        timestamp: Date.now(),
      });

      return isHealthy;
    } catch (error) {
      console.warn(`[RegionRouter] Health check failed for ${region}:`, error);
      this.healthCheckCache.set(region, {
        healthy: false,
        timestamp: Date.now(),
      });
      return false;
    }
  }

  private async activateFallback(reason: string): Promise<void> {
    console.warn(`[RegionRouter] Activating fallback: ${reason}`);
    
    this.state = {
      currentRegion: GlobalConfig.defaultRegion,
      usingFallback: true,
      fallbackReason: reason,
      lastHealthCheck: Date.now(),
    };

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("region-fallback", {
        detail: {
          reason,
          fallbackRegion: GlobalConfig.defaultRegion,
        },
      }));
    }
  }

  getState(): RegionRouterState {
    return { ...this.state };
  }

  isHighLatencyRegion(): boolean {
    return GlobalConfig.highLatencyRegions.includes(this.state.currentRegion);
  }

  getCacheDuration(): number {
    return this.isHighLatencyRegion()
      ? GlobalConfig.cacheDuration.highLatency
      : GlobalConfig.cacheDuration.lowLatency;
  }

  async retryWithFallback<T>(
    operation: () => Promise<T>,
    maxRetries: number = 2
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`[RegionRouter] Attempt ${attempt + 1} failed:`, error);

        if (attempt < maxRetries && !this.state.usingFallback) {
          await this.activateFallback(`Request failed after ${attempt + 1} attempts`);
        }
      }
    }

    throw lastError || new Error("All retry attempts failed");
  }
}

export const regionRouter = new RegionRouter();
