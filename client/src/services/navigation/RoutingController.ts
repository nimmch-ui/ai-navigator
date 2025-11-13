/**
 * RoutingController - Dynamic rerouting logic with traffic awareness
 * 
 * Monitors traffic conditions and route progress to automatically suggest
 * better routes when congestion or incidents are detected ahead.
 */

import type { RouteResult } from '../routing';
import type { WeatherNow, TrafficIncidentData } from '../data/types';
import type { TransportMode, RoutePreference } from '../preferences';
import { calculateRoute } from '../routing';
import { trafficFusionEngine } from '../ai/TrafficFusionEngine';
import { computeETA, type ETAResult } from './SmartETA';
import { EventBus } from '../eventBus';
import { PreferencesService } from '../preferences';
import { voiceGuidanceService } from '../voiceGuidance';

export type RerouteMode = 'auto' | 'manual';

export interface RerouteProposal {
  alternativeRoute: RouteResult;
  currentRoute: RouteResult;
  timeSaved: number; // seconds
  distanceImpact: number; // meters (positive = longer, negative = shorter)
  ecoImpact: number; // percentage change in efficiency
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

export interface RerouteThresholds {
  minTimeSaved: number; // seconds
  maxDistanceIncrease: number; // meters
  minCongestionLevel: number; // 0-100
  incidentSeverityThreshold: 'low' | 'medium' | 'high';
}

export interface RoutingControllerState {
  currentRoute: RouteResult | null;
  currentPosition: [number, number] | null;
  destination: [number, number] | null;
  mode: TransportMode;
  preference: RoutePreference;
  rerouteMode: RerouteMode;
  lastRerouteCheck: number;
  lastProposal: RerouteProposal | null;
}

const DEFAULT_THRESHOLDS: RerouteThresholds = {
  minTimeSaved: 180, // 3 minutes
  maxDistanceIncrease: 5000, // 5km
  minCongestionLevel: 60, // 60%+
  incidentSeverityThreshold: 'medium',
};

export class RoutingController {
  private state: RoutingControllerState;
  private thresholds: RerouteThresholds;
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private readonly CHECK_INTERVAL_MS = 60000; // Check every minute
  private isEvaluating: boolean = false;

  constructor(
    mode: TransportMode = 'car',
    preference: RoutePreference = 'fastest',
    rerouteMode: RerouteMode = 'manual'
  ) {
    this.state = {
      currentRoute: null,
      currentPosition: null,
      destination: null,
      mode,
      preference,
      rerouteMode,
      lastRerouteCheck: 0,
      lastProposal: null,
    };
    
    this.thresholds = { ...DEFAULT_THRESHOLDS };
  }

  /**
   * Start monitoring for rerouting opportunities
   */
  startMonitoring(
    initialRoute: RouteResult,
    destination: [number, number],
    currentPosition: [number, number]
  ): void {
    this.state.currentRoute = initialRoute;
    this.state.destination = destination;
    this.state.currentPosition = currentPosition;

    // Set up periodic reroute checks
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.evaluateReroute();
    }, this.CHECK_INTERVAL_MS);

    // Listen for traffic updates
    EventBus.on('ai:trafficUpdate' as any, this.handleTrafficUpdate.bind(this));

    console.log('[RoutingController] Started monitoring for reroutes');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    EventBus.off('ai:trafficUpdate' as any, this.handleTrafficUpdate.bind(this));
    
