import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { offlineCacheService } from '@/services/offline';

interface OfflineContextType {
  isOnline: boolean;
  cacheSize: number;
  updateCacheSize: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | null>(null);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cacheSize, setCacheSize] = useState(0);

  useEffect(() => {
    const cleanup = offlineCacheService.addOnlineListener((online) => {
      setIsOnline(online);
    });

    updateCacheSize();

    return cleanup;
  }, []);

  const updateCacheSize = async () => {
    const size = await offlineCacheService.getCacheSize();
    setCacheSize(size);
  };

  return (
    <OfflineContext.Provider value={{ isOnline, cacheSize, updateCacheSize }}>
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
