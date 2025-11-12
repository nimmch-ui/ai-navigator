import { UiMode } from "@/types/ui";

export type TransportMode = "car" | "bike" | "walk" | "transit";
export type RoutePreference = "fastest" | "shortest" | "eco";
export type VehicleType = "car" | "ev" | "bike" | "walk";
export type SpeedUnit = "kmh" | "mph";
export type MapTheme = "auto" | "day" | "night";
export type ARPermissionStatus = "granted" | "denied" | "prompt" | "unknown";

export interface ARSensorCapabilities {
  hasWebXR: boolean;
  hasDeviceOrientation: boolean;
  hasCamera: boolean;
}

export interface RerouteSettings {
  enabled: boolean;
  etaIncreaseThresholdPercent: number;
  offRouteDistanceMeters: number;
  autoAccept: boolean;
  minTimeSavingsMinutes: number;
}

export interface RealismPackSettings {
  weatherLighting: boolean;
  motionPolish: boolean;
  radarPulse: boolean;
}

export interface UserPreferences {
  schemaVersion?: number;
  transportMode: TransportMode;
  routePreference: RoutePreference;
  voiceGuidance: boolean;
  voiceVolume: number;
  hapticsEnabled: boolean;
  hazardAlerts: boolean;
  ecoMode: boolean;
  vehicleType: VehicleType;
  showSpeedCameras: boolean;
  speedWarnings: boolean;
  speedUnit: SpeedUnit;
  cinematicMode: boolean;
  mapTheme: MapTheme;
  radarEnabled: boolean;
  radarOpacity: number;
  arPreviewEnabled: boolean;
  arPermissionStatus: ARPermissionStatus;
  arSensorCapabilities: ARSensorCapabilities;
  rerouteSettings: RerouteSettings;
  realismPack: RealismPackSettings;
  uiMode: UiMode;
  spatialAudio: boolean;
  ambientMusic: boolean;
  is3DMode?: boolean;
}

const CURRENT_SCHEMA_VERSION = 1;

const DEFAULT_PREFERENCES: UserPreferences = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  transportMode: "car",
  routePreference: "fastest",
  voiceGuidance: true,
  voiceVolume: 1.0,
  hapticsEnabled: true,
  hazardAlerts: true,
  ecoMode: false,
  vehicleType: "car",
  showSpeedCameras: true,
  speedWarnings: true,
  speedUnit: "kmh",
  cinematicMode: false,
  mapTheme: "auto",
  radarEnabled: false,
  radarOpacity: 0.6,
  arPreviewEnabled: false,
  arPermissionStatus: "unknown",
  arSensorCapabilities: {
    hasWebXR: false,
    hasDeviceOrientation: false,
    hasCamera: false,
  },
  rerouteSettings: {
    enabled: true,
    etaIncreaseThresholdPercent: 15,
    offRouteDistanceMeters: 100,
    autoAccept: false,
    minTimeSavingsMinutes: 2,
  },
  realismPack: {
    weatherLighting: true,
    motionPolish: true,
    radarPulse: true,
  },
  uiMode: UiMode.THREED,
  spatialAudio: false,
  ambientMusic: false,
  is3DMode: true,
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
