import { useEffect, useState } from "react";
import { X, Globe } from "lucide-react";
import { regionRouter } from "@/services/regionRouter";
import { GlobalConfig } from "@shared/global.config";

interface FallbackEvent {
  reason: string;
  fallbackRegion: string;
}

export function RegionFallbackBanner() {
  const [fallbackInfo, setFallbackInfo] = useState<FallbackEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleFallback = (event: Event) => {
      const customEvent = event as CustomEvent<FallbackEvent>;
      setFallbackInfo(customEvent.detail);
      setIsDismissed(false);
    };

    window.addEventListener("region-fallback", handleFallback);

    const state = regionRouter.getState();
    if (state.usingFallback && state.fallbackReason) {
      setFallbackInfo({
        reason: state.fallbackReason,
        fallbackRegion: state.currentRegion,
      });
    }

    return () => {
      window.removeEventListener("region-fallback", handleFallback);
    };
  }, []);

  if (!fallbackInfo || isDismissed) {
    return null;
  }

  const regionName = fallbackInfo.fallbackRegion === "EU" ? "European" : fallbackInfo.fallbackRegion;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-yellow-500/90 dark:bg-yellow-600/90 text-black dark:text-white px-4 py-2 flex items-center justify-between gap-4 backdrop-blur-sm"
      data-testid="banner-region-fallback"
    >
      <div className="flex items-center gap-3 flex-1">
        <Globe className="w-5 h-5 flex-shrink-0" />
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <span className="font-medium text-sm">
            Connected via {regionName} fallback server
          </span>
          <span className="text-xs opacity-90">
            Your primary region is temporarily unavailable
          </span>
        </div>
      </div>
      
      <button
        onClick={() => setIsDismissed(true)}
        className="flex-shrink-0 p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
        aria-label="Dismiss notification"
        data-testid="button-dismiss-fallback-banner"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
