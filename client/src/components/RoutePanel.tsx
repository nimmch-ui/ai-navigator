import { Navigation, Clock, TrendingUp, MapPin, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface RouteStep {
  instruction: string;
  distance: string;
  icon: 'straight' | 'left' | 'right';
}

interface Route {
  id: string;
  name: string;
  distance: string;
  duration: string;
  steps: RouteStep[];
}

interface RoutePanelProps {
  origin: string;
  destination: string;
  routes: Route[];
  onClose?: () => void;
  onStartNavigation?: (routeId: string) => void;
}

export default function RoutePanel({
  origin,
  destination,
  routes,
  onClose,
  onStartNavigation
}: RoutePanelProps) {
  return (
    <Card className="w-full max-w-md">
      <div className="p-4 border-b border-card-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Route Details</h2>
          {onClose && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              data-testid="button-close-route"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="h-3 w-3 rounded-full bg-primary mt-1.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium">{origin}</div>
              <div className="text-xs text-muted-foreground">Starting point</div>
            </div>
          </div>
          <div className="pl-1.5 border-l-2 border-dashed border-border h-4 ml-1" />
          <div className="flex items-start gap-2">
            <MapPin className="h-5 w-5 text-destructive flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium">{destination}</div>
              <div className="text-xs text-muted-foreground">Destination</div>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue={routes[0]?.id} className="w-full">
        <div className="px-4 pt-4">
          <TabsList className="w-full grid" style={{ gridTemplateColumns: `repeat(${routes.length}, 1fr)` }}>
            {routes.map((route) => (
              <TabsTrigger key={route.id} value={route.id} data-testid={`tab-route-${route.id}`}>
                {route.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {routes.map((route) => (
          <TabsContent key={route.id} value={route.id} className="mt-0">
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{route.duration}</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{route.distance}</span>
                </div>
                <Badge variant="secondary" className="ml-auto">
                  {route.steps.length} steps
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Turn-by-turn directions</div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {route.steps.map((step, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-md bg-secondary/50 hover-elevate"
                      data-testid={`step-${index}`}
                    >
                      <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm">{step.instruction}</div>
                        <div className="text-xs text-muted-foreground mt-1">{step.distance}</div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground mt-1.5 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>

              {onStartNavigation && (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => onStartNavigation(route.id)}
                  data-testid="button-start-navigation"
                >
                  <Navigation className="h-5 w-5 mr-2" />
                  Start Navigation
                </Button>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
}
