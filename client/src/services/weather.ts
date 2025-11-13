export type WeatherCondition = 'clear' | 'clouds' | 'rain' | 'snow' | 'fog' | 'thunderstorm';

export type WeatherSeverity = 'normal' | 'severe';

export interface WeatherData {
  location: string;
  condition: WeatherCondition;
  description: string;
  temperature: number;
  severity: WeatherSeverity;
  icon: string;
}

function getWeatherCondition(weatherId: number, main: string): WeatherCondition {
  if (weatherId >= 200 && weatherId < 300) return 'thunderstorm';
  if (weatherId >= 300 && weatherId < 600) return 'rain';
  if (weatherId >= 600 && weatherId < 700) return 'snow';
  if (weatherId >= 700 && weatherId < 800) return 'fog';
  if (weatherId === 800) return 'clear';
  return 'clouds';
}

function getWeatherSeverity(condition: WeatherCondition, weatherId: number): WeatherSeverity {
  if (condition === 'thunderstorm') return 'severe';
  if (condition === 'snow' && weatherId >= 602) return 'severe';
  if (condition === 'rain' && weatherId >= 502) return 'severe';
  if (condition === 'fog' && weatherId === 741) return 'severe';
  return 'normal';
}

import { EventBus } from './eventBus';

const WEATHER_CACHE_KEY = 'weather_cache';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface CachedWeather {
  data: WeatherData;
  timestamp: number;
  location: string;
}

function getCachedWeather(lat: number, lng: number): WeatherData | null {
  try {
    const cached = localStorage.getItem(WEATHER_CACHE_KEY);
    if (!cached) return null;

    const entries: CachedWeather[] = JSON.parse(cached);
    const now = Date.now();

    const match = entries.find(entry => {
      const age = now - entry.timestamp;
      if (age > CACHE_TTL_MS) return false;

      const distance = Math.sqrt(
        Math.pow(parseFloat(entry.data.location.split(',')[0]) - lat, 2) +
        Math.pow(parseFloat(entry.data.location.split(',')[1]) - lng, 2)
      );
      
      return distance < 0.1;
    });

    return match?.data || null;
  } catch (error) {
    console.error('[Weather] Cache read error:', error);
    return null;
  }
}

function cacheWeather(data: WeatherData, lat: number, lng: number): void {
  try {
    const cached = localStorage.getItem(WEATHER_CACHE_KEY);
    let entries: CachedWeather[] = cached ? JSON.parse(cached) : [];

    const now = Date.now();
    entries = entries.filter(e => now - e.timestamp < CACHE_TTL_MS);

    entries.push({
      data,
      timestamp: now,
      location: `${lat},${lng}`,
    });

    entries = entries.slice(-10);

    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error('[Weather] Cache write error:', error);
  }
}

export async function fetchWeather(
  lat: number, 
  lng: number, 
  locationName: string
): Promise<WeatherData> {
  try {
    const { ProviderRegistry } = await import('@/services/data/ProviderRegistry');
    const { RegionDetector } = await import('@/services/data/regionDetector');
    
    const region = await RegionDetector.detectRegion();
    const providerSet = ProviderRegistry.for(region);
    
    const result = await ProviderRegistry.withFailover(
      providerSet.weather,
      (provider) => provider.getWeatherNow(lat, lng),
      'Weather',
      `weather_${lat}_${lng}`,
      'weather'
    );
    
    const weatherNow = result.data as any;
    const condition = getWeatherCondition(weatherNow.weatherCode || 800, weatherNow.condition);
    const severity = getWeatherSeverity(condition, weatherNow.weatherCode || 800);
    
    const weatherData: WeatherData = {
      location: locationName,
      condition,
      description: weatherNow.description,
      temperature: Math.round(weatherNow.temp),
      severity,
      icon: weatherNow.icon
    };

    cacheWeather(weatherData, lat, lng);
    
    return weatherData;
  } catch (error) {
    console.error('[Weather] Provider error, attempting cached fallback:', error);
    
    const cached = getCachedWeather(lat, lng);
    if (cached) {
      EventBus.emit('weather:using_cached_data', {
        location: locationName,
        cacheAge: Date.now() - (cached as any).timestamp,
      });
      console.warn('[Weather] Using cached data for', locationName);
      return { ...cached, location: locationName };
    }

    EventBus.emit('weather:fetch_failed', {
      location: locationName,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw new Error(`Weather data unavailable for ${locationName}`);
  }
}

export function isSevereWeather(weatherData: WeatherData[]): boolean {
  return weatherData.some(w => w.severity === 'severe');
}

export function getSevereWeatherWarning(weatherData: WeatherData[]): string | null {
  const severeLocations = weatherData.filter(w => w.severity === 'severe');
  
  if (severeLocations.length === 0) return null;
  
  const conditions = severeLocations.map(w => w.condition);
  
  if (conditions.includes('thunderstorm')) {
    return 'Thunderstorms detected on route – drive with extreme caution.';
  }
  if (conditions.includes('snow')) {
    return 'Heavy snow on route – reduce speed and increase following distance.';
  }
  if (conditions.includes('rain')) {
    return 'Heavy rain on route – drive carefully and watch for standing water.';
  }
  if (conditions.includes('fog')) {
    return 'Dense fog on route – use fog lights and reduce speed.';
  }
  
  return 'Severe weather on route – drive carefully.';
}
