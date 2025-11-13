/**
 * SafetyController - Intelligent AI Driver Safety System
 * Orchestrates early-warning system, weather adaptation, driver state awareness,
 * AR overlays, and offline predictive capabilities for proactive safety.
 */

import { EventBus } from '@/services/eventBus';
import { announce } from '@/services/voiceGuidance';
import { EmotionEngine } from '@/services/emotion/EmotionEngine';
import { HapticsUtil } from '@/hooks/useHaptics';
import { PreferencesService } from '@/services/preferences';
import type { RiskScores, RiskFactor } from './PredictiveEngine';
import type { WeatherNow } from '@/services/data/types';

export interface SafetyAlert {
  level: 'warning' | 'caution' | 'critical';
  riskScore: number;
  message: string;
  hapticPattern?: 'light' | 'medium' | 'urgent';
  requiresHUDFlash?: boolean;
}

export interface WeatherAdaptation {
  speedReduction: number;      // percentage reduction (0-50)
  brakingMultiplier: number;    // 1.0-2.5x
  warningIntensity: number;     // 1.0-2.0x
  weatherCondition: string;
}

export interface DriverStateAdaptation {
  voiceRate: number;            // 0.7-1.0 (slower when stressed)
  voicePitch: number;           // 0.8-1.0 (softer when stressed)
  extraReminderDistance: number; // meters (more reminders when stressed)
  stressLevel: number;          // 0-100
}

// Risk thresholds for early-warning system
const RISK_THRESHOLDS = {
  WARNING: 60,      // Voice warning only
  CAUTION: 75,      // Voice + medium haptic
  CRITICAL: 90,     // Urgent alert + red HUD flash
};

// Cooldown periods to prevent alert spam (ms)
const COOLDOWN = {
  WARNING: 10000,   // 10 seconds
  CAUTION: 8000,    // 8 seconds
  CRITICAL: 5000,   // 5 seconds (more frequent for critical)
};

// Weather-based safety multipliers
const WEATHER_MULTIPLIERS = {
  storm: {
    speedReduction: 40,       // 40% speed reduction
    brakingMultiplier: 2.8,   // 2.8x braking distance
    warningIntensity: 2.0,    // 100% more intense warnings
  },
  rain: {
    speedReduction: 15,       // 15% speed reduction
    brakingMultiplier: 1.5,   // 1.5x braking distance
    warningIntensity: 1.3,    // 30% more intense warnings
  },
  snow: {
    speedReduction: 35,       // 35% speed reduction
    brakingMultiplier: 2.5,   // 2.5x braking distance
    warningIntensity: 1.8,    // 80% more intense warnings
  },
  fog: {
    speedReduction: 25,       // 25% speed reduction
    brakingMultiplier: 1.4,   // 1.4x braking distance
    warningIntensity: 1.5,    // 50% more intense warnings
  },
  clear: {
    speedReduction: 0,
    brakingMultiplier: 1.0,
    warningIntensity: 1.0,
  },
};

class SafetyControllerImpl {
  private initialized = false;
  private lastAlertTimes: Map<string, number> = new Map(); // Per-level cooldown tracking
  private eventUnsubscribers: Array<() => void> = []; // Track EventBus subscriptions for cleanup
  private weatherAdaptation: WeatherAdaptation = {
    speedReduction: 0,
    brakingMultiplier: 1.0,
    warningIntensity: 1.0,
    weatherCondition: 'clear',
  };
  private driverAdaptation: DriverStateAdaptation = {
    voiceRate: 1.0,
    voicePitch: 1.0,
    extraReminderDistance: 0,
    stressLevel: 0,
  };
  private currentRiskScore: number = 0;
  private currentTopFactors: RiskFactor[] = [];

