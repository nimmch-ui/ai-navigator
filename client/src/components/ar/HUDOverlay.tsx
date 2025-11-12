import { memo } from 'react';
import { ArrowUp, ArrowUpLeft, ArrowUpRight } from 'lucide-react';

interface HUDOverlayProps {
  nextManeuver: string;
  distance: string;
  direction?: 'straight' | 'left' | 'right';
}

const HUDOverlay = memo(({ nextManeuver, distance, direction = 'straight' }: HUDOverlayProps) => {
  const getDirectionIcon = () => {
    switch (direction) {
      case 'left':
        return ArrowUpLeft;
      case 'right':
        return ArrowUpRight;
      default:
        return ArrowUp;
    }
  };

  const DirectionIcon = getDirectionIcon();

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {/* Transparent HUD overlay */}
      <div className="flex flex-col items-center gap-4">
        {/* Large directional arrow */}
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 blur-xl opacity-60">
            <DirectionIcon className="h-32 w-32 text-primary" strokeWidth={3} />
          </div>
          {/* Main arrow */}
          <DirectionIcon 
            className="h-32 w-32 text-primary relative z-10 drop-shadow-2xl" 
            strokeWidth={4}
          />
        </div>

        {/* Distance indicator */}
        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-6 py-3 border-2 border-primary/50">
          <div className="text-4xl font-bold text-white text-center">
            {distance}
          </div>
        </div>

        {/* Instruction text */}
        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-6 py-3 max-w-md">
          <div className="text-lg text-white text-center font-medium">
            {nextManeuver}
          </div>
        </div>
      </div>

      {/* Corner indicators */}
      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-md px-3 py-2">
        <div className="text-xs text-white/80 font-medium">AR PREVIEW</div>
      </div>

      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-md px-3 py-2">
        <div className="text-xs text-white/80 font-medium flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          CAMERA ACTIVE
        </div>
      </div>
    </div>
  );
});

HUDOverlay.displayName = 'HUDOverlay';

export default HUDOverlay;
