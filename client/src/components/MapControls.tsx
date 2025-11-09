import { Plus, Minus, Layers, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onLayersToggle: () => void;
  onCurrentLocation: () => void;
}

export default function MapControls({
  onZoomIn,
  onZoomOut,
  onLayersToggle,
  onCurrentLocation
}: MapControlsProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col bg-card border border-card-border rounded-md overflow-hidden shadow-sm">
        <Button
          size="icon"
          variant="ghost"
          onClick={onZoomIn}
          className="rounded-none border-b border-card-border"
          data-testid="button-zoom-in"
        >
          <Plus className="h-5 w-5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onZoomOut}
          className="rounded-none"
          data-testid="button-zoom-out"
        >
          <Minus className="h-5 w-5" />
        </Button>
      </div>

      <Button
        size="icon"
        variant="ghost"
        onClick={onLayersToggle}
        className="bg-card border border-card-border shadow-sm"
        data-testid="button-layers"
      >
        <Layers className="h-5 w-5" />
      </Button>

      <Button
        size="icon"
        variant="ghost"
        onClick={onCurrentLocation}
        className="bg-card border border-card-border shadow-sm"
        data-testid="button-current-location"
      >
        <Navigation className="h-5 w-5" />
      </Button>
    </div>
  );
}
