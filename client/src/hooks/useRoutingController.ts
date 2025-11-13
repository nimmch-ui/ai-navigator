/**
 * useRoutingController - React hook for dynamic rerouting with RoutingController
 * 
 * Wires RoutingController events into React state for HUD components
 */

import { useState, useEffect, useCallback } from 'react';
import type { RerouteProposal } from '@/services/navigation/RoutingController';
import { routingController } from '@/services/navigation/RoutingController';
import { EventBus } from '@/services/eventBus';

export interface TrafficAheadInfo {
  congestion: number;
  incidentCount: number;
}

export interface UseRoutingControllerResult {
  isEvaluating: boolean;
  proposal: RerouteProposal | null;
  trafficAhead: TrafficAheadInfo | null;
  acceptReroute: () => void;
  rejectReroute: () => void;
  dismissTrafficAlert: () => void;
}

/**
 * Hook to integrate RoutingController with React UI
 */
export function useRoutingController(): UseRoutingControllerResult {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [proposal, setProposal] = useState<RerouteProposal | null>(null);
  const [trafficAhead, setTrafficAhead] = useState<TrafficAheadInfo | null>(null);

  // Listen for RoutingController events
  useEffect(() => {
    const handleEvaluating = (data: any) => {
      console.log('[useRoutingController] Evaluating alternatives:', data);
      setIsEvaluating(true);
      setTrafficAhead({
        congestion: data.congestion || 0,
        incidentCount: data.incidents || 0,
      });
    };

    const handleProposal = (proposalData: RerouteProposal) => {
      console.log('[useRoutingController] Reroute proposal received:', proposalData);
      setIsEvaluating(false);
      setProposal(proposalData);
    };

    const handleAccepted = (data: any) => {
      console.log('[useRoutingController] Reroute accepted:', data);
      setProposal(null);
      setTrafficAhead(null);
      setIsEvaluating(false);
    };

    const handleRejected = () => {
      console.log('[useRoutingController] Reroute rejected');
      setProposal(null);
      setIsEvaluating(false);
      // Keep trafficAhead to show banner
    };

    // Subscribe to RoutingController events (each subscribe returns cleanup function)
    const unsubEval = EventBus.subscribe('route:evaluating_alternatives' as any, handleEvaluating);
    const unsubProposal = EventBus.subscribe('route:reroute_proposal' as any, handleProposal);
    const unsubAccepted = EventBus.subscribe('route:reroute_accepted' as any, handleAccepted);
    const unsubRejected = EventBus.subscribe('route:reroute_rejected' as any, handleRejected);

    return () => {
      unsubEval();
      unsubProposal();
      unsubAccepted();
      unsubRejected();
    };
  }, []);

  const acceptReroute = useCallback(() => {
    if (proposal) {
      console.log('[useRoutingController] User accepted reroute');
      routingController.acceptReroute(proposal);
      setProposal(null);
      setTrafficAhead(null);
    }
  }, [proposal]);

  const rejectReroute = useCallback(() => {
    if (proposal) {
      console.log('[useRoutingController] User rejected reroute');
      routingController.rejectReroute();
      setProposal(null);
      // Keep trafficAhead to show banner
    }
  }, [proposal]);

  const dismissTrafficAlert = useCallback(() => {
    setTrafficAhead(null);
  }, []);

  return {
    isEvaluating,
    proposal,
    trafficAhead,
    acceptReroute,
    rejectReroute,
    dismissTrafficAlert,
  };
}
