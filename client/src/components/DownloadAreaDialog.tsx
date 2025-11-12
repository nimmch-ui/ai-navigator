import { useState, useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Download, MapPin, Loader2 } from 'lucide-react';
import { offlineCacheService, DownloadProgress, DownloadArea } from '@/services/offline';
import { useToast } from '@/hooks/use-toast';

interface DownloadAreaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCenter?: [number, number];
  mapboxToken: string;
}

export function DownloadAreaDialog({
  open,
  onOpenChange,
  currentCenter,
  mapboxToken,
}: DownloadAreaDialogProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [zoomRange, setZoomRange] = useState<[number, number]>([12, 16]);
  const [radiusKm, setRadiusKm] = useState(5);
  const { toast } = useToast();

  useEffect(() => {
    if (open && mapContainer.current && !map.current) {
      const center = currentCenter || [48.8566, 2.3522];

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [center[1], center[0]],
        zoom: 12,
        accessToken: mapboxToken,
      });

      map.current.addControl(new mapboxgl.NavigationControl());

      new mapboxgl.Marker({
        draggable: true,
      })
        .setLngLat([center[1], center[0]])
        .addTo(map.current);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [open]);

  const handleDownload = async () => {
    if (!map.current) return;

    const center = map.current.getCenter();
    const bounds = calculateBounds(center.lat, center.lng, radiusKm);

    const area: DownloadArea = {
      bounds: {
        north: bounds.north,
        south: bounds.south,
        east: bounds.east,
        west: bounds.west,
      },
      zoom: {
        min: zoomRange[0],
        max: zoomRange[1],
      },
    };

    setIsDownloading(true);
    setProgress({ cached: 0, total: 0, percentage: 0, bytesDownloaded: 0 });

    try {
      await offlineCacheService.downloadArea(area, mapboxToken, (p) => {
        setProgress(p);
      });

      const sizeMB = ((progress?.bytesDownloaded || 0) / 1024 / 1024).toFixed(1);
      toast({
        title: 'Download Complete',
        description: `Cached ${progress?.cached || 0} tiles (${sizeMB} MB) for offline use.`,
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: error instanceof Error ? error.message : 'Failed to download area',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
      setProgress(null);
    }
  };

  const calculateBounds = (lat: number, lng: number, radiusKm: number) => {
    const latDelta = (radiusKm / 111.32);
    const lngDelta = (radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180)));

    return {
      north: lat + latDelta,
      south: lat - latDelta,
      east: lng + lngDelta,
      west: lng - lngDelta,
    };
  };

  const estimateTileCount = () => {
    const area = Math.pow(radiusKm * 2, 2);
    let tiles = 0;
    for (let z = zoomRange[0]; z <= zoomRange[1]; z++) {
      tiles += Math.pow(2, z - 10) * area;
    }
    return Math.round(tiles);
  };

  const estimatedSize = progress?.bytesDownloaded 
    ? progress.bytesDownloaded / 1024 / 1024
    : (estimateTileCount() * 30000) / 1024 / 1024;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="dialog-download-area">
        <DialogHeader>
          <DialogTitle>Download Area for Offline Use</DialogTitle>
          <DialogDescription>
            Select an area and zoom levels to download for offline navigation. Maximum 100MB.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            ref={mapContainer}
            className="h-64 rounded-md border"
            data-testid="map-download-area"
          />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Radius: {radiusKm} km</Label>
              <Slider
                value={[radiusKm]}
                onValueChange={([value]) => setRadiusKm(value)}
                min={1}
                max={20}
                step={1}
                data-testid="slider-radius"
              />
            </div>

            <div className="space-y-2">
              <Label>
                Zoom Levels: {zoomRange[0]} - {zoomRange[1]}
              </Label>
              <Slider
                value={zoomRange}
                onValueChange={(value) => setZoomRange(value as [number, number])}
                min={12}
                max={16}
                step={1}
                minStepsBetweenThumbs={1}
                data-testid="slider-zoom"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Estimated size:</span>
              <span className="font-medium">{estimatedSize.toFixed(1)} MB</span>
            </div>

            {isDownloading && progress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Downloading tiles...</span>
                  <span>
                    {progress.cached} / {progress.total}
                  </span>
                </div>
                <Progress value={progress.percentage} data-testid="progress-download" />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDownloading}
            data-testid="button-cancel-download"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDownload}
            disabled={isDownloading || estimatedSize > 100}
            data-testid="button-start-download"
          >
            {isDownloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
