import { Switch, Route } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UiModeProvider } from "@/contexts/UiModeContext";
import { ARExperienceProvider } from "@/contexts/ARExperienceProvider";
import { OfflineProvider } from "@/contexts/OfflineContext";
import { CarModeProvider } from "@/contexts/CarModeContext";
import { PWAUpdateNotification } from "@/components/PWAUpdateNotification";
import { RegionFallbackBanner } from "@/components/RegionFallbackBanner";
import OfflineBanner from "@/components/OfflineBanner";
import { registerServiceWorker } from "@/lib/serviceWorker";
import { initializeSubscriptions, cleanupSubscriptions } from "@/services/subscriptions";
import { ModeManager } from "@/services/ui/ModeManager";
import { MODE_DESCRIPTORS } from "@/services/modes/descriptors";
import { DeepLinks } from "@/services/deepLinks";
import { Analytics } from "@/services/analytics";
import { regionRouter } from "@/services/regionRouter";
import { i18n } from "@/services/i18n";
import { geolocationService } from "@/services/geolocation";
import { userDataStore } from "@/services/data/UserDataStore";
import { PredictiveNavigation } from "@/services/ai/PredictiveNavigation";
import { EmotionEngine } from "@/services/emotion/EmotionEngine";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    // Initialize all core services together
    Promise.all([
      userDataStore.initialize(),
      regionRouter.initialize(),
      geolocationService.detectUserLocation(),
    ]).then(([, , location]) => {
      console.log('[App] User data store initialized');
      console.log('[App] Region router initialized:', regionRouter.getState());
      
      // Initialize i18n with detected region
      i18n.initialize(location.region).then(() => {
        console.log('[App] i18n initialized:', i18n.getLocale(), i18n.getUnitSystem());
        
        // Expose i18n globally for testing
        if (typeof window !== 'undefined') {
          (window as any).__i18n = i18n;
        }
      });
    }).catch(err => {
      console.error('[App] Initialization failed:', err);
    });

    registerServiceWorker().then((registration) => {
      if (registration) {
        console.log('[App] Service Worker registered successfully');
      }
    });

    initializeSubscriptions();
    
    // Initialize ModeManager after subscriptions are ready
    ModeManager.initialize();
    
    // Register mode descriptors with visual logic
    MODE_DESCRIPTORS.forEach(descriptor => {
      ModeManager.registerMode(descriptor);
    });
    
    // Apply deep links (auto-load mode from URL params)
    DeepLinks.applyDeepLinks();
    
    // Initialize AI services
    EmotionEngine.init();
    PredictiveNavigation.init();
    console.log('[App] AI services initialized: EmotionEngine, PredictiveNavigation');
    
    console.log('[App] Analytics session started:', Analytics.getSessionSummary().sessionId);

    return () => {
      cleanupSubscriptions();
      ModeManager.destroy();
      Analytics.endSession();
      PredictiveNavigation.shutdown();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <UiModeProvider>
          <CarModeProvider>
            <OfflineProvider>
              <ARExperienceProvider>
                <Toaster />
                <OfflineBanner />
                <PWAUpdateNotification />
                <RegionFallbackBanner />
                <Router />
              </ARExperienceProvider>
            </OfflineProvider>
          </CarModeProvider>
        </UiModeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
