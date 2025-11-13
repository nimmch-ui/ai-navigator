/**
 * PredictiveEngine - Real-time navigation risk prediction and forecasting
 * Analyzes map geometry, speed, hazards, weather, and driver behavior
 * to forecast and warn about upcoming risks before they occur.
 */

import { EventBus } from '@/services/eventBus';
import { EmotionEngine } from '@/services/emotion/EmotionEngine';
import type { WeatherNow } from '@/services/data/types';
import type { Hazard } from '@/data/hazards';
import type { SpeedCamera } from '@/data/speedCameras';

export interface RiskScores {
  overspeed: number;        // 0-100: risk of exceeding speed limit
  sharpTurn: number;        // 0-100: risk of sharp turn difficulty
  collision: number;        // 0-100: risk of collision with nearby hazards
  lateBraking: number;      // 0-100: risk of insufficient braking distance
  laneDeviation: number;    // 0-100: risk of lane departure (if available)
  overall: number;          // 0-100: combined weighted risk score
}

export interface RiskFactor {
  type: keyof RiskScores;
  score: number;
  reason: string;
  distance: number;         // meters ahead
  severity: 'low' | 'moderate' | 'high' | 'critical';
}

export interface PredictionContext {
  currentSpeed: number;       // km/h
  speedLimit: number;         // km/h
  position: [number, number]; // [lat, lng]
  heading: number;            // degrees
  route?: Array<[number, number]>;
  weather?: WeatherNow;
  hazards?: Hazard[];
  speedCameras?: SpeedCamera[];
  driverStress?: number;      // 0-100
}

interface DangerZone {
  position: [number, number];
  type: 'sharp_turn' | 'hazard' | 'speed_camera' | 'braking_required';
  distance: number;
  severity: number;
}

// Risk scoring weights (based on navigation safety research)
const RISK_WEIGHTS = {
  environmental: 0.35,  // Weather, road conditions
  human: 0.30,          // Driver stress, fatigue
  operational: 0.20,    // Speed, braking, maneuvering
  hazards: 0.15,        // External threats
};

// Braking distance constants
const REACTION_TIME_NORMAL = 1.5;    // seconds
const REACTION_TIME_STRESSED = 2.5;  // seconds (high stress)
const FRICTION_DRY = 0.8;
const FRICTION_WET = 0.4;
const FRICTION_SNOW = 0.2;
const FRICTION_ICE = 0.1;

// Curve sharpness thresholds (radius in meters)
const CURVE_RADIUS = {
  HAIRPIN: 61,     // < 61m
  SHARP: 152,      // 61-152m
  MODERATE: 305,   // 152-305m
  GENTLE: 915,     // 305-915m
};

const LOOKAHEAD_DISTANCE = 300; // meters

class PredictiveEngineImpl {
  private initialized = false;
  private lastPrediction: RiskScores | null = null;
  private dangerZones: DangerZone[] = [];
  private updateInterval: number | null = null;

  init(): void {
    if (this.initialized) {
      console.warn('[PredictiveEngine] Already initialized, restarting prediction loop...');
      this.stopPredictionLoop();
    }

    console.log('[PredictiveEngine] Initializing AI risk prediction system...');
    this.initialized = true;
    this.startPredictionLoop();
  }

  shutdown(): void {
    this.stopPredictionLoop();
    this.initialized = false;
    console.log('[PredictiveEngine] Shutdown complete');
  }

