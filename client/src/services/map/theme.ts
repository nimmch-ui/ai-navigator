/**
 * Map theme service for day/night style switching
 * Supports auto-detection based on time and manual overrides
 */

export type MapTheme = 'auto' | 'day' | 'night';
export type ResolvedTheme = 'day' | 'night';

// Mapbox style URLs
export const MAP_STYLES = {
  day: 'mapbox://styles/mapbox/streets-v12',
  night: 'mapbox://styles/mapbox/dark-v11'
} as const;

// Simple time-based thresholds (hours)
const DAY_START_HOUR = 6;
const NIGHT_START_HOUR = 19;

/**
 * Calculate sunrise and sunset times using a simplified algorithm
 * Based on the approximate sunrise equation
 */
function calculateSunriseSunset(lat: number, lng: number): { sunrise: Date; sunset: Date } {
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  
  // Simplified solar declination (degrees)
  const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * Math.PI / 180);
  
  // Hour angle for sunrise/sunset (degrees)
  const latRad = lat * Math.PI / 180;
  const decRad = declination * Math.PI / 180;
  const cosHourAngle = -Math.tan(latRad) * Math.tan(decRad);
  
  // Check for polar day/night
  if (cosHourAngle > 1) {
    // Polar night - sun never rises
    return {
      sunrise: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0),
      sunset: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0)
    };
  } else if (cosHourAngle < -1) {
    // Polar day - sun never sets
    return {
      sunrise: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0),
      sunset: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59)
    };
  }
  
  const hourAngle = Math.acos(cosHourAngle) * 180 / Math.PI;
  
  // Solar noon is approximately at 12:00 + longitude offset
  const solarNoon = 12 - (lng / 15);
  
  // Calculate sunrise and sunset times
  const sunriseHour = solarNoon - (hourAngle / 15);
  const sunsetHour = solarNoon + (hourAngle / 15);
  
  const sunrise = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  sunrise.setHours(Math.floor(sunriseHour), Math.round((sunriseHour % 1) * 60), 0, 0);
  
  const sunset = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  sunset.setHours(Math.floor(sunsetHour), Math.round((sunsetHour % 1) * 60), 0, 0);
  
  return { sunrise, sunset };
}

/**
 * Determine if it's currently daytime based on simple time check
 */
function isDaytimeSimple(): boolean {
  const hour = new Date().getHours();
  return hour >= DAY_START_HOUR && hour < NIGHT_START_HOUR;
}

/**
 * Determine if it's currently daytime based on sunrise/sunset at given location
 */
export function isDaytime(lat?: number, lng?: number): boolean {
  // If no coordinates provided, use simple time-based check
  if (lat === undefined || lng === undefined) {
    return isDaytimeSimple();
  }
  
  try {
    const { sunrise, sunset } = calculateSunriseSunset(lat, lng);
    const now = new Date();
    return now >= sunrise && now < sunset;
  } catch (error) {
    console.warn('Failed to calculate sunrise/sunset, falling back to simple time check:', error);
    return isDaytimeSimple();
  }
}

/**
 * Resolve the theme setting to an actual day/night value
 */
export function resolveTheme(theme: MapTheme, lat?: number, lng?: number): ResolvedTheme {
  if (theme === 'day') return 'day';
  if (theme === 'night') return 'night';
  
  // Auto mode - detect based on time and location
  return isDaytime(lat, lng) ? 'day' : 'night';
}

/**
 * Get the Mapbox style URL for a resolved theme
 */
export function getStyleUrl(resolvedTheme: ResolvedTheme): string {
  return MAP_STYLES[resolvedTheme];
}

/**
 * Get the next theme in the cycle: auto → day → night → auto
 */
export function getNextTheme(currentTheme: MapTheme): MapTheme {
  const cycle: MapTheme[] = ['auto', 'day', 'night'];
  const currentIndex = cycle.indexOf(currentTheme);
  return cycle[(currentIndex + 1) % cycle.length];
}

/**
 * Get a human-readable label for the theme
 */
export function getThemeLabel(theme: MapTheme, resolvedTheme?: ResolvedTheme): string {
  if (theme === 'auto' && resolvedTheme) {
    return `Auto (${resolvedTheme === 'day' ? 'Day' : 'Night'})`;
  }
  return theme.charAt(0).toUpperCase() + theme.slice(1);
}

/**
 * Get icon for the theme (emoji or unicode symbol)
 */
export function getThemeIcon(theme: MapTheme): string {
  switch (theme) {
    case 'day':
      return '☀︎';
    case 'night':
      return '🌙';
    case 'auto':
      return '◐'; // Half-filled circle to represent auto
  }
}
