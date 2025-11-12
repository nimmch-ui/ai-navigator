/**
 * Radar Pulse Service
 * Manages visual pulse animations for radar/camera warnings
 */

interface PulseState {
  element: HTMLElement | null;
  pulseCount: number;
  isPulsing: boolean;
  animationFrame: number | null;
  cooldownTimeout: number | null;
}

const pulseState: PulseState = {
  element: null,
  pulseCount: 0,
  isPulsing: false,
  animationFrame: null,
  cooldownTimeout: null,
};

const PULSE_DURATION = 600; // ms per pulse
const PULSE_COUNT = 3; // 2-3 pulses as specified
const PULSE_SCALE_MAX = 1.15;
const PULSE_OPACITY_MIN = 0.7;

/**
 * Start radar pulse animation on element
 * Pulses 2-3 times, then stays steady
 */
export function startRadarPulse(element: HTMLElement | null): void {
  if (!element || pulseState.isPulsing) return;

  pulseState.element = element;
  pulseState.isPulsing = true;
  pulseState.pulseCount = 0;

  const startTime = performance.now();

  const animate = (timestamp: number) => {
    if (!pulseState.element || !pulseState.isPulsing) {
      stopRadarPulse();
      return;
    }

    const elapsed = timestamp - startTime;
    const cycleProgress = (elapsed % PULSE_DURATION) / PULSE_DURATION;
    const currentCycle = Math.floor(elapsed / PULSE_DURATION);

    // Stop after PULSE_COUNT pulses
    if (currentCycle >= PULSE_COUNT) {
      // Set to steady state
      pulseState.element.style.transform = 'scale(1)';
      pulseState.element.style.opacity = '1';
      pulseState.isPulsing = false;
      pulseState.animationFrame = null;
      return;
    }

    // Pulse animation (sine wave for smooth in-out)
    const scale = 1 + (PULSE_SCALE_MAX - 1) * Math.sin(cycleProgress * Math.PI);
    const opacity = 1 - (1 - PULSE_OPACITY_MIN) * Math.sin(cycleProgress * Math.PI);

    pulseState.element.style.transform = `scale(${scale})`;
    pulseState.element.style.opacity = `${opacity}`;

    pulseState.animationFrame = requestAnimationFrame(animate);
  };

  pulseState.animationFrame = requestAnimationFrame(animate);
}

/**
 * Stop radar pulse animation
 */
export function stopRadarPulse(): void {
  if (pulseState.animationFrame !== null) {
    cancelAnimationFrame(pulseState.animationFrame);
    pulseState.animationFrame = null;
  }

  if (pulseState.element) {
    pulseState.element.style.transform = 'scale(1)';
    pulseState.element.style.opacity = '1';
  }

  pulseState.isPulsing = false;
  pulseState.element = null;
  pulseState.pulseCount = 0;
}

/**
 * Check if currently pulsing
 */
export function isPulsing(): boolean {
  return pulseState.isPulsing;
}

/**
 * Voice cue cooldown system
 * Prevents spam by ensuring speak() is called only once per hazard window
 */

interface VoiceCooldown {
  lastAnnouncedId: string | null;
  cooldownTimeout: number | null;
}

const voiceCooldown: VoiceCooldown = {
  lastAnnouncedId: null,
  cooldownTimeout: null,
};

const VOICE_COOLDOWN_MS = 10000; // 10 seconds between same hazard announcements

/**
 * Announce hazard with cooldown
 * Returns true if announcement was made, false if on cooldown
 */
export function announceWithCooldown(
  hazardId: string,
  message: string,
  speakFunction: (text: string) => void
): boolean {
  // Check if this hazard was recently announced
  if (voiceCooldown.lastAnnouncedId === hazardId) {
    return false; // On cooldown
  }

  // Make announcement
  speakFunction(message);
  voiceCooldown.lastAnnouncedId = hazardId;

  // Clear any existing cooldown
  if (voiceCooldown.cooldownTimeout !== null) {
    clearTimeout(voiceCooldown.cooldownTimeout);
  }

  // Set new cooldown
  voiceCooldown.cooldownTimeout = window.setTimeout(() => {
    voiceCooldown.lastAnnouncedId = null;
    voiceCooldown.cooldownTimeout = null;
  }, VOICE_COOLDOWN_MS);

  return true;
}

/**
 * Reset voice cooldown
 */
export function resetVoiceCooldown(): void {
  if (voiceCooldown.cooldownTimeout !== null) {
    clearTimeout(voiceCooldown.cooldownTimeout);
    voiceCooldown.cooldownTimeout = null;
  }
  voiceCooldown.lastAnnouncedId = null;
}
