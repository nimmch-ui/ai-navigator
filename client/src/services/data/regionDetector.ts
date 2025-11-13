import type { Region } from './types';
import { PreferencesService } from '@/services/preferences';

const COUNTRY_TO_REGION_MAP: Record<string, Region> = {
  'CH': 'CH',
  'LI': 'CH',
  'AT': 'EU',
  'DE': 'EU',
  'FR': 'EU',
  'IT': 'EU',
  'ES': 'EU',
  'PT': 'EU',
  'NL': 'EU',
  'BE': 'EU',
  'LU': 'EU',
  'GB': 'EU',
  'IE': 'EU',
  'DK': 'EU',
  'SE': 'EU',
  'FI': 'EU',
  'NO': 'EU',
  'IS': 'EU',
  'PL': 'EU',
  'CZ': 'EU',
  'SK': 'EU',
  'HU': 'EU',
  'RO': 'EU',
  'BG': 'EU',
  'GR': 'EU',
  'HR': 'EU',
  'SI': 'EU',
  'EE': 'EU',
  'LV': 'EU',
  'LT': 'EU',
  'MT': 'EU',
  'CY': 'EU',
  'AL': 'EU',
  'RS': 'EU',
  'ME': 'EU',
  'BA': 'EU',
  'MK': 'EU',
  'XK': 'EU',
  'US': 'US',
  'CA': 'US',
  'MX': 'US',
  'IN': 'IN',
  'PK': 'IN',
  'BD': 'IN',
  'LK': 'IN',
  'NP': 'IN',
  'BT': 'IN',
  'AE': 'ME',
  'SA': 'ME',
  'QA': 'ME',
  'KW': 'ME',
  'OM': 'ME',
  'BH': 'ME',
  'JO': 'ME',
  'LB': 'ME',
  'IL': 'ME',
  'IQ': 'ME',
  'SY': 'ME',
  'YE': 'ME',
  'EG': 'ME',
  'TR': 'ME',
};

const LOCALE_TO_REGION_FALLBACK: Record<string, Region> = {
  'en': 'EU',
  'en-US': 'US',
  'en-GB': 'EU',
  'de': 'EU',
  'de-CH': 'CH',
  'fr': 'EU',
  'fr-CH': 'CH',
  'it': 'EU',
  'it-CH': 'CH',
  'es': 'EU',
  'hi': 'IN',
  'bn': 'IN',
  'ar': 'ME',
  'tr': 'ME',
  'sq-AL': 'EU',
  'sr': 'EU',
  'sl-SI': 'EU',
  'pt-BR': 'GLOBAL',
  'zh-CN': 'GLOBAL',
};

export class RegionDetector {
  private static cachedRegion: Region | null = null;
  private static lastDetectionTime = 0;
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000;

  static async detectRegion(): Promise<Region> {
    const now = Date.now();
    if (this.cachedRegion && (now - this.lastDetectionTime) < this.CACHE_DURATION) {
      return this.cachedRegion;
    }

    try {
      const region = await this.detectByGeolocation();
      this.cachedRegion = region;
      this.lastDetectionTime = now;
      return region;
    } catch (error) {
      console.warn('[RegionDetector] Geolocation failed, falling back to locale detection', error);
      const region = this.detectByLocale();
      this.cachedRegion = region;
      this.lastDetectionTime = now;
      return region;
    }
  }

  private static async detectByGeolocation(): Promise<Region> {
    const response = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Geolocation API error: ${response.status}`);
    }

    const data = await response.json();
    const countryCode = data.country_code?.toUpperCase();

    if (countryCode && COUNTRY_TO_REGION_MAP[countryCode]) {
      return COUNTRY_TO_REGION_MAP[countryCode];
    }

    const continent = data.continent_code;
    if (continent === 'EU') return 'EU';
    if (continent === 'NA') return 'US';
    if (continent === 'AS' && (countryCode === 'IN' || countryCode === 'PK' || countryCode === 'BD')) {
      return 'IN';
    }
    if (continent === 'AS') return 'GLOBAL';

    return 'GLOBAL';
  }

  private static detectByLocale(): Region {
    const prefs = PreferencesService.getPreferences();
    const locale = prefs.language;
    
    if (LOCALE_TO_REGION_FALLBACK[locale]) {
      return LOCALE_TO_REGION_FALLBACK[locale];
    }

    const languageCode = locale.split('-')[0];
    if (languageCode === 'en') return 'EU';
    if (languageCode === 'de' || languageCode === 'fr' || languageCode === 'it') return 'EU';
    if (languageCode === 'es' || languageCode === 'pt') return 'GLOBAL';
    if (languageCode === 'hi' || languageCode === 'bn') return 'IN';
    if (languageCode === 'ar' || languageCode === 'tr') return 'ME';
    if (languageCode === 'zh') return 'GLOBAL';

    return 'EU';
  }

  static clearCache(): void {
    this.cachedRegion = null;
    this.lastDetectionTime = 0;
  }

  static setRegion(region: Region): void {
    this.cachedRegion = region;
    this.lastDetectionTime = Date.now();
  }
}