  init(): void {
    if (this.initialized) {
      console.warn('[SafetyController] Already initialized');
      return;
    }

    console.log('[SafetyController] Initializing Intelligent Safety System...');

    // Subscribe to risk updates from PredictiveEngine and store unsubscriber
    this.eventUnsubscribers.push(
      EventBus.subscribe('ai:riskUpdate', ({ scores, factors }) => {
        this.handleRiskUpdate(scores, factors);
      })
    );

    // Subscribe to weather updates
    this.eventUnsubscribers.push(
      EventBus.subscribe('weather:updated', ({ weather }) => {
        this.handleWeatherUpdate(weather);
      })
    );

    // Subscribe to driver state changes
    this.eventUnsubscribers.push(
      EventBus.subscribe('emotion:stateChanged', ({ state }) => {
        this.handleDriverStateChange(state);
      })
    );

    // Fetch initial driver state from EmotionEngine with retry logic
    const tryFetchDriverState = (attempts = 0) => {
      const initialDriverState = EmotionEngine.getDriverState();
      if (initialDriverState) {
        this.handleDriverStateChange(initialDriverState);
        console.log('[SafetyController] Initial driver state loaded');
      } else if (attempts < 5) {
        // Retry up to 5 times with exponential backoff
        setTimeout(() => tryFetchDriverState(attempts + 1), 100 * Math.pow(2, attempts));
      } else {
        console.warn('[SafetyController] Failed to fetch initial driver state after retries');
      }
    };
    tryFetchDriverState();

    this.initialized = true;
    console.log('[SafetyController] Safety system ready');
  }

  shutdown(): void {
    if (!this.initialized) return;

    console.log('[SafetyController] Shutting down safety system');
    
    // Unsubscribe from all EventBus listeners to prevent leaks
    this.eventUnsubscribers.forEach(unsubscribe => unsubscribe());
    this.eventUnsubscribers = [];
    
    this.initialized = false;
    this.lastAlertTimes.clear();
  }

  private handleRiskUpdate(scores: RiskScores, factors: RiskFactor[]): void {
    if (!this.initialized) return;

    this.currentRiskScore = scores.overall;
    this.currentTopFactors = factors.slice(0, 3); // Top 3 factors

    // Apply weather adaptation to risk thresholds
    const adaptedScore = scores.overall * this.weatherAdaptation.warningIntensity;

    // Determine alert level based on thresholds
    let alert: SafetyAlert | null = null;

    if (adaptedScore >= RISK_THRESHOLDS.CRITICAL) {
      alert = this.createCriticalAlert(scores, factors);
    } else if (adaptedScore >= RISK_THRESHOLDS.CAUTION) {
      alert = this.createCautionAlert(scores, factors);
    } else if (adaptedScore >= RISK_THRESHOLDS.WARNING) {
      alert = this.createWarningAlert(scores, factors);
    }

    if (alert) {
      this.processAlert(alert);
    }
  }

  private createWarningAlert(scores: RiskScores, factors: RiskFactor[]): SafetyAlert {
    const topFactor = factors[0];
    const message = this.buildWarningMessage(topFactor, 'warning');

    return {
      level: 'warning',
      riskScore: scores.overall,
      message,
      hapticPattern: undefined, // No haptic for warnings
      requiresHUDFlash: false,
    };
  }

  private createCautionAlert(scores: RiskScores, factors: RiskFactor[]): SafetyAlert {
    const topFactor = factors[0];
    const message = this.buildWarningMessage(topFactor, 'caution');

    return {
      level: 'caution',
      riskScore: scores.overall,
      message,
      hapticPattern: 'medium',
      requiresHUDFlash: false,
    };
  }

  private createCriticalAlert(scores: RiskScores, factors: RiskFactor[]): SafetyAlert {
    const topFactor = factors[0];
    const message = this.buildWarningMessage(topFactor, 'critical');

    return {
      level: 'critical',
      riskScore: scores.overall,
      message,
      hapticPattern: 'urgent',
      requiresHUDFlash: true,
    };
  }

