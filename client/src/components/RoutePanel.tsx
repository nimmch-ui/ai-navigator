import { memo, useMemo, useState, useEffect } from 'react';
import { Navigation, Clock, TrendingUp, MapPin, ArrowRight, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import LaneBar from '@/components/LaneBar';
import { getLaneDataForRoute } from '@/services/lanes';
import type { LaneSegment } from '@shared/schema';

interface RouteStep {
  instruction: string;
  distance: string;
  icon: 'straight' | 'left' | 'right';
}

interface RouteData {
  name: string;
  distance: string;
  duration: string;
  steps: RouteStep[];
}

interface RoutePanelProps {
  origin: string;
  destination: string;
  route: RouteData | null;
  isLoading?: boolean;
  error?: string;
  onClose?: () => void;
  onStartNavigation?: () => void;
}

const RoutePanel = memo(function RoutePanel({
  origin,
  destination,
  route,
  isLoading = false,
  error,
  onClose,
  onStartNavigation
}: RoutePanelProps) {
  // Simulated distance to next maneuver (in meters)
  // In production, this would be calculated from GPS position
  const [distanceToNextManeuver, setDistanceToNextManeuver] = useState(250);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Get lane data for all route steps
  const laneDataMap = useMemo(() => {
    if (!route) return new Map<number, LaneSegment>();
    return getLaneDataForRoute(route.steps);
  }, [route]);

  // Determine if we should show lane guidance (200-300m before maneuver)
  const activeLaneGuidance = useMemo(() => {
    if (!route || distanceToNextManeuver > 300 || distanceToNextManeuver < 0) {
      return null;
    }

    const laneSegment = laneDataMap.get(currentStepIndex);
    if (!laneSegment) return null;

    return {
      ...laneSegment,
      distanceToManeuver: distanceToNextManeuver,
    };
  }, [route, laneDataMap, currentStepIndex, distanceToNextManeuver]);

  // Demo: Simulate distance countdown for demonstration purposes
  // Remove this in production - distance would come from GPS tracking
  useEffect(() => {
    if (!route || route.steps.length === 0) return;

    const interval = setInterval(() => {
      setDistanceToNextManeuver((prev) => {
        // Decrease by 10m every second (simulated movement)
        const newDistance = prev - 10;
        
        // If we've passed the maneuver, move to next step
        if (newDistance < 0 && currentStepIndex < route.steps.length - 1) {
          setCurrentStepIndex((idx) => idx + 1);
          return 280; // Reset to 280m for next maneuver
        }
        
        return newDistance;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [route, currentStepIndex]);

  return (
    <Card className="w-full max-w-md">
      <div className="p-4 border-b border-card-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Route Details</h2>
          {onClose && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              data-testid="button-close-route"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="h-3 w-3 rounded-full bg-primary mt-1.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium">{origin}</div>
              <div className="text-xs text-muted-foreground">Starting point</div>
            </div>
          </div>
          <div className="pl-1.5 border-l-2 border-dashed border-border h-4 ml-1" />
          <div className="flex items-start gap-2">
            <MapPin className="h-5 w-5 text-destructive flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium">{destination}</div>
              <div className="text-xs text-muted-foreground">Destination</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Calculating route...</p>
            </div>
          </div>
        )}

        {error && !isLoading && (
          <div className="py-4">
            <div className="rounded-md bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </div>
        )}

        {route && !isLoading && !error && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{route.name}</Badge>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{route.duration}</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{route.distance}</span>
              </div>
              <Badge variant="outline" className="ml-auto">
                {route.steps.length} steps
              </Badge>
            </div>

            {/* Lane-Level Guidance */}
            {activeLaneGuidance && (
              <LaneBar
                lanes={activeLaneGuidance.lanes}
                distanceToManeuver={activeLaneGuidance.distanceToManeuver}
              />
            )}

            <div className="space-y-2">
              <div className="text-sm font-medium">Turn-by-turn directions</div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {route.steps.map((step, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-md bg-secondary/50 hover-elevate"
                    data-testid={`step-${index}`}
                  >
                    <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">{step.instruction}</div>
                      <div className="text-xs text-muted-foreground mt-1">{step.distance}</div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground mt-1.5 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>

            {onStartNavigation && (
              <Button
                className="w-full"
                size="lg"
                onClick={onStartNavigation}
                data-testid="button-start-navigation"
              >
                <Navigation className="mr-2 h-5 w-5" />
                Start Navigation
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
});

export default RoutePanel;
