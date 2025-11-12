import { EventBus } from "@/services/eventBus";
import { UiMode } from "@/types/ui";

class SpeedSubscription {
  private unsubscribe: (() => void) | null = null;

  start(): void {
    if (this.unsubscribe) {
      console.warn("[SpeedSubscription] Already subscribed");
      return;
    }

    console.log("[SpeedSubscription] Starting event subscriptions...");

    this.unsubscribe = EventBus.subscribe('uiMode:changed', (payload) => {
      console.log(`[SpeedSubscription] UI mode changed to ${payload.mode} (from ${payload.previousMode})`);
      this.handleModeChange(payload.mode);
    });
  }

  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
      console.log("[SpeedSubscription] Stopped event subscriptions");
    }
  }

  private handleModeChange(mode: UiMode): void {
    switch (mode) {
      case UiMode.CLASSIC:
        console.log("[SpeedSubscription] Adapting to CLASSIC mode - basic speed display");
        break;
      case UiMode.THREED:
        console.log("[SpeedSubscription] Adapting to THREED mode - 3D speed HUD");
        break;
      case UiMode.CINEMATIC:
        console.log("[SpeedSubscription] Adapting to CINEMATIC mode - cinematic speed transitions");
        break;
      case UiMode.AR:
        console.log("[SpeedSubscription] Adapting to AR mode - AR speed overlay");
        break;
      case UiMode.VR:
        console.log("[SpeedSubscription] Adapting to VR mode - immersive speed display");
        break;
      case UiMode.ECO:
        console.log("[SpeedSubscription] Adapting to ECO mode - eco-optimized speed guidance");
        break;
    }
  }
}

export const speedSubscription = new SpeedSubscription();
