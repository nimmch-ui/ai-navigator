import { NightVisionOverlay } from '@/components/NightVisionOverlay';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';

export default function NightVisionDemo() {
  const [, setLocation] = useLocation();

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-4">
        <Button
          variant="ghost"
          onClick={() => setLocation('/')}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <h1 className="text-3xl font-bold mb-2">Night Vision Driving Assist</h1>
          <p className="text-muted-foreground mb-4">
            AI-powered night vision system for enhanced low-light driving safety with real-time object detection and voice alerts.
          </p>
          
          <div className="space-y-2 text-sm">
            <h3 className="font-semibold">Features:</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Real-time low-light enhancement with gamma correction and histogram equalization</li>
              <li>Edge detection using Sobel operator for road boundary identification</li>
              <li>Color mapping modes: Infrared (night vision), Thermal, and Normal</li>
              <li>AI-powered object detection (animals, pedestrians, road lines)</li>
              <li>Voice alerts integrated with navigation guidance system</li>
              <li>Color-coded overlays: Green (road edges), Orange (animals), Yellow (pedestrians), Red (hazards)</li>
            </ul>
          </div>
        </Card>

        <NightVisionOverlay
          testMode={true}
          onDetection={(result) => {
            console.log('[NightVisionDemo] Detection result:', result);
          }}
        />

        <Card className="p-6">
          <h3 className="font-semibold mb-2">Voice Alert Examples</h3>
          <div className="grid gap-2 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-20 h-3 rounded-full bg-orange-500/20 border border-orange-500"></div>
              <span className="text-muted-foreground">"Animal detected on right. Exercise caution."</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-20 h-3 rounded-full bg-yellow-500/20 border border-yellow-500"></div>
              <span className="text-muted-foreground">"Pedestrian crossing ahead. Reduce speed."</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-20 h-3 rounded-full bg-blue-500/20 border border-blue-500"></div>
              <span className="text-muted-foreground">"Low visibility conditions detected. Slow down."</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-20 h-3 rounded-full bg-green-500/20 border border-green-500"></div>
              <span className="text-muted-foreground">"Road edge detection lost. Stay centered in lane."</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
