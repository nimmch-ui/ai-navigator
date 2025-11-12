import type { Lane, LaneSegment } from '@shared/schema';

/**
 * Mock lane configurations for typical intersections
 * In production, this would come from Mapbox Traffic API, HERE, or TomTom
 */
const MOCK_LANE_CONFIGS: Record<string, Lane[]> = {
  // Zurich - Bahnhofstrasse / Paradeplatz (left turn)
  'zurich_paradeplatz_left': [
    { id: 'lane-1', direction: 'left', recommended: true },
    { id: 'lane-2', direction: 'through' },
    { id: 'lane-3', direction: 'through' },
  ],
  
  // Zurich - Limmatquai (straight through)
  'zurich_limmatquai_straight': [
    { id: 'lane-1', direction: 'left' },
    { id: 'lane-2', direction: 'through', recommended: true },
    { id: 'lane-3', direction: 'through', recommended: true },
    { id: 'lane-4', direction: 'right' },
  ],
  
  // Zurich - Bellevue (complex 5-lane)
  'zurich_bellevue_right': [
    { id: 'lane-1', direction: 'left' },
    { id: 'lane-2', direction: 'through' },
    { id: 'lane-3', direction: 'through' },
    { id: 'lane-4', direction: 'right', recommended: true },
    { id: 'lane-5', direction: 'right', recommended: true },
  ],
  
  // San Francisco - Market & 5th (left turn)
  'sf_market_5th_left': [
    { id: 'lane-1', direction: 'left', recommended: true },
    { id: 'lane-2', direction: 'left', recommended: true },
    { id: 'lane-3', direction: 'through' },
    { id: 'lane-4', direction: 'through' },
  ],
  
  // San Francisco - Van Ness & Lombard (straight)
  'sf_vanness_lombard_straight': [
    { id: 'lane-1', direction: 'left' },
    { id: 'lane-2', direction: 'through', recommended: true },
    { id: 'lane-3', direction: 'through', recommended: true },
    { id: 'lane-4', direction: 'right' },
  ],
  
  // San Francisco - Embarcadero (u-turn allowed)
  'sf_embarcadero_uturn': [
    { id: 'lane-1', direction: 'u-turn', recommended: true },
    { id: 'lane-2', direction: 'left' },
    { id: 'lane-3', direction: 'through' },
    { id: 'lane-4', direction: 'right' },
  ],
  
  // San Francisco - 19th Ave & Lincoln (right turn)
  'sf_19th_lincoln_right': [
    { id: 'lane-1', direction: 'left' },
    { id: 'lane-2', direction: 'through' },
    { id: 'lane-3', direction: 'right', recommended: true },
  ],
  
  // Zurich - Sihlporte (complex intersection)
  'zurich_sihlporte_through': [
    { id: 'lane-1', direction: 'left' },
    { id: 'lane-2', direction: 'through', recommended: true },
    { id: 'lane-3', direction: 'through', recommended: true },
    { id: 'lane-4', direction: 'right' },
  ],
};

/**
 * Get mock lane data for a route step based on maneuver type and location
 */
export function getMockLaneData(
  stepIndex: number,
  maneuver: string,
  instruction: string,
  stepId: string
): LaneSegment | null {
  // Extract maneuver direction from instruction
  const lowerInstruction = instruction.toLowerCase();
  const lowerManeuver = maneuver.toLowerCase();
  
  let laneConfig: Lane[] | undefined;
  
  // Match based on maneuver type and location hints
  if (lowerManeuver.includes('turn left') || lowerInstruction.includes('turn left')) {
    // Try to match specific locations, otherwise use generic
    if (lowerInstruction.includes('paradeplatz') || lowerInstruction.includes('bahnhof')) {
      laneConfig = MOCK_LANE_CONFIGS['zurich_paradeplatz_left'];
    } else if (lowerInstruction.includes('market') || lowerInstruction.includes('5th')) {
      laneConfig = MOCK_LANE_CONFIGS['sf_market_5th_left'];
    } else {
      // Generic left turn
      laneConfig = [
        { id: 'lane-1', direction: 'left', recommended: true },
        { id: 'lane-2', direction: 'through' },
        { id: 'lane-3', direction: 'through' },
      ];
    }
  } else if (lowerManeuver.includes('turn right') || lowerInstruction.includes('turn right')) {
    if (lowerInstruction.includes('bellevue')) {
      laneConfig = MOCK_LANE_CONFIGS['zurich_bellevue_right'];
    } else if (lowerInstruction.includes('19th') || lowerInstruction.includes('lincoln')) {
      laneConfig = MOCK_LANE_CONFIGS['sf_19th_lincoln_right'];
    } else {
      // Generic right turn
      laneConfig = [
        { id: 'lane-1', direction: 'left' },
        { id: 'lane-2', direction: 'through' },
        { id: 'lane-3', direction: 'right', recommended: true },
      ];
    }
  } else if (lowerManeuver.includes('straight') || lowerManeuver.includes('continue') || 
             lowerInstruction.includes('straight') || lowerInstruction.includes('continue')) {
    if (lowerInstruction.includes('limmatquai')) {
      laneConfig = MOCK_LANE_CONFIGS['zurich_limmatquai_straight'];
    } else if (lowerInstruction.includes('van ness') || lowerInstruction.includes('lombard')) {
      laneConfig = MOCK_LANE_CONFIGS['sf_vanness_lombard_straight'];
    } else {
      // Generic straight
      laneConfig = [
        { id: 'lane-1', direction: 'left' },
        { id: 'lane-2', direction: 'through', recommended: true },
        { id: 'lane-3', direction: 'through', recommended: true },
        { id: 'lane-4', direction: 'right' },
      ];
    }
  } else if (lowerManeuver.includes('uturn') || lowerInstruction.includes('u-turn')) {
    laneConfig = MOCK_LANE_CONFIGS['sf_embarcadero_uturn'];
  }
  
  // Return null if no lane data applicable (e.g., simple maneuvers like "arrive")
  if (!laneConfig) {
    return null;
  }
  
  return {
    segmentId: stepId,
    stepIndex,
    lanes: laneConfig,
    distanceToManeuver: 0, // Will be calculated based on current position
  };
}

/**
 * Get lane data for all applicable steps in a route
 */
export function getLaneDataForRoute(steps: Array<{
  instruction: string;
  maneuver?: string;
  distance: string;
}>): Map<number, LaneSegment> {
  const laneData = new Map<number, LaneSegment>();
  
  steps.forEach((step, index) => {
    const maneuver = step.maneuver || '';
    const segmentId = `step-${index}`;
    
    const laneSegment = getMockLaneData(index, maneuver, step.instruction, segmentId);
    
    if (laneSegment) {
      laneData.set(index, laneSegment);
    }
  });
  
  return laneData;
}
