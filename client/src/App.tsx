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
import { registerServiceWorker } from "@/lib/serviceWorker";
import { initializeSubscriptions, cleanupSubscriptions } from "@/services/subscriptions";
import { ModeManager } from "@/services/ui/ModeManager";
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
    registerServiceWorker().then((registration) => {
      if (registration) {
        console.log('[App] Service Worker registered successfully');
      }
    });

    initializeSubscriptions();
    
    // Initialize ModeManager after subscriptions are ready
    ModeManager.initialize();

    return () => {
      cleanupSubscriptions();
      ModeManager.destroy();
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
