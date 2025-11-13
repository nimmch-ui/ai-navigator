import type { IWeather, WeatherNow } from '../types';

export class OpenWeather implements IWeather {
  private apiKey: string;

  constructor() {
    const apiKey = import.meta.env.VITE_OPENWEATHER_KEY;
    if (!apiKey) {
      throw new Error('[OpenWeather] VITE_OPENWEATHER_KEY not configured');
    }
    this.apiKey = apiKey;
  }

  getName(): string {
    return 'OpenWeather';
  }

  async getNow(lat: number, lng: number): Promise<WeatherNow> {
    const apiKey = this.apiKey;

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${apiKey}`;
    
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`OpenWeather API error: ${response.status}`);
    }

    const data = await response.json();
    return this.transformResponse(data);
  }

  private transformResponse(data: any): WeatherNow {
    const conditionMap: Record<string, WeatherNow['condition']> = {
      'Clear': 'clear',
      'Clouds': 'clouds',
      'Rain': 'rain',
      'Drizzle': 'rain',
      'Snow': 'snow',
      'Mist': 'fog',
      'Fog': 'fog',
      'Thunderstorm': 'storm',
    };

    return {
      temperature: data.main?.temp || 15,
      condition: conditionMap[data.weather?.[0]?.main] || 'clear',
      windSpeed: data.wind?.speed || 0,
      windDirection: data.wind?.deg || 0,
      precipitation: data.rain?.['1h'] || data.snow?.['1h'] || 0,
      visibility: data.visibility || 10000,
      humidity: data.main?.humidity || 50,
      timestamp: data.dt ? data.dt * 1000 : Date.now(),
    };
  }
}

export class MeteoFuse implements IWeather {
  getName(): string {
    return 'MeteoFuse';
  }

  async getNow(lat: number, lng: number): Promise<WeatherNow> {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&hourly=precipitation,visibility`;
    
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`MeteoFuse API error: ${response.status}`);
    }

    const data = await response.json();
    return this.transformResponse(data);
  }

  private transformResponse(data: any): WeatherNow {
    const current = data.current_weather || {};
    
    const conditionMap: Record<number, WeatherNow['condition']> = {
      0: 'clear',
      1: 'clear',
      2: 'clouds',
      3: 'clouds',
      45: 'fog',
      48: 'fog',
      51: 'rain',
      61: 'rain',
      71: 'snow',
      95: 'storm',
    };

    return {
      temperature: current.temperature || 15,
      condition: conditionMap[current.weathercode] || 'clear',
      windSpeed: current.windspeed || 0,
      windDirection: current.winddirection || 0,
      precipitation: data.hourly?.precipitation?.[0] || 0,
      visibility: data.hourly?.visibility?.[0] || 10000,
      humidity: 50,
      timestamp: current.time ? new Date(current.time).getTime() : Date.now(),
    };
  }
}

export class MockWeather implements IWeather {
  getName(): string {
    return 'Mock Weather';
  }

  async getNow(lat: number, lng: number): Promise<WeatherNow> {
    const hour = new Date().getHours();
    const isSunny = hour > 6 && hour < 20;

    return {
      temperature: 18 + Math.random() * 10,
      condition: isSunny ? 'clear' : 'clouds',
      windSpeed: 5 + Math.random() * 10,
      windDirection: Math.random() * 360,
      precipitation: 0,
      visibility: 10000,
      humidity: 50 + Math.random() * 30,
      timestamp: Date.now(),
    };
  }
}
