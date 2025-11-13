import { ProviderRegistry } from '@/services/data/ProviderRegistry';
import { RegionDetector } from '@/services/data/regionDetector';
import { CacheService } from '@/services/data/CacheService';
import { HealthMonitor } from '@/services/data/HealthMonitor';
import type { Region } from '@/services/data/types';

export async function testOfflineFailover() {
  console.log('=== Offline/Slow 3G Failover Test ===\n');

  const region = await RegionDetector.detectRegion();
  console.log(`📍 Testing in region: ${region}\n`);

  console.log('💡 To simulate offline/slow 3G:');
  console.log('1. Open DevTools → Network tab');
  console.log('2. Set throttling to "Slow 3G" or "Offline"');
  console.log('3. Refresh and run this test again\n');

  const tests = [
    {
      name: 'Weather Provider Failover',
      test: async () => {
        const providers = ProviderRegistry.for(region);
        const result = await ProviderRegistry.withFailover(
          providers.weather,
          (provider) => provider.getWeatherNow(51.5074, -0.1278),
          'Weather Test',
          'test_weather_london',
          'weather'
        );
        return { provider: result.provider, attempts: result.attempts, fallbackUsed: result.fallbackUsed };
      },
    },
    {
      name: 'Speed Camera Failover',
      test: async () => {
        const providers = ProviderRegistry.for(region);
        const result = await ProviderRegistry.withFailover(
          providers.radar,
          (provider) => provider.getSpeedCameras(
            { lat: 51.5, lon: -0.2 },
            { lat: 51.6, lon: -0.1 }
          ),
          'Radar Test',
          'test_cameras_london',
          'radar'
        );
        return { provider: result.provider, attempts: result.attempts, fallbackUsed: result.fallbackUsed, count: result.data.length };
      },
    },
    {
      name: 'Traffic Flow Failover',
      test: async () => {
        const providers = ProviderRegistry.for(region);
        const result = await ProviderRegistry.withFailover(
          providers.traffic,
          (provider) => provider.getTrafficFlow(
            { lat: 51.5, lon: -0.2 },
            { lat: 51.6, lon: -0.1 }
          ),
          'Traffic Test',
          'test_traffic_london',
          'traffic'
        );
        return { provider: result.provider, attempts: result.attempts, fallbackUsed: result.fallbackUsed, count: result.data.length };
      },
    },
  ];

  for (const { name, test } of tests) {
    console.log(`\n🧪 ${name}`);
    console.log('-'.repeat(50));
    try {
      const startTime = Date.now();
      const result = await test();
      const duration = Date.now() - startTime;

      console.log(`✅ Success`);
      console.log(`   Provider: ${result.provider}`);
      console.log(`   Attempts: ${result.attempts}`);
      console.log(`   Fallback: ${result.fallbackUsed ? 'YES' : 'NO'}`);
      console.log(`   Duration: ${duration}ms`);
      if ('count' in result) {
        console.log(`   Items: ${result.count}`);
      }
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`);
    }
  }

  console.log('\n\n=== Cache Status ===');
  console.log(`Weather cache TTL: ${CacheService.getCacheDuration('weather') / 1000}s`);
  console.log(`Traffic cache TTL: ${CacheService.getCacheDuration('traffic') / 1000}s`);
  console.log(`Radar cache TTL: ${CacheService.getCacheDuration('radar') / 1000}s`);

  console.log('\n\n=== Circuit Breaker Status ===');
  const providerSet = ProviderRegistry.for(region);
  
  for (const provider of providerSet.weather) {
    const status = HealthMonitor.getCircuitBreakerStatus(provider.getName());
    if (status) {
      console.log(`${provider.getName()}: ${status.isOpen ? '🔴 OPEN' : '🟢 CLOSED'} (failures: ${status.failures})`);
    }
  }

  console.log('\n\n=== Test Complete ===');
}

export async function testRegionSwitching() {
  console.log('=== Region Switching Test ===\n');

  const regions: Region[] = ['EU', 'CH', 'US', 'IN', 'ME', 'GLOBAL'];

  for (const region of regions) {
    console.log(`\n🌍 Testing region: ${region}`);
    console.log('-'.repeat(50));

    const providers = ProviderRegistry.for(region);

    console.log(`Map Providers: ${providers.map.length}`);
    providers.map.forEach((p, i) => console.log(`  ${i + 1}. ${p.getName()}`));

    console.log(`Traffic Providers: ${providers.traffic.length}`);
    providers.traffic.forEach((p, i) => console.log(`  ${i + 1}. ${p.getName()}`));

    console.log(`Radar Providers: ${providers.radar.length}`);
    providers.radar.forEach((p, i) => console.log(`  ${i + 1}. ${p.getName()}`));

    console.log(`Weather Providers: ${providers.weather.length}`);
    providers.weather.forEach((p, i) => console.log(`  ${i + 1}. ${p.getName()}`));
  }

  console.log('\n\n=== Region Test Complete ===');
}

export async function testStaleCache() {
  console.log('=== Stale Cache Fallback Test ===\n');

  console.log('This test requires all providers to fail.');
  console.log('1. Set Network to "Offline" in DevTools');
  console.log('2. Run weather/radar tests to populate cache');
  console.log('3. Wait for cache to expire (or manually set old timestamp)');
  console.log('4. Run test again - should use stale cache\n');

  console.log('💡 To manually test stale cache:');
  console.log('1. Populate cache by fetching weather/radar data');
  console.log('2. Go offline in DevTools');
  console.log('3. Wait 5+ minutes (weather cache TTL)');
  console.log('4. Try fetching weather again - should use stale cache');

  console.log('\n=== Test Instructions Displayed ===');
}

if (typeof window !== 'undefined') {
  (window as any).__testOfflineFailover = testOfflineFailover;
  (window as any).__testRegionSwitching = testRegionSwitching;
  (window as any).__testStaleCache = testStaleCache;

  console.log('[Dev] Provider failover test functions registered:');
  console.log('  - window.__testOfflineFailover()');
  console.log('  - window.__testRegionSwitching()');
  console.log('  - window.__testStaleCache()');
}
