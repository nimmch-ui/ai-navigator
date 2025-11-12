export type TransportMode = "car" | "bike" | "walk" | "transit";
export type RoutePreference = "fastest" | "shortest" | "eco";
export type VehicleType = "car" | "ev" | "bike" | "walk";
export type SpeedUnit = "kmh" | "mph";

export interface UserPreferences {
  transportMode: TransportMode;
  routePreference: RoutePreference;
  voiceGuidance: boolean;
  hazardAlerts: boolean;
  ecoMode: boolean;
  vehicleType: VehicleType;
  showSpeedCameras: boolean;
  speedWarnings: boolean;
  speedUnit: SpeedUnit;
  cinematicMode: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  transportMode: "car",
  routePreference: "fastest",
  voiceGuidance: true,
  hazardAlerts: true,
  ecoMode: false,
  vehicleType: "car",
  showSpeedCameras: true,
  speedWarnings: true,
  speedUnit: "kmh",
  cinematicMode: false
};

const PREFERENCES_KEY = "ai_navigator_preferences";

export class PreferencesService {
  static getPreferences(): UserPreferences {
    try {
      const stored = localStorage.getItem(PREFERENCES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_PREFERENCES, ...parsed };
      }
    } catch (error) {
      console.error("Failed to load preferences:", error);
    }
    return DEFAULT_PREFERENCES;
  }

  static savePreferences(preferences: Partial<UserPreferences>): void {
    try {
      const current = this.getPreferences();
      const updated = { ...current, ...preferences };
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Failed to save preferences:", error);
    }
  }

  static updatePreference<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ): void {
    this.savePreferences({ [key]: value });
  }

  static resetPreferences(): void {
    try {
      localStorage.removeItem(PREFERENCES_KEY);
    } catch (error) {
      console.error("Failed to reset preferences:", error);
    }
  }
}
