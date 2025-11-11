export type VehicleType = "car" | "ev" | "bike" | "walk";

export interface TripEstimate {
  distance: number; // in kilometers
  duration: number; // in minutes
  fuelConsumption?: number; // liters (estimated)
  energyConsumption?: number; // kWh (estimated)
  caloriesBurned?: number; // kcal (estimated)
  co2Emissions?: number; // kg (estimated, may not account for electricity source)
  ecoTips: string[];
  disclaimer: string; // Explains estimation uncertainty
}

interface TripInput {
  distanceKm: number;
  durationMin: number;
  vehicleType: VehicleType;
  ecoMode: boolean;
}

// Configurable consumption coefficients
export interface ConsumptionConfig {
  fuelConsumptionPer100Km: number; // L/100km for regular car
  evConsumptionPer100Km: number; // kWh/100km for EV
  bikeCaloriesPerKm: number; // kcal/km
  walkCaloriesPerKm: number; // kcal/km
  co2PerLiterFuel: number; // kg CO2/L gasoline
  ecoModeFuelSavings: number; // percentage (0-1)
  ecoModeEnergySavings: number; // percentage (0-1)
}

const DEFAULT_CONFIG: ConsumptionConfig = {
  fuelConsumptionPer100Km: 7,
  evConsumptionPer100Km: 18,
  bikeCaloriesPerKm: 40,
  walkCaloriesPerKm: 60,
  co2PerLiterFuel: 2.31,
  ecoModeFuelSavings: 0.10, // 10%
  ecoModeEnergySavings: 0.15, // 15%
};

const ECO_TIPS_CAR = [
  "Avoid hard acceleration to save fuel",
  "Maintaining a steady speed near the limit is more efficient",
  "Use cruise control on highways when safe",
  "Keep tires properly inflated for better fuel economy"
];

const ECO_TIPS_EV = [
  "Use regenerative braking to recover energy",
  "Pre-condition your cabin while plugged in",
  "Eco mode reduces acceleration for better range",
  "Smooth driving maximizes battery efficiency"
];

const ECO_TIPS_BIKE = [
  "Maintain a steady pace to conserve energy",
  "Stay hydrated throughout your ride",
  "Use gears efficiently on hills"
];

const ECO_TIPS_WALK = [
  "Stay hydrated on longer walks",
  "Take breaks if needed",
  "Walking is the most eco-friendly option!"
];

function getRandomTips(tips: string[], count: number = 2): string[] {
  const shuffled = [...tips].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function getDisclaimer(vehicleType: VehicleType): string {
  const disclaimers: Record<VehicleType, string> = {
    car: "Estimates based on average consumption. Actual fuel use varies with driving style, traffic, and vehicle condition.",
    ev: "Energy estimates assume typical EV efficiency. Actual consumption varies with temperature, driving style, and battery condition. CO₂ impact depends on your electricity source.",
    bike: "Calorie estimates are approximate and vary based on weight, speed, terrain, and fitness level.",
    walk: "Calorie estimates are approximate and vary based on weight, pace, and terrain."
  };
  return disclaimers[vehicleType];
}

export function calculateTripEstimate(input: TripInput, config: ConsumptionConfig = DEFAULT_CONFIG): TripEstimate {
  const { distanceKm, durationMin, vehicleType, ecoMode } = input;

  const estimate: TripEstimate = {
    distance: distanceKm,
    duration: durationMin,
    ecoTips: [],
    disclaimer: getDisclaimer(vehicleType)
  };

  switch (vehicleType) {
    case "car": {
      const baseFuel = (distanceKm / 100) * config.fuelConsumptionPer100Km;
      estimate.fuelConsumption = ecoMode ? baseFuel * (1 - config.ecoModeFuelSavings) : baseFuel;
      estimate.co2Emissions = estimate.fuelConsumption * config.co2PerLiterFuel;
      estimate.ecoTips = getRandomTips(ECO_TIPS_CAR, 2);
      break;
    }

    case "ev": {
      const baseEnergy = (distanceKm / 100) * config.evConsumptionPer100Km;
      estimate.energyConsumption = ecoMode ? baseEnergy * (1 - config.ecoModeEnergySavings) : baseEnergy;
      // Note: CO₂ depends on electricity source - disclaimer explains this
      estimate.co2Emissions = 0;
      estimate.ecoTips = getRandomTips(ECO_TIPS_EV, 2);
      break;
    }

    case "bike": {
      estimate.caloriesBurned = Math.round(distanceKm * config.bikeCaloriesPerKm);
      estimate.co2Emissions = 0;
      estimate.ecoTips = getRandomTips(ECO_TIPS_BIKE, 2);
      break;
    }

    case "walk": {
      estimate.caloriesBurned = Math.round(distanceKm * config.walkCaloriesPerKm);
      estimate.co2Emissions = 0;
      estimate.ecoTips = getRandomTips(ECO_TIPS_WALK, 2);
      break;
    }
  }

  return estimate;
}

export function formatTripEstimate(estimate: TripEstimate, vehicleType: VehicleType): string {
  const lines: string[] = [];

  lines.push(`Distance: ${estimate.distance.toFixed(1)} km`);
  lines.push(`Duration: ${Math.round(estimate.duration)} min`);

  if (estimate.fuelConsumption !== undefined) {
    lines.push(`Fuel: ${estimate.fuelConsumption.toFixed(1)} L`);
  }

  if (estimate.energyConsumption !== undefined) {
    lines.push(`Energy: ${estimate.energyConsumption.toFixed(1)} kWh`);
  }

  if (estimate.caloriesBurned !== undefined) {
    lines.push(`Calories: ${estimate.caloriesBurned} kcal`);
  }

  if (estimate.co2Emissions !== undefined && estimate.co2Emissions > 0) {
    lines.push(`CO₂: ${estimate.co2Emissions.toFixed(1)} kg`);
  }

  return lines.join('\n');
}
