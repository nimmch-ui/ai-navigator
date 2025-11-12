/**
 * Mode Manager
 * Orchestrates UI mode transitions and manages view lifecycle
 * Ensures shared navigation state persists across mode switches
 */

import { UiMode } from '@/types/ui';
import { ModeService } from '@/services/mode';
import { SharedNavigationState } from './SharedNavigationState';
import type { IRouteView } from '@shared/interfaces';
import { getDeviceCapabilities } from '@/services/map/webglCapability';
import { getBestSupportedMode } from '@/services/map/modeCapabilities';

interface ModeDescriptor {
  mode: UiMode;
  viewFactory?: () => IRouteView;
  onEnter?: (mode: UiMode, previousMode: UiMode) => void | Promise<void>;
  onExit?: (mode: UiMode, nextMode: UiMode) => void | Promise<void>;
}

type ModeChangeListener = (mode: UiMode, previousMode: UiMode) => void;

class ModeManagerImpl {
  private registeredModes: Map<UiMode, ModeDescriptor> = new Map();
  private activeView: IRouteView | null = null;
  private listeners: Set<ModeChangeListener> = new Set();
  private unsubscribeModeService: (() => void) | null = null;
  private initialized: boolean = false;

  /**
   * Initialize ModeManager
   * Should be called once at app startup after subscription services are ready
   */
  initialize(): void {
    if (this.initialized) {
      console.warn('[ModeManager] Already initialized');
      return;
    }

    // Subscribe to ModeService changes
    this.unsubscribeModeService = ModeService.onChange((mode, previousMode) => {
      this.handleModeChange(mode, previousMode);
    });

    this.initialized = true;
    console.log('[ModeManager] Initialized');
  }

  /**
   * Register a UI mode with optional view factory and lifecycle hooks
   */
  registerMode(descriptor: ModeDescriptor): void {
    this.registeredModes.set(descriptor.mode, descriptor);
    console.log(`[ModeManager] Registered mode: ${descriptor.mode}`);
  }

  /**
   * Get current UI mode (delegates to ModeService)
   */
  get current(): UiMode {
    return ModeService.getMode();
  }

  /**
   * Enter a specific mode
   * Handles WebGL fallback and delegates to ModeService
   */
  async enter(mode: UiMode): Promise<void> {
    // Check device capabilities and fallback if unsupported
    const capabilities = getDeviceCapabilities();
    const bestMode = getBestSupportedMode(mode, capabilities);

    if (bestMode !== mode) {
      console.log(`[ModeManager] Mode ${mode} unsupported, falling back to ${bestMode}`);
    }

    // Always delegate to ModeService - it will trigger handleModeChange via EventBus
    // This ensures mode persistence, EventBus events, and proper state management
    ModeService.setMode(bestMode);
  }

  /**
   * Exit current mode
   * Cleans up views and calls exit hooks
   */
  async exit(mode: UiMode): Promise<void> {
    const descriptor = this.registeredModes.get(mode);

    try {
      // Call onExit hook if registered
      if (descriptor?.onExit) {
        const nextMode = this.current; // Get the mode we're transitioning to
        await descriptor.onExit(mode, nextMode);
      }

      // Disconnect active view (but keep shared state intact)
      if (this.activeView) {
        this.disconnectView(this.activeView);
        this.activeView = null;
      }

      console.log(`[ModeManager] Exited mode: ${mode}`);
    } catch (error) {
      console.error(`[ModeManager] Error exiting mode ${mode}:`, error);
      throw error;
    }
  }

  /**
   * Get active route view
   */
  getActiveView(): IRouteView | null {
    return this.activeView;
  }

  /**
   * Subscribe to mode changes
   * Returns unsubscribe function
   */
  onChange(listener: ModeChangeListener): () => void {
    this.listeners.add(listener);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Connect view to shared navigation state
   * This allows the view to access radar, speed, weather, voice, eco data
   */
  private connectViewToSharedState(view: IRouteView): void {
    // Views can access shared state via SharedNavigationState.getState()
    // No explicit connection needed - views pull from shared state as needed
    console.log('[ModeManager] View connected to shared navigation state');
  }

  /**
   * Disconnect view cleanup
   */
  private disconnectView(view: IRouteView): void {
    // Views are stateless wrappers around shared state
    // No cleanup needed
    console.log('[ModeManager] View disconnected');
  }

  /**
   * Handle mode change from ModeService
   */
  private async handleModeChange(mode: UiMode, previousMode: UiMode): Promise<void> {
    console.log(`[ModeManager] Handling mode change: ${previousMode} → ${mode}`);
    
    // Exit previous mode, enter new mode
    // ModeService already changed the mode, we just need to update views
    await this.exit(previousMode);
    
    const descriptor = this.registeredModes.get(mode);
    
    try {
      // Call onEnter hook if registered
      if (descriptor?.onEnter) {
        await descriptor.onEnter(mode, previousMode);
      }

      // Create and activate view if factory provided
      if (descriptor?.viewFactory) {
        this.activeView = descriptor.viewFactory();
        this.connectViewToSharedState(this.activeView);
      }

      // Notify listeners
      this.listeners.forEach(listener => {
        try {
          listener(mode, previousMode);
        } catch (error) {
          console.error('[ModeManager] Listener error:', error);
        }
      });
    } catch (error) {
      console.error(`[ModeManager] Error during mode change to ${mode}:`, error);
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.unsubscribeModeService) {
      this.unsubscribeModeService();
      this.unsubscribeModeService = null;
    }

    if (this.activeView) {
      this.disconnectView(this.activeView);
      this.activeView = null;
    }

    this.listeners.clear();
    this.registeredModes.clear();
    this.initialized = false;

    console.log('[ModeManager] Destroyed');
  }
}

export const ModeManager = new ModeManagerImpl();
