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

export const communityReportSchema = z.object({
  id: z.string(),
  type: z.enum(['fixed_camera', 'mobile_camera', 'accident', 'roadwork', 'hazard']),
  location: z.tuple([z.number(), z.number()]),
  description: z.string().optional(),
  reporterId: z.string(),
  reportedAt: z.number(),
  confirmations: z.number().default(0),
  rejections: z.number().default(0),
  trustScore: z.number().default(0),
  status: z.enum(['pending', 'approved', 'rejected', 'expired']).default('pending'),
  expiresAt: z.number(),
  voters: z.array(z.string()).default([]),
});

export const insertCommunityReportSchema = communityReportSchema.omit({
  id: true,
  confirmations: true,
  rejections: true,
  trustScore: true,
  status: true,
  voters: true,
}).extend({
  reporterId: z.string().default('anonymous'),
});

export const voteSchema = z.object({
  reportId: z.string(),
  voterId: z.string(),
  voteType: z.enum(['confirm', 'reject']),
});

export type CommunityReport = z.infer<typeof communityReportSchema>;
export type InsertCommunityReport = z.infer<typeof insertCommunityReportSchema>;
export type Vote = z.infer<typeof voteSchema>;
