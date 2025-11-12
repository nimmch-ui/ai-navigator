import { DriverState } from "@/types/ui";
import { EventBus } from "@/services/eventBus";

export interface TTSConfig {
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface AudioConfig {
  volume?: number;
  mood?: string;
  intensity?: number;
}

class EmotionEngineImpl {
  private initialized = false;
  private currentState: DriverState | null = null;

  init(): void {
    if (this.initialized) {
      console.warn("EmotionEngine already initialized");
      return;
    }
    
    console.log("[EmotionEngine] Initializing...");
    this.initialized = true;
    
    this.currentState = {
      focus: 80,
      stress: 20,
      mood: 'neutral'
    };
  }

  setDriverState(state: Partial<DriverState>): void {
    if (!this.initialized) {
      console.warn("[EmotionEngine] Not initialized, call init() first");
      return;
    }

    const previousState = this.currentState;
    this.currentState = {
      ...this.currentState!,
      ...state
    };

    console.log("[EmotionEngine] Driver state updated:", this.currentState);

    EventBus.emit('emotion:stateChanged', {
      state: this.currentState,
      timestamp: Date.now()
    });
  }

  getDriverState(): DriverState | null {
    return this.currentState ? { ...this.currentState } : null;
  }

  applyToTTS(): TTSConfig {
    if (!this.initialized || !this.currentState) {
      return {};
    }

    console.log("[EmotionEngine] applyToTTS() called - returning no-op config");
    
    return {};
  }

  applyToAudio(): AudioConfig {
    if (!this.initialized || !this.currentState) {
      return {};
    }

    console.log("[EmotionEngine] applyToAudio() called - returning no-op config");
    
    return {};
  }

  destroy(): void {
    console.log("[EmotionEngine] Destroying...");
    this.initialized = false;
    this.currentState = null;
  }
}

export const EmotionEngine = new EmotionEngineImpl();
