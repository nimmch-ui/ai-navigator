/**
 * RerouteProposalCard - HUD component for reroute suggestions
 */

import { Clock, MapPin, Navigation, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import type { RerouteProposal } from '@/services/navigation/RoutingController';

export interface RerouteProposalCardProps {
  proposal: RerouteProposal;
  onAccept: () => void;
  onReject: () => void;
}

export function RerouteProposalCard({
  proposal,
  onAccept,
  onReject,
}: RerouteProposalCardProps) {
  const minutesSaved = Math.round(proposal.timeSaved / 60);
  const distanceKm = (proposal.distanceImpact / 1000).toFixed(1);
  const isLonger = proposal.distanceImpact > 0;

  const severityColors = {
    low: 'bg-blue-500',
    moderate: 'bg-orange-500',
    severe: 'bg-red-500',
  };

  return (
    <Card className="p-4 space-y-3" data-testid="card-reroute-proposal">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${severityColors[proposal.severity]}`} />
          <h3 className="font-semibold text-sm">Better Route Available</h3>
        </div>
        
        <Badge variant="default" className="text-xs">
          -{minutesSaved} min
        </Badge>
      </div>

      {/* Reason */}
      <p className="text-sm text-muted-foreground" data-testid="text-reroute-reason">
        {proposal.reason}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
          <div>
            <p className="text-xs text-muted-foreground">Time Saved</p>
            <p className="text-sm font-medium" data-testid="text-time-saved">
              {minutesSaved} {minutesSaved === 1 ? 'minute' : 'minutes'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLonger ? (
            <TrendingUp className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-green-600 dark:text-green-400" />
          )}
          <div>
            <p className="text-xs text-muted-foreground">Distance</p>
            <p className="text-sm font-medium" data-testid="text-distance-impact">
              {isLonger ? '+' : ''}{distanceKm} km
            </p>
          </div>
        </div>
      </div>

      {/* Eco impact (if significant) */}
      {Math.abs(proposal.ecoImpact) > 5 && (
        <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
          <Navigation className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            {proposal.ecoImpact > 0 
              ? `${proposal.ecoImpact.toFixed(0)}% less efficient`
              : `${Math.abs(proposal.ecoImpact).toFixed(0)}% more efficient`
            }
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          size="sm"
          onClick={onAccept}
          className="flex-1"
          data-testid="button-accept-reroute"
        >
          Accept Route
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onReject}
          className="flex-1"
          data-testid="button-reject-reroute"
        >
          Keep Current
        </Button>
      </div>
    </Card>
  );
}