  private buildWarningMessage(
    factor: RiskFactor,
    level: 'warning' | 'caution' | 'critical'
  ): string {
    const distance = Math.round(factor.distance);
    
    // Adapt message based on driver state
    let prefix = '';
    if (this.driverAdaptation.stressLevel > 60) {
      prefix = 'Please '; // Softer language when stressed
    }

    switch (factor.type) {
      case 'sharpTurn':
        if (level === 'critical') {
          return `${prefix}Sharp turn ahead in ${distance} meters. Slow down now.`;
        } else if (level === 'caution') {
          return `${prefix}Prepare for sharp turn in ${distance} meters.`;
        }
        return `Sharp turn ahead in ${distance} meters.`;

      case 'overspeed':
        if (level === 'critical') {
          return `${prefix}Reduce speed immediately. Current speed too high.`;
        }
        return `${prefix}Approaching speed limit. Slow down.`;

      case 'collision':
        if (level === 'critical') {
          return `${prefix}Hazard ahead! Slow down in ${distance} meters.`;
        }
        return `${prefix}Hazard detected ahead. Be prepared.`;

      case 'lateBraking':
        if (level === 'critical') {
          return `${prefix}Brake now. Insufficient stopping distance.`;
        }
        return `${prefix}Begin braking in ${distance} meters.`;

      case 'laneDeviation':
        return `${prefix}Stay in your lane.`;

      default:
        return `${prefix}Caution ahead in ${distance} meters.`;
    }
  }

  private processAlert(alert: SafetyAlert): void {
    const now = Date.now();
    
    // Per-level cooldown tracking with escalation support
    const cooldown = COOLDOWN[alert.level.toUpperCase() as keyof typeof COOLDOWN];
    const lastAlertTime = this.lastAlertTimes.get(alert.level);
    
    if (lastAlertTime && (now - lastAlertTime) < cooldown) {
      // Skip - still in cooldown for this level, unless escalating
      // Allow critical alerts to always break through
      if (alert.level !== 'critical') {
        return;
      }
    }

    // Trigger voice warning
    this.triggerVoiceWarning(alert);

    // Trigger haptic feedback if required
    if (alert.hapticPattern) {
      this.triggerHapticFeedback(alert.hapticPattern);
    }

    // Trigger HUD flash if required
    if (alert.requiresHUDFlash) {
      this.triggerHUDFlash();
    }

    // Update last alert time for this level
    this.lastAlertTimes.set(alert.level, now);
    
    // Clear lower-level cooldowns on escalation
    if (alert.level === 'critical') {
      this.lastAlertTimes.delete('warning');
      this.lastAlertTimes.delete('caution');
    } else if (alert.level === 'caution') {
      this.lastAlertTimes.delete('warning');
    }

    // Emit safety alert event for UI components
    EventBus.emit('safety:alert', {
      alert,
      timestamp: now,
    });
  }

  private triggerVoiceWarning(alert: SafetyAlert): void {
    // Adapt voice based on driver state
    const message = alert.message;
    
    const priority = alert.level === 'critical' ? 'high' : 'normal';
    const isCritical = alert.level === 'critical';

    announce(message, {
      priority,
      isCritical,
      throttleMs: COOLDOWN[alert.level.toUpperCase() as keyof typeof COOLDOWN],
      entityId: `safety-${alert.level}`,
    });
  }

  private triggerHapticFeedback(pattern: 'light' | 'medium' | 'urgent'): void {
    const preferences = PreferencesService.getPreferences();
    
    if (!preferences.hapticsEnabled) {
      return;
    }

    // Map safety patterns to HapticsUtil patterns
    const hapticsPattern = pattern === 'urgent' ? 'warning' : 'success';
    
    HapticsUtil.vibrate(hapticsPattern, preferences.hapticsIntensity);
  }

  private triggerHUDFlash(): void {
    // Emit event for HUD flash component
    EventBus.emit('safety:hudFlash', {
      color: 'red',
      duration: 1000, // 1 second
      timestamp: Date.now(),
    });
  }

