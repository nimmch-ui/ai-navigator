export type Region = "EU" | "CH" | "US" | "IN" | "ME" | "GLOBAL";

export interface BBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface TrafficFlow {
  id: string;
  coordinates: [number, number][];
  speed: number;
  freeFlowSpeed: number;
  congestionLevel: 'low' | 'moderate' | 'high' | 'severe';
}

export interface SpeedCamera {
  id: string;
  lat: number;
  lng: number;
  speedLimit: number;
  type: 'fixed' | 'mobile' | 'red_light' | 'average_speed';
  direction?: number;
}

export interface WeatherNow {
  temperature: number;
  condition: 'clear' | 'rain' | 'snow' | 'clouds' | 'fog' | 'storm';
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  visibility: number;
  humidity: number;
  timestamp: number;
}

export interface IMapTiles {
  styleUrl(): string;
  getName(): string;
}

export interface ITraffic {
  getFlow(bbox: BBox): Promise<TrafficFlow[]>;
  getName(): string;
}

export interface IRadar {
  getCameras(bbox: BBox): Promise<SpeedCamera[]>;
  getName(): string;
}

export interface IWeather {
  getNow(lat: number, lng: number): Promise<WeatherNow>;
  getName(): string;
}

export interface ProviderSet {
  map: IMapTiles[];
  traffic: ITraffic[];
  radar: IRadar[];
  weather: IWeather[];
}

export interface ProviderFailoverResult<T> {
  data: T;
  provider: string;
  fallbackUsed: boolean;
  attempts: number;
}
