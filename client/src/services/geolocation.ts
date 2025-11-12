import { GlobalConfig, type Region } from "@shared/global.config";

export interface UserLocation {
  continentCode: string;
  region: Region;
  language: string;
  timezone: string;
}

class GeolocationService {
  private cachedLocation: UserLocation | null = null;
  private readonly STORAGE_KEY = "ai-navigator-user-location";

  async detectUserLocation(): Promise<UserLocation> {
    if (this.cachedLocation) {
      return this.cachedLocation;
    }

    const stored = this.getStoredLocation();
    if (stored) {
      this.cachedLocation = stored;
      return stored;
    }

    const location = await this.fetchUserLocation();
    this.storeLocation(location);
    this.cachedLocation = location;
    return location;
  }

  private async fetchUserLocation(): Promise<UserLocation> {
    try {
      const response = await fetch("https://ipapi.co/json/", {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error("Geolocation API failed");
      }

      const data = await response.json();
      
      const continentCode = data.continent_code || "EU";
      const region = this.mapContinentToRegion(continentCode);
      const language = this.detectLanguage();
      const timezone = data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

      return {
        continentCode,
        region,
        language,
        timezone,
      };
    } catch (error) {
      console.warn("[Geolocation] Failed to detect location, using defaults:", error);
      return this.getDefaultLocation();
    }
  }

  private mapContinentToRegion(continentCode: string): Region {
    const region = GlobalConfig.continentToRegion[continentCode];
    return region || GlobalConfig.defaultRegion;
  }

  private detectLanguage(): string {
    const browserLang = navigator.language || navigator.languages?.[0];
    return browserLang?.split("-")[0] || GlobalConfig.defaultLanguage;
  }

  private getDefaultLocation(): UserLocation {
    return {
      continentCode: "EU",
      region: GlobalConfig.defaultRegion,
      language: this.detectLanguage(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  private getStoredLocation(): UserLocation | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      const timestamp = parsed.timestamp;
      const ONE_DAY = 24 * 60 * 60 * 1000;

      if (Date.now() - timestamp > ONE_DAY) {
        localStorage.removeItem(this.STORAGE_KEY);
        return null;
      }

      return parsed.location;
    } catch {
      return null;
    }
  }

  private storeLocation(location: UserLocation): void {
    try {
      localStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify({
          location,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.warn("[Geolocation] Failed to store location:", error);
    }
  }

  clearCache(): void {
    this.cachedLocation = null;
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

export const geolocationService = new GeolocationService();
