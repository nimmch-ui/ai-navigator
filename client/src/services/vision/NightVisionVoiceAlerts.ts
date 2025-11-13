/**
 * Night Vision Voice Alerts
 * 
 * Provides voice alerts for night vision detections including:
 * - Animal detected on right/left
 * - Pedestrian crossing ahead
 * - Low visibility zone warnings
 * - Road edge detection alerts
 */

import { voiceGuidance, type VoiceAnnouncementOptions } from '@/services/voiceGuidance';
import type { DetectionResult } from './NightVisionService';
import { PreferencesService } from '@/services/preferences';

export type NightVisionAlertType = 
  | 'animal_detected' 
  | 'pedestrian_detected' 
  | 'low_visibility'
  | 'road_edge_lost'
  | 'multiple_hazards';

export interface NightVisionAlert {
  type: NightVisionAlertType;
  direction?: 'left' | 'right' | 'ahead' | 'behind';
  distance?: number;
  severity?: 'low' | 'moderate' | 'high' | 'critical';
}

class NightVisionVoiceAlerts {
  private lastAnimalAlert: number = 0;
  private lastPedestrianAlert: number = 0;
  private lastLowVisibilityAlert: number = 0;
  private lastEdgeAlert: number = 0;
  
  private readonly ANIMAL_THROTTLE_MS = 15000; // 15 seconds
  private readonly PEDESTRIAN_THROTTLE_MS = 10000; // 10 seconds
  private readonly LOW_VISIBILITY_THROTTLE_MS = 30000; // 30 seconds
  private readonly EDGE_THROTTLE_MS = 20000; // 20 seconds

  /**
   * Announce night vision alert with appropriate voice style
   */
  announceAlert(alert: NightVisionAlert): boolean {
    const now = Date.now();
    const preferences = PreferencesService.getPreferences();
    const voiceStyle = preferences.voiceStyle;

    // Check throttling
    if (!this.shouldAnnounce(alert, now)) {
      return false;
    }

    const message = this.generateMessage(alert, voiceStyle);
    const options: VoiceAnnouncementOptions = {
      priority: this.getPriority(alert),
      isCritical: alert.severity === 'critical',
      entityId: `night_vision_${alert.type}`,
      throttleMs: this.getThrottleMs(alert.type),
    };

    // Update last alert time
    this.updateLastAlertTime(alert.type, now);

    return voiceGuidance.announce(message, options);
  }

  /**
   * Process detections and trigger appropriate alerts
   */
  processDetections(detections: DetectionResult[], lowVisibility: boolean = false): void {
    if (lowVisibility) {
      this.announceAlert({
        type: 'low_visibility',
        severity: 'moderate',
      });
    }

    const animals = detections.filter(d => d.type === 'animal');
    const pedestrians = detections.filter(d => d.type === 'pedestrian');

    // Alert for animals
    animals.forEach((detection, index) => {
      if (index === 0) { // Only alert for first detection to avoid spam
        const direction = this.estimateDirection(detection);
        this.announceAlert({
          type: 'animal_detected',
          direction,
          severity: detection.confidence > 0.8 ? 'high' : 'moderate',
        });
      }
    });

    // Alert for pedestrians
    pedestrians.forEach((detection, index) => {
      if (index === 0) {
        const direction = this.estimateDirection(detection);
        this.announceAlert({
          type: 'pedestrian_detected',
          direction,
          severity: detection.confidence > 0.8 ? 'critical' : 'high',
        });
      }
    });

    // Alert for multiple hazards
    if (animals.length + pedestrians.length > 2) {
      this.announceAlert({
        type: 'multiple_hazards',
        severity: 'critical',
      });
    }
  }

  /**
   * Estimate direction of detection based on bbox position
   */
  private estimateDirection(detection: DetectionResult): 'left' | 'right' | 'ahead' {
    if (!detection.bbox) return 'ahead';

    const centerX = detection.bbox.x + detection.bbox.width / 2;
    const frameWidth = 640; // Standard frame width

    if (centerX < frameWidth * 0.33) {
      return 'left';
    } else if (centerX > frameWidth * 0.67) {
      return 'right';
    } else {
      return 'ahead';
    }
  }

  /**
   * Check if alert should be announced based on throttling
   */
  private shouldAnnounce(alert: NightVisionAlert, now: number): boolean {
    switch (alert.type) {
      case 'animal_detected':
        return now - this.lastAnimalAlert >= this.ANIMAL_THROTTLE_MS;
      case 'pedestrian_detected':
        return now - this.lastPedestrianAlert >= this.PEDESTRIAN_THROTTLE_MS;
      case 'low_visibility':
        return now - this.lastLowVisibilityAlert >= this.LOW_VISIBILITY_THROTTLE_MS;
      case 'road_edge_lost':
        return now - this.lastEdgeAlert >= this.EDGE_THROTTLE_MS;
      case 'multiple_hazards':
        return true; // Always announce multiple hazards
      default:
        return true;
    }
  }

  /**
   * Update last alert time for throttling
   */
  private updateLastAlertTime(type: NightVisionAlertType, time: number): void {
    switch (type) {
      case 'animal_detected':
        this.lastAnimalAlert = time;
        break;
      case 'pedestrian_detected':
        this.lastPedestrianAlert = time;
        break;
      case 'low_visibility':
        this.lastLowVisibilityAlert = time;
        break;
      case 'road_edge_lost':
        this.lastEdgeAlert = time;
        break;
    }
  }

