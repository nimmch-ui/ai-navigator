import type { IMapTiles } from '../types';

export class MapboxTiles implements IMapTiles {
  getName(): string {
    return 'Mapbox';
  }

  styleUrl(): string {
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) {
      throw new Error('[MapboxTiles] VITE_MAPBOX_TOKEN not found');
    }
    return `mapbox://styles/mapbox/streets-v12`;
  }
}

export class MapTilerTiles implements IMapTiles {
  getName(): string {
    return 'MapTiler';
  }

  styleUrl(): string {
    const token = import.meta.env.VITE_MAPTILER_TOKEN;
    if (!token) {
      throw new Error('[MapTilerTiles] VITE_MAPTILER_TOKEN not found');
    }
    return `https://api.maptiler.com/maps/streets-v2/style.json?key=${token}`;
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
