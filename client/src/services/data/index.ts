export * from './types';
export * from './ProviderRegistry';
export * from './regionDetector';
export * from './providers/MapTilesProviders';
export * from './providers/TrafficProviders';
export * from './providers/RadarProviders';
export * from './providers/WeatherProviders';

if (import.meta.env.DEV) {
  import('./testProviders').then((module) => {
    if (typeof window !== 'undefined') {
      (window as any).__testProviders = module.testProviderRegistry;
      console.log('[Data Providers] Test function exposed as window.__testProviders()');
    }
  });
}
