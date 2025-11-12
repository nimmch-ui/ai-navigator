import mapboxgl from 'mapbox-gl';
import type { WeatherCondition, WeatherData } from '@/services/weather';
import type { MapTheme } from '@/services/preferences';

/**
 * Weather Lighting Configuration
 * Adjusts map appearance based on weather conditions and time of day
 */

export interface WeatherLightingConfig {
  enabled: boolean;
  contrast: number;
  saturation: number;
  roadGloss: number;
  labelHaloSoftness: number;
  routeHighlightIntensity: number;
}

const DEFAULT_CONFIG: WeatherLightingConfig = {
  enabled: true,
  contrast: 1.0,
  saturation: 1.0,
  roadGloss: 0.0,
  labelHaloSoftness: 1.0,
  routeHighlightIntensity: 1.0,
};

/**
 * Calculate lighting config based on weather condition
 */
function getWeatherLightingConfig(
  weather: WeatherData | undefined,
  theme: MapTheme,
  isDarkMode: boolean
): WeatherLightingConfig {
  const config = { ...DEFAULT_CONFIG };
  
  if (!weather) return config;

  // Determine if it's night time
  const isNight = theme === 'night' || (theme === 'auto' && isDarkMode);

  // Base adjustments by weather condition
  switch (weather.condition) {
    case 'clear':
      // Default - no adjustments needed
      break;

    case 'rain':
      config.contrast = 0.92; // Lower global contrast slightly
      config.roadGloss = 0.15; // Add subtle road gloss
      config.saturation = 0.95; // Slight desaturation
      break;

    case 'snow':
      config.contrast = 0.88;
      config.saturation = 0.80; // Reduce saturation significantly
      config.labelHaloSoftness = 1.3; // Soften label halos
      break;

    case 'fog':
      config.contrast = 0.85;
      config.saturation = 0.75;
      config.labelHaloSoftness = 1.5; // Very soft halos
      break;

    case 'thunderstorm':
      config.contrast = 0.80;
      config.saturation = 0.70;
      config.roadGloss = 0.25; // Strong road gloss
      break;

    case 'clouds':
      config.contrast = 0.96;
      config.saturation = 0.93;
      break;
  }

  // Night mode enhancements
  if (isNight) {
    config.routeHighlightIntensity = 1.4; // Increase route highlight
    // Road glow effect at night (additive to weather)
    config.roadGloss = Math.min(1.0, config.roadGloss + 0.1);
  }

  return config;
}

/**
 * Apply weather lighting to map
 * Uses Mapbox paint properties to adjust visual appearance
 */
export function applyWeatherLighting(
  map: mapboxgl.Map,
  weather: WeatherData | undefined,
  theme: MapTheme,
  isDarkMode: boolean,
  enabled: boolean = true
): void {
  if (!map || !map.getStyle()) return;

  // Get lighting configuration
  const config = enabled 
    ? getWeatherLightingConfig(weather, theme, isDarkMode)
    : DEFAULT_CONFIG;

  try {
    const style = map.getStyle();
    if (!style || !style.layers) return;

    // Adjust road layers for gloss effect
    style.layers.forEach((layer) => {
      if (layer.type === 'line' && layer.id.includes('road')) {
        // Add subtle opacity/color adjustments for road gloss
        if (config.roadGloss > 0 && map.getLayer(layer.id)) {
          const currentOpacity = map.getPaintProperty(layer.id, 'line-opacity') as number | undefined;
          const baseOpacity = currentOpacity ?? 1.0;
          const glossOpacity = Math.min(1.0, baseOpacity + config.roadGloss * 0.1);
          
          map.setPaintProperty(layer.id, 'line-opacity', glossOpacity);
        }
      }

      // Adjust label halos for fog/snow
      if (layer.type === 'symbol' && layer.id.includes('label')) {
        if (config.labelHaloSoftness !== 1.0 && map.getLayer(layer.id)) {
          const currentBlur = map.getPaintProperty(layer.id, 'text-halo-blur') as number | undefined;
          const baseBlur = currentBlur ?? 0;
          const adjustedBlur = baseBlur * config.labelHaloSoftness;
          
          map.setPaintProperty(layer.id, 'text-halo-blur', adjustedBlur);
        }
      }
    });

    // Note: Mapbox GL JS doesn't support global contrast/saturation filters
    // These would need to be implemented via custom shaders or per-layer adjustments
    // For MVP, we focus on road gloss and label halo adjustments

  } catch (error) {
    console.warn('[WeatherLighting] Failed to apply lighting:', error);
  }
}

/**
 * Adjust route layer intensity based on theme and weather
 */
export function adjustRouteIntensity(
  map: mapboxgl.Map,
  routeLayerId: string,
  weather: WeatherData | undefined,
  theme: MapTheme,
  isDarkMode: boolean,
  enabled: boolean = true
): void {
  if (!map || !map.getLayer(routeLayerId)) return;

  const config = enabled
    ? getWeatherLightingConfig(weather, theme, isDarkMode)
    : DEFAULT_CONFIG;

  try {
    // Adjust route line opacity based on intensity
    const baseOpacity = 0.95;
    const adjustedOpacity = Math.min(1.0, baseOpacity * config.routeHighlightIntensity);
    
    map.setPaintProperty(routeLayerId, 'line-opacity', adjustedOpacity);

    // Adjust route width slightly for better visibility at night
    if (config.routeHighlightIntensity > 1.2) {
      const currentWidth = map.getPaintProperty(routeLayerId, 'line-width') as number | undefined;
      if (currentWidth) {
        const adjustedWidth = currentWidth * 1.05; // 5% wider
        map.setPaintProperty(routeLayerId, 'line-width', adjustedWidth);
      }
    }
  } catch (error) {
    console.warn('[WeatherLighting] Failed to adjust route intensity:', error);
  }
}

/**
 * Reset weather lighting to defaults
 */
export function resetWeatherLighting(map: mapboxgl.Map): void {
  if (!map || !map.getStyle()) return;

  try {
    const style = map.getStyle();
    if (!style || !style.layers) return;

    // Reset all modified properties to their original values
    style.layers.forEach((layer) => {
      if (layer.type === 'line' && layer.id.includes('road') && map.getLayer(layer.id)) {
        // Reset to default opacity
        const originalOpacity = (layer.paint as any)?.['line-opacity'] ?? 1.0;
        map.setPaintProperty(layer.id, 'line-opacity', originalOpacity);
      }

      if (layer.type === 'symbol' && layer.id.includes('label') && map.getLayer(layer.id)) {
        // Reset to default halo blur
        const originalBlur = (layer.paint as any)?.['text-halo-blur'] ?? 0;
        map.setPaintProperty(layer.id, 'text-halo-blur', originalBlur);
      }
    });
  } catch (error) {
    console.warn('[WeatherLighting] Failed to reset lighting:', error);
  }
}
