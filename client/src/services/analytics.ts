/**
 * Analytics Service
 * Provides observability for user interactions, mode changes, and feature usage.
 * Currently logs to console (stub), can be extended to send to analytics platform.
 */

import { UiMode } from '@/types/ui';

export type AnalyticsEvent =
  | 'mode_selected'
  | 'mode_fallback'
  | 'ar_permission_denied'
  | 'vr_unsupported'
  | 'tts_style_changed'
  | 'haptics_fired'
  | 'fps_throttle_enabled'
  | 'session_started'
  | 'session_ended'
  | 'navigation_started'
  | 'navigation_ended'
  | 'hazard_announced'
  | 'radar_announced'
  | 'sync_started'
  | 'sync_completed'
  | 'sync_conflict'
  | 'device_linked';

interface AnalyticsEventData {
  event: AnalyticsEvent;
  timestamp: number;
  properties?: Record<string, any>;
}

interface ModeSessionData {
  mode: UiMode;
  startTime: number;
  endTime?: number;
  duration?: number;
}

interface SessionSummary {
  sessionId: string;
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  modeUsage: Record<UiMode, number>; // Total time in ms per mode
  hazardsAnnounced: number;
  radarsAnnounced: number;
  modesUsed: UiMode[];
  fallbackEvents: number;
}

