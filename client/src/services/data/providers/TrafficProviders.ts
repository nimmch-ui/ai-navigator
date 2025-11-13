import type { ITraffic, BBox, TrafficFlow, TrafficIncidentData } from '../types';

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

  async getIncidents(bbox: BBox): Promise<TrafficIncidentData[]> {
    const token = this.token;
    
    // Query multiple sample points across the bbox to get better incident coverage
    const samplePoints = this.generateSamplePoints(bbox, 3, 3); // 3x3 grid
    const allIncidents: TrafficIncidentData[] = [];
    const seenIds = new Set<string>();
    
    try {
      // Query each sample point with a radius
      const radius = 5000; // 5km radius per point
      
      for (const point of samplePoints) {
        const url = `https://api.mapbox.com/v4/mapbox.mapbox-traffic-v1/tilequery/${point[1]},${point[0]}.json?radius=${radius}&access_token=${token}&layers=traffic`;
        
        try {
          const response = await fetch(url, {
            signal: AbortSignal.timeout(5000),
          });

          if (!response.ok) {
            continue; // Skip failed points
          }

          const data = await response.json();
          const incidents = this.transformIncidentsResponse(data);
          
          // De-duplicate incidents
          for (const incident of incidents) {
            if (!seenIds.has(incident.id)) {
              seenIds.add(incident.id);
              allIncidents.push(incident);
            }
          }
        } catch (pointError) {
          console.warn('[MapboxTraffic] Sample point query failed:', pointError);
        }
      }
      
      return allIncidents;
    } catch (error) {
      console.warn('[MapboxTraffic] getIncidents failed:', error);
      return [];
    }
  }

  private generateSamplePoints(bbox: BBox, gridX: number, gridY: number): [number, number][] {
    const points: [number, number][] = [];
    const latStep = (bbox.maxLat - bbox.minLat) / (gridY + 1);
    const lngStep = (bbox.maxLng - bbox.minLng) / (gridX + 1);
    
    for (let i = 1; i <= gridY; i++) {
      for (let j = 1; j <= gridX; j++) {
        const lat = bbox.minLat + i * latStep;
        const lng = bbox.minLng + j * lngStep;
        points.push([lat, lng]);
      }
    }
    
    return points;
  }

  private transformIncidentsResponse(data: any): TrafficIncidentData[] {
    if (!data.features || !Array.isArray(data.features)) {
      return [];
    }

    const results: TrafficIncidentData[] = [];

    for (const feature of data.features) {
      const coords = feature.geometry?.coordinates || [0, 0];
      const incidents = feature.properties?.incidents;
      
      if (!incidents || !Array.isArray(incidents)) {
        continue;
      }

      // Process each incident in the array
      for (let i = 0; i < incidents.length; i++) {
        const incident = incidents[i];
        const description = incident.description || 'Traffic incident';
        const type = incident.type || feature.properties?.type;
        const severity = incident.severity || feature.properties?.severity;
        
        // Create stable ID using incident-specific data
        const stableId = incident.id || 
                        feature.id || 
                        this.generateIncidentHash(coords, description, incident.impact || '', i);
        
        results.push({
          id: `mapbox-${stableId}`,
          type: this.mapIncidentType(type),
          severity: this.mapIncidentSeverity(severity),
          location: [coords[1], coords[0]] as [number, number],
          description,
          delayMinutes: incident.delay || feature.properties?.delay || 0,
          affectedRoadName: incident.road_name || feature.properties?.road_name,
        });
      }
    }

    return results;
  }

  private generateIncidentHash(coords: [number, number], description: string, impact: string = '', index: number = 0): string {
    // Collision-resistant hash using full precision coords + description + impact + index
    const str = `${coords[0]},${coords[1]}-${description}-${impact}-${index}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private mapIncidentType(type?: string): TrafficIncidentData['type'] {
    switch (type?.toLowerCase()) {
      case 'accident': return 'accident';
      case 'construction': return 'construction';
      case 'closure': return 'road_closure';
      case 'congestion': return 'congestion';
      default: return 'other';
    }
  }

  private mapIncidentSeverity(severity?: string): TrafficIncidentData['severity'] {
    switch (severity?.toLowerCase()) {
      case 'minor': return 'low';
      case 'moderate': return 'moderate';
      case 'major': return 'severe';
      default: return 'moderate';
    }
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

  async getIncidents(bbox: BBox): Promise<TrafficIncidentData[]> {
    const apiKey = this.apiKey;
    const url = `https://data.traffic.hereapi.com/v7/incidents?bbox=${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng}&apiKey=${apiKey}`;
    
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        console.warn(`HERE Incidents API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return this.transformIncidentsResponse(data);
    } catch (error) {
      console.warn('[HereTraffic] getIncidents failed:', error);
      return [];
    }
  }

  private transformIncidentsResponse(data: any): TrafficIncidentData[] {
    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    return data.results.map((incident: any) => {
      const location = incident.location?.shape?.[0] || [0, 0];
      const description = incident.incidentDetails?.description || 'Traffic incident';
      
      // Use HERE's incident ID or generate stable hash
      const stableId = incident.incidentDetails?.id || 
                      this.generateIncidentHash(location, description);
      
      return {
        id: `here-${stableId}`,
        type: this.mapIncidentType(incident.incidentDetails?.type),
        severity: this.mapIncidentSeverity(incident.incidentDetails?.criticality),
        location: [location[0], location[1]] as [number, number],
        description,
        delayMinutes: Math.round((incident.incidentDetails?.delay || 0) / 60),
        affectedRoadName: incident.incidentDetails?.roadName,
      };
    });
  }

  private generateIncidentHash(coords: [number, number], description: string): string {
    const str = `${coords[0].toFixed(4)},${coords[1].toFixed(4)}-${description}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private mapIncidentType(type?: string): TrafficIncidentData['type'] {
    switch (type?.toLowerCase()) {
      case 'accident': return 'accident';
      case 'construction': return 'construction';
      case 'road_closure': return 'road_closure';
      case 'congestion': return 'congestion';
      case 'weather': return 'weather';
      default: return 'other';
    }
  }

  private mapIncidentSeverity(criticality?: number): TrafficIncidentData['severity'] {
    if (!criticality) return 'moderate';
    if (criticality >= 3) return 'severe';
    if (criticality >= 2) return 'moderate';
    return 'low';
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

  async getIncidents(bbox: BBox): Promise<TrafficIncidentData[]> {
    const apiKey = this.apiKey;
    const url = `https://api.tomtom.com/traffic/services/5/incidentDetails?bbox=${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}&key=${apiKey}&fields={incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitudeOfDelay,events{description,code}}}}`;
    
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        console.warn(`TomTom Incidents API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return this.transformIncidentsResponse(data);
    } catch (error) {
      console.warn('[TomTomTraffic] getIncidents failed:', error);
      return [];
    }
  }

  private transformIncidentsResponse(data: any): TrafficIncidentData[] {
    if (!data.incidents || !Array.isArray(data.incidents)) {
      return [];
    }

    return data.incidents.map((incident: any) => {
      const coords = incident.geometry?.coordinates?.[0] || [0, 0];
      const magnitudeOfDelay = incident.properties?.magnitudeOfDelay || 0;
      const description = incident.properties?.events?.[0]?.description || 'Traffic incident';
      
      // Use TomTom's incident ID or generate stable hash
      const stableId = incident.properties?.id || 
                      this.generateIncidentHash([coords[1], coords[0]], description);
      
      // TomTom magnitudeOfDelay is 0-4 scale, convert to minutes estimate
      const delayMinutes = magnitudeOfDelay * 5; // Rough conversion
      
      return {
        id: `tomtom-${stableId}`,
        type: this.mapIncidentType(incident.properties?.iconCategory),
        severity: this.mapIncidentSeverity(magnitudeOfDelay),
        location: [coords[1], coords[0]] as [number, number],
        description,
        delayMinutes,
      };
    });
  }

  private generateIncidentHash(coords: [number, number], description: string): string {
    const str = `${coords[0].toFixed(4)},${coords[1].toFixed(4)}-${description}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private mapIncidentType(iconCategory?: number): TrafficIncidentData['type'] {
    switch (iconCategory) {
      case 1: return 'accident';
      case 2: return 'road_closure';
      case 3: return 'construction';
      case 11: return 'weather';
      default: return 'other';
    }
  }

  private mapIncidentSeverity(delay?: number): TrafficIncidentData['severity'] {
    if (!delay) return 'low';
    if (delay >= 4) return 'severe';
    if (delay >= 2) return 'moderate';
    return 'low';
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

  async getIncidents(bbox: BBox): Promise<TrafficIncidentData[]> {
    const centerLat = (bbox.minLat + bbox.maxLat) / 2;
    const centerLng = (bbox.minLng + bbox.maxLng) / 2;
    
    return [
      {
        id: 'mock-incident-1',
        type: 'accident',
        severity: 'moderate',
        location: [centerLat, centerLng],
        description: 'Mock traffic accident',
        delayMinutes: 5,
      },
      {
        id: 'mock-incident-2',
        type: 'construction',
        severity: 'low',
        location: [centerLat + 0.01, centerLng + 0.01],
        description: 'Mock road construction',
        delayMinutes: 3,
      },
    ];
  }
}
