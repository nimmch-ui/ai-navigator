import { memo, useMemo } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CameraOverlay from './CameraOverlay';
import HUDOverlay from './HUDOverlay';
import { useARExperience } from '@/contexts/ARExperienceProvider';

interface ARPreviewOverlayProps {
  nextManeuver?: string;
  distance?: string;
  direction?: 'straight' | 'left' | 'right';
  onClose: () => void;
}

const ARPreviewOverlay = memo(({ 
  nextManeuver = 'Continue straight', 
  distance = '500 m',
  direction = 'straight',
  onClose 
}: ARPreviewOverlayProps) => {
  const { cameraStream, heading, orientationMode } = useARExperience();

  // Determine if we should show enhanced AR or basic HUD
  const showEnhancedAR = useMemo(() => {
    return orientationMode !== "none" && heading !== null;
  }, [orientationMode, heading]);

  return (
    <div 
      className="fixed inset-0 z-[200] bg-black"
      data-testid="ar-preview-overlay"
    >
      {/* Camera feed */}
      <CameraOverlay stream={cameraStream} />

      {/* HUD overlay with navigation guidance */}
      <HUDOverlay
        nextManeuver={nextManeuver}
        distance={distance}
        direction={direction}
      />

      {/* Close button */}
      <div className="absolute top-4 right-4 z-10 pointer-events-auto">
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          className="bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white border border-white/20"
          data-testid="button-close-ar"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Sensor status indicator (dev mode) */}
      {showEnhancedAR && heading && (
        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-md px-3 py-2 text-white text-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-white/60">Heading:</span> {Math.round(heading.heading)}°
            </div>
            <div>
              <span className="text-white/60">Mode:</span> {orientationMode}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

ARPreviewOverlay.displayName = 'ARPreviewOverlay';

export default ARPreviewOverlay;
