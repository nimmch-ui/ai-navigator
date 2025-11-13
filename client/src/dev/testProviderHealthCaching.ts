import { ProviderRegistry } from '@/services/data/ProviderRegistry';
import { HealthMonitor } from '@/services/data/HealthMonitor';
import { CacheService } from '@/services/data/CacheService';
import { RegionDetector } from '@/services/data/regionDetector';
import type { Region } from '@/services/data/types';

export async function testProviderHealthCaching() {
  console.log('=== Provider Health & Caching Test Suite ===\n');

  const testRegions: Region[] = ['EU', 'US', 'CH', 'IN', 'ME', 'GLOBAL'];

  for (const region of testRegions) {
    console.log(`\n📍 Testing region: ${region}`);
    console.log('-'.repeat(50));

    const providers = ProviderRegistry.for(region);

    console.log('\n1️⃣ Map Tiles Provider:');
    console.log(`   Primary: ${providers.maps.getName()}`);

    console.log('\n2️⃣ Traffic Provider:');
    console.log(`   Primary: ${providers.traffic.getName()}`);

    console.log('\n3️⃣ Radar Provider:');
    console.log(`   Primary: ${providers.radar.getName()}`);
    
    try {
      const cameras = await providers.radar.getSpeedCameras(
        { lat: 51.5074, lon: -0.1278 },
        { lat: 51.5174, lon: -0.1178 }
      );
      console.log(`   ✅ Loaded ${cameras.length} cameras`);
    } catch (error: any) {
      console.log(`   ❌ Failed: ${error.message}`);
    }

    console.log('\n4️⃣ Weather Provider:');
    console.log(`   Primary: ${providers.weather.getName()}`);
    
    try {
      const weather = await providers.weather.getWeatherNow(51.5074, -0.1278);
      console.log(`   ✅ Loaded weather: ${weather.temp}°C, ${weather.condition}`);
    } catch (error: any) {
      console.log(`   ❌ Failed: ${error.message}`);
    }

    console.log('\n5️⃣ Circuit Breaker Status:');
    const mapStatus = HealthMonitor.getCircuitBreakerStatus(providers.maps.getName());
    const trafficStatus = HealthMonitor.getCircuitBreakerStatus(providers.traffic.getName());
    const radarStatus = HealthMonitor.getCircuitBreakerStatus(providers.radar.getName());
    const weatherStatus = HealthMonitor.getCircuitBreakerStatus(providers.weather.getName());

    console.log(`   Maps: ${mapStatus ? (mapStatus.isOpen ? '🔴 OPEN' : '🟢 CLOSED') : '🟢 HEALTHY'}`);
    console.log(`   Traffic: ${trafficStatus ? (trafficStatus.isOpen ? '🔴 OPEN' : '🟢 CLOSED') : '🟢 HEALTHY'}`);
    console.log(`   Radar: ${radarStatus ? (radarStatus.isOpen ? '🔴 OPEN' : '🟢 CLOSED') : '🟢 HEALTHY'}`);
    console.log(`   Weather: ${weatherStatus ? (weatherStatus.isOpen ? '🔴 OPEN' : '🟢 CLOSED') : '🟢 HEALTHY'}`);
  }

  console.log('\n\n6️⃣ Testing Region Detection:');
  console.log('-'.repeat(50));
  const detectedRegion = await RegionDetector.detectRegion();
  console.log(`   Detected Region: ${detectedRegion}`);

  console.log('\n\n7️⃣ Cache Durations:');
  console.log('-'.repeat(50));
  console.log(`   Maps: ${CacheService.getCacheDuration('map') / 1000}s`);
  console.log(`   Traffic: ${CacheService.getCacheDuration('traffic') / 1000}s`);
  console.log(`   Radar: ${CacheService.getCacheDuration('radar') / 1000}s`);
  console.log(`   Weather: ${CacheService.getCacheDuration('weather') / 1000}s`);

  console.log('\n\n=== Test Suite Complete ===\n');
}

if (typeof window !== 'undefined') {
  (window as any).__testProviderHealthCaching = testProviderHealthCaching;
  (window as any).__resetCircuitBreakers = () => {
    HealthMonitor.resetAllCircuitBreakers();
    console.log('✅ All circuit breakers reset');
  };
  (window as any).__clearProviderCache = async () => {
    await CacheService.clearAll();
    console.log('✅ Provider cache cleared');
  };
  
  import('./testProviderFailover');
  
  console.log('[Dev] Provider health & caching test functions registered:');
  console.log('  - window.__testProviderHealthCaching()');
  console.log('  - window.__resetCircuitBreakers()');
  console.log('  - window.__clearProviderCache()');
  console.log('  - window.__testOfflineFailover()');
  console.log('  - window.__testRegionSwitching()');
  console.log('  - window.__testStaleCache()');
}
