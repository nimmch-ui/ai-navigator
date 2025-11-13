import type { ISyncBackend } from './ISyncBackend';
import type { UserDataEnvelope, FavoritePlace, TripRecord } from '../data/userDataModels';
import type { 
  CloudUserDataEnvelope, 
  CloudFavoritePlace, 
  CloudTripRecord,
  CloudUserProfile,
} from '@shared/schema';

export class CloudSyncBackend implements ISyncBackend {
  private sessionToken: string | null = null;
  private baseUrl: string;

  constructor(sessionToken: string, baseUrl: string = '') {
    this.sessionToken = sessionToken;
    this.baseUrl = baseUrl;
  }

  setSessionToken(token: string): void {
    this.sessionToken = token;
  }

  clearSession(): void {
    this.sessionToken = null;
  }

  async loadUserData(userId: string): Promise<UserDataEnvelope | null> {
    if (!this.sessionToken) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/sync/pull`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.sessionToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized: Session expired');
        }
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Pull failed: ${response.statusText}`);
      }

      const data = await response.json();
      const cloudEnvelope: CloudUserDataEnvelope = data.envelope;

      return this.convertCloudToLocal(cloudEnvelope);
    } catch (error) {
      console.error('[CloudSyncBackend] Load failed:', error);
      throw error;
    }
  }

  async saveUserData(userId: string, data: UserDataEnvelope): Promise<void> {
    if (!this.sessionToken) {
      throw new Error('Not authenticated');
    }

    try {
      const cloudData = this.convertLocalToCloud(userId, data);

      const items = [];
      
      items.push({
        id: crypto.randomUUID(),
        userId,
        payload: {
          type: 'profile' as const,
          action: 'update' as const,
          data: cloudData.profile,
        },
        timestamp: Date.now(),
        status: 'pending' as const,
        attempts: 0,
      });

      cloudData.favorites.forEach(favorite => {
        items.push({
          id: crypto.randomUUID(),
          userId,
          payload: {
            type: 'favorite' as const,
            action: 'update' as const,
            data: favorite,
          },
          timestamp: Date.now(),
          status: 'pending' as const,
          attempts: 0,
        });
      });

      cloudData.trips.forEach(trip => {
        items.push({
          id: crypto.randomUUID(),
          userId,
          payload: {
            type: 'trip' as const,
            action: 'update' as const,
            data: trip,
          },
          timestamp: Date.now(),
          status: 'pending' as const,
          attempts: 0,
        });
      });

      const response = await fetch(`${this.baseUrl}/api/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.sessionToken}`,
        },
        body: JSON.stringify({
          userId,
          items,
          lastSyncTimestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized: Session expired');
        }
        throw new Error(`Push failed: ${response.statusText}`);
      }

      console.log('[CloudSyncBackend] Save successful');
    } catch (error) {
      console.error('[CloudSyncBackend] Save failed:', error);
      throw error;
    }
  }

  async clearUserData(userId: string): Promise<void> {
    console.warn('[CloudSyncBackend] clearUserData not implemented for cloud backend');
  }

  private convertCloudToLocal(cloud: CloudUserDataEnvelope): UserDataEnvelope {
    const favorites: FavoritePlace[] = cloud.favorites
      .filter(fav => !fav.deletedAt)
      .map(fav => ({
        id: fav.id,
        label: fav.label,
        coordinates: fav.coordinates,
        address: fav.address,
        type: fav.type,
        createdAt: fav.createdAt,
        lastUsedAt: fav.lastUsedAt,
        schemaVersion: fav.schemaVersion,
      }));

    const trips: TripRecord[] = cloud.trips
      .filter(trip => !trip.deletedAt)
      .map(trip => ({
        id: trip.id,
        start: trip.start,
        end: trip.end,
        distanceKm: trip.distanceKm,
        durationSec: trip.durationSec,
        ecoScore: trip.ecoScore,
        avgSpeedKmh: trip.avgSpeedKmh,
        timestamp: trip.timestamp,
        modeUsed: trip.modeUsed,
        routePreference: trip.routePreference,
        schemaVersion: trip.schemaVersion,
      }));

    return {
      identity: {
        userId: cloud.userId,
        createdAt: cloud.profile.createdAt,
        schemaVersion: cloud.profile.schemaVersion,
      },
      profile: {
        id: cloud.profile.id,
        displayName: cloud.profile.displayName,
        avatarEmoji: cloud.profile.avatarEmoji,
        avatarColor: cloud.profile.avatarColor,
        preferredLanguage: cloud.profile.preferredLanguage,
        units: cloud.profile.units,
        createdAt: cloud.profile.createdAt,
        updatedAt: cloud.profile.updatedAt,
        schemaVersion: cloud.profile.schemaVersion,
      },
      favorites,
      trips,
      metadata: {
        lastSyncedAt: cloud.metadata.lastSyncedAt,
        version: cloud.metadata.version,
        updatedAt: cloud.metadata.updatedAt,
      },
    };
  }

  private convertLocalToCloud(userId: string, local: UserDataEnvelope): CloudUserDataEnvelope {
    const cloudProfile: CloudUserProfile = {
      id: local.profile.id,
      userId,
      displayName: local.profile.displayName,
      avatarEmoji: local.profile.avatarEmoji,
      avatarColor: local.profile.avatarColor,
      preferredLanguage: local.profile.preferredLanguage,
      units: local.profile.units,
      createdAt: local.profile.createdAt,
      updatedAt: local.profile.updatedAt,
      version: local.metadata.version,
      schemaVersion: local.profile.schemaVersion,
    };

    const cloudFavorites: CloudFavoritePlace[] = local.favorites.map(fav => ({
      id: fav.id,
      userId,
      label: fav.label,
      coordinates: fav.coordinates,
      address: fav.address,
      type: fav.type,
      createdAt: fav.createdAt,
      lastUsedAt: fav.lastUsedAt,
      updatedAt: fav.lastUsedAt,
      version: 1,
      schemaVersion: fav.schemaVersion,
    }));

    const cloudTrips: CloudTripRecord[] = local.trips.map(trip => ({
      id: trip.id,
      userId,
      start: trip.start,
      end: trip.end,
      distanceKm: trip.distanceKm,
      durationSec: trip.durationSec,
      ecoScore: trip.ecoScore,
      avgSpeedKmh: trip.avgSpeedKmh,
      timestamp: trip.timestamp,
      modeUsed: trip.modeUsed,
      routePreference: trip.routePreference,
      updatedAt: trip.timestamp,
      version: 1,
      schemaVersion: trip.schemaVersion,
    }));

    return {
      userId,
      profile: cloudProfile,
      favorites: cloudFavorites,
      trips: cloudTrips,
      metadata: {
        lastSyncedAt: local.metadata.lastSyncedAt,
        version: local.metadata.version,
        updatedAt: local.metadata.updatedAt,
      },
    };
  }
}
