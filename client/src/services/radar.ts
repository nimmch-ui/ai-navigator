import type { SpeedCamera } from '@/data/speedCameras';
import { mockSpeedCameras } from '@/data/speedCameras';

export async function getSpeedCameras(): Promise<SpeedCamera[]> {
  try {
    const { ProviderRegistry } = await import('@/services/data/ProviderRegistry');
    const { RegionDetector } = await import('@/services/data/regionDetector');
    
    const region = await RegionDetector.detectRegion();
    const providerSet = ProviderRegistry.for(region);
    
    // Global bounding box for all cameras
    const globalBBox = {
      minLat: -90,
      maxLat: 90,
      minLng: -180,
      maxLng: 180
    };
    
    const result = await ProviderRegistry.withFailover(
      providerSet.radar,
      (provider) => provider.getCameras(globalBBox),
      'Speed Cameras',
      'global_cameras',
      'radar'
    );
    
    return result.data as any;
  } catch (error) {
    console.error('[Radar] Provider error, using mock data:', error);
    return mockSpeedCameras;
  }
}

export function getSpeedCameraById(id: string): SpeedCamera | undefined {
  return mockSpeedCameras.find(camera => camera.id === id);
}

export function formatSpeedLimit(speedKmh: number): string {
  return `${speedKmh} km/h`;
}

export function getCamerasInBounds(
  cameras: SpeedCamera[],
  bounds: { north: number; south: number; east: number; west: number }
): SpeedCamera[] {
  return cameras.filter(camera => 
    camera.lat >= bounds.south &&
    camera.lat <= bounds.north &&
    camera.lon >= bounds.west &&
    camera.lon <= bounds.east
  );
}
