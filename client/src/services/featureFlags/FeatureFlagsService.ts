/**
 * FeatureFlagsService - Regional feature restrictions
 * Controls feature availability based on user's country/region
 */

import type { Region } from '@shared/global.config';
import { UiMode } from '@/types/ui';

interface FeatureAvailability {
  ar: boolean;
  nightVision: boolean;
  [key: string]: boolean;
}

// AR-supported countries (ISO country codes)
const AR_SUPPORTED_COUNTRIES = [
  'US', 'CA', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'NO', 'DK', 'FI',
  'AU', 'NZ', 'JP', 'KR', 'SG', 'HK', 'TW', 'AE', 'SA', 'IL',
  'CH', 'AT', 'BE', 'IE', 'PT', 'GR', 'CZ', 'PL', 'HU',
  // Balkan region
  'HR', 'SI', 'AL', 'RS', 'BA', 'ME', 'MK', 'RO', 'BG',
];

// Region to country mapping (simplified - in production would use more precise geolocation)
const REGION_COUNTRIES: Record<Region, string[]> = {
  EU: ['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'NO', 'DK', 'FI', 'CH', 'AT', 'BE', 'IE', 'PT', 'GR', 'CZ', 'PL', 'HU', 'HR', 'SI', 'AL', 'RS', 'BA', 'ME', 'MK', 'RO', 'BG'],
  US: ['US', 'CA'],
  ASIA: ['JP', 'KR', 'SG', 'HK', 'TW', 'IN', 'TH', 'MY', 'PH', 'ID', 'VN'],
  MENA: ['AE', 'SA', 'IL', 'QA', 'KW', 'BH', 'OM', 'JO', 'LB', 'EG', 'TR'],
  AFRICA: ['ZA', 'NG', 'KE', 'GH', 'EG', 'MA', 'TN', 'ET', 'UG', 'TZ'],
  LATAM: ['MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'VE', 'EC', 'BO', 'PY', 'UY'],
};

class FeatureFlagsService {
  private currentRegion: Region = 'EU';
  private currentCountry: string = 'US';
  private features: FeatureAvailability = {
    ar: false,
    nightVision: true, // Available globally
  };

  /**
   * Initialize feature flags based on user's region and country code
   */
  async initialize(region: Region, countryCode: string): Promise<void> {
    this.currentRegion = region;
    this.currentCountry = countryCode.toUpperCase();
    
    // Update feature availability
    this.updateFeatureAvailability();
  }

  /**
   * Update feature availability based on current location
   */
  private updateFeatureAvailability(): void {
    // AR mode - only available in supported countries
    this.features.ar = AR_SUPPORTED_COUNTRIES.includes(this.currentCountry);
    
    // Night Vision - available globally
    this.features.nightVision = true;
  }

  /**
   * Check if AR mode is available
   */
  isARAvailable(): boolean {
    return this.features.ar;
  }

  /**
   * Check if Night Vision is available
   */
  isNightVisionAvailable(): boolean {
    return this.features.nightVision;
  }

  /**
   * Check if a UI mode is available
   */
  isModeAvailable(mode: UiMode): boolean {
    switch (mode) {
      case 'AR':
        return this.isARAvailable();
      case 'VR':
        return this.isARAvailable(); // VR has same restrictions as AR
      default:
        return true; // All other modes available globally
    }
  }

  /**
   * Get feature availability
   */
  getFeatureAvailability(): FeatureAvailability {
    return { ...this.features };
  }

  /**
   * Get current country
   */
  getCurrentCountry(): string {
    return this.currentCountry;
  }

  /**
   * Get current region
   */
  getCurrentRegion(): Region {
    return this.currentRegion;
  }

  /**
   * Get list of AR-supported countries
   */
  getARSupportedCountries(): string[] {
    return [...AR_SUPPORTED_COUNTRIES];
  }
}

export const featureFlagsService = new FeatureFlagsService();
