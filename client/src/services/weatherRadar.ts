/**
 * Weather Radar Service - RainViewer API Integration
 * Provides weather radar tile overlay for maps
 */

export interface RadarFrame {
  time: number; // Unix timestamp
  path: string; // Tile path for this frame
}

export interface RadarData {
  version: string;
  generated: number;
  host: string;
  radar: {
    past: RadarFrame[];
    nowcast: RadarFrame[];
  };
}

const RAINVIEWER_API_URL = 'https://api.rainviewer.com/public/weather-maps.json';
const RAINVIEWER_HOST = 'https://tilecache.rainviewer.com';

// Color scheme: 2 = Universal Blue (default)
// Options: 1_1 = smooth + snow colors
const TILE_SIZE = 256;
const COLOR_SCHEME = 2;
const OPTIONS = '1_1';
const FORMAT = 'png';

/**
 * Fetch available radar frames from RainViewer API
 */
export async function fetchRadarData(): Promise<RadarData | null> {
  try {
    const response = await fetch(RAINVIEWER_API_URL);
    
    if (!response.ok) {
      console.error('Failed to fetch radar data:', response.status, response.statusText);
      return null;
    }
    
    const data = await response.json();
    return data as RadarData;
  } catch (error) {
    console.error('Error fetching radar data:', error);
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
  return constructTileUrl(latestFrame.path);
}

/**
 * Construct tile URL for a radar frame
 */
export function constructTileUrl(path: string): string {
  return `${RAINVIEWER_HOST}${path}/${TILE_SIZE}/{z}/{x}/{y}/${COLOR_SCHEME}/${OPTIONS}.${FORMAT}`;
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
