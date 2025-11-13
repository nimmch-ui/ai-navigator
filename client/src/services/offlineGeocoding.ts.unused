import { PreferencesService } from './preferences';

const preferencesService = new PreferencesService();

export interface OfflineGeocodingResult {
  name: string;
  coordinates: [number, number];
  type: 'favorite' | 'history';
  confidence: number;
}

class OfflineGeocodingService {
  searchOffline(query: string): OfflineGeocodingResult[] {
    if (!query || query.length < 2) {
      return [];
    }

    const results: OfflineGeocodingResult[] = [];
    const normalizedQuery = query.toLowerCase();

    const favorites = preferencesService.getFavorites();
    for (const fav of favorites) {
      if (fav.name.toLowerCase().includes(normalizedQuery)) {
        results.push({
          name: fav.name,
          coordinates: fav.coordinates,
          type: 'favorite',
          confidence: this.calculateConfidence(fav.name, query),
        });
      }
    }

    const history = preferencesService.getTripHistory();
    for (const trip of history.slice(0, 20)) {
      if (trip.origin && trip.origin.toLowerCase().includes(normalizedQuery)) {
        if (!results.some(r => r.name === trip.origin)) {
          results.push({
            name: trip.origin,
            coordinates: trip.originCoords,
            type: 'history',
            confidence: this.calculateConfidence(trip.origin, query) * 0.9,
          });
        }
      }

      if (trip.destination && trip.destination.toLowerCase().includes(normalizedQuery)) {
        if (!results.some(r => r.name === trip.destination)) {
          results.push({
            name: trip.destination,
            coordinates: trip.destinationCoords,
            type: 'history',
            confidence: this.calculateConfidence(trip.destination, query) * 0.9,
          });
        }
      }
    }

    results.sort((a, b) => b.confidence - a.confidence);

    return results.slice(0, 5);
  }

  private calculateConfidence(text: string, query: string): number {
    const normalizedText = text.toLowerCase();
    const normalizedQuery = query.toLowerCase();

    if (normalizedText === normalizedQuery) {
      return 1.0;
    }

    if (normalizedText.startsWith(normalizedQuery)) {
      return 0.9;
    }

    if (normalizedText.includes(normalizedQuery)) {
      const position = normalizedText.indexOf(normalizedQuery);
      return 0.8 - (position / normalizedText.length) * 0.2;
    }

    return 0.5;
  }

  getRecentSearches(limit: number = 5): OfflineGeocodingResult[] {
    const history = preferencesService.getTripHistory();
    const seen = new Set<string>();
    const results: OfflineGeocodingResult[] = [];

    for (const trip of history) {
      if (trip.origin && !seen.has(trip.origin)) {
        seen.add(trip.origin);
        results.push({
          name: trip.origin,
          coordinates: trip.originCoords,
          type: 'history',
          confidence: 0.8,
        });
      }

      if (trip.destination && !seen.has(trip.destination)) {
        seen.add(trip.destination);
        results.push({
          name: trip.destination,
          coordinates: trip.destinationCoords,
          type: 'history',
          confidence: 0.8,
        });
      }

      if (results.length >= limit) {
        break;
      }
    }

    return results;
  }
}

export const offlineGeocodingService = new OfflineGeocodingService();
