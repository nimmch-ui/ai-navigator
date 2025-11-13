import type { TransportMode, RoutePreference } from './preferences';
import { userDataStore } from './data/UserDataStore';

export interface TripRecord {
  id: string;
  origin: string;
  destination: string;
  transportMode: TransportMode;
  routePreference: RoutePreference;
  timestamp: number;
  hourOfDay: number;
  distance: number;
  duration: number;
}

const TRIP_HISTORY_KEY = "ai_navigator_trip_history";
const MAX_HISTORY_SIZE = 50;

export class TripHistoryService {
  static async getTripHistory(): Promise<TripRecord[]> {
    try {
      await userDataStore.initialize();
      const result = await userDataStore.listTrips();
      if (!result.success) {
        console.error('[TripHistory] Failed to load trips:', result.error);
        return [];
      }

      return result.data.map(trip => ({
        id: trip.id,
        origin: trip.start.address || `${trip.start.lat},${trip.start.lng}`,
        destination: trip.end.address || `${trip.end.lat},${trip.end.lng}`,
        transportMode: trip.modeUsed as TransportMode,
        routePreference: (trip.routePreference || 'fastest') as RoutePreference,
        timestamp: trip.timestamp,
        hourOfDay: new Date(trip.timestamp).getHours(),
        distance: trip.distanceKm,
        duration: trip.durationSec / 60,
      }));
    } catch (error) {
      console.error("Failed to load trip history:", error);
      return [];
    }
  }

  static async addTrip(
    trip: Omit<TripRecord, 'id' | 'timestamp' | 'hourOfDay'>,
    originCoords?: { lat: number; lng: number },
    destinationCoords?: { lat: number; lng: number }
  ): Promise<void> {
    try {
      await userDataStore.initialize();

      const start = originCoords || { lat: 0, lng: 0 };
      const end = destinationCoords || { lat: 0, lng: 0 };

      const avgSpeedKmh = trip.duration > 0 ? trip.distance / (trip.duration / 60) : 0;

      const result = await userDataStore.addTrip(
        { ...start, address: trip.origin },
        { ...end, address: trip.destination },
        trip.distance,
        trip.duration * 60,
        trip.transportMode as any,
        avgSpeedKmh,
        undefined,
        trip.routePreference
      );

      if (!result.success) {
        console.error('[TripHistory] Failed to save trip:', result.error);
      }
    } catch (error) {
      console.error("Failed to save trip:", error);
    }
  }

  static async getSmartDefaults(): Promise<{
    transportMode: TransportMode;
    routePreference: RoutePreference;
  } | null> {
    const history = await this.getTripHistory();
    if (history.length === 0) {
      return null;
    }

    const currentHour = new Date().getHours();
    const hourWindow = 2;
    
    const recentTrips = history.slice(0, 20);
    
    const similarTimeTrips = recentTrips.filter(trip => {
      const hourDiff = Math.abs(trip.hourOfDay - currentHour);
      const wrappedDiff = Math.min(hourDiff, 24 - hourDiff);
      return wrappedDiff <= hourWindow;
    });

    const relevantTrips = similarTimeTrips.length >= 3 
      ? similarTimeTrips 
      : recentTrips;

    const modeCount: Record<string, number> = {};
    const prefCount: Record<string, number> = {};

    relevantTrips.forEach(trip => {
      modeCount[trip.transportMode] = (modeCount[trip.transportMode] || 0) + 1;
      prefCount[trip.routePreference] = (prefCount[trip.routePreference] || 0) + 1;
    });

    const mostCommonMode = Object.entries(modeCount).sort(
      ([, a], [, b]) => b - a
    )[0]?.[0] as TransportMode;

    const mostCommonPref = Object.entries(prefCount).sort(
      ([, a], [, b]) => b - a
    )[0]?.[0] as RoutePreference;

    if (mostCommonMode && mostCommonPref) {
      return {
        transportMode: mostCommonMode,
        routePreference: mostCommonPref
      };
    }

    return null;
  }

  static async clearHistory(): Promise<void> {
    try {
      await userDataStore.initialize();
      const result = await userDataStore.clearTripHistory();
      if (!result.success) {
        console.error("Failed to clear trip history:", result.error);
      }
    } catch (error) {
      console.error("Failed to clear trip history:", error);
    }
  }

  static async getRecentTrips(limit: number = 10): Promise<TripRecord[]> {
    const history = await this.getTripHistory();
    return history.slice(0, limit);
  }
}
