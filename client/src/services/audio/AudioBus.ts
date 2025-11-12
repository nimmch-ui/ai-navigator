/**
 * AudioBus - Centralized audio management with spatial layering
 * Manages multiple audio channels: TTS, navigation cues, ambient, alerts
 * Uses Web Audio API for spatial positioning and smooth transitions
 */

export type AudioChannel = 'tts' | 'navCues' | 'ambient' | 'alerts';

export interface AudioConfig {
  channel: AudioChannel;
  volume?: number;
  spatial?: boolean;
  azimuth?: number; // Horizontal angle in degrees (-180 to 180)
  elevation?: number; // Vertical angle in degrees (-90 to 90)
  distance?: number; // Distance from listener (0 to 10)
}

interface ChannelNode {
  gainNode: GainNode;
  pannerNode: PannerNode | null;
  currentVolume: number;
}

class AudioBusService {
  private context: AudioContext | null = null;
  private channels: Map<AudioChannel, ChannelNode> = new Map();
  private masterGain: GainNode | null = null;
  private isInitialized = false;
  private mutedChannels: Set<AudioChannel> = new Set();
  private lastAlertTime = 0;
  private readonly ALERT_COOLDOWN = 1000; // Max 1 alert per second

  /**
   * Initialize Web Audio API context and channels
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create audio context
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create master gain node
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);
      this.masterGain.gain.value = 1.0;

      // Initialize all channels
      const channels: AudioChannel[] = ['tts', 'navCues', 'ambient', 'alerts'];
      
      for (const channel of channels) {
        const gainNode = this.context.createGain();
        gainNode.connect(this.masterGain);
        
        // Spatial channels use panner node
        const useSpatial = channel === 'navCues' || channel === 'ambient';
        let pannerNode: PannerNode | null = null;
        
        if (useSpatial && this.context) {
          pannerNode = this.context.createPanner();
          pannerNode.panningModel = 'HRTF'; // Head-related transfer function for 3D audio
          pannerNode.distanceModel = 'inverse';
          pannerNode.refDistance = 1;
          pannerNode.maxDistance = 10;
          pannerNode.rolloffFactor = 1;
          pannerNode.coneInnerAngle = 360;
          pannerNode.coneOuterAngle = 0;
          pannerNode.coneOuterGain = 0;
          
          gainNode.disconnect();
          gainNode.connect(pannerNode);
          pannerNode.connect(this.masterGain);
        }

        // Set default volumes
        const defaultVolume = this.getDefaultVolume(channel);
        gainNode.gain.value = defaultVolume;

        this.channels.set(channel, {
          gainNode,
          pannerNode,
          currentVolume: defaultVolume
        });
      }

      this.isInitialized = true;
      console.log('[AudioBus] Initialized with spatial audio support');
    } catch (error) {
      console.error('[AudioBus] Failed to initialize:', error);
    }
  }

  /**
   * Get default volume for each channel
   */
  private getDefaultVolume(channel: AudioChannel): number {
    switch (channel) {
      case 'tts': return 0.9;
      case 'navCues': return 0.7;
      case 'ambient': return 0.3;
      case 'alerts': return 0.8;
      default: return 0.7;
    }
  }

  /**
   * Set channel volume with optional fade transition
   */
  setChannelVolume(channel: AudioChannel, volume: number, fadeDuration = 0): void {
    if (!this.isInitialized || !this.context) {
      console.warn('[AudioBus] Not initialized');
      return;
    }

    const channelNode = this.channels.get(channel);
    if (!channelNode) return;

    const clampedVolume = Math.max(0, Math.min(1, volume));
    const currentTime = this.context.currentTime;

    if (fadeDuration > 0) {
      // Smooth fade transition
      channelNode.gainNode.gain.cancelScheduledValues(currentTime);
      channelNode.gainNode.gain.setValueAtTime(channelNode.currentVolume, currentTime);
      channelNode.gainNode.gain.linearRampToValueAtTime(clampedVolume, currentTime + fadeDuration);
    } else {
      // Immediate change
      channelNode.gainNode.gain.setValueAtTime(clampedVolume, currentTime);
    }

    channelNode.currentVolume = clampedVolume;
  }

