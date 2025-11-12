import { UiMode, DriverState } from "@/types/ui";

export interface EventPayloadMap {
  'uiMode:changed': { mode: UiMode; previousMode: UiMode };
  'immersion:levelChanged': { level: number; settings: Record<string, boolean> };
  'emotion:stateChanged': { state: DriverState; timestamp: number };
  'emotion:focusRegained': { timestamp: number };
  'navigation:stateChanged': { updates: Record<string, any> };
  'preferences:voiceStyleChanged': { voiceStyle: string };
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
