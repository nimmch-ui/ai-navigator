import type { SpeedCamera } from '@/data/speedCameras';

const PROXIMITY_THRESHOLD_METERS = 300;

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export interface CameraProximityWarning {
  camera: SpeedCamera;
  distance: number;
}

export function findNearestCamera(
  currentPosition: [number, number],
  cameras: SpeedCamera[]
): SpeedCamera | null {
  if (cameras.length === 0) return null;

  let nearestCamera: SpeedCamera | null = null;
  let minDistance = Infinity;

  cameras.forEach(camera => {
    const distance = calculateDistance(
      currentPosition[0],
      currentPosition[1],
      camera.lat,
      camera.lon
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestCamera = camera;
    }
  });

  return nearestCamera;
}

export function detectCamerasOnRoute(
  route: Array<[number, number]>,
  cameras: SpeedCamera[],
  thresholdMeters: number = PROXIMITY_THRESHOLD_METERS
): CameraProximityWarning[] {
  const warnings: CameraProximityWarning[] = [];
  const detectedCameras = new Set<string>();

  cameras.forEach(camera => {
    let minDistance = Infinity;

    route.forEach(point => {
      const distance = calculateDistance(point[0], point[1], camera.lat, camera.lon);
      if (distance < minDistance) {
        minDistance = distance;
      }
    });

    if (minDistance <= thresholdMeters && !detectedCameras.has(camera.id)) {
      warnings.push({ camera, distance: minDistance });
      detectedCameras.add(camera.id);
    }
  });

  warnings.sort((a, b) => a.distance - b.distance);

  return warnings;
}

export function getCurrentSpeedLimit(
  currentPosition: [number, number],
  cameras: SpeedCamera[],
  maxDistance: number = 500
): number | null {
  const nearest = findNearestCamera(currentPosition, cameras);
  
  if (!nearest) return null;

  const distance = calculateDistance(
    currentPosition[0],
    currentPosition[1],
    nearest.lat,
    nearest.lon
  );

  if (distance <= maxDistance) {
    return nearest.speedLimitKmh;
  }

  return null;
}
