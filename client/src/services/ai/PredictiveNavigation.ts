/**
 * PredictiveNavigation - Integration service that connects PredictiveEngine
 * with the navigation loop, SharedNavigationState, and voice guidance
 */

import { EventBus } from '@/services/eventBus';
import { PredictiveEngine, type PredictionContext, type RiskScores, type RiskFactor } from './PredictiveEngine';
import { announcePredictiveRisk } from '@/services/voiceGuidance';
import { EmotionEngine } from '@/services/emotion/EmotionEngine';
import { SharedNavigationState } from '@/services/ui/SharedNavigationState';

interface PositionSample {
  position: [number, number];
  timestamp: number;
}

class PredictiveNavigationImpl {
  private initialized = false;
  private lastRiskScores: Record<string, number> = {};
  private lastAnnouncementTime: Record<string, number> = {};
  private readonly ANNOUNCEMENT_COOLDOWN = 10000; // 10 seconds between same risk type
  private unsubscribers: Array<() => void> = [];
  private positionHistory: PositionSample[] = [];
  private readonly MAX_POSITION_HISTORY = 10; // Keep last 10 positions
  private readonly MIN_POSITIONS_FOR_HEADING = 2; // Need at least 2 positions
  private readonly MIN_DISTANCE_FOR_HEADING = 5; // Minimum 5 meters between positions

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
    // Update position history when position changes
    if (updates.currentPosition) {
      this.updatePositionHistory(updates.currentPosition);
    }

    // Trigger immediate prediction on significant state changes
    if (updates.currentSpeed !== undefined || 
        updates.currentPosition !== undefined ||
        updates.route !== undefined) {
      this.performPrediction();
    }
  }

  /**
   * Update position history for heading calculation
   */
  private updatePositionHistory(position: [number, number]): void {
    const now = Date.now();
    
    // Add new position
    this.positionHistory.push({
      position,
      timestamp: now,
    });
    
    // Keep only last MAX_POSITION_HISTORY positions
    if (this.positionHistory.length > this.MAX_POSITION_HISTORY) {
      this.positionHistory.shift();
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
      heading: this.calculateHeading(),
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
   * Calculate heading from position history
   * Returns bearing in degrees (0-360) or 0 if insufficient data
   */
  private calculateHeading(): number {
    // Need at least 2 positions
    if (this.positionHistory.length < this.MIN_POSITIONS_FOR_HEADING) {
      return 0;
    }

    // Find the most recent two positions that are far enough apart
    // to calculate a meaningful bearing (>= MIN_DISTANCE_FOR_HEADING meters)
    for (let i = this.positionHistory.length - 1; i >= 1; i--) {
      const recent = this.positionHistory[i];
      
      for (let j = i - 1; j >= 0; j--) {
        const older = this.positionHistory[j];
        const distance = this.calculateDistance(older.position, recent.position);
        
        if (distance >= this.MIN_DISTANCE_FOR_HEADING) {
          // Calculate bearing from older to recent position
          return this.calculateBearing(older.position, recent.position);
        }
      }
    }

    // Insufficient movement - fallback to 0
    return 0;
  }

  /**
   * Calculate bearing between two geographic points
   * Returns bearing in degrees (0-360)
   */
  private calculateBearing(from: [number, number], to: [number, number]): number {
    const [lat1, lon1] = from;
    const [lat2, lon2] = to;
    
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    
    const θ = Math.atan2(y, x);
    return (θ * 180 / Math.PI + 360) % 360;
  }

  /**
   * Calculate distance between two geographic points (Haversine formula)
   * Returns distance in meters
   */
  private calculateDistance(point1: [number, number], point2: [number, number]): number {
    const [lat1, lon1] = point1;
    const [lat2, lon2] = point2;
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
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
