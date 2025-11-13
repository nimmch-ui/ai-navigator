import type { IRadar, BBox, SpeedCamera, Region } from '../types';

const REGIONAL_RADAR_URLS: Record<Region, string> = {
  EU: '',
  CH: '',
  US: '',
  IN: '',
  ME: '',
  GLOBAL: '',
};


export class RemoteGeoJSONRadar implements IRadar {
  constructor(private region: Region) {}

  getName(): string {
    return `Remote Radar (${this.region})`;
  }

  async getCameras(bbox: BBox): Promise<SpeedCamera[]> {
    const url = REGIONAL_RADAR_URLS[this.region];
    if (!url || url === '') {
      throw new Error(`[RemoteGeoJSONRadar] No remote radar data source configured for region: ${this.region}. Falling back to next provider.`);
    }

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Remote Radar API error: ${response.status}`);
    }

    const data = await response.json();
    return this.filterByBBox(this.transformGeoJSON(data), bbox);
  }

  private transformGeoJSON(data: any): SpeedCamera[] {
    if (!data.features || !Array.isArray(data.features)) {
      return [];
    }

    return data.features
      .filter((feature: any) => feature.geometry?.type === 'Point')
      .map((feature: any, index: number) => ({
        id: `remote-${this.region}-${index}`,
        lat: feature.geometry.coordinates[1],
        lng: feature.geometry.coordinates[0],
        speedLimit: feature.properties?.speed_limit || 50,
        type: feature.properties?.type || 'fixed',
        direction: feature.properties?.direction,
      }));
  }

  private filterByBBox(cameras: SpeedCamera[], bbox: BBox): SpeedCamera[] {
    return cameras.filter(camera => 
      camera.lat >= bbox.minLat &&
      camera.lat <= bbox.maxLat &&
      camera.lng >= bbox.minLng &&
      camera.lng <= bbox.maxLng
    );
  }
}

export class StaticGeoJSONRadar implements IRadar {
  private static cameras: SpeedCamera[] = [
    { id: 'static-1', lat: 47.3769, lng: 8.5417, speedLimit: 50, type: 'fixed' },
    { id: 'static-2', lat: 47.3779, lng: 8.5427, speedLimit: 60, type: 'fixed' },
    { id: 'static-3', lat: 46.9481, lng: 7.4474, speedLimit: 50, type: 'fixed' },
    { id: 'static-4', lat: 46.2044, lng: 6.1432, speedLimit: 80, type: 'fixed' },
    { id: 'static-5', lat: 51.5074, lng: -0.1278, speedLimit: 30, type: 'fixed' },
    { id: 'static-6', lat: 48.8566, lng: 2.3522, speedLimit: 50, type: 'fixed' },
    { id: 'static-7', lat: 52.5200, lng: 13.4050, speedLimit: 50, type: 'fixed' },
    { id: 'static-8', lat: 40.7128, lng: -74.0060, speedLimit: 25, type: 'fixed' },
    { id: 'static-9', lat: 34.0522, lng: -118.2437, speedLimit: 35, type: 'fixed' },
    { id: 'static-10', lat: 28.6139, lng: 77.2090, speedLimit: 60, type: 'fixed' },
  ];

  getName(): string {
    return 'Static Radar';
  }

  async getCameras(bbox: BBox): Promise<SpeedCamera[]> {
    return StaticGeoJSONRadar.cameras.filter(camera =>
      camera.lat >= bbox.minLat &&
      camera.lat <= bbox.maxLat &&
      camera.lng >= bbox.minLng &&
      camera.lng <= bbox.maxLng
    );
  }
}

export class MockRadar implements IRadar {
  getName(): string {
    return 'Mock Radar';
  }

  async getCameras(bbox: BBox): Promise<SpeedCamera[]> {
    const centerLat = (bbox.minLat + bbox.maxLat) / 2;
    const centerLng = (bbox.minLng + bbox.maxLng) / 2;

    return [
      {
        id: 'mock-1',
        lat: centerLat + 0.001,
        lng: centerLng + 0.001,
        speedLimit: 50,
        type: 'fixed',
      },
      {
        id: 'mock-2',
        lat: centerLat - 0.001,
        lng: centerLng - 0.001,
        speedLimit: 60,
        type: 'mobile',
      },
    ];
  }
}
