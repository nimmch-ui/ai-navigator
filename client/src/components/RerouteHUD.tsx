/**
 * RerouteHUD - Complete HUD integration for dynamic rerouting
 * 
 * Displays traffic alerts and reroute proposals using useRoutingController hook
 */

import { useRoutingController } from '@/hooks/useRoutingController';
import { TrafficAlertBanner } from './TrafficAlertBanner';
import { RerouteProposalCard } from './RerouteProposalCard';

export function RerouteHUD() {
  const {
    isEvaluating,
    proposal,
    trafficAhead,
    acceptReroute,
    rejectReroute,
    dismissTrafficAlert,
  } = useRoutingController();

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 space-y-3">
      {/* Traffic Alert Banner */}
      {trafficAhead && !proposal && (
        <TrafficAlertBanner
          message={
            isEvaluating
              ? 'Checking for better routes...'
              : 'Traffic conditions ahead'
          }
          severity={
            trafficAhead.congestion >= 80
              ? 'high'
              : trafficAhead.congestion >= 60
              ? 'medium'
              : 'low'
          }
          congestion={trafficAhead.congestion}
          incidentCount={trafficAhead.incidentCount}
          onDismiss={dismissTrafficAlert}
        />
      )}

      {/* Reroute Proposal Card */}
      {proposal && (
        <RerouteProposalCard
          proposal={proposal}
          onAccept={acceptReroute}
          onReject={rejectReroute}
        />
      )}
    </div>
  );
}
