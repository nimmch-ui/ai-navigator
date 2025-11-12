import { TrafficIncident } from '@shared/schema';
import { nanoid } from 'nanoid';

const MOCK_INCIDENTS: TrafficIncident[] = [
  {
    id: 'incident-1',
    type: 'accident',
    severity: 'severe',
    location: [40.7580, -73.9855],
    description: 'Multi-vehicle accident on Broadway',
    delayMinutes: 12,
    affectsRoute: false,
  },
  {
    id: 'incident-2',
    type: 'construction',
    severity: 'moderate',
    location: [40.7489, -73.9680],
    description: 'Road work on 34th Street',
    delayMinutes: 5,
    affectsRoute: false,
  },
  {
    id: 'incident-3',
    type: 'congestion',
    severity: 'low',
    location: [40.7614, -73.9776],
    description: 'Heavy traffic on 5th Avenue',
    delayMinutes: 3,
    affectsRoute: false,
  },
];

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

function isPointNearPath(
  point: [number, number],
  pathCoordinates: [number, number][],
  thresholdMeters: number = 500
): boolean {
  return pathCoordinates.some(
    (coord) => calculateDistance(point, coord) < thresholdMeters
  );
}

export class TrafficService {
  private incidents: TrafficIncident[] = [...MOCK_INCIDENTS];

  async getIncidentsAlongRoute(
    routeCoordinates: [number, number][]
  ): Promise<TrafficIncident[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return this.incidents.map((incident) => ({
      ...incident,
      affectsRoute: isPointNearPath(incident.location, routeCoordinates, 500),
    }));
  }

  async getIncidentById(incidentId: string): Promise<TrafficIncident | null> {
    return this.incidents.find((inc) => inc.id === incidentId) || null;
  }

  addMockIncident(
    location: [number, number],
    type: TrafficIncident['type'] = 'congestion',
    severity: TrafficIncident['severity'] = 'moderate',
    delayMinutes: number = 5
  ): TrafficIncident {
    const incident: TrafficIncident = {
      id: nanoid(),
      type,
      severity,
      location,
      description: `${type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')} detected`,
      delayMinutes,
      affectsRoute: false,
    };
    this.incidents.push(incident);
    return incident;
  }

  clearIncidents(): void {
    this.incidents = [...MOCK_INCIDENTS];
  }
}

export const trafficService = new TrafficService();
