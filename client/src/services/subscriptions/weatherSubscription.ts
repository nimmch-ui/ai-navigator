import { EventBus } from "@/services/eventBus";
import { UiMode } from "@/types/ui";

class WeatherSubscription {
  private unsubscribe: (() => void) | null = null;

  start(): void {
    if (this.unsubscribe) {
      console.warn("[WeatherSubscription] Already subscribed");
      return;
    }

    console.log("[WeatherSubscription] Starting event subscriptions...");

    this.unsubscribe = EventBus.subscribe('uiMode:changed', (payload) => {
      console.log(`[WeatherSubscription] UI mode changed to ${payload.mode} (from ${payload.previousMode})`);
      this.handleModeChange(payload.mode);
    });
  }

  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
      console.log("[WeatherSubscription] Stopped event subscriptions");
    }
  }

  private handleModeChange(mode: UiMode): void {
    switch (mode) {
      case UiMode.CLASSIC:
        console.log("[WeatherSubscription] Adapting to CLASSIC mode - basic weather display");
        break;
      case UiMode.THREED:
        console.log("[WeatherSubscription] Adapting to THREED mode - 3D weather overlay");
        break;
      case UiMode.CINEMATIC:
        console.log("[WeatherSubscription] Adapting to CINEMATIC mode - dramatic weather effects");
        break;
      case UiMode.AR:
        console.log("[WeatherSubscription] Adapting to AR mode - AR weather visualization");
        break;
      case UiMode.VR:
        console.log("[WeatherSubscription] Adapting to VR mode - immersive weather environment");
        break;
      case UiMode.ECO:
        console.log("[WeatherSubscription] Adapting to ECO mode - minimal weather updates");
        break;
    }
  }
}

export const weatherSubscription = new WeatherSubscription();
