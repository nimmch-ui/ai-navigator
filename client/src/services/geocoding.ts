/**
 * Geocoding Service - Convert addresses to coordinates using Mapbox Geocoding API
 */

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const GEOCODING_API = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

export interface GeocodingResult {
  address: string;
  coordinates: [number, number]; // [lat, lng]
  placeName: string;
}

/**
 * Geocode an address to coordinates
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  if (!MAPBOX_TOKEN) {
    console.error('Mapbox token not configured');
    return null;
  }

  if (!address.trim()) {
    return null;
  }

  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `${GEOCODING_API}/${encodedAddress}.json?access_token=${MAPBOX_TOKEN}&limit=1`
    );

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      const [lng, lat] = feature.center;
      
      return {
        address: feature.place_name,
        coordinates: [lat, lng],
        placeName: feature.text
      };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Reverse geocode coordinates to an address
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (!MAPBOX_TOKEN) {
    console.error('Mapbox token not configured');
    return null;
  }

  try {
    const response = await fetch(
      `${GEOCODING_API}/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`
    );

    if (!response.ok) {
      throw new Error(`Reverse geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      return data.features[0].place_name;
    }

    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}
