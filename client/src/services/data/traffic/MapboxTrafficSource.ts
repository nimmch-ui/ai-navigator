import { MapboxTraffic } from '../providers/TrafficProviders';
import { TrafficSourceAdapter } from './TrafficSource';

/**
 * MapboxTrafficSource - Primary traffic data source using Mapbox Traffic API
 */
export class MapboxTrafficSource extends TrafficSourceAdapter {
  constructor() {
    super(new MapboxTraffic());
  }
}
