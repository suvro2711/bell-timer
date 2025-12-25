import { googleSheetsService } from "./google-sheets";

export interface IStorage {
  createSession(session: { frequency: number; intervalSeconds: number }): Promise<{
    id: number;
    frequency: number;
    intervalSeconds: number;
    createdAt: Date;
  }>;
  getSessions(): Promise<Array<{
    id: number;
    frequency: number;
    intervalSeconds: number;
    createdAt: Date;
  }>>;
}

// In-memory storage for session history (last 50 sessions)
// This is temporary storage for the UI, real data is in Google Sheets
const sessionHistory: Array<{
  id: number;
  frequency: number;
  intervalSeconds: number;
  createdAt: Date;
}> = [];

let nextId = 1;

export class SheetsStorage implements IStorage {
  async createSession(session: { frequency: number; intervalSeconds: number }) {
    const newSession = {
      id: nextId++,
      frequency: session.frequency,
      intervalSeconds: session.intervalSeconds,
      createdAt: new Date(),
    };
    
    // Add to in-memory history (keep last 50)
    sessionHistory.unshift(newSession);
    if (sessionHistory.length > 50) {
      sessionHistory.pop();
    }
    
    // Save to Google Sheets
    await googleSheetsService.appendSession({
      frequency: session.frequency,
      intervalSeconds: session.intervalSeconds,
      timestamp: newSession.createdAt.toISOString(),
      totalDuration: session.frequency * session.intervalSeconds,
    });
    
    return newSession;
  }

  async getSessions() {
    return sessionHistory;
  }
}

export const storage = new SheetsStorage();
