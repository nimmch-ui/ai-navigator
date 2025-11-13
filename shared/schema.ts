import { sql } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const cloudUsers = pgTable("cloud_users", {
  id: varchar("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
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
  maneuverCoordinateIndex: z.number().optional(),
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

// Cloud Sync Schemas - Aligned with UserDataEnvelope structure
export const cloudUserProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  displayName: z.string(),
  avatarEmoji: z.string().optional(),
  avatarColor: z.string().optional(),
  preferredLanguage: z.string(),
  units: z.enum(['metric', 'imperial']),
  createdAt: z.number(),
  updatedAt: z.number(),
  version: z.number(),
  schemaVersion: z.number(),
});

export const cloudFavoritePlaceSchema = z.object({
  id: z.string(),
  userId: z.string(),
  label: z.string(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  address: z.string().optional(),
  type: z.enum(['home', 'work', 'custom']),
  createdAt: z.number(),
  lastUsedAt: z.number(),
  updatedAt: z.number(),
  version: z.number(),
  schemaVersion: z.number(),
  deletedAt: z.number().optional(),
});

export const cloudTripRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  start: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional(),
  }),
  end: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional(),
  }),
  distanceKm: z.number(),
  durationSec: z.number(),
  ecoScore: z.number().optional(),
  avgSpeedKmh: z.number(),
  timestamp: z.number(),
  modeUsed: z.enum(['car', 'bike', 'walk', 'transit']),
  routePreference: z.enum(['fastest', 'shortest', 'eco']).optional(),
  updatedAt: z.number(),
  version: z.number(),
  schemaVersion: z.number(),
  deletedAt: z.number().optional(),
});

export const cloudDataMetadataSchema = z.object({
  lastSyncedAt: z.number().optional(),
  version: z.number(),
  updatedAt: z.number(),
});

export const cloudUserDataEnvelopeSchema = z.object({
  userId: z.string(),
  profile: cloudUserProfileSchema,
  favorites: z.array(cloudFavoritePlaceSchema),
  trips: z.array(cloudTripRecordSchema),
  metadata: cloudDataMetadataSchema,
});

// Discriminated union for sync queue payloads
export const syncProfilePayloadSchema = z.object({
  type: z.literal('profile'),
  action: z.enum(['update']),
  data: cloudUserProfileSchema,
});

export const syncFavoritePayloadSchema = z.object({
  type: z.literal('favorite'),
  action: z.enum(['create', 'update', 'delete']),
  data: cloudFavoritePlaceSchema,
});

export const syncTripPayloadSchema = z.object({
  type: z.literal('trip'),
  action: z.enum(['create', 'update', 'delete']),
  data: cloudTripRecordSchema,
});

export const syncPayloadSchema = z.discriminatedUnion('type', [
  syncProfilePayloadSchema,
  syncFavoritePayloadSchema,
  syncTripPayloadSchema,
]);

export const syncQueueItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  payload: syncPayloadSchema,
  timestamp: z.number(),
  status: z.enum(['pending', 'syncing', 'completed', 'failed']),
  attempts: z.number(),
  lastError: z.string().optional(),
});

export const syncPushRequestSchema = z.object({
  userId: z.string(),
  items: z.array(syncQueueItemSchema),
  lastSyncTimestamp: z.number().optional(),
});

export const syncPullResponseSchema = z.object({
  envelope: cloudUserDataEnvelopeSchema,
  serverTimestamp: z.number(),
});

export const authLoginRequestSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

export const authLoginResponseSchema = z.object({
  userId: z.string(),
  username: z.string(),
  sessionToken: z.string(),
  expiresAt: z.number(),
});

export const authRestoreRequestSchema = z.object({
  userId: z.string(),
  sessionToken: z.string(),
});

export type CloudUserProfile = z.infer<typeof cloudUserProfileSchema>;
export type CloudFavoritePlace = z.infer<typeof cloudFavoritePlaceSchema>;
export type CloudTripRecord = z.infer<typeof cloudTripRecordSchema>;
export type CloudDataMetadata = z.infer<typeof cloudDataMetadataSchema>;
export type CloudUserDataEnvelope = z.infer<typeof cloudUserDataEnvelopeSchema>;
export type SyncPayload = z.infer<typeof syncPayloadSchema>;
export type SyncQueueItem = z.infer<typeof syncQueueItemSchema>;
export type SyncPushRequest = z.infer<typeof syncPushRequestSchema>;
export type SyncPullResponse = z.infer<typeof syncPullResponseSchema>;
export type AuthLoginRequest = z.infer<typeof authLoginRequestSchema>;
export type AuthLoginResponse = z.infer<typeof authLoginResponseSchema>;
export type AuthRestoreRequest = z.infer<typeof authRestoreRequestSchema>;
