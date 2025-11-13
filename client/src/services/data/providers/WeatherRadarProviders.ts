import type { IWeatherRadar, RadarTileData, RadarFrame } from '../types';

const RAINVIEWER_API_URL = 'https://api.rainviewer.com/public/weather-maps.json';

export class RainViewerWeatherRadar implements IWeatherRadar {
  getName(): string {
    return 'RainViewer';
  }

  async getRadarData(): Promise<RadarTileData> {
    const response = await fetch(RAINVIEWER_API_URL, {
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`RainViewer API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      version: data.version,
      generated: data.generated,
      host: data.host || 'https://tilecache.rainviewer.com',
      radar: {
        past: data.radar?.past || [],
        nowcast: data.radar?.nowcast || [],
      },
    };
  }
}

export class MockWeatherRadar implements IWeatherRadar {
  getName(): string {
    return 'Mock Weather Radar';
  }

  async getRadarData(): Promise<RadarTileData> {
    const now = Math.floor(Date.now() / 1000);
    const past: RadarFrame[] = [];
    
    for (let i = 6; i >= 0; i--) {
      past.push({
        time: now - (i * 600),
        path: `/v2/coverage/0/mock-${i}`,
      });
    }

    return {
      version: '1.0.0-mock',
      generated: now,
      host: 'https://tilecache.rainviewer.com',
      radar: {
        past,
        nowcast: [],
      },
    };
  }
}