  /**
   * Get priority level for alert
   */
  private getPriority(alert: NightVisionAlert): 'low' | 'normal' | 'high' {
    if (alert.severity === 'critical') return 'high';
    if (alert.severity === 'high') return 'high';
    if (alert.type === 'pedestrian_detected') return 'high';
    if (alert.type === 'multiple_hazards') return 'high';
    return 'normal';
  }

  /**
   * Get throttle duration for alert type
   */
  private getThrottleMs(type: NightVisionAlertType): number {
    switch (type) {
      case 'animal_detected':
        return this.ANIMAL_THROTTLE_MS;
      case 'pedestrian_detected':
        return this.PEDESTRIAN_THROTTLE_MS;
      case 'low_visibility':
        return this.LOW_VISIBILITY_THROTTLE_MS;
      case 'road_edge_lost':
        return this.EDGE_THROTTLE_MS;
      case 'multiple_hazards':
        return 5000; // 5 seconds for multiple hazards
      default:
        return 15000;
    }
  }

  /**
   * Generate message based on alert type and voice style
   */
  private generateMessage(
    alert: NightVisionAlert,
    voiceStyle: 'neutral' | 'warm' | 'energetic'
  ): string {
    const directionText = alert.direction ? ` on ${alert.direction}` : '';
    const distanceText = alert.distance ? ` ${Math.round(alert.distance)} meters ahead` : '';

    const messages: Record<NightVisionAlertType, Record<typeof voiceStyle, string[]>> = {
      animal_detected: {
        neutral: [
          `Animal detected${directionText}. Exercise caution.`,
          `Wildlife ahead${directionText}. Slow down.`,
          `Animal on roadway${directionText}. Be prepared to stop.`,
        ],
        warm: [
          `Heads up, there's an animal${directionText}. Let's be careful.`,
          `Watch out for wildlife${directionText}. Take it easy.`,
          `Animal spotted${directionText}. Let's slow down for safety.`,
        ],
        energetic: [
          `Animal alert${directionText}! Watch out!`,
          `Wildlife detected${directionText}! Slow down now!`,
          `Danger! Animal${directionText}! Be ready to brake!`,
        ],
      },
      pedestrian_detected: {
        neutral: [
          `Pedestrian crossing ahead. Reduce speed.`,
          `Person detected${directionText}. Exercise caution.`,
          `Pedestrian alert${distanceText}. Slow down.`,
        ],
        warm: [
          `Someone's crossing ahead. Let's slow down for them.`,
          `Pedestrian spotted${directionText}. Let's give them space.`,
          `Watch for people ahead. Take it easy.`,
        ],
        energetic: [
          `Pedestrian ahead! Slow down now!`,
          `Person crossing! Reduce speed!`,
          `Watch out! Pedestrian${directionText}!`,
        ],
      },
      low_visibility: {
        neutral: [
          'Low visibility conditions detected. Reduce speed and maintain safe distance.',
          'Poor visibility zone ahead. Exercise extra caution.',
          'Limited visibility. Slow down and stay alert.',
        ],
        warm: [
          'It\'s getting hard to see out there. Let\'s slow down and stay safe.',
          'Visibility is pretty low here. Let\'s take it easy.',
          'Can\'t see much ahead. Better slow down and be extra careful.',
        ],
        energetic: [
          'Low visibility! Slow down now!',
          'Can\'t see ahead! Reduce speed!',
          'Poor visibility zone! Stay alert!',
        ],
      },
      road_edge_lost: {
        neutral: [
          'Road edge detection lost. Stay centered in lane.',
          'Limited road visibility. Maintain lane position.',
          'Road markings unclear. Focus on lane keeping.',
        ],
        warm: [
          'Having trouble seeing the road edges. Let\'s stay centered.',
          'Can\'t make out the road lines. Keep it steady in the middle.',
          'Road visibility is low. Stay focused on your lane.',
        ],
        energetic: [
          'Road edge lost! Stay centered!',
          'Can\'t see road lines! Focus!',
          'Lane visibility poor! Stay in lane!',
        ],
      },
      multiple_hazards: {
        neutral: [
          'Multiple hazards detected. Reduce speed immediately.',
          'Several obstacles ahead. Exercise extreme caution.',
          'Multiple threats detected. Slow down now.',
        ],
        warm: [
          'Whoa, lot\'s happening ahead. Let\'s slow down right now.',
          'Multiple things to watch out for. Better reduce speed.',
          'Several hazards ahead. Let\'s be extra careful here.',
        ],
        energetic: [
          'Multiple hazards! Slow down now!',
          'Danger ahead! Multiple threats! Brake!',
          'Warning! Several obstacles! Reduce speed!',
        ],
      },
    };

    const variations = messages[alert.type]?.[voiceStyle] || messages[alert.type]?.['neutral'] || [];
    const randomIndex = Math.floor(Math.random() * variations.length);

    return variations[randomIndex] || 'Night vision alert.';
  }

  /**
   * Clear all throttle timers (useful for testing)
   */
  clearThrottles(): void {
    this.lastAnimalAlert = 0;
    this.lastPedestrianAlert = 0;
    this.lastLowVisibilityAlert = 0;
    this.lastEdgeAlert = 0;
  }
}

// Export singleton instance
export const nightVisionVoiceAlerts = new NightVisionVoiceAlerts();
