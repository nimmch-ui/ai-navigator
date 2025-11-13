import type { Region, ProviderSet, IMapTiles, ITraffic, IRadar, IWeather, ProviderFailoverResult } from './types';
import { MapboxTiles, MapTilerTiles, MockMapTiles } from './providers/MapTilesProviders';
import { MapboxTraffic, HereTraffic, TomTomTraffic, MockTraffic } from './providers/TrafficProviders';
import { RemoteGeoJSONRadar, StaticGeoJSONRadar, MockRadar } from './providers/RadarProviders';
import { OpenWeather, MeteoFuse, MockWeather } from './providers/WeatherProviders';
import { HealthMonitor } from './HealthMonitor';
import { CacheService, type CacheableData } from './CacheService';
import { EventBus } from '@/services/eventBus';
import { toast } from '@/hooks/use-toast';

export class ProviderRegistry {
  private static providersCache: Map<Region, ProviderSet> = new Map();

  static for(region: Region): ProviderSet {
    if (this.providersCache.has(region)) {
      return this.providersCache.get(region)!;
    }

    const providers = this.buildProviderSet(region);
    this.providersCache.set(region, providers);
    return providers;
  }

  private static buildProviderSet(region: Region): ProviderSet {
    return {
      map: this.getMapProviders(region),
      traffic: this.getTrafficProviders(region),
      radar: this.getRadarProviders(region),
      weather: this.getWeatherProviders(region),
    };
  }

  private static getMapProviders(region: Region): IMapTiles[] {
    const providers: IMapTiles[] = [];

    try {
      providers.push(new MapboxTiles());
    } catch (e) {
      console.warn(`[ProviderRegistry] Mapbox not available for ${region}:`, e);
    }

    try {
      providers.push(new MapTilerTiles());
    } catch (e) {
      console.warn(`[ProviderRegistry] MapTiler not available for ${region}:`, e);
    }

    providers.push(new MockMapTiles());

    return providers;
  }

  private static getTrafficProviders(region: Region): ITraffic[] {
    const providers: ITraffic[] = [];

    if (region === 'EU' || region === 'CH' || region === 'US') {
      try {
        providers.push(new MapboxTraffic());
      } catch (e) {
        console.warn(`[ProviderRegistry] Mapbox Traffic not available for ${region}:`, e);
      }
    }

    if (region === 'EU' || region === 'ME' || region === 'IN') {
      try {
        providers.push(new HereTraffic());
      } catch (e) {
        console.warn(`[ProviderRegistry] HERE Traffic not available for ${region}:`, e);
      }
    }

    try {
      providers.push(new TomTomTraffic());
    } catch (e) {
      console.warn(`[ProviderRegistry] TomTom Traffic not available for ${region}:`, e);
    }

    providers.push(new MockTraffic());

    return providers;
  }

  private static getRadarProviders(region: Region): IRadar[] {
    const providers: IRadar[] = [];

    try {
      providers.push(new RemoteGeoJSONRadar(region));
    } catch (e) {
      console.warn(`[ProviderRegistry] Remote Radar not available for ${region}:`, e);
    }

    providers.push(new StaticGeoJSONRadar());
    providers.push(new MockRadar());

    return providers;
  }

  private static getWeatherProviders(region: Region): IWeather[] {
    const providers: IWeather[] = [];

    try {
      providers.push(new OpenWeather());
    } catch (e) {
      console.warn(`[ProviderRegistry] OpenWeather not available for ${region}:`, e);
    }

    providers.push(new MeteoFuse());
    providers.push(new MockWeather());

    return providers;
  }

  static async withFailover<T extends CacheableData>(
    providers: Array<{ getName(): string }>,
    operation: (provider: any) => Promise<T>,
    operationName: string,
    cacheKey?: string,
    serviceType?: 'map' | 'traffic' | 'radar' | 'weather'
  ): Promise<ProviderFailoverResult<T>> {
    let lastError: Error | null = null;
    let previousProvider: string | null = null;
    
    if (cacheKey && serviceType) {
      const cached = await CacheService.get<T>(serviceType, cacheKey, false);
      if (cached && cached.isFresh) {
        console.log(`[ProviderRegistry] Using fresh cached data for ${operationName} (provider: ${cached.provider})`);
        return {
          data: cached.data,
          provider: `Cache (${cached.provider})`,
          fallbackUsed: false,
          attempts: 0,
        };
      }
    }

    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      const providerName = provider.getName();
      
      try {
        console.log(`[ProviderRegistry] Attempting ${operationName} with ${providerName} (attempt ${i + 1}/${providers.length})`);
        
        const { data, latency, attempts } = await HealthMonitor.executeWithHealth(
          providerName,
          () => operation(provider)
        );
        
        if (cacheKey && serviceType) {
          await CacheService.set(serviceType, cacheKey, data, providerName);
        }

        const result: ProviderFailoverResult<T> = {
          data,
          provider: providerName,
          fallbackUsed: i > 0,
          attempts: i + attempts,
        };

        if (i > 0 && previousProvider) {
          console.warn(`[ProviderRegistry] ${operationName} failed over from ${previousProvider} to ${providerName}`);
          
          EventBus.emit('provider:failover', {
            service: operationName,
            from: previousProvider,
            to: providerName,
            latency,
            reason: lastError?.message || 'Unknown error',
          });
        }

        return result;
      } catch (error) {
        lastError = error as Error;
        previousProvider = providerName;
        console.warn(`[ProviderRegistry] ${providerName} failed for ${operationName}:`, error);
        
        if (i === providers.length - 1) {
          console.error(`[ProviderRegistry] All providers failed for ${operationName}`);
          
          if (cacheKey && serviceType) {
            const staleCache = await CacheService.get<T>(serviceType, cacheKey, true);
            if (staleCache) {
              const ageMinutes = Math.round(staleCache.age / 60000);
              console.warn(
                `[ProviderRegistry] Using stale cached data for ${operationName} ` +
                `(age: ${ageMinutes}min, provider: ${staleCache.provider})`
              );
              
              toast({
                title: 'Using Cached Data',
                description: `All ${operationName} providers unavailable. Showing cached data from ${ageMinutes} minute${ageMinutes !== 1 ? 's' : ''} ago.`,
                variant: 'default',
              });

              return {
                data: staleCache.data,
                provider: `Cache (Stale, ${staleCache.provider})`,
                fallbackUsed: true,
                attempts: providers.length,
              };
            }
          }
          
          toast({
            title: 'Provider Error',
            description: `All ${operationName} providers failed. Using fallback data.`,
            variant: 'destructive',
          });
          
          throw new Error(
            `All ${providers.length} providers failed for ${operationName}. Last error: ${lastError?.message}`
          );
        }
      }
    }

    throw new Error(`Provider failover exhausted for ${operationName}`);
  }

  static clearCache(): void {
    this.providersCache.clear();
  }
}
