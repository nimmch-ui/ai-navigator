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
import { notifyServicesReady, notifyServicesError } from "@/services/appInitialization";
import Home from "@/pages/Home";
import NightVisionDemo from "@/pages/night-vision-demo";
import GlobalRolloutStatus from "@/pages/global-rollout-status";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/night-vision-demo" component={NightVisionDemo} />
      <Route path="/global-rollout" component={GlobalRolloutStatus} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    // Create a promise that resolves when all services are ready
    const servicesReadyPromise = (async () => {
      try {
        // Step 1: Initialize core services in parallel
        const [, , location] = await Promise.all([
          userDataStore.initialize(),
          regionRouter.initialize(),
          geolocationService.detectUserLocation(),
        ]);
        console.log('[App] User data store initialized');
        console.log('[App] Region router initialized:', regionRouter.getState());
        
        // Step 2: Initialize i18n with detected region
        await i18n.initialize(location.region);
        const locale = i18n.getLocale();
        console.log('[App] i18n initialized:', locale, i18n.getUnitSystem());
        
        // Step 3: Initialize currency service based on locale
        currencyService.initialize(locale);
        console.log('[App] Currency service initialized:', currencyService.getCurrency());
        
        // Step 4: Initialize feature flags service with region and country code
        await featureFlagsService.initialize(location.region, location.countryCode);
        console.log('[App] Feature flags initialized:', featureFlagsService.getFeatureAvailability());
        
        // Expose services globally for testing
        if (typeof window !== 'undefined') {
          (window as any).__i18n = i18n;
          (window as any).__currency = currencyService;
          (window as any).__featureFlags = featureFlagsService;
        }

        // Step 5: Initialize remaining services after feature flags are ready
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
        
        console.log('[App] All services ready');
        notifyServicesReady();
      } catch (err) {
        console.error('[App] Initialization failed:', err);
        notifyServicesError(err as Error);
        throw err;
      }
    })();

    // Expose servicesReady promise globally for components to await
    if (typeof window !== 'undefined') {
      (window as any).__servicesReady = servicesReadyPromise;
    }

    // Register service worker independently
    registerServiceWorker().then((registration) => {
      if (registration) {
        console.log('[App] Service Worker registered successfully');
      }
    });
    
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
