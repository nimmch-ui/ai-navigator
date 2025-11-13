import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { offlineModeService, type NetworkStatus, type NetworkQuality } from '@/services/system/OfflineModeService';
import { tileCache } from '@/services/map/TileCache';
import { routeCache } from '@/services/navigation/RouteCache';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';

interface OfflineContextType {
  isOnline: boolean;
  quality: NetworkQuality;
  status: NetworkStatus;
  tileCacheSize: number;
  routeCacheSize: number;
  updateCacheSize: () => Promise<void>;
  canUseOnlineFeatures: () => boolean;
}

const OfflineContext = createContext<OfflineContextType | null>(null);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<NetworkStatus>(offlineModeService.getStatus());
  const [tileCacheSize, setTileCacheSize] = useState(0);
  const [routeCacheSize, setRouteCacheSize] = useState(0);
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
    const [tileStats, routeSize] = await Promise.all([
      tileCache.getCacheStats(),
      routeCache.getCacheSize(),
    ]);
    setTileCacheSize(tileStats.size);
    setRouteCacheSize(routeSize);
  };

  const canUseOnlineFeatures = () => {
    return offlineModeService.canUseOnlineFeatures();
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline: !status.isOffline,
        quality: status.quality,
        status,
        tileCacheSize,
        routeCacheSize,
        updateCacheSize,
        canUseOnlineFeatures,
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