class AnalyticsService {
  private events: AnalyticsEventData[] = [];
  private sessionId: string;
  private sessionStartTime: number;
  private currentModeSession: ModeSessionData | null = null;
  private modeUsageTime: Record<UiMode, number> = {
    [UiMode.CLASSIC]: 0,
    [UiMode.THREED]: 0,
    [UiMode.CINEMATIC]: 0,
    [UiMode.AR]: 0,
    [UiMode.VR]: 0,
    [UiMode.ECO]: 0,
  };
  private hazardsAnnouncedCount: number = 0;
  private radarsAnnouncedCount: number = 0;
  private fallbackEventsCount: number = 0;
  private modesUsedSet: Set<UiMode> = new Set();

  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
    this.track('session_started', {
      sessionId: this.sessionId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    });
  }

  /**
   * Track an analytics event
   */
  track(event: AnalyticsEvent, properties?: Record<string, any>): void {
    const eventData: AnalyticsEventData = {
      event,
      timestamp: Date.now(),
      properties: {
        sessionId: this.sessionId,
        ...properties,
      },
    };

    this.events.push(eventData);

    // Log to console (stub - can be replaced with real analytics service)
    console.log(
      `[Analytics] ${event}`,
      properties ? properties : '',
      `(Session: ${this.sessionId})`
    );

    // Update session counters
    this.updateSessionCounters(event, properties);
  }

  /**
   * Start tracking mode session
   */
  startModeSession(mode: UiMode): void {
    // End previous mode session if exists
    if (this.currentModeSession) {
      this.endModeSession();
    }

    this.currentModeSession = {
      mode,
      startTime: Date.now(),
    };

    this.modesUsedSet.add(mode);

    this.track('mode_selected', {
      mode,
      timestamp: this.currentModeSession.startTime,
    });
  }

  /**
   * End current mode session and update usage time
   */
  endModeSession(): void {
    if (!this.currentModeSession) return;

    const endTime = Date.now();
    const duration = endTime - this.currentModeSession.startTime;

    this.currentModeSession.endTime = endTime;
    this.currentModeSession.duration = duration;

    // Add to total mode usage time
    this.modeUsageTime[this.currentModeSession.mode] += duration;

    console.log(
      `[Analytics] Mode session ended: ${this.currentModeSession.mode} (${(duration / 1000).toFixed(1)}s)`
    );

    this.currentModeSession = null;
  }

  /**
   * Track mode fallback event
   */
  trackModeFallback(requestedMode: UiMode, fallbackMode: UiMode, reason: string): void {
    this.fallbackEventsCount++;
    this.track('mode_fallback', {
      requestedMode,
      fallbackMode,
      reason,
    });
  }

  /**
   * Track AR permission denied
   */
  trackARPermissionDenied(error?: string): void {
    this.track('ar_permission_denied', {
      error: error || 'unknown',
      timestamp: Date.now(),
    });
  }

  /**
   * Track VR unsupported
   */
  trackVRUnsupported(reason?: string): void {
    this.track('vr_unsupported', {
      reason: reason || 'WebXR not available',
    });
  }

  /**
   * Track TTS style change
   */
  trackTTSStyleChanged(voiceStyle: string, fromMode?: UiMode): void {
    this.track('tts_style_changed', {
      voiceStyle,
      fromMode,
    });
  }

  /**
   * Track haptics fired
   */
  trackHapticsFired(type: string, intensity?: number): void {
    this.track('haptics_fired', {
      type,
      intensity,
    });
  }

  /**
   * Track FPS throttle enabled
   */
  trackFPSThrottleEnabled(currentFPS: number, targetFPS: number): void {
    this.track('fps_throttle_enabled', {
      currentFPS,
      targetFPS,
    });
  }

  /**
   * Track hazard announced
   */
  trackHazardAnnounced(hazardType: string, hazardId?: string): void {
    this.hazardsAnnouncedCount++;
    this.track('hazard_announced', {
      hazardType,
      hazardId,
      count: this.hazardsAnnouncedCount,
    });
  }

  /**
   * Track radar/speed camera announced
   */
  trackRadarAnnounced(cameraId?: string, speed?: number): void {
    this.radarsAnnouncedCount++;
    this.track('radar_announced', {
      cameraId,
      speed,
      count: this.radarsAnnouncedCount,
    });
  }

  /**
   * Get session summary
   */
  getSessionSummary(): SessionSummary {
    // End current mode session if active
    if (this.currentModeSession) {
      this.endModeSession();
    }

    const now = Date.now();
    const totalDuration = now - this.sessionStartTime;

    return {
      sessionId: this.sessionId,
      startTime: this.sessionStartTime,
      endTime: now,
      totalDuration,
      modeUsage: { ...this.modeUsageTime },
      hazardsAnnounced: this.hazardsAnnouncedCount,
      radarsAnnounced: this.radarsAnnouncedCount,
      modesUsed: Array.from(this.modesUsedSet),
      fallbackEvents: this.fallbackEventsCount,
    };
  }

  /**
   * Print session summary to console
   */
  logSessionSummary(): void {
    const summary = this.getSessionSummary();

    console.log('═══════════════════════════════════════════════');
    console.log('📊 SESSION SUMMARY');
    console.log('═══════════════════════════════════════════════');
    console.log(`Session ID: ${summary.sessionId}`);
    console.log(`Duration: ${((summary.totalDuration || 0) / 1000 / 60).toFixed(1)} minutes`);
    console.log('');
    console.log('🎯 Mode Usage:');
    Object.entries(summary.modeUsage).forEach(([mode, time]) => {
      if (time > 0) {
        const seconds = (time / 1000).toFixed(1);
        const percentage = ((time / (summary.totalDuration || 1)) * 100).toFixed(1);
        console.log(`  ${mode}: ${seconds}s (${percentage}%)`);
      }
    });
    console.log('');
    console.log('📢 Announcements:');
    console.log(`  Hazards: ${summary.hazardsAnnounced}`);
    console.log(`  Speed Cameras: ${summary.radarsAnnounced}`);
    console.log('');
    console.log('🔄 Fallback Events:', summary.fallbackEvents);
    console.log('═══════════════════════════════════════════════');
  }

  /**
   * End session and log summary
   */
  endSession(): void {
    this.track('session_ended', {
      duration: Date.now() - this.sessionStartTime,
    });

    this.logSessionSummary();
  }

  /**
   * Get all tracked events
   */
  getEvents(): AnalyticsEventData[] {
    return [...this.events];
  }

  /**
   * Clear all events (for testing)
   */
  clearEvents(): void {
    this.events = [];
  }

  /**
   * Update session counters based on event type
   */
  private updateSessionCounters(event: AnalyticsEvent, properties?: Record<string, any>): void {
    // Already handled by specific track methods
    // This is a hook for future extensions
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const Analytics = new AnalyticsService();

// Auto-end session on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    Analytics.endSession();
  });
}
