import { Card } from '@/components/ui/card';
import { Camera, School, AlertTriangle, Construction } from 'lucide-react';
import { getHazardMetadata } from '@/data/hazards';
import type { HazardType } from '@/data/hazards';

const hazardTypes: { type: HazardType; label: string }[] = [
  { type: "speed_camera", label: "Speed Camera" },
  { type: "school_zone", label: "School Zone" },
  { type: "dangerous_curve", label: "Dangerous Curve" },
  { type: "accident_zone", label: "Accident Zone" }
];

export default function HazardLegend() {
  return (
    <Card className="p-3" data-testid="hazard-legend">
      <h4 className="font-semibold text-xs mb-2">Road Hazards</h4>
      <div className="space-y-1.5">
        {hazardTypes.map(({ type, label }) => {
          const metadata = getHazardMetadata(type);
          const Icon = metadata.icon;
          return (
            <div
              key={type}
              className="flex items-center gap-2 text-xs"
              data-testid={`legend-${type}`}
            >
              <div className={`${metadata.bgColorClass} rounded p-1`}>
                <Icon className="h-3 w-3 text-white" />
              </div>
              <span className="text-muted-foreground">{label}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
