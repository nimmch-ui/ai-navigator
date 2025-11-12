/**
 * Shared Interface Definitions
 * These interfaces define contracts between UI modes and routing/navigation systems
 */

/**
 * Route View Interface
 * Provides a common API for both MapView (2D/3D) and ARView to interact with routes
 * This abstraction ensures all UI modes share the same route interaction capabilities
 */
export interface IRouteView {
  /**
   * Focus camera/view on a specific route segment
   * @param id - The unique identifier of the segment
   */
  focusSegment(id: string): void;

  /**
   * Highlight a specific turn/maneuver in the current view
   * @param id - The unique identifier of the turn/maneuver
   */
  highlightTurn(id: string): void;

  /**
   * Project a lat/lng coordinate to screen space for AR overlays
   * @param ll - [latitude, longitude] coordinate
   * @returns Screen coordinates [x, y] or null if not visible
   */
  project(ll: [number, number]): [number, number] | null;
}

/**
 * Shared Navigation State
 * Common state that persists across all UI modes
 */
export interface ISharedNavigationState {
  // Radar & hazard data
  speedCameras: any[];
  hazards: any[];
  
  // Speed & limits
  currentSpeed: number | null;
  speedLimit: number | null;
  
  // Weather data
  weatherConditions: any[];
  radarEnabled: boolean;
  
  // Voice guidance state
  voiceEnabled: boolean;
  voiceVolume: number;
  
  // Eco mode data
  ecoEstimate: any | null;
  
  // Route data
  route: [number, number][] | undefined;
  currentPosition: [number, number] | undefined;
}
