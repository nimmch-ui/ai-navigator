import { userDataStore } from '../data/UserDataStore';
import type { UserDataEnvelope, UserProfile, FavoritePlace, TripRecord } from '../data/userDataModels';
import type { ISyncBackend, SyncResult } from './ISyncBackend';
import { FakeSyncBackend } from './FakeSyncBackend';
import { CloudSyncBackend } from './CloudSyncBackend';
import { EventBus } from '../eventBus';
import { offlineModeService } from '../system/OfflineModeService';
import type { AuthLoginResponse } from '@shared/schema';

interface SyncQueueItem {
  userId: string;
  timestamp: number;
  retryCount: number;
}

const RETRY_DELAYS = [30000, 120000, 300000];
const MAX_RETRIES = 3;

class SyncService {
  private backend: ISyncBackend;
  private cloudBackend: CloudSyncBackend | null = null;
  private syncEnabled: boolean = false;
  private syncQueue: SyncQueueItem[] = [];
  private isSyncing: boolean = false;
  private retryTimeoutId: NodeJS.Timeout | null = null;
  private networkStatusUnsubscribe: (() => void) | null = null;
  private CANONICAL_USER_KEY = 'sync:canonicalUserId';
  private SESSION_KEY = 'cloudSync_session';

  constructor() {
    this.backend = new FakeSyncBackend();
    
    const stored = localStorage.getItem('sync:enabled');
    this.syncEnabled = stored === 'true';

    this.restoreCloudSession();
    this.setupNetworkMonitoring();
  }

  private getPersistedCanonicalUserId(): string | null {
    return localStorage.getItem(this.CANONICAL_USER_KEY);
  }

  private setPersistedCanonicalUserId(userId: string): void {
    localStorage.setItem(this.CANONICAL_USER_KEY, userId);
  }

  private restoreCloudSession(): void {
    try {
      const stored = localStorage.getItem(this.SESSION_KEY);
      if (stored) {
        const session: AuthLoginResponse = JSON.parse(stored);
        
        if (session.expiresAt > Date.now()) {
          this.cloudBackend = new CloudSyncBackend(session.sessionToken);
          this.backend = this.cloudBackend;
          console.log('[SyncService] Cloud session restored for user:', session.userId);
        } else {
          localStorage.removeItem(this.SESSION_KEY);
          console.log('[SyncService] Cloud session expired');
        }
      }
    } catch (error) {
      console.error('[SyncService] Failed to restore cloud session:', error);
    }
  }

