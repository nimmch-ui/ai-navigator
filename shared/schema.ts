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
