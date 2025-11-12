import { EventBus } from "@/services/eventBus";
import { UiMode } from "@/types/ui";

class VoiceSubscription {
  private unsubscribeModeChanged: (() => void) | null = null;
  private unsubscribeEmotionChanged: (() => void) | null = null;

  start(): void {
    if (this.unsubscribeModeChanged || this.unsubscribeEmotionChanged) {
      console.warn("[VoiceSubscription] Already subscribed");
      return;
    }

    console.log("[VoiceSubscription] Starting event subscriptions...");

    this.unsubscribeModeChanged = EventBus.subscribe('uiMode:changed', (payload) => {
      console.log(`[VoiceSubscription] UI mode changed to ${payload.mode} (from ${payload.previousMode})`);
      this.handleModeChange(payload.mode);
    });

    this.unsubscribeEmotionChanged = EventBus.subscribe('emotion:stateChanged', (payload) => {
      console.log(`[VoiceSubscription] Emotion state changed - mood: ${payload.state.mood}, stress: ${payload.state.stress}`);
      this.handleEmotionChange(payload.state.mood, payload.state.stress);
    });
  }

  stop(): void {
    if (this.unsubscribeModeChanged) {
      this.unsubscribeModeChanged();
      this.unsubscribeModeChanged = null;
    }
    if (this.unsubscribeEmotionChanged) {
      this.unsubscribeEmotionChanged();
      this.unsubscribeEmotionChanged = null;
    }
    console.log("[VoiceSubscription] Stopped event subscriptions");
  }

  private handleModeChange(mode: UiMode): void {
    switch (mode) {
      case UiMode.CLASSIC:
        console.log("[VoiceSubscription] Adapting to CLASSIC mode - standard voice guidance");
        break;
      case UiMode.THREED:
        console.log("[VoiceSubscription] Adapting to THREED mode - spatial audio positioning");
        break;
      case UiMode.CINEMATIC:
        console.log("[VoiceSubscription] Adapting to CINEMATIC mode - cinematic voice effects");
        break;
      case UiMode.AR:
        console.log("[VoiceSubscription] Adapting to AR mode - directional audio cues");
        break;
      case UiMode.VR:
        console.log("[VoiceSubscription] Adapting to VR mode - 3D spatial voice");
        break;
      case UiMode.ECO:
        console.log("[VoiceSubscription] Adapting to ECO mode - minimal voice announcements");
        break;
    }
  }

  private handleEmotionChange(mood: string, stress: number): void {
    if (stress > 70) {
      console.log("[VoiceSubscription] High stress detected - using calming voice tone");
    } else if (mood === 'excited') {
      console.log("[VoiceSubscription] Excited mood detected - using energetic voice tone");
    }
  }
}

export const voiceSubscription = new VoiceSubscription();
