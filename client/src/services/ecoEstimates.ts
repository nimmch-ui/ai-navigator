import type { TransportMode } from './preferences';

const FUEL_CONSUMPTION_PER_KM = {
  car: 0.07,
  bike: 0,
  walk: 0,
  transit: 0.03
};

const ENERGY_CONSUMPTION_PER_KM = {
  car: 0.2,
  bike: 0,
  walk: 0,
  transit: 0.15
};

const CO2_PER_KM = {
  car: 0.12,
  bike: 0,
  walk: 0,
  transit: 0.05
};

export interface EcoEstimate {
  distanceKm: number;
  durationMinutes: number;
  fuelLiters?: number;
  energyKwh?: number;
  co2Kg: number;
  transportMode: TransportMode;
}

export function calculateEcoEstimate(
  distanceMeters: number,
  durationSeconds: number,
  transportMode: TransportMode,
  isElectric: boolean = false
): EcoEstimate {
  const distanceKm = distanceMeters / 1000;
  const durationMinutes = Math.round(durationSeconds / 60);

  const estimate: EcoEstimate = {
    distanceKm,
    durationMinutes,
    co2Kg: distanceKm * CO2_PER_KM[transportMode],
    transportMode
  };

  if (transportMode === 'car') {
    if (isElectric) {
      estimate.energyKwh = distanceKm * ENERGY_CONSUMPTION_PER_KM.car;
      estimate.co2Kg = 0;
    } else {
      estimate.fuelLiters = distanceKm * FUEL_CONSUMPTION_PER_KM.car;
    }
  } else if (transportMode === 'transit') {
    estimate.energyKwh = distanceKm * ENERGY_CONSUMPTION_PER_KM.transit;
  }

  return estimate;
}

export function formatEcoEstimate(estimate: EcoEstimate): string {
  const parts: string[] = [];

  if (estimate.fuelLiters) {
    parts.push(`${estimate.fuelLiters.toFixed(1)} L fuel`);
  }

  if (estimate.energyKwh) {
    parts.push(`${estimate.energyKwh.toFixed(1)} kWh`);
  }

  if (estimate.co2Kg > 0) {
    parts.push(`${estimate.co2Kg.toFixed(1)} kg CO₂`);
  }

  return parts.join(' • ');
}
