import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getHazardMetadata } from '@/data/hazards';
import type { Hazard } from '@/data/hazards';

interface HazardAlertProps {
  hazard: Hazard;
  distance: number;
  onDismiss?: () => void;
}

export default function HazardAlert({ hazard, distance, onDismiss }: HazardAlertProps) {
  const metadata = getHazardMetadata(hazard.type);
  const HazardIcon = metadata.icon;
  
  const distanceText = distance < 1000
    ? `${Math.round(distance)}m`
    : `${(distance / 1000).toFixed(1)}km`;

  const getMessage = () => {
    switch (hazard.type) {
      case "speed_camera":
        return `Speed camera ahead in ${distanceText}`;
      case "school_zone":
        return `School zone ahead in ${distanceText}`;
      case "dangerous_curve":
        return `Dangerous curve ahead in ${distanceText}`;
      case "accident_zone":
        return `High accident zone ahead in ${distanceText}`;
    }
  };

  const getSpeedMessage = () => {
    if (hazard.speedLimit) {
      return `Speed limit: ${hazard.speedLimit} km/h`;
    }
    return "Drive carefully";
  };

  return (
    <div
      className={`${metadata.bgColorClass} text-white p-4 rounded-md shadow-lg`}
      data-testid={`hazard-alert-${hazard.id}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <HazardIcon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm mb-1">
            {getMessage()}
          </div>
          <div className="text-xs opacity-90">
            {getSpeedMessage()}
          </div>
        </div>
        {onDismiss && (
          <Button
            size="icon"
            variant="ghost"
            onClick={onDismiss}
            className="h-6 w-6 hover:bg-white/20 text-white"
            data-testid={`button-dismiss-alert-${hazard.id}`}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
