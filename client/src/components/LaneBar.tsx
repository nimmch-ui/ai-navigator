import { memo } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowBigUpDash } from 'lucide-react';
import type { Lane } from '@shared/schema';

interface LaneBarProps {
  lanes: Lane[];
  distanceToManeuver: number;
}

const LaneBar = memo(({ lanes, distanceToManeuver }: LaneBarProps) => {
  const getLaneIcon = (direction: Lane['direction']) => {
    switch (direction) {
      case 'left':
        return ArrowLeft;
      case 'right':
        return ArrowRight;
      case 'through':
        return ArrowUp;
      case 'u-turn':
        return ArrowBigUpDash;
      default:
        return ArrowUp;
    }
  };

  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  return (
    <div className="bg-card border border-card-border rounded-lg p-4 mb-3" data-testid="lane-bar">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium text-foreground">
          Lane Guidance
        </div>
        <div className="text-xs text-muted-foreground">
          in {formatDistance(distanceToManeuver)}
        </div>
      </div>
      
      <div className="flex gap-2 justify-center">
        {lanes.map((lane, index) => {
          const Icon = getLaneIcon(lane.direction);
          const isRecommended = lane.recommended ?? false;
          
          return (
            <div
              key={lane.id}
              className={`
                relative flex flex-col items-center justify-center
                min-w-[60px] h-20 rounded-md border-2 transition-all
                ${isRecommended 
                  ? 'bg-primary/20 border-primary shadow-lg shadow-primary/30' 
                  : 'bg-muted/50 border-border'
                }
              `}
              data-testid={`lane-${index}-${lane.direction}${isRecommended ? '-recommended' : ''}`}
            >
              {/* Lane arrow */}
              <Icon 
                className={`h-8 w-8 ${isRecommended ? 'text-primary' : 'text-muted-foreground'}`}
                strokeWidth={isRecommended ? 2.5 : 2}
              />
              
              {/* Direction label */}
              <div className={`text-[10px] mt-1 font-medium ${
                isRecommended ? 'text-primary' : 'text-muted-foreground'
              }`}>
                {lane.direction === 'u-turn' ? 'U' : lane.direction.charAt(0).toUpperCase()}
              </div>
              
              {/* Recommended indicator */}
              {isRecommended && (
                <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary animate-pulse" />
              )}
            </div>
          );
        })}
      </div>
      
      <div className="text-center text-xs text-muted-foreground mt-3">
        {lanes.some(l => l.recommended) 
          ? 'Use highlighted lane(s) for upcoming maneuver'
          : 'Choose appropriate lane for your maneuver'
        }
      </div>
    </div>
  );
});

LaneBar.displayName = 'LaneBar';

export default LaneBar;
