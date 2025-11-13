import { UiMode, DriverState } from "@/types/ui";
import type { Locale } from "@/services/i18n";
import type { NetworkStatus } from "@/services/system/OfflineModeService";
import type { UserProfile, FavoritePlace, TripRecord } from "@/services/data/userDataModels";
import type { RiskScores, RiskFactor } from "@/services/ai/PredictiveEngine";
import type { WeatherNow } from "@/services/data/types";
import type { SafetyAlert, WeatherAdaptation, DriverStateAdaptation } from "@/services/ai/SafetyController";

export interface EventPayloadMap {
  'uiMode:changed': { mode: UiMode; previousMode: UiMode };
  'immersion:levelChanged': { level: number; settings: Record<string, boolean> };
  'emotion:stateChanged': { state: DriverState; timestamp: number };
  'emotion:focusRegained': { timestamp: number };
  'navigation:stateChanged': { updates: Record<string, any> };
  'preferences:voiceStyleChanged': { voiceStyle: string };
  'i18n:changed': { locale: Locale; unitSystem: string };
  'network:statusChanged': { previous: NetworkStatus; current: NetworkStatus };
  'offline:mode_entered': { timestamp: number; quality: string };
  'offline:mode_exit': { timestamp: number; duration: number };
  'offline:route_loaded_from_cache': { routeId: string; distance: number };
  'offline:tts_cache_hit': { text: string; language: string };
  'offline:tts_cache_miss': { text: string; language: string };
  'provider:circuit_breaker_opened': { provider: string; failures: number; timeout: number };
  'provider:failover': { service: string; from: string; to: string; latency: number; reason: string };
  'provider:radar_loaded': { provider: string; latency: number; cameraCount: number; cached: boolean };
  'provider:traffic_loaded': { provider: string; latency: number; flowCount: number; cached: boolean };
  'provider:weather_loaded': { provider: string; latency: number; cached: boolean };
  'provider:map_tiles_loaded': { provider: string; cached: boolean };
  'user:profileUpdated': { profile: UserProfile };
  'favorites:itemAdded': { favorite: FavoritePlace };
  'favorites:itemRemoved': { favoriteId: string };
  'favorites:itemUpdated': { favorite: FavoritePlace };
  'trips:recorded': { trip: TripRecord };
  'trips:deleted': { tripId: string };
  'trips:cleared': Record<string, never>;
  'userdata:migrationCompleted': { from: string | number; to: number | string; count?: number };
  'sync:enabled': undefined;
  'sync:disabled': undefined;
  'sync:completed': { conflicts: number; recordsPushed: number; recordsPulled: number; durationMs: number };
  'sync:failed': { error: string };
  'sync:push_completed': { recordsPushed: number };
  'sync:pull_completed': { recordsPulled: number };
  'sync:cloud_cleared': undefined;
  'sync:identityChanged': { previousUserId: string; canonicalUserId: string };
  'ai:predictionTick': { timestamp: number };
  'ai:riskUpdate': { scores: RiskScores; timestamp: number; factors: RiskFactor[] };
  'weather:updated': { weather: WeatherNow | null; timestamp: number };
  'safety:alert': { alert: SafetyAlert; timestamp: number };
  'safety:hudFlash': { color: string; duration: number; timestamp: number };
  'safety:weatherAdapted': { adaptation: WeatherAdaptation; timestamp: number };
  'safety:driverStateAdapted': { adaptation: DriverStateAdaptation; timestamp: number };
}

type EventName = keyof EventPayloadMap;
type EventHandler<T extends EventName> = (payload: EventPayloadMap[T]) => void;

class EventBusImpl {
  private listeners: Map<EventName, Set<EventHandler<any>>> = new Map();

  subscribe<T extends EventName>(event: T, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(handler);
    
    return () => {
      this.unsubscribe(event, handler);
    };
  }

  unsubscribe<T extends EventName>(event: T, handler: EventHandler<T>): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  emit<T extends EventName>(event: T, payload: EventPayloadMap[T]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  clear(): void {
    this.listeners.clear();
  }

  getListenerCount(event?: EventName): number {
    if (event) {
      return this.listeners.get(event)?.size ?? 0;
    }
    let total = 0;
    this.listeners.forEach(handlers => {
      total += handlers.size;
    });
    return total;
  }
}

export const EventBus = new EventBusImpl();
