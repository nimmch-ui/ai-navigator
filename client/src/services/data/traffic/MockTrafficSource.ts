import { MockTraffic } from '../providers/TrafficProviders';
import { TrafficSourceAdapter } from './TrafficSource';

/**
 * MockTrafficSource - Mock traffic data source for offline/development
 */
export class MockTrafficSource extends TrafficSourceAdapter {
  constructor() {
    super(new MockTraffic());
  }
}
