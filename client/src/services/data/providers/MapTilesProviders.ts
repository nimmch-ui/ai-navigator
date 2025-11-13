import type { IMapTiles } from '../types';

export class MapboxTiles implements IMapTiles {
  private token: string;

  constructor() {
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) {
      throw new Error('[MapboxTiles] VITE_MAPBOX_TOKEN not configured');
    }
    this.token = token;
  }

  getName(): string {
    return 'Mapbox';
  }

  styleUrl(): string {
    return `mapbox://styles/mapbox/streets-v12`;
  }
}

export class MapTilerTiles implements IMapTiles {
  private token: string;

  constructor() {
    const token = import.meta.env.VITE_MAPTILER_TOKEN;
    if (!token) {
      throw new Error('[MapTilerTiles] VITE_MAPTILER_TOKEN not configured');
    }
    this.token = token;
  }

  getName(): string {
    return 'MapTiler';
  }

  styleUrl(): string {
    return `https://api.maptiler.com/maps/streets-v2/style.json?key=${this.token}`;
  }
}

export class MockMapTiles implements IMapTiles {
  getName(): string {
    return 'Mock';
  }

  styleUrl(): string {
    return 'mapbox://styles/mapbox/light-v11';
  }
}
