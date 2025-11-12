import { EventBus } from "@/services/eventBus";
import { UiMode } from "@/types/ui";

class RadarSubscription {
  private unsubscribe: (() => void) | null = null;

  start(): void {
    if (this.unsubscribe) {
      console.warn("[RadarSubscription] Already subscribed");
      return;
    }

    console.log("[RadarSubscription] Starting event subscriptions...");

    this.unsubscribe = EventBus.subscribe('uiMode:changed', (payload) => {
      console.log(`[RadarSubscription] UI mode changed to ${payload.mode} (from ${payload.previousMode})`);
      
      this.handleModeChange(payload.mode);
    });
  }

  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
      console.log("[RadarSubscription] Stopped event subscriptions");
    }
  }

  private handleModeChange(mode: UiMode): void {
    switch (mode) {
      case UiMode.CLASSIC:
        console.log("[RadarSubscription] Adapting to CLASSIC mode - basic radar display");
        break;
      case UiMode.THREED:
        console.log("[RadarSubscription] Adapting to THREED mode - enhanced 3D radar markers");
        break;
      case UiMode.CINEMATIC:
        console.log("[RadarSubscription] Adapting to CINEMATIC mode - smooth camera transitions");
        break;
      case UiMode.AR:
        console.log("[RadarSubscription] Adapting to AR mode - AR overlay positioning");
        break;
      case UiMode.VR:
        console.log("[RadarSubscription] Adapting to VR mode - stereoscopic radar rendering");
        break;
      case UiMode.ECO:
        console.log("[RadarSubscription] Adapting to ECO mode - minimal radar updates");
        break;
    }
  }
}

export const radarSubscription = new RadarSubscription();