  async loginCloud(username: string, password: string): Promise<AuthLoginResponse> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data: AuthLoginResponse = await response.json();
      
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(data));
      this.cloudBackend = new CloudSyncBackend(data.sessionToken);
      this.backend = this.cloudBackend;
      
      console.log('[SyncService] Cloud login successful:', data.username);
      return data;
    } catch (error) {
      console.error('[SyncService] Cloud login failed:', error);
      throw error;
    }
  }

  logoutCloud(): void {
    localStorage.removeItem(this.SESSION_KEY);
    this.cloudBackend = null;
    this.backend = new FakeSyncBackend();
    console.log('[SyncService] Cloud logout successful');
  }

  isCloudEnabled(): boolean {
    return this.cloudBackend !== null;
  }

  private setupNetworkMonitoring(): void {
    this.networkStatusUnsubscribe = EventBus.subscribe('network:statusChanged', ({ previous, current }) => {
      if (!this.syncEnabled) {
        return;
      }

      if (previous.isOffline && !current.isOffline) {
        console.log('[SyncService] Network reconnected, processing queued sync operations');
        this.processSyncQueue();
      }
    });
  }

  setSyncEnabled(enabled: boolean): void {
    this.syncEnabled = enabled;
    localStorage.setItem('sync:enabled', enabled.toString());
    
    if (enabled) {
      console.log('[SyncService] Sync enabled');
      EventBus.emit('sync:enabled', undefined);
    } else {
      console.log('[SyncService] Sync disabled');
      this.clearQueue();
      EventBus.emit('sync:disabled', undefined);
    }
  }

  isSyncEnabled(): boolean {
    return this.syncEnabled;
  }

  async syncAll(initialUserId?: string): Promise<SyncResult> {
    if (!this.syncEnabled) {
      return { success: false, error: 'Sync is disabled' };
    }

    const networkStatus = offlineModeService.getStatus();
    if (networkStatus.isOffline) {
      console.log('[SyncService] Offline - queueing sync operation');
      if (initialUserId) {
        this.queueSync(initialUserId);
      }
      return { success: false, error: 'Device is offline. Sync queued for when connection is restored.' };
    }

    if (this.isSyncing) {
      return { success: false, error: 'Sync already in progress' };
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      await userDataStore.initialize();

      const localData = await userDataStore.exportData();
      const localUserId = localData.identity.userId;
      
      let remoteData = await this.backend.loadUserData(localUserId);
      let canonicalUserId = localUserId;

      if (!remoteData) {
        const persistedCanonicalId = this.getPersistedCanonicalUserId();
        if (persistedCanonicalId && persistedCanonicalId !== localUserId) {
          console.log('[SyncService] Trying persisted canonical ID:', persistedCanonicalId);
          remoteData = await this.backend.loadUserData(persistedCanonicalId);
          if (remoteData) {
            canonicalUserId = persistedCanonicalId;
          }
        }
      }

      if (!remoteData && this.backend instanceof FakeSyncBackend) {
        const backendCanonicalId = await (this.backend as FakeSyncBackend).getCanonicalUserId();
        if (backendCanonicalId && backendCanonicalId !== localUserId) {
          console.log('[SyncService] Trying backend canonical ID:', backendCanonicalId);
          remoteData = await this.backend.loadUserData(backendCanonicalId);
          if (remoteData) {
            canonicalUserId = backendCanonicalId;
          }
        }
      }

      if (!remoteData) {
        localData.metadata.lastSyncedAt = Date.now();
        localData.metadata.updatedAt = Date.now();
        await this.backend.saveUserData(localUserId, localData);

        this.setPersistedCanonicalUserId(localUserId);

        if (this.backend instanceof FakeSyncBackend) {
          await (this.backend as FakeSyncBackend).setCanonicalUserId(localUserId);
        }

        EventBus.emit('sync:push_completed', {
          recordsPushed: this.countRecords(localData),
        });

        EventBus.emit('sync:completed', {
          conflicts: 0,
          recordsPushed: this.countRecords(localData),
          recordsPulled: 0,
          durationMs: Date.now() - startTime,
        });

        console.log('[SyncService] Initial push completed successfully');

        return {
          success: true,
          canonicalUserId: localUserId,
          recordsPushed: this.countRecords(localData),
          recordsPulled: 0,
        };
      }

      const merged = this.mergeData(localData, remoteData);
      const mergedUserId = merged.identity.userId;

      if (mergedUserId !== localData.identity.userId) {
        EventBus.emit('sync:identityChanged', {
          previousUserId: localData.identity.userId,
          canonicalUserId: mergedUserId,
        });
      }

      await userDataStore.importData(merged, false);
      await this.backend.saveUserData(mergedUserId, merged);

      this.setPersistedCanonicalUserId(mergedUserId);

      if (this.backend instanceof FakeSyncBackend) {
        await (this.backend as FakeSyncBackend).setCanonicalUserId(mergedUserId);
        
        if (localUserId !== mergedUserId) {
          await (this.backend as FakeSyncBackend).deleteStaleRecord(localUserId);
        }
        
        const remoteUserId = remoteData.identity.userId;
        if (remoteUserId !== mergedUserId) {
          await (this.backend as FakeSyncBackend).deleteStaleRecord(remoteUserId);
        }
      }

      const duration = Date.now() - startTime;
      
      EventBus.emit('sync:completed', {
        conflicts: merged.metadata.version - Math.max(localData.metadata.version, remoteData.metadata.version),
        recordsPushed: this.countRecords(localData),
        recordsPulled: this.countRecords(remoteData),
        durationMs: duration,
      });

      console.log('[SyncService] Sync completed successfully');

      return {
        success: true,
        canonicalUserId: mergedUserId,
        conflicts: 0,
        recordsPushed: this.countRecords(localData),
        recordsPulled: this.countRecords(remoteData),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SyncService] Sync failed:', errorMessage);
      
      EventBus.emit('sync:failed', { error: errorMessage });

      return { success: false, error: errorMessage };
    } finally {
      this.isSyncing = false;
    }
  }

  async pushLocalChanges(userId: string): Promise<SyncResult> {
    if (!this.syncEnabled) {
      return { success: false, error: 'Sync is disabled' };
    }

    try {
      await userDataStore.initialize();
      const localData = await userDataStore.exportData();
      
      localData.metadata.lastSyncedAt = Date.now();
      localData.metadata.updatedAt = Date.now();
      
      await this.backend.saveUserData(userId, localData);

      EventBus.emit('sync:push_completed', {
        recordsPushed: this.countRecords(localData),
      });

      console.log('[SyncService] Push completed successfully');

      return {
        success: true,
        recordsPushed: this.countRecords(localData),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SyncService] Push failed:', errorMessage);
      
      return { success: false, error: errorMessage };
    }
  }

  async pullRemoteChanges(userId: string): Promise<SyncResult> {
    if (!this.syncEnabled) {
      return { success: false, error: 'Sync is disabled' };
    }

    try {
      const remoteData = await this.backend.loadUserData(userId);
      
      if (!remoteData) {
        return { success: true, recordsPulled: 0 };
      }

      await userDataStore.initialize();
      await userDataStore.importData(remoteData);

      EventBus.emit('sync:pull_completed', {
        recordsPulled: this.countRecords(remoteData),
      });

      console.log('[SyncService] Pull completed successfully');

      return {
        success: true,
        recordsPulled: this.countRecords(remoteData),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SyncService] Pull failed:', errorMessage);
      
      return { success: false, error: errorMessage };
    }
  }

  async clearCloudData(): Promise<void> {
    try {
      await userDataStore.initialize();
      const data = await userDataStore.exportData();
      const canonicalUserId = data.identity.userId;
      
      await this.backend.clearUserData(canonicalUserId);
      localStorage.removeItem(this.CANONICAL_USER_KEY);
      
      console.log('[SyncService] Cloud data cleared');
      EventBus.emit('sync:cloud_cleared', undefined);
    } catch (error) {
      console.error('[SyncService] Failed to clear cloud data:', error);
      throw error;
    }
  }

  queueSync(userId: string): void {
    if (!this.syncEnabled) {
      return;
    }

    const existing = this.syncQueue.find(item => item.userId === userId);
    if (existing) {
      return;
    }

    this.syncQueue.push({
      userId,
      timestamp: Date.now(),
      retryCount: 0,
    });

    const networkStatus = offlineModeService.getStatus();
    if (!networkStatus.isOffline) {
      this.processSyncQueue();
    }
  }

  destroy(): void {
    if (this.networkStatusUnsubscribe) {
      this.networkStatusUnsubscribe();
    }
    this.clearQueue();
  }

  private async processSyncQueue(): Promise<void> {
    if (this.isSyncing || this.syncQueue.length === 0) {
      return;
    }

    const networkStatus = offlineModeService.getStatus();
    if (networkStatus.isOffline) {
      console.log('[SyncService] Still offline, not processing queue');
      return;
    }

    const item = this.syncQueue[0];
    
    const result = await this.syncAll(item.userId);

    if (result.success) {
      this.syncQueue.shift();
      this.processSyncQueue();
    } else {
      if (result.error?.includes('offline')) {
        console.log('[SyncService] Device offline, will retry when reconnected');
        return;
      }

      item.retryCount++;

      if (item.retryCount >= MAX_RETRIES) {
        console.error('[SyncService] Max retries reached, removing from queue');
        this.syncQueue.shift();
        this.processSyncQueue();
      } else {
        const delay = RETRY_DELAYS[item.retryCount - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        console.log(`[SyncService] Retry ${item.retryCount}/${MAX_RETRIES} in ${delay}ms`);
        
        if (this.retryTimeoutId) {
          clearTimeout(this.retryTimeoutId);
        }

        this.retryTimeoutId = setTimeout(() => {
          this.processSyncQueue();
        }, delay);
      }
    }
  }

  private clearQueue(): void {
    this.syncQueue = [];
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
  }

  private mergeData(local: UserDataEnvelope, remote: UserDataEnvelope): UserDataEnvelope {
    const mergedProfile = this.mergeProfile(local.profile, remote.profile);
    const mergedFavorites = this.mergeFavorites(local.favorites, remote.favorites);
    const mergedTrips = this.mergeTrips(local.trips, remote.trips);

    const canonicalIdentity = remote.identity.createdAt < local.identity.createdAt 
      ? remote.identity 
      : local.identity;

    return {
      identity: canonicalIdentity,
      profile: mergedProfile,
      favorites: mergedFavorites,
      trips: mergedTrips,
      metadata: {
        lastSyncedAt: Date.now(),
        version: Math.max(local.metadata.version, remote.metadata.version) + 1,
        updatedAt: Date.now(),
      },
    };
  }

  private mergeProfile(local: UserProfile, remote: UserProfile): UserProfile {
    return local.updatedAt >= remote.updatedAt ? local : remote;
  }

  private mergeFavorites(local: FavoritePlace[], remote: FavoritePlace[]): FavoritePlace[] {
    const merged = new Map<string, FavoritePlace>();

    local.forEach(fav => merged.set(fav.id, fav));

    remote.forEach(remoteFav => {
      const localFav = merged.get(remoteFav.id);
      if (!localFav || remoteFav.lastUsedAt > localFav.lastUsedAt) {
        merged.set(remoteFav.id, remoteFav);
      }
    });

    return Array.from(merged.values()).sort((a, b) => b.lastUsedAt - a.lastUsedAt);
  }

  private mergeTrips(local: TripRecord[], remote: TripRecord[]): TripRecord[] {
    const merged = new Map<string, TripRecord>();

    local.forEach(trip => merged.set(trip.id, trip));
    remote.forEach(trip => merged.set(trip.id, trip));

    return Array.from(merged.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  private countRecords(data: UserDataEnvelope): number {
    return 1 + data.favorites.length + data.trips.length;
  }
}

export const syncService = new SyncService();
