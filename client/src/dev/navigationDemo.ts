/**
 * DEV-ONLY Navigation Demo Module
 * 
 * Provides mock navigation data to make all navigation UI components
 * visible immediately for testing purposes. This file is excluded from
 * production builds.
 * 
 * ⚠️ WARNING: Never enable in production
 */

import type { RouteResult } from '@/services/routing';
import type { TripEstimate } from '@/services/tripEstimates';

// ⚠️ Enable demo navigation UI ONLY in development builds
// Set to false to disable even in dev, or true to enable (automatically false in production)
export const DEV_NAV_DEMO_MODE = import.meta.env.DEV && true;

/**
 * Mock route from Zurich HB to Zurich Airport
 * A realistic 12km route with multiple maneuvers for testing
 */
export const MOCK_ROUTE: RouteResult = {
  distance: 12400, // 12.4 km
  duration: 840, // 14 minutes
  geometry: [
    [8.5417, 47.3769], // Zurich HB (start)
    [8.5420, 47.3780],
    [8.5430, 47.3800],
    [8.5450, 47.3850],
    [8.5500, 47.3900],
    [8.5550, 47.3950],
    [8.5600, 47.4000],
    [8.5650, 47.4050],
    [8.5550, 47.4100],
    [8.5490, 47.4150], // Zurich Airport (end)
  ],
  steps: [
    {
      distance: 500,
      duration: 60,
      instruction: 'Head north on Bahnhofstrasse',
      maneuver: {
        type: 'depart',
        location: [8.5417, 47.3769],
        bearing_before: 0,
        bearing_after: 10,
      },
    },
    {
      distance: 800,
      duration: 90,
      instruction: 'Turn right onto Limmatquai',
      maneuver: {
        type: 'turn',
        modifier: 'right',
        location: [8.5430, 47.3800],
        bearing_before: 10,
        bearing_after: 85,
      },
    },
    {
      distance: 2100,
      duration: 180,
      instruction: 'Continue straight onto Schaffhauserstrasse',
      maneuver: {
        type: 'continue',
        modifier: 'straight',
        location: [8.5500, 47.3900],
        bearing_before: 85,
        bearing_after: 85,
      },
    },
    {
      distance: 1500,
      duration: 150,
      instruction: 'Take the ramp onto A1',
      maneuver: {
        type: 'on ramp',
        modifier: 'slight right',
        location: [8.5600, 47.4000],
        bearing_before: 85,
        bearing_after: 95,
      },
    },
    {
      distance: 6000,
      duration: 240,
      instruction: 'Continue on A1 toward Flughafen',
      maneuver: {
        type: 'continue',
        modifier: 'straight',
        location: [8.5650, 47.4050],
        bearing_before: 95,
        bearing_after: 95,
      },
    },
    {
      distance: 1000,
      duration: 80,
      instruction: 'Take exit 53 toward Zürich-Flughafen',
      maneuver: {
        type: 'off ramp',
        modifier: 'right',
        location: [8.5550, 47.4100],
        bearing_before: 95,
        bearing_after: 45,
      },
    },
    {
      distance: 500,
      duration: 40,
      instruction: 'You have arrived at your destination',
      maneuver: {
        type: 'arrive',
        location: [8.5490, 47.4150],
        bearing_before: 45,
        bearing_after: 0,
      },
    },
  ],
};

/**
 * Mock trip estimate matching the route above
 */
export const MOCK_TRIP_ESTIMATE: TripEstimate = {
  distance: MOCK_ROUTE.distance,
  duration: MOCK_ROUTE.duration,
  arrivalTime: Date.now() + MOCK_ROUTE.duration * 1000,
  fuelCost: 3.5,
  tollCost: 0,
  co2Emissions: 2.8,
};

/**
 * Demo route coordinates
 */
export const DEMO_ORIGIN_COORDS: [number, number] = [8.5417, 47.3769]; // Zurich HB
export const DEMO_DESTINATION_COORDS: [number, number] = [8.5490, 47.4150]; // Zurich Airport

/**
 * Demo route labels
 */
export const DEMO_ORIGIN = 'Zurich HB (Demo)';
export const DEMO_DESTINATION = 'Zurich Airport (Demo)';

/**
 * Mock speed limit for HUD testing
 */
export const MOCK_SPEED_LIMIT = 50; // 50 km/h

console.log('[NavigationDemo] 🎬 Demo module loaded - Mock route ready');
