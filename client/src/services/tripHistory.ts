import type { TransportMode, RoutePreference } from './preferences';

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
  static getTripHistory(): TripRecord[] {
    try {
      const stored = localStorage.getItem(TRIP_HISTORY_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to load trip history:", error);
    }
    return [];
  }

  static addTrip(trip: Omit<TripRecord, 'id' | 'timestamp' | 'hourOfDay'>): void {
    try {
      const history = this.getTripHistory();
      const now = Date.now();
      const hourOfDay = new Date(now).getHours();
      
      const newTrip: TripRecord = {
        ...trip,
        id: `trip_${now}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: now,
        hourOfDay
      };

      history.unshift(newTrip);
      
      if (history.length > MAX_HISTORY_SIZE) {
        history.splice(MAX_HISTORY_SIZE);
      }

      localStorage.setItem(TRIP_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error("Failed to save trip:", error);
    }
  }

  static getSmartDefaults(): {
    transportMode: TransportMode;
    routePreference: RoutePreference;
  } | null {
    const history = this.getTripHistory();
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

  static clearHistory(): void {
    try {
      localStorage.removeItem(TRIP_HISTORY_KEY);
    } catch (error) {
      console.error("Failed to clear trip history:", error);
    }
  }

  static getRecentTrips(limit: number = 10): TripRecord[] {
    const history = this.getTripHistory();
    return history.slice(0, limit);
  }
}
