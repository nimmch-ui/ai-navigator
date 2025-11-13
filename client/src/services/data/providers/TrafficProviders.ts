import type { ITraffic, BBox, TrafficFlow } from '../types';

export class MapboxTraffic implements ITraffic {
  private token: string;

  constructor() {
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) {
      throw new Error('[MapboxTraffic] VITE_MAPBOX_TOKEN not configured');
    }
    this.token = token;
  }

  getName(): string {
    return 'Mapbox Traffic';
  }

  async getFlow(bbox: BBox): Promise<TrafficFlow[]> {
    const token = this.token;

    const url = `https://api.mapbox.com/v4/mapbox.mapbox-traffic-v1/tilequery/${bbox.minLng},${bbox.minLat}.json?access_token=${token}`;
    
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Mapbox Traffic API error: ${response.status}`);
    }

    const data = await response.json();
    return this.transformResponse(data);
  }

  private transformResponse(data: any): TrafficFlow[] {
    if (!data.features || !Array.isArray(data.features)) {
      return [];
    }

    return data.features.map((feature: any, index: number) => ({
      id: `mapbox-traffic-${index}`,
      coordinates: feature.geometry?.coordinates || [],
      speed: feature.properties?.speed || 50,
      freeFlowSpeed: feature.properties?.freeFlowSpeed || 60,
      congestionLevel: this.getCongestionLevel(
        feature.properties?.speed || 50,
        feature.properties?.freeFlowSpeed || 60
      ),
    }));
  }

  private getCongestionLevel(speed: number, freeFlowSpeed: number): 'low' | 'moderate' | 'high' | 'severe' {
    const ratio = speed / freeFlowSpeed;
    if (ratio > 0.8) return 'low';
    if (ratio > 0.6) return 'moderate';
    if (ratio > 0.4) return 'high';
    return 'severe';
  }
}

export class HereTraffic implements ITraffic {
  private apiKey: string;

  constructor() {
    const apiKey = import.meta.env.VITE_HERE_KEY;
    if (!apiKey) {
      throw new Error('[HereTraffic] VITE_HERE_KEY not configured');
    }
    this.apiKey = apiKey;
  }

  getName(): string {
    return 'HERE Traffic';
  }

  async getFlow(bbox: BBox): Promise<TrafficFlow[]> {
    const apiKey = this.apiKey;

    const url = `https://data.traffic.hereapi.com/v7/flow?bbox=${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng}&apiKey=${apiKey}`;
    
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`HERE Traffic API error: ${response.status}`);
    }

    const data = await response.json();
    return this.transformResponse(data);
  }

  private transformResponse(data: any): TrafficFlow[] {
    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    return data.results.map((item: any, index: number) => ({
      id: `here-traffic-${index}`,
      coordinates: item.location?.shape || [],
      speed: item.currentFlow?.speed || 50,
      freeFlowSpeed: item.currentFlow?.freeFlow || 60,
      congestionLevel: item.currentFlow?.jamFactor > 7 ? 'severe' : 
                       item.currentFlow?.jamFactor > 5 ? 'high' :
                       item.currentFlow?.jamFactor > 3 ? 'moderate' : 'low',
    }));
  }
}

export class TomTomTraffic implements ITraffic {
  private apiKey: string;

  constructor() {
    const apiKey = import.meta.env.VITE_TOMTOM_KEY;
    if (!apiKey) {
      throw new Error('[TomTomTraffic] VITE_TOMTOM_KEY not configured');
    }
    this.apiKey = apiKey;
  }

  getName(): string {
    return 'TomTom Traffic';
  }

  async getFlow(bbox: BBox): Promise<TrafficFlow[]> {
    const apiKey = this.apiKey;

    const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?bbox=${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}&key=${apiKey}`;
    
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`TomTom Traffic API error: ${response.status}`);
    }

    const data = await response.json();
    return this.transformResponse(data);
  }

  private transformResponse(data: any): TrafficFlow[] {
    if (!data.flowSegmentData) {
      return [];
    }

    const item = data.flowSegmentData;
    return [{
      id: 'tomtom-traffic-0',
      coordinates: item.coordinates?.coordinate || [],
      speed: item.currentSpeed || 50,
      freeFlowSpeed: item.freeFlowSpeed || 60,
      congestionLevel: item.currentSpeed / item.freeFlowSpeed > 0.8 ? 'low' :
                       item.currentSpeed / item.freeFlowSpeed > 0.6 ? 'moderate' :
                       item.currentSpeed / item.freeFlowSpeed > 0.4 ? 'high' : 'severe',
    }];
  }
}

export class MockTraffic implements ITraffic {
  getName(): string {
    return 'Mock Traffic';
  }

  async getFlow(bbox: BBox): Promise<TrafficFlow[]> {
    return [
      {
        id: 'mock-1',
        coordinates: [
          [bbox.minLng, bbox.minLat],
          [bbox.maxLng, bbox.maxLat],
        ],
        speed: 45,
        freeFlowSpeed: 60,
        congestionLevel: 'moderate',
      },
    ];
  }
}
