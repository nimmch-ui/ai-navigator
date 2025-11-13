import { syncService } from './SyncService';
import { EventBus } from '../eventBus';
import { authProvider } from '../auth/AuthProvider';

class SyncTriggers {
  private isInitialized = false;
  private syncDebounceTimer: NodeJS.Timeout | null = null;
  private readonly DEBOUNCE_MS = 2000;

  initialize(): void {
    if (this.isInitialized) {
      console.warn('[SyncTriggers] Already initialized');
      return;
    }

    this.setupTriggers();
    this.isInitialized = true;
    console.log('[SyncTriggers] Initialized successfully');
  }

  private setupTriggers(): void {
    EventBus.subscribe('favorite:added', this.onFavoriteAdded.bind(this));
    EventBus.subscribe('favorite:updated', this.onFavoriteUpdated.bind(this));
    EventBus.subscribe('favorite:deleted', this.onFavoriteDeleted.bind(this));
    
    EventBus.subscribe('route:completed', this.onRouteCompleted.bind(this));
    EventBus.subscribe('trip:saved', this.onTripSaved.bind(this));
    
    EventBus.subscribe('mode:changed', this.onModeChanged.bind(this));
    EventBus.subscribe('ui:mode_changed', this.onUIModeChanged.bind(this));
    
    EventBus.subscribe('settings:changed', this.onSettingsChanged.bind(this));
    EventBus.subscribe('preferences:updated', this.onPreferencesUpdated.bind(this));
    
    EventBus.subscribe('profile:updated', this.onProfileUpdated.bind(this));
    
    console.log('[SyncTriggers] Event listeners registered');
  }

  private onFavoriteAdded(data: { favoriteId: string; label: string }): void {
    console.log('[SyncTriggers] Favorite added:', data.label);
    this.debouncedSync('favorite_added');
  }

  private onFavoriteUpdated(data: { favoriteId: string }): void {
    console.log('[SyncTriggers] Favorite updated:', data.favoriteId);
    this.debouncedSync('favorite_updated');
  }

  private onFavoriteDeleted(data: { favoriteId: string }): void {
    console.log('[SyncTriggers] Favorite deleted:', data.favoriteId);
    this.debouncedSync('favorite_deleted');
  }

  private onRouteCompleted(data: { distanceKm: number; durationSec: number }): void {
    console.log('[SyncTriggers] Route completed:', {
      distance: data.distanceKm,
      duration: data.durationSec,
    });
    this.debouncedSync('route_completed');
  }

  private onTripSaved(data: { tripId: string }): void {
    console.log('[SyncTriggers] Trip saved:', data.tripId);
    this.debouncedSync('trip_saved');
  }

  private onModeChanged(data: { from: string; to: string }): void {
    console.log('[SyncTriggers] Mode changed:', data.from, '->', data.to);
    this.debouncedSync('mode_changed');
  }

  private onUIModeChanged(data: { mode: string }): void {
    console.log('[SyncTriggers] UI mode changed:', data.mode);
    this.debouncedSync('ui_mode_changed');
  }

  private onSettingsChanged(data: { key: string; value: any }): void {
    console.log('[SyncTriggers] Settings changed:', data.key);
    this.debouncedSync('settings_changed');
  }

  private onPreferencesUpdated(data: { keys: string[] }): void {
    console.log('[SyncTriggers] Preferences updated:', data.keys);
    this.debouncedSync('preferences_updated');
  }

  private onProfileUpdated(data: { userId: string }): void {
    console.log('[SyncTriggers] Profile updated:', data.userId);
    this.debouncedSync('profile_updated');
  }

  private debouncedSync(reason: string): void {
    if (!authProvider.isAuthenticated()) {
      console.log('[SyncTriggers] Skipping sync - not authenticated');
      return;
    }

    if (!syncService.isSyncEnabled()) {
      console.log('[SyncTriggers] Skipping sync - sync disabled');
      return;
    }

    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }

    this.syncDebounceTimer = setTimeout(async () => {
      const user = authProvider.getCurrentUser();
      if (!user) {
        console.warn('[SyncTriggers] No authenticated user for sync');
        return;
      }

      console.log(`[SyncTriggers] Triggering sync (reason: ${reason})`);
      
      try {
        const result = await syncService.syncAll(user.userId);
        
        if (result.success) {
          console.log('[SyncTriggers] Sync completed:', {
            pushed: result.recordsPushed,
            pulled: result.recordsPulled,
          });
        } else {
          console.warn('[SyncTriggers] Sync failed:', result.error);
        }
      } catch (error) {
        console.error('[SyncTriggers] Sync error:', error);
      }
    }, this.DEBOUNCE_MS);
  }

  destroy(): void {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
      this.syncDebounceTimer = null;
    }
    
    this.isInitialized = false;
    console.log('[SyncTriggers] Destroyed');
  }
}

export const syncTriggers = new SyncTriggers();
