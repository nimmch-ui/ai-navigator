/**
 * PredictiveNavigation - Integration service that connects PredictiveEngine
 * with the navigation loop, SharedNavigationState, and voice guidance
 */

import { EventBus } from '@/services/eventBus';
import { PredictiveEngine, type PredictionContext, type RiskScores, type RiskFactor } from './PredictiveEngine';
import { announcePredictiveRisk } from '@/services/voiceGuidance';
import { EmotionEngine } from '@/services/emotion/EmotionEngine';
import { SharedNavigationState } from '@/services/ui/SharedNavigationState';

class PredictiveNavigationImpl {
  private initialized = false;
  private lastRiskScores: Record<string, number> = {};
  private lastAnnouncementTime: Record<string, number> = {};
  private readonly ANNOUNCEMENT_COOLDOWN = 10000; // 10 seconds between same risk type
  private unsubscribers: Array<() => void> = [];

  init(): void {
    if (this.initialized) {
      console.warn('[PredictiveNavigation] Already initialized, reinitializing...');
      // Clean up existing subscriptions before reinitializing
      this.unsubscribers.forEach(unsub => unsub());
      this.unsubscribers = [];
    }

    console.log('[PredictiveNavigation] Initializing predictive navigation integration...');
    
    // Initialize PredictiveEngine
    PredictiveEngine.init();

    // Subscribe to navigation state changes with cleanup
    this.unsubscribers.push(
      EventBus.subscribe('navigation:stateChanged', ({ updates }) => {
        this.onNavigationUpdate(updates);
      })
    );

    // Subscribe to AI prediction ticks with cleanup
    this.unsubscribers.push(
      EventBus.subscribe('ai:predictionTick', () => {
        this.performPrediction();
      })
    );

    // Subscribe to risk updates to trigger voice warnings with cleanup
    this.unsubscribers.push(
      EventBus.subscribe('ai:riskUpdate', ({ scores, factors }) => {
        this.handleRiskUpdate(scores, factors);
      })
    );

    this.initialized = true;
    
    // Trigger initial prediction with current state
    this.performPrediction();
    
    console.log('[PredictiveNavigation] Initialization complete');
  }

  shutdown(): void {
    if (!this.initialized) return;

    // Unsubscribe from all EventBus events
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];

