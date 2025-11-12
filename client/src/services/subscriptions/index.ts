import { radarSubscription } from "./radarSubscription";
import { voiceSubscription } from "./voiceSubscription";
import { weatherSubscription } from "./weatherSubscription";
import { hazardSubscription } from "./hazardSubscription";
import { speedSubscription } from "./speedSubscription";
import { ecoSubscription } from "./ecoSubscription";
import { EmotionEngine } from "@/services/emotion/EmotionEngine";

export function initializeSubscriptions(): void {
  console.log("[Subscriptions] Initializing all module subscriptions...");
  
  EmotionEngine.init();
  
  radarSubscription.start();
  hazardSubscription.start();
  speedSubscription.start();
  weatherSubscription.start();
  voiceSubscription.start();
  ecoSubscription.start();
  
  console.log("[Subscriptions] All module subscriptions initialized");
}

export function cleanupSubscriptions(): void {
  console.log("[Subscriptions] Cleaning up all module subscriptions...");
  
  radarSubscription.stop();
  hazardSubscription.stop();
  speedSubscription.stop();
  weatherSubscription.stop();
  voiceSubscription.stop();
  ecoSubscription.stop();
  
  EmotionEngine.destroy();
  
  console.log("[Subscriptions] All module subscriptions cleaned up");
}

export {
  radarSubscription,
  hazardSubscription,
  speedSubscription,
  weatherSubscription,
  voiceSubscription,
  ecoSubscription
};
