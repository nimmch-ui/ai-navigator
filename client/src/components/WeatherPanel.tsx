import { Cloud, CloudRain, CloudSnow, CloudFog, Sun, CloudDrizzle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { WeatherData } from '@/services/weather';

interface WeatherPanelProps {
  weatherData: WeatherData[];
}

function getWeatherIcon(condition: string) {
  switch (condition) {
    case 'clear':
      return <Sun className="h-5 w-5 text-yellow-500" data-testid="icon-weather-clear" />;
    case 'rain':
      return <CloudRain className="h-5 w-5 text-blue-500" data-testid="icon-weather-rain" />;
    case 'snow':
      return <CloudSnow className="h-5 w-5 text-blue-300" data-testid="icon-weather-snow" />;
    case 'fog':
      return <CloudFog className="h-5 w-5 text-gray-400" data-testid="icon-weather-fog" />;
    case 'thunderstorm':
      return <CloudDrizzle className="h-5 w-5 text-purple-500" data-testid="icon-weather-storm" />;
    case 'clouds':
    default:
      return <Cloud className="h-5 w-5 text-gray-500" data-testid="icon-weather-clouds" />;
  }
}

export default function WeatherPanel({ weatherData }: WeatherPanelProps) {
  if (weatherData.length === 0) return null;

  return (
    <Card className="w-full" data-testid="card-weather">
      <CardContent className="p-3">
        <div className="space-y-2">
          {weatherData.map((weather, index) => (
            <div 
              key={index} 
              className="flex items-center gap-2"
              data-testid={`weather-item-${index}`}
            >
              {getWeatherIcon(weather.condition)}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground truncate" data-testid={`text-location-${index}`}>
                  {weather.location}
                </div>
                <div className="text-xs text-muted-foreground capitalize truncate" data-testid={`text-condition-${index}`}>
                  {weather.description}
                </div>
              </div>
              <div className="text-sm font-semibold text-foreground" data-testid={`text-temp-${index}`}>
                {weather.temperature}°C
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
