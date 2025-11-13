/**
 * Night Vision Hazard Integration
 * 
 * Links night vision detections into the existing Radar/Hazard AI pipeline
 * Publishes detection events to EventBus for consumption by other systems
 */

import { EventBus } from '@/services/eventBus';
import type { DetectionResult, NightVisionResult } from './NightVisionService';
import { nightVisionVoiceAlerts } from './NightVisionVoiceAlerts';

export interface NightVisionHazard {
  id: string;
  type: 'animal' | 'pedestrian' | 'road_line' | 'edge';
  confidence: number;
  position: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  direction?: 'left' | 'right' | 'ahead';
  timestamp: number;
  severity: 'low' | 'moderate' | 'high' | 'critical';
}

class NightVisionHazardIntegration {
  private activeHazards: Map<string, NightVisionHazard> = new Map();
  private hazardIdCounter = 0;
  private isEnabled = false;

  /**
   * Enable hazard integration
   */
  enable(): void {
    if (this.isEnabled) return;
    
    this.isEnabled = true;
    console.log('[NightVisionHazardIntegration] Enabled');
  }

  /**
   * Disable hazard integration
   */
  disable(): void {
    this.isEnabled = false;
    this.activeHazards.clear();
    console.log('[NightVisionHazardIntegration] Disabled');
  }

  /**
   * Process night vision results and integrate with hazard pipeline
   */
  processNightVisionResult(result: NightVisionResult): void {
    if (!this.isEnabled) return;

    // Clear stale hazards (older than 5 seconds)
    this.clearStaleHazards();

    // Convert detections to hazards
    const newHazards = this.detectionsToHazards(result.detections);

    // Update active hazards
    newHazards.forEach(hazard => {
      this.activeHazards.set(hazard.id, hazard);
    });

    // Determine if low visibility conditions exist
    const lowVisibility = this.isLowVisibility(result);

    // Trigger voice alerts
    nightVisionVoiceAlerts.processDetections(result.detections, lowVisibility);

    // Publish events to EventBus
    this.publishHazardEvents(newHazards);

    // Publish low visibility event if detected
    if (lowVisibility) {
      EventBus.publish('nightVision:lowVisibility', {
        severity: 'moderate',
        timestamp: Date.now(),
      });
    }

    // Publish summary statistics
    EventBus.publish('nightVision:stats', {
      totalDetections: result.detections.length,
      animals: result.detections.filter(d => d.type === 'animal').length,
      pedestrians: result.detections.filter(d => d.type === 'pedestrian').length,
      edges: result.detections.filter(d => d.type === 'edge').length,
      processingTime: result.processingTimeMs,
      activeHazards: this.activeHazards.size,
    });
  }

  /**
   * Convert detection results to hazard objects
   */
  private detectionsToHazards(detections: DetectionResult[]): NightVisionHazard[] {
    return detections
      .filter(d => d.type === 'animal' || d.type === 'pedestrian')
      .map(detection => {
        const hazard: NightVisionHazard = {
          id: `nv_${this.hazardIdCounter++}`,
          type: detection.type as 'animal' | 'pedestrian',
          confidence: detection.confidence,
          position: detection.bbox ? {
            x: detection.bbox.x,
            y: detection.bbox.y,
            width: detection.bbox.width,
            height: detection.bbox.height,
          } : {
            x: 0,
            y: 0,
          },
          direction: this.estimateDirection(detection),
          timestamp: Date.now(),
          severity: this.calculateSeverity(detection),
        };

        return hazard;
      });
  }

  /**
   * Estimate direction based on detection position
   */
  private estimateDirection(detection: DetectionResult): 'left' | 'right' | 'ahead' {
    if (!detection.bbox) return 'ahead';

    const centerX = detection.bbox.x + detection.bbox.width / 2;
    const frameWidth = 640;

    if (centerX < frameWidth * 0.33) {
      return 'left';
    } else if (centerX > frameWidth * 0.67) {
      return 'right';
    } else {
      return 'ahead';
    }
  }

  /**
   * Calculate severity based on confidence and type
   */
  private calculateSeverity(detection: DetectionResult): 'low' | 'moderate' | 'high' | 'critical' {
    // Pedestrians are always higher severity
    if (detection.type === 'pedestrian') {
      if (detection.confidence > 0.8) return 'critical';
      if (detection.confidence > 0.6) return 'high';
      return 'moderate';
    }

    // Animals severity based on confidence
    if (detection.type === 'animal') {
      if (detection.confidence > 0.85) return 'high';
      if (detection.confidence > 0.7) return 'moderate';
      return 'low';
    }

    return 'low';
  }

  /**
   * Determine if low visibility conditions exist
   */
  private isLowVisibility(result: NightVisionResult): boolean {
    // Heuristic: if processing time is high and few edge detections, visibility is low
    const edgeDetections = result.detections.filter(d => d.type === 'edge');
    return result.processingTimeMs > 40 || edgeDetections.length < 5;
  }

  /**
   * Clear hazards older than 5 seconds
   */
  private clearStaleHazards(): void {
    const now = Date.now();
    const staleThreshold = 5000; // 5 seconds

    this.activeHazards.forEach((hazard, id) => {
      if (now - hazard.timestamp > staleThreshold) {
        this.activeHazards.delete(id);
      }
    });
  }

  /**
   * Publish hazard events to EventBus
   */
  private publishHazardEvents(hazards: NightVisionHazard[]): void {
    hazards.forEach(hazard => {
      // Publish individual hazard event
      EventBus.publish('nightVision:hazardDetected', {
        hazard,
      });

      // Publish type-specific events
      if (hazard.type === 'animal') {
        EventBus.publish('nightVision:animalDetected', {
          direction: hazard.direction,
          confidence: hazard.confidence,
          severity: hazard.severity,
        });
      } else if (hazard.type === 'pedestrian') {
        EventBus.publish('nightVision:pedestrianDetected', {
          direction: hazard.direction,
          confidence: hazard.confidence,
          severity: hazard.severity,
        });
      }
    });
  }

  /**
   * Get all active hazards
   */
  getActiveHazards(): NightVisionHazard[] {
    return Array.from(this.activeHazards.values());
  }

  /**
   * Get hazards by type
   */
  getHazardsByType(type: 'animal' | 'pedestrian'): NightVisionHazard[] {
    return Array.from(this.activeHazards.values()).filter(h => h.type === type);
  }

  /**
   * Clear all hazards (useful for testing)
   */
  clearAllHazards(): void {
    this.activeHazards.clear();
  }
}

// Export singleton instance
export const nightVisionHazardIntegration = new NightVisionHazardIntegration();
