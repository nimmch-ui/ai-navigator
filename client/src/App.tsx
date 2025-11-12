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
import { registerServiceWorker } from "@/lib/serviceWorker";
import { initializeSubscriptions, cleanupSubscriptions } from "@/services/subscriptions";
import { ModeManager } from "@/services/ui/ModeManager";
import { MODE_DESCRIPTORS } from "@/services/modes/descriptors";
import { DeepLinks } from "@/services/deepLinks";
import { Analytics } from "@/services/analytics";
import { regionRouter } from "@/services/regionRouter";
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
    // Initialize region router for global availability
    regionRouter.initialize().then(() => {
      console.log('[App] Region router initialized:', regionRouter.getState());
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
    
    console.log('[App] Analytics session started:', Analytics.getSessionSummary().sessionId);

    return () => {
      cleanupSubscriptions();
      ModeManager.destroy();
      Analytics.endSession();
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
