import { sql } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const laneSchema = z.object({
  id: z.string(),
  direction: z.enum(['left', 'through', 'right', 'u-turn']),
  recommended: z.boolean().optional(),
});

export const laneSegmentSchema = z.object({
  segmentId: z.string(),
  stepIndex: z.number(),
  lanes: z.array(laneSchema),
  distanceToManeuver: z.number(),
});

export type Lane = z.infer<typeof laneSchema>;
export type LaneSegment = z.infer<typeof laneSegmentSchema>;

export const trafficIncidentSchema = z.object({
  id: z.string(),
  type: z.enum(['accident', 'construction', 'congestion', 'road_closure', 'other']),
  severity: z.enum(['low', 'moderate', 'severe']),
  location: z.tuple([z.number(), z.number()]),
  description: z.string(),
  delayMinutes: z.number(),
  affectsRoute: z.boolean().optional(),
});

export const rerouteOptionSchema = z.object({
  timeSavingsMinutes: z.number(),
  newRoute: z.object({
    distance: z.number(),
    duration: z.number(),
    coordinates: z.array(z.tuple([z.number(), z.number()])),
  }),
  reason: z.enum(['traffic_incident', 'gps_deviation', 'eta_increase', 'manual']),
  incidentId: z.string().optional(),
});

export const rerouteSettingsSchema = z.object({
  enabled: z.boolean(),
  etaIncreaseThresholdPercent: z.number(),
  offRouteDistanceMeters: z.number(),
  autoAccept: z.boolean(),
  minTimeSavingsMinutes: z.number(),
});

export type TrafficIncident = z.infer<typeof trafficIncidentSchema>;
export type RerouteOption = z.infer<typeof rerouteOptionSchema>;
export type RerouteSettings = z.infer<typeof rerouteSettingsSchema>;
