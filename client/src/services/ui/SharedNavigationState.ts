/**
 * Shared Navigation State
 * Consolidates radar, speed, weather, voice, and eco data that persists across UI mode switches
 * This ensures all modes (CLASSIC, THREED, CINEMATIC, AR, VR, ECO) share the same navigation state
 */

import type { SpeedCamera } from '@/data/speedCameras';
import type { Hazard } from '@/data/hazards';
import type { WeatherData } from '@/services/weather';
import type { EcoEstimate } from '@/services/ecoEstimates';
import { EventBus } from '@/services/eventBus';

export interface SharedNavigationStateData {
  // Radar & hazard data
  speedCameras: SpeedCamera[];
  hazards: Hazard[];
  nearbyHazards: Hazard[];
  
  // Speed & limits
  currentSpeed: number | null;
  speedLimit: number | null;
  
  // Weather data
  weatherConditions: WeatherData[];
  radarEnabled: boolean;
  radarOpacity: number;
  
  // Voice guidance state
  voiceEnabled: boolean;
  voiceVolume: number;
  hapticsEnabled: boolean;
  
  // Eco mode data
  ecoEstimate: EcoEstimate | null;
  ecoMode: boolean;
  
  // Route data
  route: [number, number][] | undefined;
  currentPosition: [number, number] | undefined;
  
  // Navigation state
  isNavigating: boolean;
  origin: string;
  destination: string;
}

type StateChangeListener = (state: Partial<SharedNavigationStateData>) => void;

class SharedNavigationStateImpl {
  private state: SharedNavigationStateData = {
    speedCameras: [],
    hazards: [],
    nearbyHazards: [],
    currentSpeed: null,
    speedLimit: null,
    weatherConditions: [],
    radarEnabled: false,
    radarOpacity: 0.6,
    voiceEnabled: true,
    voiceVolume: 1.0,
    hapticsEnabled: true,
    ecoEstimate: null,
    ecoMode: false,
    route: undefined,
    currentPosition: undefined,
    isNavigating: false,
    origin: '',
    destination: ''
  };

  private listeners: Set<StateChangeListener> = new Set();

  /**
   * Get entire navigation state
   */
  getState(): Readonly<SharedNavigationStateData> {
    return { ...this.state };
  }

  /**
   * Update navigation state (partial update)
   */
  updateState(updates: Partial<SharedNavigationStateData>): void {
    this.state = { ...this.state, ...updates };
    
    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(updates);
      } catch (error) {
        console.error('[SharedNavigationState] Listener error:', error);
      }
    });

    // Emit EventBus event for system-wide reactivity
    EventBus.emit('navigation:stateChanged', { updates });
  }

  /**
   * Subscribe to state changes
   * Returns unsubscribe function
   */
  subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get specific state value
   */
  get<K extends keyof SharedNavigationStateData>(key: K): SharedNavigationStateData[K] {
    return this.state[key];
  }

  /**
   * Set specific state value
   */
  set<K extends keyof SharedNavigationStateData>(key: K, value: SharedNavigationStateData[K]): void {
    this.updateState({ [key]: value } as Partial<SharedNavigationStateData>);
  }

  /**
   * Reset navigation state (for ending navigation)
   */
  reset(): void {
    this.updateState({
      route: undefined,
      currentPosition: undefined,
      isNavigating: false,
      nearbyHazards: [],
      currentSpeed: null,
      speedLimit: null,
      ecoEstimate: null
    });
  }

  /**
   * Clear all listeners (for cleanup)
   */
  clearListeners(): void {
    this.listeners.clear();
  }
}

export const SharedNavigationState = new SharedNavigationStateImpl();
