import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SpeedCamera } from '@/data/speedCameras';

interface CameraProximityAlertProps {
  camera: SpeedCamera;
  distance: number;
  onDismiss: () => void;
}

export default function CameraProximityAlert({ camera, distance, onDismiss }: CameraProximityAlertProps) {
  const distanceText = distance < 1000 
    ? `${Math.round(distance)} m` 
    : `${(distance / 1000).toFixed(1)} km`;

  return (
    <div 
      className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-3"
      data-testid="camera-proximity-alert"
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive text-destructive-foreground">
        <Camera className="w-5 h-5" />
      </div>
      
      <div className="flex-1">
        <div className="font-semibold text-sm" data-testid="text-alert-title">
          Speed camera ahead – limit {camera.speedLimitKmh} km/h
        </div>
        <div className="text-xs text-muted-foreground">
          {distanceText} ahead{camera.direction ? ` (${camera.direction})` : ''}
        </div>
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={onDismiss}
        className="h-8 w-8"
        data-testid="button-dismiss-alert"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
