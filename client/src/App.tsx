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
import { currencyService } from "@/services/currency/CurrencyService";
import { featureFlagsService } from "@/services/featureFlags/FeatureFlagsService";
import { geolocationService } from "@/services/geolocation";
import { userDataStore } from "@/services/data/UserDataStore";
import { PredictiveNavigation } from "@/services/ai/PredictiveNavigation";
import { SafetyController } from "@/services/ai/SafetyController";
import { EmotionEngine } from "@/services/emotion/EmotionEngine";
import { syncTriggers } from "@/services/sync/SyncTriggers";
import { authProvider } from "@/services/auth/AuthProvider";
import Home from "@/pages/Home";
import NightVisionDemo from "@/pages/night-vision-demo";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/night-vision-demo" component={NightVisionDemo} />
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
        const locale = i18n.getLocale();
        console.log('[App] i18n initialized:', locale, i18n.getUnitSystem());
        
        // Initialize currency service based on locale
        currencyService.initialize(locale);
        console.log('[App] Currency service initialized:', currencyService.getCurrency());
        
        // Initialize feature flags service with region and country code
        featureFlagsService.initialize(location.region, location.countryCode);
        console.log('[App] Feature flags initialized:', featureFlagsService.getFeatureAvailability());
        
        // Expose i18n globally for testing
        if (typeof window !== 'undefined') {
          (window as any).__i18n = i18n;
          (window as any).__currency = currencyService;
          (window as any).__featureFlags = featureFlagsService;
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
    
    // Initialize AI services in order: EmotionEngine → PredictiveNavigation → SafetyController
    EmotionEngine.init();
    PredictiveNavigation.init();
    SafetyController.init();
    console.log('[App] AI services initialized: EmotionEngine, PredictiveNavigation, SafetyController');
    
    // Initialize sync triggers for multi-device support
    syncTriggers.initialize();
    console.log('[App] Sync triggers initialized');
    
    // AuthProvider is automatically initialized on import
    console.log('[App] AuthProvider initialized');
    
    // Expose for testing (dev/test only)
    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      (window as any).__authProvider = authProvider;
      (window as any).__syncTriggers = syncTriggers;
    }
    
    console.log('[App] Analytics session started:', Analytics.getSessionSummary().sessionId);

    return () => {
      cleanupSubscriptions();
      ModeManager.destroy();
      Analytics.endSession();
      SafetyController.shutdown();
      PredictiveNavigation.shutdown();
      syncTriggers.destroy();
      
      if (typeof window !== 'undefined' && import.meta.env.DEV) {
        delete (window as any).__authProvider;
        delete (window as any).__syncTriggers;
      }
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
