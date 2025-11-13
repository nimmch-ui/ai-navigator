import { get, set, keys, del } from 'idb-keyval';

export interface CachedRoute {
  id: string;
  origin: {
    lat: number;
    lng: number;
    name?: string;
  };
  destination: {
    lat: number;
    lng: number;
    name?: string;
  };
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  maneuvers: Array<{
    instruction: string;
    distance: number;
    duration: number;
    location: [number, number];
    type: string;
  }>;
  speedLimits?: Array<{
    location: [number, number];
    limit: number;
    distance: number;
  }>;
  radarPoints?: Array<{
    id: string;
    location: [number, number];
    type: string;
  }>;
  metadata: {
    distance: number;
    duration: number;
    createdAt: number;
    lastUsedAt: number;
  };
}

const CACHE_KEY_PREFIX = 'ai_navigator_route_';
const MAX_CACHED_ROUTES = 10;
const DISTANCE_THRESHOLD_METERS = 500;

export class RouteCache {
  private static instance: RouteCache;

  private constructor() {}

  static getInstance(): RouteCache {
    if (!RouteCache.instance) {
      RouteCache.instance = new RouteCache();
    }
    return RouteCache.instance;
  }

  async saveRoute(route: CachedRoute): Promise<void> {
    try {
      const cacheKey = this.buildKey(route.id);
      await set(cacheKey, route);
      console.log(`[RouteCache] Saved route ${route.id}`);

      await this.enforceLimit();
    } catch (error) {
      console.error('[RouteCache] Failed to save route:', error);
      throw error;
    }
  }

  async findRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ): Promise<CachedRoute | null> {
    try {
      const allRoutes = await this.getAllRoutes();

      const matchingRoute = allRoutes.find(route => {
        const originMatch = this.isWithinThreshold(
          origin,
          route.origin,
          DISTANCE_THRESHOLD_METERS
        );
        const destMatch = this.isWithinThreshold(
          destination,
          route.destination,
          DISTANCE_THRESHOLD_METERS
        );
        return originMatch && destMatch;
      });

      if (matchingRoute) {
        matchingRoute.metadata.lastUsedAt = Date.now();
        await this.saveRoute(matchingRoute);
        console.log(`[RouteCache] Found matching route: ${matchingRoute.id}`);
      }

      return matchingRoute || null;
    } catch (error) {
      console.error('[RouteCache] Failed to find route:', error);
      return null;
    }
  }

  async getRoute(routeId: string): Promise<CachedRoute | null> {
    try {
      const cacheKey = this.buildKey(routeId);
      const route = await get<CachedRoute>(cacheKey);
      return route || null;
    } catch (error) {
      console.error('[RouteCache] Failed to get route:', error);
      return null;
    }
  }

  async getAllRoutes(): Promise<CachedRoute[]> {
    try {
      const allKeys = await keys();
      const routeKeys = allKeys.filter(key =>
        typeof key === 'string' && key.startsWith(CACHE_KEY_PREFIX)
      );

      const routes: CachedRoute[] = [];
      for (const key of routeKeys) {
        const route = await get<CachedRoute>(key);
        if (route) {
          routes.push(route);
        }
      }

      return routes.sort((a, b) => b.metadata.lastUsedAt - a.metadata.lastUsedAt);
    } catch (error) {
      console.error('[RouteCache] Failed to get all routes:', error);
      return [];
    }
  }

  async deleteRoute(routeId: string): Promise<void> {
    try {
      const cacheKey = this.buildKey(routeId);
      await del(cacheKey);
      console.log(`[RouteCache] Deleted route ${routeId}`);
    } catch (error) {
      console.error('[RouteCache] Failed to delete route:', error);
    }
  }

  async clearAll(): Promise<void> {
    try {
      const routes = await this.getAllRoutes();
      for (const route of routes) {
        await this.deleteRoute(route.id);
      }
      console.log('[RouteCache] Cleared all routes');
    } catch (error) {
      console.error('[RouteCache] Failed to clear all routes:', error);
    }
  }

  async getCacheSize(): Promise<number> {
    const routes = await this.getAllRoutes();
    return routes.length;
  }

  private async enforceLimit(): Promise<void> {
    try {
      const routes = await this.getAllRoutes();
      
      if (routes.length > MAX_CACHED_ROUTES) {
        const sortedByLastUsed = routes.sort(
          (a, b) => a.metadata.lastUsedAt - b.metadata.lastUsedAt
        );

        const toDelete = sortedByLastUsed.slice(0, routes.length - MAX_CACHED_ROUTES);
        
        for (const route of toDelete) {
          await this.deleteRoute(route.id);
          console.log(`[RouteCache] Evicted old route ${route.id}`);
        }
      }
    } catch (error) {
      console.error('[RouteCache] Failed to enforce limit:', error);
    }
  }

  private isWithinThreshold(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number },
    thresholdMeters: number
  ): boolean {
    const distance = this.calculateDistance(point1, point2);
    return distance <= thresholdMeters;
  }

  private calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    const R = 6371e3;
    const φ1 = (point1.lat * Math.PI) / 180;
    const φ2 = (point2.lat * Math.PI) / 180;
    const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
    const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private buildKey(routeId: string): string {
    return `${CACHE_KEY_PREFIX}${routeId}`;
  }
}

export const routeCache = RouteCache.getInstance();
