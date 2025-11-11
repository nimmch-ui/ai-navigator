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
  const apiKey = import.meta.env.VITE_WEATHER_API_KEY;
  
  if (!apiKey) {
    console.log('[Weather] No API key found, using mock data');
    return getMockWeather(lat, lng, locationName);
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('[Weather] API error:', response.status);
      return getMockWeather(lat, lng, locationName);
    }

    const data = await response.json();
    
    const weatherId = data.weather[0]?.id || 800;
    const main = data.weather[0]?.main || 'Clear';
    const condition = getWeatherCondition(weatherId, main);
    const severity = getWeatherSeverity(condition, weatherId);
    
    return {
      location: locationName,
      condition,
      description: data.weather[0]?.description || 'Clear',
      temperature: Math.round(data.main?.temp || 20),
      severity,
      icon: data.weather[0]?.icon || '01d'
    };
  } catch (error) {
    console.error('[Weather] Fetch error:', error);
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
