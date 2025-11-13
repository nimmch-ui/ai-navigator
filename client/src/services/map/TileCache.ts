import { get, set, keys, del } from 'idb-keyval';

export interface TileCacheEntry {
  url: string;
  blob: Blob;
  timestamp: number;
  size: number;
}

const CACHE_KEY_PREFIX = 'ai_navigator_tile_';
const MAX_CACHE_SIZE_BYTES = 150 * 1024 * 1024; // 150 MB
const TILE_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export class TileCache {
  private static instance: TileCache;
  private currentSize: number = 0;
  private sizeInitialized: boolean = false;

  private constructor() {}

  static getInstance(): TileCache {
    if (!TileCache.instance) {
      TileCache.instance = new TileCache();
    }
    return TileCache.instance;
  }

  async initialize(): Promise<void> {
    if (this.sizeInitialized) return;
    
    try {
      await this.calculateCurrentSize();
      this.sizeInitialized = true;
      console.log(`[TileCache] Initialized with ${this.formatSize(this.currentSize)}`);
    } catch (error) {
      console.error('[TileCache] Failed to initialize:', error);
    }
  }

  async getTile(url: string): Promise<Blob | null> {
    try {
      const cacheKey = this.buildKey(url);
      const entry = await get<TileCacheEntry>(cacheKey);

      if (!entry) {
        return null;
      }

      const age = Date.now() - entry.timestamp;
      if (age > TILE_CACHE_DURATION) {
        console.log(`[TileCache] Tile expired: ${url}`);
        await this.deleteTile(url);
        return null;
      }

      console.log(`[TileCache] Cache hit: ${url}`);
      return entry.blob;
    } catch (error) {
      console.error('[TileCache] Failed to get tile:', error);
      return null;
    }
  }

  async saveTile(url: string, blob: Blob): Promise<void> {
    try {
      if (!this.sizeInitialized) {
        await this.initialize();
      }

      const tileSize = blob.size;
      
      await this.ensureSpace(tileSize);

      const entry: TileCacheEntry = {
        url,
        blob,
        timestamp: Date.now(),
        size: tileSize,
      };

      const cacheKey = this.buildKey(url);
      await set(cacheKey, entry);
      
      this.currentSize += tileSize;
      console.log(`[TileCache] Saved tile ${url} (${this.formatSize(tileSize)}), total: ${this.formatSize(this.currentSize)}`);
    } catch (error) {
      console.error('[TileCache] Failed to save tile:', error);
    }
  }

  async deleteTile(url: string): Promise<void> {
    try {
      const cacheKey = this.buildKey(url);
      const entry = await get<TileCacheEntry>(cacheKey);
      
      if (entry) {
        await del(cacheKey);
        this.currentSize -= entry.size;
        console.log(`[TileCache] Deleted tile ${url} (${this.formatSize(entry.size)})`);
      }
    } catch (error) {
      console.error('[TileCache] Failed to delete tile:', error);
    }
  }

  async prefetchTiles(
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    },
    zoom: number
  ): Promise<void> {
    console.log(`[TileCache] Prefetching tiles for bounds at zoom ${zoom}`);
    
    // Mapbox tile URL pattern: 
    // https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/{z}/{x}/{y}.vector.pbf
    const tileUrls = this.generateTileUrls(bounds, zoom);
    
    let fetched = 0;
    let cached = 0;
    
    for (const url of tileUrls) {
      const existing = await this.getTile(url);
      if (existing) {
        cached++;
        continue;
      }

      try {
        const response = await fetch(url);
        if (response.ok) {
          const blob = await response.blob();
          await this.saveTile(url, blob);
          fetched++;
        }
      } catch (error) {
        console.warn(`[TileCache] Failed to prefetch tile ${url}:`, error);
      }

      if (fetched % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`[TileCache] Prefetch complete: ${fetched} fetched, ${cached} already cached`);
  }

  async clearAll(): Promise<void> {
    try {
      const allKeys = await keys();
      const tileKeys = allKeys.filter(key =>
        typeof key === 'string' && key.startsWith(CACHE_KEY_PREFIX)
      );

      for (const key of tileKeys) {
        await del(key);
      }

      this.currentSize = 0;
      console.log('[TileCache] Cleared all tiles');
    } catch (error) {
      console.error('[TileCache] Failed to clear all tiles:', error);
    }
  }

  async getCacheStats(): Promise<{
    count: number;
    size: number;
    sizeFormatted: string;
    maxSize: number;
    maxSizeFormatted: string;
    usagePercent: number;
  }> {
    if (!this.sizeInitialized) {
      await this.initialize();
    }

    const allKeys = await keys();
    const tileKeys = allKeys.filter(key =>
      typeof key === 'string' && key.startsWith(CACHE_KEY_PREFIX)
    );

    return {
      count: tileKeys.length,
      size: this.currentSize,
      sizeFormatted: this.formatSize(this.currentSize),
      maxSize: MAX_CACHE_SIZE_BYTES,
      maxSizeFormatted: this.formatSize(MAX_CACHE_SIZE_BYTES),
      usagePercent: (this.currentSize / MAX_CACHE_SIZE_BYTES) * 100,
    };
  }

  private async ensureSpace(requiredSize: number): Promise<void> {
    if (this.currentSize + requiredSize <= MAX_CACHE_SIZE_BYTES) {
      return;
    }

    console.log(`[TileCache] Need ${this.formatSize(requiredSize)}, evicting old tiles...`);

    const allTiles = await this.getAllTiles();
    const sortedByAge = allTiles.sort((a, b) => a.timestamp - b.timestamp);

    for (const tile of sortedByAge) {
      await this.deleteTile(tile.url);
      
      if (this.currentSize + requiredSize <= MAX_CACHE_SIZE_BYTES) {
        break;
      }
    }
  }

  private async getAllTiles(): Promise<TileCacheEntry[]> {
    try {
      const allKeys = await keys();
      const tileKeys = allKeys.filter(key =>
        typeof key === 'string' && key.startsWith(CACHE_KEY_PREFIX)
      );

      const tiles: TileCacheEntry[] = [];
      for (const key of tileKeys) {
        const entry = await get<TileCacheEntry>(key);
        if (entry) {
          tiles.push(entry);
        }
      }

      return tiles;
    } catch (error) {
      console.error('[TileCache] Failed to get all tiles:', error);
      return [];
    }
  }

  private async calculateCurrentSize(): Promise<void> {
    const tiles = await this.getAllTiles();
    this.currentSize = tiles.reduce((sum, tile) => sum + tile.size, 0);
  }

  private generateTileUrls(
    bounds: { north: number; south: number; east: number; west: number },
    zoom: number
  ): string[] {
    const urls: string[] = [];
    
    const minTile = this.latLngToTile(bounds.north, bounds.west, zoom);
    const maxTile = this.latLngToTile(bounds.south, bounds.east, zoom);

    for (let x = minTile.x; x <= maxTile.x; x++) {
      for (let y = minTile.y; y <= maxTile.y; y++) {
        const url = this.buildTileUrl(zoom, x, y);
        urls.push(url);
      }
    }

    return urls;
  }

  private latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
    const latRad = (lat * Math.PI) / 180;
    const n = Math.pow(2, zoom);
    const x = Math.floor(((lng + 180) / 360) * n);
    const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
    return { x, y };
  }

  private buildTileUrl(z: number, x: number, y: number): string {
    const token = import.meta.env.VITE_MAPBOX_TOKEN || '';
    return `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/${z}/${x}/${y}.vector.pbf?access_token=${token}`;
  }

  private buildKey(url: string): string {
    const hash = this.simpleHash(url);
    return `${CACHE_KEY_PREFIX}${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}

export const tileCache = TileCache.getInstance();
