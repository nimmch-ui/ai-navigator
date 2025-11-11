import type { SpeedCamera } from '@/data/speedCameras';
import { mockSpeedCameras } from '@/data/speedCameras';

export async function getSpeedCameras(): Promise<SpeedCamera[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockSpeedCameras);
    }, 100);
  });
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
