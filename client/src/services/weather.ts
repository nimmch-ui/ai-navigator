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

function getMockWeather(lat: number, lng: number, location: string): WeatherData {
  const conditions: WeatherCondition[] = ['clear', 'clouds', 'rain'];
  const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
  const baseTemp = 15 + Math.random() * 15;
  
  return {
    location,
    condition: randomCondition,
    description: randomCondition === 'clear' ? 'Clear sky' : 
                 randomCondition === 'clouds' ? 'Partly cloudy' : 'Light rain',
    temperature: Math.round(baseTemp),
    severity: 'normal',
    icon: randomCondition === 'clear' ? '01d' : 
          randomCondition === 'clouds' ? '03d' : '10d'
  };
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
    
    return {
      location: locationName,
      condition,
      description: weatherNow.description,
      temperature: Math.round(weatherNow.temp),
      severity,
      icon: weatherNow.icon
    };
  } catch (error) {
    console.error('[Weather] Provider error, using mock data:', error);
    return getMockWeather(lat, lng, locationName);
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
