import type { TrafficFlow } from '../data/types';
import type { TrafficIncident } from '@shared/schema';
import { nanoid } from 'nanoid';

export class TrafficIncidentSynthesizer {
  private congestionThreshold = 0.6;
  
  synthesizeFromFlow(flowData: TrafficFlow[]): TrafficIncident[] {
    const incidents: TrafficIncident[] = [];
    
    for (const flow of flowData) {
      const congestionRatio = flow.speed / flow.freeFlowSpeed;
      
      if (congestionRatio >= this.congestionThreshold) {
        continue;
      }
      
      const severity = this.determineSeverity(flow.congestionLevel);
      const delayMinutes = this.estimateDelay(flow.congestionLevel, congestionRatio);
      
      if (flow.coordinates.length === 0) continue;
      
      const midpoint = flow.coordinates[Math.floor(flow.coordinates.length / 2)];
      
      incidents.push({
        id: `flow-${flow.id}`,
        type: 'congestion',
        severity,
        location: midpoint,
        description: this.generateDescription(flow.congestionLevel, flow.speed, flow.freeFlowSpeed),
        delayMinutes,
        affectsRoute: false,
      });
    }
    
    return incidents;
  }
  
  private determineSeverity(level: TrafficFlow['congestionLevel']): TrafficIncident['severity'] {
    switch (level) {
      case 'low':
        return 'low';
      case 'moderate':
        return 'moderate';
      case 'high':
        return 'severe';
      case 'severe':
        return 'severe';
      default:
        return 'low';
    }
  }
  
  private estimateDelay(level: TrafficFlow['congestionLevel'], congestionRatio: number): number {
    const baseDelays = {
      low: 2,
      moderate: 5,
      high: 10,
      severe: 15,
    };
    
    const base = baseDelays[level];
    const factor = 1 - congestionRatio;
    
    return Math.round(base * (1 + factor));
  }
  
  private generateDescription(level: string, speed: number, freeFlowSpeed: number): string {
    const speedDiff = freeFlowSpeed - speed;
    
    if (level === 'severe') {
      return `Severe congestion - traffic moving ${Math.round(speedDiff)} km/h slower than normal`;
    }
    
    if (level === 'high') {
      return `Heavy traffic - delays expected`;
    }
    
    if (level === 'moderate') {
      return `Moderate congestion - slow moving traffic`;
    }
    
    return `Light congestion`;
  }
}
