import { get, set, del, keys } from 'idb-keyval';
import type { TrafficFlow, SpeedCamera, WeatherNow } from './types';

export type CacheableData = TrafficFlow[] | SpeedCamera[] | WeatherNow | string;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  provider: string;
}

export interface CacheResult<T> {
  data: T;
  isFresh: boolean;
  age: number;
  provider: string;
}

const CACHE_DURATIONS = {
  map: 7 * 24 * 60 * 60 * 1000,
  traffic: 5 * 60 * 1000,
  radar: 24 * 60 * 60 * 1000,
  weather: 30 * 60 * 1000,
};

export class CacheService {
  private static readonly KEY_PREFIX = 'ai_navigator_provider_';

  static async get<T extends CacheableData>(
    serviceType: keyof typeof CACHE_DURATIONS,
    key: string,
    allowStale: boolean = false
  ): Promise<CacheResult<T> | null> {
    try {
      const cacheKey = this.buildKey(serviceType, key);
      const entry = await get<CacheEntry<T>>(cacheKey);

      if (!entry) {
        return null;
      }

      const maxAge = CACHE_DURATIONS[serviceType];
      const age = Date.now() - entry.timestamp;
      const isFresh = age <= maxAge;

      if (!isFresh && !allowStale) {
        console.log(`[CacheService] Cache expired for ${cacheKey} (age: ${Math.round(age / 1000)}s), not allowing stale`);
        return null;
      }

      console.log(
        `[CacheService] Cache ${isFresh ? 'hit' : 'stale'} for ${cacheKey} ` +
        `(provider: ${entry.provider}, age: ${Math.round(age / 1000)}s)`
      );
      
      return {
        data: entry.data,
        isFresh,
        age,
        provider: entry.provider,
      };
    } catch (error) {
      console.error(`[CacheService] Failed to read cache:`, error);
      return null;
    }
  }

  static async set<T extends CacheableData>(
    serviceType: keyof typeof CACHE_DURATIONS,
    key: string,
    data: T,
    provider: string
  ): Promise<void> {
    try {
      const cacheKey = this.buildKey(serviceType, key);
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        provider,
      };

      await set(cacheKey, entry);
      console.log(`[CacheService] Cached ${cacheKey} from ${provider}`);
    } catch (error) {
      console.error(`[CacheService] Failed to write cache:`, error);
    }
  }

  static async delete(
    serviceType: keyof typeof CACHE_DURATIONS,
    key: string
  ): Promise<void> {
    try {
      const cacheKey = this.buildKey(serviceType, key);
      await del(cacheKey);
      console.log(`[CacheService] Deleted cache for ${cacheKey}`);
    } catch (error) {
      console.error(`[CacheService] Failed to delete cache:`, error);
    }
  }

  private static buildKey(serviceType: string, key: string): string {
    return `${this.KEY_PREFIX}${serviceType}_${key}`;
  }

  static async clearAll(): Promise<void> {
    try {
      const allKeys = await keys();
      const providerKeys = allKeys.filter(key => 
        typeof key === 'string' && key.startsWith(this.KEY_PREFIX)
      );
      
      console.log(`[CacheService] Clearing ${providerKeys.length} provider cache entries`);
      
      await Promise.all(providerKeys.map(key => del(key)));
      
      console.log('[CacheService] All provider caches cleared');
    } catch (error) {
      console.error('[CacheService] Failed to clear caches:', error);
    }
  }

  static async purgeOldEntries(): Promise<void> {
    try {
      const allKeys = await keys();
      const providerKeys = allKeys.filter(key => 
        typeof key === 'string' && key.startsWith(this.KEY_PREFIX)
      );
      
      const MAX_AGE = 24 * 60 * 60 * 1000;
      let purgedCount = 0;
      
      for (const key of providerKeys) {
        const entry = await get<CacheEntry<any>>(key);
        if (entry) {
          const age = Date.now() - entry.timestamp;
          if (age > MAX_AGE) {
            await del(key);
            purgedCount++;
          }
        }
      }
      
      if (purgedCount > 0) {
        console.log(`[CacheService] Purged ${purgedCount} cache entries older than 24h`);
      }
    } catch (error) {
      console.error('[CacheService] Failed to purge old entries:', error);
    }
  }

  static getCacheDuration(serviceType: keyof typeof CACHE_DURATIONS): number {
    return CACHE_DURATIONS[serviceType];
  }
}
