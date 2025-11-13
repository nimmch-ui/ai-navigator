import { useEffect, useRef, useState, useCallback } from 'react';
import { nightVisionService, type ColorMode, type NightVisionResult } from '@/services/vision/NightVisionService';
import { nightVisionHazardIntegration } from '@/services/vision/NightVisionHazardIntegration';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Camera, Zap, AlertTriangle } from 'lucide-react';

interface NightVisionOverlayProps {
  videoSource?: HTMLVideoElement;
  testMode?: boolean;
  onDetection?: (result: NightVisionResult) => void;
  className?: string;
}

export function NightVisionOverlay({ 
  videoSource, 
  testMode = false, 
  onDetection,
  className = '' 
}: NightVisionOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [colorMode, setColorMode] = useState<ColorMode>('infrared');
  const [enableEdgeDetection, setEnableEdgeDetection] = useState(true);
  const [enableObjectDetection, setEnableObjectDetection] = useState(true);
  const [processingTime, setProcessingTime] = useState(0);
  const [detectionCount, setDetectionCount] = useState(0);
  const animationFrameRef = useRef<number>();

  // Initialize service
  useEffect(() => {
    nightVisionService.initialize(640, 480);
    nightVisionService.setColorMode(colorMode);
    nightVisionHazardIntegration.enable();

    return () => {
      nightVisionHazardIntegration.disable();
    };
  }, [colorMode]);

  // Main processing loop
  const processFrame = useCallback(async () => {
    if (!isActive || !canvasRef.current || !overlayCanvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const overlayCtx = overlayCanvas.getContext('2d');
    
    if (!ctx || !overlayCtx) return;

    let imageData: ImageData;

    if (testMode || !videoSource) {
      // Generate test low-light image
      const testCanvas = document.createElement('canvas');
      testCanvas.width = 640;
      testCanvas.height = 480;
      const testCtx = testCanvas.getContext('2d')!;
      
      // Create dark scene
      const gradient = testCtx.createLinearGradient(0, 0, 640, 480);
      gradient.addColorStop(0, '#0a0a0a');
      gradient.addColorStop(0.5, '#1a1a1a');
      gradient.addColorStop(1, '#0a0a0a');
      testCtx.fillStyle = gradient;
      testCtx.fillRect(0, 0, 640, 480);
      
      // Add some dim shapes (simulating road, objects)
      testCtx.fillStyle = '#333333';
      testCtx.fillRect(100, 100, 80, 80);
      testCtx.fillRect(300, 200, 60, 100);
      testCtx.fillRect(450, 150, 100, 50);
      
      // Road edges
      testCtx.strokeStyle = '#444444';
      testCtx.lineWidth = 3;
      testCtx.beginPath();
      testCtx.moveTo(50, 400);
      testCtx.lineTo(590, 400);
      testCtx.stroke();
      
      imageData = testCtx.getImageData(0, 0, 640, 480);
    } else {
      // Use video source
      ctx.drawImage(videoSource, 0, 0, 640, 480);
      imageData = ctx.getImageData(0, 0, 640, 480);
    }

    // Process frame through night vision
    try {
      const result = await nightVisionService.processFrame(imageData, {
        enableEnhancement: true,
        enableEdgeDetection,
        enableObjectDetection,
        colorMode,
      });

      // Display enhanced frame
      ctx.putImageData(result.enhancedFrame, 0, 0);

      // Clear overlay
      overlayCtx.clearRect(0, 0, 640, 480);

      // Draw detections
      drawDetections(overlayCtx, result);

      // Update stats
      setProcessingTime(result.processingTimeMs);
      setDetectionCount(result.detections.length);

      // Integrate with hazard pipeline
      nightVisionHazardIntegration.processNightVisionResult(result);

      // Notify parent
      if (onDetection) {
        onDetection(result);
      }
    } catch (error) {
      console.error('[NightVisionOverlay] Processing error:', error);
    }

    // Continue loop
    if (isActive) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
    }
  }, [isActive, videoSource, testMode, enableEdgeDetection, enableObjectDetection, colorMode, onDetection]);

  // Start/stop processing loop
  useEffect(() => {
    if (isActive) {
      processFrame();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, processFrame]);

  // Draw detection overlays
  const drawDetections = (ctx: CanvasRenderingContext2D, result: NightVisionResult) => {
    result.detections.forEach((detection) => {
      // Color coding:
      // - Road edges: green
      // - Animals: orange
      // - Pedestrians: yellow
      // - Hazards: red (future)
      let color = '#00ff00'; // Default green
      let label = 'Edge';

      switch (detection.type) {
        case 'edge':
          color = '#00ff00'; // Green
          label = 'Road Edge';
          break;
        case 'animal':
          color = '#ff8800'; // Orange
          label = 'Animal';
          break;
        case 'pedestrian':
          color = '#ffff00'; // Yellow
          label = 'Pedestrian';
          break;
        case 'road_line':
          color = '#00ff00'; // Green
          label = 'Lane';
          break;
      }

      // Draw bounding box if available
      if (detection.bbox) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(
          detection.bbox.x,
          detection.bbox.y,
          detection.bbox.width,
          detection.bbox.height
        );

        // Draw label
        ctx.fillStyle = color;
        ctx.font = '14px Inter';
        ctx.fillText(
          `${label} (${(detection.confidence * 100).toFixed(0)}%)`,
          detection.bbox.x,
          detection.bbox.y - 5
        );
      }

      // Draw points if available (for edges)
      if (detection.points && detection.type === 'edge') {
        ctx.fillStyle = color;
        detection.points.forEach((point) => {
          ctx.fillRect(point.x - 1, point.y - 1, 2, 2);
        });
      }
    });
  };

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            <h3 className="font-semibold text-lg">Night Vision Assist</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isActive ? 'default' : 'secondary'}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
            <Button
              size="sm"
              variant={isActive ? 'destructive' : 'default'}
              onClick={() => setIsActive(!isActive)}
              data-testid="button-toggle-night-vision"
            >
              {isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        </div>

        {/* Canvas Display */}
        <div className="relative bg-black rounded-md overflow-hidden">
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="w-full h-auto"
            data-testid="canvas-night-vision-main"
          />
          <canvas
            ref={overlayCanvasRef}
            width={640}
            height={480}
            className="absolute top-0 left-0 w-full h-auto pointer-events-none"
            data-testid="canvas-night-vision-overlay"
          />
          
          {!isActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-center text-muted-foreground">
                <Camera className="w-12 h-12 mx-auto mb-2" />
                <p>Night Vision Inactive</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="color-mode">Color Mode</Label>
            <Select
              value={colorMode}
              onValueChange={(value) => setColorMode(value as ColorMode)}
            >
              <SelectTrigger id="color-mode" data-testid="select-color-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="infrared">Infrared (Night Vision)</SelectItem>
                <SelectItem value="thermal">Thermal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Detection Options</Label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="edge-detection"
                  checked={enableEdgeDetection}
                  onCheckedChange={setEnableEdgeDetection}
                  data-testid="switch-edge-detection"
                />
                <Label htmlFor="edge-detection" className="text-sm cursor-pointer">
                  Edge Detection
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="object-detection"
                  checked={enableObjectDetection}
                  onCheckedChange={setEnableObjectDetection}
                  data-testid="switch-object-detection"
                />
                <Label htmlFor="object-detection" className="text-sm cursor-pointer">
                  Object Detection
                </Label>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        {isActive && (
          <div className="grid grid-cols-3 gap-2 pt-2 border-t">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Processing</div>
              <div className="text-sm font-semibold flex items-center justify-center gap-1">
                <Zap className="w-3 h-3" />
                {processingTime.toFixed(1)}ms
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Detections</div>
              <div className="text-sm font-semibold flex items-center justify-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {detectionCount}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Mode</div>
              <div className="text-sm font-semibold capitalize">{colorMode}</div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <div className="flex items-center gap-1 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#00ff00' }}></div>
            <span>Road Edges</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ff8800' }}></div>
            <span>Animals</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ffff00' }}></div>
            <span>Pedestrians</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ff0000' }}></div>
            <span>Hazards</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
