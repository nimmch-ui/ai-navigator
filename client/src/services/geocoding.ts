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
 * Search for places with autocomplete support (multi-result)
 * Use this for search bars and location lookups that need multiple suggestions.
 */
export async function searchPlaces(
  query: string,
  options?: {
    signal?: AbortSignal;
    limit?: number;
    proximity?: [number, number];
  }
): Promise<GeocodingResult[]> {
  if (!MAPBOX_TOKEN) {
    console.error('Mapbox token not configured');
    return [];
  }

  if (!query.trim()) {
    return [];
  }

  try {
    const encodedQuery = encodeURIComponent(query);
    const limit = options?.limit || 5;
    let url = `${GEOCODING_API}/${encodedQuery}.json?access_token=${MAPBOX_TOKEN}&limit=${limit}`;
    
    if (options?.proximity) {
      const [lat, lng] = options.proximity;
      url += `&proximity=${lng},${lat}`;
    }

    const response = await fetch(url, { signal: options?.signal });

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      return data.features.map((feature: any) => {
        const [lng, lat] = feature.center;
        return {
          address: feature.place_name,
          coordinates: [lat, lng] as [number, number],
          placeName: feature.text
        };
      });
    }

    return [];
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return [];
    }
    console.error('Geocoding error:', error);
    return [];
  }
}

/**
 * Geocode an address to coordinates (single result)
 * Use this for direct address-to-coordinate conversion (e.g., Favorites).
 */
export async function geocodeAddress(
  address: string,
  signal?: AbortSignal
): Promise<GeocodingResult | null> {
  const results = await searchPlaces(address, { signal, limit: 1 });
  return results.length > 0 ? results[0] : null;
}

/**
 * Reverse geocode coordinates to an address
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<string | null> {
  if (!MAPBOX_TOKEN) {
    console.error('Mapbox token not configured');
    return null;
  }

  try {
    const response = await fetch(
      `${GEOCODING_API}/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`,
      { signal }
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
    if (error instanceof Error && error.name === 'AbortError') {
      return null;
    }
    console.error('Reverse geocoding error:', error);
    return null;
  }
}
