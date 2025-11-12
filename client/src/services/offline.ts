export interface DownloadArea {
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  zoom: {
    min: number;
    max: number;
  };
}

export interface DownloadProgress {
  cached: number;
  total: number;
  percentage: number;
  bytesDownloaded: number;
}

const MAX_CACHE_SIZE = 100 * 1024 * 1024;

class OfflineCacheService {
  private progressCallback: ((progress: DownloadProgress) => void) | null = null;
  private abortController: AbortController | null = null;
  private downloadResolve: ((value: void) => void) | null = null;
  private downloadReject: ((error: Error) => void) | null = null;
  private currentSessionId: string | null = null;

  constructor() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', this.handleMessage.bind(this));
    }
  }

  private handleMessage(event: MessageEvent) {
    const { type, payload } = event.data;

    if (type === 'PREFETCH_PROGRESS' && this.progressCallback) {
      const total = payload.total || 1;
      const progress = {
        cached: payload.cached,
        total: payload.total,
        percentage: total > 0 ? (payload.cached / total) * 100 : 0,
        bytesDownloaded: payload.bytesDownloaded || 0,
      };

      if (progress.bytesDownloaded > MAX_CACHE_SIZE) {
        this.abort();
        if (this.downloadReject) {
          this.downloadReject(new Error(`Download exceeds 100MB limit (${(progress.bytesDownloaded / 1024 / 1024).toFixed(1)}MB)`));
          this.downloadReject = null;
          this.downloadResolve = null;
        }
        return;
      }

      this.progressCallback(progress);
    }

    if (type === 'PREFETCH_COMPLETE') {
      if (this.progressCallback) {
        const total = payload.total || 1;
        this.progressCallback({
          cached: payload.cached,
          total: payload.total,
          percentage: total > 0 ? 100 : 0,
          bytesDownloaded: payload.bytesDownloaded || 0,
        });
      }
      
      if (this.downloadResolve) {
        this.downloadResolve();
        this.downloadResolve = null;
        this.downloadReject = null;
      }
      
      this.progressCallback = null;
      this.currentSessionId = null;
    }

    if (type === 'PREFETCH_FAILED') {
      if (this.downloadReject) {
        this.downloadReject(new Error(payload.error || 'Download failed'));
        this.downloadResolve = null;
        this.downloadReject = null;
      }
      this.progressCallback = null;
      this.currentSessionId = null;
    }
  }

  async getCacheSize(): Promise<number> {
    const controller = navigator.serviceWorker?.controller;
    if (!controller) {
      return 0;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.size || 0);
      };

      controller.postMessage(
        { type: 'GET_CACHE_SIZE' },
        [messageChannel.port2]
      );
    });
  }

  async downloadArea(
    area: DownloadArea,
    mapboxToken: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    await this.waitForServiceWorker();
    
    this.progressCallback = onProgress || null;
    this.abortController = new AbortController();

    const tiles = this.generateTileList(area);
    
    const tileUrls = tiles.map((tile) => {
      return `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/${tile.z}/${tile.x}/${tile.y}.vector.pbf?access_token=${mapboxToken}`;
    });

    if (onProgress) {
      onProgress({
        cached: 0,
        total: tiles.length,
        percentage: 0,
        bytesDownloaded: 0,
      });
    }

    return new Promise<void>((resolve, reject) => {
      this.downloadResolve = resolve;
      this.downloadReject = reject;
      this.currentSessionId = `prefetch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      this.abortController?.signal.addEventListener('abort', () => {
        reject(new Error('Download cancelled'));
        this.downloadResolve = null;
        this.downloadReject = null;
        this.progressCallback = null;
      });

      const controller = navigator.serviceWorker?.controller;
      if (controller) {
        this.getClientId().then(clientId => {
          controller.postMessage({
            type: 'PREFETCH_TILES',
            payload: { 
              tiles: tileUrls, 
              clientId,
              sessionId: this.currentSessionId,
            },
          });
        });
      } else {
        reject(new Error('Service Worker not available'));
      }
    });
  }

  async waitForServiceWorker(timeout = 5000): Promise<void> {
    if (navigator.serviceWorker?.controller) {
      return;
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Service Worker not ready'));
      }, timeout);

      navigator.serviceWorker?.ready.then(() => {
        clearTimeout(timeoutId);
        resolve();
      });
    });
  }

  private async getClientId(): Promise<string> {
    const reg = await navigator.serviceWorker?.ready;
    return reg?.active?.postMessage ? 'main' : 'unknown';
  }

  abort(): void {
    if (this.abortController && this.currentSessionId) {
      const controller = navigator.serviceWorker?.controller;
      if (controller) {
        controller.postMessage({
          type: 'ABORT_PREFETCH',
          payload: { sessionId: this.currentSessionId },
        });
      }
      
      this.abortController.abort();
      this.abortController = null;
      this.progressCallback = null;
      this.currentSessionId = null;
    }
  }

  private generateTileList(area: DownloadArea): Array<{ x: number; y: number; z: number }> {
    const tiles: Array<{ x: number; y: number; z: number }> = [];

    for (let z = area.zoom.min; z <= area.zoom.max; z++) {
      const minTile = this.latLngToTile(area.bounds.north, area.bounds.west, z);
      const maxTile = this.latLngToTile(area.bounds.south, area.bounds.east, z);

      for (let x = minTile.x; x <= maxTile.x; x++) {
        for (let y = minTile.y; y <= maxTile.y; y++) {
          tiles.push({ x, y, z });
        }
      }
    }

    return tiles;
  }

  private latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
    const clampedLat = Math.max(-85.0511, Math.min(85.0511, lat));
    const n = Math.pow(2, zoom);
    const x = Math.floor(((lng + 180) / 360) * n);
    const latRad = (clampedLat * Math.PI) / 180;
    const y = Math.floor(
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
    );
    
    const clampedX = Math.max(0, Math.min(n - 1, x));
    const clampedY = Math.max(0, Math.min(n - 1, y));
    
    return { x: clampedX, y: clampedY };
  }

  async cacheRouteData(routeGeometry: Array<[number, number]>, mapboxToken: string): Promise<void> {
    const tiles = new Set<string>();
    const zoom = 14;

    for (const [lat, lng] of routeGeometry) {
      const tile = this.latLngToTile(lat, lng, zoom);
      tiles.add(`${zoom}/${tile.x}/${tile.y}`);
    }

    const tileUrls = Array.from(tiles).map((tile) => {
      return `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/${tile}.vector.pbf?access_token=${mapboxToken}`;
    });

    const controller = navigator.serviceWorker?.controller;
    if (controller) {
      controller.postMessage({
        type: 'PREFETCH_TILES',
        payload: { tiles: tileUrls },
      });
    }
  }

  async clearCache(cacheName: string): Promise<void> {
    const controller = navigator.serviceWorker?.controller;
    if (controller) {
      controller.postMessage({
        type: 'CLEAR_CACHE',
        payload: { cacheName },
      });
    }
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  addOnlineListener(callback: (online: boolean) => void): () => void {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }
}

export const offlineCacheService = new OfflineCacheService();
