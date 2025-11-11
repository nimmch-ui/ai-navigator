import { Car, Zap, Flame, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { TripEstimate, VehicleType } from '@/services/tripEstimates';

interface TripSummaryProps {
  estimate: TripEstimate;
  vehicleType: VehicleType;
  ecoMode: boolean;
}

export default function TripSummary({ estimate, vehicleType, ecoMode }: TripSummaryProps) {
  return (
    <Card className="p-4" data-testid="trip-summary">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Trip Estimate</h3>
        {ecoMode && (
          <Badge variant="secondary" className="text-xs" data-testid="badge-eco-mode">
            Eco Mode
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">Distance</div>
            <div className="font-medium" data-testid="text-distance">
              {estimate.distance.toFixed(1)} km
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Duration</div>
            <div className="font-medium" data-testid="text-duration">
              {Math.round(estimate.duration)} min
            </div>
          </div>
        </div>

        {estimate.fuelConsumption !== undefined && (
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-muted-foreground text-xs">Fuel</div>
              <div className="font-medium text-sm" data-testid="text-fuel">
                {estimate.fuelConsumption.toFixed(1)} L
              </div>
            </div>
          </div>
        )}

        {estimate.energyConsumption !== undefined && (
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-muted-foreground text-xs">Energy</div>
              <div className="font-medium text-sm" data-testid="text-energy">
                {estimate.energyConsumption.toFixed(1)} kWh
              </div>
            </div>
          </div>
        )}

        {estimate.caloriesBurned !== undefined && (
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-muted-foreground text-xs">Calories</div>
              <div className="font-medium text-sm" data-testid="text-calories">
                {estimate.caloriesBurned} kcal
              </div>
            </div>
          </div>
        )}

        {estimate.co2Emissions !== undefined && estimate.co2Emissions > 0 && (
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-muted-foreground text-xs">CO₂ Emissions</div>
              <div className="font-medium text-sm" data-testid="text-co2">
                {estimate.co2Emissions.toFixed(1)} kg
              </div>
            </div>
          </div>
        )}

        {estimate.ecoTips.length > 0 && (
          <>
            <Separator />
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">Eco Tips</div>
              <ul className="space-y-1">
                {estimate.ecoTips.map((tip, index) => (
                  <li key={index} className="text-xs text-muted-foreground flex items-start gap-1">
                    <span className="text-primary">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        <div className="pt-2 border-t">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-help">
                  <Info className="h-3 w-3" />
                  <span>Estimates may vary</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">{estimate.disclaimer}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </Card>
  );
}