  private stopPredictionLoop(): void {
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private startPredictionLoop(): void {
    // Update predictions every 2 seconds
    this.updateInterval = window.setInterval(() => {
      EventBus.emit('ai:predictionTick', { timestamp: Date.now() });
    }, 2000);
  }

  /**
   * Main prediction entry point
   * Analyzes all risk factors and returns comprehensive risk scores
   */
  predict(context: PredictionContext): RiskScores {
    if (!this.initialized) {
      console.warn('[PredictiveEngine] Not initialized');
      return this.getZeroRiskScores();
    }

    // Calculate individual risk scores
    const overspeedRisk = this.calculateOverspeedRisk(context);
    const sharpTurnRisk = this.calculateSharpTurnRisk(context);
    const collisionRisk = this.calculateCollisionRisk(context);
    const lateBrakingRisk = this.calculateLateBrakingRisk(context);
    const laneDeviationRisk = this.calculateLaneDeviationRisk(context);

    // Calculate weighted overall risk
    const overall = this.calculateOverallRisk({
      overspeed: overspeedRisk,
      sharpTurn: sharpTurnRisk,
      collision: collisionRisk,
      lateBraking: lateBrakingRisk,
      laneDeviation: laneDeviationRisk,
    }, context);

    const scores: RiskScores = {
      overspeed: overspeedRisk,
      sharpTurn: sharpTurnRisk,
      collision: collisionRisk,
      lateBraking: lateBrakingRisk,
      laneDeviation: laneDeviationRisk,
      overall,
    };

    this.lastPrediction = scores;
    
    // Emit risk update event
    EventBus.emit('ai:riskUpdate', {
      scores,
      timestamp: Date.now(),
      factors: this.extractRiskFactors(scores, context),
    });

    return scores;
  }

  /**
   * Calculate overspeed risk
   * Factors: current speed vs limit, acceleration trend, driver stress
   */
  private calculateOverspeedRisk(context: PredictionContext): number {
    const { currentSpeed, speedLimit } = context;
    
    if (!currentSpeed || !speedLimit) return 0;

    // Base risk from speed delta
    const speedDelta = currentSpeed - speedLimit;
    let risk = 0;

    if (speedDelta <= 0) {
      risk = 0; // Under limit
    } else if (speedDelta <= 5) {
      risk = 20; // Slight overspeed (5 km/h)
    } else if (speedDelta <= 10) {
      risk = 40; // Moderate overspeed (10 km/h)
    } else if (speedDelta <= 20) {
      risk = 65; // Significant overspeed (20 km/h)
    } else {
      risk = 85; // Dangerous overspeed (>20 km/h)
    }

    // Adjust for driver stress
    const driverStress = context.driverStress || EmotionEngine.getDriverState()?.stress || 20;
    if (driverStress > 60) {
      risk = Math.min(100, risk + 10); // High stress increases risk
    }

    // Adjust for weather
    if (context.weather) {
      const weatherMultiplier = this.getWeatherRiskMultiplier(context.weather);
      risk = Math.min(100, risk * weatherMultiplier);
    }

    return Math.round(risk);
  }

  /**
   * Calculate sharp turn risk
   * Analyzes upcoming curve geometry and current speed
   */
  private calculateSharpTurnRisk(context: PredictionContext): number {
    if (!context.route || context.route.length < 3) return 0;

    const upcomingCurves = this.detectUpcomingCurves(context.route, context.position);
    if (upcomingCurves.length === 0) return 0;

    // Analyze the nearest sharp curve
    const nearestCurve = upcomingCurves[0];
    const curveRadius = this.calculateCurveRadius(nearestCurve.points);
    const distance = nearestCurve.distance;

    // Categorize curve sharpness
    let baseRisk = 0;
    if (curveRadius < CURVE_RADIUS.HAIRPIN) {
      baseRisk = 80; // Hairpin turn
    } else if (curveRadius < CURVE_RADIUS.SHARP) {
      baseRisk = 60; // Sharp turn
    } else if (curveRadius < CURVE_RADIUS.MODERATE) {
      baseRisk = 35; // Moderate turn
    } else if (curveRadius < CURVE_RADIUS.GENTLE) {
      baseRisk = 15; // Gentle turn
    } else {
      return 0; // Straight road
    }

    // Adjust for distance (closer = higher risk)
    let distanceMultiplier = 1.0;
    if (distance < 50) {
      distanceMultiplier = 1.5;
    } else if (distance < 100) {
      distanceMultiplier = 1.2;
    } else if (distance > 250) {
      distanceMultiplier = 0.7;
    }

    // Adjust for current speed (faster = higher risk)
    const { currentSpeed = 0, speedLimit = 50 } = context;
    const speedRatio = currentSpeed / speedLimit;
    const speedMultiplier = speedRatio > 1.0 ? 1 + (speedRatio - 1) * 0.5 : 1.0;

    // Adjust for weather
    const weatherMultiplier = context.weather 
      ? this.getWeatherRiskMultiplier(context.weather) 
      : 1.0;

    const risk = baseRisk * distanceMultiplier * speedMultiplier * weatherMultiplier;
    return Math.min(100, Math.round(risk));
  }

  /**
   * Calculate collision proximity risk
   * Analyzes nearby hazards and obstacles
   */
  private calculateCollisionRisk(context: PredictionContext): number {
    const nearbyHazards = this.findNearbyHazards(context);
    if (nearbyHazards.length === 0) return 0;

    // Find the highest risk hazard
    let maxRisk = 0;

    for (const hazard of nearbyHazards) {
      const distance = hazard.distance;
      
      // Base risk by distance
      let hazardRisk = 0;
      if (distance < 50) {
        hazardRisk = 90; // Very close
      } else if (distance < 100) {
        hazardRisk = 70; // Close
      } else if (distance < 200) {
        hazardRisk = 45; // Approaching
      } else if (distance < 300) {
        hazardRisk = 25; // Far
      }

      // Adjust for hazard severity
      if (hazard.severity >= 80) {
        hazardRisk = Math.min(100, hazardRisk * 1.3);
      }

      maxRisk = Math.max(maxRisk, hazardRisk);
    }

    // Adjust for driver stress
    const driverStress = context.driverStress || EmotionEngine.getDriverState()?.stress || 20;
    if (driverStress > 70) {
      maxRisk = Math.min(100, maxRisk + 15); // High stress slows reaction
    }

    return Math.round(maxRisk);
  }

  /**
   * Calculate late braking risk
   * Compares required braking distance with available distance
   */
  private calculateLateBrakingRisk(context: PredictionContext): number {
    const { currentSpeed = 0, weather } = context;
    
    if (currentSpeed < 10) return 0; // Too slow to matter

    // Calculate required braking distance
    const driverStress = context.driverStress || EmotionEngine.getDriverState()?.stress || 20;
    const reactionTime = driverStress > 60 
      ? REACTION_TIME_STRESSED 
      : REACTION_TIME_NORMAL;

    const friction = this.getRoadFriction(weather);
    const stoppingDistance = this.calculateStoppingDistance(currentSpeed, reactionTime, friction);

    // Find upcoming obstacles that require braking
    const upcomingObstacles = this.findUpcomingObstacles(context);
    if (upcomingObstacles.length === 0) return 0;

    // Check if any obstacle is within braking distance
    let maxRisk = 0;

    for (const obstacle of upcomingObstacles) {
      const availableDistance = obstacle.distance;
      const deficit = stoppingDistance - availableDistance;

      if (deficit > 0) {
        // Insufficient braking distance!
        const riskPercent = Math.min(100, (deficit / stoppingDistance) * 150);
        maxRisk = Math.max(maxRisk, riskPercent);
      } else {
        // Sufficient distance but calculate margin
        const margin = availableDistance - stoppingDistance;
        if (margin < 20) {
          maxRisk = Math.max(maxRisk, 50); // Close call
        } else if (margin < 50) {
          maxRisk = Math.max(maxRisk, 25); // Tight margin
        }
      }
    }

    return Math.round(maxRisk);
  }

  /**
   * Calculate lane deviation risk
   * Placeholder for future GPS/camera-based lane tracking
   * See BACKLOG.md: Lane Deviation Prediction (PredictiveEngine)
   */
  private calculateLaneDeviationRisk(context: PredictionContext): number {
    // Would require GPS accuracy + map lane data or camera vision
    
    const driverStress = context.driverStress || EmotionEngine.getDriverState()?.stress || 20;
    
    // Simple heuristic: high stress increases lane deviation risk
    if (driverStress > 75) {
      return 45; // High stress -> moderate lane deviation risk
    } else if (driverStress > 60) {
      return 25; // Moderate stress
    }

    return 0;
  }

  /**
   * Calculate overall weighted risk score
   */
  private calculateOverallRisk(
    scores: Omit<RiskScores, 'overall'>,
    context: PredictionContext
  ): number {
    const { overspeed, sharpTurn, collision, lateBraking, laneDeviation } = scores;

    // Weight factors based on research
    const operational = (overspeed * 0.4 + lateBraking * 0.6) * RISK_WEIGHTS.operational;
    const environmental = (sharpTurn * 0.7 + laneDeviation * 0.3) * RISK_WEIGHTS.environmental;
    const hazardRisk = collision * RISK_WEIGHTS.hazards;

    // Human factor contribution
    const driverStress = context.driverStress || EmotionEngine.getDriverState()?.stress || 20;
    const humanFactor = (driverStress / 100) * 100 * RISK_WEIGHTS.human;

    const overall = operational + environmental + hazardRisk + humanFactor;
    return Math.min(100, Math.round(overall));
  }

  // ========== Helper Methods ==========

  private calculateStoppingDistance(
    speedKmh: number, 
    reactionTime: number, 
    friction: number
  ): number {
    // Convert speed to m/s
    const speedMs = speedKmh / 3.6;
    
    // Reaction distance
    const reactionDist = speedMs * reactionTime;
    
    // Braking distance: speed² / (250 × friction)
    const brakingDist = (speedKmh ** 2) / (250 * friction);
    
    return reactionDist + brakingDist;
  }

  private getRoadFriction(weather?: WeatherNow): number {
    if (!weather) return FRICTION_DRY;

    switch (weather.condition) {
      case 'snow':
        return FRICTION_SNOW;
      case 'rain':
      case 'storm':
        return FRICTION_WET;
      case 'fog':
        return FRICTION_WET * 0.9; // Slightly better than rain
      default:
        return FRICTION_DRY;
    }
  }

  private getWeatherRiskMultiplier(weather: WeatherNow): number {
    switch (weather.condition) {
      case 'snow':
        return 1.6; // 60% risk increase
      case 'storm':
        return 1.5;
      case 'rain':
        return 1.3;
      case 'fog':
        return 1.2;
      default:
        return 1.0;
    }
  }

  private calculateDistance(
    lat1: number, lng1: number,
    lat2: number, lng2: number
  ): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Detect upcoming curves in the route within lookahead distance
   */
  private detectUpcomingCurves(
    route: Array<[number, number]>,
    currentPosition: [number, number]
  ): Array<{ points: Array<[number, number]>; distance: number }> {
    const curves: Array<{ points: Array<[number, number]>; distance: number }> = [];
    
    // Find current position index in route
    let startIdx = 0;
    let minDist = Infinity;
    
    for (let i = 0; i < route.length; i++) {
      const dist = this.calculateDistance(
        currentPosition[0], currentPosition[1],
        route[i][0], route[i][1]
      );
      if (dist < minDist) {
        minDist = dist;
        startIdx = i;
      }
    }

    // Analyze route segments within lookahead distance
    let accumulatedDist = 0;
    for (let i = startIdx; i < route.length - 2; i++) {
      const segmentDist = this.calculateDistance(
        route[i][0], route[i][1],
        route[i + 1][0], route[i + 1][1]
      );
      accumulatedDist += segmentDist;

      if (accumulatedDist > LOOKAHEAD_DISTANCE) break;

      // Check if this segment is curved (using 3 points)
      if (i + 2 < route.length) {
        const radius = this.calculateCurveRadius([route[i], route[i + 1], route[i + 2]]);
        if (radius < CURVE_RADIUS.GENTLE) {
          curves.push({
            points: [route[i], route[i + 1], route[i + 2]],
            distance: accumulatedDist,
          });
        }
      }
    }

    return curves;
  }

  /**
   * Calculate curve radius from 3 GPS points using circumcircle method
   */
  private calculateCurveRadius(points: Array<[number, number]>): number {
    if (points.length < 3) return Infinity;

    const [p1, p2, p3] = points;

    // Calculate distances between points (Haversine)
    const a = this.calculateDistance(p1[0], p1[1], p2[0], p2[1]);
    const b = this.calculateDistance(p2[0], p2[1], p3[0], p3[1]);
    const c = this.calculateDistance(p3[0], p3[1], p1[0], p1[1]);

    // Heron's formula for area
    const s = (a + b + c) / 2;
    const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));

