import { RerouteOption, RerouteSettings, TrafficIncident } from '@shared/schema';
import { calculateRoute } from './routing';
import type { TransportMode, RoutePreference } from './preferences';

function calculateDistance(
  point1: [number, number],
  point2: [number, number]
): number {
  const [lat1, lon1] = point1;
  const [lat2, lon2] = point2;
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function getClosestPointOnRoute(
  currentPosition: [number, number],
  routeCoordinates: [number, number][]
): { distance: number; index: number } {
  let minDistance = Infinity;
  let closestIndex = 0;

  routeCoordinates.forEach((coord, index) => {
    const distance = calculateDistance(currentPosition, coord);
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
    }
  });

  return { distance: minDistance, index: closestIndex };
}

export class ReroutingService {
  private settings: RerouteSettings = {
    enabled: true,
    etaIncreaseThresholdPercent: 15,
    offRouteDistanceMeters: 100,
    autoAccept: false,
    minTimeSavingsMinutes: 2,
  };

  private initialETA: number | null = null;
  private currentETA: number | null = null;

  setSettings(settings: Partial<RerouteSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  getSettings(): RerouteSettings {
    return { ...this.settings };
  }

  setInitialETA(eta: number): void {
    this.initialETA = eta;
    this.currentETA = eta;
  }

  updateCurrentETA(eta: number): void {
    this.currentETA = eta;
  }

  isOffRoute(
    currentPosition: [number, number],
    routeCoordinates: [number, number][]
  ): boolean {
    if (!this.settings.enabled) return false;

    const { distance } = getClosestPointOnRoute(currentPosition, routeCoordinates);
    return distance > this.settings.offRouteDistanceMeters;
  }

  hasETAIncreased(): boolean {
    if (!this.settings.enabled || !this.initialETA || !this.currentETA) {
      return false;
    }

    const percentageIncrease =
      ((this.currentETA - this.initialETA) / this.initialETA) * 100;
    return percentageIncrease > this.settings.etaIncreaseThresholdPercent;
  }

  async calculateAlternativeRoute(
    origin: [number, number],
    destination: [number, number],
    mode: TransportMode,
    preference: RoutePreference,
    reason: RerouteOption['reason'],
    incidentId?: string
  ): Promise<RerouteOption | null> {
    try {
      const alternativeRoute = await calculateRoute(
        origin,
        destination,
        mode,
        preference
      );

      if (!alternativeRoute || !this.initialETA) {
        return null;
      }

      const timeSavingsSeconds = this.currentETA! - alternativeRoute.duration;
      const timeSavingsMinutes = Math.round(timeSavingsSeconds / 60);

      if (timeSavingsMinutes < this.settings.minTimeSavingsMinutes) {
        return null;
      }

      return {
        timeSavingsMinutes,
        newRoute: {
          distance: alternativeRoute.distance,
          duration: alternativeRoute.duration,
          coordinates: alternativeRoute.geometry,
        },
        reason,
        incidentId,
      };
    } catch (error) {
      console.error('Failed to calculate alternative route:', error);
      return null;
    }
  }

  async evaluateTrafficIncidents(
    currentPosition: [number, number],
    destination: [number, number],
    mode: TransportMode,
    preference: RoutePreference,
    incidents: TrafficIncident[]
  ): Promise<RerouteOption | null> {
    const affectedIncidents = incidents.filter(
      (inc) => inc.affectsRoute && inc.severity !== 'low'
    );

    if (affectedIncidents.length === 0) {
      return null;
    }

    const mostSevereIncident = affectedIncidents.reduce((prev, current) => {
      const severityOrder = { low: 1, moderate: 2, severe: 3 };
      return severityOrder[current.severity] > severityOrder[prev.severity]
        ? current
        : prev;
    });

    if (this.currentETA) {
      this.currentETA += mostSevereIncident.delayMinutes * 60;
    }

    return this.calculateAlternativeRoute(
      currentPosition,
      destination,
      mode,
      preference,
      'traffic_incident',
      mostSevereIncident.id
    );
  }

  reset(): void {
    this.initialETA = null;
    this.currentETA = null;
  }
}

export const reroutingService = new ReroutingService();
