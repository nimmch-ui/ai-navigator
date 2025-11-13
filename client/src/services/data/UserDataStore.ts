import { get, set, del, keys } from 'idb-keyval';
import { EventBus } from '../eventBus';
import type {
  UserDataEnvelope,
  UserProfile,
  FavoritePlace,
  TripRecord,
  UserDataResult,
  FavoritePlaceType,
} from './userDataModels';
import {
  createUserIdentity,
  createDefaultProfile,
  createEmptyEnvelope,
  createFavoritePlace,
  createTripRecord,
  successResult,
  errorResult,
  USER_DATA_SCHEMA_VERSION,
} from './userDataModels';

const USERDATA_KEY = 'ai-navigator:userdata';
const MAX_TRIPS = 100;
const MAX_FAVORITES = 50;

class UserDataStore {
  private envelope: UserDataEnvelope | null = null;
  private initialized = false;

  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const stored = await get<UserDataEnvelope>(USERDATA_KEY);

      if (stored && this.isValidEnvelope(stored)) {
        const migrated = await this.migrateEnvelope(stored);
        this.envelope = migrated;
        console.log('[UserDataStore] Loaded existing data for user:', this.envelope.identity.userId);
      } else {
        const identity = createUserIdentity();
        const profile = createDefaultProfile(identity.userId, navigator.language.split('-')[0]);
        this.envelope = createEmptyEnvelope(identity, profile);
        await this.persist();
        console.log('[UserDataStore] Created new user data:', this.envelope.identity.userId);
      }

