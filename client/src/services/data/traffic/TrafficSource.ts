import type { BBox, TrafficFlow, TrafficIncidentData } from '../types';

/**
 * TrafficSource - Unified abstraction for traffic data providers
 * 
 * This interface combines traffic flow and incident data retrieval,
 * providing a single source for real-time traffic intelligence.
 */
export interface ITrafficSource {
  /**
   * Get live traffic flow data for a bounding box
   * @param bbox - Geographic bounding box
   * @returns Promise resolving to array of traffic flow segments
   */
  getLiveTraffic(bbox: BBox): Promise<TrafficFlow[]>;

  /**
   * Get traffic incidents for a bounding box
   * @param bbox - Geographic bounding box
   * @returns Promise resolving to array of traffic incidents
   */
  getIncidents(bbox: BBox): Promise<TrafficIncidentData[]>;

  /**
   * Get provider name
   * @returns Human-readable provider name
   */
  getName(): string;
}

/**
 * TrafficSourceAdapter - Adapts ITraffic providers to TrafficSource interface
 */
export class TrafficSourceAdapter implements ITrafficSource {
  constructor(private provider: any) {}

  async getLiveTraffic(bbox: BBox): Promise<TrafficFlow[]> {
    return await this.provider.getFlow(bbox);
  }

  async getIncidents(bbox: BBox): Promise<TrafficIncidentData[]> {
    return await this.provider.getIncidents(bbox);
  }

  getName(): string {
    return this.provider.getName();
  }
}
