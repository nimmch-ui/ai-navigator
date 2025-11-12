// Voice guidance service using Web Speech API with SSML + haptics
import { EmotionEngine } from './emotion/EmotionEngine';
import { AudioBus } from './audio/AudioBus';
import { HapticsUtil } from '@/hooks/useHaptics';
import { PreferencesService, type VoiceStyle } from './preferences';

// Voice style presets
const VOICE_STYLE_PRESETS: Record<VoiceStyle, { rate: number; pitch: number; }> = {
  neutral: { rate: 1.0, pitch: 1.0 },
  warm: { rate: 0.95, pitch: 1.05 },    // Slightly slower, higher pitch
  energetic: { rate: 1.1, pitch: 1.05 } // Faster, higher pitch
};

export interface VoiceAnnouncementOptions {
  priority?: 'low' | 'normal' | 'high';
  entityId?: string; // For hazard-based deduping (e.g., hazard ID)
  throttleMs?: number; // Custom throttle duration for this entity
  isCritical?: boolean; // Trigger haptic + audio ding for critical alerts
  ssml?: boolean; // Use SSML markup (if supported)
}

interface QueuedAnnouncement {
  text: string;
  options: VoiceAnnouncementOptions;
  timestamp: number;
}

class VoiceGuidanceService {
  private synthesis: SpeechSynthesis | null = null;
  private isSupported: boolean = false;
  private isEnabled: boolean = true;
  private isInitialized: boolean = false;
  private queue: QueuedAnnouncement[] = [];
  private isSpeaking: boolean = false;
  private entityThrottleMap: Map<string, number> = new Map(); // entityId -> last spoken time
  private readonly DEFAULT_THROTTLE_MS = 30000; // 30 seconds
  private voiceVolume: number = 1.0;
  private hapticsEnabled: boolean = true;
  private audioContext: AudioContext | null = null;
  private supportsVibrate: boolean = false;

  init(): boolean {
    if (this.isInitialized) {
      return this.isSupported;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
      this.isSupported = true;
      this.isInitialized = true;

      // Check for vibration API support
      this.supportsVibrate = 'vibrate' in navigator;

      // Initialize AudioContext for ding sound (lazily)
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioContext = new AudioContextClass();
        }
      } catch (error) {
        // AudioContext not supported, fail gracefully
      }

