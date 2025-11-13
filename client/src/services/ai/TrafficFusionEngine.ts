import type { BBox, TrafficFlow, TrafficIncidentData, WeatherNow } from '../data/types';
import type { ITrafficSource } from '../data/traffic';
import { EventBus } from '../eventBus';
import { ProviderRegistry } from '../data/ProviderRegistry';
import { RegionDetector } from '../data/regionDetector';

/**
 * Traffic segment with enriched intelligence data
 */
export interface TrafficSegment {
  segmentId: string;
  coordinates: [number, number][];
  congestion: number; // 0-100
  predictedCongestion: number; // 0-100, predicted in 15-30 min
  speed: number; // km/h
  freeFlowSpeed: number; // km/h
  incidents: TrafficIncidentData[];
  riskTags: TrafficRiskTag[];
  lastUpdated: number;
}

/**
 * Risk tags for traffic incidents
 */
export type TrafficRiskTag =
  | 'accident'
  | 'construction'
  | 'closure'
  | 'heavy_rain'
  | 'snow'
  | 'fog'
  | 'rush_hour'
  | 'event_traffic'
  | 'high_congestion';

/**
 * Traffic update event payload
 */
export interface TrafficUpdateEvent {
  segmentId: string;
  congestion: number;
  predictedCongestion: number;
  incidents: TrafficIncidentData[];
  riskTags: TrafficRiskTag[];
  timestamp: number;
}

/**
 * Historical traffic pattern (simple time-of-day based)
 */
interface HistoricalPattern {
  hour: number;
  dayOfWeek: number;
  typicalCongestion: number; // 0-100
  variance: number; // Typical deviation
}

/**
 * TrafficFusionEngine - AI-powered real-time traffic intelligence
 * 
 * Combines multiple data sources to provide comprehensive traffic insights:
 * - Live traffic flow data
 * - Real-time incidents
 * - Weather conditions
 * - Hazard feeds
 * - Historical patterns
 * 
 * Outputs enriched traffic segments with congestion levels, predictions,
 * and risk assessments.
 */
export class TrafficFusionEngine {
  private segments: Map<string, TrafficSegment> = new Map();
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private readonly UPDATE_INTERVAL_MS = 60000; // 1 minute
  private readonly PREDICTION_WINDOW_MS = 1800000; // 30 minutes
  private trafficSource: ITrafficSource | null = null;
  private currentBBox: BBox | null = null;
  private isUpdating: boolean = false; // Prevent overlapping updates

  /**
   * Initialize the fusion engine
   */
  async initialize(): Promise<void> {
    console.log('[TrafficFusionEngine] Initializing...');
    
    try {
      const region = await RegionDetector.detectRegion();
      const providerSet = ProviderRegistry.for(region);
      
      // Use ProviderRegistry's traffic providers
      if (providerSet.traffic && providerSet.traffic.length > 0) {
        const { TrafficSourceAdapter } = await import('../data/traffic');
        this.trafficSource = new TrafficSourceAdapter(providerSet.traffic[0]);
        console.log('[TrafficFusionEngine] Using traffic source:', this.trafficSource.getName());
      }
    } catch (error) {
      console.warn('[TrafficFusionEngine] Failed to initialize traffic source:', error);
    }

    console.log('[TrafficFusionEngine] Initialized successfully');
  }

  /**
   * Start continuous traffic monitoring for a bounding box
   */
  async startMonitoring(bbox: BBox): Promise<void> {
    this.currentBBox = bbox;
    
    // Initial update
    await this.updateTrafficData();
    
    // Set up periodic updates (environment-safe)
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(() => {
      this.updateTrafficData();
    }, this.UPDATE_INTERVAL_MS);
    
    console.log('[TrafficFusionEngine] Started monitoring bbox:', bbox);
  }

  /**
   * Stop traffic monitoring
   */
  stopMonitoring(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isUpdating = false;
    console.log('[TrafficFusionEngine] Stopped monitoring');
  }

  /**
   * Get traffic data for a specific segment
   */
  getSegmentTraffic(segmentId: string): TrafficSegment | null {
    return this.segments.get(segmentId) || null;
  }

  /**
   * Get all incidents within a radius of a point
   */
  getUpcomingIncidents(
    center: [number, number],
    radiusMeters: number
  ): TrafficIncidentData[] {
    const incidents: TrafficIncidentData[] = [];
    
    for (const segment of Array.from(this.segments.values())) {
      for (const incident of segment.incidents) {
        const distance = this.calculateDistance(center, incident.location);
        if (distance <= radiusMeters) {
          incidents.push(incident);
        }
      }
    }
    
    return incidents.sort((a, b) => {
      const distA = this.calculateDistance(center, a.location);
      const distB = this.calculateDistance(center, b.location);
      return distA - distB;
    });
  }

