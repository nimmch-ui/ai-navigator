import { useState } from 'react';
import { History, Clock, MapPin, Navigation2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { TripHistoryService, type TripRecord } from '@/services/tripHistory';
import { formatDistance } from 'date-fns';

interface TripHistoryProps {
  onReplayTrip: (trip: TripRecord) => void;
}

export default function TripHistory({ onReplayTrip }: TripHistoryProps) {
  const [trips] = useState<TripRecord[]>(TripHistoryService.getTripHistory());

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const formatDistanceKm = (meters: number): string => {
    const km = meters / 1000;
    if (km < 1) {
      return `${Math.round(meters)} m`;
    }
    return `${km.toFixed(1)} km`;
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'car':
        return '🚗';
      case 'bike':
        return '🚴';
      case 'walk':
        return '🚶';
      case 'transit':
        return '🚌';
      default:
        return '📍';
    }
  };

  const getPreferenceBadge = (pref: string) => {
    switch (pref) {
      case 'fastest':
        return { label: 'Fastest', variant: 'default' as const };
      case 'shortest':
        return { label: 'Shortest', variant: 'secondary' as const };
      case 'eco':
        return { label: 'Eco', variant: 'outline' as const };
      default:
        return { label: pref, variant: 'outline' as const };
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          data-testid="button-open-history"
        >
          <History className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" data-testid="history-panel">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-sm">Trip History</h3>
            <p className="text-xs text-muted-foreground">
              {trips.length} {trips.length === 1 ? 'trip' : 'trips'}
            </p>
          </div>

          <ScrollArea className="h-[400px]">
            {trips.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Navigation2 className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No trips yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your navigation history will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {trips.map((trip) => {
                  const badge = getPreferenceBadge(trip.routePreference);
                  return (
                    <div
                      key={trip.id}
                      className="p-3 rounded-md border hover-elevate active-elevate-2 cursor-pointer space-y-2"
                      onClick={() => onReplayTrip(trip)}
                      data-testid={`trip-item-${trip.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <span className="text-xl mt-0.5">{getModeIcon(trip.transportMode)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-medium truncate">
                                {trip.origin}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <p className="truncate">{trip.destination}</p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>
                                {formatDistance(trip.timestamp, new Date(), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge variant={badge.variant} className="text-xs">
                          {badge.label}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Distance:</span>
                          <span className="font-medium">{formatDistanceKm(trip.distance)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Duration:</span>
                          <span className="font-medium">{formatDuration(trip.duration)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
