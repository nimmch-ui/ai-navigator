import { regionRouter } from "./regionRouter";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  region: string;
}

export class RegionalCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private pendingRequests = new Map<string, Promise<T>>();

  async get(
    key: string,
    fetcher: () => Promise<T>,
    customDuration?: number
  ): Promise<T> {
    const cached = this.cache.get(key);
    const duration = customDuration ?? regionRouter.getCacheDuration();

    if (cached && Date.now() - cached.timestamp < duration) {
      return cached.data;
    }

    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending;
    }

    const request = this.fetchAndCache(key, fetcher);
    this.pendingRequests.set(key, request);

    try {
      const data = await request;
      return data;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  private async fetchAndCache(key: string, fetcher: () => Promise<T>): Promise<T> {
    try {
      const data = await regionRouter.retryWithFallback(fetcher);
      
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        region: regionRouter.getState().currentRegion,
      });

      return data;
    } catch (error) {
      const cached = this.cache.get(key);
      if (cached) {
        console.warn(`[RegionalCache] Using stale cache for ${key}:`, error);
        return cached.data;
      }
      throw error;
    }
  }

  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      region: regionRouter.getState().currentRegion,
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  invalidateByPrefix(prefix: string): void {
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  getStats(): {
    size: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    const entries = Array.from(this.cache.values());
    
    return {
      size: this.cache.size,
      oldestEntry: entries.length > 0 
        ? Math.min(...entries.map(e => e.timestamp))
        : null,
      newestEntry: entries.length > 0
        ? Math.max(...entries.map(e => e.timestamp))
        : null,
    };
  }

  cleanup(maxAge: number = 30 * 60 * 1000): number {
    const now = Date.now();
    let removed = 0;

    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > maxAge) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }
}

export const radarCache = new RegionalCache();
export const routeCache = new RegionalCache();
export const weatherCache = new RegionalCache();
