import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RefreshCw, X } from 'lucide-react';

export function PWAUpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const handleUpdateAvailable = () => {
      setShowUpdate(true);
    };

    window.addEventListener('sw-update-available', handleUpdateAvailable);

    navigator.serviceWorker?.getRegistration().then((reg) => {
      if (reg) {
        setRegistration(reg);
      }
    });

    return () => {
      window.removeEventListener('sw-update-available', handleUpdateAvailable);
    };
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4">
      <Card className="p-4 shadow-lg border-2 border-primary/20">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <RefreshCw className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1" data-testid="text-update-title">
              Update Available
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              A new version of AI Navigator is ready. Reload to get the latest features and improvements.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleUpdate}
                data-testid="button-reload-app"
              >
                Reload App
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDismiss}
                data-testid="button-dismiss-update"
              >
                <X className="h-4 w-4 mr-1" />
                Later
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
