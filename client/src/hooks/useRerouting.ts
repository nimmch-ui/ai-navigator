import { useState, useEffect, useRef, useCallback } from 'react';
import { trafficService } from '@/services/traffic';
import { reroutingService } from '@/services/rerouting';
import type { RouteResult } from '@/services/routing';
import type { TransportMode, RoutePreference, RerouteSettings } from '@/services/preferences';
import type { TrafficIncident, RerouteOption } from '@shared/schema';

interface UseReroutingOptions {
  routeResult: RouteResult | null;
  origin: [number, number] | null;
  destination: [number, number] | null;
  transportMode: TransportMode;
  routePreference: RoutePreference;
  rerouteSettings: RerouteSettings;
  onRouteUpdate: (newRoute: RouteResult) => void;
}

export function useRerouting({
  routeResult,
  origin,
  destination,
  transportMode,
  routePreference,
  rerouteSettings,
  onRouteUpdate,
}: UseReroutingOptions) {
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null);
  const [rerouteOption, setRerouteOption] = useState<RerouteOption | null>(null);
  const [trafficIncidents, setTrafficIncidents] = useState<TrafficIncident[]>([]);
  
  const navigationCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const trafficCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const autoAcceptTimeout = useRef<NodeJS.Timeout | null>(null);
  const activeRerouteOption = useRef<RerouteOption | null>(null);
  const isNavigatingRef = useRef<boolean>(false);

  useEffect(() => {
    if (rerouteSettings) {
      reroutingService.setSettings(rerouteSettings);
    }
  }, [rerouteSettings]);

  const checkTrafficIncidents = useCallback(async () => {
    if (!routeResult || !rerouteSettings.enabled || !origin || !destination) {
      console.log('[useRerouting] checkTrafficIncidents skipped:', {
        hasRouteResult: !!routeResult,
        reroutingEnabled: rerouteSettings.enabled,
        hasOrigin: !!origin,
        hasDestination: !!destination,
      });
      return;
    }

    console.log('[useRerouting] checkTrafficIncidents running', {
      hasCurrentPosition: !!currentPosition,
      hasRerouteOption: !!rerouteOption,
      routeGeometryLength: routeResult.geometry.length,
    });

    try {
      const incidents = await trafficService.getIncidentsAlongRoute(routeResult.geometry);
      setTrafficIncidents(incidents);

      const affectedIncidents = incidents.filter(inc => inc.affectsRoute);
      console.log('[useRerouting] Traffic check complete:', {
        totalIncidents: incidents.length,
        affectedIncidents: affectedIncidents.length,
        hasCurrentPosition: !!currentPosition,
      });
      
      if (affectedIncidents.length > 0 && currentPosition) {
        console.log('[useRerouting] Evaluating traffic incidents for reroute...');
        const alternative = await reroutingService.evaluateTrafficIncidents(
          currentPosition,
          destination,
          transportMode,
          routePreference,
          incidents
        );

        console.log('[useRerouting] Evaluation result:', {
          hasAlternative: !!alternative,
          hasExistingRerouteOption: !!rerouteOption,
          timeSavings: alternative?.timeSavingsMinutes,
        });

        if (alternative && !rerouteOption) {
          console.log('[useRerouting] Setting new reroute option:', alternative);
          setRerouteOption(alternative);
          activeRerouteOption.current = alternative;

          if (rerouteSettings.autoAccept) {
            if (autoAcceptTimeout.current) {
              clearTimeout(autoAcceptTimeout.current);
            }
            autoAcceptTimeout.current = setTimeout(() => {
              if (isNavigatingRef.current && activeRerouteOption.current === alternative) {
                acceptReroute(alternative);
              }
              autoAcceptTimeout.current = null;
            }, 2000);
          }
        }
      }
    } catch (error) {
      console.error('[useRerouting] Failed to check traffic incidents:', error);
    }
  }, [routeResult, rerouteSettings, origin, destination, currentPosition, transportMode, routePreference, rerouteOption]);

  const checkGPSDeviation = useCallback(() => {
    if (!routeResult || !currentPosition || !rerouteSettings.enabled || !origin || !destination) {
      return;
    }

    const isOffRoute = reroutingService.isOffRoute(currentPosition, routeResult.geometry);
    const hasETAIncreased = reroutingService.hasETAIncreased();

    if ((isOffRoute || hasETAIncreased) && !rerouteOption) {
      const reason = isOffRoute ? 'gps_deviation' : 'eta_increase';
      
      reroutingService
        .calculateAlternativeRoute(
          currentPosition,
          destination,
          transportMode,
          routePreference,
          reason
        )
        .then((alternative) => {
          if (alternative) {
            setRerouteOption(alternative);
            activeRerouteOption.current = alternative;

            if (rerouteSettings.autoAccept) {
              if (autoAcceptTimeout.current) {
                clearTimeout(autoAcceptTimeout.current);
              }
              autoAcceptTimeout.current = setTimeout(() => {
                if (isNavigatingRef.current && activeRerouteOption.current === alternative) {
                  acceptReroute(alternative);
                }
                autoAcceptTimeout.current = null;
              }, 2000);
            }
          }
        })
        .catch((error) => {
          console.error('Failed to calculate alternative route:', error);
        });
    }
  }, [routeResult, currentPosition, rerouteSettings, origin, destination, transportMode, routePreference, rerouteOption]);

  const startNavigation = useCallback(() => {
    console.log('[useRerouting] startNavigation called', {
      hasRouteResult: !!routeResult,
      hasOrigin: !!origin,
      origin,
    });

    if (!routeResult) {
      console.log('[useRerouting] startNavigation aborted - no route result');
      return;
    }

    console.log('[useRerouting] Navigation starting with origin:', origin);
    setIsNavigating(true);
    isNavigatingRef.current = true;
    setCurrentPosition(origin);
    console.log('[useRerouting] Current position set to:', origin);
    reroutingService.setInitialETA(routeResult.duration);
    reroutingService.updateCurrentETA(routeResult.duration);

    trafficCheckInterval.current = setInterval(() => {
      checkTrafficIncidents();
    }, 30000);

    navigationCheckInterval.current = setInterval(() => {
      checkGPSDeviation();
    }, 5000);

    console.log('[useRerouting] Navigation intervals started');
  }, [routeResult, origin, checkTrafficIncidents, checkGPSDeviation]);

  useEffect(() => {
    if (isNavigating && currentPosition && routeResult) {
      console.log('[useRerouting] currentPosition updated during navigation, checking traffic:', currentPosition);
      checkTrafficIncidents();
    }
  }, [isNavigating, currentPosition, routeResult, checkTrafficIncidents]);

  const stopNavigation = useCallback(() => {
    setIsNavigating(false);
    isNavigatingRef.current = false;
    setCurrentPosition(null);
    setRerouteOption(null);
    activeRerouteOption.current = null;
    setTrafficIncidents([]);
    reroutingService.reset();

    if (navigationCheckInterval.current) {
      clearInterval(navigationCheckInterval.current);
      navigationCheckInterval.current = null;
    }

    if (trafficCheckInterval.current) {
      clearInterval(trafficCheckInterval.current);
      trafficCheckInterval.current = null;
    }

    if (autoAcceptTimeout.current) {
      clearTimeout(autoAcceptTimeout.current);
      autoAcceptTimeout.current = null;
    }
  }, []);

  const acceptReroute = useCallback((option: RerouteOption) => {
    if (!destination || !currentPosition) return;

    if (autoAcceptTimeout.current) {
      clearTimeout(autoAcceptTimeout.current);
      autoAcceptTimeout.current = null;
    }

    setRerouteOption(null);
    activeRerouteOption.current = null;

    import('@/services/routing').then(({ calculateRoute }) => {
      calculateRoute(
        currentPosition,
        destination,
        transportMode,
        routePreference
      ).then((newRoute) => {
        if (newRoute) {
          onRouteUpdate(newRoute);
          reroutingService.setInitialETA(newRoute.duration);
          reroutingService.updateCurrentETA(newRoute.duration);
        }
      });
    });
  }, [destination, currentPosition, transportMode, routePreference, onRouteUpdate]);

  const ignoreReroute = useCallback(() => {
    if (autoAcceptTimeout.current) {
      clearTimeout(autoAcceptTimeout.current);
      autoAcceptTimeout.current = null;
    }

    setRerouteOption(null);
    activeRerouteOption.current = null;
  }, []);

  const updatePosition = useCallback((position: [number, number]) => {
    setCurrentPosition(position);
  }, []);

  useEffect(() => {
    return () => {
      if (navigationCheckInterval.current) {
        clearInterval(navigationCheckInterval.current);
      }
      if (trafficCheckInterval.current) {
        clearInterval(trafficCheckInterval.current);
      }
      if (autoAcceptTimeout.current) {
        clearTimeout(autoAcceptTimeout.current);
      }
    };
  }, []);

  return {
    isNavigating,
    currentPosition,
    rerouteOption,
    trafficIncidents,
    startNavigation,
    stopNavigation,
    acceptReroute,
    ignoreReroute,
    updatePosition,
  };
}
