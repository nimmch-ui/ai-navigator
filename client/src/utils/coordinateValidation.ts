/**
 * Coordinate Validation Utilities
 * 
 * Provides robust validation and sanitization of geographic coordinates
 * to prevent NaN, null, undefined, or invalid values from reaching Mapbox.
 * 
 * Handles production issues with locale-specific number parsing
 * (e.g., Swiss comma decimals) that can produce NaN values.
 */

// Safe default: Zurich, Switzerland [lng, lat] for Mapbox format
const FALLBACK_ZURICH_LNG = 8.5417;
const FALLBACK_ZURICH_LAT = 47.3769;

/**
 * Validates that a number is finite and not NaN
 */
function isValidCoordinate(value: any): boolean {
  return typeof value === 'number' && Number.isFinite(value) && !Number.isNaN(value);
}

/**
 * Sanitize and validate a coordinate pair in [lat, lng] format
 * 
 * @param coordinates - Array in [lat, lng] format
 * @param source - Description of coordinate source for logging
 * @returns Validated [lat, lng] pair, or Zurich fallback if invalid
 */
export function validateCoordinates(
  coordinates: [number, number] | null | undefined,
  source: string = 'unknown'
): [number, number] {
  // Handle null/undefined
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
    console.info(`[CoordinateValidation] FALLBACK: Invalid coordinate structure from ${source}, using Zurich fallback [${FALLBACK_ZURICH_LAT}, ${FALLBACK_ZURICH_LNG}]`);
    return [FALLBACK_ZURICH_LAT, FALLBACK_ZURICH_LNG];
  }

  const [lat, lng] = coordinates;

  // Check latitude validity
  if (!isValidCoordinate(lat)) {
    console.info(`[CoordinateValidation] FALLBACK: Invalid latitude (${lat}) from ${source}, using Zurich fallback [${FALLBACK_ZURICH_LAT}, ${FALLBACK_ZURICH_LNG}]`);
    return [FALLBACK_ZURICH_LAT, FALLBACK_ZURICH_LNG];
  }

  // Check longitude validity
  if (!isValidCoordinate(lng)) {
    console.info(`[CoordinateValidation] FALLBACK: Invalid longitude (${lng}) from ${source}, using Zurich fallback [${FALLBACK_ZURICH_LAT}, ${FALLBACK_ZURICH_LNG}]`);
    return [FALLBACK_ZURICH_LAT, FALLBACK_ZURICH_LNG];
  }

  // Validate latitude range
  if (lat < -90 || lat > 90) {
    console.info(`[CoordinateValidation] FALLBACK: Latitude ${lat} out of range from ${source}, using Zurich fallback [${FALLBACK_ZURICH_LAT}, ${FALLBACK_ZURICH_LNG}]`);
    return [FALLBACK_ZURICH_LAT, FALLBACK_ZURICH_LNG];
  }

  // Validate longitude range
  if (lng < -180 || lng > 180) {
    console.info(`[CoordinateValidation] FALLBACK: Longitude ${lng} out of range from ${source}, using Zurich fallback [${FALLBACK_ZURICH_LAT}, ${FALLBACK_ZURICH_LNG}]`);
    return [FALLBACK_ZURICH_LAT, FALLBACK_ZURICH_LNG];
  }

  // Coordinates are valid
  return [lat, lng];
}

/**
 * Validate and convert coordinates from [lat, lng] to [lng, lat] for Mapbox
 * 
 * @param coordinates - Array in [lat, lng] format
 * @param source - Description of coordinate source for logging
 * @returns Validated [lng, lat] pair for Mapbox, or Zurich fallback if invalid
 */
export function validateAndConvertForMapbox(
  coordinates: [number, number] | null | undefined,
  source: string = 'unknown'
): [number, number] {
  const validated = validateCoordinates(coordinates, source);
  const [lat, lng] = validated;
  
  // Convert [lat, lng] → [lng, lat] for Mapbox
  return [lng, lat];
}

/**
 * Get safe Zurich coordinates in [lat, lng] format
 */
export function getZurichFallback(): [number, number] {
  return [FALLBACK_ZURICH_LAT, FALLBACK_ZURICH_LNG];
}

/**
 * Get safe Zurich coordinates in [lng, lat] format for Mapbox
 */
export function getZurichFallbackMapbox(): [number, number] {
  return [FALLBACK_ZURICH_LNG, FALLBACK_ZURICH_LAT];
}
