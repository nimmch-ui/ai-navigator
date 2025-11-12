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
      return {}; // Return empty to preserve voice style presets
    }

    const { stress, focus } = this.currentState;
    const config: TTSConfig = {};

    // High stress → slower speech + softer tone
    if (stress > 60) {
      config.rate = Math.max(0.7, 1.0 - (stress - 60) * 0.005); // 0.7 to 1.0
      config.pitch = Math.max(0.8, 1.0 - (stress - 60) * 0.003); // 0.8 to 1.0 (softer)
      console.log("[EmotionEngine] High stress detected - TTS rate:", config.rate, "pitch:", config.pitch);
    }

    // Low focus → clearer enunciation (slightly slower)
    if (focus < 50) {
      config.rate = Math.max(0.8, 1.0 - (50 - focus) * 0.004); // 0.8 to 1.0
      config.volume = Math.min(1.0, 0.9 + (50 - focus) * 0.002); // 0.9 to 1.0 (slightly louder)
      console.log("[EmotionEngine] Low focus detected - TTS rate:", config.rate, "volume:", config.volume);
    }

    // Fatigue simulation (stress > 70) → clearer + gentle
    if (stress > 70) {
      config.rate = 0.85; // Slower for clarity
      config.pitch = 0.95; // Gentler tone
      console.log("[EmotionEngine] Fatigue state - gentle TTS parameters");
    }

    return config;
  }

  applyToAudio(): AudioConfig {
    if (!this.initialized || !this.currentState) {
      return {}; // Return empty to preserve defaults
    }

    const { stress, focus, mood } = this.currentState;
    const config: AudioConfig = {
      mood: mood || 'neutral',
      intensity: 1.0
    };

    // High stress → reduce ambient volume
    if (stress > 60) {
      config.volume = Math.max(0.2, 0.7 - (stress - 60) * 0.005); // 0.2 to 0.7
      config.intensity = Math.max(0.6, 1.0 - (stress - 60) * 0.005); // Calmer
      console.log("[EmotionEngine] High stress - reducing ambient volume:", config.volume);
    }

    // Low focus → increase volume slightly (alerting)
    if (focus < 50) {
      config.volume = Math.min(0.8, 0.7 + (50 - focus) * 0.002); // 0.7 to 0.8
      config.intensity = Math.min(1.2, 1.0 + (50 - focus) * 0.004); // More energetic
      console.log("[EmotionEngine] Low focus - increasing ambient energy");
    }

    return config;
  }
  
  /**
   * Update driver state based on telemetry (braking, turns, idle)
   */
  updateFromTelemetry(event: 'braking' | 'turn' | 'idle' | 'focus_regained'): void {
    if (!this.initialized || !this.currentState) return;

    switch (event) {
      case 'braking':
        // Sudden braking increases stress slightly
        this.setDriverState({
          stress: Math.min(100, this.currentState.stress + 5)
        });
        break;
      
      case 'turn':
        // Successful turn navigation increases focus
        this.setDriverState({
          focus: Math.min(100, this.currentState.focus + 2)
        });
        break;
      
      case 'idle':
        // Extended idle reduces focus
        this.setDriverState({
          focus: Math.max(0, this.currentState.focus - 3),
          stress: Math.max(0, this.currentState.stress - 2)
        });
        break;
      
      case 'focus_regained':
        // Focus regained after distraction
        this.setDriverState({
          focus: Math.min(100, this.currentState.focus + 10)
        });
        EventBus.emit('emotion:focusRegained', { timestamp: Date.now() });
        console.log("[EmotionEngine] Focus regained notification");
        break;
    }
  }

  destroy(): void {
    console.log("[EmotionEngine] Destroying...");
    this.initialized = false;
    this.currentState = null;
  }
}

export const EmotionEngine = new EmotionEngineImpl();
