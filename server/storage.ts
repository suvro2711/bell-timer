import { db } from "./db";
import {
  timerSessions,
  type InsertTimerSession,
  type TimerSession
} from "@shared/schema";
import { desc } from "drizzle-orm";

export interface IStorage {
  createSession(session: InsertTimerSession): Promise<TimerSession>;
  getSessions(): Promise<TimerSession[]>;
}

export class DatabaseStorage implements IStorage {
  async createSession(session: InsertTimerSession): Promise<TimerSession> {
    const [newSession] = await db
      .insert(timerSessions)
      .values(session)
      .returning();
    return newSession;
  }

  async getSessions(): Promise<TimerSession[]> {
    return await db
      .select()
      .from(timerSessions)
      .orderBy(desc(timerSessions.createdAt));
  }
}

export const storage = new DatabaseStorage();