      // Listen for end events to process queue
      if (this.synthesis) {
        // Chrome/Edge sometimes needs a small utterance to initialize
        const testUtterance = new SpeechSynthesisUtterance('');
        testUtterance.volume = 0;
        this.synthesis.speak(testUtterance);
      }
    } else {
      this.isInitialized = true;
      this.isSupported = false;
    }

    return this.isSupported;
  }

  announce(text: string, options: VoiceAnnouncementOptions = {}): boolean {
    if (!this.isInitialized) {
      this.init();
    }

    if (!this.isSupported || !this.synthesis) {
      console.warn('Voice guidance not supported in this browser');
      return false;
    }

    if (!this.isEnabled) {
      return false;
    }

    const now = Date.now();
    const throttleMs = options.throttleMs ?? this.DEFAULT_THROTTLE_MS;

    // Entity-based throttling (e.g., per hazard ID)
    if (options.entityId) {
      const lastSpoken = this.entityThrottleMap.get(options.entityId);
      if (lastSpoken && (now - lastSpoken) < throttleMs) {
        // Skip - already announced recently
        return false;
      }
    }

    // Add to queue
    this.queue.push({ text, options, timestamp: now });

    // Sort queue by priority
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      const aPriority = priorityOrder[a.options.priority ?? 'normal'];
      const bPriority = priorityOrder[b.options.priority ?? 'normal'];
      return bPriority - aPriority;
    });

    // Process queue
    this.processQueue();

    return true;
  }

  private processQueue(): void {
    if (this.isSpeaking || this.queue.length === 0 || !this.synthesis) {
      return;
    }

    const announcement = this.queue.shift();
    if (!announcement) return;

    this.isSpeaking = true;

    // Trigger haptic + audio for critical alerts
    if (announcement.options.isCritical) {
      this.triggerCriticalAlert();
    }

    // Process SSML if enabled (note: limited browser support, graceful fallback)
    let text = announcement.text;
    if (announcement.options.ssml) {
      text = this.processSSML(text);
    }

    // Get user preferences
    const preferences = PreferencesService.getPreferences();
    const voiceStylePreset = VOICE_STYLE_PRESETS[preferences.voiceStyle];
    
    // Apply emotion-adaptive TTS parameters if enabled
    let finalRate = voiceStylePreset.rate;
    let finalPitch = voiceStylePreset.pitch;
    let finalVolume = this.voiceVolume;
    
    if (preferences.emotionAdaptive) {
      const emotionConfig = EmotionEngine.applyToTTS();
      // Blend emotion config with voice style preset
      finalRate = emotionConfig.rate ?? voiceStylePreset.rate;
      finalPitch = emotionConfig.pitch ?? voiceStylePreset.pitch;
      finalVolume = emotionConfig.volume ?? this.voiceVolume;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = finalRate;
    utterance.pitch = finalPitch;
    utterance.volume = finalVolume;
    utterance.lang = 'en-US';
    
    // Duck ambient audio when speaking
    AudioBus.duckChannels(['ambient'], 0.3, 0.2);

    utterance.onend = () => {
      this.isSpeaking = false;
      
      // Restore ducked audio
      AudioBus.restoreChannels(['ambient'], 0.2);

      // Update entity throttle map
      if (announcement.options.entityId) {
        this.entityThrottleMap.set(announcement.options.entityId, Date.now());
      }

      // Process next item in queue
      setTimeout(() => this.processQueue(), 100);
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      // Process next item in queue
      setTimeout(() => this.processQueue(), 100);
    };

    this.synthesis.speak(utterance);
  }

  private processSSML(text: string): string {
    // Most browsers don't support SSML in SpeechSynthesis, but we can simulate some features
    // Remove SSML tags and convert to natural pauses
    let processed = text;
    
    // Replace <break time="Xms"/> with commas for natural pauses
    processed = processed.replace(/<break time="(\d+)ms"\s*\/>/g, (match, ms) => {
      const pauseMs = parseInt(ms);
      if (pauseMs > 300) return '... '; // Longer pause
      if (pauseMs > 150) return ', '; // Medium pause
      return ' '; // Short pause
    });
    
    // Remove <say-as> tags but keep content
    processed = processed.replace(/<say-as[^>]*>(.*?)<\/say-as>/g, '$1');
    
    // Remove any remaining SSML tags
    processed = processed.replace(/<[^>]+>/g, '');
    
    return processed;
  }

  private triggerCriticalAlert(): void {
    // Trigger haptic vibration using HapticsUtil with user intensity
    if (this.hapticsEnabled) {
      const preferences = PreferencesService.getPreferences();
      HapticsUtil.vibrate('warning', preferences.hapticsIntensity);
    }

    // Play audio ding
    this.playDing();
  }

  private playDing(): void {
    if (!this.audioContext) return;

    try {
      // Resume AudioContext if suspended (for autoplay policies)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Create a pleasant "ding" sound
      oscillator.frequency.value = 800; // Higher pitch for alert
      oscillator.type = 'sine';

      // Envelope for natural ding sound
      const now = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(0.3 * this.voiceVolume, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      oscillator.start(now);
      oscillator.stop(now + 0.15);
    } catch (error) {
      // Audio playback failed, fail silently
    }
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.cancelAll();
    }
  }

  getEnabled(): boolean {
    return this.isEnabled;
  }

  setVolume(volume: number): void {
    this.voiceVolume = Math.max(0, Math.min(1, volume));
  }

  getVolume(): number {
    return this.voiceVolume;
  }

  setHapticsEnabled(enabled: boolean): void {
    this.hapticsEnabled = enabled;
  }

  getHapticsEnabled(): boolean {
    return this.hapticsEnabled;
  }

  isHapticsSupported(): boolean {
    if (!this.isInitialized) {
      this.init();
    }
    return this.supportsVibrate;
  }

  isVoiceSupported(): boolean {
    if (!this.isInitialized) {
      this.init();
    }
    return this.isSupported;
  }

  cancelAll(): void {
    this.queue = [];
    this.isSpeaking = false;
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  // Clear throttle for a specific entity (useful for testing or manual reset)
  clearEntityThrottle(entityId: string): void {
    this.entityThrottleMap.delete(entityId);
  }
}

// Export singleton instance
const voiceGuidance = new VoiceGuidanceService();
voiceGuidance.init(); // Initialize on module load

export { voiceGuidance };

// Helper functions
export const announce = (text: string, options: VoiceAnnouncementOptions = {}): boolean => {
  return voiceGuidance.announce(text, options);
};

export const setVoiceEnabled = (enabled: boolean): void => {
  voiceGuidance.setEnabled(enabled);
};

export const getVoiceEnabled = (): boolean => {
  return voiceGuidance.getEnabled();
};

export const setVoiceVolume = (volume: number): void => {
  voiceGuidance.setVolume(volume);
};

export const getVoiceVolume = (): number => {
  return voiceGuidance.getVolume();
};

export const setHapticsEnabled = (enabled: boolean): void => {
  voiceGuidance.setHapticsEnabled(enabled);
};

export const getHapticsEnabled = (): boolean => {
  return voiceGuidance.getHapticsEnabled();
};

export const isVoiceSupported = (): boolean => {
  return voiceGuidance.isVoiceSupported();
};

export const isHapticsSupported = (): boolean => {
  return voiceGuidance.isHapticsSupported();
};

export const cancelAllAnnouncements = (): void => {
  voiceGuidance.cancelAll();
};