    if (area === 0) return Infinity; // Straight line

    // Circumradius formula: R = (a × b × c) / (4 × Area)
    const radius = (a * b * c) / (4 * area);

    return radius;
  }

  private findNearbyHazards(context: PredictionContext): Array<{
    distance: number;
    severity: number;
  }> {
    const nearby: Array<{ distance: number; severity: number }> = [];
    
    if (!context.position) return nearby;

    // Check hazards
    if (context.hazards) {
      for (const hazard of context.hazards) {
        const distance = this.calculateDistance(
          context.position[0], context.position[1],
          hazard.coordinates[0], hazard.coordinates[1]
        );

        if (distance <= LOOKAHEAD_DISTANCE) {
          const severity = hazard.severity === 'high' ? 80 : hazard.severity === 'medium' ? 50 : 30;
          nearby.push({ distance, severity });
        }
      }
    }

    // Check speed cameras
    if (context.speedCameras) {
      for (const camera of context.speedCameras) {
        const distance = this.calculateDistance(
          context.position[0], context.position[1],
          camera.lat, camera.lon
        );

        if (distance <= LOOKAHEAD_DISTANCE) {
          nearby.push({ distance, severity: 60 });
        }
      }
    }

    return nearby.sort((a, b) => a.distance - b.distance);
  }

  private findUpcomingObstacles(context: PredictionContext): Array<{
    distance: number;
    type: string;
  }> {
    // Combine hazards and cameras as obstacles
    const obstacles: Array<{ distance: number; type: string }> = [];

    const nearby = this.findNearbyHazards(context);
    return nearby.map(h => ({ distance: h.distance, type: 'hazard' }));
  }

  private extractRiskFactors(scores: RiskScores, context: PredictionContext): RiskFactor[] {
    const factors: RiskFactor[] = [];

    const addFactor = (type: keyof RiskScores, score: number, reason: string, distance: number) => {
      if (score > 20) {
        let severity: RiskFactor['severity'] = 'low';
        if (score >= 75) severity = 'critical';
        else if (score >= 50) severity = 'high';
        else if (score >= 35) severity = 'moderate';

        factors.push({ type, score, reason, distance, severity });
      }
    };

    addFactor('overspeed', scores.overspeed, 'Speed exceeds limit', 0);
    addFactor('sharpTurn', scores.sharpTurn, 'Sharp curve ahead', 100);
    addFactor('collision', scores.collision, 'Nearby hazard detected', 150);
    addFactor('lateBraking', scores.lateBraking, 'Insufficient braking distance', 80);
    addFactor('laneDeviation', scores.laneDeviation, 'High stress - stay focused', 0);

    return factors.sort((a, b) => b.score - a.score);
  }

  private getZeroRiskScores(): RiskScores {
    return {
      overspeed: 0,
      sharpTurn: 0,
      collision: 0,
      lateBraking: 0,
      laneDeviation: 0,
      overall: 0,
    };
  }

  getLastPrediction(): RiskScores | null {
    return this.lastPrediction;
  }

  getDangerZones(): DangerZone[] {
    return [...this.dangerZones];
  }
}

// Singleton instance
export const PredictiveEngine = new PredictiveEngineImpl();
