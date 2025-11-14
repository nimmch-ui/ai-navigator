import { memo } from 'react';
import { Car, Bike, Footprints, Train } from 'lucide-react';
import type { TransportMode } from '@/services/preferences';

interface SpeedLimitHUDProps {
  speedLimit: number | null;
  transportMode: TransportMode;
}

const getModeIcon = (mode: TransportMode) => {
  switch (mode) {
    case 'car':
      return <Car className="w-5 h-5" />;
    case 'bike':
      return <Bike className="w-5 h-5" />;
    case 'walk':
      return <Footprints className="w-5 h-5" />;
    case 'transit':
      return <Train className="w-5 h-5" />;
  }
};

const SpeedLimitHUD = memo(function SpeedLimitHUD({ speedLimit, transportMode }: SpeedLimitHUDProps) {
  return (
    <div 
      className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[100px]"
      data-testid="speed-limit-hud"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center text-muted-foreground">
          {getModeIcon(transportMode)}
        </div>
        
        <div className="flex flex-col">
          <div className="text-xs text-muted-foreground">Speed Limit</div>
          {speedLimit ? (
            <div className="text-2xl font-bold" data-testid="text-speed-limit">
              {speedLimit}
            </div>
          ) : (
            <div className="text-lg text-muted-foreground" data-testid="text-speed-limit-unknown">
              --
            </div>
          )}
          <div className="text-xs text-muted-foreground">km/h</div>
        </div>
      </div>
    </div>
  );
});

export default SpeedLimitHUD;