    PredictiveEngine.shutdown();
    this.initialized = false;
    console.log('[PredictiveNavigation] Shutdown complete');
  }

  /**
   * Called when navigation state changes
   */
  private onNavigationUpdate(updates: Record<string, any>): void {
    // Trigger immediate prediction on significant state changes
    if (updates.currentSpeed !== undefined || 
        updates.currentPosition !== undefined ||
        updates.route !== undefined) {
      this.performPrediction();
    }
  }

  /**
   * Perform risk prediction with current navigation state
   */
  private performPrediction(): void {
    const context = this.buildPredictionContext();
    if (!context) {
      return; // Not enough data to predict
    }

    // Run prediction
    PredictiveEngine.predict(context);
  }

  /**
   * Build prediction context from current navigation state and environment
   */
  private buildPredictionContext(): PredictionContext | null {
    // Get real navigation state
    const navState = SharedNavigationState.getState();
    const driverState = EmotionEngine.getDriverState();

    // Check if we have required data (allow predictions even when not actively navigating)
    if (!navState.currentPosition) {
      return null; // Need at least a position to predict
    }

    const context: PredictionContext = {
      currentSpeed: navState.currentSpeed ?? 0,
      speedLimit: navState.speedLimit ?? 50,
      position: navState.currentPosition,
      heading: 0, // TODO: Calculate from recent position changes
      route: navState.route,
      hazards: navState.hazards,
      speedCameras: navState.speedCameras,
      driverStress: driverState?.stress,
    };

    // Convert weather data if available
    if (navState.weatherConditions && navState.weatherConditions.length > 0) {
      const weather = navState.weatherConditions[0];
      
      // Map weather condition to WeatherNow format
      let condition: 'clear' | 'clouds' | 'rain' | 'snow' | 'fog' | 'storm' = 'clear';
      if (weather.condition === 'thunderstorm') {
        condition = 'storm';
      } else if (['clear', 'clouds', 'rain', 'snow', 'fog'].includes(weather.condition)) {
        condition = weather.condition as any;
      }
      
      context.weather = {
        temperature: weather.temperature || 15,
        condition,
        windSpeed: 0,
        windDirection: 0,
        precipitation: 0,
        visibility: 10000,
        humidity: 50,
        timestamp: Date.now(),
      };
    }

    return context;
  }

  /**
   * Handle risk updates and trigger voice warnings
   */
  private handleRiskUpdate(
    scores: RiskScores,
    factors: RiskFactor[]
  ): void {
    const now = Date.now();

    // Announce high-priority risk factors
    for (const factor of factors) {
      if (factor.score < 35) continue; // Only announce moderate+ risks

      const riskType = this.mapFactorTypeToRiskType(factor.type);
      if (!riskType) continue;

      // Dynamic cooldown based on severity
      const cooldown = this.getCooldownForSeverity(factor.severity);
      const lastTime = this.lastAnnouncementTime[factor.type] || 0;
      if (now - lastTime < cooldown) {
        continue; // Still in cooldown
      }

      // Check if risk has increased significantly
      const lastScore = this.lastRiskScores[factor.type] || 0;
      const scoreDelta = factor.score - lastScore;
      
      // Only announce if:
      // 1. Risk is new (last score was low)
      // 2. Risk has increased significantly
      // 3. Risk is high or critical (always announce)
      if (lastScore < 30 || scoreDelta > 15 || factor.severity === 'critical' || factor.severity === 'high') {
        // Call voice guidance directly (it handles priority/throttling internally)
        const success = announcePredictiveRisk(
          riskType,
          factor.severity as any,
          factor.distance
        );

        if (success) {
          this.lastAnnouncementTime[factor.type] = now;
          console.log(`[PredictiveNavigation] Announced ${factor.type} risk (score: ${factor.score}, severity: ${factor.severity})`);
        }
      }

      // Update last known score
      this.lastRiskScores[factor.type] = factor.score;
    }
  }

  /**
   * Get cooldown time based on risk severity
   */
  private getCooldownForSeverity(severity: string): number {
    switch (severity) {
      case 'critical':
        return 5000; // 5 seconds - most frequent
      case 'high':
        return 10000; // 10 seconds - frequent
      case 'moderate':
        return 15000; // 15 seconds - moderate
      default:
        return 20000; // 20 seconds - least frequent
    }
  }

  /**
   * Map factor type to voice guidance risk type
   */
  private mapFactorTypeToRiskType(
    factorType: string
  ): 'overspeed' | 'sharp_turn' | 'collision' | 'late_braking' | 'lane_deviation' | null {
    const mapping: Record<string, any> = {
      overspeed: 'overspeed',
      sharpTurn: 'sharp_turn',
      collision: 'collision',
      lateBraking: 'late_braking',
      laneDeviation: 'lane_deviation',
    };

    return mapping[factorType] || null;
  }

  /**
   * Manually trigger prediction (useful for testing or manual refresh)
   */
  triggerPrediction(context?: PredictionContext): void {
    if (!this.initialized) {
      console.warn('[PredictiveNavigation] Not initialized');
      return;
    }

    const predictionContext = context || this.buildPredictionContext();
    if (!predictionContext) {
      console.warn('[PredictiveNavigation] Cannot build prediction context');
      return;
    }

    PredictiveEngine.predict(predictionContext);
  }

  /**
   * Get current prediction (for testing/debugging)
   */
  getLastPrediction() {
    return PredictiveEngine.getLastPrediction();
  }

  /**
   * Get danger zones (for map visualization)
   */
  getDangerZones() {
    return PredictiveEngine.getDangerZones();
  }
}

// Singleton instance
export const PredictiveNavigation = new PredictiveNavigationImpl();
