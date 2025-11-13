import { HereTraffic } from '../providers/TrafficProviders';
import { TrafficSourceAdapter } from './TrafficSource';

/**
 * HereTrafficSource - Fallback traffic data source using HERE Traffic API
 */
export class HereTrafficSource extends TrafficSourceAdapter {
  constructor() {
    super(new HereTraffic());
  }
}
