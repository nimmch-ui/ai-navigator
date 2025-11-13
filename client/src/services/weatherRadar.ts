/**
 * Weather Radar Service - Regional Provider Integration
 * Provides weather radar tile overlay for maps with failover support
 */

import type { RadarTileData, RadarFrame } from './data/types';

export type { RadarFrame };
export type RadarData = RadarTileData;

const TILE_SIZE = 256;
const COLOR_SCHEME = 2;
const OPTIONS = '1_1';
const FORMAT = 'png';

/**
 * Fetch available radar frames via provider layer with failover
 */
export async function fetchRadarData(): Promise<RadarData | null> {
  try {
    const { ProviderRegistry } = await import('@/services/data/ProviderRegistry');
    const { RegionDetector } = await import('@/services/data/regionDetector');
    
    const region = await RegionDetector.detectRegion();
    const providerSet = ProviderRegistry.for(region);
    
    const result = await ProviderRegistry.withFailover(
      providerSet.weatherRadar,
      (provider) => provider.getRadarData(),
      'Weather Radar',
      'radar_tiles',
      'weatherRadar'
    );
    
    return result.data as any;
  } catch (error) {
    console.error('[WeatherRadar] Provider error:', error);
    return null;
  }
}

/**
 * Get the most recent radar frame tile URL
 */
export function getMostRecentRadarTileUrl(data: RadarData): string {
  // Use the most recent past radar frame
  const frames = data.radar.past;
  if (!frames || frames.length === 0) {
    throw new Error('No radar frames available');
  }
  
  const latestFrame = frames[frames.length - 1];
  return constructTileUrl(latestFrame.path, data.host);
}

/**
 * Construct tile URL for a radar frame
 */
export function constructTileUrl(path: string, host = 'https://tilecache.rainviewer.com'): string {
  return `${host}${path}/${TILE_SIZE}/{z}/{x}/{y}/${COLOR_SCHEME}/${OPTIONS}.${FORMAT}`;
}

/**
 * Get all available radar frames for animation
 */
export function getAllRadarFrames(data: RadarData): RadarFrame[] {
  return data.radar.past || [];
}

/**
 * Format timestamp for display
 */
export function formatRadarTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Check if radar data is stale (older than 15 minutes)
 */
export function isRadarDataStale(data: RadarData): boolean {
  const now = Date.now() / 1000; // Convert to Unix timestamp
  const generatedTime = data.generated;
  const ageInMinutes = (now - generatedTime) / 60;
  
  return ageInMinutes > 15;
}
