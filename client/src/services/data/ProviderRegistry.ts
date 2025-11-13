import type { Region, ProviderSet, IMapTiles, ITraffic, IRadar, IWeather, ProviderFailoverResult } from './types';
import { MapboxTiles, MapTilerTiles, MockMapTiles } from './providers/MapTilesProviders';
import { MapboxTraffic, HereTraffic, TomTomTraffic, MockTraffic } from './providers/TrafficProviders';
import { RemoteGeoJSONRadar, StaticGeoJSONRadar, MockRadar } from './providers/RadarProviders';
import { OpenWeather, MeteoFuse, MockWeather } from './providers/WeatherProviders';

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

  static async withFailover<T>(
    providers: Array<{ getName(): string }>,
    operation: (provider: any) => Promise<T>,
    operationName: string
  ): Promise<ProviderFailoverResult<T>> {
    let lastError: Error | null = null;
    
    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      try {
        console.log(`[ProviderRegistry] Attempting ${operationName} with ${provider.getName()} (attempt ${i + 1}/${providers.length})`);
        const data = await operation(provider);
        
        const result: ProviderFailoverResult<T> = {
          data,
          provider: provider.getName(),
          fallbackUsed: i > 0,
          attempts: i + 1,
        };

        if (i > 0) {
          console.warn(`[ProviderRegistry] ${operationName} succeeded with fallback provider: ${provider.getName()}`);
        }

        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(`[ProviderRegistry] ${provider.getName()} failed for ${operationName}:`, error);
        
        if (i === providers.length - 1) {
          console.error(`[ProviderRegistry] All providers failed for ${operationName}`);
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
