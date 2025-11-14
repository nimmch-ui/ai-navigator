import { memo } from 'react';
import { Leaf, Fuel, Zap, Cloud } from 'lucide-react';
import type { EcoEstimate } from '@/services/ecoEstimates';

interface EcoSummaryProps {
  estimate: EcoEstimate;
}

const EcoSummary = memo(function EcoSummary({ estimate }: EcoSummaryProps) {
  return (
    <div 
      className="bg-green-500/10 border border-green-500/20 rounded-lg p-3"
      data-testid="eco-summary"
    >
      <div className="flex items-center gap-2 mb-2">
        <Leaf className="w-4 h-4 text-green-600 dark:text-green-400" />
        <div className="text-sm font-semibold text-green-700 dark:text-green-300">
          Eco Mode Active
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-muted-foreground">Distance</div>
          <div className="font-medium" data-testid="text-eco-distance">
            {estimate.distanceKm.toFixed(1)} km
          </div>
        </div>
        
        <div>
          <div className="text-muted-foreground">Duration</div>
          <div className="font-medium" data-testid="text-eco-duration">
            {estimate.durationMinutes} min
          </div>
        </div>
        
        {estimate.fuelLiters !== undefined && (
          <div className="flex items-center gap-1">
            <Fuel className="w-3 h-3 text-muted-foreground" />
            <div>
              <div className="text-muted-foreground">Fuel</div>
              <div className="font-medium" data-testid="text-eco-fuel">
                {estimate.fuelLiters.toFixed(1)} L
              </div>
            </div>
          </div>
        )}
        
        {estimate.energyKwh !== undefined && (
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-muted-foreground" />
            <div>
              <div className="text-muted-foreground">Energy</div>
              <div className="font-medium" data-testid="text-eco-energy">
                {estimate.energyKwh.toFixed(1)} kWh
              </div>
            </div>
          </div>
        )}
        
        {estimate.co2Kg > 0 && (
          <div className="flex items-center gap-1">
            <Cloud className="w-3 h-3 text-muted-foreground" />
            <div>
              <div className="text-muted-foreground">CO₂</div>
              <div className="font-medium" data-testid="text-eco-co2">
                {estimate.co2Kg.toFixed(1)} kg
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default EcoSummary;