  /**
   * Set master volume
   */
  setMasterVolume(volume: number, fadeDuration = 0): void {
    if (!this.isInitialized || !this.context || !this.masterGain) return;

    const clampedVolume = Math.max(0, Math.min(1, volume));
    const currentTime = this.context.currentTime;

    if (fadeDuration > 0) {
      this.masterGain.gain.cancelScheduledValues(currentTime);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, currentTime);
      this.masterGain.gain.linearRampToValueAtTime(clampedVolume, currentTime + fadeDuration);
    } else {
      this.masterGain.gain.setValueAtTime(clampedVolume, currentTime);
    }
  }

  /**
   * Set spatial position for audio channel
   */
  setSpatialPosition(channel: AudioChannel, azimuth: number, elevation: number, distance: number): void {
    if (!this.isInitialized || !this.context) return;

    const channelNode = this.channels.get(channel);
    if (!channelNode?.pannerNode) return;

    // Convert spherical coordinates to Cartesian
    const azimuthRad = (azimuth * Math.PI) / 180;
    const elevationRad = (elevation * Math.PI) / 180;
    
    const x = distance * Math.cos(elevationRad) * Math.sin(azimuthRad);
    const y = distance * Math.sin(elevationRad);
    const z = -distance * Math.cos(elevationRad) * Math.cos(azimuthRad);

    channelNode.pannerNode.setPosition(x, y, z);
  }

  /**
   * Mute/unmute channel
   */
  muteChannel(channel: AudioChannel, mute: boolean): void {
    if (mute) {
      this.mutedChannels.add(channel);
      this.setChannelVolume(channel, 0, 0.2);
    } else {
      this.mutedChannels.delete(channel);
      const defaultVolume = this.getDefaultVolume(channel);
      this.setChannelVolume(channel, defaultVolume, 0.2);
    }
  }

  /**
   * Mute ambient when phone call or SOS active
   */
  muteAmbientForCall(active: boolean): void {
    this.muteChannel('ambient', active);
    // Also reduce TTS volume slightly during calls
    if (active) {
      this.setChannelVolume('tts', 0.6, 0.2);
    } else {
      this.setChannelVolume('tts', 0.9, 0.2);
    }
  }

  /**
   * Play alert with rate limiting (max 1 per second)
   */
  canPlayAlert(): boolean {
    const now = Date.now();
    if (now - this.lastAlertTime < this.ALERT_COOLDOWN) {
      console.log('[AudioBus] Alert rate limited');
      return false;
    }
    this.lastAlertTime = now;
    return true;
  }

  /**
   * Fade out all channels (useful for navigation end)
   */
  fadeOutAll(duration = 1.0): void {
    for (const channel of Array.from(this.channels.keys())) {
      this.setChannelVolume(channel, 0, duration);
    }
  }

  /**
   * Fade in all channels to defaults
   */
  fadeInAll(duration = 1.0): void {
    for (const [channel, node] of Array.from(this.channels.entries())) {
      if (!this.mutedChannels.has(channel)) {
        const defaultVolume = this.getDefaultVolume(channel);
        this.setChannelVolume(channel, defaultVolume, duration);
      }
    }
  }

  /**
   * Duck (reduce volume of) specific channels temporarily
   * Useful when playing important alerts or TTS
   */
  duckChannels(channels: AudioChannel[], duckAmount = 0.3, duration = 0.2): void {
    for (const channel of channels) {
      const node = this.channels.get(channel);
      if (node) {
        const duckedVolume = node.currentVolume * duckAmount;
        this.setChannelVolume(channel, duckedVolume, duration);
      }
    }
  }

  /**
   * Restore ducked channels to original volume
   */
  restoreChannels(channels: AudioChannel[], duration = 0.2): void {
    for (const channel of channels) {
      if (!this.mutedChannels.has(channel)) {
        const defaultVolume = this.getDefaultVolume(channel);
        this.setChannelVolume(channel, defaultVolume, duration);
      }
    }
  }

  /**
   * Get audio context for external audio sources
   */
  getContext(): AudioContext | null {
    return this.context;
  }

  /**
   * Get channel gain node for connecting external sources
   */
  getChannelNode(channel: AudioChannel): GainNode | null {
    return this.channels.get(channel)?.gainNode || null;
  }

  /**
   * Resume audio context (required for mobile browsers)
   */
  async resume(): Promise<void> {
    if (this.context && this.context.state === 'suspended') {
      await this.context.resume();
      console.log('[AudioBus] Audio context resumed');
    }
  }

  /**
   * Cleanup and close audio context
   */
  dispose(): void {
    if (this.context) {
      this.context.close();
      this.context = null;
    }
    this.channels.clear();
    this.isInitialized = false;
    console.log('[AudioBus] Disposed');
  }
}

// Singleton instance
export const AudioBus = new AudioBusService();
