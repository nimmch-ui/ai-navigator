/**
 * Visual3D Service - Premium 3D map features for Mapbox GL JS
 * Features: Terrain with DEM, atmospheric sky layer, 2D/3D camera transitions
 */

import mapboxgl from 'mapbox-gl';

const TERRAIN_SOURCE_ID = 'mapbox-terrain';
const TERRAIN_SOURCE_URL = 'mapbox://mapbox.terrain-rgb';
const SKY_LAYER_ID = 'sky';

export const DEFAULT_3D_CAMERA = {
  pitch: 45,
  bearing: 0,
};

export const DEFAULT_2D_CAMERA = {
  pitch: 0,
  bearing: 0,
};

/**
 * Enable terrain with Digital Elevation Model (DEM) source
 * Returns { success: boolean, deferred: boolean }
 * - success: true if terrain was enabled, false if it failed
 * - deferred: true if style isn't loaded yet (not a true failure)
 */
export function enableTerrain(
  map: mapboxgl.Map, 
  exaggeration: number = 1.2
): { success: boolean; deferred: boolean } {
  try {
    // Check if style is loaded
    if (!map.isStyleLoaded()) {
      console.warn('[Terrain] Style not loaded yet, deferring terrain setup');
      return { success: false, deferred: true };
    }

    // Add DEM source if not present
    if (!map.getSource(TERRAIN_SOURCE_ID)) {
      map.addSource(TERRAIN_SOURCE_ID, {
        type: 'raster-dem',
        url: TERRAIN_SOURCE_URL,
        tileSize: 512,
        maxzoom: 14,
      });
    }

    // Apply terrain
    map.setTerrain({
      source: TERRAIN_SOURCE_ID,
      exaggeration,
    });

    return { success: true, deferred: false };
  } catch (error) {
    console.warn('[Terrain] Failed to enable terrain:', error);
    return { success: false, deferred: false };
  }
}

/**
 * Disable terrain and return to flat map
 */
export function disableTerrain(map: mapboxgl.Map): void {
  try {
    map.setTerrain(null);
  } catch (error) {
    console.warn('[Terrain] Failed to disable terrain:', error);
  }
}

/**
 * Add atmospheric sky layer for realistic sky when camera is pitched
 * Returns { success: boolean, deferred: boolean }
 */
export function addSkyLayer(map: mapboxgl.Map): { success: boolean; deferred: boolean } {
  try {
    // Check if style is loaded
    if (!map.isStyleLoaded()) {
      console.warn('[Sky] Style not loaded yet, deferring sky layer setup');
      return { success: false, deferred: true };
    }

    // Skip if layer already exists
    if (map.getLayer(SKY_LAYER_ID)) {
      return { success: true, deferred: false };
    }

    map.addLayer({
      id: SKY_LAYER_ID,
      type: 'sky',
      paint: {
        'sky-type': 'atmosphere',
        'sky-atmosphere-sun': [0.0, 0.0],
        'sky-atmosphere-sun-intensity': 15,
      },
    });

    return { success: true, deferred: false };
  } catch (error) {
    console.warn('[Sky] Failed to add sky layer:', error);
    return { success: false, deferred: false };
  }
}

/**
 * Remove sky layer
 */
export function removeSkyLayer(map: mapboxgl.Map): void {
  try {
    if (map.getLayer(SKY_LAYER_ID)) {
      map.removeLayer(SKY_LAYER_ID);
    }
  } catch (error) {
    console.warn('[Sky] Failed to remove sky layer:', error);
  }
}

/**
 * Enable full 3D mode with terrain and sky
 * Returns { success: boolean, deferred: boolean }
 */
export function enable3DMode(
  map: mapboxgl.Map, 
  terrainExaggeration: number = 1.2
): { success: boolean; deferred: boolean } {
  const terrainResult = enableTerrain(map, terrainExaggeration);
  const skyResult = addSkyLayer(map);
  
  // If either is deferred, the whole operation is deferred
  const isDeferred = terrainResult.deferred || skyResult.deferred;
  
  // Success only if both succeeded (and not deferred)
  const isSuccess = terrainResult.success && skyResult.success && !isDeferred;
  
  if (!terrainResult.success && !terrainResult.deferred) {
    console.warn('[3D Mode] Terrain not available, continuing in 2D mode');
  }
  
  if (!skyResult.success && !skyResult.deferred) {
    console.warn('[3D Mode] Sky layer not available');
  }
  
  // Always apply camera animation, even if terrain/sky failed
  try {
    map.easeTo({
      pitch: DEFAULT_3D_CAMERA.pitch,
      bearing: DEFAULT_3D_CAMERA.bearing,
      duration: 1000,
    });
  } catch (error) {
    console.warn('[3D Mode] Camera animation failed:', error);
  }
  
  return { success: isSuccess, deferred: isDeferred };
}

/**
 * Disable 3D mode and return to flat 2D view
 */
export function disable3DMode(map: mapboxgl.Map): void {
  disableTerrain(map);
  removeSkyLayer(map);
  
  try {
    map.easeTo({
      pitch: DEFAULT_2D_CAMERA.pitch,
      bearing: DEFAULT_2D_CAMERA.bearing,
      duration: 1000,
    });
  } catch (error) {
    console.warn('[2D Mode] Camera animation failed:', error);
  }
}

/**
 * Toggle between 2D and 3D modes
 * Returns true if successful, false if 3D features are not supported
 * Only calls onError if there's a true failure (not if deferred)
 */
export function toggle3DMode(
  map: mapboxgl.Map, 
  is3DEnabled: boolean, 
  terrainExaggeration: number = 1.2,
  onError?: (message: string) => void
): boolean {
  if (is3DEnabled) {
    const result = enable3DMode(map, terrainExaggeration);
    
    // Only show error toast if it's a true failure (not deferred)
    if (!result.success && !result.deferred && onError) {
      onError('3D mode limited on this device');
    }
    
    return result.success;
  } else {
    disable3DMode(map);
    return true;
  }
}