      this.initialized = true;
      await this.migrateLegacyTripHistory();
    } catch (error) {
      console.error('[UserDataStore] Initialization error:', error);
      const identity = createUserIdentity();
      const profile = createDefaultProfile(identity.userId);
      this.envelope = createEmptyEnvelope(identity, profile);
      this.initialized = true;
    }
  }

  private isValidEnvelope(data: any): data is UserDataEnvelope {
    return (
      data &&
      typeof data === 'object' &&
      data.identity &&
      data.profile &&
      Array.isArray(data.favorites) &&
      Array.isArray(data.trips) &&
      data.metadata
    );
  }

  private async migrateEnvelope(envelope: UserDataEnvelope): Promise<UserDataEnvelope> {
    if (envelope.metadata.version === USER_DATA_SCHEMA_VERSION) {
      return envelope;
    }

    console.log('[UserDataStore] Migrating from version', envelope.metadata.version, 'to', USER_DATA_SCHEMA_VERSION);
    
    const migrated = { ...envelope };
    migrated.metadata.version = USER_DATA_SCHEMA_VERSION;
    migrated.metadata.updatedAt = Date.now();

    await this.persist();
    EventBus.emit('userdata:migrationCompleted', {
      from: envelope.metadata.version,
      to: USER_DATA_SCHEMA_VERSION,
    });

    return migrated;
  }

  private async migrateLegacyTripHistory(): Promise<void> {
    try {
      const legacy = localStorage.getItem('ai_navigator_trip_history');
      if (!legacy) return;

      const parsed = JSON.parse(legacy);
      if (!Array.isArray(parsed) || parsed.length === 0) return;

      console.log('[UserDataStore] Migrating', parsed.length, 'legacy trips');

      for (const oldTrip of parsed) {
        if (oldTrip.origin && oldTrip.destination && oldTrip.timestamp) {
          const parseCoords = (val: any): { lat: number; lng: number; address?: string } => {
            if (Array.isArray(val) && val.length === 2 && typeof val[0] === 'number') {
              return { lat: val[0], lng: val[1] };
            }
            if (typeof val === 'string') {
              return { lat: 0, lng: 0, address: val };
            }
            return { lat: 0, lng: 0 };
          };

          const start = parseCoords(oldTrip.origin);
          const end = parseCoords(oldTrip.destination);

          const trip = createTripRecord(
            start,
            end,
            oldTrip.distance || 0,
            (oldTrip.duration || 0) * 60,
            oldTrip.transportMode || oldTrip.mode || 'car',
            oldTrip.avgSpeed || 0,
            undefined,
            oldTrip.routePreference || 'fastest'
          );
          trip.timestamp = oldTrip.timestamp;
          this.envelope!.trips.push(trip);
        }
      }

      this.envelope!.trips.sort((a, b) => b.timestamp - a.timestamp);
      if (this.envelope!.trips.length > MAX_TRIPS) {
        this.envelope!.trips = this.envelope!.trips.slice(0, MAX_TRIPS);
      }

      await this.persist();
      localStorage.removeItem('ai_navigator_trip_history');

      EventBus.emit('userdata:migrationCompleted', {
        from: 'legacy_trip_history',
        to: 'userdata_store',
        count: parsed.length,
      });
    } catch (error) {
      console.warn('[UserDataStore] Legacy migration failed:', error);
    }
  }

  private async persist(): Promise<void> {
    if (!this.envelope) return;

    this.envelope.metadata.updatedAt = Date.now();

    try {
      await set(USERDATA_KEY, this.envelope);
    } catch (error: any) {
      if (error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded. Please clear old data.');
      }
      throw error;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
    if (!this.initialized || !this.envelope) {
      throw new Error('UserDataStore not initialized. Call initialize() first.');
    }
  }

  async getIdentity(): Promise<string> {
    await this.ensureInitialized();
    return this.envelope!.identity.userId;
  }

  async getProfile(): Promise<UserDataResult<UserProfile>> {
    try {
      await this.ensureInitialized();
      return successResult({ ...this.envelope!.profile });
    } catch (error: any) {
      return errorResult(error.message, 'STORAGE_ERROR');
    }
  }

  async saveProfile(updates: Partial<Omit<UserProfile, 'id' | 'createdAt' | 'schemaVersion'>>): Promise<UserDataResult<UserProfile>> {
    try {
      await this.ensureInitialized();

      this.envelope!.profile = {
        ...this.envelope!.profile,
        ...updates,
        updatedAt: Date.now(),
      };

      await this.persist();
      EventBus.emit('user:profileUpdated', { profile: this.envelope!.profile });

      return successResult({ ...this.envelope!.profile });
    } catch (error: any) {
      if (error.message.includes('quota')) {
        return errorResult('Storage full. Please free up space.', 'QUOTA_EXCEEDED');
      }
      return errorResult(error.message, 'STORAGE_ERROR');
    }
  }

  async listFavorites(): Promise<UserDataResult<FavoritePlace[]>> {
    try {
      await this.ensureInitialized();
      return successResult([...this.envelope!.favorites]);
    } catch (error: any) {
      return errorResult(error.message, 'STORAGE_ERROR');
    }
  }

  async addFavorite(
    label: string,
    coordinates: { lat: number; lng: number },
    type: FavoritePlaceType = 'custom',
    address?: string
  ): Promise<UserDataResult<FavoritePlace>> {
    try {
      await this.ensureInitialized();

      if (this.envelope!.favorites.length >= MAX_FAVORITES) {
        return errorResult(`Maximum ${MAX_FAVORITES} favorites reached`, 'STORAGE_ERROR');
      }

      const favorite = createFavoritePlace(label, coordinates, type, address);
      this.envelope!.favorites.push(favorite);
      await this.persist();

      EventBus.emit('favorites:itemAdded', { favorite });

      return successResult(favorite);
    } catch (error: any) {
      if (error.message.includes('quota')) {
        return errorResult('Storage full. Please free up space.', 'QUOTA_EXCEEDED');
      }
      return errorResult(error.message, 'STORAGE_ERROR');
    }
  }

  async removeFavorite(id: string): Promise<UserDataResult<void>> {
    try {
      await this.ensureInitialized();

      const index = this.envelope!.favorites.findIndex(f => f.id === id);
      if (index === -1) {
        return errorResult('Favorite not found', 'INVALID_DATA');
      }

      const [removed] = this.envelope!.favorites.splice(index, 1);
      await this.persist();

      EventBus.emit('favorites:itemRemoved', { favoriteId: id });

      return successResult(undefined);
    } catch (error: any) {
      return errorResult(error.message, 'STORAGE_ERROR');
    }
  }

  async renameFavorite(id: string, label: string): Promise<UserDataResult<FavoritePlace>> {
    try {
      await this.ensureInitialized();

      const favorite = this.envelope!.favorites.find(f => f.id === id);
      if (!favorite) {
        return errorResult('Favorite not found', 'INVALID_DATA');
      }

      favorite.label = label;
      await this.persist();

      EventBus.emit('favorites:itemUpdated', { favorite });

      return successResult({ ...favorite });
    } catch (error: any) {
      if (error.message.includes('quota')) {
        return errorResult('Storage full. Please free up space.', 'QUOTA_EXCEEDED');
      }
      return errorResult(error.message, 'STORAGE_ERROR');
    }
  }

  async updateFavoriteLastUsed(id: string): Promise<void> {
    try {
      await this.ensureInitialized();

      const favorite = this.envelope!.favorites.find(f => f.id === id);
      if (favorite) {
        favorite.lastUsedAt = Date.now();
        await this.persist();
      }
    } catch (error) {
      console.warn('[UserDataStore] Failed to update favorite lastUsedAt:', error);
    }
  }

  async listTrips(limit?: number): Promise<UserDataResult<TripRecord[]>> {
    try {
      await this.ensureInitialized();
      const trips = [...this.envelope!.trips];
      trips.sort((a, b) => b.timestamp - a.timestamp);
      
      if (limit) {
        return successResult(trips.slice(0, limit));
      }
      
      return successResult(trips);
    } catch (error: any) {
      return errorResult(error.message, 'STORAGE_ERROR');
    }
  }

  async addTrip(
    start: { lat: number; lng: number; address?: string },
    end: { lat: number; lng: number; address?: string },
    distanceKm: number,
    durationSec: number,
    modeUsed: 'car' | 'bike' | 'walk' | 'transit',
    avgSpeedKmh: number,
    ecoScore?: number,
    routePreference?: 'fastest' | 'shortest' | 'eco'
  ): Promise<UserDataResult<TripRecord>> {
    try {
      await this.ensureInitialized();

      const trip = createTripRecord(start, end, distanceKm, durationSec, modeUsed, avgSpeedKmh, ecoScore, routePreference);
      this.envelope!.trips.unshift(trip);

      if (this.envelope!.trips.length > MAX_TRIPS) {
        this.envelope!.trips = this.envelope!.trips.slice(0, MAX_TRIPS);
      }

      await this.persist();
      EventBus.emit('trips:recorded', { trip });

      return successResult(trip);
    } catch (error: any) {
      if (error.message.includes('quota')) {
        return errorResult('Storage full. Old trips may be lost.', 'QUOTA_EXCEEDED');
      }
      return errorResult(error.message, 'STORAGE_ERROR');
    }
  }

  async clearTripHistory(): Promise<UserDataResult<void>> {
    try {
      await this.ensureInitialized();

      this.envelope!.trips = [];
      await this.persist();

      EventBus.emit('trips:cleared', {});

      return successResult(undefined);
    } catch (error: any) {
      return errorResult(error.message, 'STORAGE_ERROR');
    }
  }

  async getStorageStats(): Promise<{ favoriteCount: number; tripCount: number; userId: string }> {
    await this.ensureInitialized();

    return {
      favoriteCount: this.envelope!.favorites.length,
      tripCount: this.envelope!.trips.length,
      userId: this.envelope!.identity.userId,
    };
  }

  async clearAll(): Promise<void> {
    try {
      await del(USERDATA_KEY);
      this.envelope = null;
      this.initialized = false;
      console.log('[UserDataStore] All user data cleared');
    } catch (error) {
      console.error('[UserDataStore] Failed to clear data:', error);
      throw error;
    }
  }
}

export const userDataStore = new UserDataStore();