  private handleWeatherUpdate(weather: WeatherNow | null): void {
    if (!weather) {
      this.weatherAdaptation = {
        speedReduction: 0,
        brakingMultiplier: 1.0,
        warningIntensity: 1.0,
        weatherCondition: 'clear',
      };
    } else {
      // Map weather condition to safety multipliers with severity awareness
      const weatherCondition = weather.condition;
      const precipitation = weather.precipitation ?? 0;
      let condition: keyof typeof WEATHER_MULTIPLIERS = 'clear';

      // Differentiate storm intensity from light rain
      if (weatherCondition === 'storm') {
        condition = 'storm';
      } else if (weatherCondition === 'rain') {
        // Heavy precipitation (>10mm/h) gets storm-level treatment
        condition = precipitation > 10 ? 'storm' : 'rain';
      } else if (weatherCondition === 'snow') {
        condition = 'snow';
      } else if (weatherCondition === 'fog') {
        condition = 'fog';
      } else {
        // 'clouds' and 'clear' both default to clear multipliers
        condition = 'clear';
      }

      const multipliers = WEATHER_MULTIPLIERS[condition];

      this.weatherAdaptation = {
        speedReduction: multipliers.speedReduction,
        brakingMultiplier: multipliers.brakingMultiplier,
        warningIntensity: multipliers.warningIntensity,
        weatherCondition: condition,
      };
    }

    console.log('[SafetyController] Weather adaptation:', this.weatherAdaptation);

    // Always emit weather adaptation event, including null/clear cases
    EventBus.emit('safety:weatherAdapted', {
      adaptation: this.weatherAdaptation,
      timestamp: Date.now(),
    });
  }

  private handleDriverStateChange(state: any): void {
    // Null-safe handling of EmotionEngine state
    if (!state) {
      console.warn('[SafetyController] Received null driver state');
      return;
    }

    // Safely extract values with defaults matching EmotionEngine defaults
    const stress = typeof state.stress === 'number' ? state.stress : 20;
    const focus = typeof state.focus === 'number' ? state.focus : 80;

    // Update driver adaptation
    this.driverAdaptation = {
      voiceRate: this.calculateVoiceRate(stress, focus),
      voicePitch: this.calculateVoicePitch(stress),
      extraReminderDistance: this.calculateReminderDistance(stress, focus),
      stressLevel: stress,
    };

    console.log('[SafetyController] Driver state adaptation:', this.driverAdaptation);

    // Emit driver state adaptation event
    EventBus.emit('safety:driverStateAdapted', {
      adaptation: this.driverAdaptation,
      timestamp: Date.now(),
    });
  }

  private calculateVoiceRate(stress: number, focus: number): number {
    // High stress or low focus → slower speech
    if (stress > 60) {
      return Math.max(0.7, 1.0 - (stress - 60) * 0.005);
    }
    if (focus < 50) {
      return Math.max(0.8, 1.0 - (50 - focus) * 0.004);
    }
    return 1.0;
  }

  private calculateVoicePitch(stress: number): number {
    // High stress → softer/lower pitch
    if (stress > 60) {
      return Math.max(0.8, 1.0 - (stress - 60) * 0.003);
    }
    return 1.0;
  }

  private calculateReminderDistance(stress: number, focus: number): number {
    // High stress or low focus → more reminders (earlier warnings)
    if (stress > 70 || focus < 40) {
      return 50; // 50m extra reminder distance
    }
    if (stress > 50 || focus < 60) {
      return 25; // 25m extra reminder distance
    }
    return 0;
  }

  // Public getters
  getWeatherAdaptation(): WeatherAdaptation {
    return { ...this.weatherAdaptation };
  }

  getDriverAdaptation(): DriverStateAdaptation {
    return { ...this.driverAdaptation };
  }

  getCurrentRiskScore(): number {
    return this.currentRiskScore;
  }

  getCurrentTopFactors(): RiskFactor[] {
    return [...this.currentTopFactors];
  }
}

// Export singleton instance
export const SafetyController = new SafetyControllerImpl();
