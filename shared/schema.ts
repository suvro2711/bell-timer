import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const timerSessions = pgTable("timer_sessions", {
  id: serial("id").primaryKey(),
  frequency: integer("frequency").notNull(),
  intervalSeconds: integer("interval_seconds").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTimerSessionSchema = createInsertSchema(timerSessions).omit({ id: true, createdAt: true });

export type TimerSession = typeof timerSessions.$inferSelect;
export type InsertTimerSession = z.infer<typeof insertTimerSessionSchema>;
