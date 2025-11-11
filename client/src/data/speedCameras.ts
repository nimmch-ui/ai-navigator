export interface SpeedCamera {
  id: string;
  lon: number;
  lat: number;
  speedLimitKmh: number;
  direction?: string;
  source: string;
}

export const mockSpeedCameras: SpeedCamera[] = [
  {
    id: 'cam-sf-1',
    lon: -122.4194,
    lat: 37.7749,
    speedLimitKmh: 50,
    direction: 'northbound',
    source: 'demo'
  },
  {
    id: 'cam-sf-2',
    lon: -122.4089,
    lat: 37.7858,
    speedLimitKmh: 40,
    direction: 'eastbound',
    source: 'demo'
  },
  {
    id: 'cam-sf-3',
    lon: -122.4324,
    lat: 37.7694,
    speedLimitKmh: 60,
    source: 'demo'
  },
  {
    id: 'cam-sf-4',
    lon: -122.3959,
    lat: 37.7937,
    speedLimitKmh: 50,
    direction: 'southbound',
    source: 'demo'
  },
  {
    id: 'cam-sf-5',
    lon: -122.4183,
    lat: 37.8044,
    speedLimitKmh: 45,
    direction: 'westbound',
    source: 'demo'
  },
  {
    id: 'cam-sf-6',
    lon: -122.4469,
    lat: 37.7648,
    speedLimitKmh: 55,
    source: 'demo'
  }
];
