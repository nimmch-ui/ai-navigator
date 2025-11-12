/**
 * Deep Links Service
 * Handles URL query parameters and hash routes for shareability
 * Supports: ?mode=classic|3d|cinematic|ar|vr|eco
 * Hash route: #nav:start=lat,lng&end=lat,lng&mode=...
 */

import { UiMode } from '@/types/ui';
import { ModeManager } from './ui/ModeManager';

export interface DeepLinkParams {
  mode?: UiMode;
  start?: { lat: number; lng: number };
  end?: { lat: number; lng: number };
}

class DeepLinksService {
  /**
   * Parse URL query parameters
   */
  parseQueryParams(): DeepLinkParams {
    if (typeof window === 'undefined') {
      return {};
    }

    const params = new URLSearchParams(window.location.search);
    const result: DeepLinkParams = {};

    // Parse mode parameter
    const modeParam = params.get('mode')?.toLowerCase();
    if (modeParam) {
      const mode = this.parseModeString(modeParam);
      if (mode) {
        result.mode = mode;
      }
    }

    return result;
  }

  /**
   * Parse hash route: #nav:start=lat,lng&end=lat,lng&mode=...
   */
  parseHashRoute(): DeepLinkParams {
    if (typeof window === 'undefined') {
      return {};
    }

    const hash = window.location.hash;
    if (!hash || !hash.startsWith('#nav:')) {
      return {};
    }

    const result: DeepLinkParams = {};
    const paramsString = hash.replace('#nav:', '');
    const params = new URLSearchParams(paramsString);

    // Parse start coordinate
    const startParam = params.get('start');
    if (startParam) {
      const coords = this.parseCoordinates(startParam);
      if (coords) {
        result.start = coords;
      }
    }

    // Parse end coordinate
    const endParam = params.get('end');
    if (endParam) {
      const coords = this.parseCoordinates(endParam);
      if (coords) {
        result.end = coords;
      }
    }

    // Parse mode
    const modeParam = params.get('mode')?.toLowerCase();
    if (modeParam) {
      const mode = this.parseModeString(modeParam);
      if (mode) {
        result.mode = mode;
      }
    }

    return result;
  }

  /**
   * Parse all deep link parameters (query + hash)
   */
  parseDeepLinks(): DeepLinkParams {
    const queryParams = this.parseQueryParams();
    const hashParams = this.parseHashRoute();

    // Hash params take precedence over query params
    return {
      ...queryParams,
      ...hashParams,
    };
  }

  /**
   * Apply deep link parameters (auto-load mode, navigation)
   */
  async applyDeepLinks(): Promise<void> {
    const params = this.parseDeepLinks();

    console.log('[DeepLinks] Parsed parameters:', params);

    // Apply mode if specified
    if (params.mode) {
      console.log(`[DeepLinks] Auto-loading mode: ${params.mode}`);
      
      // Use ModeManager.enter() to ensure proper lifecycle, analytics, and fallback handling
      await ModeManager.enter(params.mode);
    }

    // Note: Navigation start/end will be handled by navigation service in future
    if (params.start && params.end) {
      console.log('[DeepLinks] Navigation coordinates detected:', params);
      // TODO: Trigger navigation when navigation service supports it
    }
  }

  /**
   * Generate shareable URL with current mode
   */
  generateShareableURL(mode: UiMode, start?: { lat: number; lng: number }, end?: { lat: number; lng: number }): string {
    if (typeof window === 'undefined') {
      return '';
    }

    const baseUrl = window.location.origin + window.location.pathname;
    const modeString = this.modeToString(mode);

    if (start && end) {
      // Use hash route for navigation
      const hash = `#nav:start=${start.lat},${start.lng}&end=${end.lat},${end.lng}&mode=${modeString}`;
      return baseUrl + hash;
    } else {
      // Use query param for mode only
      return `${baseUrl}?mode=${modeString}`;
    }
  }

  /**
   * Update URL without reload (for sharing)
   */
  updateURL(mode: UiMode): void {
    if (typeof window === 'undefined') {
      return;
    }

    const modeString = this.modeToString(mode);
    const newUrl = `${window.location.pathname}?mode=${modeString}`;
    
    // Update URL without reload
    window.history.replaceState({}, '', newUrl);
  }

  /**
   * Parse mode string to UiMode enum
   */
  private parseModeString(modeStr: string): UiMode | null {
    const modeMap: Record<string, UiMode> = {
      'classic': UiMode.CLASSIC,
      'threed': UiMode.THREED,
      '3d': UiMode.THREED,
      'cinematic': UiMode.CINEMATIC,
      'ar': UiMode.AR,
      'vr': UiMode.VR,
      'eco': UiMode.ECO,
    };

    return modeMap[modeStr] || null;
  }

  /**
   * Convert UiMode enum to string
   */
  private modeToString(mode: UiMode): string {
    const modeMap: Record<UiMode, string> = {
      [UiMode.CLASSIC]: 'classic',
      [UiMode.THREED]: '3d',
      [UiMode.CINEMATIC]: 'cinematic',
      [UiMode.AR]: 'ar',
      [UiMode.VR]: 'vr',
      [UiMode.ECO]: 'eco',
    };

    return modeMap[mode] || 'classic';
  }

  /**
   * Parse coordinates from string (lat,lng)
   */
  private parseCoordinates(coordStr: string): { lat: number; lng: number } | null {
    const parts = coordStr.split(',').map(s => s.trim());
    if (parts.length !== 2) {
      return null;
    }

    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);

    if (isNaN(lat) || isNaN(lng)) {
      return null;
    }

    // Validate coordinate ranges
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return null;
    }

    return { lat, lng };
  }
}

// Singleton instance
export const DeepLinks = new DeepLinksService();
