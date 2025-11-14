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

// ⚠️ Enable demo navigation UI in test mode for internal testing
// Set VITE_TEST_MODE=true in Replit secrets to enable in production
export const DEV_NAV_DEMO_MODE = (import.meta.env.DEV || import.meta.env.VITE_TEST_MODE === 'true') && true;

/**
 * Mock route from Zurich HB to Zurich Airport
 * A realistic 12km route with multiple maneuvers for testing
 */
export const MOCK_ROUTE: RouteResult = {
  distance: 12400, // 12.4 km
  duration: 840, // 14 minutes
  profile: 'driving-traffic',
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
      },
    },
    {
      distance: 500,
      duration: 40,
      instruction: 'You have arrived at your destination',
      maneuver: {
        type: 'arrive',
        location: [8.5490, 47.4150],
      },
    },
  ],
};

/**
 * Mock trip estimate matching the route above
 */
export const MOCK_TRIP_ESTIMATE: TripEstimate = {
  distance: MOCK_ROUTE.distance / 1000, // Convert to km
  duration: MOCK_ROUTE.duration / 60, // Convert to minutes
  fuelConsumption: 1.2,
  disclaimer: 'Demo data for testing purposes',
  ecoTips: [
    'Maintain steady speed for better fuel efficiency',
    'Avoid rapid acceleration and braking',
  ],
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
