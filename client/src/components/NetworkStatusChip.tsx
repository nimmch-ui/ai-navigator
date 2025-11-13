import { Wifi, WifiOff, Cloud } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useOffline } from '@/contexts/OfflineContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function NetworkStatusChip() {
  const { quality, isOnline } = useOffline();

  if (quality === 'good') {
    return null;
  }

  const getIcon = () => {
    if (!isOnline) {
      return <WifiOff className="h-3 w-3" data-testid="icon-offline-chip" />;
    }
    if (quality === 'weak') {
      return <Cloud className="h-3 w-3" data-testid="icon-weak-chip" />;
    }
    return <Wifi className="h-3 w-3" data-testid="icon-good-chip" />;
  };

  const getLabel = () => {
    if (!isOnline) return 'Offline';
    if (quality === 'weak') return 'Weak Signal';
    return 'Online';
  };

  const getVariant = () => {
    if (!isOnline) return 'destructive';
    if (quality === 'weak') return 'secondary';
    return 'default';
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={getVariant() as any}
          className="gap-1 no-default-hover-elevate"
          data-testid="chip-network-status"
        >
          {getIcon()}
          <span className="text-xs">{getLabel()}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-sm">
          {!isOnline
            ? 'Using cached data only'
            : quality === 'weak'
            ? 'Slow connection - some features may be limited'
            : 'Connected'}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
