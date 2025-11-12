import { Switch, Route } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ARExperienceProvider } from "@/contexts/ARExperienceProvider";
import { OfflineProvider } from "@/contexts/OfflineContext";
import { CarModeProvider } from "@/contexts/CarModeContext";
import { PWAUpdateNotification } from "@/components/PWAUpdateNotification";
import { registerServiceWorker } from "@/lib/serviceWorker";
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
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CarModeProvider>
          <OfflineProvider>
            <ARExperienceProvider>
              <Toaster />
              <PWAUpdateNotification />
              <Router />
            </ARExperienceProvider>
          </OfflineProvider>
        </CarModeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
