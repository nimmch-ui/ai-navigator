import { EventBus } from "@/services/eventBus";
import { UiMode } from "@/types/ui";

class HazardSubscription {
  private unsubscribe: (() => void) | null = null;

  start(): void {
    if (this.unsubscribe) {
      console.warn("[HazardSubscription] Already subscribed");
      return;
    }

    console.log("[HazardSubscription] Starting event subscriptions...");

    this.unsubscribe = EventBus.subscribe('uiMode:changed', (payload) => {
      console.log(`[HazardSubscription] UI mode changed to ${payload.mode} (from ${payload.previousMode})`);
      this.handleModeChange(payload.mode);
    });
  }

  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
      console.log("[HazardSubscription] Stopped event subscriptions");
    }
  }

  private handleModeChange(mode: UiMode): void {
    switch (mode) {
      case UiMode.CLASSIC:
        console.log("[HazardSubscription] Adapting to CLASSIC mode - standard hazard markers");
        break;
      case UiMode.THREED:
        console.log("[HazardSubscription] Adapting to THREED mode - 3D hazard markers");
        break;
      case UiMode.CINEMATIC:
        console.log("[HazardSubscription] Adapting to CINEMATIC mode - animated hazard warnings");
        break;
      case UiMode.AR:
        console.log("[HazardSubscription] Adapting to AR mode - AR hazard overlay");
        break;
      case UiMode.VR:
        console.log("[HazardSubscription] Adapting to VR mode - 3D spatial hazards");
        break;
      case UiMode.ECO:
        console.log("[HazardSubscription] Adapting to ECO mode - minimal hazard alerts");
        break;
    }
  }
}

export const hazardSubscription = new HazardSubscription();
