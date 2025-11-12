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
 */
export function enableTerrain(map: mapboxgl.Map, exaggeration: number = 1.2) {
  if (!map.getSource(TERRAIN_SOURCE_ID)) {
    map.addSource(TERRAIN_SOURCE_ID, {
      type: 'raster-dem',
      url: TERRAIN_SOURCE_URL,
      tileSize: 512,
      maxzoom: 14,
    });
  }

  map.setTerrain({
    source: TERRAIN_SOURCE_ID,
    exaggeration,
  });
}

/**
 * Disable terrain and return to flat map
 */
export function disableTerrain(map: mapboxgl.Map) {
  map.setTerrain(null);
}

/**
 * Add atmospheric sky layer for realistic sky when camera is pitched
 */
export function addSkyLayer(map: mapboxgl.Map) {
  if (map.getLayer(SKY_LAYER_ID)) {
    return;
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
}

/**
 * Remove sky layer
 */
export function removeSkyLayer(map: mapboxgl.Map) {
  if (map.getLayer(SKY_LAYER_ID)) {
    map.removeLayer(SKY_LAYER_ID);
  }
}

/**
 * Enable full 3D mode with terrain and sky
 */
export function enable3DMode(map: mapboxgl.Map, terrainExaggeration: number = 1.2) {
  enableTerrain(map, terrainExaggeration);
  addSkyLayer(map);
  
  map.easeTo({
    pitch: DEFAULT_3D_CAMERA.pitch,
    bearing: DEFAULT_3D_CAMERA.bearing,
    duration: 1000,
  });
}

/**
 * Disable 3D mode and return to flat 2D view
 */
export function disable3DMode(map: mapboxgl.Map) {
  disableTerrain(map);
  removeSkyLayer(map);
  
  map.easeTo({
    pitch: DEFAULT_2D_CAMERA.pitch,
    bearing: DEFAULT_2D_CAMERA.bearing,
    duration: 1000,
  });
}

/**
 * Toggle between 2D and 3D modes
 */
export function toggle3DMode(map: mapboxgl.Map, is3DEnabled: boolean, terrainExaggeration: number = 1.2) {
  if (is3DEnabled) {
    enable3DMode(map, terrainExaggeration);
  } else {
    disable3DMode(map);
  }
}
