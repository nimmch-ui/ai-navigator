/**
 * Mode Service - Manages navigation UI mode switching
 * Persists mode in PreferencesService and localStorage
 * Emits mode:changed events via EventBus
 */

import { UiMode } from '@/types/ui';
import { PreferencesService } from './preferences';
import { EventBus } from './eventBus';

const MODE_STORAGE_KEY = 'nav:mode';

type ModeChangeCallback = (mode: UiMode, previousMode: UiMode) => void;

class ModeServiceImpl {
  private callbacks: Set<ModeChangeCallback> = new Set();

  /**
   * Get current navigation mode
   */
  getMode(): UiMode {
    try {
      // Try localStorage first (for quick access)
      const stored = localStorage.getItem(MODE_STORAGE_KEY);
      if (stored && this.isValidMode(stored)) {
        return stored as UiMode;
      }
      
      // Fall back to preferences
      const preferences = PreferencesService.getPreferences();
      return preferences.uiMode;
    } catch (error) {
      console.error('[ModeService] Failed to get mode:', error);
      return UiMode.THREED; // Default fallback
    }
  }

  /**
   * Set navigation mode and persist
   */
  setMode(mode: UiMode): void {
    const previousMode = this.getMode();
    
    if (mode === previousMode) {
      return; // No change
    }

    try {
      // Save to both localStorage and preferences
      localStorage.setItem(MODE_STORAGE_KEY, mode);
      PreferencesService.updatePreference('uiMode', mode);

      // Emit eventbus event for system-wide listeners
      EventBus.emit('uiMode:changed', { mode, previousMode });

      // Notify registered callbacks
      this.callbacks.forEach(callback => {
        try {
          callback(mode, previousMode);
        } catch (error) {
          console.error('[ModeService] Callback error:', error);
        }
      });

      console.log(`[ModeService] Mode changed: ${previousMode} → ${mode}`);
    } catch (error) {
      console.error('[ModeService] Failed to set mode:', error);
    }
  }

  /**
   * Register callback for mode changes
   * Returns unsubscribe function
   */
  onChange(callback: ModeChangeCallback): () => void {
    this.callbacks.add(callback);
    
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Validate mode string
   */
  private isValidMode(mode: string): boolean {
    return Object.values(UiMode).includes(mode as UiMode);
  }

  /**
   * Get all available modes
   */
  getAvailableModes(): UiMode[] {
    return Object.values(UiMode);
  }

  /**
   * Clear all callbacks (for cleanup)
   */
  clearCallbacks(): void {
    this.callbacks.clear();
  }
}

export const ModeService = new ModeServiceImpl();
