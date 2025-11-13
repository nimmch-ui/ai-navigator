/**
 * TrafficAlertBanner - HUD banner showing traffic conditions ahead
 */

import { AlertTriangle, Navigation } from 'lucide-react';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

export interface TrafficAlertProps {
  message: string;
  severity: 'low' | 'medium' | 'high';
  congestion?: number; // 0-100
  incidentCount?: number;
  onDismiss?: () => void;
}

export function TrafficAlertBanner({
  message,
  severity,
  congestion,
  incidentCount,
  onDismiss,
}: TrafficAlertProps) {
  const severityColors = {
    low: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400',
    medium: 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400',
    high: 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400',
  };

  const severityBadgeVariants = {
    low: 'default' as const,
    medium: 'default' as const,
    high: 'destructive' as const,
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border',
        severityColors[severity]
      )}
      data-testid="banner-traffic-alert"
    >
      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" data-testid="text-alert-message">
          {message}
        </p>
        
        <div className="flex items-center gap-2 mt-1">
          {congestion !== undefined && congestion > 0 && (
            <Badge variant={severityBadgeVariants[severity]} className="text-xs">
              {congestion}% congestion
            </Badge>
          )}
          
          {incidentCount !== undefined && incidentCount > 0 && (
            <Badge variant={severityBadgeVariants[severity]} className="text-xs">
              {incidentCount} {incidentCount === 1 ? 'incident' : 'incidents'}
            </Badge>
          )}
        </div>
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-xs opacity-70 hover:opacity-100"
          data-testid="button-dismiss-alert"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
