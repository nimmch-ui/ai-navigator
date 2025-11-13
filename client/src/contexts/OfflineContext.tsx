import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { offlineModeService, type NetworkStatus, type NetworkQuality } from '@/services/system/OfflineModeService';
import { tileCache } from '@/services/map/TileCache';
import { routeCache } from '@/services/navigation/RouteCache';
import { ttsCacheService } from '@/services/audio/TTSCacheService';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';

interface OfflineContextType {
  isOnline: boolean;
  quality: NetworkQuality;
  status: NetworkStatus;
  tileCacheSize: number;
  routeCacheSize: number;
  ttsCacheSize: number;
  updateCacheSize: () => Promise<void>;
  canUseOnlineFeatures: () => boolean;
  clearAllOfflineData: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | null>(null);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<NetworkStatus>(offlineModeService.getStatus());
  const [tileCacheSize, setTileCacheSize] = useState(0);
  const [routeCacheSize, setRouteCacheSize] = useState(0);
  const [ttsCacheSize, setTtsCacheSize] = useState(0);
  const { toast } = useToast();
  const { t } = useTranslation();
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    const unsubscribe = offlineModeService.onStatusChange((newStatus) => {
      const wasOffline = wasOfflineRef.current;
      const isNowOnline = !newStatus.isOffline;
      
      if (wasOffline && isNowOnline) {
        toast({
          title: t('offline.back_online'),
          variant: 'default',
        });
      }
      
      wasOfflineRef.current = newStatus.isOffline;
      setStatus(newStatus);
    });

    updateCacheSize();
    wasOfflineRef.current = offlineModeService.getStatus().isOffline;

    return unsubscribe;
  }, [toast, t]);

  const updateCacheSize = async () => {
    const [tileStats, routeSize, ttsStats] = await Promise.all([
      tileCache.getCacheStats(),
      routeCache.getCacheSize(),
      ttsCacheService.getCacheStats(),
    ]);
    setTileCacheSize(tileStats.size);
    setRouteCacheSize(routeSize);
    setTtsCacheSize(ttsStats.totalSize);
  };

  const canUseOnlineFeatures = () => {
    return offlineModeService.canUseOnlineFeatures();
  };

  const clearAllOfflineData = async () => {
    await Promise.all([
      tileCache.clearAll(),
      routeCache.clearAll(),
      ttsCacheService.clearAll(),
    ]);
    await updateCacheSize();
    toast({
      title: 'Offline data cleared',
      description: 'All cached maps, routes, and voice data have been removed.',
    });
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline: !status.isOffline,
        quality: status.quality,
        status,
        tileCacheSize,
        routeCacheSize,
        ttsCacheSize,
        updateCacheSize,
        canUseOnlineFeatures,
        clearAllOfflineData,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return context;
}

export function useOfflineCapabilities() {
  const { canUseOnlineFeatures, quality, isOnline } = useOffline();
  
  return {
    canGeocode: canUseOnlineFeatures(),
    canFetchLiveTraffic: canUseOnlineFeatures(),
    canFetchLiveRadar: canUseOnlineFeatures(),
    canPlanRoute: true,
    canNavigate: true,
    canUseCachedData: true,
    quality,
    isOnline,
  };
}
