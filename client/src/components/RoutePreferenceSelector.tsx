import { Zap, Ruler, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RoutePreference } from '@/services/preferences';

interface RoutePreferenceSelectorProps {
  value: RoutePreference;
  onChange: (preference: RoutePreference) => void;
}

const preferences: Array<{
  value: RoutePreference;
  label: string;
  icon: typeof Zap;
}> = [
  { value: 'fastest', label: 'Fastest', icon: Zap },
  { value: 'shortest', label: 'Shortest', icon: Ruler },
  { value: 'eco', label: 'Eco', icon: Leaf }
];

export default function RoutePreferenceSelector({
  value,
  onChange
}: RoutePreferenceSelectorProps) {
  return (
    <div className="flex gap-2 bg-background/95 backdrop-blur-sm rounded-lg p-1 shadow-sm border border-border" role="group" aria-label="Route preference">
      {preferences.map((pref) => {
        const Icon = pref.icon;
        const isActive = value === pref.value;
        
        return (
          <Button
            key={pref.value}
            onClick={() => onChange(pref.value)}
            variant={isActive ? 'default' : 'ghost'}
            size="sm"
            className="gap-2"
            data-testid={`button-preference-${pref.value}`}
            aria-pressed={isActive}
            aria-label={pref.label}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">{pref.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
