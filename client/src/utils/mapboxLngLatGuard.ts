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
 * Normalize locale-formatted coordinate string to standard format
 * Converts comma decimal separator to dot (e.g., "47,3769" → "47.3769")
 */
function normalizeCoordinateString(value: any): any {
  if (typeof value === 'string') {
    // Replace comma decimal separator with dot
    const normalized = value.replace(',', '.');
    const num = Number(normalized);
    
    if (!Number.isFinite(num) || Number.isNaN(num)) {
      console.error('[LngLatGuard] CRITICAL: Invalid coordinate string after normalization:', {
        original: value,
        normalized,
        result: num
      });
    }
    
    return num;
  }
  
  return value;
}

/**
 * Wrap Mapbox's LngLat.convert to catch and fix locale-formatted coordinates
 */
export function installLngLatGuard() {
  if (typeof window === 'undefined' || !mapboxgl) {
    return;
  }

  // Only install once
  if (originalConvert) {
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
        
        // Check for NaN BEFORE calling original convert
        if (Number.isNaN(lng) || Number.isNaN(lat) || !Number.isFinite(lng) || !Number.isFinite(lat)) {
          const error = new Error('[LngLatGuard] NaN coordinates detected!');
          console.error('[LngLatGuard] CRITICAL NaN DETECTED:', {
            originalInput: input,
            normalizedLng: lng,
            normalizedLat: lat,
            stack: error.stack
          });
          
          // Fallback to Zurich to prevent crash
          console.info('[LngLatGuard] FALLBACK: Using Zurich coordinates [8.5417, 47.3769] to prevent crash');
          normalizedInput = [8.5417, 47.3769];
        } else {
          normalizedInput = [lng, lat];
          
          // Log if we had to normalize (comma separator detected)
          if (String(input[0]).includes(',') || String(input[1]).includes(',')) {
            console.info('[LngLatGuard] Normalized locale-formatted coordinates:', {
              original: input,
              normalized: normalizedInput
            });
          }
        }
      } else if (input && typeof input === 'object' && 'lng' in input && 'lat' in input) {
        const lng = normalizeCoordinateString(input.lng);
        const lat = normalizeCoordinateString(input.lat);
        
        // Check for NaN BEFORE calling original convert
        if (Number.isNaN(lng) || Number.isNaN(lat) || !Number.isFinite(lng) || !Number.isFinite(lat)) {
          const error = new Error('[LngLatGuard] NaN coordinates detected!');
          console.error('[LngLatGuard] CRITICAL NaN DETECTED:', {
            originalInput: input,
            normalizedLng: lng,
            normalizedLat: lat,
            stack: error.stack
          });
          
          // Fallback to Zurich to prevent crash
          console.info('[LngLatGuard] FALLBACK: Using Zurich coordinates to prevent crash');
          normalizedInput = { lng: 8.5417, lat: 47.3769 };
        } else {
          normalizedInput = { lng, lat };
          
          // Log if we had to normalize (comma separator detected)
          if (String(input.lng).includes(',') || String(input.lat).includes(',')) {
            console.info('[LngLatGuard] Normalized locale-formatted coordinates:', {
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

  console.log('[LngLatGuard] Installed Mapbox LngLat.convert guard for production debugging');
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