    console.log('[RoutingController] Stopped monitoring');
  }

  /**
   * Update current position
   */
  updatePosition(position: [number, number]): void {
    this.state.currentPosition = position;
  }

  /**
   * Set reroute mode (auto/manual)
   */
  setRerouteMode(mode: RerouteMode): void {
    this.state.rerouteMode = mode;
    console.log('[RoutingController] Reroute mode:', mode);
  }

  /**
   * Accept a reroute proposal
   */
  acceptReroute(proposal: RerouteProposal): void {
    this.state.currentRoute = proposal.alternativeRoute;
    this.state.lastProposal = null;
    
    EventBus.emit('route:reroute_accepted' as any, {
      newRoute: proposal.alternativeRoute,
      timeSaved: proposal.timeSaved,
      reason: proposal.reason,
    });
    
    console.log('[RoutingController] Reroute accepted, time saved:', proposal.timeSaved);
  }

  /**
   * Reject a reroute proposal
   */
  rejectReroute(): void {
    this.state.lastProposal = null;
    console.log('[RoutingController] Reroute rejected');
  }

  /**
   * Handle traffic update events
   */
  private handleTrafficUpdate(): void {
    // Throttle: only check if last check was >30 seconds ago
    const now = Date.now();
    if (now - this.state.lastRerouteCheck < 30000) {
      return;
    }

    this.evaluateReroute();
  }

  /**
   * Evaluate if rerouting is beneficial
   */
  private async evaluateReroute(): Promise<void> {
    if (!this.state.currentRoute || !this.state.currentPosition || !this.state.destination) {
      return;
    }

    if (this.isEvaluating) {
      return; // Prevent overlapping evaluations
    }

    this.isEvaluating = true;
    this.state.lastRerouteCheck = Date.now();

    try {
      // Check if there's severe traffic or incidents ahead
      const congestionAhead = await this.checkCongestionAhead();
      const incidentsAhead = this.checkIncidentsAhead();

      if (!this.shouldConsiderReroute(congestionAhead, incidentsAhead)) {
        this.isEvaluating = false;
        return;
      }

      console.log('[RoutingController] Traffic ahead detected, evaluating alternatives...');
      
      // Voice prompt: "Traffic ahead, recalculating best route."
      voiceGuidanceService.announce('Traffic ahead, recalculating best route.', {
        priority: 'normal',
      });
      
      EventBus.emit('route:evaluating_alternatives' as any, {
        congestion: congestionAhead,
        incidents: incidentsAhead.length,
      });

      // Calculate alternative routes
      const alternativeRoute = await calculateRoute(
        this.state.currentPosition,
        this.state.destination,
        this.state.mode,
        this.state.preference
      );

      // Compare routes
      const proposal = await this.compareRoutes(
        this.state.currentRoute,
        alternativeRoute,
        congestionAhead,
        incidentsAhead
      );

      if (proposal && this.meetsRerouteThresholds(proposal)) {
        this.state.lastProposal = proposal;

        // Voice prompt with time saved
        const minutesSaved = Math.round(proposal.timeSaved / 60);
        const voiceText = `New route available, ${minutesSaved} ${minutesSaved === 1 ? 'minute' : 'minutes'} faster.`;
        
        voiceGuidanceService.announce(voiceText, {
          priority: proposal.severity === 'high' ? 'high' : 'normal',
        });

        if (this.state.rerouteMode === 'auto') {
          // Auto-accept reroute
          this.acceptReroute(proposal);
        } else {
          // Emit proposal for user decision
          EventBus.emit('route:reroute_proposal' as any, proposal);
        }
      }
    } catch (error) {
      console.error('[RoutingController] Reroute evaluation failed:', error);
    } finally {
      this.isEvaluating = false;
    }
  }

  /**
   * Check congestion level ahead on current route
   */
  private async checkCongestionAhead(): Promise<number> {
    if (!this.state.currentRoute || !this.state.currentPosition) {
      return 0;
    }

    // Get upcoming route segments (next 5km)
    const upcomingSegments = this.getUpcomingSegments(5000);
    
    if (upcomingSegments.length === 0) {
      return 0;
    }

    // Calculate average congestion
    const totalCongestion = upcomingSegments.reduce((sum, seg) => sum + (seg.congestion || 0), 0);
    return totalCongestion / upcomingSegments.length;
  }

  /**
   * Check for incidents ahead on current route
   */
  private checkIncidentsAhead(): TrafficIncidentData[] {
    if (!this.state.currentPosition) {
      return [];
    }

    // Get incidents within 10km ahead
    return trafficFusionEngine.getUpcomingIncidents(
      this.state.currentPosition,
      10000
    );
  }

  /**
   * Check if we should consider rerouting
   */
  private shouldConsiderReroute(
    congestion: number,
    incidents: TrafficIncidentData[]
  ): boolean {
    // High congestion threshold
    if (congestion >= this.thresholds.minCongestionLevel) {
      return true;
    }

    // Severe incidents
    const severeIncidents = incidents.filter(
      i => i.severity === 'severe' || i.severity === 'high'
    );
    
    if (severeIncidents.length > 0) {
      return true;
    }

    // Medium severity with multiple incidents
    const mediumIncidents = incidents.filter(i => i.severity === 'medium');
    if (mediumIncidents.length >= 2) {
      return true;
    }

    return false;
  }

  /**
   * Compare current route with alternative
   */
  private async compareRoutes(
    currentRoute: RouteResult,
    alternativeRoute: RouteResult,
    congestion: number,
    incidents: TrafficIncidentData[]
  ): Promise<RerouteProposal | null> {
    // Get current weather
    const weather = null; // TODO: Get from weather service

    // Compute ETAs with traffic awareness
    const currentETA = computeETA(currentRoute, weather);
    const alternativeETA = computeETA(alternativeRoute, weather);

    const timeSaved = currentETA.estimatedSeconds - alternativeETA.estimatedSeconds;
    const distanceImpact = alternativeRoute.distance - currentRoute.distance;
    
    // Calculate eco impact (based on distance efficiency)
    const ecoImpact = ((alternativeRoute.distance - currentRoute.distance) / currentRoute.distance) * 100;

    // Determine reason and severity
    let reason = 'Traffic conditions ahead';
    let severity: 'low' | 'medium' | 'high' = 'low';

    if (incidents.length > 0) {
      const severeCount = incidents.filter(i => i.severity === 'severe').length;
      if (severeCount > 0) {
        reason = `${severeCount} severe ${severeCount === 1 ? 'incident' : 'incidents'} ahead`;
        severity = 'high';
      } else {
        reason = `${incidents.length} ${incidents.length === 1 ? 'incident' : 'incidents'} ahead`;
        severity = 'medium';
      }
    } else if (congestion >= 80) {
      reason = 'Severe traffic congestion ahead';
      severity = 'high';
    } else if (congestion >= 60) {
      reason = 'Heavy traffic ahead';
      severity = 'medium';
    }

    return {
      alternativeRoute,
      currentRoute,
      timeSaved,
      distanceImpact,
      ecoImpact,
      reason,
      severity,
    };
  }

  /**
   * Check if proposal meets thresholds
   */
  private meetsRerouteThresholds(proposal: RerouteProposal): boolean {
    // Must save enough time
    if (proposal.timeSaved < this.thresholds.minTimeSaved) {
      return false;
    }

    // Distance increase must be reasonable
    if (proposal.distanceImpact > this.thresholds.maxDistanceIncrease) {
      return false;
    }

    return true;
  }

  /**
   * Get upcoming route segments based on current position
   */
  private getUpcomingSegments(distanceMeters: number): any[] {
    if (!this.state.currentRoute || !this.state.currentPosition) {
      return [];
    }

    const route = this.state.currentRoute;
    const currentPos = this.state.currentPosition;
    
    // Find closest point on route to current position
    let closestIndex = 0;
    let minDistance = Infinity;
    
    for (let i = 0; i < route.geometry.length; i++) {
      const [lat, lng] = route.geometry[i];
      const distance = this.calculateDistance(currentPos, [lat, lng]);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }

    // Extract upcoming segments within distance
    const upcomingCoords: [number, number][] = [];
    let accumulatedDistance = 0;
    
    for (let i = closestIndex; i < route.geometry.length - 1 && accumulatedDistance < distanceMeters; i++) {
      const from = route.geometry[i];
      const to = route.geometry[i + 1];
      const segmentDistance = this.calculateDistance(from as [number, number], to as [number, number]);
      accumulatedDistance += segmentDistance;
      upcomingCoords.push(from as [number, number]);
    }

    // Get traffic data for upcoming segments
    const segments = trafficFusionEngine.getAllSegments();
    const enrichedUpcoming = upcomingCoords.map(coord => {
      // Find nearest traffic segment
      let nearest = null;
      let nearestDist = Infinity;
      
      for (const segment of segments) {
        if (segment.coordinates.length === 0) continue;
        const segCenter = segment.coordinates[Math.floor(segment.coordinates.length / 2)];
        const dist = this.calculateDistance(coord, segCenter);
        if (dist < nearestDist && dist < 1000) { // Within 1km
          nearestDist = dist;
          nearest = segment;
        }
      }
      
      return {
        coords: coord,
        congestion: nearest?.congestion || 0,
        incidents: nearest?.incidents || [],
      };
    });

    return enrichedUpcoming;
  }

  /**
   * Calculate distance between two points (Haversine formula)
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
   * Get current state
   */
  getState(): RoutingControllerState {
    return { ...this.state };
  }
}

// Singleton instance
export const routingController = new RoutingController();
