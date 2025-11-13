export const USER_DATA_SCHEMA_VERSION = 1;

export interface UserIdentity {
  userId: string;
  createdAt: number;
  schemaVersion: number;
}

export interface UserProfile {
  id: string;
  displayName: string;
  avatarEmoji?: string;
  avatarColor?: string;
  preferredLanguage: string;
  units: 'metric' | 'imperial';
  createdAt: number;
  updatedAt: number;
  schemaVersion: number;
}

export type FavoritePlaceType = 'home' | 'work' | 'custom';

export interface FavoritePlace {
  id: string;
  label: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  address?: string;
  type: FavoritePlaceType;
  createdAt: number;
  lastUsedAt: number;
  schemaVersion: number;
}

export interface TripRecord {
  id: string;
  start: {
    lat: number;
    lng: number;
    address?: string;
  };
  end: {
    lat: number;
    lng: number;
    address?: string;
  };
  distanceKm: number;
  durationSec: number;
  ecoScore?: number;
  avgSpeedKmh: number;
  timestamp: number;
  modeUsed: 'car' | 'bike' | 'walk' | 'transit';
  routePreference?: 'fastest' | 'shortest' | 'eco';
  schemaVersion: number;
}

export interface UserDataMetadata {
  lastSyncedAt?: number;
  version: number;
  updatedAt: number;
}

export interface UserDataEnvelope {
  identity: UserIdentity;
  profile: UserProfile;
  favorites: FavoritePlace[];
  trips: TripRecord[];
  metadata: UserDataMetadata;
}

export function createDefaultProfile(userId: string, language: string = 'en'): UserProfile {
  const now = Date.now();
  return {
    id: userId,
    displayName: 'Navigator',
    avatarEmoji: '🗺️',
    preferredLanguage: language,
    units: 'metric',
    createdAt: now,
    updatedAt: now,
    schemaVersion: USER_DATA_SCHEMA_VERSION,
  };
}

export function createFavoritePlace(
  label: string,
  coordinates: { lat: number; lng: number },
  type: FavoritePlaceType = 'custom',
  address?: string
): FavoritePlace {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    label,
    coordinates,
    address,
    type,
    createdAt: now,
    lastUsedAt: now,
    schemaVersion: USER_DATA_SCHEMA_VERSION,
  };
}

export function createTripRecord(
  start: { lat: number; lng: number; address?: string },
  end: { lat: number; lng: number; address?: string },
  distanceKm: number,
  durationSec: number,
  modeUsed: 'car' | 'bike' | 'walk' | 'transit',
  avgSpeedKmh: number,
  ecoScore?: number,
  routePreference?: 'fastest' | 'shortest' | 'eco'
): TripRecord {
  return {
    id: crypto.randomUUID(),
    start,
    end,
    distanceKm,
    durationSec,
    avgSpeedKmh,
    ecoScore,
    timestamp: Date.now(),
    modeUsed,
    routePreference,
    schemaVersion: USER_DATA_SCHEMA_VERSION,
  };
}

export function createUserIdentity(): UserIdentity {
  return {
    userId: crypto.randomUUID(),
    createdAt: Date.now(),
    schemaVersion: USER_DATA_SCHEMA_VERSION,
  };
}

export function createEmptyEnvelope(identity: UserIdentity, profile: UserProfile): UserDataEnvelope {
  return {
    identity,
    profile,
    favorites: [],
    trips: [],
    metadata: {
      version: USER_DATA_SCHEMA_VERSION,
      updatedAt: Date.now(),
    },
  };
}

export type UserDataResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string; code?: 'QUOTA_EXCEEDED' | 'STORAGE_ERROR' | 'INVALID_DATA' };

export function successResult<T>(data: T): UserDataResult<T> {
  return { success: true, data };
}

export function errorResult<T>(error: string, code?: 'QUOTA_EXCEEDED' | 'STORAGE_ERROR' | 'INVALID_DATA'): UserDataResult<T> {
  return { success: false, error, code };
}
