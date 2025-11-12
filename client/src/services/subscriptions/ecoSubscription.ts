import { EventBus } from "@/services/eventBus";
import { UiMode } from "@/types/ui";

class EcoSubscription {
  private unsubscribe: (() => void) | null = null;

  start(): void {
    if (this.unsubscribe) {
      console.warn("[EcoSubscription] Already subscribed");
      return;
    }

    console.log("[EcoSubscription] Starting event subscriptions...");

    this.unsubscribe = EventBus.subscribe('uiMode:changed', (payload) => {
      console.log(`[EcoSubscription] UI mode changed to ${payload.mode} (from ${payload.previousMode})`);
      this.handleModeChange(payload.mode);
    });
  }

  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
      console.log("[EcoSubscription] Stopped event subscriptions");
    }
  }

  private handleModeChange(mode: UiMode): void {
    switch (mode) {
      case UiMode.ECO:
        console.log("[EcoSubscription] ECO mode activated - maximizing efficiency");
        break;
      case UiMode.CLASSIC:
      case UiMode.THREED:
      case UiMode.CINEMATIC:
      case UiMode.AR:
      case UiMode.VR:
        console.log(`[EcoSubscription] ${mode} mode - eco features available but not prioritized`);
        break;
    }
  }
}

export const ecoSubscription = new EcoSubscription();