  /**
   * Get all segments
   */
  getAllSegments(): TrafficSegment[] {
    return Array.from(this.segments.values());
  }

  /**
   * Main traffic data update loop (with overlap prevention)
   */
  private async updateTrafficData(): Promise<void> {
    if (!this.currentBBox || !this.trafficSource) {
      return;
    }

    // Prevent overlapping updates
    if (this.isUpdating) {
      console.log('[TrafficFusionEngine] Update already in progress, skipping');
      return;
    }

    this.isUpdating = true;

    try {
      console.log('[TrafficFusionEngine] Updating traffic data...');
      
      // Fetch live traffic and incidents in parallel
      const [flowData, incidentData] = await Promise.all([
        this.trafficSource.getLiveTraffic(this.currentBBox),
        this.trafficSource.getIncidents(this.currentBBox),
      ]);
      
      console.log('[TrafficFusionEngine] Fetched', flowData.length, 'flow segments,', incidentData.length, 'incidents');
      
      // Fetch weather for the center of bbox
      const weather = await this.fetchWeatherData(this.currentBBox);
      
      // Process and fuse data
      await this.fuseTrafficData(flowData, incidentData, weather);
      
      console.log('[TrafficFusionEngine] Update complete. Segments:', this.segments.size);
    } catch (error) {
      console.error('[TrafficFusionEngine] Update failed:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Fuse multiple data sources into enriched traffic segments
   */
  private async fuseTrafficData(
    flowData: TrafficFlow[],
    incidentData: TrafficIncidentData[],
    weather: WeatherNow | null
  ): Promise<void> {
    const now = Date.now();
    
    // Process each traffic flow segment
    for (const flow of flowData) {
      const segmentId = flow.segmentId || flow.id;
      
      // Calculate base congestion from speed ratio
      const baseCongestion = this.calculateCongestion(flow.speed, flow.freeFlowSpeed);
      
      // Get historical pattern for this time
      const historicalPattern = this.getHistoricalPattern(now);
      
      // Apply weather impact
      const weatherImpact = this.calculateWeatherImpact(weather);
      
      // Calculate final congestion with all factors
      const congestion = Math.min(100, Math.max(0,
        baseCongestion + weatherImpact
      ));
      
      // Predict future congestion
      const predictedCongestion = this.predictCongestion(
        congestion,
        historicalPattern,
        flow,
        weather
      );
      
      // Find incidents affecting this segment
      const segmentIncidents = this.findSegmentIncidents(
        flow.coordinates,
        incidentData
      );
      
      // Determine risk tags
      const riskTags = this.determineRiskTags(
        congestion,
        segmentIncidents,
        weather,
        historicalPattern
      );
      
      // Create/update segment
      const segment: TrafficSegment = {
        segmentId,
        coordinates: flow.coordinates,
        congestion,
        predictedCongestion,
        speed: flow.speed,
        freeFlowSpeed: flow.freeFlowSpeed,
        incidents: segmentIncidents,
        riskTags,
        lastUpdated: now,
      };
      
      this.segments.set(segmentId, segment);
      
      // Emit update event (using custom event pattern)
      EventBus.emit('ai:trafficUpdate' as any, {
        segmentId,
        congestion,
        predictedCongestion,
        incidents: segmentIncidents,
        riskTags,
        timestamp: now,
      } as TrafficUpdateEvent);
    }
  }

  /**
   * Calculate congestion level from speed ratio (0-100)
   */
  private calculateCongestion(speed: number, freeFlowSpeed: number): number {
    const ratio = speed / freeFlowSpeed;
    // Inverse ratio: slower = higher congestion
    return Math.round((1 - ratio) * 100);
  }

  /**
   * Predict congestion 15-30 minutes ahead
   */
  private predictCongestion(
    currentCongestion: number,
    historicalPattern: HistoricalPattern,
    flow: TrafficFlow,
    weather: WeatherNow | null
  ): number {
    // Simple prediction model based on historical patterns and current trend
    const nextHourPattern = this.getHistoricalPattern(Date.now() + this.PREDICTION_WINDOW_MS);
    
    // Calculate trend from historical data
    const historicalDelta = nextHourPattern.typicalCongestion - historicalPattern.typicalCongestion;
    
    // Weather deterioration factor
    const weatherFactor = weather?.condition === 'rain' || weather?.condition === 'snow' ? 1.15 : 1.0;
    
    // Apply trend with some damping
    let predicted = currentCongestion + (historicalDelta * 0.5);
    predicted *= weatherFactor;
    
    // Clamp to 0-100
    return Math.min(100, Math.max(0, Math.round(predicted)));
  }

  /**
   * Get historical traffic pattern for a timestamp (mock implementation)
   */
  private getHistoricalPattern(timestamp: number): HistoricalPattern {
    const date = new Date(timestamp);
    const hour = date.getHours();
    const dayOfWeek = date.getDay(); // 0-6
    
    // Simple mock pattern: rush hours have higher congestion
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isMorningRush = hour >= 7 && hour <= 9;
    const isEveningRush = hour >= 16 && hour <= 19;
    
    let typicalCongestion = 20; // Base congestion
    
    if (isWeekday) {
      if (isMorningRush || isEveningRush) {
        typicalCongestion = 60;
      } else if (hour >= 10 && hour <= 15) {
        typicalCongestion = 35;
      }
    } else {
      // Weekend patterns
      if (hour >= 11 && hour <= 14) {
        typicalCongestion = 40; // Lunch/shopping
      }
    }
    
    return {
      hour,
      dayOfWeek,
      typicalCongestion,
      variance: 15,
    };
  }

  /**
   * Calculate weather impact on congestion (+0 to +30 points)
   */
  private calculateWeatherImpact(weather: WeatherNow | null): number {
    if (!weather) return 0;
    
    let impact = 0;
    
    switch (weather.condition) {
      case 'rain':
        impact += 10;
        break;
      case 'snow':
        impact += 20;
        break;
      case 'fog':
        impact += 15;
        break;
      case 'storm':
        impact += 25;
        break;
    }
    
    // High wind impact
    if (weather.windSpeed > 50) {
      impact += 10;
    }
    
    // Low visibility impact
    if (weather.visibility < 1000) {
      impact += 15;
    }
    
    return Math.min(30, impact);
  }

  /**
   * Find incidents affecting a segment
   */
  private findSegmentIncidents(
    segmentCoords: [number, number][],
    allIncidents: TrafficIncidentData[]
  ): TrafficIncidentData[] {
    const THRESHOLD_METERS = 500;
    
    return allIncidents.filter(incident => {
      return segmentCoords.some(coord => {
        const distance = this.calculateDistance(coord, incident.location);
        return distance <= THRESHOLD_METERS;
      });
    });
  }

  /**
   * Determine risk tags for a segment
   */
  private determineRiskTags(
    congestion: number,
    incidents: TrafficIncidentData[],
    weather: WeatherNow | null,
    pattern: HistoricalPattern
  ): TrafficRiskTag[] {
    const tags: TrafficRiskTag[] = [];
    
    // High congestion
    if (congestion >= 70) {
      tags.push('high_congestion');
    }
    
    // Incident-based tags
    for (const incident of incidents) {
      if (incident.type === 'accident' && !tags.includes('accident')) {
        tags.push('accident');
      }
      if (incident.type === 'construction' && !tags.includes('construction')) {
        tags.push('construction');
      }
      if (incident.type === 'road_closure' && !tags.includes('closure')) {
        tags.push('closure');
      }
    }
    
    // Weather-based tags
    if (weather) {
      if (weather.condition === 'rain' && !tags.includes('heavy_rain')) {
        tags.push('heavy_rain');
      }
      if (weather.condition === 'snow' && !tags.includes('snow')) {
        tags.push('snow');
      }
      if (weather.condition === 'fog' && !tags.includes('fog')) {
        tags.push('fog');
      }
    }
    
    // Rush hour detection
    const isRushHour = (pattern.hour >= 7 && pattern.hour <= 9) ||
                       (pattern.hour >= 16 && pattern.hour <= 19);
    if (isRushHour && pattern.dayOfWeek >= 1 && pattern.dayOfWeek <= 5) {
      tags.push('rush_hour');
    }
    
    return tags;
  }

  /**
   * Fetch weather data for center of bbox
   */
  private async fetchWeatherData(bbox: BBox): Promise<WeatherNow | null> {
    try {
      const centerLat = (bbox.minLat + bbox.maxLat) / 2;
      const centerLng = (bbox.minLng + bbox.maxLng) / 2;
      
      const region = await RegionDetector.detectRegion();
      const providerSet = ProviderRegistry.for(region);
      
      if (providerSet.weather && providerSet.weather.length > 0) {
        const result = await ProviderRegistry.withFailover(
          providerSet.weather,
          (provider) => provider.getNow(centerLat, centerLng),
          'Weather',
          `weather_${centerLat}_${centerLng}`,
          'weather'
        );
        return result.data as WeatherNow;
      }
    } catch (error) {
      console.warn('[TrafficFusionEngine] Weather fetch failed:', error);
    }
    
    return null;
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  private calculateDistance(
    point1: [number, number],
    point2: [number, number]
  ): number {
    const [lat1, lon1] = point1;
    const [lat2, lon2] = point2;
    const R = 6371e3; // Earth radius in meters
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
}

// Singleton instance
export const trafficFusionEngine = new TrafficFusionEngine();
