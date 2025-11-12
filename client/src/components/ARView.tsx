/**
 * ARView - Augmented Reality navigation overlay
 * Displays camera feed with navigation overlays (arrows, speed, radars)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useARCapabilities } from '@/hooks/useARCapabilities';
import {
  projectToScreen,
  OrientationSmoothing,
  type DeviceOrientation,
  type ScreenPosition
} from '@/services/geo/ProjectToScreen';
import type { SpeedCamera } from '@/data/speedCameras';
import type { RouteStep } from '@/services/routing';
import { AlertTriangle, Navigation, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ARViewProps {
  currentPosition?: [number, number];  // [lat, lng]
  currentSpeed: number;  // km/h
  speedLimit?: number;   // km/h
  heading?: number;      // Device compass heading
  routeSteps?: RouteStep[];
  nextManeuver?: {
    direction: string;
    distance: number;
    lat: number;
    lng: number;
  };
  speedCameras?: SpeedCamera[];
  onClose: () => void;
  onFallbackTo3D: () => void;
}

export default function ARView({
  currentPosition,
  currentSpeed,
  speedLimit,
  heading = 0,
  routeSteps,
  nextManeuver,
  speedCameras = [],
  onClose,
  onFallbackTo3D
}: ARViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const orientationSmootherRef = useRef(new OrientationSmoothing(0.15));
  
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [deviceOrientation, setDeviceOrientation] = useState<DeviceOrientation>({
    alpha: 0,
    beta: 0,
    gamma: 0
  });
  const [showDashMountWarning, setShowDashMountWarning] = useState(false);
  const [simplifiedUI, setSimplifiedUI] = useState(false);

  const {
    hasCamera,
    hasDeviceOrientation,
    cameraPermission,
    orientationPermission,
    requestCamera,
    requestOrientation,
    fallbackMode,
    errorMessage
  } = useARCapabilities();

  /**
   * Safety check: Warn if speed > 30 km/h and device is handheld
   */
  useEffect(() => {
    if (currentSpeed > 30) {
      setShowDashMountWarning(true);
      setSimplifiedUI(true);
    } else {
      setSimplifiedUI(false);
    }
  }, [currentSpeed]);

  /**
   * Initialize camera stream
   */
  const initializeCamera = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      const permitted = await requestCamera();
      if (!permitted) {
        setCameraError('Camera permission denied');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',  // Rear camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      setCameraError(null);
    } catch (error) {
      console.error('[AR] Camera initialization failed:', error);
      setCameraError('Failed to access camera');
      
      // Fallback to 3D mode after 2 seconds
      setTimeout(() => {
        onFallbackTo3D();
      }, 2000);
    }
  }, [requestCamera, onFallbackTo3D]);

  /**
   * Initialize device orientation tracking
   */
  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.alpha === null || event.beta === null || event.gamma === null) {
        return;
      }

      const rawOrientation: DeviceOrientation = {
        alpha: event.alpha,
        beta: event.beta,
        gamma: event.gamma
      };

      // Apply smoothing
      const smoothed = orientationSmootherRef.current.smooth(rawOrientation);
      setDeviceOrientation(smoothed);
    };

    if (hasDeviceOrientation) {
      requestOrientation().then(permitted => {
        if (permitted) {
          window.addEventListener('deviceorientation', handleOrientation);
        }
      });
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [hasDeviceOrientation, requestOrientation]);

  /**
   * Initialize camera on mount
   */
  useEffect(() => {
    if (hasCamera) {
      initializeCamera();
    } else {
      setCameraError('Camera not supported');
      setTimeout(() => onFallbackTo3D(), 2000);
    }

    return () => {
      // Cleanup camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Cancel animation frame
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [hasCamera, initializeCamera, onFallbackTo3D]);

  /**
   * Render AR overlays on canvas
   */
  useEffect(() => {
    if (!canvasRef.current || !currentPosition) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw speed badge
      drawSpeedBadge(ctx, canvas.width, canvas.height, currentSpeed, speedLimit);

      // Draw next maneuver arrow (if available and not simplified)
      if (nextManeuver && !simplifiedUI) {
        drawManeuverArrow(ctx, canvas.width, canvas.height, nextManeuver, currentPosition, deviceOrientation);
      }

      // Draw radar icons (speed cameras)
      if (!simplifiedUI && speedCameras.length > 0) {
        drawRadarIcons(ctx, canvas.width, canvas.height, speedCameras, currentPosition, deviceOrientation);
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [currentPosition, currentSpeed, speedLimit, nextManeuver, speedCameras, deviceOrientation, simplifiedUI]);

  /**
   * Draw speed badge overlay
   */
  const drawSpeedBadge = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    speed: number,
    limit?: number
  ) => {
    const x = width - 120;
    const y = 80;
    const radius = 50;

    // Background circle
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Speed text
    ctx.fillStyle = speed > (limit || Infinity) ? '#ef4444' : '#ffffff';
    ctx.font = 'bold 32px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(speed).toString(), x, y - 5);

    // Unit text
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText('km/h', x, y + 20);

    // Speed limit (if available)
    if (limit) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(x - 25, y + 40, 50, 20);
      
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.fillText(limit.toString(), x, y + 50);
    }
  };

  /**
   * Draw next maneuver arrow
   */
  const drawManeuverArrow = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    maneuver: NonNullable<typeof nextManeuver>,
    userPos: [number, number],
    orientation: DeviceOrientation
  ) => {
    const projection = projectToScreen(
      userPos[0],
      userPos[1],
      maneuver.lat,
      maneuver.lng,
      orientation,
      { screenWidth: width, screenHeight: height }
    );

    if (!projection.isVisible) return;

    const x = projection.x * width;
    const y = projection.y * height;

    // Arrow background
    ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
    ctx.beginPath();
    ctx.arc(x, y, 40, 0, Math.PI * 2);
    ctx.fill();

    // Arrow shape (simplified)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw arrow pointing up (will be rotated based on maneuver direction)
    ctx.save();
    ctx.translate(x, y);
    
    // Rotate based on direction (simplified - could be enhanced)
    const rotation = maneuver.direction.includes('right') ? 90 : 
                     maneuver.direction.includes('left') ? -90 : 0;
    ctx.rotate((rotation * Math.PI) / 180);

    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(0, 10);
    ctx.moveTo(0, -20);
    ctx.lineTo(-10, -10);
    ctx.moveTo(0, -20);
    ctx.lineTo(10, -10);
    ctx.stroke();

    ctx.restore();

    // Distance text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(maneuver.distance)}m`, x, y + 60);
  };

  /**
   * Draw radar/camera icons
   */
  const drawRadarIcons = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cameras: SpeedCamera[],
    userPos: [number, number],
    orientation: DeviceOrientation
  ) => {
    cameras.forEach(camera => {
      const projection = projectToScreen(
        userPos[0],
        userPos[1],
        camera.lat,
        camera.lon,
        orientation,
        { screenWidth: width, screenHeight: height, maxDistance: 500 }
      );

      if (!projection.isVisible || projection.distance > 500) return;

      const x = projection.x * width;
      const y = projection.y * height;
      const size = Math.max(20, 40 - (projection.distance / 20)); // Size based on distance

      // Camera icon (red circle with camera symbol)
      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fill();

      // White border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Distance text
      if (projection.distance < 300) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(projection.distance)}m`, x, y + size / 2 + 15);
      }
    });
  };

  // Show error state if camera failed
  if (cameraError || fallbackMode === 'none') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <Card className="p-6 max-w-md mx-4">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-destructive" />
            <h3 className="font-semibold">AR Mode Unavailable</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {cameraError || errorMessage || 'AR features are not supported on this device'}
          </p>
          <div className="flex gap-2">
            <Button onClick={onFallbackTo3D} variant="default" className="flex-1" data-testid="button-fallback-3d">
              Switch to 3D Mode
            </Button>
            <Button onClick={onClose} variant="outline" data-testid="button-close-ar">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Camera video feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
        data-testid="ar-camera-feed"
      />

      {/* AR overlay canvas */}
      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        className="absolute inset-0 w-full h-full pointer-events-none"
        data-testid="ar-overlay-canvas"
      />

      {/* Dash mount warning */}
      {showDashMountWarning && (
        <div className="absolute top-4 left-4 right-4 z-20">
          <Card className="bg-yellow-500/90 text-black p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5" />
              <div className="flex-1">
                <p className="font-semibold">Use Dash Mount</p>
                <p className="text-sm">For safety, mount your device on the dashboard</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDashMountWarning(false)}
                data-testid="button-dismiss-warning"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Close button */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          size="icon"
          variant="default"
          onClick={onClose}
          className="bg-black/60 hover:bg-black/80"
          data-testid="button-close-ar-overlay"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* AR Mode indicator */}
      <div className="absolute bottom-4 left-4 z-10">
        <Card className="bg-black/60 px-4 py-2 flex items-center gap-2">
          <Navigation className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-white">AR Navigation</span>
        </Card>
      </div>

      {/* Fallback to 3D button */}
      {fallbackMode === 'pseudo-ar' && (
        <div className="absolute bottom-4 right-4 z-10">
          <Button
            size="sm"
            variant="secondary"
            onClick={onFallbackTo3D}
            data-testid="button-switch-to-3d"
          >
            Switch to 3D
          </Button>
        </div>
      )}
    </div>
  );
}
