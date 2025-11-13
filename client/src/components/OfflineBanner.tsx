import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { offlineModeService, type NetworkStatus } from '@/services/system/OfflineModeService';
import { useTranslation } from '@/hooks/useTranslation';

export default function OfflineBanner() {
  const [status, setStatus] = useState<NetworkStatus>(offlineModeService.getStatus());
  const { t } = useTranslation();

  useEffect(() => {
    const unsubscribe = offlineModeService.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    return unsubscribe;
  }, []);

  if (status.quality === 'good') {
    return null;
  }

  const isOffline = status.isOffline;
  const isWeak = status.quality === 'weak';

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-sm ${
        isOffline
          ? 'bg-destructive text-destructive-foreground'
          : 'bg-yellow-500 dark:bg-yellow-600 text-black dark:text-white'
      }`}
      data-testid="banner-offline"
    >
      {isOffline ? (
        <WifiOff className="h-4 w-4" data-testid="icon-offline" />
      ) : (
        <Wifi className="h-4 w-4" data-testid="icon-weak" />
      )}
      <span data-testid="text-offline-message">
        {isOffline
          ? t('offline.banner_offline')
          : t('offline.banner_weak')}
      </span>
    </div>
  );
}
