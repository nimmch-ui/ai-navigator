import { ProviderRegistry } from './ProviderRegistry';
import { RegionDetector } from './regionDetector';
import type { Region } from './types';

export async function testProviderRegistry() {
  console.log('=== Testing Provider Registry ===\n');

  const regions: Region[] = ['EU', 'CH', 'US', 'IN', 'ME', 'GLOBAL'];

  for (const region of regions) {
    console.log(`\n📍 Testing region: ${region}`);
    const providers = ProviderRegistry.for(region);

    console.log(`  Map Tiles: ${providers.map.map(p => p.getName()).join(', ')}`);
    console.log(`  Traffic: ${providers.traffic.map(p => p.getName()).join(', ')}`);
    console.log(`  Radar: ${providers.radar.map(p => p.getName()).join(', ')}`);
    console.log(`  Weather: ${providers.weather.map(p => p.getName()).join(', ')}`);
  }

  console.log('\n=== Testing Failover Logic ===\n');

  const mockProviders = [
    { getName: () => 'FailProvider', test: async () => { throw new Error('Intentional failure'); } },
    { getName: () => 'SuccessProvider', test: async () => 'Success!' },
  ];

  try {
    const result = await ProviderRegistry.withFailover(
      mockProviders,
      (p) => p.test(),
      'Failover Test'
    );
    console.log(`✅ Failover successful:`, result);
  } catch (error) {
    console.error('❌ Failover failed:', error);
  }

  console.log('\n=== Testing Region Detection ===\n');

  try {
    const detectedRegion = await RegionDetector.detectRegion();
    console.log(`✅ Detected region: ${detectedRegion}`);
  } catch (error) {
    console.warn('⚠️ Geolocation failed, using locale fallback');
    const fallbackRegion = RegionDetector['detectByLocale']();
    console.log(`✅ Fallback region: ${fallbackRegion}`);
  }

  console.log('\n=== Testing Mock Providers ===\n');

  const euProviders = ProviderRegistry.for('EU');

  try {
    const weather = await euProviders.weather[euProviders.weather.length - 1].getNow(47.3769, 8.5417);
    console.log('✅ Mock Weather:', weather);
  } catch (error) {
    console.error('❌ Mock Weather failed:', error);
  }

  try {
    const cameras = await euProviders.radar[euProviders.radar.length - 1].getCameras({
      minLat: 47,
      minLng: 8,
      maxLat: 48,
      maxLng: 9,
    });
    console.log('✅ Mock Radar cameras:', cameras.length, 'cameras found');
  } catch (error) {
    console.error('❌ Mock Radar failed:', error);
  }

  console.log('\n=== All Tests Complete ===\n');
}

if (typeof window !== 'undefined') {
  (window as any).testProviders = testProviderRegistry;
}
