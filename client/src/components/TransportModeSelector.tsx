import { Car, Bike, PersonStanding, Train } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TransportMode } from '@/services/preferences';

interface TransportModeSelectorProps {
  value: TransportMode;
  onChange: (mode: TransportMode) => void;
}

const modes: Array<{ value: TransportMode; label: string; icon: typeof Car }> = [
  { value: 'car', label: 'Car', icon: Car },
  { value: 'bike', label: 'Bike', icon: Bike },
  { value: 'walk', label: 'Walk', icon: PersonStanding },
  { value: 'transit', label: 'Transit', icon: Train }
];

export default function TransportModeSelector({ value, onChange }: TransportModeSelectorProps) {
  return (
    <div className="bg-card border border-card-border rounded-md shadow-sm p-1 flex gap-1">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = value === mode.value;
        
        return (
          <Button
            key={mode.value}
            size="sm"
            variant={isActive ? 'default' : 'ghost'}
            onClick={() => onChange(mode.value)}
            className="flex items-center gap-1.5 min-w-[70px]"
            data-testid={`mode-${mode.value}`}
          >
            <Icon className="h-4 w-4" />
            <span className="text-xs font-medium">{mode.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
