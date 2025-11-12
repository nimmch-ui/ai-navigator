export type Region = "EU" | "US" | "ASIA" | "MENA" | "AFRICA" | "LATAM";

export interface RegionalEndpoint {
  region: Region;
  url: string;
  priority: number;
}

export const GlobalConfig = {
  supportedRegions: ["EU", "US", "ASIA", "MENA", "AFRICA", "LATAM"] as const,
  defaultRegion: "EU" as Region,
  defaultLanguage: "en",
  fallbackServer: "https://ai-navigator-nimmch.replit.app",
  
  regionalEndpoints: [
    { region: "EU", url: "https://ai-navigator-nimmch.replit.app", priority: 1 },
    { region: "US", url: "https://ai-navigator-nimmch.replit.app", priority: 1 },
    { region: "ASIA", url: "https://ai-navigator-nimmch.replit.app", priority: 1 },
    { region: "MENA", url: "https://ai-navigator-nimmch.replit.app", priority: 2 },
    { region: "AFRICA", url: "https://ai-navigator-nimmch.replit.app", priority: 2 },
    { region: "LATAM", url: "https://ai-navigator-nimmch.replit.app", priority: 2 },
  ] as RegionalEndpoint[],

  continentToRegion: {
    EU: "EU",
    NA: "US",
    SA: "LATAM",
    AS: "ASIA",
    AF: "AFRICA",
    OC: "ASIA",
  } as Record<string, Region>,

  highLatencyRegions: ["ASIA", "LATAM", "AFRICA"] as Region[],
  
  cacheDuration: {
    lowLatency: 5 * 60 * 1000,
    highLatency: 15 * 60 * 1000,
  },

  requestTimeout: {
    default: 30000,
    fallback: 10000,
  },
} as const;
