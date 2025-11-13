import { RegionDetector } from './regionDetector';
import { CacheService } from './CacheService';

console.log('[AI Navigator] Initializing regional data provider layer...');

RegionDetector.detectRegion().then(region => {
  console.log(`[AI Navigator] Detected region: ${region}`);
}).catch(error => {
  console.error('[AI Navigator] Failed to detect region:', error);
});

CacheService.purgeOldEntries().catch(error => {
  console.error('[AI Navigator] Failed to purge old cache entries:', error);
});

setInterval(() => {
  CacheService.purgeOldEntries().catch(error => {
    console.error('[AI Navigator] Failed to purge old cache entries:', error);
  });
}, 60 * 60 * 1000);
