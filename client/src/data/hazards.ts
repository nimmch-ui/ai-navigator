import type { LucideIcon } from 'lucide-react';
import { Camera, School, AlertTriangle, Construction } from 'lucide-react';

export type HazardType = "speed_camera" | "school_zone" | "dangerous_curve" | "accident_zone";

export type HazardSeverity = "low" | "medium" | "high";

export interface HazardMetadata {
  icon: LucideIcon;
  colorClass: string; // Tailwind color class
  bgColorClass: string; // Tailwind bg color class
  borderColorClass: string; // Tailwind border color class
}

export interface Hazard {
  id: string;
  type: HazardType;
  coordinates: [number, number]; // [lat, lng]
  speedLimit?: number; // km/h
  description: string;
  severity: HazardSeverity;
  alertRadius: number; // meters - distance at which to alert driver
}

// Mock hazards around San Francisco area
export const mockHazards: Hazard[] = [
  {
    id: "cam_001",
    type: "speed_camera",
    coordinates: [37.7849, -122.4094],
    speedLimit: 50,
    description: "Speed camera on Market St",
    severity: "high",
    alertRadius: 300
  },
  {
    id: "cam_002",
    type: "speed_camera",
    coordinates: [37.7949, -122.3994],
    speedLimit: 60,
    description: "Speed camera on Bay Bridge approach",
    severity: "high",
    alertRadius: 300
  },
  {
    id: "school_001",
    type: "school_zone",
    coordinates: [37.7649, -122.4294],
    speedLimit: 25,
    description: "School zone - Mission High School",
    severity: "high",
    alertRadius: 250
  },
  {
    id: "school_002",
    type: "school_zone",
    coordinates: [37.7549, -122.4194],
    speedLimit: 25,
    description: "School zone - SFUSD elementary",
    severity: "high",
    alertRadius: 250
  },
  {
    id: "curve_001",
    type: "dangerous_curve",
    coordinates: [37.8049, -122.4194],
    speedLimit: 40,
    description: "Sharp curve on Lombard St",
    severity: "medium",
    alertRadius: 200
  },
  {
    id: "curve_002",
    type: "dangerous_curve",
    coordinates: [37.7449, -122.4394],
    speedLimit: 35,
    description: "Winding road in Twin Peaks",
    severity: "medium",
    alertRadius: 200
  },
  {
    id: "accident_001",
    type: "accident_zone",
    coordinates: [37.7749, -122.3894],
    speedLimit: 50,
    description: "High accident zone - Bay Bridge exit",
    severity: "medium",
    alertRadius: 250
  },
  {
    id: "accident_002",
    type: "accident_zone",
    coordinates: [37.7849, -122.4394],
    speedLimit: 45,
    description: "Accident-prone intersection",
    severity: "medium",
    alertRadius: 250
  }
];

export const getHazardMetadata = (type: HazardType): HazardMetadata => {
  const metadata: Record<HazardType, HazardMetadata> = {
    speed_camera: {
      icon: Camera,
      colorClass: "text-destructive",
      bgColorClass: "bg-destructive",
      borderColorClass: "border-destructive"
    },
    school_zone: {
      icon: School,
      colorClass: "text-amber-600 dark:text-amber-500",
      bgColorClass: "bg-amber-600 dark:bg-amber-500",
      borderColorClass: "border-amber-600 dark:border-amber-500"
    },
    dangerous_curve: {
      icon: AlertTriangle,
      colorClass: "text-yellow-600 dark:text-yellow-500",
      bgColorClass: "bg-yellow-600 dark:bg-yellow-500",
      borderColorClass: "border-yellow-600 dark:border-yellow-500"
    },
    accident_zone: {
      icon: Construction,
      colorClass: "text-orange-600 dark:text-orange-500",
      bgColorClass: "bg-orange-600 dark:bg-orange-500",
      borderColorClass: "border-orange-600 dark:border-orange-500"
    }
  };
  return metadata[type];
};

export const getHazardWarningMessage = (hazard: Hazard, distance: number): string => {
  const distanceText = distance < 1000 
    ? `${Math.round(distance)} meters`
    : `${(distance / 1000).toFixed(1)} kilometers`;

  const messages: Record<HazardType, string> = {
    speed_camera: `Speed camera ahead in ${distanceText}. Speed limit ${hazard.speedLimit} km/h.`,
    school_zone: `School zone ahead in ${distanceText}. Slow down to ${hazard.speedLimit} km/h.`,
    dangerous_curve: `Dangerous curve ahead in ${distanceText}. Reduce speed to ${hazard.speedLimit} km/h.`,
    accident_zone: `High accident zone ahead in ${distanceText}. Drive carefully.`
  };

  return messages[hazard.type];
};
