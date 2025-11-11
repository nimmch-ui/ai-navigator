// Voice guidance service using Web Speech API
export interface VoiceAnnouncementOptions {
  priority?: 'low' | 'normal' | 'high';
  entityId?: string; // For hazard-based deduping (e.g., hazard ID)
  throttleMs?: number; // Custom throttle duration for this entity
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

  init(): boolean {
    if (this.isInitialized) {
      return this.isSupported;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
      this.isSupported = true;
      this.isInitialized = true;

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

    if (!this.isEnabled && options.priority !== 'high') {
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

    const utterance = new SpeechSynthesisUtterance(announcement.text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = 'en-US';

    utterance.onend = () => {
      this.isSpeaking = false;

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

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.cancelAll();
    }
  }

  getEnabled(): boolean {
    return this.isEnabled;
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

export const isVoiceSupported = (): boolean => {
  return voiceGuidance.isVoiceSupported();
};

export const cancelAllAnnouncements = (): void => {
  voiceGuidance.cancelAll();
};
