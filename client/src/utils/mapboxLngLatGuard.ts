/**
 * Mapbox LngLat Guard
 * 
 * Temporary debugging wrapper for production to catch locale-formatted
 * coordinate strings that produce NaN when passed to Mapbox APIs.
 * 
 * This captures stack traces and normalizes comma-decimal separators
 * to prevent crashes while we gather telemetry on the offending code path.
 */

import mapboxgl from 'mapbox-gl';

let originalConvert: any = null;

/**
 * Normalize and validate coordinate value
 * - Converts comma decimal separator to dot (e.g., "47,3769" → "47.3769")
 * - Converts null/undefined to NaN for consistent validation
 * - Returns NaN for any invalid input
 */
function normalizeCoordinateString(value: any): number {
  // Handle null/undefined explicitly - return NaN so validation catches it
  if (value == null) {
    return NaN;
  }
  
  if (typeof value === 'string') {
    // Replace comma decimal separator with dot
    const normalized = value.replace(',', '.');
    const num = Number(normalized);
    
    if (!Number.isFinite(num)) {
      console.error('[LngLatGuard] Invalid coordinate string after normalization:', {
        original: value,
        normalized,
        result: num
      });
      return NaN;
    }
    
    return num;
  }
  
  // Convert to number if it's not already
  const num = Number(value);
  
  // Return NaN if conversion fails or result is not finite
  if (!Number.isFinite(num)) {
    return NaN;
  }
  
  return num;
}

/**
 * Wrap Mapbox's LngLat.convert to catch and fix locale-formatted coordinates
 */
export function installLngLatGuard() {
  if (typeof window === 'undefined' || !mapboxgl) {
    console.warn('[LngLatGuard] Cannot install - window or mapboxgl not available');
    return;
  }

  // Only install once
  if (originalConvert) {
    console.warn('[LngLatGuard] Already installed, skipping');
    return;
  }

  // Store original convert function
  originalConvert = mapboxgl.LngLat.convert;

  // Wrap the convert function
  mapboxgl.LngLat.convert = function(input: any): mapboxgl.LngLat {
    try {
      // Normalize input if it's an array or object with lng/lat
      let normalizedInput = input;
      
      if (Array.isArray(input) && input.length >= 2) {
        const lng = normalizeCoordinateString(input[0]);
        const lat = normalizeCoordinateString(input[1]);
        
        // Check for NaN, validate ranges: lng [-180,180], lat [-90,90]
        if (Number.isNaN(lng) || Number.isNaN(lat) || 
            !Number.isFinite(lng) || !Number.isFinite(lat) ||
            lng < -180 || lng > 180 || lat < -90 || lat > 90) {
          const error = new Error('[LngLatGuard] Invalid coordinates!');
          console.error('[LngLatGuard] CRITICAL INVALID COORDINATES:', {
            originalInput: input,
            normalizedLng: lng,
            normalizedLat: lat,
            reason: Number.isNaN(lng) ? 'lng is NaN' : 
                    Number.isNaN(lat) ? 'lat is NaN' :
                    !Number.isFinite(lng) ? 'lng not finite' :
                    !Number.isFinite(lat) ? 'lat not finite' :
                    lng < -180 || lng > 180 ? 'lng out of range [-180,180]' :
                    'lat out of range [-90,90]',
            stack: error.stack
          });
          
          // Fallback to Zurich to prevent crash
          console.info('[LngLatGuard] FALLBACK: Using Zurich coordinates [8.5417, 47.3769]');
          normalizedInput = [8.5417, 47.3769];
        } else {
          normalizedInput = [lng, lat];
          
          // Log if we had to normalize (comma separator or null detected)
          if (input[0] == null || input[1] == null || 
              String(input[0]).includes(',') || String(input[1]).includes(',')) {
            console.info('[LngLatGuard] Normalized coordinates:', {
              original: input,
              normalized: normalizedInput
            });
          }
        }
      } else if (input && typeof input === 'object' && 'lng' in input && 'lat' in input) {
        const lng = normalizeCoordinateString(input.lng);
        const lat = normalizeCoordinateString(input.lat);
        
        // Check for NaN, validate ranges: lng [-180,180], lat [-90,90]
        if (Number.isNaN(lng) || Number.isNaN(lat) || 
            !Number.isFinite(lng) || !Number.isFinite(lat) ||
            lng < -180 || lng > 180 || lat < -90 || lat > 90) {
          const error = new Error('[LngLatGuard] Invalid coordinates!');
          console.error('[LngLatGuard] CRITICAL INVALID COORDINATES:', {
            originalInput: input,
            normalizedLng: lng,
            normalizedLat: lat,
            reason: Number.isNaN(lng) ? 'lng is NaN' : 
                    Number.isNaN(lat) ? 'lat is NaN' :
                    !Number.isFinite(lng) ? 'lng not finite' :
                    !Number.isFinite(lat) ? 'lat not finite' :
                    lng < -180 || lng > 180 ? 'lng out of range [-180,180]' :
                    'lat out of range [-90,90]',
            stack: error.stack
          });
          
          // Fallback to Zurich to prevent crash
          console.info('[LngLatGuard] FALLBACK: Using Zurich coordinates {lng: 8.5417, lat: 47.3769}');
          normalizedInput = { lng: 8.5417, lat: 47.3769 };
        } else {
          normalizedInput = { lng, lat };
          
          // Log if we had to normalize (comma separator or null detected)
          if (input.lng == null || input.lat == null ||
              String(input.lng).includes(',') || String(input.lat).includes(',')) {
            console.info('[LngLatGuard] Normalized coordinates:', {
              original: input,
              normalized: normalizedInput
            });
          }
        }
      }
      
      // Call original convert with normalized input
      return originalConvert.call(this, normalizedInput);
    } catch (error) {
      console.error('[LngLatGuard] Error in LngLat.convert wrapper:', error);
      // Fallback to Zurich on any error
      return originalConvert.call(this, [8.5417, 47.3769]);
    }
  };

  // Log installation with timestamp for production telemetry
  console.log(`[LngLatGuard] ✓ INSTALLED at ${new Date().toISOString()} - Production guard active`);
}

/**
 * Remove the LngLat guard (for cleanup after debugging)
 */
export function uninstallLngLatGuard() {
  if (originalConvert) {
    mapboxgl.LngLat.convert = originalConvert;
    originalConvert = null;
    console.log('[LngLatGuard] Removed Mapbox LngLat.convert guard');
  }
}
