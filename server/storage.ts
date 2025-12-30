import { googleSheetsService } from "./google-sheets";

export interface IStorage {
  createSession(session: { intervalFrequency: number; timer: number }): Promise<{
    id: number;
    intervalFrequency: number;
    timer: number;
    createdAt: Date;
  }>;
  getSessions(): Promise<Array<{
    id: number;
    intervalFrequency: number;
    timer: number;
    createdAt: Date;
  }>>;
  deleteSession(id: number): Promise<boolean>;
}

// In-memory storage for session history (last 50 sessions)
// This is temporary storage for the UI, real data is in Google Sheets
const sessionHistory: Array<{
  id: number;
  intervalFrequency: number;
  timer: number;
  createdAt: Date;
}> = [];

let nextId = 1;

export class SheetsStorage implements IStorage {
  async syncFromGoogleSheets(): Promise<void> {
    try {
      const sheetSessions = await googleSheetsService.getRecentSessions(50);
      
      // Clear current in-memory storage
      sessionHistory.length = 0;
      
      // Populate from Google Sheets
      let id = 1;
      sheetSessions.forEach(sheetSession => {
        sessionHistory.push({
          id: id++,
          intervalFrequency: sheetSession.intervalFrequency,
          timer: sheetSession.timer,
          createdAt: new Date(sheetSession.timestamp),
        });
      });
      
      nextId = id;
      console.log(`Synced ${sessionHistory.length} sessions from Google Sheets to memory`);
    } catch (error) {
      console.error('Failed to sync from Google Sheets:', error);
    }
  }

  async createSession(session: { intervalFrequency: number; timer: number }) {
    const newSession = {
      id: nextId++,
      intervalFrequency: session.intervalFrequency,
      timer: session.timer,
      createdAt: new Date(),
    };
    
    // Add to in-memory history (keep last 50)
    sessionHistory.unshift(newSession);
    if (sessionHistory.length > 50) {
      sessionHistory.pop();
    }
    
    // Try to save to Google Sheets with retry logic
    try {
      await googleSheetsService.appendSession({
        intervalFrequency: session.intervalFrequency,
        timer: session.timer,
        timestamp: newSession.createdAt.toISOString(),
        totalDuration: session.timer * 60, // Convert minutes to seconds for total duration
      });
    } catch (error) {
      // Log error but don't fail the request - data is still in memory
      console.error('Failed to log to Google Sheets (data saved in memory):', error);
    }
    
    return newSession;
  }

  async getSessions() {
    return sessionHistory;
  }

  async deleteSession(id: number): Promise<boolean> {
    const index = sessionHistory.findIndex(s => s.id === id);
    if (index === -1) {
      return false;
    }
    
    const session = sessionHistory[index];
    
    // Delete from Google Sheets using timestamp
    try {
      await googleSheetsService.deleteSessionByTimestamp(session.createdAt.toISOString());
      console.log(`Deleted session from Google Sheets: ${session.createdAt.toISOString()}`);
    } catch (error) {
      console.error('Failed to delete from Google Sheets (still deleting from memory):', error);
    }
    
    // Delete from memory
    sessionHistory.splice(index, 1);
    console.log(`Deleted session with id ${id} from memory`);
    return true;
  }
}

export const storage = new SheetsStorage();
