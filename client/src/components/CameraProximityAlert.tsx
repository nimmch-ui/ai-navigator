import { useRef, useEffect } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SpeedCamera } from '@/data/speedCameras';
import { startRadarPulse, stopRadarPulse } from '@/services/radarPulse';

interface CameraProximityAlertProps {
  camera: SpeedCamera;
  distance: number;
  onDismiss: () => void;
  radarPulseEnabled?: boolean;
}

export default function CameraProximityAlert({ 
  camera, 
  distance, 
  onDismiss,
  radarPulseEnabled = true 
}: CameraProximityAlertProps) {
  const iconRef = useRef<HTMLDivElement>(null);
  const distanceText = distance < 1000 
    ? `${Math.round(distance)} m` 
    : `${(distance / 1000).toFixed(1)} km`;

  // Trigger pulse animation when <300m
  useEffect(() => {
    if (!radarPulseEnabled) return;

    if (distance < 300 && iconRef.current) {
      startRadarPulse(iconRef.current);
    }

    return () => {
      stopRadarPulse();
    };
  }, [distance, radarPulseEnabled]);

  return (
    <div 
      className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-3"
      data-testid="camera-proximity-alert"
    >
      <div 
        ref={iconRef}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive text-destructive-foreground transition-all"
      >
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
